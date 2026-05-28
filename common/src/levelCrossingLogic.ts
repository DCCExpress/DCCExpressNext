export type LevelCrossingRuntimeState =
  | "open"
  | "closing"
  | "closed"
  | "opening";

export type LevelCrossingConditionOperator = "is" | "isNot";

export type LevelCrossingConditionBase = {
  id: string;
  label?: string;
  operator?: LevelCrossingConditionOperator;
};

export type LevelCrossingSensorCondition = LevelCrossingConditionBase & {
  type: "sensor";
  sensorAddress: number;
  active: boolean;
};

export type LevelCrossingBlockCondition = LevelCrossingConditionBase & {
  type: "block";
  blockId: string;
  occupied: boolean;
};

export type LevelCrossingRouteCondition = LevelCrossingConditionBase & {
  type: "route";
  fromBlockId?: string;
  toBlockId?: string;
  reserved: boolean;
};

export type LevelCrossingCondition =
  | LevelCrossingSensorCondition
  | LevelCrossingBlockCondition
  | LevelCrossingRouteCondition;

export type LevelCrossingAccessoryAction = {
  id: string;
  type: "setAccessory";
  address: number;
  activeWhenClosed: boolean;
};

export type LevelCrossingElementStateAction = {
  id: string;
  type: "setElementState";
  closedState: LevelCrossingRuntimeState;
  openState: LevelCrossingRuntimeState;
};

export type LevelCrossingAction =
  | LevelCrossingAccessoryAction
  | LevelCrossingElementStateAction;

export type LevelCrossingLogic = {
  id: string;
  levelCrossingElementId: string;
  enabled: boolean;
  closeTriggers: LevelCrossingCondition[];
  openConditions: LevelCrossingCondition[];
  closeDelayMs: number;
  openDelayMs: number;
  minClosedMs: number;
  actions: LevelCrossingAction[];
};

export type LevelCrossingLogicDocumentDto = {
  version: 1;
  enabled: boolean;
  crossings: LevelCrossingLogic[];
};

export type LevelCrossingRuntimeEntryDto = {
  logicId: string;
  levelCrossingElementId: string;
  state: LevelCrossingRuntimeState;
  lastChangedAtMs: number;
  lastEvaluation?: LevelCrossingEvaluationResult;
};

export type LevelCrossingRuntimeStateDto = {
  running: boolean;
  enabled: boolean;
  crossings: LevelCrossingRuntimeEntryDto[];
};

export type LevelCrossingCommandAction =
  | "load"
  | "save"
  | "start"
  | "stop"
  | "snapshot";

export type LevelCrossingCommandPayload = {
  requestId: string;
  action: LevelCrossingCommandAction;
  document?: LevelCrossingLogicDocumentDto;
};

export type LevelCrossingResponsePayload = {
  requestId: string;
  action: LevelCrossingCommandAction;
  ok: boolean;
  message?: string;
  document?: LevelCrossingLogicDocumentDto;
  runtime?: LevelCrossingRuntimeStateDto;
};

export type LevelCrossingConditionValue = boolean | "unknown";

export type LevelCrossingEvaluationContext = {
  getSensorActive: (sensorAddress: number) => LevelCrossingConditionValue;
  getBlockOccupied: (blockId: string) => LevelCrossingConditionValue;
  getRouteReserved: (fromBlockId?: string, toBlockId?: string) => LevelCrossingConditionValue;
  nowMs: number;
};

export type LevelCrossingEvaluationResult = {
  shouldClose: boolean;
  mayOpen: boolean;
  hasUnknownCloseCondition: boolean;
  hasUnknownOpenCondition: boolean;
  reason: "disabled" | "close-trigger" | "open-allowed" | "hold-closed";
};

export const DEFAULT_LEVEL_CROSSING_LOGIC_DOCUMENT: LevelCrossingLogicDocumentDto = {
  version: 1,
  enabled: false,
  crossings: [],
};

export function createDefaultLevelCrossingLogic(
  id: string,
  levelCrossingElementId: string
): LevelCrossingLogic {
  return {
    id,
    levelCrossingElementId,
    enabled: true,
    closeTriggers: [],
    openConditions: [],
    closeDelayMs: 0,
    openDelayMs: 1000,
    minClosedMs: 3000,
    actions: [],
  };
}

export function normalizeLevelCrossingLogicDocument(input: unknown): LevelCrossingLogicDocumentDto {
  if (!isRecord(input)) {
    return DEFAULT_LEVEL_CROSSING_LOGIC_DOCUMENT;
  }

  const rawCrossings = Array.isArray(input.crossings) ? input.crossings : [];
  const enabled = typeof input.enabled === "boolean"
    ? input.enabled
    : Boolean(input.autostart);

  return {
    version: 1,
    enabled,
    crossings: rawCrossings.map((raw, index) => normalizeLevelCrossingLogic(raw, index)),
  };
}

export function evaluateLevelCrossingCondition(
  condition: LevelCrossingCondition,
  context: LevelCrossingEvaluationContext
): LevelCrossingConditionValue {
  let value: LevelCrossingConditionValue;

  switch (condition.type) {
    case "sensor":
      value = context.getSensorActive(condition.sensorAddress);
      break;
    case "block":
      value = context.getBlockOccupied(condition.blockId);
      break;
    case "route":
      value = context.getRouteReserved(condition.fromBlockId, condition.toBlockId);
      break;
  }

  if (value === "unknown") {
    return value;
  }

  const expected = getExpectedConditionValue(condition);
  const matches = value === expected;

  return condition.operator === "isNot" ? !matches : matches;
}

