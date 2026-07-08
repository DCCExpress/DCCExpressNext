import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  NumberInput,
  Paper,
  ScrollArea,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";

const STORAGE_KEY = "dcc-express.automation.flow.v1";

type AutomationNodeKind =
  | "blockOccupied"
  | "sensor"
  | "button"
  | "and"
  | "or"
  | "not"
  | "timer"
  | "latch"
  | "routeLock"
  | "signal"
  | "turnout"
  | "output";

type AutomationNodeData = Record<string, unknown> & {
  kind: AutomationNodeKind;
  label: string;
  description?: string;
  ioKey?: string;
  sensorAddress?: number;
  delayMs?: number;
  outputCommand?: string;
  active?: boolean;
};

type AutomationNode = Node<AutomationNodeData, "automationNode">;
type AutomationEdge = Edge;

type AutomationSnapshot = {
  version: 1;
  name: string;
  nodes: AutomationNode[];
  edges: AutomationEdge[];
};

type NodeDefinition = {
  title: string;
  group: "Bemenet" | "Logika" | "Vasút" | "Kimenet";
  description: string;
  icon: string;
  defaultData?: Partial<AutomationNodeData>;
};

const NODE_DEFINITIONS: Record<AutomationNodeKind, NodeDefinition> = {
  blockOccupied: {
    title: "Szakasz foglalt",
    group: "Bemenet",
    description: "Foglaltságérzékelő vagy blokkállapot.",
    icon: "🚦",
    defaultData: { ioKey: "block:A1", active: false },
  },
  sensor: {
    title: "Szenzor",
    group: "Bemenet",
    description: "DCC-EX, S88, Arduino vagy egyéb fizikai szenzor bemenet.",
    icon: "📡",
    defaultData: { ioKey: "sensor:1", sensorAddress: 1, active: false },
  },
  button: {
    title: "Kézi parancs",
    group: "Bemenet",
    description: "UI gomb vagy külső kézi kapcsoló.",
    icon: "🔘",
    defaultData: { ioKey: "button:start", active: false },
  },
  and: {
    title: "AND",
    group: "Logika",
    description: "Akkor igaz, ha minden bemenete igaz.",
    icon: "&",
  },
  or: {
    title: "OR",
    group: "Logika",
    description: "Akkor igaz, ha legalább egy bemenete igaz.",
    icon: "≥1",
  },
  not: {
    title: "NOT",
    group: "Logika",
    description: "Invertálja az első bemenetet.",
    icon: "!",
  },
  timer: {
    title: "Timer",
    group: "Logika",
    description: "PLC-szerű késleltetés előkészítve.",
    icon: "⏱",
    defaultData: { delayMs: 1000 },
  },
  latch: {
    title: "Latch",
    group: "Logika",
    description: "Öntartó logika későbbi reset bemenettel.",
    icon: "🔒",
  },
  routeLock: {
    title: "Útvonal zár",
    group: "Vasút",
    description: "Váltók, szakaszok és jelzők logikai útvonal-zárolása.",
    icon: "🛤",
    defaultData: { ioKey: "route:R1" },
  },
  signal: {
    title: "Jelző parancs",
    group: "Kimenet",
    description: "Jelzőkép vezérlése: vörös, sárga, zöld.",
    icon: "🚥",
    defaultData: { ioKey: "signal:S1", outputCommand: "green" },
  },
  turnout: {
    title: "Váltó parancs",
    group: "Kimenet",
    description: "Váltó állítás egyenes/kitérő állásba.",
    icon: "↔",
    defaultData: { ioKey: "turnout:T1", outputCommand: "straight" },
  },
  output: {
    title: "Kimenet",
    group: "Kimenet",
    description: "Általános runtime kimeneti parancs.",
    icon: "⚡",
    defaultData: { ioKey: "output:1", outputCommand: "on" },
  },
};

