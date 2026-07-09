import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  Select,
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
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { useTranslation } from "react-i18next";

import type {
  AutomationFlowDocumentDto,
  AutomationFlowNodeData,
  AutomationFlowNodeKind,
  AutomationFlowPageDto,
  AutomationSignalAspect,
} from "../../../../common/src/automationFlow";
import {
  DEFAULT_AUTOMATION_FLOW_PAGE_ID,
  createDefaultAutomationFlowPage,
} from "../../../../common/src/automationFlow";
import type {
  SerializedLayoutDto,
  SerializedLayoutElementDto,
} from "../../../../common/src/layout/layoutDto";
import {
  getLayoutWs,
} from "../../api/layoutWsApi";
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
type SignalInputAspect = Exclude<AutomationSignalAspect, "red">;

type SignalMapping = {
  addressLength: number;
  valueRed: number;
  valueYellow: number;
  valueGreen: number;
  valueWhite: number;
};

type LayoutAutomationMappings = {
  turnoutClosedValueByAddress: Map<number, boolean>;
  signalByAddress: Map<number, SignalMapping>;
};

type AutomationSignalState = {
  valid: boolean;
  value: boolean;
  signalAspect?: AutomationSignalAspect;
};

type AutomationEvaluationState = Record<string, AutomationSignalState>;

const SIGNAL_INPUT_ASPECTS: SignalInputAspect[] = ["green", "yellow", "white"];
const DEFAULT_PAGE = createDefaultAutomationFlowPage();

