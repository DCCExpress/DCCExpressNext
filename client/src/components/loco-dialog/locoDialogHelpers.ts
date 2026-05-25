import type { Loco, LocoAction, LocoActionHook, LocoFunction } from "../../../../common/src/types";

import { generateId } from "../../helpers";

export type LocoActionType = LocoAction["type"];

export const ACTION_HOOKS: { value: LocoActionHook; label: string; description: string }[] = [
  { value: "beforeStart", label: "Before start", description: "Runs before the task starts the loco." },
  { value: "afterStart", label: "After start", description: "Runs after the loco start command was sent." },
  { value: "beforeStop", label: "Before stop", description: "Runs before a normal task stop." },
  { value: "afterStop", label: "After stop", description: "Runs after the loco stop command was sent." },
];

export const ACTION_TYPE_OPTIONS: { value: LocoActionType; label: string }[] = [
  { value: "setFunction", label: "Function ON/OFF" },
  { value: "momentaryFunction", label: "Momentary function" },
  { value: "playAudio", label: "Audio" },
  { value: "wait", label: "Wait" },
];

export const createEmptyLocoActions = (): Record<LocoActionHook, LocoAction[]> => ({
  beforeStart: [],
  afterStart: [],
  beforeStop: [],
  afterStop: [],
});

export const createEmptyLoco = (): Loco => ({
  id: generateId(),
  name: "",
  address: 3,
  maxSpeed: 100,
  invert: false,
  image: "",
  length: 200,
  functions: [],
  actions: createEmptyLocoActions(),
});

export const createDefaultFunction = (nextNumber: number): LocoFunction => ({
  id: generateId(),
  number: nextNumber,
  name: `F${nextNumber}`,
  icon: "💡",
  momentary: false,
});

export const createDefaultAction = (type: LocoActionType = "wait"): LocoAction => {
  switch (type) {
    case "setFunction":
      return { id: generateId(), type, functionNumber: 0, active: true };
    case "momentaryFunction":
      return { id: generateId(), type, functionNumber: 2, ms: 200 };
    case "playAudio":
      return { id: generateId(), type, fileName: "" };
    case "wait":
      return { id: generateId(), type, ms: 500 };
  }
};

export const convertActionType = (action: LocoAction, type: LocoActionType): LocoAction => ({
  ...createDefaultAction(type),
  id: action.id,
});

export const getLocoActions = (loco: Loco, hook: LocoActionHook): LocoAction[] => loco.actions?.[hook] ?? [];

export const getActionSummary = (action: LocoAction): string => {
  switch (action.type) {
    case "setFunction":
      return `F${action.functionNumber} ${action.active ? "ON" : "OFF"}`;
    case "momentaryFunction":
      return `F${action.functionNumber} pulse ${action.ms} ms`;
    case "playAudio":
      return action.fileName ? `Audio ${action.fileName}` : "Audio";
    case "wait":
      return `Wait ${action.ms} ms`;
  }
};

export const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number): T[] => {
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  if (item === undefined) return items;
  next.splice(toIndex, 0, item);
  return next;
};
