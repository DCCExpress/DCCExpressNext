// client/src/services/fastClockStore.ts

import type {
  FastClockSnapshot,
} from "../../../common/src/fastClock";

import {
  getFastClockSnapshot,
} from "../api/fastClockApi";

import {
  wsClient,
  type WsConnectionStatus,
} from "./wsClient";

const DAY_MS =
  24 * 60 * 60 * 1000;

export type FastClockViewState = {
  snapshot: FastClockSnapshot | null;
  connected: boolean;
};

type FastClockListener =
  (state: FastClockViewState) => void;

class FastClockStore {
  private serverSnapshot: FastClockSnapshot | null = null;
  private receivedAtClientMs = 0;
  private listeners = new Set<FastClockListener>();
  private initialized = false;
  private loadingPromise: Promise<void> | null = null;
  private animationFrameId: number | null = null;
  private unsubscribeWs: (() => void) | null = null;
  private unsubscribeWsStatus: (() => void) | null = null;

  private connected =
    wsClient.getStatus() === "connected";

  subscribe(listener: FastClockListener): () => void {
    this.ensureInitialized();

    this.listeners.add(listener);
    listener(this.getViewState());

    this.ensureAnimationFrame();

    return () => {
      this.listeners.delete(listener);

      if (this.listeners.size === 0) {
        this.stopAnimationFrame();
      }
    };
  }

  getViewState(): FastClockViewState {
    return {
      snapshot: this.getDisplaySnapshot(),
      connected: this.connected,
    };
  }

  getDisplaySnapshot(): FastClockSnapshot | null {
    if (!this.serverSnapshot) {
      return null;
    }

    /**
     * Ha nincs élő WS kapcsolat, a szerver már nem hiteles időforrás.
     * Ilyenkor a legutolsó ismert kijelzett állapotot fagyasztjuk be,
     * és nem interpolálunk tovább.
     */
    if (
      !this.connected ||
      !this.serverSnapshot.running
    ) {
      return {
        ...this.serverSnapshot,
      };
    }

    const elapsedClientMs =
      Math.max(
        0,
        performance.now() - this.receivedAtClientMs
      );

    return {
      ...this.serverSnapshot,
      timeMs:
        this.normalizeDayTime(
          this.serverSnapshot.timeMs +
            elapsedClientMs * this.serverSnapshot.speed
        ),
    };
  }

  applyServerSnapshot(snapshot: FastClockSnapshot): void {
    if (!this.isValidSnapshot(snapshot)) {
      return;
    }

    this.serverSnapshot = {
      ...snapshot,
      speed: Math.max(1, snapshot.speed),
    };

    this.receivedAtClientMs =
      performance.now();

    this.emit();
    this.ensureAnimationFrame();
  }

  async ensureLoaded(): Promise<void> {
    this.ensureInitialized();

    if (this.serverSnapshot) {
      return;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise =
      this.loadInitialSnapshot();

    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  private ensureInitialized(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    this.unsubscribeWs =
      wsClient.on(
        "fastClockChanged",
        data => {
          this.connected = true;
          this.applyServerSnapshot(data);
        }
      );

    this.unsubscribeWsStatus =
      wsClient.subscribeStatus(status => {
        this.handleWsStatusChanged(status);
      });

    void this.ensureLoaded();
  }

  private handleWsStatusChanged(
    status: WsConnectionStatus
  ): void {
    const nextConnected =
      status === "connected";

    if (this.connected === nextConnected) {
      if (nextConnected) {
        void this.refreshFromHttp();
      }

      return;
    }

    /**
     * Disconnect előtt rögzítjük az éppen látott, interpolált időt.
     * Így nem a legutolsó régi szerver-snapshotra ugrik vissza,
     * hanem azon a pillanaton fagy meg, amit a felhasználó ténylegesen látott.
     */
    if (!nextConnected) {
      const frozen =
        this.getDisplaySnapshot();

      if (frozen) {
        this.serverSnapshot = {
          ...frozen,
        };

        this.receivedAtClientMs =
          performance.now();
      }

      this.connected = false;
      this.stopAnimationFrame();
      this.emit();

      return;
    }

    this.connected = true;
    this.emit();

    /**
     * Reconnectnél a szerver WS-en is küld snapshotot,
     * de HTTP fallbackkel azonnal bebiztosítjuk a visszaszinkront.
     */
    void this.refreshFromHttp();
  }

  private async loadInitialSnapshot(): Promise<void> {
    await this.refreshFromHttp();
  }

  private async refreshFromHttp(): Promise<void> {
    try {
      const snapshot =
        await getFastClockSnapshot();

      this.applyServerSnapshot(snapshot);
    } catch {
      // WS reconnect vagy későbbi művelet majd helyrerakja.
    }
  }

  private ensureAnimationFrame(): void {
    if (
      this.animationFrameId !== null ||
      this.listeners.size === 0 ||
      !this.connected ||
      !this.serverSnapshot?.running
    ) {
      return;
    }

    const tick = () => {
      this.animationFrameId = null;

      this.emit();

      if (
        this.listeners.size > 0 &&
        this.connected &&
        this.serverSnapshot?.running
      ) {
        this.animationFrameId =
          window.requestAnimationFrame(tick);
      }
    };

    this.animationFrameId =
      window.requestAnimationFrame(tick);
  }

  private stopAnimationFrame(): void {
    if (this.animationFrameId === null) {
      return;
    }

    window.cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  private emit(): void {
    const state =
      this.getViewState();

    for (const listener of this.listeners) {
      listener(state);
    }
  }

  private normalizeDayTime(value: number): number {
    const normalized =
      value % DAY_MS;

    return normalized < 0
      ? normalized + DAY_MS
      : normalized;
  }

  private isValidSnapshot(
    snapshot: FastClockSnapshot | null | undefined
  ): snapshot is FastClockSnapshot {
    return (
      !!snapshot &&
      typeof snapshot.timeMs === "number" &&
      typeof snapshot.running === "boolean" &&
      typeof snapshot.speed === "number" &&
      typeof snapshot.serverNowMs === "number"
    );
  }
}

export const fastClockStore =
  new FastClockStore();
