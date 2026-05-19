// client/src/api/fastClockApi.ts

import type {
  FastClockSnapshot,
  SetFastClockSpeedRequest,
} from "../../../common/src/fastClock";

async function readFastClockResponse(
  response: Response,
  fallbackError: string
): Promise<FastClockSnapshot> {
  if (!response.ok) {
    const body =
      await response
        .json()
        .catch(() => null) as
          | { error?: string }
          | null;

    throw new Error(
      body?.error ?? fallbackError
    );
  }

  return (await response.json()) as FastClockSnapshot;
}

export async function getFastClockSnapshot(): Promise<FastClockSnapshot> {
  const response =
    await fetch("/api/fast-clock");

  return readFastClockResponse(
    response,
    "Could not load fast clock state."
  );
}

export async function runFastClock(): Promise<FastClockSnapshot> {
  const response =
    await fetch("/api/fast-clock/run", {
      method: "POST",
    });

  return readFastClockResponse(
    response,
    "Could not start fast clock."
  );
}

export async function pauseFastClock(): Promise<FastClockSnapshot> {
  const response =
    await fetch("/api/fast-clock/pause", {
      method: "POST",
    });

  return readFastClockResponse(
    response,
    "Could not pause fast clock."
  );
}

export async function resetFastClock(): Promise<FastClockSnapshot> {
  const response =
    await fetch("/api/fast-clock/reset", {
      method: "POST",
    });

  return readFastClockResponse(
    response,
    "Could not reset fast clock."
  );
}

export async function setFastClockSpeed(
  speed: number
): Promise<FastClockSnapshot> {
  const body: SetFastClockSpeedRequest = {
    speed,
  };

  const response =
    await fetch("/api/fast-clock/speed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

  return readFastClockResponse(
    response,
    "Could not update fast clock speed."
  );
}