const INITIAL_NODES: AutomationNode[] = [
  {
    id: "block-a1-occupied",
    type: "automationNode",
    position: { x: 60, y: 120 },
    data: {
      kind: "blockOccupied",
      label: "A1 szakasz foglalt",
      description: "Próba bemenet. Kapcsold be a jobb oldali panelen.",
      ioKey: "block:A1",
      active: false,
    },
  },
  {
    id: "sensor-1",
    type: "automationNode",
    position: { x: 60, y: 280 },
    data: {
      kind: "sensor",
      label: "Szenzor #1",
      description: "Fizikai szenzor bemenet szimulációja.",
      ioKey: "sensor:1",
      sensorAddress: 1,
      active: false,
    },
  },
  {
    id: "manual-route-request",
    type: "automationNode",
    position: { x: 60, y: 440 },
    data: {
      kind: "button",
      label: "Bejárati út kérése",
      ioKey: "button:route-request",
      active: true,
    },
  },
  {
    id: "not-block-a1",
    type: "automationNode",
    position: { x: 360, y: 120 },
    data: {
      kind: "not",
      label: "A1 szabad",
      description: "A foglaltság invertálása.",
    },
  },
  {
    id: "route-and",
    type: "automationNode",
    position: { x: 640, y: 280 },
    data: {
      kind: "and",
      label: "Útvonal engedélyezhető",
      description: "Kézi kérés ÉS szabad szakasz ÉS aktív szenzor.",
    },
  },
  {
    id: "route-lock-r1",
    type: "automationNode",
    position: { x: 930, y: 280 },
    data: {
      kind: "routeLock",
      label: "R1 útvonal zár",
      ioKey: "route:R1",
    },
  },
  {
    id: "signal-s1-green",
    type: "automationNode",
    position: { x: 1230, y: 280 },
    data: {
      kind: "signal",
      label: "S1 zöld",
      ioKey: "signal:S1",
      outputCommand: "green",
    },
  },
];

const INITIAL_EDGES: AutomationEdge[] = [
  createEdge("block-a1-occupied", "not-block-a1"),
  createEdge("not-block-a1", "route-and"),
  createEdge("sensor-1", "route-and"),
  createEdge("manual-route-request", "route-and"),
  createEdge("route-and", "route-lock-r1"),
  createEdge("route-lock-r1", "signal-s1-green"),
];

const NODE_GROUPS: NodeDefinition["group"][] = ["Bemenet", "Logika", "Vasút", "Kimenet"];

const nodeTypes: NodeTypes = {
  automationNode: AutomationGraphNode as never,
};

function createEdge(source: string, target: string): AutomationEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed },
  };
}

function isInputNode(kind: AutomationNodeKind): boolean {
  return kind === "blockOccupied" || kind === "sensor" || kind === "button";
}

function hasTargetHandle(kind: AutomationNodeKind): boolean {
  return !isInputNode(kind);
}

function hasSourceHandle(kind: AutomationNodeKind): boolean {
  return kind !== "signal" && kind !== "turnout" && kind !== "output";
}

function AutomationGraphNode({ data, selected }: NodeProps<AutomationNode>) {
  const definition = NODE_DEFINITIONS[data.kind];
  const active = data.active === true;

  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      shadow={selected ? "md" : "xs"}
      style={{
        minWidth: 190,
        borderColor: active
          ? "var(--mantine-color-green-5)"
          : selected
            ? "var(--mantine-color-blue-5)"
            : "var(--mantine-color-gray-4)",
        boxShadow: active
          ? "0 0 0 2px rgba(64, 192, 87, 0.22), 0 14px 34px rgba(0, 0, 0, 0.18)"
          : undefined,
        background: active
          ? "linear-gradient(180deg, rgba(47, 158, 68, 0.14), rgba(20, 120, 60, 0.06))"
          : "var(--mantine-color-body)",
      }}
    >
      {hasTargetHandle(data.kind) && (
        <Handle type="target" position={Position.Left} style={{ width: 10, height: 10 }} />
      )}

      <Stack gap={6}>
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Text fw={900} size="lg" lh={1}>
              {definition.icon}
            </Text>
            <Box>
              <Text fw={800} size="sm" lh={1.15}>
                {data.label}
              </Text>
              <Text size="xs" c="dimmed" lh={1.15}>
                {definition.title}
              </Text>
            </Box>
          </Group>

          {active && (
            <Badge color="green" variant="filled" size="xs">
              ON
            </Badge>
          )}
        </Group>

        {data.ioKey && (
          <Badge variant="light" color="gray" size="xs" w="fit-content">
            {data.ioKey}
          </Badge>
        )}

        {data.kind === "sensor" && typeof data.sensorAddress === "number" && (
          <Text size="xs" c="dimmed">
            cím: <b>{data.sensorAddress}</b>
          </Text>
        )}

        {data.outputCommand && (
          <Text size="xs" c="dimmed">
            parancs: <b>{data.outputCommand}</b>
          </Text>
        )}

        {data.kind === "timer" && (
          <Text size="xs" c="dimmed">
            késleltetés: <b>{data.delayMs ?? 0} ms</b>
          </Text>
        )}
      </Stack>

      {hasSourceHandle(data.kind) && (
        <Handle type="source" position={Position.Right} style={{ width: 10, height: 10 }} />
      )}
    </Paper>
  );
}

