// client/src/api/fastClockApi.ts

import type {
  FastClockCommandAction,
} from "../../../common/src/clientWsCommands";

import type {
  FastClockSnapshot,
  SetFastClockSpeedRequest,
} from "../../../common/src/fastClock";

import {
  requestWsCommand,
} from "./wsRequest";

async function sendFastClockCommand(
  action: FastClockCommandAction,
  fallbackError: string,
  speed?: number
): Promise<FastClockSnapshot> {
  const response = await requestWsCommand(
    "fastClockCommand",
    {
      action,
      ...(speed !== undefined
        ? { speed }
        : {}),
    },
    "fastClockResponse",
    fallbackError
  );

  if (!response.snapshot) {
    throw new Error(fallbackError);
  }

  return response.snapshot;
}

export async function getFastClockSnapshot(): Promise<FastClockSnapshot> {
  return sendFastClockCommand(
    "snapshot",
    "Could not load fast clock state."
  );
}

export async function runFastClock(): Promise<FastClockSnapshot> {
  return sendFastClockCommand(
    "run",
    "Could not start fast clock."
  );
}

export async function pauseFastClock(): Promise<FastClockSnapshot> {
  return sendFastClockCommand(
    "pause",
    "Could not pause fast clock."
  );
}

export async function resetFastClock(): Promise<FastClockSnapshot> {
  return sendFastClockCommand(
    "reset",
    "Could not reset fast clock."
  );
}

export async function setFastClockSpeed(
  speed: number
): Promise<FastClockSnapshot> {
  const body: SetFastClockSpeedRequest = {
    speed,
  };

  return sendFastClockCommand(
    "setSpeed",
    "Could not update fast clock speed.",
    body.speed
  );
}
