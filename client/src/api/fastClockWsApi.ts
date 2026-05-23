// client/src/api/fastClockWsApi.ts

import type {
  FastClockCommandAction,
} from "../../../common/src/clientWsCommands";

import type {
  FastClockSnapshot,
} from "../../../common/src/fastClock";

import {
  generateId,
} from "../helpers";

import {
  wsApi,
} from "../services/wsApi";

async function sendFastClockCommand(
  action: FastClockCommandAction,
  speed?: number
): Promise<FastClockSnapshot> {
  const requestId = generateId();

  const response = await wsApi.request(
    "fastClockCommand",
    {
      requestId,
      action,
      ...(speed !== undefined
        ? { speed }
        : {}),
    },
    "fastClockResponse",
    data => data.requestId === requestId
  );

  if (!response.ok) {
    throw new Error(
      response.message ?? "Fast clock WebSocket command failed."
    );
  }

  if (!response.snapshot) {
    throw new Error("Fast clock response did not contain a snapshot.");
  }

  return response.snapshot;
}

export async function getFastClockSnapshotWs(): Promise<FastClockSnapshot> {
  return sendFastClockCommand("snapshot");
}

export async function runFastClockWs(): Promise<FastClockSnapshot> {
  return sendFastClockCommand("run");
}

export async function pauseFastClockWs(): Promise<FastClockSnapshot> {
  return sendFastClockCommand("pause");
}

export async function resetFastClockWs(): Promise<FastClockSnapshot> {
  return sendFastClockCommand("reset");
}

export async function setFastClockSpeedWs(
  speed: number
): Promise<FastClockSnapshot> {
  return sendFastClockCommand("setSpeed", speed);
}
