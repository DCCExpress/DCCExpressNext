import type {
  BlockAutomationCommandAction,
  BlockAutomationDocumentDto,
} from "../../../common/src/blockAutomation";

import {
  createEmptyBlockAutomationDocument,
} from "../../../common/src/blockAutomation";

import {
  requestWsCommand,
} from "./wsRequest";

async function sendBlockAutomationCommand(
  action: BlockAutomationCommandAction,
  document?: BlockAutomationDocumentDto
) {
  return requestWsCommand(
    "blockAutomationCommand",
    {
      action,
      ...(document !== undefined
        ? { document }
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
  const response = await sendBlockAutomationCommand("save", document);

  return response.document ?? document;
}
