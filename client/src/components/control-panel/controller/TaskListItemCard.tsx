// client/src/components/control-panel/controller/TaskListItemCard.tsx

import {
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
} from "@mantine/core";

import {
  IconCheck,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
} from "@tabler/icons-react";

import type {
  TrainTask,
} from "../../../services/tasks/TaskTypes";

import {
  getTaskProgressColor,
  getTaskProgressLabel,
  getTaskStatusColor,
  getTaskStatusLabel,
} from "../../tasks/taskUiHelpers";

type TaskAction = () => Promise<
  | { ok: true }
  | { ok: false; error: string }
>;

type TaskListItemCardProps = {
  task: TrainTask;
  onStart: TaskAction;
  onPause: TaskAction;
  onResume: TaskAction;
  onFinish: TaskAction;
  onAbort: TaskAction;
  onRunTaskAction: (
    action: TaskAction
  ) => void;
};

export default function TaskListItemCard({
  task,
  onStart,
  onPause,
  onResume,
  onFinish,
  onAbort,
  onRunTaskAction,
}: TaskListItemCardProps) {
  const renderTaskControls = () => {
    switch (task.status) {
      case "queued":
        return (
          <Button
            size="xs"
            variant="light"
            color="green"
            leftSection={
              <IconPlayerPlay size={14} />
            }
            onClick={() => {
              onRunTaskAction(onStart);
            }}
          >
            Start
          </Button>
        );

      case "running":
        return (
          <Group
            gap="xs"
            grow
          >
            <Button
              size="xs"
              variant="light"
              color="yellow"
              leftSection={
                <IconPlayerPause size={14} />
              }
              onClick={() => {
                onRunTaskAction(onPause);
              }}
            >
              Pause
            </Button>

            <Button
              size="xs"
              variant="light"
              color="orange"
              leftSection={
                <IconCheck size={14} />
              }
              onClick={() => {
                onRunTaskAction(onFinish);
              }}
            >
              Finish
            </Button>

            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={
                <IconPlayerStop size={14} />
              }
              onClick={() => {
                onRunTaskAction(onAbort);
              }}
            >
              Abort
            </Button>
          </Group>
        );

      case "paused":
        return (
          <Group
            gap="xs"
            grow
          >
            <Button
              size="xs"
              variant="light"
              color="green"
              leftSection={
                <IconPlayerPlay size={14} />
              }
              onClick={() => {
                onRunTaskAction(onResume);
              }}
            >
              Resume
            </Button>

            <Button
              size="xs"
              variant="light"
              color="orange"
              leftSection={
                <IconCheck size={14} />
              }
              onClick={() => {
                onRunTaskAction(onFinish);
              }}
            >
              Finish
            </Button>

            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={
                <IconPlayerStop size={14} />
              }
              onClick={() => {
                onRunTaskAction(onAbort);
              }}
            >
              Abort
            </Button>
          </Group>
        );

      case "finishing":
        return (
          <Button
            size="xs"
            variant="light"
            color="red"
            leftSection={
              <IconPlayerStop size={14} />
            }
            onClick={() => {
              onRunTaskAction(onAbort);
            }}
          >
            Abort
          </Button>
        );

      case "aborted":
      case "completed":
        return (
          <Button
            size="xs"
            variant="light"
            color="green"
            leftSection={
              <IconPlayerPlay size={14} />
            }
            onClick={() => {
              onRunTaskAction(onStart);
            }}
          >
            Start again
          </Button>
        );

      case "error":
        return null;
    }
  };

  return (
    <Card
      withBorder
      radius="sm"
      p="xs"
    >
      <Stack gap="xs">
        <Group
          justify="space-between"
          align="flex-start"
        >
          <Stack gap={2}>
            <Text
              size="sm"
              fw={700}
            >
              {task.name}
            </Text>

            <Group
              gap="xs"
              wrap="wrap"
            >
              {task.runtime.loco && (
                <>
                  <Badge
                    color="indigo"
                    variant="light"
                  >
                    {task.runtime.loco.name}
                  </Badge>

                  <Badge
                    color="gray"
                    variant="light"
                  >
                    Address {task.runtime.loco.address}
                  </Badge>
                </>
              )}

              <Badge
                color="cyan"
                variant="light"
              >
                Speed {task.targetSpeed}
              </Badge>
            </Group>
          </Stack>

          <Badge
            size="sm"
            color={getTaskStatusColor(task.status)}
            variant="light"
          >
            {getTaskStatusLabel(task.status)}
          </Badge>
        </Group>

        <Group
          gap="xs"
          wrap="wrap"
        >
          <Badge
            color="violet"
            variant="filled"
          >
            {task.transition.fromBlock.name}
          </Badge>

          <Text fw={700}>→</Text>

          <Badge
            color="violet"
            variant="filled"
          >
            {task.transition.toBlock.name}
          </Badge>
        </Group>

        <Badge
          color={getTaskProgressColor(task)}
          variant="light"
          style={{
            alignSelf: "flex-start",
          }}
        >
          {getTaskProgressLabel(task)}
        </Badge>

        {renderTaskControls()}
      </Stack>
    </Card>
  );
}
