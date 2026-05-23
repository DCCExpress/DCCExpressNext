// client/src/api/commandCenterConfigWsApi.ts

import type {
  CommandCenterConfigCommandAction,
} from "../../../common/src/clientWsCommands";

import type {
  ICommandCenter,
} from "../../../common/src/types";

import {
  requestWsCommand,
} from "./wsRequest";

async function sendCommandCenterConfigCommand(
  action: CommandCenterConfigCommandAction,
  config?: Partial<ICommandCenter>
) {
  return requestWsCommand(
    "commandCenterConfigCommand",
    {
      action,
      ...(config !== undefined
        ? { config }
        : {}),
    },
    "commandCenterConfigResponse",
    "Command center config WebSocket command failed."
  );
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