export default function AutomationFlowEditor() {
  const [nodes, setNodes] = useState<AutomationNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<AutomationEdge[]>(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(INITIAL_NODES[0]?.id ?? null);

  const simulatedState = useMemo(() => evaluateAutomation(nodes, edges), [nodes, edges]);

  const simulatedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          active: simulatedState[node.id] === true,
        },
      })),
    [nodes, simulatedState]
  );

  const simulatedEdges = useMemo(
    () =>
      edges.map((edge) => {
        const active = simulatedState[edge.source] === true;

        return {
          ...edge,
          animated: active,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: {
            strokeWidth: active ? 3 : 1.5,
            stroke: active ? "var(--mantine-color-green-5)" : "var(--mantine-color-gray-5)",
          },
        };
      }),
    [edges, simulatedState]
  );

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const snapshot = useMemo(() => createSnapshot(nodes, edges), [nodes, edges]);
  const activeOutputs = useMemo(
    () =>
      nodes.filter(
        (node) =>
          simulatedState[node.id] === true &&
          (node.data.kind === "signal" || node.data.kind === "turnout" || node.data.kind === "output")
      ),
    [nodes, simulatedState]
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes) as AutomationNode[]);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges) as AutomationEdge[]);
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) {
      return;
    }

    setEdges((currentEdges) =>
      addEdge(
        {
          ...connection,
          id: `${connection.source}-${connection.target}-${Date.now()}`,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
        },
        currentEdges
      ) as AutomationEdge[]
    );
  }, []);

  function addNode(kind: AutomationNodeKind) {
    const definition = NODE_DEFINITIONS[kind];
    const index = nodes.length + 1;

    setNodes((currentNodes) => [
      ...currentNodes,
      {
        id: `${kind}-${Date.now()}`,
        type: "automationNode",
        position: { x: 120 + (index % 4) * 180, y: 120 + Math.floor(index / 4) * 120 },
        data: {
          kind,
          label: definition.title,
          description: definition.description,
          ...definition.defaultData,
        },
      },
    ]);
  }

  function updateSelectedNodeData(patch: Partial<AutomationNodeData>) {
    if (!selectedNodeId) {
      return;
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...patch,
              },
            }
          : node
      )
    );
  }

  function deleteSelectedNode() {
    if (!selectedNodeId) {
      return;
    }

    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNodeId));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId)
    );
    setSelectedNodeId(null);
  }

  function resetFlow() {
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    setSelectedNodeId(INITIAL_NODES[0]?.id ?? null);
  }

  function saveFlow() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot, null, 2));
  }

  function loadFlow() {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      window.alert("Nincs mentett automatika a böngészőben.");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as AutomationSnapshot;

      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        throw new Error("Invalid automation snapshot.");
      }

      setNodes(parsed.nodes);
      setEdges(parsed.edges);
      setSelectedNodeId(parsed.nodes[0]?.id ?? null);
    } catch (error) {
      window.alert(`Nem sikerült betölteni az automatika JSON-t: ${String(error)}`);
    }
  }

  return (
    <SimpleAutomationLayout
      activeOutputs={activeOutputs}
      edges={edges}
      nodes={nodes}
      onAddNode={addNode}
      onDeleteSelectedNode={deleteSelectedNode}
      onLoadFlow={loadFlow}
      onResetFlow={resetFlow}
      onSaveFlow={saveFlow}
      onSelectedNodeDataChange={updateSelectedNodeData}
      selectedNode={selectedNode}
      snapshot={snapshot}
    >
      <ReactFlow
        nodes={simulatedNodes}
        edges={simulatedEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </SimpleAutomationLayout>
  );
}

