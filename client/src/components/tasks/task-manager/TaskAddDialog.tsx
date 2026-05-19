// client/src/components/tasks/task-manager/TaskAddDialog.tsx

import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

import {
  IconPlus,
} from "@tabler/icons-react";

import type {
  RunnableBlockRoute,
} from "../../../../../common/src/railway/graph";

import {
  BlockRoutePath,
  TurnoutRequirementBadges,
} from "./TaskRouteBadges";

type SelectOption = {
  value: string;
  label: string;
};

type TaskAddDialogProps = {
  opened: boolean;
  onClose: () => void;
  formError: string | null;
  taskName: string;
  onTaskNameChange: (value: string) => void;
  targetSpeed: number | string;
  onTargetSpeedChange: (value: number | string) => void;
  fromBlockSelectData: SelectOption[];
  toBlockSelectData: SelectOption[];
  fromBlockId: string | null;
  toBlockId: string | null;
  onFromBlockChange: (value: string | null) => void;
  onToBlockChange: (value: string | null) => void;
  hasGraph: boolean;
  selectedRoute: RunnableBlockRoute | null;
  onAddTask: () => void;
};

export default function TaskAddDialog({
  opened,
  onClose,
  formError,
  taskName,
  onTaskNameChange,
  targetSpeed,
  onTargetSpeedChange,
  fromBlockSelectData,
  toBlockSelectData,
  fromBlockId,
  toBlockId,
  onFromBlockChange,
  onToBlockChange,
  hasGraph,
  selectedRoute,
  onAddTask,
}: TaskAddDialogProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Új feladat"
      centered
      size="lg"
      zIndex={10000}
    >
      <Stack gap="md">
        {formError && (
          <Alert
            color="red"
            title="Feladat nem vehető fel"
          >
            {formError}
          </Alert>
        )}

        <TextInput
          label="Task name"
          placeholder="Pl. B1 → C1"
          value={taskName}
          onChange={event =>
            onTaskNameChange(event.currentTarget.value)
          }
        />

        <Group
          grow
          align="end"
        >
          <Select
            label="From block"
            placeholder="Induló blokk"
            data={fromBlockSelectData}
            value={fromBlockId}
            onChange={onFromBlockChange}
            comboboxProps={{ zIndex: 10001 }}
            clearable
            disabled={!hasGraph}
          />

          <Select
            label="To block"
            placeholder="Cél blokk"
            data={toBlockSelectData}
            value={toBlockId}
            comboboxProps={{ zIndex: 10001 }}
            onChange={onToBlockChange}
            clearable
            disabled={!hasGraph || !fromBlockId}
          />

          <NumberInput
            label="Target speed"
            value={targetSpeed}
            onChange={onTargetSpeedChange}
            min={0}
            max={126}
            hideControls={false}
          />
        </Group>

        {selectedRoute && (
          <Stack gap="xs">
            <Text
              size="sm"
              fw={600}
            >
              Kiválasztott végrehajtható blokkátmenet
            </Text>

            <BlockRoutePath
              solution={selectedRoute.solution}
              badgeSize="md"
            />

            <Group gap="xs">
              <Badge
                color={
                  selectedRoute.solution.locoDirection === "forward"
                    ? "green"
                    : selectedRoute.solution.locoDirection === "reverse"
                      ? "orange"
                      : "gray"
                }
                variant="light"
              >
                {selectedRoute.solution.locoDirection.toUpperCase()}
              </Badge>

              <TurnoutRequirementBadges
                turnoutStates={selectedRoute.solution.turnoutStates}
              />
            </Group>
          </Stack>
        )}

        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={onClose}
          >
            Mégse
          </Button>

          <Button
            leftSection={<IconPlus size={18} />}
            onClick={onAddTask}
            disabled={!hasGraph}
          >
            Hozzáadás
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
