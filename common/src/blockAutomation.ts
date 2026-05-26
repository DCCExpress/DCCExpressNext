import type {
  BlockActionHooks,
} from "./domainTypes.js";

export type BlockAutomationBlockActions = BlockActionHooks;

export type BlockAutomationDocumentDto = {
  version: 1;
  blocks: Record<string, BlockAutomationBlockActions>;
};

export type BlockAutomationIntegrityOrphanBlockDto = {
  blockId: string;
  actionCount: number;
  onTrainEnterCount: number;
  onTrainLeaveCount: number;
};

export type BlockAutomationIntegrityReportDto = {
  layoutBlockCount: number;
  automationBlockCount: number;
  orphanBlocks: BlockAutomationIntegrityOrphanBlockDto[];
};

export type BlockAutomationCommandAction =
  | "load"
  | "save"
  | "integrityCheck"
  | "deleteOrphanBlocks";

export type BlockAutomationCommandPayload = {
  requestId: string;
  action: BlockAutomationCommandAction;
  document?: BlockAutomationDocumentDto;
  blockIds?: string[];
};

export type BlockAutomationResponsePayload = {
  requestId: string;
  action: BlockAutomationCommandAction;
  ok: boolean;
  message?: string;
  document?: BlockAutomationDocumentDto;
  created?: boolean;
  integrity?: BlockAutomationIntegrityReportDto;
  deletedBlockIds?: string[];
};

export const createEmptyBlockAutomationDocument = (): BlockAutomationDocumentDto => ({
  version: 1,
  blocks: {},
});
