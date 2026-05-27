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
  IconCode,
  IconEdit,
  IconListDetails,
  IconPlayerPause,
  IconPlayerPlayFilled,
  IconPlayerSkipForward,
  IconPlayerStopFilled,
  IconTrafficLights,
  IconTrain,
  IconVolume,
  IconVolumeOff,
} from "@tabler/icons-react";

import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  AutomationRuntimeStatePayload,
} from "../../../common/src/types";

import type {
  TaskManagerSnapshot,
} from "../../../common/src/task";

import type {
  RightPanelMode,
} from "../hooks/layout/useLayoutPageUiState";

import StatusActionIcon from "../components/common/StatusActionIcon";
import StatusBadge from "../components/common/StatusBadge";
import FastClockStatus from "../components/common/FastClockStatus";
import ScriptEditorDialog from "../components/ScriptEditorDialog";
import { useCommandCenter } from "../context/CommandCenterContext";
import { useScriptStatus } from "../hooks/useScriptStatus";
import { useServerRuntimeStats } from "../hooks/useServerRuntimeStats";
import { useWsStatus } from "../hooks/useWsStatus";
import {
  getAutomationRuntimeStateWs,
  startAutomationRuntimeWs,
  stopAutomationRuntimeWs,
} from "../api/automationWsApi";
import { isServerAudioPlaybackEnabled, subscribeServerAudioPlaybackChanged, toggleServerAudioPlaybackEnabled } from "../services/audioPlaybackSettings";
import { scriptEngine } from "../services/scriptEngine";
import { taskManager } from "../services/tasks/taskManagerSingleton";
import { wsApi } from "../services/wsApi";
import { wsClient } from "../services/wsClient";
import { getWsColor } from "./TopMenuBar";

import "../styles/global.css";

type StatusBarProps = {
  rightPanelMode: RightPanelMode;
  setRightPanelMode: Dispatch<SetStateAction<RightPanelMode>>;
  onOpenSignalLogicDialog: () => void;
};

const DEFAULT_AUTOMATION_STATE: AutomationRuntimeStatePayload = {
  running: false,
  tickMs: 500,
  modules: [],
};

