// common/src/signalLogic.ts

export type SignalAspect = "red" | "yellow" | "green" | "white";

export const SIGNAL_ASPECTS = [
  "red",
  "yellow",
  "green",
  "white",
] as const satisfies readonly SignalAspect[];

export type SignalLogicTurnoutConditionDto = {
  id: string;
  type: "turnout";
  turnoutAddress: number;
  closed: boolean;
};

export type SignalLogicSensorConditionDto = {
  id: string;
  type: "sensor";
  sensorAddress: number;
  active: boolean;
};

export type SignalLogicConditionDto =
  | SignalLogicTurnoutConditionDto
  | SignalLogicSensorConditionDto;

export type SignalLogicRuleDto = {
  id: string;
  conditions: SignalLogicConditionDto[];
  aspect: SignalAspect;
};

export type SignalLogicRuleGroupDto = {
  id: string;
  signalAddress: number;
  defaultAspect: SignalAspect;
  rules: SignalLogicRuleDto[];
};

export type SignalLogicDocumentDto = {
  version: 1;
  enabled?: boolean;
  autostart: boolean;
  groups: SignalLogicRuleGroupDto[];
};

export type SignalLogicRuntimeStateDto = {
  running: boolean;
  enabled?: boolean;
  autostart: boolean;
};

export type SignalLogicKnownSignal = {
  address: number;
  aspect: number;
};

export type SignalLogicKnownTurnout = {
  address: number;
};

export type SignalLogicKnownSensor = {
  address: number;
};

export type SignalLogicIntegrityOrphanSignalDto = {
  groupId: string;
  signalAddress: number;
  ruleCount: number;
  conditionCount: number;
};

export type SignalLogicIntegrityReportDto = {
  layoutSignalCount: number;
  ruleGroupCount: number;
  orphanSignals: SignalLogicIntegrityOrphanSignalDto[];
};

export type SignalLogicValidationIssue = {
  level: "error" | "warning";
  message: string;
  messageKey?: string;
  messageParams?: Record<string, string | number | boolean>;
  groupId?: string;
  ruleId?: string;
  conditionId?: string;
};

export const DEFAULT_SIGNAL_LOGIC_DOCUMENT: SignalLogicDocumentDto = {
  version: 1,
  enabled: false,
  autostart: false,
  groups: [],
};

type RawCondition = {
  id?: unknown;
  type?: unknown;
  turnoutAddress?: unknown;
  closed?: unknown;
  sensorAddress?: unknown;
  active?: unknown;
};

type RawRule = {
  id?: unknown;
  aspect?: unknown;
  conditions?: unknown;
};

type RawGroup = {
  id?: unknown;
  signalAddress?: unknown;
  defaultAspect?: unknown;
  rules?: unknown;
};

export function getAllowedSignalAspects(signalAspect: number): SignalAspect[] {
  if (signalAspect >= 4) {
    return ["red", "green", "yellow", "white"];
  }

  if (signalAspect >= 3) {
    return ["red", "green", "yellow"];
  }

  return ["red", "green"];
}

