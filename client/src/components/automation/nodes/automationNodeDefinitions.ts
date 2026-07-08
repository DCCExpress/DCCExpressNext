import type {
  AutomationFlowNodeData,
  AutomationFlowNodeKind,
} from "../../../../../common/src/automationFlow";

export type AutomationNodeGroup =
  | "Bemenet"
  | "Logika"
  | "Vasút"
  | "Kimenet";

export type AutomationNodeDefinition = {
  title: string;
  group: AutomationNodeGroup;
  description: string;
  icon: string;
  defaultData?: Partial<AutomationFlowNodeData>;
};

export const NODE_DEFINITIONS: Record<AutomationFlowNodeKind, AutomationNodeDefinition> = {
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
  ifThenElse: {
    title: "IF / THEN / ELSE",
    group: "Logika",
    description: "Első bemenet: IF feltétel, második: THEN ág, harmadik: ELSE ág.",
    icon: "?",
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

export const NODE_GROUPS: AutomationNodeGroup[] = ["Bemenet", "Logika", "Vasút", "Kimenet"];

export function isInputNode(kind: AutomationFlowNodeKind): boolean {
  return kind === "blockOccupied" || kind === "sensor" || kind === "button";
}

export function hasTargetHandle(kind: AutomationFlowNodeKind): boolean {
  return !isInputNode(kind);
}

export function hasSourceHandle(kind: AutomationFlowNodeKind): boolean {
  return kind !== "signal" && kind !== "turnout" && kind !== "output";
}
