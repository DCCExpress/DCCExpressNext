// client/src/components/tasks/task-manager/TaskManagerToolbar.tsx

import {
  Badge,
  Button,
  Group,
  Text,
} from "@mantine/core";

import {
  IconCheck,
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
  onFinishAllTasks: () => void;
  onAbortAllTasks: () => void;
  onLoadTasks: () => void;
  onSaveTasks: () => void;
};

export default function TaskManagerToolbar({
  tasks,
  onAddTask,
  onStartAllTasks,
  onFinishAllTasks,
  onAbortAllTasks,
  onLoadTasks,
  onSaveTasks,
}: TaskManagerToolbarProps) {
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
        <Button
          size="xs"
          leftSection={<IconPlus size={16} />}
          onClick={onAddTask}
        >
          Add task
        </Button>

        <Button
          size="xs"
          variant="light"
          color="green"
          leftSection={<IconPlayerPlay size={16} />}
          onClick={onStartAllTasks}
          disabled={tasks.length === 0}
        >
          Start all
        </Button>

        <Button
          size="xs"
          variant="light"
          color="orange"
          leftSection={<IconCheck size={16} />}
          onClick={onFinishAllTasks}
          disabled={
            !tasks.some(task =>
              task.status === "running" ||
              task.status === "paused"
            )
          }
        >
          Finish all
        </Button>

        <Button
          size="xs"
          variant="light"
          color="red"
          leftSection={<IconPlayerStop size={16} />}
          onClick={onAbortAllTasks}
          disabled={
            !tasks.some(task =>
              task.status === "running" ||
              task.status === "paused" ||
              task.status === "finishing"
            )
          }
        >
          Abort all
        </Button>

        <Button
          size="xs"
          variant="light"
          color="blue"
          onClick={onLoadTasks}
        >
          Load
        </Button>

        <Button
          size="xs"
          variant="light"
          color="green"
          onClick={onSaveTasks}
        >
          Save
        </Button>
      </Group>
    </Group>
  );
}
