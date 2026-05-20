// client/src/components/tasks/task-manager/TaskEditDialog.tsx

import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { useTranslation } from "react-i18next";

type SelectOption = {
  value: string;
  label: string;
};

type TaskEditDialogProps = {
  opened: boolean;
  onClose: () => void;
  editError: string | null;
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
  onSave: () => void;
};

export default function TaskEditDialog({
  opened,
  onClose,
  editError,
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
  onSave,
}: TaskEditDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("task.edit.title")}
      centered
      size="lg"
      zIndex={10001}
    >
      <Stack gap="md">
        {editError && (
          <Alert
            color="red"
            title={t("task.edit.notEditable")}
          >
            {editError}
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
            comboboxProps={{ zIndex: 10001 }}
            onChange={onFromBlockChange}
            clearable
          />

          <Select
            label={t("task.form.toBlock")}
            placeholder={t("task.form.toPlaceholder")}
            data={toBlockSelectData}
            value={toBlockId}
            comboboxProps={{ zIndex: 10001 }}
            onChange={onToBlockChange}
            clearable
            disabled={!fromBlockId}
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

        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={onClose}
          >
            {t("common.cancel")}
          </Button>

          <Button
            color="blue"
            onClick={onSave}
          >
            {t("common.save")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
