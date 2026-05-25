import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Tabs,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import type { LayoutView } from "../../models/editor/core/LayoutView";
import { isTurnoutElement } from "../../models/editor/core/LayoutView";
import { TrackSignalElementView } from "../../models/editor/elements/TrackSignalElementView";
import { generateId } from "../../helpers";

type SignalAspect = "red" | "yellow" | "green" | "white";

type TurnoutCondition = {
  id: string;
  turnoutAddress: number;
  closed: boolean;
};

type SignalRule = {
  id: string;
  conditions: TurnoutCondition[];
  aspect: SignalAspect;
};

type SignalRuleGroup = {
  id: string;
  signalAddress: number;
  defaultAspect: SignalAspect;
  rules: SignalRule[];
};

type SignalLogicDialogProps = {
  opened: boolean;
  onClose: () => void;
  layout: LayoutView;
};

type TurnoutOption = {
  value: string;
  label: string;
};

type SignalOption = {
  value: string;
  label: string;
};

const aspectOptions: { value: SignalAspect; label: string }[] = [
  { value: "red", label: "Red" },
  { value: "yellow", label: "Yellow" },
  { value: "green", label: "Green" },
  { value: "white", label: "White" },
];

const booleanOptions = [
  { value: "true", label: "Closed" },
  { value: "false", label: "Thrown" },
];

function createRule(signalAddress: number): SignalRuleGroup {
  return {
    id: generateId(),
    signalAddress,
    defaultAspect: "red",
    rules: [
      {
        id: generateId(),
        aspect: "green",
        conditions: [
          {
            id: generateId(),
            turnoutAddress: 0,
            closed: true,
          },
        ],
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

function buildGeneratedScript(groups: SignalRuleGroup[]): string {
  const lines: string[] = ["while (true) {", ""];

  const turnoutAddresses = Array.from(
    new Set(
      groups
        .flatMap(group =>
          group.rules.flatMap(rule =>
            rule.conditions.map(condition => condition.turnoutAddress)
          )
        )
        .filter(address => address > 0)
    )
  ).sort((a, b) => a - b);

  for (const address of turnoutAddresses) {
    lines.push(`  const t${address}Closed = getTurnoutState(${address});`);
  }

  if (turnoutAddresses.length > 0) {
    lines.push("");
  }

  for (const group of groups) {
    lines.push(`  // Signal #${group.signalAddress}`);

    group.rules.forEach((rule, ruleIndex) => {
      const keyword = ruleIndex === 0 ? "if" : "else if";
      const expression =
        rule.conditions.length === 0
          ? "true"
          : rule.conditions
              .map(condition => {
                const variableName = `t${condition.turnoutAddress}Closed`;
                return condition.closed ? variableName : `!${variableName}`;
              })
              .join(" && ");

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

function formatCondition(condition: TurnoutCondition): string {
  if (condition.turnoutAddress <= 0) {
    return "Turnout not selected";
  }

  return `T${condition.turnoutAddress} = ${condition.closed ? "closed" : "thrown"}`;
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
        label: `Signal #${signal.address}`,
      }))
      .sort((a, b) => Number(a.value) - Number(b.value));
  }, [layout]);

  const turnoutOptions = useMemo<TurnoutOption[]>(() => {
    return layout
      .getAllElements()
      .filter(isTurnoutElement)
      .map(turnout => ({
        value: turnout.turnoutAddress.toString(),
        label: `Turnout #${turnout.turnoutAddress}`,
      }))
      .sort((a, b) => Number(a.value) - Number(b.value));
  }, [layout]);

  const [groups, setGroups] = useState<SignalRuleGroup[]>(() => {
    const firstSignalAddress = Number(signalOptions[0]?.value ?? 0);

    return firstSignalAddress > 0 ? [createRule(firstSignalAddress)] : [];
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    groups[0]?.id ?? null
  );

  const selectedGroup =
    groups.find(group => group.id === selectedGroupId) ?? groups[0] ?? null;

  const generatedScript = useMemo(() => buildGeneratedScript(groups), [groups]);

  const updateGroup = (
    groupId: string,
    update: (group: SignalRuleGroup) => SignalRuleGroup
  ): void => {
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

    setGroups(previous => [...previous, group]);
    setSelectedGroupId(group.id);
  };

  const deleteSignalRuleGroup = (groupId: string): void => {
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
          aspect: "yellow",
          conditions: [
            {
              id: generateId(),
              turnoutAddress: Number(turnoutOptions[0]?.value ?? 0),
              closed: true,
            },
          ],
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

  const addCondition = (groupId: string, ruleId: string): void => {
    updateGroup(groupId, group => ({
      ...group,
      rules: group.rules.map(rule =>
        rule.id === ruleId
          ? {
              ...rule,
              conditions: [
                ...rule.conditions,
                {
                  id: generateId(),
                  turnoutAddress: Number(turnoutOptions[0]?.value ?? 0),
                  closed: true,
                },
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
    <Modal
      opened={opened}
      onClose={onClose}
      title="Signal Logic Editor"
      size={1200}
      centered
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

                <ScrollArea h={620} type="auto" offsetScrollbars>
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
                              }));
                            }}
                            w={220}
                          />

                          <Select
                            label="Default aspect"
                            data={aspectOptions}
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
                              data={aspectOptions}
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
                                            conditions: currentRule.conditions.map(
                                              currentCondition =>
                                                currentCondition.id === condition.id
                                                  ? {
                                                      ...currentCondition,
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
                                data={booleanOptions}
                                value={condition.closed.toString()}
                                onChange={value => {
                                  updateGroup(selectedGroup.id, group => ({
                                    ...group,
                                    rules: group.rules.map(currentRule =>
                                      currentRule.id === rule.id
                                        ? {
                                            ...currentRule,
                                            conditions: currentRule.conditions.map(
                                              currentCondition =>
                                                currentCondition.id === condition.id
                                                  ? {
                                                      ...currentCondition,
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

                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconPlus size={14} />}
                            onClick={() => addCondition(selectedGroup.id, rule.id)}
                            w={180}
                          >
                            Add condition
                          </Button>
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
              This is the JavaScript-style output generated from the visual rules. It is only a preview for now.
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
                Found {signalOptions.length} signals and {turnoutOptions.length} turnouts in the current layout.
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
    </Modal>
  );
}
