// common/src/automationFlow.ts

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

export type AutomationFlowNodeData = Record<string, unknown> & {
  kind: AutomationFlowNodeKind;
  label: string;
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
  nodes: AutomationFlowNodeDto[];
  edges: AutomationFlowEdgeDto[];
  updatedAt?: string;
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

export const createEmptyAutomationFlowDocument = (): AutomationFlowDocumentDto => ({
  version: 1,
  name: "Vasútmodell automatika",
  nodes: [],
  edges: [],
});
