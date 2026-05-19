// client/src/components/control-panel/controller/TaskListCard.tsx

import {
  Badge,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  ScrollArea,
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
  TaskManagerSnapshot,
  TrainTask,
} from "../../../services/tasks/TaskTypes";

import {
  showErrorMessage,
} from "../../../helpers";

import {
  taskManager,
} from "../../../services/tasks/taskManagerSingleton";

import {
  usePersistentCollapsedState,
} from "../../../hooks/usePersistentCollapsedState";

import CollapsibleCardHeader from "../../common/CollapsibleCardHeader";

import {
  getTaskProgressColor,
  getTaskProgressLabel,
  getTaskStatusColor,
  getTaskStatusLabel,
} from "../../tasks/taskUiHelpers";

const TASK_LIST_COLLAPSED_KEY =
  "dcc-express.controller.task-list.collapsed";

type TaskListCardProps = {
  snapshot: TaskManagerSnapshot;
};

export default function TaskListCard({
  snapshot,
}: TaskListCardProps) {
  const {
    collapsed,
    toggleCollapsed,
  } = usePersistentCollapsedState(
    TASK_LIST_COLLAPSED_KEY
  );

  const runTaskAction = async (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>
  ) => {
    const result =
      await action();

    if (!result.ok) {
      showErrorMessage("ERROR", result.error);
    }
  };

  const renderTaskControls = (
    task: TrainTask
  ) => {
    switch (task.status) {
      case "queued":
        return (
          <Button
            size="xs"
            variant="light"
            color="green"
            leftSection={<IconPlayerPlay size={14} />}
            onClick={() =>
              void runTaskAction(() => taskManager.startTask(task.id))
            }
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
              leftSection={<IconPlayerPause size={14} />}
              onClick={() =>
                void runTaskAction(() => taskManager.pauseTask(task.id))
              }
            >
              Pause
            </Button>

            <Button
              size="xs"
              variant="light"
              color="orange"
              leftSection={<IconCheck size={14} />}
              onClick={() =>
                void runTaskAction(() => taskManager.finishTask(task.id))
              }
            >
              Finish
            </Button>

            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconPlayerStop size={14} />}
              onClick={() =>
                void runTaskAction(() => taskManager.abortTask(task.id))
              }
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
              leftSection={<IconPlayerPlay size={14} />}
              onClick={() =>
                void runTaskAction(() => taskManager.resumeTask(task.id))
              }
            >
              Resume
            </Button>

            <Button
              size="xs"
              variant="light"
              color="orange"
              leftSection={<IconCheck size={14} />}
              onClick={() =>
                void runTaskAction(() => taskManager.finishTask(task.id))
              }
            >
              Finish
            </Button>

            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconPlayerStop size={14} />}
              onClick={() =>
                void runTaskAction(() => taskManager.abortTask(task.id))
              }
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
            leftSection={<IconPlayerStop size={14} />}
            onClick={() =>
              void runTaskAction(() => taskManager.abortTask(task.id))
            }
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
            leftSection={<IconPlayerPlay size={14} />}
            onClick={() =>
              void runTaskAction(() => taskManager.startTask(task.id))
            }
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
      radius="md"
      p="sm"
    >
      <ScrollArea.Autosize
        mah="calc(100vh - 420px)"
        type="auto"
        offsetScrollbars
      >
        <Stack gap="sm">
          <CollapsibleCardHeader
            title="Task list"
            collapsed={collapsed}
            onToggle={toggleCollapsed}
            expandTooltip="Expand task list"
            collapseTooltip="Collapse task list"
            rightSection={
              <Badge variant="light">
                {snapshot.tasks.length} task
              </Badge>
            }
          />

          <Collapse expanded={!collapsed}>
            <Stack gap="sm">
              <Divider />

              {snapshot.tasks.length === 0 ? (
                <Text
                  size="sm"
                  c="dimmed"
                >
                  Nincs aktív vagy felvett feladat.
                </Text>
              ) : (
                <Stack gap="sm">
                  {snapshot.tasks.map(task => (
                    <Card
                      key={task.id}
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
                          style={{ alignSelf: "flex-start" }}
                        >
                          {getTaskProgressLabel(task)}
                        </Badge>

                        {renderTaskControls(task)}
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </Collapse>
        </Stack>
      </ScrollArea.Autosize>
    </Card>
  );
}
