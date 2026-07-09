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
  IconBolt,
  IconEdit,
  IconListDetails,
  IconPlayerPause,
  IconPlayerPlayFilled,
  IconPlayerSkipForward,
  IconPlayerStopFilled,
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
  AutomationFlowRuntimeSnapshotDto,
} from "../../../common/src/types";
import type {
  TaskManagerSnapshot,
} from "../../../common/src/task";
import {
  FEATURE_ENABLE_SCRIPT_ENGINE,
} from "../../../common/src/featureFlags";

import type {
  RightPanelMode,
} from "../hooks/layout/useLayoutPageUiState";

import StatusActionIcon from "../components/common/StatusActionIcon";
import StatusBadge from "../components/common/StatusBadge";
import FastClockStatus from "../components/common/FastClockStatus";
import AutomationFlowDialog from "../components/automation/AutomationFlowDialog";
import ScriptEditorDialog from "../components/ScriptEditorDialog";
import { useCommandCenter } from "../context/CommandCenterContext";
import { useServerRuntimeStats } from "../hooks/useServerRuntimeStats";
import { useWsStatus } from "../hooks/useWsStatus";
import {
  isServerAudioPlaybackEnabled,
  subscribeServerAudioPlaybackChanged,
  toggleServerAudioPlaybackEnabled,
} from "../services/audioPlaybackSettings";
import { taskManager } from "../services/tasks/taskManagerSingleton";
import { wsApi } from "../services/wsApi";
import { wsClient } from "../services/wsClient";
import { getWsColor } from "./TopMenuBar";

import "../styles/global.css";

type StatusBarProps = {
  editMode: boolean;
  rightPanelMode: RightPanelMode;
  setRightPanelMode: Dispatch<SetStateAction<RightPanelMode>>;
};

