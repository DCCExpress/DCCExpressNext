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

  /**
   * The crossing closes when ANY trigger is active.
   */
  closeTriggers: LevelCrossingCondition[];

  /**
   * The crossing opens only when ALL configured clear conditions are true.
   * If this list is empty, the evaluator falls back to "no close trigger is active".
   */
  openConditions: LevelCrossingCondition[];

  closeDelayMs: number;
  openDelayMs: number;
  minClosedMs: number;

  actions: LevelCrossingAction[];
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

  // Fail-safe rule: unknown close conditions do not force closing by themselves,
  // but unknown open conditions prevent opening.
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
