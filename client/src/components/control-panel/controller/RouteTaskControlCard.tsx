// client/src/components/control-panel/controller/RouteTaskControlCard.tsx

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
