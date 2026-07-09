// common/src/automationFlow.ts

export const DEFAULT_AUTOMATION_FLOW_PAGE_ID = "main";

export type AutomationFlowNodeKind =
  | "blockOccupied"
  | "sensor"
  | "button"
  | "and"
  | "or"
  | "not"
  | "ifThenElse"
  | "timer"
  | "latch"
  | "routeLock"
  | "signal"
  | "turnout"
  | "turnoutCommand"
  | "output";

export type AutomationSignalAspect =
  | "red"
  | "yellow"
  | "green"
  | "white";

export type AutomationFlowPageDto = {
  id: string;
  name: string;
  enabled?: boolean;
};

export type AutomationFlowNodeData = Record<string, unknown> & {
  kind: AutomationFlowNodeKind;
  label: string;
  pageId?: string;
  description?: string;
  ioKey?: string;
  sensorAddress?: number;
  turnoutAddress?: number;
  /**
   * Logikai váltóállás.
   * true = logikai closed/egyenes, false = logikai thrown/kitérő.
   */
  turnoutClosed?: boolean;
  /**
   * Fizikai command-center bit, amely a logikai closed/egyenes állást jelenti.
   * Balos/jobbos váltóknál ez eltérhet.
   */
  turnoutClosedValue?: boolean;
  signalAddress?: number;
  signalAspect?: AutomationSignalAspect;
  signalAddressLength?: number;
  signalValueRed?: number;
  signalValueYellow?: number;
  signalValueGreen?: number;
  signalValueWhite?: number;
  delayMs?: number;
  outputCommand?: string;
  active?: boolean;
};

export type AutomationFlowPositionDto = {
  x: number;
  y: number;
};

export type AutomationFlowNodeDto = {
  id: string;
  type: "automationNode";
  position: AutomationFlowPositionDto;
  data: AutomationFlowNodeData;
};

export type AutomationFlowEdgeDto = Record<string, unknown> & {
  id: string;
  source: string;
  target: string;
  type?: string | undefined;
  sourceHandle?: string | undefined;
  targetHandle?: string | undefined;
};

export type AutomationFlowDocumentDto = {
  version: 1;
  name: string;
  pages: AutomationFlowPageDto[];
  activePageId?: string;
  nodes: AutomationFlowNodeDto[];
  edges: AutomationFlowEdgeDto[];
  updatedAt?: string;
};

export type AutomationFlowRuntimeStatus =
  | "running"
  | "stopped";

export type AutomationFlowRuntimeSnapshotDto = {
  status: AutomationFlowRuntimeStatus;
  running: boolean;
  updatedAt: string;
  lastReason?: string;
  lastEvaluationAt?: string;
  lastError?: string;
};

export type AutomationFlowCommandAction =
  | "load"
  | "save";

export type AutomationFlowCommandPayload = {
  requestId: string;
  action: AutomationFlowCommandAction;
  document?: AutomationFlowDocumentDto;
};

export type AutomationFlowResponsePayload = {
  requestId: string;
  action: AutomationFlowCommandAction;
  ok: boolean;
  message?: string;
  document?: AutomationFlowDocumentDto;
  created?: boolean;
};

export type AutomationFlowRuntimeCommandAction =
  | "snapshot"
  | "run"
  | "stop";

export type AutomationFlowRuntimeCommandPayload = {
  requestId: string;
  action: AutomationFlowRuntimeCommandAction;
};

export type AutomationFlowRuntimeResponsePayload = {
  requestId: string;
  action: AutomationFlowRuntimeCommandAction;
  ok: boolean;
  message?: string;
  snapshot?: AutomationFlowRuntimeSnapshotDto;
};

export const createDefaultAutomationFlowPage = (): AutomationFlowPageDto => ({
  id: DEFAULT_AUTOMATION_FLOW_PAGE_ID,
  name: "Fő lap",
  enabled: true,
});

export const createEmptyAutomationFlowDocument = (): AutomationFlowDocumentDto => ({
  version: 1,
  name: "Vasútmodell automatika",
  pages: [createDefaultAutomationFlowPage()],
  activePageId: DEFAULT_AUTOMATION_FLOW_PAGE_ID,
  nodes: [],
  edges: [],
});
