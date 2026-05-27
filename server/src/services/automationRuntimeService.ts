import type {
  TypedServerWsMessage,
} from "../../../common/src/types.js";

import {
  log,
  logError,
} from "../utility.js";

export type AutomationModuleState = {
  id: string;
  name: string;
  enabled: boolean;
};

export type AutomationRuntimeState = {
  running: boolean;
  tickMs: number;
  modules: AutomationModuleState[];
};

export type AutomationRuntimeModule = {
  id: string;
  name: string;
  isEnabled: () => boolean | Promise<boolean>;
  evaluateOnce: (nowMs: number) => void | Promise<void>;
};

type BroadcastFn = (
  message: TypedServerWsMessage
) => void;

const DEFAULT_AUTOMATION_TICK_MS = 500;

class AutomationRuntimeService {
  private running = false;
  private tickTimer: ReturnType<typeof setTimeout> | null = null;
  private tickInProgress = false;
  private broadcast: BroadcastFn = () => undefined;
  private readonly modules = new Map<string, AutomationRuntimeModule>();

  configure(params: {
    broadcast: BroadcastFn;
  }): void {
    this.broadcast = params.broadcast;
  }

  register(module: AutomationRuntimeModule): void {
    this.modules.set(module.id, module);
  }

  unregister(moduleId: string): void {
    this.modules.delete(moduleId);
  }

  isRunning(): boolean {
    return this.running;
  }

  async getState(): Promise<AutomationRuntimeState> {
    return {
      running: this.running,
      tickMs: DEFAULT_AUTOMATION_TICK_MS,
      modules: await Promise.all(
        [...this.modules.values()].map(async module => ({
          id: module.id,
          name: module.name,
          enabled: Boolean(await module.isEnabled()),
        }))
      ),
    };
  }

  async start(): Promise<AutomationRuntimeState> {
    if (this.running) {
      return this.getState();
    }

    this.running = true;
    log("[AutomationRuntime] started");
    this.scheduleNextTick(0);
    await this.broadcastState();

    return this.getState();
  }

  async stop(): Promise<AutomationRuntimeState> {
    if (!this.running) {
      return this.getState();
    }

    this.running = false;
    this.clearTickTimer();
    this.tickInProgress = false;

    log("[AutomationRuntime] stopped");
    await this.broadcastState();

    return this.getState();
  }

  async evaluateOnce(nowMs = Date.now()): Promise<AutomationRuntimeState> {
    await this.evaluateModules(nowMs);
    await this.broadcastState();
    return this.getState();
  }

  private clearTickTimer(): void {
    if (!this.tickTimer) {
      return;
    }

    clearTimeout(this.tickTimer);
    this.tickTimer = null;
  }

  private scheduleNextTick(delayMs = DEFAULT_AUTOMATION_TICK_MS): void {
    this.clearTickTimer();

    if (!this.running) {
      return;
    }

    this.tickTimer = setTimeout(() => {
      void this.tick();
    }, delayMs);
  }

  private async tick(): Promise<void> {
    if (!this.running || this.tickInProgress) {
      return;
    }

    this.tickInProgress = true;

    try {
      await this.evaluateModules(Date.now());
    } catch (error) {
      logError("[AutomationRuntime] tick failed:", error);
    } finally {
      this.tickInProgress = false;
      this.scheduleNextTick();
    }
  }

  private async evaluateModules(nowMs: number): Promise<void> {
    for (const module of this.modules.values()) {
      const enabled = Boolean(await module.isEnabled());

      if (!enabled) {
        continue;
      }

      try {
        await module.evaluateOnce(nowMs);
      } catch (error) {
        logError(`[AutomationRuntime] module ${module.id} failed:`, error);
      }
    }
  }

  private async broadcastState(): Promise<void> {
    this.broadcast({
      type: "automationRuntimeStateChanged",
      data: await this.getState(),
    } as TypedServerWsMessage);
  }
}

export const automationRuntimeService = new AutomationRuntimeService();
