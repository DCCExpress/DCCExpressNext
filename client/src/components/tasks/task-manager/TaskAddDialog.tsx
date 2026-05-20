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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("task.add.title")}
      centered
      size="lg"
      zIndex={10000}
    >
      <Stack gap="md">
        {formError && (
          <Alert
            color="red"
            title={t("task.add.notAddable")}
          >
            {formError}
          </Alert>
        )}

        <TextInput
          label={t("task.form.name")}
          placeholder={t("task.form.namePlaceholder")}
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
            label={t("task.form.fromBlock")}
            placeholder={t("task.form.fromPlaceholder")}
            data={fromBlockSelectData}
            value={fromBlockId}
            onChange={onFromBlockChange}
            comboboxProps={{ zIndex: 10001 }}
            clearable
            disabled={!hasGraph}
          />

          <Select
            label={t("task.form.toBlock")}
            placeholder={t("task.form.toPlaceholder")}
            data={toBlockSelectData}
            value={toBlockId}
            comboboxProps={{ zIndex: 10001 }}
            onChange={onToBlockChange}
            clearable
            disabled={!hasGraph || !fromBlockId}
          />

          <NumberInput
            label={t("task.form.targetSpeed")}
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
              {t("task.add.selectedRoute")}
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
            {t("common.cancel")}
          </Button>

          <Button
            leftSection={<IconPlus size={18} />}
            onClick={onAddTask}
            disabled={!hasGraph}
          >
            {t("task.add.submit")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
