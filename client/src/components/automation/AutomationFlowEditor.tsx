import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  MarkerType,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";

import type {
  AutomationFlowDocumentDto,
  AutomationFlowNodeData,
  AutomationFlowNodeKind,
} from "../../../../common/src/automationFlow";
import {
  loadAutomationFlowWs,
  saveAutomationFlowWs,
} from "../../api/automationFlowWsApi";
import {
  wsApi,
} from "../../services/wsApi";
import {
  wsClient,
} from "../../services/wsClient";
import {
  automationNodeTypes,
  isInputNode,
  NODE_DEFINITIONS,
  NODE_GROUPS,
} from "./nodes";

type AutomationNode = Node<AutomationFlowNodeData, "automationNode">;
type AutomationEdge = Edge;

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
    id: "turnout-t1-closed",
    type: "automationNode",
    position: { x: 60, y: 440 },
    data: {
      kind: "turnout",
      label: "T1 closed",
      description: "Váltóállapot bemenet. Akkor igaz, ha T1 closed állásban van.",
      ioKey: "turnout:1:closed",
      turnoutAddress: 1,
      turnoutClosed: true,
      active: false,
    },
  },
  {
    id: "manual-route-request",
    type: "automationNode",
    position: { x: 60, y: 600 },
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
    position: { x: 640, y: 300 },
    data: {
      kind: "and",
      label: "S1 sárga feltétel",
      description: "Kézi kérés ÉS szabad szakasz ÉS aktív szenzor ÉS T1 closed.",
    },
  },
  {
    id: "route-if-then-else",
    type: "automationNode",
    position: { x: 860, y: 520 },
    data: {
      kind: "ifThenElse",
      label: "IF szenzor THEN engedély ELSE tiltás",
      description: "Első bemenet a feltétel, második a THEN ág, harmadik az ELSE ág.",
    },
  },
  {
    id: "route-lock-r1",
    type: "automationNode",
    position: { x: 930, y: 300 },
    data: {
      kind: "routeLock",
      label: "R1 útvonal zár",
      ioKey: "route:R1",
    },
  },
  {
    id: "signal-s1-yellow",
    type: "automationNode",
    position: { x: 1230, y: 300 },
    data: {
      kind: "signal",
      label: "Signal1 yellow",
      ioKey: "signal:S1",
      outputCommand: "yellow",
    },
  },
];

const INITIAL_EDGES: AutomationEdge[] = [
  createEdge("block-a1-occupied", "not-block-a1"),
  createEdge("not-block-a1", "route-and"),
  createEdge("sensor-1", "route-and"),
  createEdge("turnout-t1-closed", "route-and"),
  createEdge("manual-route-request", "route-and"),
  createEdge("route-and", "route-lock-r1"),
  createEdge("route-lock-r1", "signal-s1-yellow"),
];

function createEdge(source: string, target: string): AutomationEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed },
  };
}

function getTurnoutIoKey(address: number, closed: boolean): string {
  return `turnout:${address}:${closed ? "closed" : "thrown"}`;
}

