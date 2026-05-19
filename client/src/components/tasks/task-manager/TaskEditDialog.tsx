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
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Feladat szerkesztése"
      centered
      size="lg"
      zIndex={10001}
    >
      <Stack gap="md">
        {editError && (
          <Alert
            color="red"
            title="Feladat nem módosítható"
          >
            {editError}
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
            comboboxProps={{ zIndex: 10001 }}
            onChange={onFromBlockChange}
            clearable
          />

          <Select
            label="To block"
            placeholder="Cél blokk"
            data={toBlockSelectData}
            value={toBlockId}
            comboboxProps={{ zIndex: 10001 }}
            onChange={onToBlockChange}
            clearable
            disabled={!fromBlockId}
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

        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={onClose}
          >
            Mégse
          </Button>

          <Button
            color="blue"
            onClick={onSave}
          >
            Mentés
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
