// client/src/components/tasks/task-manager/TaskDeleteDialog.tsx

import {
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  return (
    <Modal
      opened={task !== null}
      onClose={onClose}
      title={t("task.delete.title")}
      centered
      size="sm"
      zIndex={10000}
    >
      <Stack gap="md">
        <Text>
          {t("task.delete.confirm")}
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
            {t("common.cancel")}
          </Button>

          <Button
            color="red"
            onClick={onConfirm}
          >
            {t("task.actions.delete")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