export function evaluateLevelCrossingLogic(
  logic: LevelCrossingLogic,
  context: LevelCrossingEvaluationContext
): LevelCrossingEvaluationResult {
  if (!logic.enabled) {
    return {
      shouldClose: false,
      mayOpen: true,
      hasUnknownCloseCondition: false,
      hasUnknownOpenCondition: false,
      reason: "disabled",
    };
  }

  const closeValues = logic.closeTriggers.map(condition =>
    evaluateLevelCrossingCondition(condition, context)
  );
  const hasUnknownCloseCondition = closeValues.some(value => value === "unknown");
  const shouldClose = closeValues.some(value => value === true);

  const openValues = logic.openConditions.length > 0
    ? logic.openConditions.map(condition =>
        evaluateLevelCrossingCondition(condition, context)
      )
    : closeValues.map(value => value === "unknown" ? "unknown" : !value);

  const hasUnknownOpenCondition = openValues.some(value => value === "unknown");
  const mayOpen = !shouldClose
    && !hasUnknownOpenCondition
    && openValues.every(value => value === true);

  return {
    shouldClose,
    mayOpen,
    hasUnknownCloseCondition,
    hasUnknownOpenCondition,
    reason: shouldClose
      ? "close-trigger"
      : mayOpen
        ? "open-allowed"
        : "hold-closed",
  };
}

function normalizeLevelCrossingLogic(input: unknown, index: number): LevelCrossingLogic {
  const raw = isRecord(input) ? input : {};
  const fallbackId = `level-crossing-logic-${index + 1}`;
  const id = getNonEmptyString(raw.id, fallbackId);
  const levelCrossingElementId = getNonEmptyString(raw.levelCrossingElementId, "");

  return {
    id,
    levelCrossingElementId,
    enabled: raw.enabled !== false,
    closeTriggers: normalizeConditionList(raw.closeTriggers, id, "close"),
    openConditions: normalizeConditionList(raw.openConditions, id, "open"),
    closeDelayMs: getSafeInteger(raw.closeDelayMs, 0),
    openDelayMs: getSafeInteger(raw.openDelayMs, 1000),
    minClosedMs: getSafeInteger(raw.minClosedMs, 3000),
    actions: normalizeActionList(raw.actions, id),
  };
}

function normalizeConditionList(input: unknown, logicId: string, scope: "close" | "open"): LevelCrossingCondition[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((condition, index) =>
    normalizeCondition(condition, `${logicId}-${scope}-condition-${index + 1}`)
  );
}

function normalizeCondition(input: unknown, fallbackId: string): LevelCrossingCondition {
  const raw = isRecord(input) ? input : {};
  const id = getNonEmptyString(raw.id, fallbackId);
  const label = getOptionalNonEmptyString(raw.label);
  const operator: LevelCrossingConditionOperator = raw.operator === "isNot" ? "isNot" : "is";
  const common: LevelCrossingConditionBase = {
    id,
    operator,
    ...(label === undefined ? {} : { label }),
  };

  if (raw.type === "block") {
    return {
      ...common,
      type: "block",
      blockId: getNonEmptyString(raw.blockId, ""),
      occupied: raw.occupied !== false,
    };
  }

  if (raw.type === "route") {
    const fromBlockId = getOptionalNonEmptyString(raw.fromBlockId);
    const toBlockId = getOptionalNonEmptyString(raw.toBlockId);

    return {
      ...common,
      type: "route",
      ...(fromBlockId === undefined ? {} : { fromBlockId }),
      ...(toBlockId === undefined ? {} : { toBlockId }),
      reserved: raw.reserved !== false,
    };
  }

  return {
    ...common,
    type: "sensor",
    sensorAddress: getSafeInteger(raw.sensorAddress, 0),
    active: raw.active !== false,
  };
}

function normalizeActionList(input: unknown, logicId: string): LevelCrossingAction[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((action, index) =>
    normalizeAction(action, `${logicId}-action-${index + 1}`)
  );
}

function normalizeAction(input: unknown, fallbackId: string): LevelCrossingAction {
  const raw = isRecord(input) ? input : {};
  const id = getNonEmptyString(raw.id, fallbackId);

  if (raw.type === "setElementState") {
    return {
      id,
      type: "setElementState",
      closedState: normalizeRuntimeState(raw.closedState, "closed"),
      openState: normalizeRuntimeState(raw.openState, "open"),
    };
  }

  return {
    id,
    type: "setAccessory",
    address: getSafeInteger(raw.address, 0),
    activeWhenClosed: raw.activeWhenClosed !== false,
  };
}

function normalizeRuntimeState(input: unknown, fallback: LevelCrossingRuntimeState): LevelCrossingRuntimeState {
  return input === "open" || input === "closing" || input === "closed" || input === "opening"
    ? input
    : fallback;
}

function getExpectedConditionValue(condition: LevelCrossingCondition): boolean {
  switch (condition.type) {
    case "sensor":
      return condition.active;
    case "block":
      return condition.occupied;
    case "route":
      return condition.reserved;
  }
}

function getSafeInteger(input: unknown, fallback: number): number {
  const value = Number(input);
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function getNonEmptyString(input: unknown, fallback: string): string {
  return typeof input === "string" && input.trim().length > 0
    ? input
    : fallback;
}

function getOptionalNonEmptyString(input: unknown): string | undefined {
  return typeof input === "string" && input.trim().length > 0
    ? input
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
