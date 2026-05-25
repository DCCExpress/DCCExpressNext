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
  turnoutAddress: number;
  closed: boolean;
};

export type SignalLogicRuleDto = {
  id: string;
  conditions: SignalLogicTurnoutConditionDto[];
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
  groups: SignalLogicRuleGroupDto[];
};

export type SignalLogicKnownSignal = {
  address: number;
  aspect: number;
};

export type SignalLogicKnownTurnout = {
  address: number;
};

export type SignalLogicValidationIssue = {
  level: "error" | "warning";
  message: string;
  groupId?: string;
  ruleId?: string;
  conditionId?: string;
};

export const DEFAULT_SIGNAL_LOGIC_DOCUMENT: SignalLogicDocumentDto = {
  version: 1,
  groups: [],
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

export function normalizeSignalLogicDocument(input: unknown): SignalLogicDocumentDto {
  if (typeof input !== "object" || input === null) {
    return DEFAULT_SIGNAL_LOGIC_DOCUMENT;
  }

  const raw = input as Partial<SignalLogicDocumentDto>;
  const groups = Array.isArray(raw.groups) ? raw.groups : [];

  return {
    version: 1,
    groups: groups.map((group, groupIndex) => ({
      id: typeof group?.id === "string" && group.id.length > 0
        ? group.id
        : `signal-group-${groupIndex + 1}`,
      signalAddress: Number.isFinite(Number(group?.signalAddress))
        ? Number(group?.signalAddress)
        : 0,
      defaultAspect: isSignalAspect(group?.defaultAspect)
        ? group.defaultAspect
        : "red",
      rules: Array.isArray(group?.rules)
        ? group.rules.map((rule, ruleIndex) => ({
            id: typeof rule?.id === "string" && rule.id.length > 0
              ? rule.id
              : `signal-rule-${groupIndex + 1}-${ruleIndex + 1}`,
            aspect: isSignalAspect(rule?.aspect)
              ? rule.aspect
              : "red",
            conditions: Array.isArray(rule?.conditions)
              ? rule.conditions.map((condition, conditionIndex) => ({
                  id: typeof condition?.id === "string" && condition.id.length > 0
                    ? condition.id
                    : `signal-condition-${groupIndex + 1}-${ruleIndex + 1}-${conditionIndex + 1}`,
                  turnoutAddress: Number.isFinite(Number(condition?.turnoutAddress))
                    ? Number(condition?.turnoutAddress)
                    : 0,
                  closed: Boolean(condition?.closed),
                }))
              : [],
          }))
        : [],
    })),
  };
}

export function validateSignalLogicDocument(
  document: SignalLogicDocumentDto,
  knownSignals: SignalLogicKnownSignal[] = [],
  knownTurnouts: SignalLogicKnownTurnout[] = []
): SignalLogicValidationIssue[] {
  const issues: SignalLogicValidationIssue[] = [];
  const knownSignalByAddress = new Map(
    knownSignals.map(signal => [signal.address, signal])
  );
  const knownTurnoutAddresses = new Set(
    knownTurnouts.map(turnout => turnout.address)
  );
  const usedSignalAddresses = new Set<number>();

  for (const group of document.groups) {
    if (group.signalAddress <= 0) {
      issues.push({
        level: "error",
        groupId: group.id,
        message: "Signal address must be greater than zero.",
      });
    }

    if (usedSignalAddresses.has(group.signalAddress)) {
      issues.push({
        level: "warning",
        groupId: group.id,
        message: `Signal #${group.signalAddress} has more than one rule group.`,
      });
    }

    usedSignalAddresses.add(group.signalAddress);

    const knownSignal = knownSignalByAddress.get(group.signalAddress);

    if (knownSignals.length > 0 && !knownSignal) {
      issues.push({
        level: "error",
        groupId: group.id,
        message: `Signal #${group.signalAddress} does not exist on the layout.`,
      });
    }

    if (knownSignal) {
      const allowedAspects = getAllowedSignalAspects(knownSignal.aspect);

      if (!allowedAspects.includes(group.defaultAspect)) {
        issues.push({
          level: "error",
          groupId: group.id,
          message: `Signal #${group.signalAddress} cannot use default aspect ${group.defaultAspect}.`,
        });
      }
    }

    if (group.rules.length === 0) {
      issues.push({
        level: "warning",
        groupId: group.id,
        message: `Signal #${group.signalAddress} has no rules and will always use the default aspect.`,
      });
    }

    const ruleSignatures = new Set<string>();

    for (const rule of group.rules) {
      if (knownSignal) {
        const allowedAspects = getAllowedSignalAspects(knownSignal.aspect);

        if (!allowedAspects.includes(rule.aspect)) {
          issues.push({
            level: "error",
            groupId: group.id,
            ruleId: rule.id,
            message: `Signal #${group.signalAddress} cannot use rule aspect ${rule.aspect}.`,
          });
        }
      }

      if (rule.conditions.length === 0) {
        issues.push({
          level: "warning",
          groupId: group.id,
          ruleId: rule.id,
          message: "Rule has no conditions and will always match.",
        });
      }

      const signature = rule.conditions
        .map(condition => `${condition.turnoutAddress}:${condition.closed}`)
        .sort()
        .join("|");

      if (signature.length > 0 && ruleSignatures.has(signature)) {
        issues.push({
          level: "warning",
          groupId: group.id,
          ruleId: rule.id,
          message: "Another rule has the same turnout conditions.",
        });
      }

      ruleSignatures.add(signature);

      const conditionAddresses = new Set<number>();

      for (const condition of rule.conditions) {
        if (condition.turnoutAddress <= 0) {
          issues.push({
            level: "error",
            groupId: group.id,
            ruleId: rule.id,
            conditionId: condition.id,
            message: "Turnout condition must reference a turnout address greater than zero.",
          });
        }

        if (conditionAddresses.has(condition.turnoutAddress)) {
          issues.push({
            level: "warning",
            groupId: group.id,
            ruleId: rule.id,
            conditionId: condition.id,
            message: `Turnout #${condition.turnoutAddress} is used more than once in the same rule.`,
          });
        }

        conditionAddresses.add(condition.turnoutAddress);

        if (
          knownTurnoutAddresses.size > 0 &&
          !knownTurnoutAddresses.has(condition.turnoutAddress)
        ) {
          issues.push({
            level: "error",
            groupId: group.id,
            ruleId: rule.id,
            conditionId: condition.id,
            message: `Turnout #${condition.turnoutAddress} does not exist on the layout.`,
          });
        }
      }
    }
  }

  return issues;
}
