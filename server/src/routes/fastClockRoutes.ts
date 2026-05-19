// server/src/routes/fastClockRoutes.ts

import {
  Router,
} from "express";

import type {
  SetFastClockSpeedRequest,
} from "../../../common/src/fastClock.js";

import {
  fastClockRuntimeStore,
} from "../services/fastClockRuntimeStore.js";

export const fastClockRoutes =
  Router();

fastClockRoutes.get("/", (_req, res) => {
  res.json(
    fastClockRuntimeStore.getSnapshot()
  );
});

fastClockRoutes.post("/run", (_req, res) => {
  res.json(
    fastClockRuntimeStore.run()
  );
});

fastClockRoutes.post("/pause", (_req, res) => {
  res.json(
    fastClockRuntimeStore.pause()
  );
});

fastClockRoutes.post("/reset", (_req, res) => {
  res.json(
    fastClockRuntimeStore.reset()
  );
});

fastClockRoutes.post("/speed", (req, res) => {
  const body =
    req.body as Partial<SetFastClockSpeedRequest> | undefined;

  const speed =
    typeof body?.speed === "number"
      ? body.speed
      : Number.NaN;

  if (
    !Number.isFinite(speed) ||
    speed < 1
  ) {
    res.status(400).json({
      ok: false,
      error:
        "A fast clock sebességszorzója legalább 1 kell legyen.",
    });

    return;
  }

  res.json(
    fastClockRuntimeStore.setSpeed(speed)
  );
});
