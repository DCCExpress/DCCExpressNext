import type {
  AutomationFlowCommandAction,
  AutomationFlowDocumentDto,
} from "../../../common/src/automationFlow";

import {
  createEmptyAutomationFlowDocument,
} from "../../../common/src/automationFlow";

import {
  requestWsCommand,
} from "./wsRequest";

async function sendAutomationFlowCommand(
  action: AutomationFlowCommandAction,
  options?: {
    document?: AutomationFlowDocumentDto;
  }
) {
  return requestWsCommand(
    "automationFlowCommand",
    {
      action,
      ...(options?.document !== undefined
        ? { document: options.document }
        : {}),
    },
    "automationFlowResponse",
    "Automation flow WebSocket command failed."
  );
}

export async function loadAutomationFlowWs(): Promise<AutomationFlowDocumentDto> {
  const response = await sendAutomationFlowCommand("load");

  return response.document ?? createEmptyAutomationFlowDocument();
}

export async function saveAutomationFlowWs(
  document: AutomationFlowDocumentDto
): Promise<AutomationFlowDocumentDto> {
  const response = await sendAutomationFlowCommand("save", { document });

  return response.document ?? document;
}
