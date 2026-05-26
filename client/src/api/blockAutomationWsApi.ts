import type {
  BlockAutomationCommandAction,
  BlockAutomationDocumentDto,
  BlockAutomationIntegrityReportDto,
} from "../../../common/src/blockAutomation";

import {
  createEmptyBlockAutomationDocument,
} from "../../../common/src/blockAutomation";

import {
  requestWsCommand,
} from "./wsRequest";

async function sendBlockAutomationCommand(
  action: BlockAutomationCommandAction,
  options?: {
    document?: BlockAutomationDocumentDto;
    blockIds?: string[];
  }
) {
  return requestWsCommand(
    "blockAutomationCommand",
    {
      action,
      ...(options?.document !== undefined
        ? { document: options.document }
        : {}),
      ...(options?.blockIds !== undefined
        ? { blockIds: options.blockIds }
        : {}),
    },
    "blockAutomationResponse",
    "Block automation WebSocket command failed."
  );
}

export async function loadBlockAutomationWs(): Promise<BlockAutomationDocumentDto> {
  const response = await sendBlockAutomationCommand("load");

  return response.document ?? createEmptyBlockAutomationDocument();
}

export async function saveBlockAutomationWs(
  document: BlockAutomationDocumentDto
): Promise<BlockAutomationDocumentDto> {
  const response = await sendBlockAutomationCommand("save", { document });

  return response.document ?? document;
}

export async function checkBlockAutomationIntegrityWs(): Promise<BlockAutomationIntegrityReportDto> {
  const response = await sendBlockAutomationCommand("integrityCheck");

  if (!response.integrity) {
    throw new Error("Block automation integrity response did not contain a report.");
  }

  return response.integrity;
}

export async function deleteBlockAutomationOrphansWs(
  blockIds: string[]
): Promise<{
  integrity: BlockAutomationIntegrityReportDto;
  deletedBlockIds: string[];
}> {
  const response = await sendBlockAutomationCommand("deleteOrphanBlocks", { blockIds });

  if (!response.integrity) {
    throw new Error("Block automation delete response did not contain an integrity report.");
  }

  return {
    integrity: response.integrity,
    deletedBlockIds: response.deletedBlockIds ?? [],
  };
}
