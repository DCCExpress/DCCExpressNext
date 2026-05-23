// client/src/api/commandCenterConfigWsApi.ts

import type {
  CommandCenterConfigCommandAction,
} from "../../../common/src/clientWsCommands";

import type {
  ICommandCenter,
} from "../../../common/src/types";

import {
  generateId,
} from "../helpers";

import {
  wsApi,
} from "../services/wsApi";

async function sendCommandCenterConfigCommand(
  action: CommandCenterConfigCommandAction,
  config?: Partial<ICommandCenter>
) {
  const requestId = generateId();

  const response = await wsApi.request(
    "commandCenterConfigCommand",
    {
      requestId,
      action,
      ...(config !== undefined
        ? { config }
        : {}),
    },
    "commandCenterConfigResponse",
    data => data.requestId === requestId
  );

  if (!response.ok) {
    throw new Error(
      response.message ?? "Command center config WebSocket command failed."
    );
  }

  return response;
}

export async function loadCommandCenterConfigWs(): Promise<ICommandCenter | null> {
  const response = await sendCommandCenterConfigCommand("load");

  return response.config ?? null;
}

export async function saveCommandCenterConfigWs(
  config: ICommandCenter
): Promise<ICommandCenter | null> {
  const response = await sendCommandCenterConfigCommand(
    "save",
    config
  );

  return response.config ?? null;
}