const INITIAL_NODES: AutomationNode[] = [
  {
    id: "block-a1-occupied",
    type: "automationNode",
    position: { x: 60, y: 120 },
    data: {
      kind: "blockOccupied",
      label: "A1 szakasz foglalt",
      pageId: DEFAULT_AUTOMATION_FLOW_PAGE_ID,
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
      pageId: DEFAULT_AUTOMATION_FLOW_PAGE_ID,
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
      pageId: DEFAULT_AUTOMATION_FLOW_PAGE_ID,
      description: "Váltóállapot bemenet. Akkor igaz, ha T1 logikai closed állásban van.",
      ioKey: "turnout:1:closed",
      turnoutAddress: 1,
      turnoutClosed: true,
      turnoutClosedValue: true,
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
      pageId: DEFAULT_AUTOMATION_FLOW_PAGE_ID,
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
      pageId: DEFAULT_AUTOMATION_FLOW_PAGE_ID,
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
      pageId: DEFAULT_AUTOMATION_FLOW_PAGE_ID,
      description: "Kézi kérés ÉS szabad szakasz ÉS aktív szenzor ÉS T1 logikai closed.",
    },
  },
  {
    id: "route-lock-r1",
    type: "automationNode",
    position: { x: 930, y: 300 },
    data: {
      kind: "routeLock",
      label: "R1 útvonal zár",
      pageId: DEFAULT_AUTOMATION_FLOW_PAGE_ID,
      ioKey: "route:R1",
    },
  },
  {
    id: "signal-s1",
    type: "automationNode",
    position: { x: 1230, y: 220 },
    data: {
      kind: "signal",
      label: "Signal1",
      pageId: DEFAULT_AUTOMATION_FLOW_PAGE_ID,
      ioKey: "signal:1:auto",
      signalAddress: 1,
      signalAspect: "red",
      signalAddressLength: 2,
      signalValueRed: 0,
      signalValueYellow: 1,
      signalValueGreen: 2,
      signalValueWhite: 3,
      outputCommand: "red",
    },
  },
  {
    id: "turnout-t2-closed-command",
    type: "automationNode",
    position: { x: 1230, y: 380 },
    data: {
      kind: "turnoutCommand",
      label: "T2 állítás closed",
      pageId: DEFAULT_AUTOMATION_FLOW_PAGE_ID,
      description: "Aktív feltételnél T2 logikai closed állásba kerül.",
      ioKey: "turnout-command:2:closed",
      turnoutAddress: 2,
      turnoutClosed: true,
      turnoutClosedValue: true,
      outputCommand: "closed",
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
  createEdge("route-lock-r1", "signal-s1", "yellow"),
  createEdge("route-lock-r1", "turnout-t2-closed-command"),
];

function createEdge(source: string, target: string, targetHandle?: string): AutomationEdge {
  return {
    id: [source, targetHandle ?? "in", target].join("-"),
    source,
    target,
    ...(targetHandle ? { targetHandle } : {}),
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed },
  };
}

function getNodeTitle(kind: AutomationFlowNodeKind, fallback: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  return t(`automation.nodes.${kind}.title`, { defaultValue: fallback });
}

function getNodeDescription(kind: AutomationFlowNodeKind, fallback: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  return t(`automation.nodes.${kind}.description`, { defaultValue: fallback });
}

function getNodeGroupKey(group: string): string {
  switch (group) {
    case "Bemenet":
      return "automation.groups.input";
    case "Logika":
      return "automation.groups.logic";
    case "Vasút":
      return "automation.groups.railway";
    case "Kimenet":
      return "automation.groups.output";
    default:
      return group;
  }
}

function emptySignal(): AutomationSignalState {
  return { valid: false, value: false };
}

function signal(value: boolean, signalAspect?: AutomationSignalAspect): AutomationSignalState {
  return { valid: true, value, ...(signalAspect ? { signalAspect } : {}) };
}

function getNodeSignal(evaluation: AutomationEvaluationState, nodeId: string): AutomationSignalState {
  return evaluation[nodeId] ?? emptySignal();
}

function signalsEqual(left: AutomationSignalState, right: AutomationSignalState): boolean {
  return left.valid === right.valid && left.value === right.value && left.signalAspect === right.signalAspect;
}

function getNodePageId(node: AutomationNode): string {
  return typeof node.data.pageId === "string" && node.data.pageId.trim().length > 0
    ? node.data.pageId
    : DEFAULT_AUTOMATION_FLOW_PAGE_ID;
}

function createPageId(): string {
  return `page-${Date.now().toString(36)}`;
}

function normalizePages(pages: AutomationFlowPageDto[] | undefined): AutomationFlowPageDto[] {
  if (!pages || pages.length === 0) {
    return [DEFAULT_PAGE];
  }

  const seen = new Set<string>();
  const result: AutomationFlowPageDto[] = [];

  for (const page of pages) {
    if (!page.id || seen.has(page.id)) {
      continue;
    }

    seen.add(page.id);
    result.push({
      id: page.id,
      name: page.name?.trim() || page.id,
    });
  }

  return result.length > 0 ? result : [DEFAULT_PAGE];
}

function getValidActivePageId(pages: AutomationFlowPageDto[], preferredPageId: string | undefined): string {
  if (preferredPageId && pages.some(page => page.id === preferredPageId)) {
    return preferredPageId;
  }

  return pages[0]?.id ?? DEFAULT_AUTOMATION_FLOW_PAGE_ID;
}

function getTurnoutStateLabel(logicalClosed: boolean): string {
  return logicalClosed ? "closed" : "thrown";
}

function getTurnoutIoKey(address: number, logicalClosed: boolean): string {
  return `turnout:${address}:${getTurnoutStateLabel(logicalClosed)}`;
}

function getTurnoutCommandIoKey(address: number, logicalClosed: boolean): string {
  return `turnout-command:${address}:${getTurnoutStateLabel(logicalClosed)}`;
}

function getTurnoutCommandLabel(address: number, logicalClosed: boolean): string {
  return `T${address} ${getTurnoutStateLabel(logicalClosed)}`;
}

function getSignalIoKey(address: number): string {
  return `signal:${address}:auto`;
}

function getLogicalTurnoutClosedFromPhysical(physicalClosed: boolean, turnoutClosedValue: boolean | undefined): boolean {
  return physicalClosed === (turnoutClosedValue ?? true);
}

function getPhysicalTurnoutClosedFromLogical(logicalClosed: boolean, turnoutClosedValue: boolean | undefined): boolean {
  const physicalClosedForLogicalClosed = turnoutClosedValue ?? true;
  return logicalClosed ? physicalClosedForLogicalClosed : !physicalClosedForLogicalClosed;
}

function getSignalAspectBits(data: AutomationFlowNodeData, aspect: AutomationSignalAspect = "red"): number {
  switch (aspect) {
    case "green":
      return data.signalValueGreen ?? 0;
    case "white":
      return data.signalValueWhite ?? 0;
    case "yellow":
      return data.signalValueYellow ?? 0;
    case "red":
    default:
      return data.signalValueRed ?? 0;
  }
}

function readTurnoutMapping(element: SerializedLayoutElementDto, result: Map<number, boolean>): void {
  if (typeof element.turnoutAddress === "number" && typeof element.turnoutClosedValue === "boolean") {
    result.set(element.turnoutAddress, element.turnoutClosedValue);
  }

  if (typeof element.turnout1Address === "number" && typeof element.turnout1ClosedValue === "boolean") {
    result.set(element.turnout1Address, element.turnout1ClosedValue);
  }

  if (typeof element.turnout2Address === "number" && typeof element.turnout2ClosedValue === "boolean") {
    result.set(element.turnout2Address, element.turnout2ClosedValue);
  }
}

function readSignalMapping(element: SerializedLayoutElementDto, result: Map<number, SignalMapping>): void {
  if (
    typeof element.address !== "number" ||
    typeof element.addressLength !== "number" ||
    typeof element.valueRed !== "number" ||
    typeof element.valueYellow !== "number" ||
    typeof element.valueGreen !== "number" ||
    typeof element.valueWhite !== "number"
  ) {
    return;
  }

  result.set(element.address, {
    addressLength: element.addressLength,
    valueRed: element.valueRed,
    valueYellow: element.valueYellow,
    valueGreen: element.valueGreen,
    valueWhite: element.valueWhite,
  });
}

function buildLayoutAutomationMappings(layout: SerializedLayoutDto): LayoutAutomationMappings {
  const turnoutClosedValueByAddress = new Map<number, boolean>();
  const signalByAddress = new Map<number, SignalMapping>();

  for (const layer of layout.layers ?? []) {
    for (const element of layer.elements ?? []) {
      readTurnoutMapping(element, turnoutClosedValueByAddress);
      readSignalMapping(element, signalByAddress);
    }
  }

  return {
    turnoutClosedValueByAddress,
    signalByAddress,
  };
}

function applyLayoutTurnoutMappings(
  document: AutomationFlowDocumentDto,
  turnoutClosedValueByAddress: Map<number, boolean>
): AutomationFlowDocumentDto {
  if (turnoutClosedValueByAddress.size === 0) {
    return document;
  }

  return {
    ...document,
    nodes: document.nodes.map(node => {
      if (node.data.kind !== "turnout" && node.data.kind !== "turnoutCommand") {
        return node;
      }

      const address = node.data.turnoutAddress;
      const turnoutClosedValue = typeof address === "number"
        ? turnoutClosedValueByAddress.get(address)
        : undefined;

      if (turnoutClosedValue === undefined) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          turnoutClosedValue,
        },
      };
    }),
  };
}

function applyLayoutSignalMappings(
  document: AutomationFlowDocumentDto,
  signalByAddress: Map<number, SignalMapping>
): AutomationFlowDocumentDto {
  if (signalByAddress.size === 0) {
    return document;
  }

  return {
    ...document,
    nodes: document.nodes.map(node => {
      if (node.data.kind !== "signal") {
        return node;
      }

      const address = node.data.signalAddress;
      const signalMapping = typeof address === "number" ? signalByAddress.get(address) : undefined;
      if (!signalMapping) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          signalAddressLength: signalMapping.addressLength,
          signalValueRed: signalMapping.valueRed,
          signalValueYellow: signalMapping.valueYellow,
          signalValueGreen: signalMapping.valueGreen,
          signalValueWhite: signalMapping.valueWhite,
        },
      };
    }),
  };
}

