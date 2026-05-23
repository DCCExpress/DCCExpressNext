// client/src/api/locosWsApi.ts

import type {
  LocosCommandAction,
} from "../../../common/src/clientWsCommands";

import type {
  Loco,
} from "../../../common/src/types";

import {
  generateId,
} from "../helpers";

import {
  wsApi,
} from "../services/wsApi";

async function sendLocosCommand(
  action: LocosCommandAction,
  locos?: Loco[]
) {
  const requestId = generateId();

  const response = await wsApi.request(
    "locosCommand",
    {
      requestId,
      action,
      ...(locos !== undefined
        ? { locos }
        : {}),
    },
    "locosResponse",
    data => data.requestId === requestId
  );

  if (!response.ok) {
    throw new Error(
      response.message ?? "Locos WebSocket command failed."
    );
  }

  return response;
}

export async function getLocosWs(): Promise<Loco[]> {
  const response = await sendLocosCommand("load");

  return response.locos ?? [];
}

export async function saveLocosWs(
  locos: Loco[]
): Promise<void> {
  await sendLocosCommand("save", locos);
}