export default function StatusBar({
  rightPanelMode,
  setRightPanelMode,
  onOpenSignalLogicDialog,
}: StatusBarProps) {
  const wsStatus = useWsStatus();
  const serverStats = useServerRuntimeStats();

  const {
    alive,
    type,
    name,
    powerInfo,
    locked,
  } = useCommandCenter();

  const [scriptEditorOpened, setScriptEditorOpened] = useState(false);
  const [taskDialogOpened, setTaskDialogOpened] = useState(false);
  const [taskSnapshot, setTaskSnapshot] = useState<TaskManagerSnapshot | null>(null);
  const [automationState, setAutomationState] = useState<AutomationRuntimeStatePayload>(DEFAULT_AUTOMATION_STATE);
  const [automationBusy, setAutomationBusy] = useState(false);
  const [serverAudioEnabled, setServerAudioEnabled] = useState(() => isServerAudioPlaybackEnabled());

  const wsConnected = wsStatus === "connected";
  const commandCenterOnline = alive && wsConnected;
  const trackPowerOn = powerInfo?.trackVoltageOn === true && wsConnected;

  const { scriptState, stopScript } = useScriptStatus();
  const scriptStatus = scriptState?.status ?? "idle";
  const scriptIsRunning = scriptStatus === "running" || scriptStatus === "stopping";

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

  const automationIsRunning = automationState.running;
  const enabledAutomationModules = automationState.modules.filter(module => module.enabled);
  const automationLabel = `AUTO ${enabledAutomationModules.length}/${automationState.modules.length}`;

  const automationBadgeColor =
    automationBusy
      ? "orange"
      : automationIsRunning
        ? "green"
        : "gray";

  const runningTaskCount = taskSnapshot?.tasks.filter(task =>
    task.status === "running" || task.status === "finishing"
  ).length ?? 0;

  const activeTaskCount = taskSnapshot?.tasks.filter(task =>
    task.status === "running" || task.status === "paused" || task.status === "finishing"
  ).length ?? 0;

  const hasRunningTasks = taskSnapshot?.tasks.some(task => task.status === "running") === true;
  const hasTasks = (taskSnapshot?.tasks.length ?? 0) > 0;

  const taskBadgeColor =
    runningTaskCount > 0
      ? "green"
      : activeTaskCount > 0
        ? "orange"
        : "gray";

  useEffect(() => {
    const unsubscribe = wsClient.on(
      "taskManagerSnapshotChanged",
      data => {
        setTaskSnapshot(data);
      }
    );

    wsApi.getTaskRuntimeState();

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = wsClient.on(
      "automationRuntimeStateChanged",
      data => {
        setAutomationState(data);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!wsConnected) {
      setAutomationState(previous => ({
        ...previous,
        running: false,
      }));
      return;
    }

    void getAutomationRuntimeStateWs()
      .then(result => {
        setAutomationState(result.state);
      })
      .catch(error => {
        console.error("Could not load automation runtime state:", error);
      });
  }, [wsConnected]);

  useEffect(() => {
    return subscribeServerAudioPlaybackChanged(setServerAudioEnabled);
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

  const handleToggleAutomation = (): void => {
    if (!wsConnected || automationBusy) {
      return;
    }

    setAutomationBusy(true);

    const request = automationIsRunning
      ? stopAutomationRuntimeWs()
      : startAutomationRuntimeWs();

    void request
      .then(result => {
        setAutomationState(result.state);
      })
      .catch(error => {
        console.error("Could not toggle automation runtime:", error);
      })
      .finally(() => {
        setAutomationBusy(false);
      });
  };

  const handleToggleRightPanelMode = (): void => {
    setRightPanelMode(value =>
      value === "property"
        ? "loco"
        : "property"
    );
  };

  const handleOpenTasks = (): void => {
    setTaskDialogOpened(true);
    wsApi.getTaskRuntimeState();
  };

  const handleStartTasks = (): void => {
    void taskManager.startAllTasks();
  };

  const handlePauseTasks = (): void => {
    void taskManager.pauseAllTasks();
  };

  const handleCompleteTasks = (): void => {
    void taskManager.finishAllTasks();
  };

  const handleStopTasks = (): void => {
    void taskManager.abortAllTasks();
  };

  const handleToggleServerAudio = (): void => {
    setServerAudioEnabled(toggleServerAudioPlaybackEnabled());
  };

  return (
    <>
      <Group h="100%" px="md" justify="space-between">
        <Group gap="md" wrap="nowrap">
          <StatusBadge color={getWsColor(wsStatus)}>WS</StatusBadge>

          <StatusBadge color={commandCenterOnline ? "green" : "red"}>
            {type ?? name ?? "CC"}
          </StatusBadge>

          <StatusBadge color={trackPowerOn ? "green" : "red"}>PWR</StatusBadge>

          <StatusBadge
            color={powerInfo?.emergencyStop ? "red" : "gray"}
            blink={powerInfo?.emergencyStop === true}
            onClick={() => {
              if (!powerInfo) return;
              if (powerInfo.emergencyStop) wsApi.powerOn();
              else wsApi.emergencyStop();
            }}
          >
            ESTOP
          </StatusBadge>

          <StatusBadge color={locked ? "orange" : "gray"} blink={locked}>
            {locked ? "LOCK" : "FREE"}
          </StatusBadge>

          <Divider orientation="vertical" />

          <StatusActionIcon
            tooltip={serverAudioEnabled ? "Server audio playback enabled" : "Server audio playback disabled"}
            color={serverAudioEnabled ? "green" : "gray"}
            onClick={handleToggleServerAudio}
          >
            {serverAudioEnabled ? <IconVolume size={16} /> : <IconVolumeOff size={16} />}
          </StatusActionIcon>

          <StatusActionIcon
            tooltip={rightPanelMode === "loco" ? "Right panel: loco panel" : "Right panel: property panel"}
            color={rightPanelMode === "loco" ? "green" : "gray"}
            onClick={handleToggleRightPanelMode}
          >
            <IconTrain size={16} />
          </StatusActionIcon>

          <Divider orientation="vertical" />

          <StatusBadge color={scriptBadgeColor}>
            <Group gap={4} wrap="nowrap">
              <IconCode size={13} />
              <span>{scriptStatus.toUpperCase()}</span>
            </Group>
          </StatusBadge>

          <StatusActionIcon
            tooltip={scriptIsRunning ? "Stop running script" : "Start script"}
            color={scriptIsRunning ? "red" : "green"}
            disabled={scriptStatus === "stopping"}
            onClick={handleToggleScript}
          >
            {scriptIsRunning ? <IconPlayerStopFilled size={14} /> : <IconPlayerPlayFilled size={14} />}
          </StatusActionIcon>

          <StatusActionIcon
            tooltip="Edit script"
            color="blue"
            onClick={() => setScriptEditorOpened(true)}
          >
            <IconEdit size={14} />
          </StatusActionIcon>

          <StatusBadge color={automationBadgeColor}>
            <Group gap={4} wrap="nowrap">
              <IconTrafficLights size={13} />
              <span>{automationIsRunning ? `${automationLabel} RUN` : `${automationLabel} STOP`}</span>
            </Group>
          </StatusBadge>

          <StatusActionIcon
            tooltip={automationIsRunning ? "Stop automation runtime" : "Start automation runtime"}
            color={automationIsRunning ? "red" : "green"}
            disabled={!wsConnected || automationBusy}
            onClick={handleToggleAutomation}
          >
            {automationIsRunning ? <IconPlayerStopFilled size={14} /> : <IconPlayerPlayFilled size={14} />}
          </StatusActionIcon>

          <StatusActionIcon
            tooltip="Edit signal logic rules"
            color="blue"
            onClick={onOpenSignalLogicDialog}
          >
            <IconEdit size={14} />
          </StatusActionIcon>

          <Divider orientation="vertical" />

          <StatusBadge color={taskBadgeColor}>TASKS {activeTaskCount}</StatusBadge>

          <StatusActionIcon tooltip="Open tasks" color="blue" onClick={handleOpenTasks}>
            <IconListDetails size={14} />
          </StatusActionIcon>

          <StatusActionIcon tooltip="Start all tasks" color="green" disabled={!wsConnected || !hasTasks} onClick={handleStartTasks}>
            <IconPlayerPlayFilled size={14} />
          </StatusActionIcon>

          <StatusActionIcon tooltip="Pause all running tasks" color="yellow" disabled={!wsConnected || !hasRunningTasks} onClick={handlePauseTasks}>
            <IconPlayerPause size={14} />
          </StatusActionIcon>

          <StatusActionIcon
            tooltip="Complete all tasks"
            color="blue"
            disabled={!wsConnected || !taskSnapshot?.tasks.some(task => task.status === "running" || task.status === "paused")}
            onClick={handleCompleteTasks}
          >
            <IconPlayerSkipForward size={14} />
          </StatusActionIcon>

          <StatusActionIcon
            tooltip="Stop all tasks"
            color="red"
            disabled={!wsConnected || !taskSnapshot?.tasks.some(task =>
              task.status === "running" || task.status === "paused" || task.status === "finishing"
            )}
            onClick={handleStopTasks}
          >
            <IconPlayerStopFilled size={14} />
          </StatusActionIcon>

          <Divider orientation="vertical" />
          <FastClockStatus />
          <Divider orientation="vertical" />

          <StatusBadge color="blue">
            NET ↓{serverStats?.wsRxKbps ?? "-"} ↑{serverStats?.wsTxKbps ?? "-"} kbit/s
          </StatusBadge>
        </Group>
      </Group>

      <ScriptEditorDialog
        opened={scriptEditorOpened}
        onClose={() => setScriptEditorOpened(false)}
        title="Script editor"
      />

      <Modal opened={taskDialogOpened} onClose={() => setTaskDialogOpened(false)} title="Tasks" size="xl" centered>
        <Stack gap="sm">
          <Group gap="xs">
            <StatusActionIcon tooltip="Refresh tasks" color="blue" onClick={() => wsApi.getTaskRuntimeState()}>
              <IconListDetails size={14} />
            </StatusActionIcon>

            <StatusActionIcon tooltip="Start all tasks" color="green" onClick={handleStartTasks}>
              <IconPlayerPlayFilled size={14} />
            </StatusActionIcon>

            <StatusActionIcon tooltip="Pause all running tasks" color="yellow" disabled={!hasRunningTasks} onClick={handlePauseTasks}>
              <IconPlayerPause size={14} />
            </StatusActionIcon>

            <StatusActionIcon
              tooltip="Complete all tasks"
              color="blue"
              disabled={!taskSnapshot?.tasks.some(task => task.status === "running" || task.status === "paused")}
              onClick={handleCompleteTasks}
            >
              <IconPlayerSkipForward size={14} />
            </StatusActionIcon>

            <StatusActionIcon
              tooltip="Stop all tasks"
              color="red"
              disabled={!taskSnapshot?.tasks.some(task =>
                task.status === "running" || task.status === "paused" || task.status === "finishing"
              )}
              onClick={handleStopTasks}
            >
              <IconPlayerStopFilled size={14} />
            </StatusActionIcon>
          </Group>

          {!taskSnapshot ? (
            <Text size="sm" c="dimmed">No task snapshot yet.</Text>
          ) : taskSnapshot.tasks.length === 0 ? (
            <Text size="sm" c="dimmed">No tasks.</Text>
          ) : (
            <ScrollArea h={360}>
              <Table striped highlightOnHover withTableBorder withColumnBorders stickyHeader>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>From</Table.Th>
                    <Table.Th>To</Table.Th>
                    <Table.Th>Loco</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {taskSnapshot.tasks.map(task => (
                    <Table.Tr key={task.id}>
                      <Table.Td>{task.name}</Table.Td>
                      <Table.Td>{task.status}</Table.Td>
                      <Table.Td>{task.transition.fromBlock.name}</Table.Td>
                      <Table.Td>{task.transition.toBlock.name}</Table.Td>
                      <Table.Td>{task.runtime.loco?.name ?? "-"}</Table.Td>
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
