import {
  ActionIcon,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import type {
  LevelCrossingBlockCondition,
  LevelCrossingCondition,
  LevelCrossingRouteCondition,
  LevelCrossingSensorCondition,
} from "../../../../common/src/levelCrossingLogic";
import { generateId } from "../../helpers";

type SelectItem = {
  value: string;
  label: string;
};

type LevelCrossingConditionListEditorLabels = {
  empty: string;
  addSensor: string;
  addBlock: string;
  addRoute: string;
  type: string;
  sensor: string;
  block: string;
  route: string;
  sensorAddress: string;
  blockId: string;
  fromBlock: string;
  toBlock: string;
  anyBlock: string;
  expectedState: string;
  sensorActive: string;
  sensorInactive: string;
  blockOccupied: string;
  blockFree: string;
  routeReserved: string;
  routeNotReserved: string;
  delete: string;
};

type LevelCrossingConditionListEditorProps = {
  title: string;
  description: string;
  conditions: LevelCrossingCondition[];
  onChange: (conditions: LevelCrossingCondition[]) => void;
  blockOptions: SelectItem[];
  labels: LevelCrossingConditionListEditorLabels;
};

type ConditionType = LevelCrossingCondition["type"];

function createSensorCondition(): LevelCrossingSensorCondition {
  return {
    id: generateId(),
    type: "sensor",
    sensorAddress: 0,
    active: true,
    operator: "is",
  };
}

function createBlockCondition(blockId = ""): LevelCrossingBlockCondition {
  return {
    id: generateId(),
    type: "block",
    blockId,
    occupied: true,
    operator: "is",
  };
}

function createRouteCondition(): LevelCrossingRouteCondition {
  return {
    id: generateId(),
    type: "route",
    reserved: true,
    operator: "is",
  };
}

function changeConditionType(
  condition: LevelCrossingCondition,
  type: ConditionType,
  blockOptions: SelectItem[]
): LevelCrossingCondition {
  if (condition.type === type) {
    return condition;
  }

  if (type === "sensor") {
    return createSensorCondition();
  }

  if (type === "block") {
    return createBlockCondition(blockOptions[0]?.value ?? "");
  }

  return createRouteCondition();
}

export default function LevelCrossingConditionListEditor({
  title,
  description,
  conditions,
  onChange,
  blockOptions,
  labels,
}: LevelCrossingConditionListEditorProps) {
  const updateCondition = (
    id: string,
    updater: (condition: LevelCrossingCondition) => LevelCrossingCondition
  ): void => {
    onChange(conditions.map(condition =>
      condition.id === id ? updater(condition) : condition
    ));
  };

  const deleteCondition = (id: string): void => {
    onChange(conditions.filter(condition => condition.id !== id));
  };

  return (
    <Card withBorder p="sm">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Text size="sm" fw={600}>{title}</Text>
            <Text size="xs" c="dimmed">{description}</Text>
          </Stack>

          <Group gap="xs">
            <Button
              size="compact-xs"
              variant="light"
              leftSection={<IconPlus size={12} />}
              onClick={() => onChange([...conditions, createSensorCondition()])}
            >
              {labels.addSensor}
            </Button>
            <Button
              size="compact-xs"
              variant="light"
              leftSection={<IconPlus size={12} />}
              onClick={() => onChange([
                ...conditions,
                createBlockCondition(blockOptions[0]?.value ?? ""),
              ])}
            >
              {labels.addBlock}
            </Button>
            <Button
              size="compact-xs"
              variant="light"
              leftSection={<IconPlus size={12} />}
              onClick={() => onChange([...conditions, createRouteCondition()])}
            >
              {labels.addRoute}
            </Button>
          </Group>
        </Group>

        {conditions.length === 0 && (
          <Text size="sm" c="dimmed">{labels.empty}</Text>
        )}

        {conditions.map(condition => (
          <Card key={condition.id} withBorder p="xs">
            <Stack gap="xs">
              <Group align="flex-end" grow>
                <Select
                  label={labels.type}
                  value={condition.type}
                  data={[
                    { value: "sensor", label: labels.sensor },
                    { value: "block", label: labels.block },
                    { value: "route", label: labels.route },
                  ]}
                  onChange={value => {
                    if (!value) return;
                    updateCondition(condition.id, current =>
                      changeConditionType(current, value as ConditionType, blockOptions)
                    );
                  }}
                />

                {condition.type === "sensor" && (
                  <NumberInput
                    label={labels.sensorAddress}
                    value={condition.sensorAddress}
                    min={0}
                    step={1}
                    onChange={value => updateCondition(condition.id, current => ({
                      ...(current as LevelCrossingSensorCondition),
                      sensorAddress: Number(value ?? 0),
                    }))}
                  />
                )}

                {condition.type === "block" && (
                  <Select
                    label={labels.blockId}
                    value={condition.blockId || null}
                    data={blockOptions}
                    searchable
                    onChange={value => updateCondition(condition.id, current => ({
                      ...(current as LevelCrossingBlockCondition),
                      blockId: value ?? "",
                    }))}
                  />
                )}

                {condition.type === "route" && (
                  <Select
                    label={labels.fromBlock}
                    value={condition.fromBlockId ?? ""}
                    data={[{ value: "", label: labels.anyBlock }, ...blockOptions]}
                    searchable
                    onChange={value => updateCondition(condition.id, current => {
                      const route = current as LevelCrossingRouteCondition;
                      const fromBlockId = value || undefined;
                      return {
                        ...route,
                        ...(fromBlockId === undefined ? {} : { fromBlockId }),
                        ...(fromBlockId !== undefined ? {} : Object.fromEntries(
                          Object.entries(route).filter(([key]) => key !== "fromBlockId")
                        )),
                      } as LevelCrossingRouteCondition;
                    })}
                  />
                )}
              </Group>

              <Group align="flex-end" grow>
                {condition.type === "route" && (
                  <Select
                    label={labels.toBlock}
                    value={condition.toBlockId ?? ""}
                    data={[{ value: "", label: labels.anyBlock }, ...blockOptions]}
                    searchable
                    onChange={value => updateCondition(condition.id, current => {
                      const route = current as LevelCrossingRouteCondition;
                      const toBlockId = value || undefined;
                      return {
                        ...route,
                        ...(toBlockId === undefined ? {} : { toBlockId }),
                        ...(toBlockId !== undefined ? {} : Object.fromEntries(
                          Object.entries(route).filter(([key]) => key !== "toBlockId")
                        )),
                      } as LevelCrossingRouteCondition;
                    })}
                  />
                )}

                <Select
                  label={labels.expectedState}
                  value={condition.type === "sensor"
                    ? (condition.active ? "true" : "false")
                    : condition.type === "block"
                      ? (condition.occupied ? "true" : "false")
                      : (condition.reserved ? "true" : "false")}
                  data={condition.type === "sensor"
                    ? [
                        { value: "true", label: labels.sensorActive },
                        { value: "false", label: labels.sensorInactive },
                      ]
                    : condition.type === "block"
                      ? [
                          { value: "true", label: labels.blockOccupied },
                          { value: "false", label: labels.blockFree },
                        ]
                      : [
                          { value: "true", label: labels.routeReserved },
                          { value: "false", label: labels.routeNotReserved },
                        ]}
                  onChange={value => updateCondition(condition.id, current => {
                    const boolValue = value === "true";
                    if (current.type === "sensor") return { ...current, active: boolValue };
                    if (current.type === "block") return { ...current, occupied: boolValue };
                    return { ...current, reserved: boolValue };
                  })}
                />

                <ActionIcon
                  color="red"
                  variant="light"
                  aria-label={labels.delete}
                  onClick={() => deleteCondition(condition.id)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Card>
  );
}