type SimpleAutomationLayoutProps = {
  activeOutputs: AutomationNode[];
  children: ReactNode;
  edges: AutomationEdge[];
  nodes: AutomationNode[];
  onAddNode: (kind: AutomationNodeKind) => void;
  onDeleteSelectedNode: () => void;
  onLoadFlow: () => void;
  onResetFlow: () => void;
  onSaveFlow: () => void;
  onSelectedNodeDataChange: (patch: Partial<AutomationNodeData>) => void;
  selectedNode: AutomationNode | null;
  snapshot: AutomationSnapshot;
};

function SimpleAutomationLayout({
  activeOutputs,
  children,
  edges,
  nodes,
  onAddNode,
  onDeleteSelectedNode,
  onLoadFlow,
  onResetFlow,
  onSaveFlow,
  onSelectedNodeDataChange,
  selectedNode,
  snapshot,
}: SimpleAutomationLayoutProps) {
  return (
    <Group align="stretch" gap="md" wrap="nowrap" style={{ minHeight: "calc(100vh - 150px)" }}>
      <Card withBorder radius="md" p="sm" w={260}>
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={5}>Node paletta</Title>
            <Badge variant="light">{nodes.length} node</Badge>
          </Group>

          <Divider />

          <ScrollArea h="calc(100vh - 260px)">
            <Stack gap="md" pr="xs">
              {NODE_GROUPS.map((group) => (
                <Stack key={group} gap="xs">
                  <Text size="xs" fw={800} c="dimmed" tt="uppercase">
                    {group}
                  </Text>

                  {Object.entries(NODE_DEFINITIONS)
                    .filter(([, definition]) => definition.group === group)
                    .map(([kind, definition]) => (
                      <Button
                        key={kind}
                        variant="light"
                        justify="flex-start"
                        leftSection={<Text span>{definition.icon}</Text>}
                        rightSection={<IconPlus size={14} />}
                        onClick={() => onAddNode(kind as AutomationNodeKind)}
                      >
                        {definition.title}
                      </Button>
                    ))}
                </Stack>
              ))}
            </Stack>
          </ScrollArea>
        </Stack>
      </Card>

      <Paper withBorder radius="md" style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <Box h="100%" mih={620}>
          {children}
        </Box>
      </Paper>

      <Card withBorder radius="md" p="sm" w={360}>
        <Stack gap="sm" h="100%">
          <Group justify="space-between">
            <Title order={5}>Tulajdonságok</Title>

            <Group gap={4}>
              <Tooltip label="Mentés böngészőbe">
                <ActionIcon variant="light" onClick={onSaveFlow}>
                  <IconDeviceFloppy size={16} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Betöltés böngészőből">
                <ActionIcon variant="light" onClick={onLoadFlow}>
                  <IconPlayerPlay size={16} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Minta visszaállítása">
                <ActionIcon variant="light" color="orange" onClick={onResetFlow}>
                  <IconRefresh size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          <Divider />

          {selectedNode ? (
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Badge variant="light" color="blue">
                    {NODE_DEFINITIONS[selectedNode.data.kind].title}
                  </Badge>
                  <Text size="xs" c="dimmed" mt={4}>
                    {selectedNode.id}
                  </Text>
                </Box>

                <ActionIcon color="red" variant="light" onClick={onDeleteSelectedNode}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>

              <TextInput
                label="Felirat"
                value={selectedNode.data.label}
                onChange={(event) => onSelectedNodeDataChange({ label: event.currentTarget.value })}
              />

              <TextInput
                label="I/O kulcs"
                description="Később ehhez kötjük a blokkot, szenzort, jelzőt, váltót vagy runtime parancsot."
                value={selectedNode.data.ioKey ?? ""}
                onChange={(event) => onSelectedNodeDataChange({ ioKey: event.currentTarget.value })}
              />

              {selectedNode.data.kind === "sensor" && (
                <NumberInput
                  label="Szenzor cím"
                  description="A fizikai szenzor címe. A runtime ezt fogja majd a valós állapothoz kötni."
                  min={0}
                  step={1}
                  value={selectedNode.data.sensorAddress ?? 0}
                  onChange={(value) =>
                    onSelectedNodeDataChange({
                      sensorAddress: toNumber(value),
                      ioKey: `sensor:${toNumber(value)}`,
                    })
                  }
                />
              )}

              {isInputNode(selectedNode.data.kind) && (
                <Switch
                  checked={selectedNode.data.active === true}
                  label="Szimulált bemenet aktív"
                  onChange={(event) =>
                    onSelectedNodeDataChange({ active: event.currentTarget.checked })
                  }
                />
              )}

              {selectedNode.data.kind === "timer" && (
                <NumberInput
                  label="Késleltetés ms"
                  min={0}
                  step={100}
                  value={selectedNode.data.delayMs ?? 0}
                  onChange={(value) => onSelectedNodeDataChange({ delayMs: toNumber(value) })}
                />
              )}

              {(selectedNode.data.kind === "signal" ||
                selectedNode.data.kind === "turnout" ||
                selectedNode.data.kind === "output") && (
                <TextInput
                  label="Kimeneti parancs"
                  value={selectedNode.data.outputCommand ?? ""}
                  onChange={(event) =>
                    onSelectedNodeDataChange({ outputCommand: event.currentTarget.value })
                  }
                />
              )}

              <Textarea
                label="Megjegyzés"
                autosize
                minRows={2}
                value={selectedNode.data.description ?? ""}
                onChange={(event) =>
                  onSelectedNodeDataChange({ description: event.currentTarget.value })
                }
              />
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              Jelölj ki egy node-ot, és itt szerkesztheted a tulajdonságait.
            </Text>
          )}

          <Divider />

          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={800} size="sm">
                Szimulált aktív kimenetek
              </Text>
              <Badge color={activeOutputs.length > 0 ? "green" : "gray"} variant="light">
                {activeOutputs.length}
              </Badge>
            </Group>

            {activeOutputs.length === 0 ? (
              <Text size="xs" c="dimmed">
                Nincs aktív kimenet.
              </Text>
            ) : (
              activeOutputs.map((node) => (
                <Badge key={node.id} color="green" variant="filled" w="fit-content">
                  {node.data.ioKey ?? node.data.label}: {node.data.outputCommand ?? "on"}
                </Badge>
              ))
            )}
          </Stack>

          <Divider />

          <Stack gap="xs" style={{ flex: 1, minHeight: 0 }}>
            <Group justify="space-between">
              <Text fw={800} size="sm">
                JSON előnézet
              </Text>
              <Badge variant="light" color="gray">
                {edges.length} él
              </Badge>
            </Group>

            <Textarea
              value={JSON.stringify(snapshot, null, 2)}
              readOnly
              autosize={false}
              styles={{
                input: {
                  minHeight: 190,
                  height: "100%",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 11,
                },
              }}
            />
          </Stack>
        </Stack>
      </Card>
    </Group>
  );
}