export default function StatusBar({
  editMode,
  rightPanelMode,
  setRightPanelMode,
}: StatusBarProps) {
  const wsStatus = useWsStatus();
  const serverStats = useServerRuntimeStats();
  const { alive, type, name, powerInfo, locked } = useCommandCenter();

  const [automationFlowOpened, setAutomationFlowOpened] = useState(false);
  const [scriptEditorOpened, setScriptEditorOpened] = useState(false);
  const [taskDialogOpened, setTaskDialogOpened] = useState(false);
  const [taskSnapshot, setTaskSnapshot] = useState<TaskManagerSnapshot | null>(null);
  const [serverAudioEnabled, setServerAudioEnabled] = useState(() => isServerAudioPlaybackEnabled());
  const [automationRuntime, setAutomationRuntime] = useState<AutomationFlowRuntimeSnapshotDto | null>(null);

  const wsConnected = wsStatus === "connected";
  const commandCenterOnline = alive && wsConnected;
  const trackPowerOn = powerInfo?.trackVoltageOn === true && wsConnected;

  const automationStatus = automationRuntime?.status ?? "stopped";
  const automationIsRunning = automationStatus === "running";
  const automationBadgeColor = automationIsRunning ? "green" : "red";

  const runningTaskCount = taskSnapshot?.tasks.filter(task =>
    task.status === "running" || task.status === "finishing"
  ).length ?? 0;

  const activeTaskCount = taskSnapshot?.tasks.filter(task =>
    task.status === "running" || task.status === "paused" || task.status === "finishing"
  ).length ?? 0;

  const hasRunningTasks = taskSnapshot?.tasks.some(task => task.status === "running") === true;
  const hasTasks = (taskSnapshot?.tasks.length ?? 0) > 0;

  const taskBadgeColor = runningTaskCount > 0
    ? "green"
    : activeTaskCount > 0
      ? "orange"
      : "gray";

  useEffect(() => {
    const unsubscribe = wsClient.on("taskManagerSnapshotChanged", data => {
      setTaskSnapshot(data);
    });

    wsApi.getTaskRuntimeState();

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribeState = wsClient.on("automationFlowRuntimeStateChanged", data => {
      setAutomationRuntime(data);
    });

    const unsubscribeResponse = wsClient.on("automationFlowRuntimeResponse", data => {
      if (data.snapshot) {
        setAutomationRuntime(data.snapshot);
      }
    });

    wsApi.getAutomationFlowRuntimeState();

    return () => {
      unsubscribeState();
      unsubscribeResponse();
    };
  }, []);

  useEffect(() => subscribeServerAudioPlaybackChanged(setServerAudioEnabled), []);

  const handleToggleAutomation = (): void => {
    if (automationIsRunning) {
      wsApi.stopAutomationFlowRuntime();
      return;
    }

    wsApi.startAutomationFlowRuntime();
  };

  const handleToggleRightPanelMode = (): void => {
    setRightPanelMode(value => value === "property" ? "loco" : "property");
  };

  const handleOpenTasks = (): void => {
    setTaskDialogOpened(true);
    wsApi.getTaskRuntimeState();
  };

  const handleToggleServerAudio = (): void => {
    setServerAudioEnabled(toggleServerAudioPlaybackEnabled());
  };

  return (
    <>
      <Group h="100%" px="md" justify="space-between">
        <Group gap="md" wrap="nowrap">
          <StatusBadge color={getWsColor(wsStatus)}>WS</StatusBadge>
          <StatusBadge color={commandCenterOnline ? "green" : "red"}>{type ?? name ?? "CC"}</StatusBadge>
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
          <StatusBadge color={locked ? "orange" : "gray"} blink={locked}>{locked ? "LOCK" : "FREE"}</StatusBadge>
          <Divider orientation="vertical" />
          <StatusActionIcon tooltip={serverAudioEnabled ? "Server audio playback enabled" : "Server audio playback disabled"} color={serverAudioEnabled ? "green" : "gray"} onClick={handleToggleServerAudio}>{serverAudioEnabled ? <IconVolume size={16} /> : <IconVolumeOff size={16} />}</StatusActionIcon>
          <StatusActionIcon tooltip={rightPanelMode === "loco" ? "Right panel: loco panel" : "Right panel: property panel"} color={rightPanelMode === "loco" ? "green" : "gray"} onClick={handleToggleRightPanelMode}><IconTrain size={16} /></StatusActionIcon>
          <Divider orientation="vertical" />
          <StatusBadge color={automationBadgeColor}><Group gap={4} wrap="nowrap"><IconBolt size={13} /><span>{automationStatus.toUpperCase()}</span></Group></StatusBadge>
          <StatusActionIcon tooltip={automationIsRunning ? "Stop automation" : "Run automation"} color={automationIsRunning ? "red" : "green"} disabled={!wsConnected} onClick={handleToggleAutomation}>{automationIsRunning ? <IconPlayerStopFilled size={14} /> : <IconPlayerPlayFilled size={14} />}</StatusActionIcon>
          <StatusActionIcon tooltip="Edit automation" color="blue" disabled={editMode} onClick={() => setAutomationFlowOpened(true)}><IconEdit size={14} /></StatusActionIcon>
          {FEATURE_ENABLE_SCRIPT_ENGINE && (
            <>
              <Divider orientation="vertical" />
              <StatusActionIcon tooltip="Edit script" color="blue" onClick={() => setScriptEditorOpened(true)}><IconEdit size={14} /></StatusActionIcon>
            </>
          )}
          <Divider orientation="vertical" />
          <StatusBadge color={taskBadgeColor}>TASKS {activeTaskCount}</StatusBadge>
          <StatusActionIcon tooltip="Open tasks" color="blue" onClick={handleOpenTasks}><IconListDetails size={14} /></StatusActionIcon>
          <StatusActionIcon tooltip="Start all tasks" color="green" disabled={!wsConnected || !hasTasks} onClick={() => void taskManager.startAllTasks()}><IconPlayerPlayFilled size={14} /></StatusActionIcon>
          <StatusActionIcon tooltip="Pause all running tasks" color="yellow" disabled={!wsConnected || !hasRunningTasks} onClick={() => void taskManager.pauseAllTasks()}><IconPlayerPause size={14} /></StatusActionIcon>
          <StatusActionIcon tooltip="Complete all tasks" color="blue" disabled={!wsConnected || !taskSnapshot?.tasks.some(task => task.status === "running" || task.status === "paused")} onClick={() => void taskManager.finishAllTasks()}><IconPlayerSkipForward size={14} /></StatusActionIcon>
          <StatusActionIcon tooltip="Stop all tasks" color="red" disabled={!wsConnected || !taskSnapshot?.tasks.some(task => task.status === "running" || task.status === "paused" || task.status === "finishing")} onClick={() => void taskManager.abortAllTasks()}><IconPlayerStopFilled size={14} /></StatusActionIcon>
          <Divider orientation="vertical" />
          <FastClockStatus />
          <Divider orientation="vertical" />
          <StatusBadge color="blue">NET ↓{serverStats?.wsRxKbps ?? "-"} ↑{serverStats?.wsTxKbps ?? "-"} kbit/s</StatusBadge>
        </Group>
      </Group>

      <AutomationFlowDialog opened={!editMode && automationFlowOpened} onClose={() => setAutomationFlowOpened(false)} />

      {FEATURE_ENABLE_SCRIPT_ENGINE && (
        <ScriptEditorDialog opened={scriptEditorOpened} onClose={() => setScriptEditorOpened(false)} title="Script editor" />
      )}

      <Modal opened={taskDialogOpened} onClose={() => setTaskDialogOpened(false)} title="Tasks" size="xl" centered>
        <Stack gap="sm">
          <Group gap="xs">
            <StatusActionIcon tooltip="Refresh tasks" color="blue" onClick={() => wsApi.getTaskRuntimeState()}><IconListDetails size={14} /></StatusActionIcon>
            <StatusActionIcon tooltip="Start all tasks" color="green" onClick={() => void taskManager.startAllTasks()}><IconPlayerPlayFilled size={14} /></StatusActionIcon>
            <StatusActionIcon tooltip="Pause all running tasks" color="yellow" disabled={!hasRunningTasks} onClick={() => void taskManager.pauseAllTasks()}><IconPlayerPause size={14} /></StatusActionIcon>
            <StatusActionIcon tooltip="Complete all tasks" color="blue" disabled={!taskSnapshot?.tasks.some(task => task.status === "running" || task.status === "paused")} onClick={() => void taskManager.finishAllTasks()}><IconPlayerSkipForward size={14} /></StatusActionIcon>
            <StatusActionIcon tooltip="Stop all tasks" color="red" disabled={!taskSnapshot?.tasks.some(task => task.status === "running" || task.status === "paused" || task.status === "finishing")} onClick={() => void taskManager.abortAllTasks()}><IconPlayerStopFilled size={14} /></StatusActionIcon>
          </Group>
          {!taskSnapshot ? <Text size="sm" c="dimmed">No task snapshot yet.</Text> : taskSnapshot.tasks.length === 0 ? <Text size="sm" c="dimmed">No tasks.</Text> : <ScrollArea h={360}><Table striped highlightOnHover withTableBorder withColumnBorders stickyHeader><Table.Thead><Table.Tr><Table.Th>Name</Table.Th><Table.Th>Status</Table.Th><Table.Th>From</Table.Th><Table.Th>To</Table.Th><Table.Th>Loco</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{taskSnapshot.tasks.map(task => <Table.Tr key={task.id}><Table.Td>{task.name}</Table.Td><Table.Td>{task.status}</Table.Td><Table.Td>{task.transition.fromBlock.name}</Table.Td><Table.Td>{task.transition.toBlock.name}</Table.Td><Table.Td>{task.runtime.loco?.name ?? "-"}</Table.Td></Table.Tr>)}</Table.Tbody></Table></ScrollArea>}
        </Stack>
      </Modal>
    </>
  );
}
