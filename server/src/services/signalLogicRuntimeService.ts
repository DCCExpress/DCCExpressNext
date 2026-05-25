// server/src/services/signalLogicRuntimeService.ts

import type {
  CommandCenter,
} from "../commandCenter/CommandCenter.js";

import type {
  SignalAspect,
  SignalLogicConditionDto,
  SignalLogicDocumentDto,
  SignalLogicRuntimeStateDto,
} from "../../../common/src/signalLogic.js";

import type {
  TypedServerWsMessage,
} from "../../../common/src/types.js";

import {
  log,
  logError,
} from "../utility.js";

import {
  layoutRuntimeStore,
} from "./layoutRuntimeStore.js";

import {
  railwayTopologyStore,
} from "./railwayTopologyStore.js";

import {
  setSignalAspectFromCommandCenter,
} from "./railwayCommandHelpers.js";

import {
  signalLogicRulesStore,
} from "./signalLogicRulesStore.js";

type BroadcastFn = (
  message: TypedServerWsMessage
) => void;

type SignalLogicRuntimeConfiguration = {
  broadcast: BroadcastFn;
  getCommandCenter: () => CommandCenter | null;
  getLogicalTurnoutState: (address: number) => boolean | null;
};

type SignalLogicEvaluationContext = {
  turnouts: Map<number, boolean>;
  sensors: Map<number, boolean>;
};

const SIGNAL_LOGIC_TICK_MS = 500;

class SignalLogicRuntimeService {
  private running = false;
  private tickTimer: ReturnType<typeof setTimeout> | null = null;
  private tickInProgress = false;
  private configured = false;
  private autoStartAttempted = false;
  private getCommandCenter: () => CommandCenter | null = () => null;
  private getLogicalTurnoutState: (address: number) => boolean | null = () => null;
  private broadcast: BroadcastFn = () => undefined;
  private readonly lastAppliedAspects = new Map<number, SignalAspect>();

  configure({
    broadcast,
    getCommandCenter,
    getLogicalTurnoutState,
  }: SignalLogicRuntimeConfiguration): void {
    this.broadcast = broadcast;
    this.getCommandCenter = getCommandCenter;
    this.getLogicalTurnoutState = getLogicalTurnoutState;
    this.configured = true;
  }

  async getState(): Promise<SignalLogicRuntimeStateDto> {
    await signalLogicRulesStore.initialize();
    const document = signalLogicRulesStore.getDocument();

    return {
      running: this.running,
      autostart: document.autostart,
    };
  }

  async autoStartIfEnabled(): Promise<SignalLogicRuntimeStateDto> {
    await signalLogicRulesStore.initialize();

    const document = signalLogicRulesStore.getDocument();

    if (!document.autostart) {
      log("[SignalLogicRuntime] autostart disabled");
      return this.getState();
    }

    if (this.running) {
      return this.getState();
    }

    if (this.autoStartAttempted) {
      return this.getState();
    }

    if (!this.configured) {
      log("[SignalLogicRuntime] autostart skipped: runtime is not configured");
      return this.getState();
    }

    if (!layoutRuntimeStore.hasLayout()) {
      log("[SignalLogicRuntime] autostart skipped: no layout loaded");
      return this.getState();
    }

    if (!railwayTopologyStore.hasTopology()) {
      log("[SignalLogicRuntime] autostart skipped: no topology available");
      return this.getState();
    }

    if (!this.getCommandCenter()) {
      log("[SignalLogicRuntime] autostart skipped: no command center available");
      return this.getState();
    }

    this.autoStartAttempted = true;

    log("[SignalLogicRuntime] autostart enabled, starting");

    return this.start();
  }

  async start(): Promise<SignalLogicRuntimeStateDto> {
    await signalLogicRulesStore.initialize();

    if (!this.configured) {
      throw new Error("Signal logic runtime is not configured.");
    }

    if (this.running) {
      return this.getState();
    }

    this.running = true;
    this.lastAppliedAspects.clear();

    log("[SignalLogicRuntime] started");

    this.scheduleNextTick(0);
    await this.broadcastState();

    return this.getState();
  }