function createSnapshot(nodes: AutomationNode[], edges: AutomationEdge[]): AutomationSnapshot {
  return {
    version: 1,
    name: "Vasútmodell automatika alap",
    nodes,
    edges,
  };
}

function evaluateAutomation(nodes: AutomationNode[], edges: AutomationEdge[]): Record<string, boolean> {
  const active: Record<string, boolean> = {};
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, AutomationEdge[]>();

  for (const edge of edges) {
    const list = incoming.get(edge.target) ?? [];
    list.push(edge);
    incoming.set(edge.target, list);
  }

  for (const node of nodes) {
    if (isInputNode(node.data.kind)) {
      active[node.id] = node.data.active === true;
    } else {
      active[node.id] = false;
    }
  }

  for (let pass = 0; pass < nodes.length + 2; pass += 1) {
    let changed = false;

    for (const node of nodes) {
      if (isInputNode(node.data.kind)) {
        continue;
      }

      const incomingEdges = incoming.get(node.id) ?? [];
      const inputValues = incomingEdges
        .map((edge) => nodeById.has(edge.source) && active[edge.source] === true)
        .filter((value) => typeof value === "boolean");

      let nextValue = false;

      switch (node.data.kind) {
        case "and":
          nextValue = inputValues.length > 0 && inputValues.every(Boolean);
          break;
        case "or":
        case "timer":
        case "latch":
        case "routeLock":
        case "signal":
        case "turnout":
        case "output":
          nextValue = inputValues.some(Boolean);
          break;
        case "not":
          nextValue = inputValues.length > 0 ? !inputValues[0] : false;
          break;
        default:
          nextValue = false;
          break;
      }

      if (active[node.id] !== nextValue) {
        active[node.id] = nextValue;
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return active;
}

function toNumber(value: string | number): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
