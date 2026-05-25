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
import { IconAlertTriangle, IconDeviceFloppy, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

import type { LayoutView } from "../../models/editor/core/LayoutView";
import { isTurnoutElement } from "../../models/editor/core/LayoutView";
import { TrackSignalElementView } from "../../models/editor/elements/TrackSignalElementView";
import { TrackSensorElementView } from "../../models/editor/elements/TrackSensorElementView";
import { generateId } from "../../helpers";
import AppModal from "../common/AppModal";
import {
  loadSignalLogicRulesWs,
  saveSignalLogicRulesWs,
} from "../../api/signalLogicWsApi";
import type {
  SignalAspect,
  SignalLogicConditionDto,
  SignalLogicRuleGroupDto,
  SignalLogicValidationIssue,
} from "../../../../common/src/signalLogic";
import {
  getAllowedSignalAspects,
  validateSignalLogicDocument,
} from "../../../../common/src/signalLogic";

type SignalLogicDialogProps = {
  opened: boolean;
  onClose: () => void;
  layout: LayoutView;
};

type AddressOption = {
  value: string;
  label: string;
};

type SignalOption = {
  value: string;
  label: string;
  aspect: number;
};

const aspectLabels: Record<SignalAspect, string> = {
  red: "Red",
  yellow: "Yellow",
  green: "Green",
  white: "White",
};

const turnoutStateOptions = [
  { value: "true", label: "Closed" },
  { value: "false", label: "Thrown" },
];

const sensorStateOptions = [
  { value: "true", label: "Occupied / active" },
  { value: "false", label: "Free / inactive" },
];

function createTurnoutCondition(turnoutAddress: number): SignalLogicConditionDto {
  return {
    id: generateId(),
    type: "turnout",
    turnoutAddress,
    closed: true,
  };
}

function createSensorCondition(sensorAddress: number): SignalLogicConditionDto {
  return {
    id: generateId(),
    type: "sensor",
    sensorAddress,
    active: true,
  };
}

function createRule(signalAddress: number): SignalLogicRuleGroupDto {
  return {
    id: generateId(),
    signalAddress,
    defaultAspect: "red",
    rules: [
      {
        id: generateId(),
        aspect: "green",
        conditions: [createTurnoutCondition(0)],
      },
    ],
  };
}

function aspectToMethod(aspect: SignalAspect): string {
  switch (aspect) {
    case "green":
      return "setSignalGreen";
    case "yellow":
      return "setSignalYellow";
    case "white":
      return "setSignalWhite";
    default:
      return "setSignalRed";
  }
}

function getConditionAddress(condition: SignalLogicConditionDto): number {
  return condition.type === "sensor"
    ? condition.sensorAddress
    : condition.turnoutAddress;
}

function getConditionExpression(condition: SignalLogicConditionDto): string | null {
  if (condition.type === "sensor") {
    if (condition.sensorAddress <= 0) return null;
    const variableName = `s${condition.sensorAddress}Active`;
    return condition.active ? variableName : `!${variableName}`;
  }

  if (condition.turnoutAddress <= 0) return null;
  const variableName = `t${condition.turnoutAddress}Closed`;
  return condition.closed ? variableName : `!${variableName}`;
}

function buildGeneratedScript(groups: SignalLogicRuleGroupDto[]): string {
  const lines: string[] = ["while (true) {", ""];

  const turnoutAddresses = Array.from(
    new Set(
      groups
        .flatMap(group => group.rules)
        .flatMap(rule => rule.conditions)
        .filter(condition => condition.type === "turnout")
        .map(condition => condition.turnoutAddress)
        .filter(address => address > 0)
    )
  ).sort((a, b) => a - b);

  const sensorAddresses = Array.from(
    new Set(
      groups
        .flatMap(group => group.rules)
        .flatMap(rule => rule.conditions)
        .filter(condition => condition.type === "sensor")
        .map(condition => condition.sensorAddress)
        .filter(address => address > 0)
    )
  ).sort((a, b) => a - b);

  for (const address of turnoutAddresses) {
    lines.push(`  const t${address}Closed = getTurnoutState(${address});`);
  }

  for (const address of sensorAddresses) {
    lines.push(`  const s${address}Active = getSensorState(${address});`);
  }

  if (turnoutAddresses.length > 0 || sensorAddresses.length > 0) {
    lines.push("");
  }

  for (const group of groups) {
    lines.push(`  // Signal #${group.signalAddress}`);

    group.rules.forEach((rule, ruleIndex) => {
      const keyword = ruleIndex === 0 ? "if" : "else if";
      const expressions = rule.conditions
        .map(getConditionExpression)
        .filter((expression): expression is string => Boolean(expression));
      const expression = expressions.length === 0
        ? "true"
        : expressions.join(" && ");

      lines.push(`  ${keyword} (${expression}) {`);
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

function formatCondition(condition: SignalLogicConditionDto): string {
  if (condition.type === "sensor") {
    if (condition.sensorAddress <= 0) return "Sensor not selected";
    return `S${condition.sensorAddress} = ${condition.active ? "occupied / active" : "free / inactive"}`;
  }

  if (condition.turnoutAddress <= 0) return "Turnout not selected";
  return `T${condition.turnoutAddress} = ${condition.closed ? "closed" : "thrown"}`;
}

function getSignalAspect(signalOptions: SignalOption[], signalAddress: number): number {
  return signalOptions.find(option => Number(option.value) === signalAddress)?.aspect ?? 2;
}

function getAspectOptions(signalOptions: SignalOption[], signalAddress: number) {
  return getAllowedSignalAspects(getSignalAspect(signalOptions, signalAddress)).map(aspect => ({
    value: aspect,
    label: aspectLabels[aspect],
  }));
}

function normalizeAspectForSignal(
  signalOptions: SignalOption[],
  signalAddress: number,
  aspect: SignalAspect
): SignalAspect {
  const allowed = getAllowedSignalAspects(getSignalAspect(signalOptions, signalAddress));
  return allowed.includes(aspect) ? aspect : allowed[0] ?? "red";
}

export default function SignalLogicDialog({
  opened,
  onClose,
  layout,
}: SignalLogicDialogProps) {
  const signalOptions = useMemo<SignalOption[]>(() => {
    return layout
      .getAllElements()
      .filter((element): element is TrackSignalElementView =>
        element instanceof TrackSignalElementView
      )
      .map(signal => ({
        value: signal.address.toString(),
        label: `Signal #${signal.address} (${signal.aspect} aspect)`,
        aspect: signal.aspect,
      }))
      .sort((a, b) => Number(a.value) - Number(b.value));
  }, [layout]);

  const turnoutOptions = useMemo<AddressOption[]>(() => {
    return layout
      .getAllElements()
      .filter(isTurnoutElement)
      .map(turnout => ({
        value: turnout.turnoutAddress.toString(),
        label: `Turnout #${turnout.turnoutAddress}`,
      }))
      .sort((a, b) => Number(a.value) - Number(b.value));
  }, [layout]);

  const sensorOptions = useMemo<AddressOption[]>(() => {
    return layout
      .getAllElements()
      .filter((element): element is TrackSensorElementView =>
        element instanceof TrackSensorElementView
      )
      .map(sensor => ({
        value: sensor.address.toString(),
        label: `Sensor #${sensor.address}`,
      }))
      .sort((a, b) => Number(a.value) - Number(b.value));
  }, [layout]);

  const knownSignals = useMemo(
    () => signalOptions.map(signal => ({
      address: Number(signal.value),
      aspect: signal.aspect,
    })),
    [signalOptions]
  );

  const knownTurnouts = useMemo(
    () => turnoutOptions.map(turnout => ({
      address: Number(turnout.value),
    })),
    [turnoutOptions]
  );

  const knownSensors = useMemo(
    () => sensorOptions.map(sensor => ({
      address: Number(sensor.value),
    })),
    [sensorOptions]
  );

  const [groups, setGroups] = useState<SignalLogicRuleGroupDto[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [warningText, setWarningText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [serverIssues, setServerIssues] = useState<SignalLogicValidationIssue[]>([]);

  const selectedGroup =
    groups.find(group => group.id === selectedGroupId) ?? groups[0] ?? null;

  const document = useMemo(
    () => ({
      version: 1 as const,
      groups,
    }),
    [groups]
  );

  const validationIssues = useMemo(
    () => validateSignalLogicDocument(document, knownSignals, knownTurnouts, knownSensors),
    [document, knownSignals, knownTurnouts, knownSensors]
  );

  const issueList = validationIssues.length > 0
    ? validationIssues
    : serverIssues;

  const hasValidationErrors = validationIssues.some(issue => issue.level === "error");

  const generatedScript = useMemo(() => buildGeneratedScript(groups), [groups]);

  const loadRules = async (): Promise<void> => {
    setLoading(true);
    setErrorText(null);
    setStatusText(null);
    setWarningText(null);

    try {
      const result = await loadSignalLogicRulesWs();
      setGroups(result.document.groups);
      setSelectedGroupId(result.document.groups[0]?.id ?? null);
      setServerIssues(result.issues);

      if (result.created) {
        setWarningText(
          result.message ??
          "No signal-rules.json file existed yet. The system created an empty file and will save your rules there."
        );
      } else {
        setStatusText("Signal logic rules loaded.");
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!opened) return;
    void loadRules();
  }, [opened]);

  const saveRules = async (): Promise<void> => {
    setSaving(true);
    setErrorText(null);
    setStatusText(null);
    setWarningText(null);

    try {
      const result = await saveSignalLogicRulesWs(document);
      setGroups(result.document.groups);
      setSelectedGroupId(previous => previous ?? result.document.groups[0]?.id ?? null);
      setServerIssues(result.issues);
      setStatusText("Signal logic rules saved.");
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
    setStatusText(null);
    setWarningText(null);
    setErrorText(null);
    setGroups(previous =>
      previous.map(group => (group.id === groupId ? update(group) : group))
    );
  };

  const addSignalRuleGroup = (): void => {
    const usedAddresses = new Set(groups.map(group => group.signalAddress));
    const nextSignal = signalOptions.find(
      option => !usedAddresses.has(Number(option.value))
    );
    const signalAddress = Number(nextSignal?.value ?? signalOptions[0]?.value ?? 0);

    if (signalAddress <= 0) {
      return;
    }

    const group = createRule(signalAddress);
    group.defaultAspect = normalizeAspectForSignal(signalOptions, signalAddress, group.defaultAspect);
    group.rules = group.rules.map(rule => ({
      ...rule,
      aspect: normalizeAspectForSignal(signalOptions, signalAddress, rule.aspect),
    }));

    setStatusText(null);
    setWarningText(null);
    setErrorText(null);
    setGroups(previous => [...previous, group]);
    setSelectedGroupId(group.id);
  };

  const deleteSignalRuleGroup = (groupId: string): void => {
    setStatusText(null);
    setWarningText(null);
    setErrorText(null);
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
        {
          id: generateId(),
          aspect: normalizeAspectForSignal(signalOptions, group.signalAddress, "yellow"),
          conditions: [],
        },
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
      rules: group.rules.map(rule =>
        rule.id === ruleId
          ? {
              ...rule,
              conditions: [
                ...rule.conditions,
                createTurnoutCondition(Number(turnoutOptions[0]?.value ?? 0)),
              ],
            }
          : rule
      ),
    }));
  };

  const addSensorCondition = (groupId: string, ruleId: string): void => {
    updateGroup(groupId, group => ({
      ...group,
      rules: group.rules.map(rule =>
        rule.id === ruleId
          ? {
              ...rule,
              conditions: [
                ...rule.conditions,
                createSensorCondition(Number(sensorOptions[0]?.value ?? 0)),
              ],
            }
          : rule
      ),
    }));
  };

  const deleteCondition = (
    groupId: string,
    ruleId: string,
    conditionId: string
  ): void => {
    updateGroup(groupId, group => ({
      ...group,
      rules: group.rules.map(rule =>
        rule.id === ruleId
          ? {
              ...rule,
              conditions: rule.conditions.filter(
                condition => condition.id !== conditionId
              ),
            }
          : rule
      ),
    }));
  };

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Signal Logic Editor"
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
            <Text size="sm" c="dimmed">Loading signal logic rules...</Text>
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
          <Alert color="green" py="xs">
            {statusText}
          </Alert>
        )}

        {issueList.length > 0 && (
          <Alert
            color={hasValidationErrors ? "red" : "yellow"}
            icon={<IconAlertTriangle size={16} />}
            py="xs"
          >
            <Stack gap={4}>
              {issueList.slice(0, 4).map((issue, index) => (
                <Text key={`${issue.message}-${index}`} size="sm">
                  {issue.level.toUpperCase()}: {issue.message}
                </Text>
              ))}
              {issueList.length > 4 && (
                <Text size="sm" c="dimmed">
                  +{issueList.length - 4} more validation messages
                </Text>
              )}
            </Stack>
          </Alert>
        )}

        <Tabs
          defaultValue="rules"
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Tabs.List style={{ flex: "0 0 auto" }}>
            <Tabs.Tab value="rules">Rules</Tabs.Tab>
            <Tabs.Tab value="preview">Live preview</Tabs.Tab>
            <Tabs.Tab value="script">Generated script</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="rules" style={{ flex: 1, minHeight: 0 }}>
            <ScrollArea h="100%" pt="md" type="auto" offsetScrollbars>
              <Group align="stretch" wrap="nowrap" h="100%">
                <Card withBorder w={260} p="sm" style={{ flex: "0 0 260px" }}>
                  <Group justify="space-between" mb="sm">
                    <Title order={5}>Signals</Title>
                    <Button
                      size="xs"
                      leftSection={<IconPlus size={14} />}
                      onClick={addSignalRuleGroup}
                    >
                      Add
                    </Button>
                  </Group>

                  <ScrollArea h={540} type="auto" offsetScrollbars>
                    <Stack gap="xs">
                      {groups.length === 0 && (
                        <Text size="sm" c="dimmed">
                          No signal rule yet. Add a signal rule to start.
                        </Text>
                      )}

                      {groups.map(group => (
                        <Button
                          key={group.id}
                          variant={group.id === selectedGroup?.id ? "filled" : "light"}
                          justify="space-between"
                          onClick={() => setSelectedGroupId(group.id)}
                        >
                          <span>Signal #{group.signalAddress}</span>
                          <Badge size="xs" variant="light">
                            {group.rules.length}
                          </Badge>
                        </Button>
                      ))}
                    </Stack>
                  </ScrollArea>
                </Card>

                <Box flex={1} style={{ minWidth: 0 }}>
                  {!selectedGroup ? (
                    <Card withBorder p="lg">
                      <Text c="dimmed">Select or add a signal rule group.</Text>
                    </Card>
                  ) : (
                    <Stack gap="md" pb="md">
                      <Card withBorder>
                        <Group justify="space-between" align="flex-end">
                          <Group align="flex-end">
                            <Select
                              label="Signal"
                              data={signalOptions}
                              value={selectedGroup.signalAddress.toString()}
                              onChange={value => {
                                const signalAddress = Number(value ?? 0);
                                updateGroup(selectedGroup.id, group => ({
                                  ...group,
                                  signalAddress,
                                  defaultAspect: normalizeAspectForSignal(
                                    signalOptions,
                                    signalAddress,
                                    group.defaultAspect
                                  ),
                                  rules: group.rules.map(rule => ({
                                    ...rule,
                                    aspect: normalizeAspectForSignal(
                                      signalOptions,
                                      signalAddress,
                                      rule.aspect
                                    ),
                                  })),
                                }));
                              }}
                              w={260}
                            />

                            <Select
                              label="Default aspect"
                              data={getAspectOptions(signalOptions, selectedGroup.signalAddress)}
                              value={selectedGroup.defaultAspect}
                              onChange={value => {
                                updateGroup(selectedGroup.id, group => ({
                                  ...group,
                                  defaultAspect: (value ?? "red") as SignalAspect,
                                }));
                              }}
                              w={180}
                            />
                          </Group>

                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => deleteSignalRuleGroup(selectedGroup.id)}
                            aria-label="Delete signal rule group"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Card>

                      {selectedGroup.rules.map((rule, ruleIndex) => (
                        <Card key={rule.id} withBorder>
                          <Group justify="space-between" mb="sm">
                            <Group>
                              <Badge>Rule {ruleIndex + 1}</Badge>
                              <Text fw={600}>IF conditions match THEN</Text>
                              <Select
                                data={getAspectOptions(signalOptions, selectedGroup.signalAddress)}
                                value={rule.aspect}
                                onChange={value => {
                                  updateGroup(selectedGroup.id, group => ({
                                    ...group,
                                    rules: group.rules.map(currentRule =>
                                      currentRule.id === rule.id
                                        ? {
                                            ...currentRule,
                                            aspect: (value ?? "red") as SignalAspect,
                                          }
                                        : currentRule
                                    ),
                                  }));
                                }}
                                w={160}
                              />
                            </Group>

                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => deleteRule(selectedGroup.id, rule.id)}
                              aria-label="Delete rule"
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>

                          <Stack gap="xs">
                            {rule.conditions.map((condition, conditionIndex) => (
                              <Group key={condition.id} align="flex-end">
                                <Text w={36} size="sm" c="dimmed">
                                  {conditionIndex === 0 ? "IF" : "AND"}
                                </Text>

                                {condition.type === "sensor" ? (
                                  <>
                                    <Select
                                      label={conditionIndex === 0 ? "Sensor" : undefined}
                                      data={sensorOptions}
                                      value={
                                        condition.sensorAddress > 0
                                          ? condition.sensorAddress.toString()
                                          : null
                                      }
                                      placeholder="Select sensor"
                                      onChange={value => {
                                        updateGroup(selectedGroup.id, group => ({
                                          ...group,
                                          rules: group.rules.map(currentRule =>
                                            currentRule.id === rule.id
                                              ? {
                                                  ...currentRule,
                                                  conditions: currentRule.conditions.map(currentCondition =>
                                                    currentCondition.id === condition.id
                                                      ? {
                                                          ...condition,
                                                          sensorAddress: Number(value ?? 0),
                                                        }
                                                      : currentCondition
                                                  ),
                                                }
                                              : currentRule
                                          ),
                                        }));
                                      }}
                                      w={220}
                                    />

                                    <Select
                                      label={conditionIndex === 0 ? "State" : undefined}
                                      data={sensorStateOptions}
                                      value={condition.active.toString()}
                                      onChange={value => {
                                        updateGroup(selectedGroup.id, group => ({
                                          ...group,
                                          rules: group.rules.map(currentRule =>
                                            currentRule.id === rule.id
                                              ? {
                                                  ...currentRule,
                                                  conditions: currentRule.conditions.map(currentCondition =>
                                                    currentCondition.id === condition.id
                                                      ? {
                                                          ...condition,
                                                          active: value === "true",
                                                        }
                                                      : currentCondition
                                                  ),
                                                }
                                              : currentRule
                                          ),
                                        }));
                                      }}
                                      w={180}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <Select
                                      label={conditionIndex === 0 ? "Turnout" : undefined}
                                      data={turnoutOptions}
                                      value={
                                        condition.turnoutAddress > 0
                                          ? condition.turnoutAddress.toString()
                                          : null
                                      }
                                      placeholder="Select turnout"
                                      onChange={value => {
                                        updateGroup(selectedGroup.id, group => ({
                                          ...group,
                                          rules: group.rules.map(currentRule =>
                                            currentRule.id === rule.id
                                              ? {
                                                  ...currentRule,
                                                  conditions: currentRule.conditions.map(currentCondition =>
                                                    currentCondition.id === condition.id
                                                      ? {
                                                          ...condition,
                                                          turnoutAddress: Number(value ?? 0),
                                                        }
                                                      : currentCondition
                                                  ),
                                                }
                                              : currentRule
                                          ),
                                        }));
                                      }}
                                      w={220}
                                    />

                                    <Select
                                      label={conditionIndex === 0 ? "State" : undefined}
                                      data={turnoutStateOptions}
                                      value={condition.closed.toString()}
                                      onChange={value => {
                                        updateGroup(selectedGroup.id, group => ({
                                          ...group,
                                          rules: group.rules.map(currentRule =>
                                            currentRule.id === rule.id
                                              ? {
                                                  ...currentRule,
                                                  conditions: currentRule.conditions.map(currentCondition =>
                                                    currentCondition.id === condition.id
                                                      ? {
                                                          ...condition,
                                                          closed: value === "true",
                                                        }
                                                      : currentCondition
                                                  ),
                                                }
                                              : currentRule
                                          ),
                                        }));
                                      }}
                                      w={160}
                                    />
                                  </>
                                )}

                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  onClick={() =>
                                    deleteCondition(selectedGroup.id, rule.id, condition.id)
                                  }
                                  aria-label="Delete condition"
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            ))}

                            <Group gap="xs">
                              <Button
                                size="xs"
                                variant="light"
                                leftSection={<IconPlus size={14} />}
                                onClick={() => addTurnoutCondition(selectedGroup.id, rule.id)}
                              >
                                Add turnout condition
                              </Button>

                              <Button
                                size="xs"
                                variant="light"
                                leftSection={<IconPlus size={14} />}
                                onClick={() => addSensorCondition(selectedGroup.id, rule.id)}
                              >
                                Add occupancy condition
                              </Button>
                            </Group>
                          </Stack>
                        </Card>
                      ))}

                      <Button
                        variant="light"
                        leftSection={<IconPlus size={14} />}
                        onClick={() => addRule(selectedGroup.id)}
                      >
                        Add rule
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
                      <Title order={5}>Signal #{group.signalAddress}</Title>
                      <Badge color="red" variant="light">
                        Default: {group.defaultAspect}
                      </Badge>
                    </Group>

                    <Stack gap="xs">
                      {group.rules.map((rule, index) => (
                        <Group key={rule.id} align="center">
                          <Badge>Rule {index + 1}</Badge>
                          <Text size="sm">
                            {rule.conditions.map(formatCondition).join(" AND ") || "Always"}
                          </Text>
                          <Text size="sm" fw={700}>
                            → {rule.aspect.toUpperCase()}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="script" style={{ flex: 1, minHeight: 0 }}>
            <Stack h="100%" pt="md">
              <Text size="sm" c="dimmed">
                This is generated from the visual rules. It is independent from the script engine and is only a preview for now.
              </Text>

              <Textarea
                value={generatedScript}
                readOnly
                style={{ flex: 1, minHeight: 0 }}
                styles={{
                  wrapper: {
                    height: "100%",
                  },
                  input: {
                    height: "100%",
                    fontFamily: "monospace",
                    resize: "none",
                  },
                }}
              />

              <Divider />

              <Group justify="space-between" pb="xs">
                <Text size="sm" c="dimmed">
                  Found {signalOptions.length} signals, {turnoutOptions.length} turnouts and {sensorOptions.length} occupancy sensors in the current layout.
                </Text>
                <NumberInput
                  label="Polling interval preview"
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
          <Text size="sm" c="dimmed">
            Saved to server/data/signal-rules.json
          </Text>

          <Group>
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={() => void loadRules()}
              loading={loading}
            >
              Reload
            </Button>

            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={() => void saveRules()}
              loading={saving}
              disabled={hasValidationErrors}
            >
              Save
            </Button>
          </Group>
        </Group>
      </Stack>
    </AppModal>
  );
}