  async stop(): Promise<SignalLogicRuntimeStateDto> {
    if (!this.running) {
      return this.getState();
    }

    this.running = false;
    this.clearTickTimer();
    this.tickInProgress = false;

    log("[SignalLogicRuntime] stopped");

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

  private scheduleNextTick(delayMs = SIGNAL_LOGIC_TICK_MS): void {
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
      await this.evaluateOnce();
    } catch (error) {
      logError("[SignalLogicRuntime] tick failed:", error);
    } finally {
      this.tickInProgress = false;
      this.scheduleNextTick();
    }
  }

  private async evaluateOnce(): Promise<void> {
    const commandCenter = this.getCommandCenter();

    if (!commandCenter) {
      log("[SignalLogicRuntime] no command center available, skipping tick");
      return;
    }

    const document = signalLogicRulesStore.getDocument();
    const context = this.createEvaluationContext(commandCenter, document);

    for (const group of document.groups) {
      if (group.signalAddress <= 0) {
        continue;
      }

      const aspect = this.evaluateSignalGroup(document, group.id, context);
      await this.applySignalAspect(commandCenter, group.signalAddress, aspect);
    }
  }

  private createEvaluationContext(
    commandCenter: CommandCenter,
    document: SignalLogicDocumentDto
  ): SignalLogicEvaluationContext {
    const turnoutAddresses = new Set<number>();

    for (const group of document.groups) {
      for (const rule of group.rules) {
        for (const condition of rule.conditions) {
          if (condition.type === "turnout" && condition.turnoutAddress > 0) {
            turnoutAddresses.add(condition.turnoutAddress);
          }
        }
      }
    }

    const logicalTurnouts = new Map<number, boolean>();

    for (const address of turnoutAddresses) {
      const logicalState = this.getLogicalTurnoutState(address);

      if (typeof logicalState === "boolean") {
        logicalTurnouts.set(address, logicalState);
      }
    }

    return {
      turnouts: logicalTurnouts,
      sensors: new Map(
        commandCenter.getSensors().map(sensor => [
          sensor.address,
          sensor.active,
        ])
      ),
    };
  }

  private evaluateSignalGroup(
    document: SignalLogicDocumentDto,
    groupId: string,
    context: SignalLogicEvaluationContext
  ): SignalAspect {
    const group = document.groups.find(item => item.id === groupId);

    if (!group) {
      return "red";
    }

    for (const rule of group.rules) {
      const matches = rule.conditions.every(condition =>
        this.evaluateCondition(condition, context)
      );

      if (matches) {
        return rule.aspect;
      }
    }

    return group.defaultAspect;
  }

  private evaluateCondition(
    condition: SignalLogicConditionDto,
    context: SignalLogicEvaluationContext
  ): boolean {
    if (condition.type === "sensor") {
      return context.sensors.get(condition.sensorAddress) === condition.active;
    }

    return context.turnouts.get(condition.turnoutAddress) === condition.closed;
  }

  private async applySignalAspect(
    commandCenter: CommandCenter,
    signalAddress: number,
    aspect: SignalAspect
  ): Promise<void> {
    const previousAspect = this.lastAppliedAspects.get(signalAddress);

    if (previousAspect === aspect) {
      return;
    }

    try {
      await setSignalAspectFromCommandCenter(
        commandCenter,
        signalAddress,
        aspect
      );
    } catch (error) {
      logError(
        `[SignalLogicRuntime] failed to set signal #${signalAddress} to ${aspect}:`,
        error
      );
      return;
    }

    this.lastAppliedAspects.set(signalAddress, aspect);

    log(
      `[SignalLogicRuntime] signal #${signalAddress} => ${aspect}`
    );
  }

  private async broadcastState(): Promise<void> {
    this.broadcast({
      type: "signalLogicStateChanged",
      data: await this.getState(),
    });
  }
}

export const signalLogicRuntimeService = new SignalLogicRuntimeService();
