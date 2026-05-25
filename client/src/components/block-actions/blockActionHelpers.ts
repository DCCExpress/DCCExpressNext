import type { BlockAction, BlockActionHook } from "../../../../common/src/types";
import { generateId } from "../../helpers";

export type BlockActionType = BlockAction["type"];

export const BLOCK_ACTION_HOOKS: {
  value: BlockActionHook;
  label: string;
  description: string;
}[] = [
  {
    value: "onTrainEnter",
    label: "Train enters block",
    description: "Runs when a train arrives into this block.",
  },
  {
    value: "onTrainLeave",
    label: "Train leaves block",
    description: "Runs when a train leaves this block.",
  },
];

export const BLOCK_ACTION_TYPE_OPTIONS: {
  value: BlockActionType;
  label: string;
}[] = [
  { value: "playAudio", label: "Audio" },
  { value: "wait", label: "Wait" },
];

export const createDefaultBlockAction = (
  type: BlockActionType = "wait"
): BlockAction => {
  switch (type) {
    case "playAudio":
      return {
        id: generateId(),
        type,
        fileName: "",
      };

    case "wait":
      return {
        id: generateId(),
        type,
        ms: 500,
      };
  }
};

export const convertBlockActionType = (
  action: BlockAction,
  type: BlockActionType
): BlockAction => ({
  ...createDefaultBlockAction(type),
  id: action.id,
});

export const getBlockActionSummary = (action: BlockAction): string => {
  switch (action.type) {
    case "playAudio":
      return action.fileName ? `Audio ${action.fileName}` : "Audio";

    case "wait":
      return `Wait ${action.ms} ms`;
  }
};

export const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number): T[] => {
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items;
  if (toIndex >= items.length) return items;

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  if (item === undefined) return items;
  next.splice(toIndex, 0, item);
  return next;
};
