// server/src/services/fastClockRuntimeStore.ts

import type {
  FastClockSnapshot,
} from "../../../common/src/fastClock.js";

const DAY_MS =
  24 * 60 * 60 * 1000;

type FastClockBroadcast =
  (message: unknown) => void;

type FastClockRuntimeStoreParams = {
  broadcast?: FastClockBroadcast;
};

class FastClockRuntimeStore {
  private timeMs = 0;
  private speed = 1;
  private running = true;
  private lastRealTimestampMs = Date.now();
  private broadcast: FastClockBroadcast | undefined;

  configure(params: FastClockRuntimeStoreParams): void {
    this.broadcast =
      params.broadcast;
  }

  getSnapshot(): FastClockSnapshot {
    this.syncFromRealTime();

    return {
      timeMs: Math.floor(this.timeMs),
      running: this.running,
      speed: this.speed,
      serverNowMs: Date.now(),
    };
  }

  run(): FastClockSnapshot {
    this.syncFromRealTime();
    this.running = true;
    this.lastRealTimestampMs = Date.now();

    return this.broadcastSnapshot();
  }

  pause(): FastClockSnapshot {
    this.syncFromRealTime();
    this.running = false;
    this.lastRealTimestampMs = Date.now();

    return this.broadcastSnapshot();
  }

  reset(): FastClockSnapshot {
    this.timeMs = 0;
    this.running = false;
    this.lastRealTimestampMs = Date.now();

    return this.broadcastSnapshot();
  }

  setSpeed(speed: number): FastClockSnapshot {
    this.syncFromRealTime();

    this.speed =
      Number.isFinite(speed)
        ? Math.max(1, speed)
        : 1;

    this.lastRealTimestampMs = Date.now();

    return this.broadcastSnapshot();
  }

  private broadcastSnapshot(): FastClockSnapshot {
    const snapshot =
      this.getSnapshot();

    this.broadcast?.({
      type: "fastClockChanged",
      data: snapshot,
    });

    return snapshot;
  }

  private syncFromRealTime(): void {
    const now = Date.now();

    if (this.running) {
      const elapsedRealMs =
        Math.max(
          0,
          now - this.lastRealTimestampMs
        );

      this.timeMs =
        this.normalizeDayTime(
          this.timeMs + elapsedRealMs * this.speed
        );
    }

    this.lastRealTimestampMs = now;
  }

  private normalizeDayTime(value: number): number {
    const normalized =
      value % DAY_MS;

    return normalized < 0
      ? normalized + DAY_MS
      : normalized;
  }
}

export const fastClockRuntimeStore =
  new FastClockRuntimeStore();
