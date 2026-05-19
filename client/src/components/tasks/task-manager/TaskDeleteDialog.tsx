// client/src/components/tasks/task-manager/TaskDeleteDialog.tsx

import {
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Text,
} from "@mantine/core";

import type {
  TrainTask,
} from "../../../services/tasks/TaskTypes";

type TaskDeleteDialogProps = {
  task: TrainTask | null;
  onClose: () => void;
  onConfirm: () => void;
};

export default function TaskDeleteDialog({
  task,
  onClose,
  onConfirm,
}: TaskDeleteDialogProps) {
  return (
    <Modal
      opened={task !== null}
      onClose={onClose}
      title="Feladat törlése"
      centered
      size="sm"
      zIndex={10000}
    >
      <Stack gap="md">
        <Text>
          Biztosan törlöd ezt a feladatot?
        </Text>

        {task && (
          <Badge
            color="violet"
            variant="light"
            style={{ alignSelf: "flex-start" }}
          >
            {task.name}
          </Badge>
        )}

        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={onClose}
          >
            Mégse
          </Button>

          <Button
            color="red"
            onClick={onConfirm}
          >
            Törlés
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
