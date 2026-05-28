// client/src/api/automationWsApi.ts

import type {
  AutomationRuntimeStatePayload,
} from "../../../common/src/types";

import {
  requestWsCommand,
} from "./wsRequest";

export type AutomationCommandResult = {
  state: AutomationRuntimeStatePayload;
  message?: string;
};

async function requestAutomation(
  action: "snapshot" | "start" | "stop",
  errorMessage: string
): Promise<AutomationCommandResult> {
  const response = await requestWsCommand(
    "automationCommand",
    {
      action,
    },
    "automationResponse",
    errorMessage
  );

  if (!response.state) {
    throw new Error("Automation response did not contain runtime state.");
  }

  return {
    state: response.state,
    ...(response.message
      ? { message: response.message }
      : {}),
  };
}

export async function getAutomationRuntimeStateWs(): Promise<AutomationCommandResult> {
  return requestAutomation(
    "snapshot",
    "Could not get automation runtime state."
  );
}

export async function startAutomationRuntimeWs(): Promise<AutomationCommandResult> {
  return requestAutomation(
    "start",
    "Could not start automation runtime."
  );
}

export async function stopAutomationRuntimeWs(): Promise<AutomationCommandResult> {
  return requestAutomation(
    "stop",
    "Could not stop automation runtime."
  );
}