function applyLayoutAutomationMappings(
  document: AutomationFlowDocumentDto,
  mappings: LayoutAutomationMappings
): AutomationFlowDocumentDto {
  return applyLayoutSignalMappings(
    applyLayoutTurnoutMappings(document, mappings.turnoutClosedValueByAddress),
    mappings.signalByAddress
  );
}

async function loadLayoutAutomationMappings(): Promise<LayoutAutomationMappings> {
  try {
    const layout = await getLayoutWs();
    return buildLayoutAutomationMappings(layout);
  } catch (error) {
    console.warn("[AutomationFlowEditor] Layout automation mapping load failed:", error);
    return {
      turnoutClosedValueByAddress: new Map<number, boolean>(),
      signalByAddress: new Map<number, SignalMapping>(),
    };
  }
}

function createIncomingEdgeMap(edges: AutomationEdge[]): Map<string, AutomationEdge[]> {
  const incoming = new Map<string, AutomationEdge[]>();

  for (const edge of edges) {
    const list = incoming.get(edge.target) ?? [];
    list.push(edge);
    incoming.set(edge.target, list);
  }

  return incoming;
}

function getEdgeSignalState(
  edge: AutomationEdge,
  sourceNode: AutomationNode | undefined,
  evaluation: AutomationEvaluationState
): AutomationSignalState {
  if (!sourceNode) {
    return emptySignal();
  }

  const sourceSignal = getNodeSignal(evaluation, edge.source);
  if (!sourceSignal.valid) {
    return emptySignal();
  }

  if (sourceNode.data.kind === "ifThenElse") {
    if (edge.sourceHandle === "else") {
      return sourceSignal.value ? emptySignal() : signal(true);
    }

    return sourceSignal.value ? signal(true) : emptySignal();
  }

  return sourceSignal;
}

function resolveSignalAspectFromInputs(
  incomingEdges: AutomationEdge[],
  nodeById: Map<string, AutomationNode>,
  evaluation: AutomationEvaluationState
): AutomationSignalAspect {
  const trueAspects = SIGNAL_INPUT_ASPECTS.filter(aspect => (
    incomingEdges.some(edge => {
      if (edge.targetHandle !== aspect) {
        return false;
      }

      const currentSignal = getEdgeSignalState(edge, nodeById.get(edge.source), evaluation);
      return currentSignal.valid && currentSignal.value;
    })
  ));

  if (trueAspects.length !== 1) {
    return "red";
  }

  return trueAspects[0] ?? "red";
}

