// server/src/services/serverRuntimeStatsStore.ts

import os from "node:os";

import type {
  ServerRuntimeStatsSnapshot,
  TypedServerWsMessage,
} from "../../../common/src/types.js";

type BroadcastMessage = (
  message: TypedServerWsMessage
) => void;

type CpuSample = {
  idle: number;
  total: number;
  processUsage: NodeJS.CpuUsage;
  timestampMs: number;
};

const DEFAULT_UPDATE_MS = 5000;
const MIN_UPDATE_MS = 1000;

function readUpdateIntervalMs(): number {
  const raw = process.env.DCCEXPRESS_RUNTIME_STATS_MS;

  if (!raw) {
    return DEFAULT_UPDATE_MS;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_UPDATE_MS;
  }

  return Math.max(
    MIN_UPDATE_MS,
    Math.round(parsed)
  );
}

function bytesToMb(value: number): number {
  return Math.round(value / 1024 / 1024);
}

function getSystemCpuTimes(): {
  idle: number;
  total: number;
} {
  let idle = 0;
  let total = 0;

  for (const cpu of os.cpus()) {
    idle += cpu.times.idle;
    total +=
      cpu.times.user +
      cpu.times.nice +
      cpu.times.sys +
      cpu.times.idle +
      cpu.times.irq;
  }

  return {
    idle,
    total,
  };
}

function clampPercent(value: number): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value)
    )
  );
}

class ServerRuntimeStatsStore {
  private broadcast: BroadcastMessage | null = null;
  private timer: NodeJS.Timeout | null = null;
  private lastSnapshot: ServerRuntimeStatsSnapshot | null = null;
  private lastCpuSample: CpuSample | null = null;

  configure(params: {
    broadcast: BroadcastMessage;
  }): void {
    this.broadcast = params.broadcast;
  }

  start(updateMs = readUpdateIntervalMs()): void {
    if (this.timer) {
      return;
    }

    this.lastCpuSample = this.createCpuSample();
    this.publish();

    this.timer = setInterval(() => {
      this.publish();
    }, updateMs);

    this.timer.unref?.();
  }

  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  getSnapshot(): ServerRuntimeStatsSnapshot {
    if (!this.lastSnapshot) {
      this.lastSnapshot = this.createSnapshot();
    }

    return this.lastSnapshot;
  }

  private publish(): void {
    const snapshot = this.createSnapshot();

    this.lastSnapshot = snapshot;

    this.broadcast?.({
      type: "serverRuntimeStatsChanged",
      data: snapshot,
    });
  }

  private createCpuSample(): CpuSample {
    const systemTimes = getSystemCpuTimes();

    return {
      idle: systemTimes.idle,
      total: systemTimes.total,
      processUsage: process.cpuUsage(),
      timestampMs: Date.now(),
    };
  }

  private createSnapshot(): ServerRuntimeStatsSnapshot {
    const memory = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    const nextCpuSample = this.createCpuSample();
    const previousCpuSample = this.lastCpuSample;

    let processCpuPercent: number | null = null;
    let systemLoadPercent: number | null = null;

    if (previousCpuSample) {
      const elapsedMs =
        nextCpuSample.timestampMs - previousCpuSample.timestampMs;

      if (elapsedMs > 0) {
        const processCpuDelta = process.cpuUsage(
          previousCpuSample.processUsage
        );

        const processCpuMs =
          (processCpuDelta.user + processCpuDelta.system) / 1000;

        processCpuPercent = clampPercent(
          processCpuMs / (elapsedMs * os.cpus().length) * 100
        );
      }

      const totalDelta =
        nextCpuSample.total - previousCpuSample.total;

      const idleDelta =
        nextCpuSample.idle - previousCpuSample.idle;

      if (totalDelta > 0) {
        systemLoadPercent = clampPercent(
          (1 - idleDelta / totalDelta) * 100
        );
      }
    }

    this.lastCpuSample = nextCpuSample;

    return {
      timestamp: Date.now(),
      memoryRssMb: bytesToMb(memory.rss),
      memoryHeapUsedMb: bytesToMb(memory.heapUsed),
      memoryHeapTotalMb: bytesToMb(memory.heapTotal),
      systemMemoryUsedMb: bytesToMb(usedMemory),
      systemMemoryTotalMb: bytesToMb(totalMemory),
      systemMemoryUsedPercent: clampPercent(
        usedMemory / totalMemory * 100
      ),
      processCpuPercent,
      systemLoadPercent,
      cpuCount: os.cpus().length,
      uptimeSec: Math.round(process.uptime()),
    };
  }
}

export const serverRuntimeStatsStore =
  new ServerRuntimeStatsStore();
