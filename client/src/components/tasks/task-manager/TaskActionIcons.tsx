// client/src/components/tasks/task-manager/TaskActionIcons.tsx

import {
  ActionIcon,
  Group,
  Tooltip,
} from "@mantine/core";

import {
  IconCheck,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconTrash,
} from "@tabler/icons-react";

import type {
  TrainTask,
} from "../../../services/tasks/TaskTypes";

import {
  taskManager,
} from "../../../services/tasks/taskManagerSingleton";
import { useTranslation } from "react-i18next";

type TaskActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type RunTaskAction = (
  action: () => Promise<TaskActionResult>
) => Promise<void>;

type TaskActionIconsProps = {
  task: TrainTask;
  onRunTaskAction: RunTaskAction;
  onEditTask: (task: TrainTask) => void;
  onDeleteTask: (task: TrainTask) => void;
};

export default function TaskActionIcons({
  task,
  onRunTaskAction,
  onEditTask,
  onDeleteTask,
}: TaskActionIconsProps) {
  const { t } = useTranslation();
  const renderEditButton = () => {
    const disabled =
      task.status === "running" ||
      task.status === "paused" ||
      task.status === "finishing";

    return (
      <Tooltip
        label={
          disabled
            ? t("task.actions.editDisabled")
            : t("task.actions.edit")
        }
      >
        <ActionIcon
          color="blue"
          variant="light"
          disabled={disabled}
          onClick={() => onEditTask(task)}
        >
          <IconPencil size={18} />
        </ActionIcon>
      </Tooltip>
    );
  };

  const renderDeleteButton = () => {
    return (
      <Tooltip label={t("task.actions.delete")}>
        <ActionIcon
          color="red"
          variant="light"
          onClick={() => onDeleteTask(task)}
        >
          <IconTrash size={18} />
        </ActionIcon>
      </Tooltip>
    );
  };

  switch (task.status) {
    case "queued":
      return (
        <Group
          gap="xs"
          wrap="nowrap"
        >
          <Tooltip label={t("task.actions.start")}>
            <ActionIcon
              color="green"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.startTask(task.id)
                )
              }
            >
              <IconPlayerPlay size={18} />
            </ActionIcon>
          </Tooltip>

          {renderEditButton()}
          {renderDeleteButton()}
        </Group>
      );

    case "running":
      return (
        <Group
          gap="xs"
          wrap="nowrap"
        >
          <Tooltip label={t("task.actions.pause")}>
            <ActionIcon
              color="yellow"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.pauseTask(task.id)
                )
              }
            >
              <IconPlayerPause size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={t("task.actions.finish")}>
            <ActionIcon
              color="orange"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.finishTask(task.id)
                )
              }
            >
              <IconCheck size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={t("task.actions.abort")}>
            <ActionIcon
              color="red"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.abortTask(task.id)
                )
              }
            >
              <IconPlayerStop size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      );

    case "paused":
      return (
        <Group
          gap="xs"
          wrap="nowrap"
        >
          <Tooltip label={t("task.actions.resume")}>
            <ActionIcon
              color="green"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.resumeTask(task.id)
                )
              }
            >
              <IconPlayerPlay size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={t("task.actions.finish")}>
            <ActionIcon
              color="orange"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.finishTask(task.id)
                )
              }
            >
              <IconCheck size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={t("task.actions.abort")}>
            <ActionIcon
              color="red"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.abortTask(task.id)
                )
              }
            >
              <IconPlayerStop size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      );

    case "finishing":
      return (
        <Group
          gap="xs"
          wrap="nowrap"
        >
          <Tooltip label={t("task.actions.abort")}>
            <ActionIcon
              color="red"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.abortTask(task.id)
                )
              }
            >
              <IconPlayerStop size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      );

    case "aborted":
    case "completed":
      return (
        <Group
          gap="xs"
          wrap="nowrap"
        >
          <Tooltip label={t("task.actions.startAgain")}>
            <ActionIcon
              color="green"
              variant="light"
              onClick={() =>
                void onRunTaskAction(() =>
                  taskManager.startTask(task.id)
                )
              }
            >
              <IconPlayerPlay size={18} />
            </ActionIcon>
          </Tooltip>

          {renderEditButton()}
          {renderDeleteButton()}
        </Group>
      );

    case "error":
      return renderDeleteButton();
  }
}
