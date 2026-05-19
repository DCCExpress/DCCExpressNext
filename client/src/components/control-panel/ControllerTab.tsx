import { useState } from "react";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";

import {
  IconCheck,
  IconChevronDown,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconRoute,
} from "@tabler/icons-react";

import { showErrorMessage, showOkMessage } from "../../helpers";
import { wsApi } from "../../services/wsApi";
import { taskManager } from "../../services/tasks/taskManagerSingleton";
import { TrainTask, TrainTaskStatus } from "../../services/tasks/TaskTypes";
import { useTaskManager } from "../../services/tasks/useTaskManager";
import TaskManagerDialog from "../common/TaskManagerDialog";
import FastClockCard from "../common/FastClockCard";

const ROUTE_TASK_CONTROL_COLLAPSED_KEY =
  "dcc-express.controller.route-task-control.collapsed";

const TASK_LIST_COLLAPSED_KEY =
  "dcc-express.controller.task-list.collapsed";
export default function ControllerTab() {
  const snapshot = useTaskManager();
  const [taskManagerOpened, setTaskManagerOpened] = useState(false);
  const [fromBlockName, setFromBlockName] = useState("A1");
  const [toBlockName, setToBlockName] = useState("C1");

  const [routeTaskControlCollapsed, setRouteTaskControlCollapsed] =
    useState<boolean>(() =>
      window.localStorage.getItem(
        ROUTE_TASK_CONTROL_COLLAPSED_KEY
      ) === "true"
    );

  const [taskListCollapsed, setTaskListCollapsed] =
    useState<boolean>(() =>
      window.localStorage.getItem(
        TASK_LIST_COLLAPSED_KEY
      ) === "true"
    );

  const runTaskAction = async (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>
  ) => {
    const result = await action();

    if (!result.ok) {
      showErrorMessage("ERROR", result.error);
    }
  };

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
  function getStatusColor(status: TrainTaskStatus): string {
    switch (status) {
      case "queued":
        return "gray";
      case "running":
        return "green";
      case "paused":
        return "yellow";
      case "finishing":
        return "orange";
      case "aborted":
        return "red";
      case "completed":
        return "blue";
      case "error":
        return "red";
    }
  }
  function getStatusLabel(status: TrainTaskStatus): string {
    switch (status) {
      case "queued":
        return "Queued";
      case "running":
        return "Running";
      case "paused":
        return "Paused";
      case "finishing":
        return "Finishing";
      case "aborted":
        return "Aborted";
      case "completed":
        return "Completed";
      case "error":
        return "Error";
    }
  }
  function getTaskProgressLabel(task: TrainTask): string {
    if (task.status === "completed") {
      return "Megérkezett";
    }

    if (task.status === "aborted") {
      return "Megszakítva";
    }

    switch (task.runtime.simulation.phase) {
      case "waitingForLoco":
        return "Mozdonyra vár";
      case "waitingForRoute":
        return "Útvonal foglalására vár";
      case "waitingForBlockSensor": {
        const sensorAddress =
          task.runtime.simulation.waitingSensorAddress;

        return sensorAddress && sensorAddress > 0
          ? `Sensor #${sensorAddress} felszabadulására vár`
          : "A következő blokk felszabadulására vár";
      }
      case "departing":
        return "Indulási szakasz";
      case "transit":
        return "Két blokk között halad";
    }

    if (task.runtime.inTransit) {
      return "Két blokk között halad";
    }

    if (task.runtime.hasLeftFromBlock) {
      return "Elhagyta az induló blokkot";
    }

    switch (task.status) {
      case "queued":
        return "Indításra vár";
      case "running":
        return "Futás alatt";
      case "paused":
        return "Szüneteltetve";
      case "finishing":
        return "Befejezés alatt";
      // case "aborted":
      //   return "Megszakítva";
      case "error":
        return "Hiba";
    }
  }
  function getProgressColor(task: TrainTask): string {
    if (task.runtime.simulation.phase === "waitingForBlockSensor") {
      return "yellow";
    }

    if (task.status === "completed") {
      return "blue";
    }

    if (task.status === "aborted") {
      return "red";
    }

    if (task.runtime.inTransit) {
      return "red";
    }

    if (task.runtime.hasLeftFromBlock) {
      return "orange";
    }

    switch (task.status) {
      case "running":
        return "green";
      case "paused":
        return "yellow";
      case "finishing":
        return "orange";
      // case "aborted":
      //   return "red";
      case "error":
        return "red";
      default:
        return "gray";
    }
  }
  function renderTaskControls(task: TrainTask) {
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
          <Group gap="xs" grow>
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
          <Group gap="xs" grow>
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
  }
  const handleReserveRoute = () => {
    const from = fromBlockName.trim();
    const to = toBlockName.trim();

    if (!from || !to) {
      return;
    }

    wsApi.reserveRoute(from, to);
  };

  const handleReleaseRoute = () => {
    const from = fromBlockName.trim();
    const to = toBlockName.trim();

    if (!from || !to) {
      return;
    }

    wsApi.releaseRouteReservation(from, to);
  };

  const handleClearAllBusy = () => {
    wsApi.clearAllRouteReservations();
  };

  const toggleRouteTaskControlCollapsed = () => {
    setRouteTaskControlCollapsed(current => {
      const next = !current;

      window.localStorage.setItem(
        ROUTE_TASK_CONTROL_COLLAPSED_KEY,
        String(next)
      );

      return next;
    });
  };

  const toggleTaskListCollapsed = () => {
    setTaskListCollapsed(current => {
      const next = !current;

      window.localStorage.setItem(
        TASK_LIST_COLLAPSED_KEY,
        String(next)
      );

      return next;
    });
  };

  return (
    <>
      <TaskManagerDialog
        opened={taskManagerOpened}
        onClose={() => setTaskManagerOpened(false)}
      />

      <Stack gap="sm">
        <FastClockCard />

        {/* =========================
          ROUTE / TASK CONTROL CARD
         ========================= */}
        <Card
          withBorder
          radius="md"
          p="sm"
        >
          <Stack gap="sm">
            <Group justify="space-between" align="center" wrap="nowrap">
              <Text size="sm" fw={700}>
                Route & Task control
              </Text>

              <Group gap="xs" wrap="nowrap">
                <Badge variant="light">
                  {snapshot.tasks.length} task
                </Badge>

                <Tooltip
                  label={
                    routeTaskControlCollapsed
                      ? "Expand route and task controls"
                      : "Collapse route and task controls"
                  }
                >
                  <ActionIcon
                    size="sm"
                    variant="light"
                    color="gray"
                    onClick={toggleRouteTaskControlCollapsed}
                  >
                    <IconChevronDown
                      size={16}
                      style={{
                        transform: routeTaskControlCollapsed
                          ? "rotate(-90deg)"
                          : "rotate(0deg)",
                        transition: "transform 150ms ease",
                      }}
                    />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            <Collapse expanded={!routeTaskControlCollapsed}>
              <Stack gap="sm">

                <Divider />

            <Group align="end" gap="xs">
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
                onClick={() =>
                  wsApi.releaseRouteReservation(
                    fromBlockName.trim(),
                    toBlockName.trim()
                  )
                }
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
                onClick={() => setTaskManagerOpened(true)}
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

        {/* =========================
          TASK LIST CARD
         ========================= */}
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
              <Group justify="space-between" align="center" wrap="nowrap">
                <Text size="sm" fw={700}>
                  Task list
                </Text>

                <Group gap="xs" wrap="nowrap">
                  <Badge variant="light">
                    {snapshot.tasks.length} task
                  </Badge>

                  <Tooltip
                    label={
                      taskListCollapsed
                        ? "Expand task list"
                        : "Collapse task list"
                    }
                  >
                    <ActionIcon
                      size="sm"
                      variant="light"
                      color="gray"
                      onClick={toggleTaskListCollapsed}
                    >
                      <IconChevronDown
                        size={16}
                        style={{
                          transform: taskListCollapsed
                            ? "rotate(-90deg)"
                            : "rotate(0deg)",
                          transition: "transform 150ms ease",
                        }}
                      />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              <Collapse expanded={!taskListCollapsed}>
                <Stack gap="sm">

                  <Divider />

              {snapshot.tasks.length === 0 ? (
                <Text size="sm" c="dimmed">
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
                        <Group justify="space-between" align="flex-start">
                          <Stack gap={2}>
                            <Text size="sm" fw={700}>
                              {task.name}
                            </Text>

                            <Group gap="xs" wrap="wrap">
                              {task.runtime.loco && (
                                <>
                                  <Badge color="indigo" variant="light">
                                    {task.runtime.loco.name}
                                  </Badge>

                                  <Badge color="gray" variant="light">
                                    Address {task.runtime.loco.address}
                                  </Badge>
                                </>
                              )}

                              <Badge color="cyan" variant="light">
                                Speed {task.targetSpeed}
                              </Badge>
                            </Group>
                          </Stack>

                          <Badge
                            size="sm"
                            color={getStatusColor(task.status)}
                            variant="light"
                          >
                            {getStatusLabel(task.status)}
                          </Badge>
                        </Group>

                        <Group gap="xs" wrap="wrap">
                          <Badge color="violet" variant="filled">
                            {task.transition.fromBlock.name}
                          </Badge>

                          <Text fw={700}>→</Text>

                          <Badge color="violet" variant="filled">
                            {task.transition.toBlock.name}
                          </Badge>
                        </Group>

                        <Badge
                          color={getProgressColor(task)}
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
      </Stack>
    </>
  );
}
