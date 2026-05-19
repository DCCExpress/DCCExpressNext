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
  const renderEditButton = () => {
    const disabled =
      task.status === "running" ||
      task.status === "paused" ||
      task.status === "finishing";

    return (
      <Tooltip
        label={
          disabled
            ? "Futó, szüneteltetett vagy befejezés alatt álló task nem módosítható"
            : "Edit"
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
      <Tooltip label="Delete">
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
          <Tooltip label="Start">
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
          <Tooltip label="Pause">
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

          <Tooltip label="Finish">
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

          <Tooltip label="Abort">
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
          <Tooltip label="Resume">
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

          <Tooltip label="Finish">
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

          <Tooltip label="Abort">
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
          <Tooltip label="Abort">
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
          <Tooltip label="Start again">
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
