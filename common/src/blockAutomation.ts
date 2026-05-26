import type {
  BlockActionHooks,
} from "./domainTypes.js";

export type BlockAutomationBlockActions = BlockActionHooks;

export type BlockAutomationDocumentDto = {
  version: 1;
  blocks: Record<string, BlockAutomationBlockActions>;
};

export type BlockAutomationCommandAction =
  | "load"
  | "save";

export type BlockAutomationCommandPayload = {
  requestId: string;
  action: BlockAutomationCommandAction;
  document?: BlockAutomationDocumentDto;
};

export type BlockAutomationResponsePayload = {
  requestId: string;
  action: BlockAutomationCommandAction;
  ok: boolean;
  message?: string;
  document?: BlockAutomationDocumentDto;
  created?: boolean;
};

export const createEmptyBlockAutomationDocument = (): BlockAutomationDocumentDto => ({
  version: 1,
  blocks: {},
});
