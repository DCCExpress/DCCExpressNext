import type {
  LevelCrossingAccessoryAction,
  LevelCrossingConditionValue,
  LevelCrossingEvaluationContext,
  LevelCrossingLogic,
  LevelCrossingLogicDocumentDto,
  LevelCrossingRuntimeEntryDto,
  LevelCrossingRuntimeState,
  LevelCrossingRuntimeStateDto,
} from "../../../common/src/levelCrossingLogic.js";

import {
  DEFAULT_LEVEL_CROSSING_LOGIC_DOCUMENT,
  evaluateLevelCrossingLogic,
  normalizeLevelCrossingLogicDocument,
} from "../../../common/src/levelCrossingLogic.js";

export type LevelCrossingRuntimeDataProvider = {
  getSensorActive: (sensorAddress: number) => LevelCrossingConditionValue;
  getBlockOccupied: (blockId: string) => LevelCrossingConditionValue;
  getRouteReserved: (fromBlockId?: string, toBlockId?: string) => LevelCrossingConditionValue;
  getAccessoryActive?: (address: number) => LevelCrossingConditionValue;
};

export type LevelCrossingRuntimeActionSink = {
  setCrossingState?: (
    logic: LevelCrossingLogic,
    state: LevelCrossingRuntimeState
  ) => void | Promise<void>;
  setAccessory?: (
    address: number,
    active: boolean,
    logic: LevelCrossingLogic
  ) => void | Promise<void>;
};

type RuntimeEntryInternal = LevelCrossingRuntimeEntryDto & {
  closedSinceMs: number | null;
  pendingState: LevelCrossingRuntimeState | null;
  pendingSinceMs: number | null;
};

export class LevelCrossingRuntimeService {
  private document: LevelCrossingLogicDocumentDto = DEFAULT_LEVEL_CROSSING_LOGIC_DOCUMENT;
  private running = false;
  private readonly entries = new Map<string, RuntimeEntryInternal>();

  constructor(
    private readonly dataProvider: LevelCrossingRuntimeDataProvider,
    private readonly actionSink: LevelCrossingRuntimeActionSink = {}
  ) {}

  setDocument(input: unknown): LevelCrossingLogicDocumentDto {
    this.document = normalizeLevelCrossingLogicDocument(input);
    this.syncEntries();
    return this.document;
  }

  getDocument(): LevelCrossingLogicDocumentDto {
    return this.document;
  }

  start(): void {
    this.running = true;
    this.syncEntries();
  }

  stop(): void {
    this.running = false;
  }

  async evaluateOnce(nowMs = Date.now()): Promise<LevelCrossingRuntimeStateDto> {
    this.syncEntries();

    if (!this.running) {
      return this.snapshot();
    }

    for (const logic of this.document.crossings) {
      await this.evaluateLogic(logic, nowMs);
    }

    return this.snapshot();
  }

  snapshot(): LevelCrossingRuntimeStateDto {
    this.syncEntries();

    return {
      running: this.running,
      enabled: this.document.enabled ?? false,
      crossings: [...this.entries.values()].map(entry => ({
        logicId: entry.logicId,
        levelCrossingElementId: entry.levelCrossingElementId,
        state: entry.state,
        lastChangedAtMs: entry.lastChangedAtMs,
        ...(entry.lastEvaluation === undefined ? {} : { lastEvaluation: entry.lastEvaluation }),
      })),
    };
  }

  private async evaluateLogic(logic: LevelCrossingLogic, nowMs: number): Promise<void> {
    const entry = this.getOrCreateEntry(logic, nowMs);
    this.syncEntryFromAccessoryFeedback(logic, entry, nowMs);

    const context: LevelCrossingEvaluationContext = {
      getSensorActive: this.dataProvider.getSensorActive,
      getBlockOccupied: this.dataProvider.getBlockOccupied,
      getRouteReserved: this.dataProvider.getRouteReserved,
      nowMs,
    };

    const result = evaluateLevelCrossingLogic(logic, context);
    entry.lastEvaluation = result;

    if (result.shouldClose) {
      this.setPendingState(entry, "closed", nowMs);

      if (nowMs - entry.pendingSinceMs! >= logic.closeDelayMs) {
        await this.applyState(logic, entry, "closed", nowMs);
      }

      return;
    }

    if (!result.mayOpen) {
      this.clearPendingState(entry);
      return;
    }

    const minClosedElapsed = entry.closedSinceMs === null
      || nowMs - entry.closedSinceMs >= logic.minClosedMs;

    if (!minClosedElapsed) {
      this.clearPendingState(entry);
      return;
    }

    this.setPendingState(entry, "open", nowMs);

    if (nowMs - entry.pendingSinceMs! >= logic.openDelayMs) {
      await this.applyState(logic, entry, "open", nowMs);
    }
  }