export default function AutomationFlowEditor() {
  const [nodes, setNodes] = useState<AutomationNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<AutomationEdge[]>(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(INITIAL_NODES[0]?.id ?? null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
          (node.data.kind === "signal" || node.data.kind === "output")
      ),
    [nodes, simulatedState]
  );

  const applyDocument = useCallback((document: AutomationFlowDocumentDto): void => {
    if (document.nodes.length === 0) {
      setNodes(INITIAL_NODES);
      setEdges(INITIAL_EDGES);
      setSelectedNodeId(INITIAL_NODES[0]?.id ?? null);
      return;
    }

    setNodes(document.nodes as AutomationNode[]);
    setEdges(document.edges as AutomationEdge[]);
    setSelectedNodeId(document.nodes[0]?.id ?? null);
  }, []);

  const loadFlow = useCallback(async (): Promise<void> => {
    setLoading(true);
    setStatusText("Automatika betöltése a szerverről...");

    try {
      const document = await loadAutomationFlowWs();
      applyDocument(document);
      wsApi.getLayoutRuntimeSnapshot();
      setStatusText(`Automatika betöltve: ${document.nodes.length} node, ${document.edges.length} él.`);
    } catch (error) {
      setStatusText(`Betöltési hiba: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [applyDocument]);

  useEffect(() => {
    void loadFlow();
  }, [loadFlow]);

  useEffect(() => {
    const unsubscribeSensor = wsClient.on("sensorChanged", data => {
      setNodes(currentNodes => currentNodes.map(node => {
        if (node.data.kind !== "sensor") {
          return node;
        }

        if (node.data.sensorAddress !== data.address) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            active: data.on,
          },
        };
      }));
    });

    const unsubscribeTurnout = wsClient.on("turnoutChanged", data => {
      setNodes(currentNodes => currentNodes.map(node => {
        if (node.data.kind !== "turnout") {
          return node;
        }

        if (node.data.turnoutAddress !== data.address) {
          return node;
        }

        const expectedClosed = node.data.turnoutClosed ?? true;

        return {
          ...node,
          data: {
            ...node.data,
            active: data.closed === expectedClosed,
          },
        };
      }));
    });

    const unsubscribeFlowChanged = wsClient.on("automationFlowChanged", document => {
      applyDocument(document);
      setStatusText("Automatika frissítve egy másik kliens mentése alapján.");
      wsApi.getLayoutRuntimeSnapshot();
    });

    wsApi.getLayoutRuntimeSnapshot();

    return () => {
      unsubscribeSensor();
      unsubscribeTurnout();
      unsubscribeFlowChanged();
    };
  }, [applyDocument]);

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

  function addNode(kind: AutomationFlowNodeKind) {
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

  function updateSelectedNodeData(patch: Partial<AutomationFlowNodeData>) {
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
    setStatusText("Minta automatika visszaállítva. Mentéshez nyomd meg a floppy ikont.");
  }

  async function saveFlow() {
    setSaving(true);
    setStatusText("Automatika mentése a szerverre...");

    try {
      const document = await saveAutomationFlowWs(snapshot);
      applyDocument(document);
      setStatusText(`Automatika mentve: ${document.nodes.length} node, ${document.edges.length} él.`);
    } catch (error) {
      setStatusText(`Mentési hiba: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SimpleAutomationLayout
      activeOutputs={activeOutputs}
      edges={edges}
      loading={loading}
      nodes={nodes}
      onAddNode={addNode}
      onDeleteSelectedNode={deleteSelectedNode}
      onLoadFlow={() => void loadFlow()}
      onResetFlow={resetFlow}
      onSaveFlow={() => void saveFlow()}
      onSelectedNodeDataChange={updateSelectedNodeData}
      saving={saving}
      selectedNode={selectedNode}
      snapshot={snapshot}
      statusText={statusText}
    >
      <ReactFlow
        nodes={simulatedNodes}
        edges={simulatedEdges}
        nodeTypes={automationNodeTypes}
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
  loading: boolean;
  nodes: AutomationNode[];
  onAddNode: (kind: AutomationFlowNodeKind) => void;
  onDeleteSelectedNode: () => void;
  onLoadFlow: () => void;
  onResetFlow: () => void;
  onSaveFlow: () => void;
  onSelectedNodeDataChange: (patch: Partial<AutomationFlowNodeData>) => void;
  saving: boolean;
  selectedNode: AutomationNode | null;
  snapshot: AutomationFlowDocumentDto;
  statusText: string | null;
};

function SimpleAutomationLayout({
  activeOutputs,
  children,
  edges,
  loading,
  nodes,
  onAddNode,
  onDeleteSelectedNode,
  onLoadFlow,
  onResetFlow,
  onSaveFlow,
  onSelectedNodeDataChange,
  saving,
  selectedNode,
  snapshot,
  statusText,
}: SimpleAutomationLayoutProps) {
  const statusIsError = statusText?.toLocaleLowerCase().includes("hiba") === true;

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
                        onClick={() => onAddNode(kind as AutomationFlowNodeKind)}
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
              <Tooltip label="Mentés szerverre">
                <ActionIcon variant="light" onClick={onSaveFlow} loading={saving}>
                  <IconDeviceFloppy size={16} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Betöltés szerverről">
                <ActionIcon variant="light" onClick={onLoadFlow} loading={loading}>
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

          {statusText && (
            <Badge variant="light" color={statusIsError ? "red" : "blue"} w="fit-content">
              {statusText}
            </Badge>
          )}

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
                description="Később ehhez kötjük a blokkot, szenzort, váltóállapotot, jelzőt vagy runtime parancsot."
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
                  onChange={(value) => {
                    const address = toNumber(value);
                    onSelectedNodeDataChange({
                      sensorAddress: address,
                      ioKey: `sensor:${address}`,
                    });
                    wsApi.getLayoutRuntimeSnapshot();
                  }}
                />
              )}

              {selectedNode.data.kind === "turnout" && (
                <Stack gap="xs">
                  <NumberInput
                    label="Váltó cím"
                    description="A fizikai váltó címe. Például T1."
                    min={0}
                    step={1}
                    value={selectedNode.data.turnoutAddress ?? 0}
                    onChange={(value) => {
                      const address = toNumber(value);
                      const closed = selectedNode.data.turnoutClosed ?? true;
                      onSelectedNodeDataChange({
                        turnoutAddress: address,
                        ioKey: getTurnoutIoKey(address, closed),
                      });
                      wsApi.getLayoutRuntimeSnapshot();
                    }}
                  />

                  <Switch
                    checked={selectedNode.data.turnoutClosed ?? true}
                    label="Closed állás legyen az igaz feltétel"
                    description="Ha kikapcsolod, akkor a node akkor lesz igaz, ha a váltó thrown/kitérő állásban van."
                    onChange={(event) => {
                      const closed = event.currentTarget.checked;
                      const address = selectedNode.data.turnoutAddress ?? 0;
                      onSelectedNodeDataChange({
                        turnoutClosed: closed,
                        ioKey: getTurnoutIoKey(address, closed),
                      });
                      wsApi.getLayoutRuntimeSnapshot();
                    }}
                  />
                </Stack>
              )}

              {selectedNode.data.kind === "ifThenElse" && (
                <Text size="xs" c="dimmed">
                  IF / THEN / ELSE sorrend: az első bekötött bemenet a feltétel, a második a THEN ág,
                  a harmadik az ELSE ág. Később ezt külön named handle-ökkel szétválasztjuk.
                </Text>
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

              {(selectedNode.data.kind === "signal" || selectedNode.data.kind === "output") && (
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

function createSnapshot(nodes: AutomationNode[], edges: AutomationEdge[]): AutomationFlowDocumentDto {
  return {
    version: 1,
    name: "Vasútmodell automatika alap",
    nodes: nodes.map(node => ({
      id: node.id,
      type: "automationNode",
      position: node.position,
      data: node.data,
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(typeof edge.type === "string" ? { type: edge.type } : {}),
    })),
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
        case "output":
          nextValue = inputValues.some(Boolean);
          break;
        case "ifThenElse": {
          const condition = inputValues[0] === true;
          const thenValue = inputValues[1] === true;
          const elseValue = inputValues[2] === true;
          nextValue = condition ? thenValue : elseValue;
          break;
        }
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