function evaluateAutomation(nodes: AutomationNode[], edges: AutomationEdge[]): AutomationEvaluationState {
  const evaluation: AutomationEvaluationState = {};
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incoming = createIncomingEdgeMap(edges);

  for (const node of nodes) {
    evaluation[node.id] = isInputNode(node.data.kind)
      ? signal(node.data.active === true)
      : emptySignal();
  }

  for (let pass = 0; pass < nodes.length + 2; pass += 1) {
    let changed = false;

    for (const node of nodes) {
      if (isInputNode(node.data.kind)) {
        continue;
      }

      const incomingEdges = incoming.get(node.id) ?? [];
      const inputSignals = incomingEdges
        .map((edge) => getEdgeSignalState(edge, nodeById.get(edge.source), evaluation))
        .filter((currentSignal) => currentSignal.valid);

      let nextSignal = emptySignal();

      switch (node.data.kind) {
        case "and":
          nextSignal = inputSignals.length > 0
            ? signal(inputSignals.every((currentSignal) => currentSignal.value))
            : emptySignal();
          break;
        case "or":
        case "timer":
        case "latch":
        case "routeLock":
        case "turnoutCommand":
        case "output":
          nextSignal = inputSignals.length > 0
            ? signal(inputSignals.some((currentSignal) => currentSignal.value))
            : emptySignal();
          break;
        case "signal": {
          const aspect = resolveSignalAspectFromInputs(incomingEdges, nodeById, evaluation);
          nextSignal = signal(aspect !== "red", aspect);
          break;
        }
        case "ifThenElse": {
          const ifInputSignals = incomingEdges
            .filter((edge) => (edge.targetHandle ?? "if") === "if")
            .map((edge) => getEdgeSignalState(edge, nodeById.get(edge.source), evaluation))
            .filter((currentSignal) => currentSignal.valid);

          nextSignal = ifInputSignals.length > 0
            ? signal(ifInputSignals.some((currentSignal) => currentSignal.value))
            : emptySignal();
          break;
        }
        case "not": {
          const firstSignal = inputSignals[0];
          nextSignal = firstSignal ? signal(!firstSignal.value) : emptySignal();
          break;
        }
        default:
          nextSignal = emptySignal();
          break;
      }

      const currentSignal = getNodeSignal(evaluation, node.id);
      if (!signalsEqual(currentSignal, nextSignal)) {
        evaluation[node.id] = nextSignal;
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return evaluation;
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export default function AutomationFlowEditor() {
  const { t } = useTranslation();
  const [pages, setPages] = useState<AutomationFlowPageDto[]>([DEFAULT_PAGE]);
  const [activePageId, setActivePageId] = useState<string>(DEFAULT_AUTOMATION_FLOW_PAGE_ID);
  const [nodes, setNodes] = useState<AutomationNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<AutomationEdge[]>(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(INITIAL_NODES[0]?.id ?? null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastActiveTurnoutCommandsRef = useRef<Set<string>>(new Set());
  const lastActiveSignalCommandKeysRef = useRef<Set<string>>(new Set());

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const evaluationState = useMemo(() => evaluateAutomation(nodes, edges), [nodes, edges]);

  const visibleNodes = useMemo(
    () => nodes.filter(node => getNodePageId(node) === activePageId),
    [activePageId, nodes]
  );

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map(node => node.id)),
    [visibleNodes]
  );

  const visibleEdges = useMemo(
    () => edges.filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    [edges, visibleNodeIds]
  );

  const simulatedNodes = useMemo(
    () =>
      visibleNodes.map((node) => {
        const currentSignal = getNodeSignal(evaluationState, node.id);
        const resolvedSignalAspect = node.data.kind === "signal"
          ? currentSignal.signalAspect ?? "red"
          : undefined;

        return {
          ...node,
          data: {
            ...node.data,
            active: currentSignal.valid && currentSignal.value,
            outputValid: currentSignal.valid,
            ...(resolvedSignalAspect
              ? {
                  resolvedSignalAspect,
                  outputCommand: resolvedSignalAspect,
                }
              : {}),
          },
        };
      }),
    [evaluationState, visibleNodes]
  );

  const simulatedEdges = useMemo(
    () =>
      visibleEdges.map((edge) => {
        const sourceNode = nodeById.get(edge.source);
        const currentSignal = getEdgeSignalState(edge, sourceNode, evaluationState);
        const active = currentSignal.valid;

        return {
          ...edge,
          animated: active,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: {
            strokeWidth: active ? 3 : 1.5,
            stroke: active
              ? currentSignal.value
                ? "var(--mantine-color-green-5)"
                : "var(--mantine-color-blue-5)"
              : "var(--mantine-color-gray-5)",
          },
        };
      }),
    [evaluationState, nodeById, visibleEdges]
  );

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedNodeOnActivePage = selectedNode && getNodePageId(selectedNode) === activePageId
    ? selectedNode
    : null;
  const snapshot = useMemo(() => createSnapshot(pages, activePageId, nodes, edges), [activePageId, edges, nodes, pages]);

  const activeOutputs = useMemo<AutomationNode[]>(
    () => nodes.flatMap<AutomationNode>(node => {
      if (getNodePageId(node) !== activePageId) {
        return [];
      }

      const currentSignal = getNodeSignal(evaluationState, node.id);
      if (node.data.kind === "signal") {
        if (!currentSignal.valid) {
          return [];
        }

        const aspect = currentSignal.signalAspect ?? "red";
        const signalData: AutomationFlowNodeData = {
          ...node.data,
          outputCommand: aspect,
          resolvedSignalAspect: aspect,
          ...(typeof node.data.signalAddress === "number"
            ? { ioKey: `signal:${node.data.signalAddress}:${aspect}` }
            : typeof node.data.ioKey === "string"
              ? { ioKey: node.data.ioKey }
              : {}),
        };

        return [{
          ...node,
          data: signalData,
        }];
      }

      if (
        currentSignal.valid &&
        currentSignal.value &&
        (node.data.kind === "turnoutCommand" || node.data.kind === "output")
      ) {
        return [node];
      }

      return [];
    }),
    [activePageId, evaluationState, nodes]
  );

  useEffect(() => {
    if (selectedNode && !selectedNodeOnActivePage) {
      setSelectedNodeId(null);
    }
  }, [selectedNode, selectedNodeOnActivePage]);

  useEffect(() => {
    const nextActiveTurnoutCommands = new Set<string>();
    const nextActiveSignalCommandKeys = new Set<string>();

    for (const node of nodes) {
      const currentSignal = getNodeSignal(evaluationState, node.id);
      if (!currentSignal.valid) {
        continue;
      }

      if (node.data.kind === "signal") {
        const address = node.data.signalAddress;
        const aspect = currentSignal.signalAspect ?? "red";
        const addressLength = node.data.signalAddressLength ?? 1;
        const bits = getSignalAspectBits(node.data, aspect);
        const commandKey = `${node.id}:${address ?? "?"}:${aspect}:${addressLength}:${bits}`;
        nextActiveSignalCommandKeys.add(commandKey);

        if (lastActiveSignalCommandKeysRef.current.has(commandKey)) {
          continue;
        }

        if (typeof address !== "number" || !Number.isFinite(address)) {
          setStatusText(t("automation.status.signalCommandMissingAddress", { label: node.data.label }));
          continue;
        }

        let allSent = true;
        for (let i = 0; i < addressLength; i += 1) {
          const accessoryAddress = address + i;
          const active = ((bits >> i) & 1) === 1;
          allSent = wsApi.setBasicAccessory(accessoryAddress, active) && allSent;
        }

        setStatusText(
          allSent
            ? t("automation.status.signalCommandSent", { address, aspect: t(`automation.aspects.${aspect}`), bits })
            : t("automation.status.signalCommandFailed", { address, aspect: t(`automation.aspects.${aspect}`) })
        );
        continue;
      }

      if (!currentSignal.value) {
        continue;
      }

      if (node.data.kind === "turnoutCommand") {
        nextActiveTurnoutCommands.add(node.id);

        if (lastActiveTurnoutCommandsRef.current.has(node.id)) {
          continue;
        }

        const address = node.data.turnoutAddress;
        if (typeof address !== "number" || !Number.isFinite(address)) {
          setStatusText(t("automation.status.turnoutCommandMissingAddress", { label: node.data.label }));
          continue;
        }

        const logicalClosed = node.data.turnoutClosed ?? true;
        const physicalClosed = getPhysicalTurnoutClosedFromLogical(logicalClosed, node.data.turnoutClosedValue);
        const commandLabel = getTurnoutCommandLabel(address, logicalClosed);
        const sent = wsApi.setTurnout(address, physicalClosed);
        setStatusText(
          sent
            ? t("automation.status.turnoutCommandSent", { label: commandLabel, physicalClosed: String(physicalClosed) })
            : t("automation.status.turnoutCommandFailed", { label: commandLabel })
        );
      }
    }

    lastActiveTurnoutCommandsRef.current = nextActiveTurnoutCommands;
    lastActiveSignalCommandKeysRef.current = nextActiveSignalCommandKeys;
  }, [evaluationState, nodes, t]);

  const applyDocument = useCallback((document: AutomationFlowDocumentDto): void => {
    if (document.nodes.length === 0) {
      setPages([DEFAULT_PAGE]);
      setActivePageId(DEFAULT_AUTOMATION_FLOW_PAGE_ID);
      setNodes(INITIAL_NODES);
      setEdges(INITIAL_EDGES);
      setSelectedNodeId(INITIAL_NODES[0]?.id ?? null);
      return;
    }

    const normalizedPages = normalizePages(document.pages);
    const normalizedActivePageId = getValidActivePageId(normalizedPages, document.activePageId);
    const validPageIds = new Set(normalizedPages.map(page => page.id));
    const normalizedNodes = (document.nodes as AutomationNode[]).map(node => ({
      ...node,
      data: {
        ...node.data,
        pageId: typeof node.data.pageId === "string" && validPageIds.has(node.data.pageId)
          ? node.data.pageId
          : normalizedActivePageId,
        ...(node.data.kind === "signal" && typeof node.data.signalAddress === "number"
          ? { ioKey: getSignalIoKey(node.data.signalAddress) }
          : {}),
      },
    }));

    setPages(normalizedPages);
    setActivePageId(normalizedActivePageId);
    setNodes(normalizedNodes);
    setEdges(document.edges as AutomationEdge[]);
    setSelectedNodeId(normalizedNodes.find(node => getNodePageId(node) === normalizedActivePageId)?.id ?? null);
  }, []);

  const loadFlow = useCallback(async (): Promise<void> => {
    setLoading(true);
    setStatusText(t("automation.status.loading"));

    try {
      const document = await loadAutomationFlowWs();
      const mappings = await loadLayoutAutomationMappings();
      const mappedDocument = applyLayoutAutomationMappings(document, mappings);
      applyDocument(mappedDocument);
      wsApi.getLayoutRuntimeSnapshot();
      setStatusText(
        t("automation.status.loaded", {
          nodes: mappedDocument.nodes.length,
          edges: mappedDocument.edges.length,
          pages: normalizePages(mappedDocument.pages).length,
          turnouts: mappings.turnoutClosedValueByAddress.size,
          signals: mappings.signalByAddress.size,
        })
      );
    } catch (error) {
      setStatusText(t("automation.status.loadError", { message: error instanceof Error ? error.message : String(error) }));
    } finally {
      setLoading(false);
    }
  }, [applyDocument, t]);

  useEffect(() => {
    void loadFlow();
  }, [loadFlow]);

  useEffect(() => {
    const unsubscribeSensor = wsClient.on("sensorChanged", data => {
      setNodes(currentNodes => currentNodes.map(node => {
        if (node.data.kind !== "sensor" || node.data.sensorAddress !== data.address) {
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
        if (node.data.kind !== "turnout" || node.data.turnoutAddress !== data.address) {
          return node;
        }

        const actualLogicalClosed = getLogicalTurnoutClosedFromPhysical(
          data.closed,
          node.data.turnoutClosedValue
        );
        const expectedLogicalClosed = node.data.turnoutClosed ?? true;

        return {
          ...node,
          data: {
            ...node.data,
            active: actualLogicalClosed === expectedLogicalClosed,
          },
        };
      }));
    });

    const unsubscribeFlowChanged = wsClient.on("automationFlowChanged", document => {
      void (async () => {
        const mappings = await loadLayoutAutomationMappings();
        applyDocument(applyLayoutAutomationMappings(document, mappings));
        setStatusText(t("automation.status.changedByOtherClient"));
        wsApi.getLayoutRuntimeSnapshot();
      })();
    });

    wsApi.getLayoutRuntimeSnapshot();

    return () => {
      unsubscribeSensor();
      unsubscribeTurnout();
      unsubscribeFlowChanged();
    };
  }, [applyDocument, t]);

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

    if (!visibleNodeIds.has(connection.source) || !visibleNodeIds.has(connection.target)) {
      return;
    }

    setEdges((currentEdges) =>
      addEdge(
        {
          ...connection,
          id: [
            connection.source,
            connection.sourceHandle ?? "out",
            connection.target,
            connection.targetHandle ?? "in",
            Date.now(),
          ].join("-"),
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
        },
        currentEdges
      ) as AutomationEdge[]
    );
  }, [visibleNodeIds]);

  function addNode(kind: AutomationFlowNodeKind) {
    const definition = NODE_DEFINITIONS[kind];
    const index = visibleNodes.length + 1;

    setNodes((currentNodes) => [
      ...currentNodes,
      {
        id: `${kind}-${Date.now()}`,
        type: "automationNode",
        position: { x: 120 + (index % 4) * 180, y: 120 + Math.floor(index / 4) * 120 },
        data: {
          kind,
          label: getNodeTitle(kind, definition.title, t),
          pageId: activePageId,
          description: getNodeDescription(kind, definition.description, t),
          ...definition.defaultData,
        },
      },
    ]);
  }

  function addPage() {
    const page: AutomationFlowPageDto = {
      id: createPageId(),
      name: `${t("automation.panel.automationPage")} ${pages.length + 1}`,
    };

    setPages(currentPages => [...currentPages, page]);
    setActivePageId(page.id);
    setSelectedNodeId(null);
    setStatusText(t("automation.status.pageCreated", { name: page.name }));
  }

  function deleteActivePage() {
    if (pages.length <= 1) {
      setStatusText(t("automation.status.lastPageCannotDelete"));
      return;
    }

    const pageToDelete = pages.find(page => page.id === activePageId);
    const nextPages = pages.filter(page => page.id !== activePageId);
    const nextActivePageId = nextPages[0]?.id ?? DEFAULT_AUTOMATION_FLOW_PAGE_ID;
    const removedNodeIds = new Set(nodes
      .filter(node => getNodePageId(node) === activePageId)
      .map(node => node.id));

    setPages(nextPages);
    setActivePageId(nextActivePageId);
    setNodes(currentNodes => currentNodes.filter(node => getNodePageId(node) !== activePageId));
    setEdges(currentEdges => currentEdges.filter(edge => !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target)));
    setSelectedNodeId(null);
    setStatusText(t("automation.status.pageDeleted", { name: pageToDelete?.name ?? activePageId }));
  }

  function updateActivePageName(name: string) {
    setPages(currentPages => currentPages.map(page => (
      page.id === activePageId
        ? { ...page, name: name.trim().length > 0 ? name : page.name }
        : page
    )));
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
    setPages([DEFAULT_PAGE]);
    setActivePageId(DEFAULT_AUTOMATION_FLOW_PAGE_ID);
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    setSelectedNodeId(INITIAL_NODES[0]?.id ?? null);
    setStatusText(t("automation.status.resetSample"));
  }

  async function saveFlow() {
    setSaving(true);
    setStatusText(t("automation.status.saving"));

    try {
      const document = await saveAutomationFlowWs(snapshot);
      applyDocument(document);
      setStatusText(t("automation.status.saved", {
        nodes: document.nodes.length,
        edges: document.edges.length,
        pages: normalizePages(document.pages).length,
      }));
    } catch (error) {
      setStatusText(t("automation.status.saveError", { message: error instanceof Error ? error.message : String(error) }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AutomationFlowLayout
      activeOutputs={activeOutputs}
      activePageId={activePageId}
      edges={edges}
      loading={loading}
      nodes={nodes}
      onAddNode={addNode}
      onAddPage={addPage}
      onDeleteActivePage={deleteActivePage}
      onDeleteSelectedNode={deleteSelectedNode}
      onLoadFlow={() => void loadFlow()}
      onPageChange={(pageId) => {
        if (!pageId || !pages.some(page => page.id === pageId)) {
          return;
        }

        setActivePageId(pageId);
        setSelectedNodeId(null);
      }}
      onResetFlow={resetFlow}
      onSaveFlow={() => void saveFlow()}
      onSelectedNodeDataChange={updateSelectedNodeData}
      onUpdateActivePageName={updateActivePageName}
      pages={pages}
      saving={saving}
      selectedNode={selectedNodeOnActivePage}
      snapshot={snapshot}
      statusText={statusText}
      visibleNodeCount={visibleNodes.length}
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
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
        <Controls />
      </ReactFlow>
    </AutomationFlowLayout>
  );
}

type AutomationFlowLayoutProps = {
  activeOutputs: AutomationNode[];
  activePageId: string;
  children: ReactNode;
  edges: AutomationEdge[];
  loading: boolean;
  nodes: AutomationNode[];
  onAddNode: (kind: AutomationFlowNodeKind) => void;
  onAddPage: () => void;
  onDeleteActivePage: () => void;
  onDeleteSelectedNode: () => void;
  onLoadFlow: () => void;
  onPageChange: (pageId: string | null) => void;
  onResetFlow: () => void;
  onSaveFlow: () => void;
  onSelectedNodeDataChange: (patch: Partial<AutomationFlowNodeData>) => void;
  onUpdateActivePageName: (name: string) => void;
  pages: AutomationFlowPageDto[];
  saving: boolean;
  selectedNode: AutomationNode | null;
  snapshot: AutomationFlowDocumentDto;
  statusText: string | null;
  visibleNodeCount: number;
};

function AutomationFlowLayout({
  activeOutputs,
  activePageId,
  children,
  edges,
  loading,
  nodes,
  onAddNode,
  onAddPage,
  onDeleteActivePage,
  onDeleteSelectedNode,
  onLoadFlow,
  onPageChange,
  onResetFlow,
  onSaveFlow,
  onSelectedNodeDataChange,
  onUpdateActivePageName,
  pages,
  saving,
  selectedNode,
  snapshot,
  statusText,
  visibleNodeCount,
}: AutomationFlowLayoutProps) {
  const { t } = useTranslation();
  const statusIsError = ["hiba", "error", "fehler"].some(token => statusText?.toLocaleLowerCase().includes(token));
  const activePage = pages.find(page => page.id === activePageId) ?? pages[0];

  return (
    <Group align="stretch" gap="md" wrap="nowrap" style={{ minHeight: "calc(100vh - 150px)" }}>
      <Card withBorder radius="md" p="sm" w={260}>
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={5}>{t("automation.panel.nodePalette")}</Title>
            <Badge variant="light">{visibleNodeCount}/{nodes.length} node</Badge>
          </Group>

          <Divider />

          <Stack gap="xs">
            <Select
              label={t("automation.panel.automationPage")}
              data={pages.map(page => ({ value: page.id, label: page.name }))}
              value={activePageId}
              onChange={onPageChange}
              searchable
              allowDeselect={false}
            />

            {activePage && (
              <TextInput
                label={t("automation.panel.pageName")}
                value={activePage.name}
                onChange={(event) => onUpdateActivePageName(event.currentTarget.value)}
              />
            )}

            <Group grow gap="xs">
              <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={onAddPage}>
                {t("automation.panel.addPage")}
              </Button>
              <Button size="xs" variant="light" color="red" leftSection={<IconTrash size={14} />} onClick={onDeleteActivePage} disabled={pages.length <= 1}>
                {t("automation.panel.deletePage")}
              </Button>
            </Group>
          </Stack>

          <Divider />

          <ScrollArea h="calc(100vh - 390px)">
            <Stack gap="md" pr="xs">
              {NODE_GROUPS.map((group) => (
                <Stack key={group} gap="xs">
                  <Text size="xs" fw={800} c="dimmed" tt="uppercase">
                    {t(getNodeGroupKey(group))}
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
                        {getNodeTitle(kind as AutomationFlowNodeKind, definition.title, t)}
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

      <Card withBorder radius="md" p="sm" w={380}>
        <Stack gap="sm" h="100%">
          <Group justify="space-between">
            <Title order={5}>{t("automation.panel.properties")}</Title>

            <Group gap={4}>
              <Tooltip label={t("automation.panel.saveToServer")}>
                <ActionIcon variant="light" onClick={onSaveFlow} loading={saving}>
                  <IconDeviceFloppy size={16} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label={t("automation.panel.loadFromServer")}>
                <ActionIcon variant="light" onClick={onLoadFlow} loading={loading}>
                  <IconPlayerPlay size={16} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label={t("automation.panel.resetSample")}>
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

          <ScrollArea style={{ flex: 1 }}>
            {selectedNode ? (
              <Stack gap="sm" pr="xs">
                <SelectedNodeEditor
                  node={selectedNode}
                  onChange={onSelectedNodeDataChange}
                  onDelete={onDeleteSelectedNode}
                />

                <Divider />

                <ActiveOutputsPanel activeOutputs={activeOutputs} />

                <Divider />

                <JsonPreview snapshot={snapshot} edgeCount={edges.length} />
              </Stack>
            ) : (
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  {t("automation.panel.selectNodeHint")}
                </Text>

                <Divider />
                <ActiveOutputsPanel activeOutputs={activeOutputs} />
                <Divider />
                <JsonPreview snapshot={snapshot} edgeCount={edges.length} />
              </Stack>
            )}
          </ScrollArea>
        </Stack>
      </Card>
    </Group>
  );
}

type SelectedNodeEditorProps = {
  node: AutomationNode;
  onChange: (patch: Partial<AutomationFlowNodeData>) => void;
  onDelete: () => void;
};

function SelectedNodeEditor({ node, onChange, onDelete }: SelectedNodeEditorProps) {
  const { t } = useTranslation();

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start">
        <Box>
          <Badge variant="light" color="blue">
            {getNodeTitle(node.data.kind, NODE_DEFINITIONS[node.data.kind].title, t)}
          </Badge>
          <Text size="xs" c="dimmed" mt={4}>
            {node.id}
          </Text>
        </Box>

        <ActionIcon color="red" variant="light" onClick={onDelete}>
          <IconTrash size={16} />
        </ActionIcon>
      </Group>

      <TextInput
        label={t("automation.panel.label")}
        value={node.data.label}
        onChange={(event) => onChange({ label: event.currentTarget.value })}
      />

      <TextInput
        label={t("automation.panel.ioKey")}
        description={t("automation.panel.ioKeyDescription")}
        value={node.data.ioKey ?? ""}
        onChange={(event) => onChange({ ioKey: event.currentTarget.value })}
      />

      {node.data.kind === "sensor" && <SensorNodeFields node={node} onChange={onChange} onDelete={onDelete} />}
      {node.data.kind === "turnout" && <TurnoutNodeFields node={node} onChange={onChange} onDelete={onDelete} />}
      {node.data.kind === "signal" && <SignalNodeFields node={node} onChange={onChange} onDelete={onDelete} />}
      {node.data.kind === "turnoutCommand" && <TurnoutCommandNodeFields node={node} onChange={onChange} onDelete={onDelete} />}

      {node.data.kind === "ifThenElse" && (
        <Text size="xs" c="dimmed">
          {t("automation.fields.ifThenElseInfo")}
        </Text>
      )}

      {isInputNode(node.data.kind) && (
        <Switch
          checked={node.data.active === true}
          label={t("automation.fields.simulatedInputActive")}
          onChange={(event) => onChange({ active: event.currentTarget.checked })}
        />
      )}

      {node.data.kind === "timer" && (
        <NumberInput
          label={t("automation.fields.delayMs")}
          min={0}
          step={100}
          value={node.data.delayMs ?? 0}
          onChange={(value) => onChange({ delayMs: toNumber(value) })}
        />
      )}

      {node.data.kind === "output" && (
        <TextInput
          label={t("automation.fields.outputCommand")}
          value={node.data.outputCommand ?? ""}
          onChange={(event) => onChange({ outputCommand: event.currentTarget.value })}
        />
      )}

      <Textarea
        label={t("automation.panel.comment")}
        autosize
        minRows={2}
        value={node.data.description ?? ""}
        onChange={(event) => onChange({ description: event.currentTarget.value })}
      />
    </Stack>
  );
}

function SensorNodeFields({ node, onChange }: SelectedNodeEditorProps) {
  const { t } = useTranslation();

  return (
    <NumberInput
      label={t("automation.fields.sensorAddress")}
      description={t("automation.fields.sensorAddressDescription")}
      min={0}
      step={1}
      value={node.data.sensorAddress ?? 0}
      onChange={(value) => {
        const address = toNumber(value);
        onChange({
          sensorAddress: address,
          ioKey: `sensor:${address}`,
        });
        wsApi.getLayoutRuntimeSnapshot();
      }}
    />
  );
}

function TurnoutNodeFields({ node, onChange }: SelectedNodeEditorProps) {
  const { t } = useTranslation();

  return (
    <Stack gap="xs">
      <NumberInput
        label={t("automation.fields.turnoutAddress")}
        description={t("automation.fields.turnoutAddressDescription")}
        min={0}
        step={1}
        value={node.data.turnoutAddress ?? 0}
        onChange={(value) => {
          const address = toNumber(value);
          const logicalClosed = node.data.turnoutClosed ?? true;
          onChange({
            turnoutAddress: address,
            ioKey: getTurnoutIoKey(address, logicalClosed),
          });
          wsApi.getLayoutRuntimeSnapshot();
        }}
      />

      <Switch
        checked={node.data.turnoutClosed ?? true}
        label={t("automation.fields.turnoutExpectedClosed")}
        description={t("automation.fields.turnoutExpectedClosedDescription")}
        onChange={(event) => {
          const logicalClosed = event.currentTarget.checked;
          const address = node.data.turnoutAddress ?? 0;
          onChange({
            turnoutClosed: logicalClosed,
            ioKey: getTurnoutIoKey(address, logicalClosed),
          });
          wsApi.getLayoutRuntimeSnapshot();
        }}
      />

      <Switch
        checked={node.data.turnoutClosedValue ?? true}
        label={t("automation.fields.physicalClosedMeansLogicalClosed")}
        description={t("automation.fields.physicalClosedMeansLogicalClosedDescription")}
        onChange={(event) => {
          onChange({ turnoutClosedValue: event.currentTarget.checked });
          wsApi.getLayoutRuntimeSnapshot();
        }}
      />
    </Stack>
  );
}

function SignalNodeFields({ node, onChange }: SelectedNodeEditorProps) {
  const { t } = useTranslation();
  const addressLength = node.data.signalAddressLength ?? 1;

  return (
    <Stack gap="xs">
      <NumberInput
        label={t("automation.fields.signalAddress")}
        description={t("automation.fields.signalAddressDescription")}
        min={0}
        step={1}
        value={node.data.signalAddress ?? 0}
        onChange={(value) => {
          const address = toNumber(value);
          onChange({
            signalAddress: address,
            ioKey: getSignalIoKey(address),
          });
        }}
      />

      <Text size="xs" c="dimmed">
        Bemenetek: green, yellow, white. Pontosan egy true bemenet állítja a jelzőképet. Ha nincs true vagy több true érkezik, a parancs red lesz.
      </Text>

      <Group gap="xs" wrap="wrap">
        <Badge color="red" variant="light">red: {getSignalAspectBits(node.data, "red")}</Badge>
        <Badge color="yellow" variant="light">yellow: {getSignalAspectBits(node.data, "yellow")}</Badge>
        <Badge color="green" variant="light">green: {getSignalAspectBits(node.data, "green")}</Badge>
        <Badge color="gray" variant="light">white: {getSignalAspectBits(node.data, "white")}</Badge>
        <Badge color="blue" variant="light">len: {addressLength}</Badge>
      </Group>
    </Stack>
  );
}

function TurnoutCommandNodeFields({ node, onChange }: SelectedNodeEditorProps) {
  const { t } = useTranslation();

  return (
    <Stack gap="xs">
      <NumberInput
        label={t("automation.fields.turnoutAddress")}
        description={t("automation.fields.turnoutCommandAddressDescription")}
        min={0}
        step={1}
        value={node.data.turnoutAddress ?? 0}
        onChange={(value) => {
          const address = toNumber(value);
          const logicalClosed = node.data.turnoutClosed ?? true;
          onChange({
            turnoutAddress: address,
            ioKey: getTurnoutCommandIoKey(address, logicalClosed),
            outputCommand: getTurnoutStateLabel(logicalClosed),
          });
        }}
      />

      <Switch
        checked={node.data.turnoutClosed ?? true}
        label={t("automation.fields.turnoutCommandClosed")}
        description={t("automation.fields.turnoutCommandClosedDescription")}
        onChange={(event) => {
          const logicalClosed = event.currentTarget.checked;
          const address = node.data.turnoutAddress ?? 0;
          onChange({
            turnoutClosed: logicalClosed,
            ioKey: getTurnoutCommandIoKey(address, logicalClosed),
            outputCommand: getTurnoutStateLabel(logicalClosed),
          });
        }}
      />

      <Switch
        checked={node.data.turnoutClosedValue ?? true}
        label={t("automation.fields.physicalClosedMeansLogicalClosed")}
        description={t("automation.fields.physicalClosedMeansLogicalClosedCommandDescription")}
        onChange={(event) => onChange({ turnoutClosedValue: event.currentTarget.checked })}
      />
    </Stack>
  );
}

function ActiveOutputsPanel({ activeOutputs }: { activeOutputs: AutomationNode[] }) {
  const { t } = useTranslation();

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text fw={800} size="sm">
          {t("automation.panel.simulatedActiveOutputs")}
        </Text>
        <Badge color={activeOutputs.length > 0 ? "green" : "gray"} variant="light">
          {activeOutputs.length}
        </Badge>
      </Group>

      {activeOutputs.length === 0 ? (
        <Text size="xs" c="dimmed">
          {t("automation.panel.noActiveOutput")}
        </Text>
      ) : (
        activeOutputs.map((node) => (
          <Badge key={node.id} color={node.data.outputCommand === "red" ? "red" : "green"} variant="filled" w="fit-content">
            {node.data.ioKey ?? node.data.label}: {node.data.outputCommand ?? "on"}
          </Badge>
        ))
      )}
    </Stack>
  );
}

function JsonPreview({ snapshot, edgeCount }: { snapshot: AutomationFlowDocumentDto; edgeCount: number }) {
  const { t } = useTranslation();

  return (
    <Stack gap="xs" style={{ minHeight: 0 }}>
      <Group justify="space-between">
        <Text fw={800} size="sm">
          {t("automation.panel.jsonPreview")}
        </Text>
        <Badge variant="light" color="gray">
          {t("automation.panel.edges", { count: edgeCount })}
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
  );
}

function createSnapshot(
  pages: AutomationFlowPageDto[],
  activePageId: string,
  nodes: AutomationNode[],
  edges: AutomationEdge[]
): AutomationFlowDocumentDto {
  return {
    version: 1,
    name: "Vasútmodell automatika alap",
    pages: normalizePages(pages),
    activePageId,
    nodes: nodes.map(node => ({
      id: node.id,
      type: "automationNode",
      position: node.position,
      data: {
        ...node.data,
        pageId: getNodePageId(node),
        ...(node.data.kind === "signal" && typeof node.data.signalAddress === "number"
          ? {
              ioKey: getSignalIoKey(node.data.signalAddress),
              signalAspect: "red",
              outputCommand: "red",
            }
          : {}),
      },
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(typeof edge.type === "string" ? { type: edge.type } : {}),
      ...(typeof edge.sourceHandle === "string" ? { sourceHandle: edge.sourceHandle } : {}),
      ...(typeof edge.targetHandle === "string" ? { targetHandle: edge.targetHandle } : {}),
    })),
  };
}
