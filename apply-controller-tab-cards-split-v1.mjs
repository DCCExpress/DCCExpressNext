#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  controllerTab: path.join(
    ROOT,
    "client/src/components/control-panel/ControllerTab.tsx"
  ),
  routeTaskControlCard: path.join(
    ROOT,
    "client/src/components/control-panel/controller/RouteTaskControlCard.tsx"
  ),
  taskListCard: path.join(
    ROOT,
    "client/src/components/control-panel/controller/TaskListCard.tsx"
  ),
  collapsibleHeader: path.join(
    ROOT,
    "client/src/components/common/CollapsibleCardHeader.tsx"
  ),
  persistentCollapsedHook: path.join(
    ROOT,
    "client/src/hooks/usePersistentCollapsedState.ts"
  ),
};

function fail(message) {
  throw new Error(message);
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Írva: ${path.relative(ROOT, file)}`);
}

function ensureExisting(file) {
  if (!fs.existsSync(file)) {
    fail(`Hiányzó fájl: ${path.relative(ROOT, file)}`);
  }
}

const PERSISTENT_COLLAPSED_HOOK = `// client/src/hooks/usePersistentCollapsedState.ts

import {
  useState,
} from "react";

export function usePersistentCollapsedState(
  storageKey: string,
  defaultCollapsed = false
) {
  const [collapsed, setCollapsed] =
    useState<boolean>(() => {
      const stored =
        window.localStorage.getItem(storageKey);

      if (stored === null) {
        return defaultCollapsed;
      }

      return stored === "true";
    });

  const toggleCollapsed = () => {
    setCollapsed(current => {
      const next =
        !current;

      window.localStorage.setItem(
        storageKey,
        String(next)
      );

      return next;
    });
  };

  return {
    collapsed,
    toggleCollapsed,
  };
}
`;

const COLLAPSIBLE_CARD_HEADER = `// client/src/components/common/CollapsibleCardHeader.tsx

import type {
  ReactNode,
} from "react";

import {
  ActionIcon,
  Group,
  Text,
  Tooltip,
} from "@mantine/core";

import {
  IconChevronDown,
} from "@tabler/icons-react";

type CollapsibleCardHeaderProps = {
  title: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  expandTooltip: string;
  collapseTooltip: string;
  rightSection?: ReactNode;
};

export default function CollapsibleCardHeader({
  title,
  collapsed,
  onToggle,
  expandTooltip,
  collapseTooltip,
  rightSection,
}: CollapsibleCardHeaderProps) {
  return (
    <Group
      justify="space-between"
      align="center"
      wrap="nowrap"
    >
      {typeof title === "string" ? (
        <Text
          size="sm"
          fw={700}
        >
          {title}
        </Text>
      ) : (
        title
      )}

      <Group
        gap="xs"
        wrap="nowrap"
      >
        {rightSection}

        <Tooltip
          label={
            collapsed
              ? expandTooltip
              : collapseTooltip
          }
        >
          <ActionIcon
            size="sm"
            variant="light"
            color="gray"
            onClick={onToggle}
          >
            <IconChevronDown
              size={16}
              style={{
                transform: collapsed
                  ? "rotate(-90deg)"
                  : "rotate(0deg)",
                transition: "transform 150ms ease",
              }}
            />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
`;

const ROUTE_TASK_CONTROL_CARD = `// client/src/components/control-panel/controller/RouteTaskControlCard.tsx

import {
  useState,
} from "react";

import {
  Badge,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  Stack,
  TextInput,
} from "@mantine/core";

import {
  IconCheck,
  IconPlayerPlay,
  IconPlayerStop,
  IconRoute,
} from "@tabler/icons-react";

import type {
  TaskManagerSnapshot,
} from "../../../services/tasks/TaskTypes";

import {
  showErrorMessage,
  showOkMessage,
} from "../../../helpers";

import {
  wsApi,
} from "../../../services/wsApi";

import {
  taskManager,
} from "../../../services/tasks/taskManagerSingleton";

import {
  usePersistentCollapsedState,
} from "../../../hooks/usePersistentCollapsedState";

import CollapsibleCardHeader from "../../common/CollapsibleCardHeader";

const ROUTE_TASK_CONTROL_COLLAPSED_KEY =
  "dcc-express.controller.route-task-control.collapsed";

type RouteTaskControlCardProps = {
  snapshot: TaskManagerSnapshot;
  onOpenTaskManager: () => void;
};

export default function RouteTaskControlCard({
  snapshot,
  onOpenTaskManager,
}: RouteTaskControlCardProps) {
  const [fromBlockName, setFromBlockName] =
    useState("A1");

  const [toBlockName, setToBlockName] =
    useState("C1");

  const {
    collapsed,
    toggleCollapsed,
  } = usePersistentCollapsedState(
    ROUTE_TASK_CONTROL_COLLAPSED_KEY
  );

  const handleStartAllTasks = async () => {
    const result =
      await taskManager.startAllTasks();

    if (!result.ok) {
      showErrorMessage("ERROR", result.error);
      return;
    }

    showOkMessage("SUCCESSFUL", "All tasks started.");
  };

  const handleFinishAllTasks = async () => {
    const result =
      await taskManager.finishAllTasks();

    if (!result.ok) {
      showErrorMessage("ERROR", result.error);
      return;
    }

    showOkMessage("SUCCESSFUL", "All tasks marked for finish.");
  };

  const handleAbortAllTasks = async () => {
    const result =
      await taskManager.abortAllTasks();

    if (!result.ok) {
      showErrorMessage("ERROR", result.error);
      return;
    }

    showOkMessage("SUCCESSFUL", "All active tasks aborted.");
  };

  const handleReserveRoute = () => {
    const from =
      fromBlockName.trim();

    const to =
      toBlockName.trim();

    if (!from || !to) {
      return;
    }

    wsApi.reserveRoute(from, to);
  };

  const handleReleaseRoute = () => {
    const from =
      fromBlockName.trim();

    const to =
      toBlockName.trim();

    if (!from || !to) {
      return;
    }

    wsApi.releaseRouteReservation(from, to);
  };

  const handleClearAllBusy = () => {
    wsApi.clearAllRouteReservations();
  };

  return (
    <Card
      withBorder
      radius="md"
      p="sm"
    >
      <Stack gap="sm">
        <CollapsibleCardHeader
          title="Route & Task control"
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          expandTooltip="Expand route and task controls"
          collapseTooltip="Collapse route and task controls"
          rightSection={
            <Badge variant="light">
              {snapshot.tasks.length} task
            </Badge>
          }
        />

        <Collapse expanded={!collapsed}>
          <Stack gap="sm">
            <Divider />

            <Group
              align="end"
              gap="xs"
            >
              <TextInput
                label="From block"
                value={fromBlockName}
                onChange={(event) =>
                  setFromBlockName(event.currentTarget.value)
                }
                placeholder="A1"
                w={120}
              />

              <TextInput
                label="To block"
                value={toBlockName}
                onChange={(event) =>
                  setToBlockName(event.currentTarget.value)
                }
                placeholder="C1"
                w={120}
              />

              <Button
                color="orange"
                variant="light"
                onClick={handleReserveRoute}
              >
                Set route
              </Button>

              <Button
                color="gray"
                variant="light"
                onClick={handleReleaseRoute}
              >
                Release route
              </Button>

              <Button
                color="gray"
                variant="light"
                onClick={handleClearAllBusy}
              >
                Clear all busy
              </Button>
            </Group>

            <Group grow>
              <Button
                size="xs"
                variant="light"
                color="violet"
                leftSection={<IconRoute size={16} />}
                onClick={onOpenTaskManager}
              >
                Task Manager...
              </Button>

              <Button
                size="xs"
                variant="light"
                color="green"
                leftSection={<IconPlayerPlay size={16} />}
                onClick={() => {
                  void handleStartAllTasks();
                }}
                disabled={snapshot.tasks.length === 0}
              >
                Start all tasks
              </Button>

              <Button
                size="xs"
                variant="light"
                color="orange"
                leftSection={<IconCheck size={16} />}
                onClick={() => {
                  void handleFinishAllTasks();
                }}
                disabled={
                  !snapshot.tasks.some(task =>
                    task.status === "running" ||
                    task.status === "paused"
                  )
                }
              >
                Finish all tasks
              </Button>

              <Button
                size="xs"
                variant="light"
                color="red"
                leftSection={<IconPlayerStop size={16} />}
                onClick={() => {
                  void handleAbortAllTasks();
                }}
                disabled={
                  !snapshot.tasks.some(task =>
                    task.status === "running" ||
                    task.status === "paused" ||
                    task.status === "finishing"
                  )
                }
              >
                Abort all tasks
              </Button>
            </Group>
          </Stack>
        </Collapse>
      </Stack>
    </Card>
  );
}
`;

const TASK_LIST_CARD = `// client/src/components/control-panel/controller/TaskListCard.tsx

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
`;

const CONTROLLER_TAB = `// client/src/components/control-panel/ControllerTab.tsx

import {
  useState,
} from "react";

import {
  Stack,
} from "@mantine/core";

import {
  useTaskManager,
} from "../../services/tasks/useTaskManager";

import TaskManagerDialog from "../common/TaskManagerDialog";
import FastClockCard from "../common/FastClockCard";

import RouteTaskControlCard from "./controller/RouteTaskControlCard";
import TaskListCard from "./controller/TaskListCard";

export default function ControllerTab() {
  const snapshot =
    useTaskManager();

  const [taskManagerOpened, setTaskManagerOpened] =
    useState(false);

  return (
    <>
      <TaskManagerDialog
        opened={taskManagerOpened}
        onClose={() => setTaskManagerOpened(false)}
      />

      <Stack gap="sm">
        <FastClockCard />

        <RouteTaskControlCard
          snapshot={snapshot}
          onOpenTaskManager={() => setTaskManagerOpened(true)}
        />

        <TaskListCard
          snapshot={snapshot}
        />
      </Stack>
    </>
  );
}
`;

try {
  console.log("DCCExpressNext – ControllerTab cards split patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  ensureExisting(FILES.controllerTab);

  write(FILES.persistentCollapsedHook, PERSISTENT_COLLAPSED_HOOK);
  write(FILES.collapsibleHeader, COLLAPSIBLE_CARD_HEADER);
  write(FILES.routeTaskControlCard, ROUTE_TASK_CONTROL_CARD);
  write(FILES.taskListCard, TASK_LIST_CARD);
  write(FILES.controllerTab, CONTROLLER_TAB);

  console.log("");
  console.log("Kész.");
  console.log("Nem készültek .bak fájlok.");
  console.log("");
  console.log("Javasolt ellenőrzés:");
  console.log("  npm run build");
} catch (error) {
  console.error("");
  console.error("PATCH HIBA:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
