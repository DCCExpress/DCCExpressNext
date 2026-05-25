import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Tabs,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { LayoutView } from "../../models/editor/core/LayoutView";
import { isTurnoutElement } from "../../models/editor/core/LayoutView";
import { TrackSensorElementView } from "../../models/editor/elements/TrackSensorElementView";
import { TrackSignalElementView } from "../../models/editor/elements/TrackSignalElementView";
import { generateId } from "../../helpers";
import AppModal from "../common/AppModal";
import { loadSignalLogicRulesWs, saveSignalLogicRulesWs } from "../../api/signalLogicWsApi";
import type {
  SignalAspect,
  SignalLogicConditionDto,
  SignalLogicRuleGroupDto,
  SignalLogicValidationIssue,
} from "../../../../common/src/signalLogic";
import { getAllowedSignalAspects, validateSignalLogicDocument } from "../../../../common/src/signalLogic";

type SignalLogicDialogProps = {
  opened: boolean;
  onClose: () => void;
  layout: LayoutView;
};

type AddressOption = { value: string; label: string };
type SignalOption = AddressOption & { aspect: number };
type Translate = ReturnType<typeof useTranslation>["t"];

function uniqueByValue<T extends { value: string }>(options: T[]): T[] {
  const seen = new Set<string>();
  return options.filter(option => {
    if (seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
}

function createTurnoutCondition(turnoutAddress: number): SignalLogicConditionDto {
  return { id: generateId(), type: "turnout", turnoutAddress, closed: true };
}

function createSensorCondition(sensorAddress: number): SignalLogicConditionDto {
  return { id: generateId(), type: "sensor", sensorAddress, active: true };
}

function createRule(signalAddress: number): SignalLogicRuleGroupDto {
  return {
    id: generateId(),
    signalAddress,
    defaultAspect: "red",
    rules: [{ id: generateId(), aspect: "green", conditions: [] }],
  };
}

function aspectToMethod(aspect: SignalAspect): string {
  switch (aspect) {
    case "green": return "setSignalGreen";
    case "yellow": return "setSignalYellow";
    case "white": return "setSignalWhite";
    default: return "setSignalRed";
  }
}

function aspectBadgeColor(aspect: SignalAspect): string {
  switch (aspect) {
    case "green": return "green";
    case "yellow": return "yellow";
    case "white": return "gray";
    default: return "red";
  }
}

function getConditionExpression(condition: SignalLogicConditionDto): string | null {
  if (condition.type === "sensor") {
    if (condition.sensorAddress <= 0) return null;
    const name = `s${condition.sensorAddress}Active`;
    return condition.active ? name : `!${name}`;
  }

  if (condition.turnoutAddress <= 0) return null;
  const name = `t${condition.turnoutAddress}Closed`;
  return condition.closed ? name : `!${name}`;
}

function buildGeneratedScript(groups: SignalLogicRuleGroupDto[]): string {
  const lines: string[] = ["while (true) {", ""];
  const conditions = groups.flatMap(group => group.rules.flatMap(rule => rule.conditions));
  const turnoutAddresses = Array.from(new Set(
    conditions
      .filter(condition => condition.type === "turnout")
      .map(condition => condition.turnoutAddress)
      .filter(address => address > 0)
  )).sort((a, b) => a - b);
  const sensorAddresses = Array.from(new Set(
    conditions
      .filter(condition => condition.type === "sensor")
      .map(condition => condition.sensorAddress)
      .filter(address => address > 0)
  )).sort((a, b) => a - b);

  for (const address of turnoutAddresses) lines.push(`  const t${address}Closed = getTurnoutState(${address});`);
  for (const address of sensorAddresses) lines.push(`  const s${address}Active = getSensorState(${address});`);
  if (turnoutAddresses.length > 0 || sensorAddresses.length > 0) lines.push("");

  for (const group of groups) {
    lines.push(`  // Signal #${group.signalAddress}`);
    group.rules.forEach((rule, index) => {
      const keyword = index === 0 ? "if" : "else if";
      const expressions = rule.conditions
        .map(getConditionExpression)
        .filter((expression): expression is string => Boolean(expression));
      lines.push(`  ${keyword} (${expressions.length === 0 ? "true" : expressions.join(" && ")}) {`);
      lines.push(`    await ${aspectToMethod(rule.aspect)}(${group.signalAddress});`);
      lines.push("  }");
    });
    lines.push("  else {");
    lines.push(`    await ${aspectToMethod(group.defaultAspect)}(${group.signalAddress});`);
    lines.push("  }");
    lines.push("");
  }

  lines.push("  await sleep(500);");
  lines.push("}");
  return lines.join("\n");
}

function getSignalAspect(signalOptions: SignalOption[], signalAddress: number): number {
  return signalOptions.find(option => Number(option.value) === signalAddress)?.aspect ?? 2;
}

function getAspectLabel(t: Translate, aspect: SignalAspect): string {
  return t(`signalLogic.aspects.${aspect}`);
}

function getAspectOptions(t: Translate, signalOptions: SignalOption[], signalAddress: number) {
  return getAllowedSignalAspects(getSignalAspect(signalOptions, signalAddress)).map(aspect => ({
    value: aspect,
    label: getAspectLabel(t, aspect),
  }));
}

function normalizeAspectForSignal(signalOptions: SignalOption[], signalAddress: number, aspect: SignalAspect): SignalAspect {
  const allowed = getAllowedSignalAspects(getSignalAspect(signalOptions, signalAddress));
  return allowed.includes(aspect) ? aspect : allowed[0] ?? "red";
}

function formatCondition(t: Translate, condition: SignalLogicConditionDto): string {
  if (condition.type === "sensor") {
    if (condition.sensorAddress <= 0) return t("signalLogic.sensorNotSelected");
    return t("signalLogic.sensorCondition", {
      address: condition.sensorAddress,
      state: t(condition.active ? "signalLogic.sensorStates.active" : "signalLogic.sensorStates.inactive"),
    });
  }

  if (condition.turnoutAddress <= 0) return t("signalLogic.turnoutNotSelected");
  return t("signalLogic.turnoutCondition", {
    address: condition.turnoutAddress,
    state: t(condition.closed ? "signalLogic.turnoutStates.closed" : "signalLogic.turnoutStates.thrown"),
  });
}

export default function SignalLogicDialog({ opened, onClose, layout }: SignalLogicDialogProps) {
  const { t } = useTranslation();

  const [groups, setGroups] = useState<SignalLogicRuleGroupDto[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [warningText, setWarningText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [serverIssues, setServerIssues] = useState<SignalLogicValidationIssue[]>([]);

  const turnoutStateOptions = useMemo(() => [
    { value: "true", label: t("signalLogic.turnoutStates.closed") },
    { value: "false", label: t("signalLogic.turnoutStates.thrown") },
  ], [t]);

  const sensorStateOptions = useMemo(() => [
    { value: "true", label: t("signalLogic.sensorStates.active") },
    { value: "false", label: t("signalLogic.sensorStates.inactive") },
  ], [t]);

  const signalOptions = useMemo<SignalOption[]>(() => uniqueByValue(
    layout
      .getAllElements()
      .filter((element): element is TrackSignalElementView => element instanceof TrackSignalElementView)
      .map(signal => ({
        value: signal.address.toString(),
        label: t("signalLogic.signalOption", { address: signal.address, aspect: signal.aspect }),
        aspect: signal.aspect,
      }))
      .sort((a, b) => Number(a.value) - Number(b.value))
  ), [layout, t]);

  const turnoutOptions = useMemo<AddressOption[]>(() => uniqueByValue(
    layout
      .getAllElements()
      .filter(isTurnoutElement)
      .map(turnout => ({
        value: turnout.turnoutAddress.toString(),
        label: t("signalLogic.turnoutOption", { address: turnout.turnoutAddress }),
      }))
      .sort((a, b) => Number(a.value) - Number(b.value))
  ), [layout, t]);

  const sensorOptions = useMemo<AddressOption[]>(() => uniqueByValue(
    layout
      .getAllElements()
      .filter((element): element is TrackSensorElementView => element instanceof TrackSensorElementView)
      .map(sensor => ({
        value: sensor.address.toString(),
        label: t("signalLogic.sensorOption", { address: sensor.address }),
      }))
      .sort((a, b) => Number(a.value) - Number(b.value))
  ), [layout, t]);

  const knownSignals = useMemo(
    () => signalOptions.map(signal => ({ address: Number(signal.value), aspect: signal.aspect })),
    [signalOptions]
  );
  const knownTurnouts = useMemo(
    () => turnoutOptions.map(turnout => ({ address: Number(turnout.value) })),
    [turnoutOptions]
  );
  const knownSensors = useMemo(
    () => sensorOptions.map(sensor => ({ address: Number(sensor.value) })),
    [sensorOptions]
  );

  const selectedGroup = groups.find(group => group.id === selectedGroupId) ?? groups[0] ?? null;
  const document = useMemo(() => ({ version: 1 as const, groups }), [groups]);
  const validationIssues = useMemo(
    () => validateSignalLogicDocument(document, knownSignals, knownTurnouts, knownSensors),
    [document, knownSignals, knownTurnouts, knownSensors]
  );
  const issueList = validationIssues.length > 0 ? validationIssues : serverIssues;
  const hasValidationErrors = validationIssues.some(issue => issue.level === "error");
  const generatedScript = useMemo(() => buildGeneratedScript(groups), [groups]);
  const aspectOptionsFor = (signalAddress: number) => getAspectOptions(t, signalOptions, signalAddress);

  const clearMessages = (): void => {
    setStatusText(null);
    setWarningText(null);
    setErrorText(null);
  };

  const loadRules = async (): Promise<void> => {
    setLoading(true);
    clearMessages();
    try {
      const result = await loadSignalLogicRulesWs();
      setGroups(result.document.groups);
      setSelectedGroupId(result.document.groups[0]?.id ?? null);
      setServerIssues(result.issues);
      if (result.created) {
        setWarningText(result.message ?? t("signalLogic.createdWarning"));
      } else {
        setStatusText(t("signalLogic.loaded"));
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (opened) void loadRules();
  }, [opened]);

  const saveRules = async (): Promise<void> => {
    setSaving(true);
    clearMessages();
    try {
      const result = await saveSignalLogicRulesWs(document);
      setGroups(result.document.groups);
      setSelectedGroupId(previous => previous ?? result.document.groups[0]?.id ?? null);
      setServerIssues(result.issues);
      setStatusText(t("signalLogic.saved"));
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const updateGroup = (
    groupId: string,
    update: (group: SignalLogicRuleGroupDto) => SignalLogicRuleGroupDto
  ): void => {
    clearMessages();
    setGroups(previous => previous.map(group => group.id === groupId ? update(group) : group));
  };

  const addSignalRuleGroup = (): void => {
    const usedAddresses = new Set(groups.map(group => group.signalAddress));
    const nextSignal = signalOptions.find(option => !usedAddresses.has(Number(option.value)));
    const signalAddress = Number(nextSignal?.value ?? signalOptions[0]?.value ?? 0);
    if (signalAddress <= 0) return;

    const group = createRule(signalAddress);
    group.defaultAspect = normalizeAspectForSignal(signalOptions, signalAddress, group.defaultAspect);
    group.rules = group.rules.map(rule => ({
      ...rule,
      aspect: normalizeAspectForSignal(signalOptions, signalAddress, rule.aspect),
    }));

    clearMessages();
    setGroups(previous => [...previous, group]);
    setSelectedGroupId(group.id);
  };

  const deleteSignalRuleGroup = (groupId: string): void => {
    clearMessages();
    setGroups(previous => {
      const next = previous.filter(group => group.id !== groupId);
      setSelectedGroupId(next[0]?.id ?? null);
      return next;
    });
  };

  const addRule = (groupId: string): void => {
    updateGroup(groupId, group => ({
      ...group,
      rules: [
        ...group.rules,
        { id: generateId(), aspect: normalizeAspectForSignal(signalOptions, group.signalAddress, "yellow"), conditions: [] },
      ],
    }));
  };

  const deleteRule = (groupId: string, ruleId: string): void => {
    updateGroup(groupId, group => ({
      ...group,
      rules: group.rules.filter(rule => rule.id !== ruleId),
    }));
  };

  const addTurnoutCondition = (groupId: string, ruleId: string): void => {
    updateGroup(groupId, group => ({
      ...group,
      rules: group.rules.map(rule => rule.id === ruleId
        ? { ...rule, conditions: [...rule.conditions, createTurnoutCondition(Number(turnoutOptions[0]?.value ?? 0))] }
        : rule),
    }));
  };

  const addSensorCondition = (groupId: string, ruleId: string): void => {
    updateGroup(groupId, group => ({
      ...group,
      rules: group.rules.map(rule => rule.id === ruleId
        ? { ...rule, conditions: [...rule.conditions, createSensorCondition(Number(sensorOptions[0]?.value ?? 0))] }
        : rule),
    }));
  };

  const deleteCondition = (groupId: string, ruleId: string, conditionId: string): void => {
    updateGroup(groupId, group => ({
      ...group,
      rules: group.rules.map(rule => rule.id === ruleId
        ? { ...rule, conditions: rule.conditions.filter(condition => condition.id !== conditionId) }
        : rule),
    }));
  };

  const updateCondition = (
    groupId: string,
    ruleId: string,
    conditionId: string,
    update: (condition: SignalLogicConditionDto) => SignalLogicConditionDto
  ): void => {
    updateGroup(groupId, group => ({
      ...group,
      rules: group.rules.map(rule => rule.id === ruleId
        ? {
            ...rule,
            conditions: rule.conditions.map(condition =>
              condition.id === conditionId ? update(condition) : condition
            ),
          }
        : rule),
    }));
  };

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={t("signalLogic.title")}
      size={1200}
      centered
      draggable
      styles={{
        content: {
          height: "min(820px, calc(100vh - 48px))",
          maxHeight: "min(820px, calc(100vh - 48px))",
          display: "flex",
          flexDirection: "column",
        },
        body: {
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Stack h="100%" gap="xs">
        {loading && groups.length === 0 && !warningText && (
          <Group gap="xs">
            <Loader size="xs" />
            <Text size="sm" c="dimmed">{t("signalLogic.loading")}</Text>
          </Group>
        )}

        {errorText && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} py="xs">
            {errorText}
          </Alert>
        )}

        {warningText && !errorText && (
          <Alert color="yellow" icon={<IconAlertTriangle size={16} />} py="xs">
            {warningText}
          </Alert>
        )}

        {statusText && !warningText && !errorText && (
          <Alert color="green" py="xs">{statusText}</Alert>
        )}

        {issueList.length > 0 && (
          <Alert color={hasValidationErrors ? "red" : "yellow"} icon={<IconAlertTriangle size={16} />} py="xs">
            <Stack gap={4}>
              {issueList.slice(0, 4).map((issue, index) => (
                <Text key={`${issue.message}-${index}`} size="sm">
                  {t("signalLogic.validationLine", {
                    level: issue.level.toUpperCase(),
                    message: issue.message,
                  })}
                </Text>
              ))}
              {issueList.length > 4 && (
                <Text size="sm" c="dimmed">
                  {t("signalLogic.moreValidationMessages", { count: issueList.length - 4 })}
                </Text>
              )}
            </Stack>
          </Alert>
        )}

        <Tabs defaultValue="rules" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Tabs.List style={{ flex: "0 0 auto" }}>
            <Tabs.Tab value="rules">{t("signalLogic.tabs.rules")}</Tabs.Tab>
            <Tabs.Tab value="preview">{t("signalLogic.tabs.preview")}</Tabs.Tab>
            <Tabs.Tab value="script">{t("signalLogic.tabs.script")}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="rules" style={{ flex: 1, minHeight: 0 }}>
            <ScrollArea h="100%" pt="md" type="auto" offsetScrollbars>
              <Group align="stretch" wrap="nowrap" h="100%">
                <Card withBorder w={260} p="sm" style={{ flex: "0 0 260px" }}>
                  <Group justify="space-between" mb="sm">
                    <Title order={5}>{t("signalLogic.signals")}</Title>
                    <Button size="xs" leftSection={<IconPlus size={14} />} onClick={addSignalRuleGroup}>
                      {t("signalLogic.add")}
                    </Button>
                  </Group>

                  <ScrollArea h={540} type="auto" offsetScrollbars>
                    <Stack gap="xs">
                      {groups.length === 0 && <Text size="sm" c="dimmed">{t("signalLogic.emptySignals")}</Text>}
                      {groups.map(group => (
                        <Button
                          key={group.id}
                          variant={group.id === selectedGroup?.id ? "filled" : "light"}
                          justify="space-between"
                          onClick={() => setSelectedGroupId(group.id)}
                        >
                          <span>{t("signalLogic.signalsListItem", { address: group.signalAddress })}</span>
                          <Badge size="xs" variant="light">{group.rules.length}</Badge>
                        </Button>
                      ))}
                    </Stack>
                  </ScrollArea>
                </Card>

                <Box flex={1} style={{ minWidth: 0 }}>
                  {!selectedGroup ? (
                    <Card withBorder p="lg">
                      <Text c="dimmed">{t("signalLogic.selectOrAdd")}</Text>
                    </Card>
                  ) : (
                    <Stack gap="md" pb="md">
                      <Card withBorder>
                        <Group justify="space-between" align="flex-end">
                          <Group align="flex-end">
                            <Select
                              label={t("signalLogic.signal")}
                              data={signalOptions}
                              value={selectedGroup.signalAddress.toString()}
                              onChange={value => {
                                const signalAddress = Number(value ?? 0);
                                updateGroup(selectedGroup.id, group => ({
                                  ...group,
                                  signalAddress,
                                  defaultAspect: normalizeAspectForSignal(signalOptions, signalAddress, group.defaultAspect),
                                  rules: group.rules.map(rule => ({
                                    ...rule,
                                    aspect: normalizeAspectForSignal(signalOptions, signalAddress, rule.aspect),
                                  })),
                                }));
                              }}
                              w={260}
                            />

                            <Select
                              label={t("signalLogic.defaultAspect")}
                              data={aspectOptionsFor(selectedGroup.signalAddress)}
                              value={selectedGroup.defaultAspect}
                              onChange={value => updateGroup(selectedGroup.id, group => ({
                                ...group,
                                defaultAspect: (value ?? "red") as SignalAspect,
                              }))}
                              w={180}
                            />
                          </Group>

                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => deleteSignalRuleGroup(selectedGroup.id)}
                            aria-label={t("signalLogic.deleteSignalRuleGroup")}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Card>

                      {selectedGroup.rules.map((rule, ruleIndex) => (
                        <Card key={rule.id} withBorder>
                          <Group justify="space-between" mb="sm">
                            <Group>
                              <Badge>{t("signalLogic.rule", { index: ruleIndex + 1 })}</Badge>
                              <Text fw={600}>{t("signalLogic.then")}</Text>
                              <Select
                                data={aspectOptionsFor(selectedGroup.signalAddress)}
                                value={rule.aspect}
                                onChange={value => updateGroup(selectedGroup.id, group => ({
                                  ...group,
                                  rules: group.rules.map(currentRule =>
                                    currentRule.id === rule.id
                                      ? { ...currentRule, aspect: (value ?? "red") as SignalAspect }
                                      : currentRule
                                  ),
                                }))}
                                w={160}
                              />
                            </Group>

                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => deleteRule(selectedGroup.id, rule.id)}
                              aria-label={t("signalLogic.deleteRule")}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>

                          <Stack gap="xs">
                            {rule.conditions.map((condition, conditionIndex) => (
                              <Group key={condition.id} align="flex-end">
                                <Text w={36} size="sm" c="dimmed">
                                  {conditionIndex === 0 ? t("signalLogic.if") : t("signalLogic.and")}
                                </Text>

                                {condition.type === "sensor" ? (
                                  <>
                                    <Select
                                      label={conditionIndex === 0 ? t("signalLogic.sensor") : undefined}
                                      data={sensorOptions}
                                      value={condition.sensorAddress > 0 ? condition.sensorAddress.toString() : null}
                                      placeholder={t("signalLogic.selectSensor")}
                                      onChange={value => updateCondition(selectedGroup.id, rule.id, condition.id, current =>
                                        current.type === "sensor"
                                          ? { ...current, sensorAddress: Number(value ?? 0) }
                                          : current
                                      )}
                                      w={220}
                                    />

                                    <Select
                                      label={conditionIndex === 0 ? t("signalLogic.state") : undefined}
                                      data={sensorStateOptions}
                                      value={condition.active.toString()}
                                      onChange={value => updateCondition(selectedGroup.id, rule.id, condition.id, current =>
                                        current.type === "sensor"
                                          ? { ...current, active: value === "true" }
                                          : current
                                      )}
                                      w={180}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <Select
                                      label={conditionIndex === 0 ? t("signalLogic.turnout") : undefined}
                                      data={turnoutOptions}
                                      value={condition.turnoutAddress > 0 ? condition.turnoutAddress.toString() : null}
                                      placeholder={t("signalLogic.selectTurnout")}
                                      onChange={value => updateCondition(selectedGroup.id, rule.id, condition.id, current =>
                                        current.type === "turnout"
                                          ? { ...current, turnoutAddress: Number(value ?? 0) }
                                          : current
                                      )}
                                      w={220}
                                    />

                                    <Select
                                      label={conditionIndex === 0 ? t("signalLogic.state") : undefined}
                                      data={turnoutStateOptions}
                                      value={condition.closed.toString()}
                                      onChange={value => updateCondition(selectedGroup.id, rule.id, condition.id, current =>
                                        current.type === "turnout"
                                          ? { ...current, closed: value === "true" }
                                          : current
                                      )}
                                      w={160}
                                    />
                                  </>
                                )}

                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  onClick={() => deleteCondition(selectedGroup.id, rule.id, condition.id)}
                                  aria-label={t("signalLogic.deleteCondition")}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            ))}

                            <Group gap="xs">
                              <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => addTurnoutCondition(selectedGroup.id, rule.id)}>
                                {t("signalLogic.addTurnoutCondition")}
                              </Button>
                              <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => addSensorCondition(selectedGroup.id, rule.id)}>
                                {t("signalLogic.addOccupancyCondition")}
                              </Button>
                            </Group>
                          </Stack>
                        </Card>
                      ))}

                      <Button variant="light" leftSection={<IconPlus size={14} />} onClick={() => addRule(selectedGroup.id)}>
                        {t("signalLogic.addRule")}
                      </Button>
                    </Stack>
                  )}
                </Box>
              </Group>
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="preview" style={{ flex: 1, minHeight: 0 }}>
            <ScrollArea h="100%" pt="md" type="auto" offsetScrollbars>
              <Stack pb="md">
                {groups.map(group => (
                  <Card key={group.id} withBorder>
                    <Group justify="space-between" mb="sm">
                      <Title order={5}>{t("signalLogic.signalsListItem", { address: group.signalAddress })}</Title>
                      <Badge color={aspectBadgeColor(group.defaultAspect)} variant="light">
                        {t("signalLogic.default", { aspect: getAspectLabel(t, group.defaultAspect) })}
                      </Badge>
                    </Group>

                    <Stack gap="xs">
                      {group.rules.map((rule, index) => (
                        <Card key={rule.id} withBorder p="xs" radius="md">
                          <Group align="center" gap="xs" wrap="wrap">
                            <Badge variant="outline">
                              {t("signalLogic.rule", { index: index + 1 })}
                            </Badge>

                            {rule.conditions.length === 0 ? (
                              <Badge variant="light" color="gray">
                                {t("signalLogic.always")}
                              </Badge>
                            ) : (
                              rule.conditions.map((condition, conditionIndex) => (
                                <Fragment key={condition.id}>
                                  {conditionIndex > 0 && (
                                    <Text size="xs" c="dimmed" fw={700}>
                                      {t("signalLogic.and")}
                                    </Text>
                                  )}
                                  <Badge variant="light" color={condition.type === "sensor" ? "blue" : "grape"}>
                                    {formatCondition(t, condition)}
                                  </Badge>
                                </Fragment>
                              ))
                            )}

                            <Text size="sm" c="dimmed">→</Text>
                            <Badge color={aspectBadgeColor(rule.aspect)} variant="filled">
                              {getAspectLabel(t, rule.aspect).toUpperCase()}
                            </Badge>
                          </Group>
                        </Card>
                      ))}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="script" style={{ flex: 1, minHeight: 0 }}>
            <Stack h="100%" pt="md">
              <Text size="sm" c="dimmed">{t("signalLogic.scriptDescription")}</Text>

              <Textarea
                value={generatedScript}
                readOnly
                style={{ flex: 1, minHeight: 0 }}
                styles={{
                  wrapper: { height: "100%" },
                  input: { height: "100%", fontFamily: "monospace", resize: "none" },
                }}
              />

              <Divider />

              <Group justify="space-between" pb="xs">
                <Text size="sm" c="dimmed">
                  {t("signalLogic.foundSummary", {
                    signals: signalOptions.length,
                    turnouts: turnoutOptions.length,
                    sensors: sensorOptions.length,
                  })}
                </Text>
                <NumberInput
                  label={t("signalLogic.pollingIntervalPreview")}
                  value={500}
                  disabled
                  suffix=" ms"
                  w={180}
                />
              </Group>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Divider />

        <Group justify="space-between">
          <Text size="sm" c="dimmed">{t("signalLogic.savePath")}</Text>
          <Group>
            <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => void loadRules()} loading={loading}>
              {t("signalLogic.reload")}
            </Button>
            <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void saveRules()} loading={saving} disabled={hasValidationErrors}>
              {t("signalLogic.save")}
            </Button>
          </Group>
        </Group>
      </Stack>
    </AppModal>
  );
}