  private setPendingState(
    entry: RuntimeEntryInternal,
    state: LevelCrossingRuntimeState,
    nowMs: number
  ): void {
    if (entry.pendingState !== state) {
      entry.pendingState = state;
      entry.pendingSinceMs = nowMs;
      return;
    }

    entry.pendingSinceMs ??= nowMs;
  }

  private clearPendingState(entry: RuntimeEntryInternal): void {
    entry.pendingState = null;
    entry.pendingSinceMs = null;
  }

  private syncEntryFromAccessoryFeedback(
    logic: LevelCrossingLogic,
    entry: RuntimeEntryInternal,
    nowMs: number
  ): void {
    const closed = this.getPhysicalClosedStateFromAccessory(logic);

    if (closed === "unknown" || closed === null) {
      return;
    }

    const physicalState: LevelCrossingRuntimeState = closed
      ? "closed"
      : "open";

    if (entry.state === physicalState) {
      return;
    }

    entry.state = physicalState;
    entry.lastChangedAtMs = nowMs;
    entry.closedSinceMs = physicalState === "closed"
      ? nowMs
      : null;
    entry.pendingState = null;
    entry.pendingSinceMs = null;
  }

  private getPhysicalClosedStateFromAccessory(
    logic: LevelCrossingLogic
  ): boolean | "unknown" | null {
    const getAccessoryActive = this.dataProvider.getAccessoryActive;

    if (!getAccessoryActive) {
      return null;
    }

    const action = logic.actions.find(
      (item): item is LevelCrossingAccessoryAction =>
        item.type === "setAccessory" && item.address > 0
    );

    if (!action) {
      return null;
    }

    const active = getAccessoryActive(action.address);

    if (active === "unknown") {
      return "unknown";
    }

    return active === action.activeWhenClosed;
  }

  private async applyState(
    logic: LevelCrossingLogic,
    entry: RuntimeEntryInternal,
    nextState: LevelCrossingRuntimeState,
    nowMs: number
  ): Promise<void> {
    if (entry.state === nextState) {
      entry.pendingState = null;
      entry.pendingSinceMs = null;
      return;
    }

    entry.state = nextState;
    entry.lastChangedAtMs = nowMs;
    entry.closedSinceMs = nextState === "closed" ? nowMs : null;
    entry.pendingState = null;
    entry.pendingSinceMs = null;

    await this.actionSink.setCrossingState?.(logic, nextState);

    for (const action of logic.actions) {
      if (action.type !== "setAccessory") {
        continue;
      }

      const active = nextState === "closed"
        ? action.activeWhenClosed
        : !action.activeWhenClosed;

      await this.actionSink.setAccessory?.(action.address, active, logic);
    }
  }

  private syncEntries(): void {
    const activeIds = new Set(this.document.crossings.map(logic => logic.id));

    for (const key of this.entries.keys()) {
      if (!activeIds.has(key)) {
        this.entries.delete(key);
      }
    }

    for (const logic of this.document.crossings) {
      this.getOrCreateEntry(logic, Date.now());
    }
  }

  private getOrCreateEntry(logic: LevelCrossingLogic, nowMs: number): RuntimeEntryInternal {
    const existing = this.entries.get(logic.id);

    if (existing) {
      existing.levelCrossingElementId = logic.levelCrossingElementId;
      return existing;
    }

    const entry: RuntimeEntryInternal = {
      logicId: logic.id,
      levelCrossingElementId: logic.levelCrossingElementId,
      state: "open",
      lastChangedAtMs: nowMs,
      closedSinceMs: null,
      pendingState: null,
      pendingSinceMs: null,
    };

    this.entries.set(logic.id, entry);
    return entry;
  }
}