export function isSignalAspect(value: unknown): value is SignalAspect {
  return typeof value === "string" && (SIGNAL_ASPECTS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getConditionId(
  condition: RawCondition,
  groupIndex: number,
  ruleIndex: number,
  conditionIndex: number
): string {
  return typeof condition.id === "string" && condition.id.length > 0
    ? condition.id
    : `signal-condition-${groupIndex + 1}-${ruleIndex + 1}-${conditionIndex + 1}`;
}

function normalizeCondition(
  input: unknown,
  groupIndex: number,
  ruleIndex: number,
  conditionIndex: number
): SignalLogicConditionDto {
  const condition: RawCondition = isRecord(input) ? input : {};
  const id = getConditionId(
    condition,
    groupIndex,
    ruleIndex,
    conditionIndex
  );

  if (condition.type === "sensor") {
    return {
      id,
      type: "sensor",
      sensorAddress: Number.isFinite(Number(condition.sensorAddress))
        ? Number(condition.sensorAddress)
        : 0,
      active: Boolean(condition.active),
    };
  }

  return {
    id,
    type: "turnout",
    turnoutAddress: Number.isFinite(Number(condition.turnoutAddress))
      ? Number(condition.turnoutAddress)
      : 0,
    closed: Boolean(condition.closed),
  };
}

export function normalizeSignalLogicDocument(input: unknown): SignalLogicDocumentDto {
  if (!isRecord(input)) {
    return DEFAULT_SIGNAL_LOGIC_DOCUMENT;
  }

  const raw = input as { enabled?: unknown; autostart?: unknown; groups?: unknown };
  const groups = Array.isArray(raw.groups) ? raw.groups : [];
  const enabled = typeof raw.enabled === "boolean"
    ? raw.enabled
    : Boolean(raw.autostart);

  return {
    version: 1,
    enabled,
    autostart: enabled,
    groups: groups.map((groupInput, groupIndex) => {
      const group: RawGroup = isRecord(groupInput) ? groupInput : {};
      const rules = Array.isArray(group.rules) ? group.rules : [];

      return {
        id: typeof group.id === "string" && group.id.length > 0
          ? group.id
          : `signal-group-${groupIndex + 1}`,
        signalAddress: Number.isFinite(Number(group.signalAddress))
          ? Number(group.signalAddress)
          : 0,
        defaultAspect: isSignalAspect(group.defaultAspect)
          ? group.defaultAspect
          : "red",
        rules: rules.map((ruleInput, ruleIndex) => {
          const rule: RawRule = isRecord(ruleInput) ? ruleInput : {};
          const conditions = Array.isArray(rule.conditions)
            ? rule.conditions
            : [];

          return {
            id: typeof rule.id === "string" && rule.id.length > 0
              ? rule.id
              : `signal-rule-${groupIndex + 1}-${ruleIndex + 1}`,
            aspect: isSignalAspect(rule.aspect)
              ? rule.aspect
              : "red",
            conditions: conditions.map((condition, conditionIndex) =>
              normalizeCondition(
                condition,
                groupIndex,
                ruleIndex,
                conditionIndex
              )
            ),
          };
        }),
      };
    }),
  };
}

function conditionSignature(condition: SignalLogicConditionDto): string {
  switch (condition.type) {
    case "sensor":
      return `sensor:${condition.sensorAddress}:${condition.active}`;
    case "turnout":
    default:
      return `turnout:${condition.turnoutAddress}:${condition.closed}`;
  }
}

export function validateSignalLogicDocument(
  document: SignalLogicDocumentDto,
  knownSignals: SignalLogicKnownSignal[] = [],
  knownTurnouts: SignalLogicKnownTurnout[] = [],
  knownSensors: SignalLogicKnownSensor[] = []
): SignalLogicValidationIssue[] {
  const issues: SignalLogicValidationIssue[] = [];
  const knownSignalByAddress = new Map(
    knownSignals.map(signal => [signal.address, signal])
  );
  const knownTurnoutAddresses = new Set(
    knownTurnouts.map(turnout => turnout.address)
  );
  const knownSensorAddresses = new Set(
    knownSensors.map(sensor => sensor.address)
  );
  const usedSignalAddresses = new Set<number>();

  for (const group of document.groups) {
    if (group.signalAddress <= 0) {
      issues.push({ level: "error", groupId: group.id, message: "Signal address must be greater than zero." });
    }

    if (usedSignalAddresses.has(group.signalAddress)) {
      issues.push({ level: "warning", groupId: group.id, message: `Signal #${group.signalAddress} has more than one rule group.` });
    }

    usedSignalAddresses.add(group.signalAddress);
    const knownSignal = knownSignalByAddress.get(group.signalAddress);

    if (knownSignals.length > 0 && !knownSignal) {
      issues.push({ level: "error", groupId: group.id, message: `Signal #${group.signalAddress} does not exist on the layout.` });
    }

    if (knownSignal) {
      const allowedAspects = getAllowedSignalAspects(knownSignal.aspect);

      if (!allowedAspects.includes(group.defaultAspect)) {
        issues.push({ level: "error", groupId: group.id, message: `Signal #${group.signalAddress} cannot use default aspect ${group.defaultAspect}.` });
      }
    }

    if (group.rules.length === 0) {
      issues.push({ level: "warning", groupId: group.id, message: `Signal #${group.signalAddress} has no rules and will always use the default aspect.` });
    }

    const ruleSignatures = new Set<string>();
    const usedRuleAspects = new Set<SignalAspect>();

    for (const rule of group.rules) {
      if (usedRuleAspects.has(rule.aspect)) {
        issues.push({
          level: "warning",
          groupId: group.id,
          ruleId: rule.id,
          message: `More than one rule sets the signal to ${rule.aspect}.`,
          messageKey: "signalLogic.validation.duplicateRuleAspect",
          messageParams: { aspect: rule.aspect },
        });
      }

      usedRuleAspects.add(rule.aspect);

      if (knownSignal) {
        const allowedAspects = getAllowedSignalAspects(knownSignal.aspect);

        if (!allowedAspects.includes(rule.aspect)) {
          issues.push({ level: "error", groupId: group.id, ruleId: rule.id, message: `Signal #${group.signalAddress} cannot use rule aspect ${rule.aspect}.` });
        }
      }

      if (rule.conditions.length === 0) {
        issues.push({ level: "warning", groupId: group.id, ruleId: rule.id, message: "Rule has no conditions and will always match." });
      }

      const signature = rule.conditions.map(conditionSignature).sort().join("|");

      if (signature.length > 0 && ruleSignatures.has(signature)) {
        issues.push({ level: "warning", groupId: group.id, ruleId: rule.id, message: "Another rule has the same conditions." });
      }

      ruleSignatures.add(signature);
      const conditionKeys = new Set<string>();

      for (const condition of rule.conditions) {
        const key = `${condition.type}:${condition.type === "sensor" ? condition.sensorAddress : condition.turnoutAddress}`;

        if (conditionKeys.has(key)) {
          issues.push({ level: "warning", groupId: group.id, ruleId: rule.id, conditionId: condition.id, message: "The same input is used more than once in the same rule." });
        }

        conditionKeys.add(key);

        if (condition.type === "sensor") {
          if (condition.sensorAddress <= 0) {
            issues.push({ level: "error", groupId: group.id, ruleId: rule.id, conditionId: condition.id, message: "Sensor condition must reference a sensor address greater than zero." });
          }

          if (knownSensorAddresses.size > 0 && !knownSensorAddresses.has(condition.sensorAddress)) {
            issues.push({ level: "error", groupId: group.id, ruleId: rule.id, conditionId: condition.id, message: `Sensor #${condition.sensorAddress} does not exist on the layout.` });
          }

          continue;
        }

        if (condition.turnoutAddress <= 0) {
          issues.push({ level: "error", groupId: group.id, ruleId: rule.id, conditionId: condition.id, message: "Turnout condition must reference a turnout address greater than zero." });
        }

        if (knownTurnoutAddresses.size > 0 && !knownTurnoutAddresses.has(condition.turnoutAddress)) {
          issues.push({ level: "error", groupId: group.id, ruleId: rule.id, conditionId: condition.id, message: `Turnout #${condition.turnoutAddress} does not exist on the layout.` });
        }
      }
    }
  }

  return issues;
}
