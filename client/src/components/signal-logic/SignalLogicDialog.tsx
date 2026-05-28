import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  Loader,
  ScrollArea,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { LayoutView } from "../../models/editor/core/LayoutView";
import { isTurnoutElement } from "../../models/editor/core/LayoutView";
import { TrackSensorElementView } from "../../models/editor/elements/TrackSensorElementView";
import { TrackSignalElementView } from "../../models/editor/elements/TrackSignalElementView";
import { generateId } from "../../helpers";
import AppModal from "../common/AppModal";
import {
  loadSignalLogicRulesWs,
  saveSignalLogicRulesWs,
  startSignalLogicWs,
  stopSignalLogicWs,
} from "../../api/signalLogicWsApi";
import type {
  SignalAspect,
  SignalLogicConditionDto,
  SignalLogicDocumentDto,
  SignalLogicRuleDto,
  SignalLogicRuleGroupDto,
  SignalLogicRuntimeStateDto,
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

type SignalOption = AddressOption & {
  aspect: number;
};

const DEFAULT_RUNTIME_STATE: SignalLogicRuntimeStateDto = {
  running: false,
  enabled: false,
};

function uniqueByValue<T extends { value: string }>(options: T[]): T[] {
  const seen = new Set<string>();
  return options.filter(option => {
    if (seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
}

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

function createRule(aspect: SignalAspect = "green"): SignalLogicRuleDto {
  return {
    id: generateId(),
    aspect,
    conditions: [],
  };
}

function createRuleGroup(signalAddress: number): SignalLogicRuleGroupDto {
  return {
    id: generateId(),
    signalAddress,
    defaultAspect: "red",
    rules: [createRule("green")],
  };
}

function withFixedRedFallback(groups: SignalLogicRuleGroupDto[]): SignalLogicRuleGroupDto[] {
  return groups.map(group => ({
    ...group,
    defaultAspect: "red",
  }));
}

function getAspectColor(aspect: SignalAspect): string {
  switch (aspect) {
    case "green": return "green";
    case "yellow": return "yellow";
    case "white": return "gray";
    default: return "red";
  }
}

function conditionLabel(condition: SignalLogicConditionDto): string {
  if (condition.type === "sensor") {
    return `S${condition.sensorAddress} ${condition.active ? "active" : "inactive"}`;
  }

  return `T${condition.turnoutAddress} ${condition.closed ? "closed" : "thrown"}`;
}

export default function SignalLogicDialog({ opened, onClose, layout }: SignalLogicDialogProps) {
  const { t } = useTranslation();

  const [groups, setGroups] = useState<SignalLogicRuleGroupDto[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [runtimeState, setRuntimeState] = useState<SignalLogicRuntimeStateDto>(DEFAULT_RUNTIME_STATE);
  const [issues, setIssues] = useState<SignalLogicValidationIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runtimeBusy, setRuntimeBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const signalOptions = useMemo<SignalOption[]>(() => uniqueByValue(
    layout
      .getAllElements()
      .filter((element): element is TrackSignalElementView => element instanceof TrackSignalElementView)
      .map(signal => ({
        value: signal.address.toString(),
        label: `Signal #${signal.address}`,
        aspect: signal.aspect,
      }))
      .sort((a, b) => Number(a.value) - Number(b.value))
  ), [layout]);

  const turnoutOptions = useMemo<AddressOption[]>(() => uniqueByValue(
    layout
      .getAllElements()
      .filter(isTurnoutElement)
      .map(turnout => ({
        value: turnout.turnoutAddress.toString(),
        label: `Turnout #${turnout.turnoutAddress}`,
      }))
      .sort((a, b) => Number(a.value) - Number(b.value))
  ), [layout]);

  const sensorOptions = useMemo<AddressOption[]>(() => uniqueByValue(
    layout
      .getAllElements()
      .filter((element): element is TrackSensorElementView => element instanceof TrackSensorElementView)
      .map(sensor => ({
        value: sensor.address.toString(),
        label: `Sensor #${sensor.address}`,
      }))
      .sort((a, b) => Number(a.value) - Number(b.value))
  ), [layout]);

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
  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.signalAddress - b.signalAddress),
    [groups]
  );

  const document = useMemo<SignalLogicDocumentDto>(() => ({
    version: 1,
    enabled: runtimeState.enabled,
    groups: withFixedRedFallback(groups),
  }), [groups, runtimeState.enabled]);

  const validationIssues = useMemo(
    () => validateSignalLogicDocument(document, knownSignals, knownTurnouts, knownSensors),
    [document, knownSignals, knownTurnouts, knownSensors]
  );
  const issueList = validationIssues.length > 0 ? validationIssues : issues;
  const hasValidationErrors = validationIssues.some(issue => issue.level === "error");

  const clearMessages = (): void => {
    setStatusText(null);
    setErrorText(null);
  };

  const applyResponse = (result: {
    document: SignalLogicDocumentDto;
    issues: SignalLogicValidationIssue[];
    state: SignalLogicRuntimeStateDto;
  }): void => {
    const nextGroups = withFixedRedFallback(result.document.groups);
    setGroups(nextGroups);
    setSelectedGroupId(previous => previous ?? nextGroups[0]?.id ?? null);
    setIssues(result.issues);
    setRuntimeState(result.state);
  };

  const loadRules = async (): Promise<void> => {
    setLoading(true);
    clearMessages();

    try {
      const result = await loadSignalLogicRulesWs();
      applyResponse(result);
      setStatusText(result.created
        ? result.message ?? t("signalLogic.createdWarning", "Signal rules file was created.")
        : t("signalLogic.loaded", "Signal logic loaded."));
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (opened) {
      void loadRules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const saveRules = async (): Promise<void> => {
    setSaving(true);
    clearMessages();

    try {
      const result = await saveSignalLogicRulesWs(document);
      applyResponse(result);
      setStatusText(t("signalLogic.saved", "Signal logic saved."));
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const startSignalLogic = async (): Promise<void> => {
    setRuntimeBusy(true);
    clearMessages();

    try {
      const result = await startSignalLogicWs();
      applyResponse(result);
      setStatusText(t("signalLogic.started", "Signal logic started."));
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setRuntimeBusy(false);
    }
  };

  const stopSignalLogic = async (): Promise<void> => {
    setRuntimeBusy(true);
    clearMessages();

    try {
      const result = await stopSignalLogicWs();
      applyResponse(result);
      setStatusText(t("signalLogic.stopped", "Signal logic stopped."));
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setRuntimeBusy(false);
    }
  };

  const setEnabled = (enabled: boolean): void => {
    clearMessages();
    setRuntimeState(previous => ({
      ...previous,
      enabled,
    }));
  };

  const updateGroup = (
    groupId: string,
    update: (group: SignalLogicRuleGroupDto) => SignalLogicRuleGroupDto
  ): void => {
    clearMessages();
    setGroups(previous => previous.map(group =>
      group.id === groupId
        ? { ...update(group), defaultAspect: "red" }
        : group
    ));
  };

  const updateRule = (
    groupId: string,
    ruleId: string,
    update: (rule: SignalLogicRuleDto) => SignalLogicRuleDto
  ): void => {
    updateGroup(groupId, group => ({
      ...group,
      rules: group.rules.map(rule => rule.id === ruleId ? update(rule) : rule),
    }));
  };

  const addSignalRuleGroup = (): void => {
    const usedAddresses = new Set(groups.map(group => group.signalAddress));
    const nextSignal = signalOptions.find(option => !usedAddresses.has(Number(option.value)));
    const signalAddress = Number(nextSignal?.value ?? signalOptions[0]?.value ?? 0);

    if (signalAddress <= 0) {
      return;
    }

    const group = createRuleGroup(signalAddress);
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
      rules: [...group.rules, createRule("yellow")],
    }));
  };

  const deleteRule = (groupId: string, ruleId: string): void => {
    updateGroup(groupId, group => ({
      ...group,
      rules: group.rules.filter(rule => rule.id !== ruleId),
    }));
  };

  const addTurnoutCondition = (groupId: string, ruleId: string): void => {
    updateRule(groupId, ruleId, rule => ({
      ...rule,
      conditions: [
        ...rule.conditions,
        createTurnoutCondition(Number(turnoutOptions[0]?.value ?? 0)),
      ],
    }));
  };

  const addSensorCondition = (groupId: string, ruleId: string): void => {
    updateRule(groupId, ruleId, rule => ({
      ...rule,
      conditions: [
        ...rule.conditions,
        createSensorCondition(Number(sensorOptions[0]?.value ?? 0)),
      ],
    }));
  };

  const deleteCondition = (groupId: string, ruleId: string, conditionId: string): void => {
    updateRule(groupId, ruleId, rule => ({
      ...rule,
      conditions: rule.conditions.filter(condition => condition.id !== conditionId),
    }));
  };

  const updateCondition = (
    groupId: string,
    ruleId: string,
    conditionId: string,
    update: (condition: SignalLogicConditionDto) => SignalLogicConditionDto
  ): void => {
    updateRule(groupId, ruleId, rule => ({
      ...rule,
      conditions: rule.conditions.map(condition =>
        condition.id === conditionId ? update(condition) : condition
      ),
    }));
  };

  const allowedAspects = (signalAddress: number): SignalAspect[] => {
    const signal = signalOptions.find(option => Number(option.value) === signalAddress);
    return getAllowedSignalAspects(signal?.aspect ?? 2).filter(aspect => aspect !== "red");
  };

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={t("signalLogic.title", "Signal logic")}
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
        {loading && groups.length === 0 && (
          <Group gap="xs">
            <Loader size="xs" />
            <Text size="sm" c="dimmed">{t("signalLogic.loading", "Loading signal logic...")}</Text>
          </Group>
        )}

        {errorText && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} py="xs">
            {errorText}
          </Alert>
        )}

        {statusText && !errorText && (
          <Alert color="green" py="xs">
            {statusText}
          </Alert>
        )}

        {issueList.length > 0 && (
          <Alert color={hasValidationErrors ? "red" : "yellow"} icon={<IconAlertTriangle size={16} />} py="xs">
            <Stack gap={4}>
              {issueList.slice(0, 4).map((issue, index) => (
                <Text key={`${issue.message}-${index}`} size="sm">
                  {`${issue.level.toUpperCase()}: ${issue.message}`}
                </Text>
              ))}
              {issueList.length > 4 && (
                <Text size="sm" c="dimmed">+{issueList.length - 4} more</Text>
              )}
            </Stack>
          </Alert>
        )}

        <Tabs defaultValue="rules" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Tabs.List style={{ flex: "0 0 auto" }}>
            <Tabs.Tab value="rules">{t("signalLogic.tabs.rules", "Rules")}</Tabs.Tab>
            <Tabs.Tab value="preview">{t("signalLogic.tabs.preview", "Preview")}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="rules" style={{ flex: 1, minHeight: 0 }}>
            <ScrollArea h="100%" pt="md" type="auto" offsetScrollbars>
              <Group align="stretch" wrap="nowrap" h="100%">
                <Card withBorder w={260} p="sm" style={{ flex: "0 0 260px" }}>
                  <Group justify="space-between" mb="sm">
                    <Title order={5}>{t("signalLogic.signals", "Signals")}</Title>
                    <Button size="xs" leftSection={<IconPlus size={14} />} onClick={addSignalRuleGroup}>
                      {t("signalLogic.add", "Add")}
                    </Button>
                  </Group>

                  <ScrollArea h={540} type="auto" offsetScrollbars>
                    <Stack gap="xs">
                      {sortedGroups.length === 0 && (
                        <Text size="sm" c="dimmed">{t("signalLogic.emptySignals", "No signal rules.")}</Text>
                      )}
                      {sortedGroups.map(group => {
                        const selected = group.id === selectedGroup?.id;
                        return (
                          <Button
                            key={group.id}
                            variant={selected ? "filled" : "light"}
                            justify="space-between"
                            h="auto"
                            py={6}
                            onClick={() => setSelectedGroupId(group.id)}
                          >
                            <Text size="sm" fw={600}>{`Signal #${group.signalAddress}`}</Text>
                            <Badge size="xs" color="cyan" variant="light">{group.rules.length}</Badge>
                          </Button>
                        );
                      })}
                    </Stack>
                  </ScrollArea>
                </Card>

                <Stack flex={1} gap="md" pb="md" style={{ minWidth: 0 }}>
                  {!selectedGroup ? (
                    <Card withBorder p="lg">
                      <Text c="dimmed">{t("signalLogic.selectOrAdd", "Select or add a signal rule group.")}</Text>
                    </Card>
                  ) : (
                    <>
                      <Card withBorder>
                        <Group justify="space-between" align="flex-end">
                          <Group align="flex-end">
                            <Select
                              label={t("signalLogic.signal", "Signal")}
                              data={signalOptions}
                              value={selectedGroup.signalAddress.toString()}
                              onChange={value => {
                                const signalAddress = Number(value ?? 0);
                                updateGroup(selectedGroup.id, group => ({
                                  ...group,
                                  signalAddress,
                                  rules: group.rules.map(rule => ({
                                    ...rule,
                                    aspect: allowedAspects(signalAddress)[0] ?? "green",
                                  })),
                                }));
                              }}
                              w={280}
                            />
                            <Badge color="red" variant="filled" size="lg">RED fallback</Badge>
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
                              <Badge color={getAspectColor(rule.aspect)} variant="filled">
                                {`Rule ${ruleIndex + 1}`}
                              </Badge>
                              <Select
                                data={allowedAspects(selectedGroup.signalAddress).map(aspect => ({
                                  value: aspect,
                                  label: aspect.toUpperCase(),
                                }))}
                                value={rule.aspect}
                                onChange={value => updateRule(selectedGroup.id, rule.id, current => ({
                                  ...current,
                                  aspect: (value ?? "green") as SignalAspect,
                                }))}
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
                            {rule.conditions.map(condition => (
                              <Group key={condition.id} align="flex-end">
                                {condition.type === "sensor" ? (
                                  <>
                                    <Select
                                      label="Sensor"
                                      data={sensorOptions}
                                      value={condition.sensorAddress > 0 ? condition.sensorAddress.toString() : null}
                                      placeholder="Select sensor"
                                      onChange={value => updateCondition(selectedGroup.id, rule.id, condition.id, current =>
                                        current.type === "sensor"
                                          ? { ...current, sensorAddress: Number(value ?? 0) }
                                          : current
                                      )}
                                      w={220}
                                    />
                                    <Select
                                      label="State"
                                      data={[
                                        { value: "true", label: "Active" },
                                        { value: "false", label: "Inactive" },
                                      ]}
                                      value={condition.active.toString()}
                                      onChange={value => updateCondition(selectedGroup.id, rule.id, condition.id, current =>
                                        current.type === "sensor"
                                          ? { ...current, active: value === "true" }
                                          : current
                                      )}
                                      w={160}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <Select
                                      label="Turnout"
                                      data={turnoutOptions}
                                      value={condition.turnoutAddress > 0 ? condition.turnoutAddress.toString() : null}
                                      placeholder="Select turnout"
                                      onChange={value => updateCondition(selectedGroup.id, rule.id, condition.id, current =>
                                        current.type === "turnout"
                                          ? { ...current, turnoutAddress: Number(value ?? 0) }
                                          : current
                                      )}
                                      w={220}
                                    />
                                    <Select
                                      label="State"
                                      data={[
                                        { value: "true", label: "Closed" },
                                        { value: "false", label: "Thrown" },
                                      ]}
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
                                <Text size="sm" c="dimmed">{conditionLabel(condition)}</Text>
                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  onClick={() => deleteCondition(selectedGroup.id, rule.id, condition.id)}
                                  aria-label="Delete condition"
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            ))}

                            <Group gap="xs">
                              <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => addTurnoutCondition(selectedGroup.id, rule.id)}>
                                Add turnout condition
                              </Button>
                              <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => addSensorCondition(selectedGroup.id, rule.id)}>
                                Add sensor condition
                              </Button>
                            </Group>
                          </Stack>
                        </Card>
                      ))}

                      <Button variant="light" leftSection={<IconPlus size={14} />} onClick={() => addRule(selectedGroup.id)}>
                        {t("signalLogic.addRule", "Add rule")}
                      </Button>
                    </>
                  )}
                </Stack>
              </Group>
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="preview" style={{ flex: 1, minHeight: 0 }}>
            <ScrollArea h="100%" pt="md" type="auto" offsetScrollbars>
              <Table striped withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Signal</Table.Th>
                    <Table.Th>Default</Table.Th>
                    <Table.Th>Rules</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {groups.map(group => (
                    <Table.Tr key={group.id}>
                      <Table.Td>{group.signalAddress}</Table.Td>
                      <Table.Td>RED</Table.Td>
                      <Table.Td>{group.rules.length}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>

        <Divider />

        <Group justify="space-between">
          <Group gap="xs">
            <Text size="sm" c="dimmed">{t("signalLogic.savePath", "Stored on server")}</Text>
            <Badge color={runtimeState.running ? "green" : "gray"} variant="light">
              {runtimeState.running ? t("signalLogic.running", "Running") : t("signalLogic.stoppedState", "Stopped")}
            </Badge>
          </Group>

          <Group>
            <Checkbox
              checked={runtimeState.enabled}
              label={t("signalLogic.enabled", "Enabled")}
              onChange={event => setEnabled(event.currentTarget.checked)}
            />
            <Button
              color="green"
              variant="light"
              leftSection={<IconPlayerPlay size={16} />}
              onClick={() => void startSignalLogic()}
              loading={runtimeBusy && !runtimeState.running}
              disabled={runtimeState.running || runtimeBusy}
            >
              {t("signalLogic.start", "Start")}
            </Button>
            <Button
              color="red"
              variant="light"
              leftSection={<IconPlayerStop size={16} />}
              onClick={() => void stopSignalLogic()}
              loading={runtimeBusy && runtimeState.running}
              disabled={!runtimeState.running || runtimeBusy}
            >
              {t("signalLogic.stop", "Stop")}
            </Button>
            <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => void loadRules()} loading={loading}>
              {t("signalLogic.reload", "Reload")}
            </Button>
            <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void saveRules()} loading={saving} disabled={hasValidationErrors}>
              {t("signalLogic.save", "Save")}
            </Button>
          </Group>
        </Group>
      </Stack>
    </AppModal>
  );
}
