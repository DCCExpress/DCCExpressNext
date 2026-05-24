// client/src/components/tasks/task-manager/TaskManagerToolbar.tsx

import {
  ActionIcon,
  Badge,
  Group,
  Text,
  Tooltip,
} from "@mantine/core";

import {
  IconCheck,
  IconDeviceFloppy,
  IconFolderOpen,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlus,
} from "@tabler/icons-react";

import type {
  TrainTask,
} from "../../../services/tasks/TaskTypes";

type TaskManagerToolbarProps = {
  tasks: TrainTask[];
  onAddTask: () => void;
  onStartAllTasks: () => void;
  onPauseAllTasks: () => void;
  onFinishAllTasks: () => void;
  onAbortAllTasks: () => void;
  onLoadTasks: () => void;
  onSaveTasks: () => void;
};

export default function TaskManagerToolbar({
  tasks,
  onAddTask,
  onStartAllTasks,
  onPauseAllTasks,
  onFinishAllTasks,
  onAbortAllTasks,
  onLoadTasks,
  onSaveTasks,
}: TaskManagerToolbarProps) {
  const hasRunningTasks =
    tasks.some(task => task.status === "running");

  const hasActiveTasks =
    tasks.some(task =>
      task.status === "running" ||
      task.status === "paused" ||
      task.status === "finishing"
    );

  return (
    <Group
      justify="space-between"
      align="center"
    >
      <Group gap="xs">
        <Text fw={700}>
          Feladatok
        </Text>

        <Badge variant="light">
          {tasks.length} db
        </Badge>
      </Group>

      <Group gap="xs">
        <TaskToolbarIconButton
          tooltip="Tasks / add task"
          color="blue"
          onClick={onAddTask}
        >
          <IconPlus size={16} />
        </TaskToolbarIconButton>

        <TaskToolbarIconButton
          tooltip="Start all tasks"
          color="green"
          onClick={onStartAllTasks}
          disabled={tasks.length === 0}
        >
          <IconPlayerPlay size={16} />
        </TaskToolbarIconButton>

        <TaskToolbarIconButton
          tooltip="Pause all running tasks"
          color="yellow"
          onClick={onPauseAllTasks}
          disabled={!hasRunningTasks}
        >
          <IconPlayerPause size={16} />
        </TaskToolbarIconButton>

        <TaskToolbarIconButton
          tooltip="Set all active tasks to finishing"
          color="orange"
          onClick={onFinishAllTasks}
          disabled={!hasActiveTasks}
        >
          <IconCheck size={16} />
        </TaskToolbarIconButton>

        <TaskToolbarIconButton
          tooltip="Abort all active tasks"
          color="red"
          onClick={onAbortAllTasks}
          disabled={!hasActiveTasks}
        >
          <IconPlayerStop size={16} />
        </TaskToolbarIconButton>

        <TaskToolbarIconButton
          tooltip="Load tasks"
          color="blue"
          onClick={onLoadTasks}
        >
          <IconFolderOpen size={16} />
        </TaskToolbarIconButton>

        <TaskToolbarIconButton
          tooltip="Save tasks"
          color="green"
          onClick={onSaveTasks}
        >
          <IconDeviceFloppy size={16} />
        </TaskToolbarIconButton>
      </Group>
    </Group>
  );
}

type TaskToolbarIconButtonProps = {
  tooltip: string;
  color: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function TaskToolbarIconButton({
  tooltip,
  color,
  disabled = false,
  onClick,
  children,
}: TaskToolbarIconButtonProps) {
  return (
    <Tooltip label={tooltip} withArrow>
      <ActionIcon
        size="sm"
        variant="light"
        color={color}
        disabled={disabled}
        onClick={onClick}
        aria-label={tooltip}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  );
}