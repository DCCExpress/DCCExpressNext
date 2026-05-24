// server/src/services/wsTrafficStatsStore.ts

export type WsTrafficStatsSnapshot = {
  rxBytesTotal: number;
  txBytesTotal: number;
  rxKbps: number;
  txKbps: number;
};

type TrafficSample = {
  timestampMs: number;
  rxBytesTotal: number;
  txBytesTotal: number;
};

function bytesToKbps(
  bytes: number,
  elapsedMs: number
): number {
  if (elapsedMs <= 0) {
    return 0;
  }

  return Math.round(
    (bytes * 8) / elapsedMs
  );
}

class WsTrafficStatsStore {
  private rxBytesTotal = 0;
  private txBytesTotal = 0;
  private lastSample: TrafficSample | null = null;
  private lastSnapshot: WsTrafficStatsSnapshot = {
    rxBytesTotal: 0,
    txBytesTotal: 0,
    rxKbps: 0,
    txKbps: 0,
  };

  recordReceivedBytes(bytes: number): void {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return;
    }

    this.rxBytesTotal += Math.round(bytes);
  }

  recordSentBytes(bytes: number): void {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return;
    }

    this.txBytesTotal += Math.round(bytes);
  }

  getSnapshot(): WsTrafficStatsSnapshot {
    const now = Date.now();

    if (!this.lastSample) {
      this.lastSample = {
        timestampMs: now,
        rxBytesTotal: this.rxBytesTotal,
        txBytesTotal: this.txBytesTotal,
      };

      this.lastSnapshot = {
        rxBytesTotal: this.rxBytesTotal,
        txBytesTotal: this.txBytesTotal,
        rxKbps: 0,
        txKbps: 0,
      };

      return this.lastSnapshot;
    }

    const elapsedMs = now - this.lastSample.timestampMs;
    const rxBytesDelta = this.rxBytesTotal - this.lastSample.rxBytesTotal;
    const txBytesDelta = this.txBytesTotal - this.lastSample.txBytesTotal;

    this.lastSample = {
      timestampMs: now,
      rxBytesTotal: this.rxBytesTotal,
      txBytesTotal: this.txBytesTotal,
    };

    this.lastSnapshot = {
      rxBytesTotal: this.rxBytesTotal,
      txBytesTotal: this.txBytesTotal,
      rxKbps: bytesToKbps(
        rxBytesDelta,
        elapsedMs
      ),
      txKbps: bytesToKbps(
        txBytesDelta,
        elapsedMs
      ),
    };

    return this.lastSnapshot;
  }
}

export const wsTrafficStatsStore =
  new WsTrafficStatsStore();
