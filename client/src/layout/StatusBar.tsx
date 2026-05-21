import {
  Divider,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Text,
} from "@mantine/core";

import {
  IconEdit,
  IconListDetails,
  IconPlayerPlayFilled,
  IconPlayerSkipForward,
  IconPlayerStopFilled,
} from "@tabler/icons-react";

import {
  useEffect,
  useState,
} from "react";

import type {
  TaskManagerSnapshot,
} from "../../../common/src/task";

import StatusActionIcon from "../components/common/StatusActionIcon";
import StatusBadge from "../components/common/StatusBadge";
import FastClockStatus from "../components/common/FastClockStatus";
import ScriptEditorDialog from "../components/ScriptEditorDialog";
import { useCommandCenter } from "../context/CommandCenterContext";
import { useBrowserStats } from "../hooks/useBrowserStats";
import { useScriptStatus } from "../hooks/useScriptStatus";
import { useWsStatus } from "../hooks/useWsStatus";
import { scriptEngine } from "../services/scriptEngine";
import { wsApi } from "../services/wsApi";
import { wsClient } from "../services/wsClient";
import { getWsColor } from "./TopMenuBar";

import "../styles/global.css";

export default function StatusBar() {
  const wsStatus =
    useWsStatus();

  const browserStats =
    useBrowserStats(1000);

  const {
    alive,
    type,
    name,
    powerInfo,
    locked,
  } =
    useCommandCenter();

  const [
    scriptEditorOpened,
    setScriptEditorOpened,
  ] =
    useState(false);

  const [
    taskDialogOpened,
    setTaskDialogOpened,
  ] =
    useState(false);

  const [
    taskSnapshot,
    setTaskSnapshot,
  ] =
    useState<TaskManagerSnapshot | null>(null);

  const wsConnected =
    wsStatus === "connected";

  const commandCenterOnline =
    alive && wsConnected;

  const trackPowerOn =
    powerInfo?.trackVoltageOn === true &&
    wsConnected;

  const {
    scriptState,
    stopScript,
  } =
    useScriptStatus();

  const scriptStatus =
    scriptState?.status ?? "idle";

  const scriptIsRunning =
    scriptStatus === "running" ||
    scriptStatus === "stopping";

  const scriptBadgeColor =
    scriptStatus === "running"
      ? "green"
      : scriptStatus === "stopping"
        ? "orange"
        : scriptStatus === "error"
          ? "red"
          : scriptStatus === "finished"
            ? "blue"
            : "gray";

  const runningTaskCount =
    taskSnapshot?.tasks.filter(
      task =>
        task.status === "running" ||
        task.status === "finishing"
    ).length ?? 0;

  const activeTaskCount =
    taskSnapshot?.tasks.filter(
      task =>
        task.status === "running" ||
        task.status === "paused" ||
        task.status === "finishing"
    ).length ?? 0;

  const taskBadgeColor =
    runningTaskCount > 0
      ? "green"
      : activeTaskCount > 0
        ? "orange"
        : "gray";

  useEffect(() => {
    const unsubscribe =
      wsClient.on(
        "taskManagerSnapshotChanged",
        data => {
          setTaskSnapshot(data);
        }
      );

    wsApi.getTaskRuntimeState();

    return unsubscribe;
  }, []);

  const handleStartScript = (): void => {
    scriptEngine.runCurrent({
      source: "control-panel",
    });
  };

  const handleToggleScript = (): void => {
    if (scriptIsRunning) {
      stopScript();
      return;
    }

    handleStartScript();
  };

  const handleOpenTasks = (): void => {
    setTaskDialogOpened(true);
    wsApi.getTaskRuntimeState();
  };
  const handleStartTasks = (): void => {
    if (!taskSnapshot) {
      return;
    }

    for (const task of taskSnapshot.tasks) {
      if (
        task.status === "queued" ||
        task.status === "aborted" ||
        task.status === "completed"
      ) {
        wsApi.startTask(task.id);
        continue;
      }

      if (task.status === "paused") {
        wsApi.resumeTask(task.id);
      }
    }
  };;
  const handleCompleteTasks = (): void => {
    wsApi.finishAllTasks();
  };;
  const handleStopTasks = (): void => {
    wsApi.abortAllTasks();
  };;

  return (
    <>
      <Group
        h="100%"
        px="md"
        justify="space-between"
      >
        <Group gap="md" wrap="nowrap">
          <StatusBadge
            color={getWsColor(wsStatus)}
          >
            WS
          </StatusBadge>

          <StatusBadge
            color={
              commandCenterOnline
                ? "green"
                : "red"
            }
          >
            {type ?? name ?? "CC"}
          </StatusBadge>

          <StatusBadge
            color={
              trackPowerOn
                ? "green"
                : "red"
            }
          >
            PWR
          </StatusBadge>

          <StatusBadge
            color={
              powerInfo?.emergencyStop
                ? "red"
                : "gray"
            }
            blink={
              powerInfo?.emergencyStop === true
            }
            onClick={() => {
              if (!powerInfo) {
                return;
              }

              if (powerInfo.emergencyStop) {
                wsApi.powerOn();
              } else {
                wsApi.emergencyStop();
              }
            }}
          >
            ESTOP
          </StatusBadge>

          <StatusBadge
            color={locked ? "orange" : "gray"}
            blink={locked}
          >
            {locked ? "LOCK" : "FREE"}
          </StatusBadge>

          <Divider orientation="vertical" />

          <StatusBadge color={scriptBadgeColor}>
            SCRIPT {scriptStatus.toUpperCase()}
          </StatusBadge>

          <StatusActionIcon
            tooltip={
              scriptIsRunning
                ? "Stop running script"
                : "Start script"
            }
            color={
              scriptIsRunning
                ? "red"
                : "green"
            }
            disabled={
              scriptStatus === "stopping"
            }
            onClick={handleToggleScript}
          >
            {scriptIsRunning ? (
              <IconPlayerStopFilled size={14} />
            ) : (
              <IconPlayerPlayFilled size={14} />
            )}
          </StatusActionIcon>

          <StatusActionIcon
            tooltip="Edit script"
            color="blue"
            onClick={() => {
              setScriptEditorOpened(true);
            }}
          >
            <IconEdit size={14} />
          </StatusActionIcon>

          <Divider orientation="vertical" />

          <StatusBadge color={taskBadgeColor}>
            TASK {activeTaskCount}
          </StatusBadge>

          <StatusActionIcon
            tooltip="Open tasks"
            color="blue"
            onClick={handleOpenTasks}
          >
            <IconListDetails size={14} />
          </StatusActionIcon>

          <StatusActionIcon
            tooltip="Start all tasks"
            color="green"
            disabled={!wsConnected || taskSnapshot?.tasks.length === 0}
            onClick={handleStartTasks}
          >
            <IconPlayerPlayFilled size={14} />
          </StatusActionIcon>

          <StatusActionIcon
            tooltip="Complete all tasks"
            color="blue"
            disabled={
              !wsConnected ||
              !taskSnapshot?.tasks.some(task =>
                task.status === "running" ||
                task.status === "paused"
              )
            }
            onClick={handleCompleteTasks}
          >
            <IconPlayerSkipForward size={14} />
          </StatusActionIcon>

          <StatusActionIcon
            tooltip="Stop all tasks"
            color="red"
            disabled={
              !wsConnected ||
              !taskSnapshot?.tasks.some(task =>
                task.status === "running" ||
                task.status === "paused" ||
                task.status === "finishing"
              )
            }
            onClick={handleStopTasks}
          >
            <IconPlayerStopFilled size={14} />
          </StatusActionIcon>

          <Divider orientation="vertical" />

          <FastClockStatus />

          <Divider orientation="vertical" />

          <StatusBadge
            color={getMemoryColor(
              browserStats.memoryUsedMb
            )}
          >
            JS {browserStats.memoryUsedMb ?? "-"} MB
          </StatusBadge>

          <StatusBadge
            color={getFpsColor(browserStats.fps)}
          >
            FPS {browserStats.fps ?? "-"}
          </StatusBadge>

          <StatusBadge color="blue">
            CPU {browserStats.cpuThreads ?? "-"}
          </StatusBadge>
        </Group>
      </Group>

      <ScriptEditorDialog
        opened={scriptEditorOpened}
        onClose={() => {
          setScriptEditorOpened(false);
        }}
        title="Script editor"
      />

      <Modal
        opened={taskDialogOpened}
        onClose={() => {
          setTaskDialogOpened(false);
        }}
        title="Tasks"
        size="xl"
        centered
      >
        <Stack gap="sm">
          <Group gap="xs">
            <StatusActionIcon
              tooltip="Refresh tasks"
              color="blue"
              onClick={() => {
                wsApi.getTaskRuntimeState();
              }}
            >
              <IconListDetails size={14} />
            </StatusActionIcon>

            <StatusActionIcon
              tooltip="Start all tasks"
              color="green"
              onClick={handleStartTasks}
            >
              <IconPlayerPlayFilled size={14} />
            </StatusActionIcon>

            <StatusActionIcon
              tooltip="Complete all tasks"
              color="blue"
              disabled={
                !taskSnapshot?.tasks.some(task =>
                  task.status === "running" ||
                  task.status === "paused"
                )
              }
              onClick={handleCompleteTasks}
            >
              <IconPlayerSkipForward size={14} />
            </StatusActionIcon>

            <StatusActionIcon
              tooltip="Stop all tasks"
              color="red"
              disabled={
                !taskSnapshot?.tasks.some(task =>
                  task.status === "running" ||
                  task.status === "paused" ||
                  task.status === "finishing"
                )
              }
              onClick={handleStopTasks}
            >
              <IconPlayerStopFilled size={14} />
            </StatusActionIcon>
          </Group>

          {!taskSnapshot ? (
            <Text size="sm" c="dimmed">
              No task snapshot yet.
            </Text>
          ) : taskSnapshot.tasks.length === 0 ? (
            <Text size="sm" c="dimmed">
              No tasks.
            </Text>
          ) : (
            <ScrollArea h={360}>
              <Table
                striped
                highlightOnHover
                withTableBorder
                withColumnBorders
                stickyHeader
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>From</Table.Th>
                    <Table.Th>To</Table.Th>
                    <Table.Th>Speed</Table.Th>
                    <Table.Th>Phase</Table.Th>
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody>
                  {taskSnapshot.tasks.map(task => (
                    <Table.Tr key={task.id}>
                      <Table.Td>
                        {task.name}
                      </Table.Td>
                      <Table.Td>
                        {task.status}
                      </Table.Td>
                      <Table.Td>
                        {task.transition.fromBlock.name}
                      </Table.Td>
                      <Table.Td>
                        {task.transition.toBlock.name}
                      </Table.Td>
                      <Table.Td>
                        {task.targetSpeed}
                      </Table.Td>
                      <Table.Td>
                        {task.runtime.simulation.phase}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Stack>
      </Modal>
    </>
  );
}

function getMemoryColor(
  memoryUsedMb: number | null
): string {
  if (memoryUsedMb === null) {
    return "gray";
  }

  if (memoryUsedMb > 1000) {
    return "red";
  }

  if (memoryUsedMb > 600) {
    return "orange";
  }

  return "green";
}

function getFpsColor(
  fps: number | null
): string {
  if (fps === null) {
    return "gray";
  }

  if (fps < 30) {
    return "red";
  }

  if (fps < 50) {
    return "orange";
  }

  return "green";
}
