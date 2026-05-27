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
  LevelCrossingAction,
  LevelCrossingAccessoryAction,
} from "../../../../common/src/levelCrossingLogic";
import { generateId } from "../../helpers";

type LevelCrossingActionsEditorLabels = {
  title: string;
  description: string;
  empty: string;
  addAccessory: string;
  actionType: string;
  accessoryAction: string;
  accessoryAddress: string;
  activeWhenClosed: string;
  active: string;
  inactive: string;
  delete: string;
};

type LevelCrossingActionsEditorProps = {
  actions: LevelCrossingAction[];
  onChange: (actions: LevelCrossingAction[]) => void;
  labels: LevelCrossingActionsEditorLabels;
};

function createAccessoryAction(): LevelCrossingAccessoryAction {
  return {
    id: generateId(),
    type: "setAccessory",
    address: 0,
    activeWhenClosed: true,
  };
}

export default function LevelCrossingActionsEditor({
  actions,
  onChange,
  labels,
}: LevelCrossingActionsEditorProps) {
  const updateAction = (
    id: string,
    updater: (action: LevelCrossingAction) => LevelCrossingAction
  ): void => {
    onChange(actions.map(action =>
      action.id === id ? updater(action) : action
    ));
  };

  const deleteAction = (id: string): void => {
    onChange(actions.filter(action => action.id !== id));
  };

  return (
    <Card withBorder p="sm">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Text size="sm" fw={600}>{labels.title}</Text>
            <Text size="xs" c="dimmed">{labels.description}</Text>
          </Stack>

          <Button
            size="compact-xs"
            variant="light"
            leftSection={<IconPlus size={12} />}
            onClick={() => onChange([...actions, createAccessoryAction()])}
          >
            {labels.addAccessory}
          </Button>
        </Group>

        {actions.length === 0 && (
          <Text size="sm" c="dimmed">{labels.empty}</Text>
        )}

        {actions.map(action => (
          <Card key={action.id} withBorder p="xs">
            <Group align="flex-end" grow>
              <Select
                label={labels.actionType}
                value={action.type}
                data={[{ value: "setAccessory", label: labels.accessoryAction }]}
                disabled
              />

              {action.type === "setAccessory" && (
                <>
                  <NumberInput
                    label={labels.accessoryAddress}
                    value={action.address}
                    min={0}
                    step={1}
                    onChange={value => updateAction(action.id, current => ({
                      ...(current as LevelCrossingAccessoryAction),
                      address: Number(value ?? 0),
                    }))}
                  />

                  <Select
                    label={labels.activeWhenClosed}
                    value={action.activeWhenClosed ? "true" : "false"}
                    data={[
                      { value: "true", label: labels.active },
                      { value: "false", label: labels.inactive },
                    ]}
                    onChange={value => updateAction(action.id, current => ({
                      ...(current as LevelCrossingAccessoryAction),
                      activeWhenClosed: value !== "false",
                    }))}
                  />
                </>
              )}

              <ActionIcon
                color="red"
                variant="light"
                aria-label={labels.delete}
                onClick={() => deleteAction(action.id)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Card>
        ))}
      </Stack>
    </Card>
  );
}
