import {
  Checkbox,
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
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  AutomationModuleStatePayload,
  AutomationRuntimeStatePayload,
} from "../../../common/src/types";

import type {
  SignalLogicRuntimeStateDto,
} from "../../../common/src/signalLogic";

import type {
  LevelCrossingRuntimeEntryDto,
  LevelCrossingRuntimeStateDto,
} from "../../../common/src/levelCrossingLogic";

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
import {
  getSignalLogicRuntimeStateWs,
  startSignalLogicWs,
  stopSignalLogicWs,
} from "../api/signalLogicWsApi";
import {
  getLevelCrossingRuntimeSnapshotWs,
  startLevelCrossingRuntimeWs,
  stopLevelCrossingRuntimeWs,
} from "../api/levelCrossingWsApi";
import {
  isServerAudioPlaybackEnabled,
  subscribeServerAudioPlaybackChanged,
  toggleServerAudioPlaybackEnabled,
} from "../services/audioPlaybackSettings";
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

type AutomationModuleId = "signalLogic" | "levelCrossing";

const DEFAULT_AUTOMATION_STATE: AutomationRuntimeStatePayload = {
  running: false,
  tickMs: 500,
  modules: [],
};

const DEFAULT_SIGNAL_LOGIC_STATE: SignalLogicRuntimeStateDto = {
  running: false,
  enabled: false,
};

const DEFAULT_LEVEL_CROSSING_STATE: LevelCrossingRuntimeStateDto = {
  running: false,
  enabled: false,
  crossings: [],
};

function getModuleState(
  automationState: AutomationRuntimeStatePayload,
  moduleId: string
): AutomationModuleStatePayload | undefined {
  return automationState.modules.find(module => module.id === moduleId);
}

function updateAutomationModuleEnabled(
  automationState: AutomationRuntimeStatePayload,
  moduleId: AutomationModuleId,
  enabled: boolean
): AutomationRuntimeStatePayload {
  const existingModule = automationState.modules.find(module => module.id === moduleId);

  if (!existingModule) {
    return automationState;
  }

  return {
    ...automationState,
    modules: automationState.modules.map(module =>
      module.id === moduleId
        ? { ...module, enabled }
        : module
    ),
  };
}

function formatTime(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms)) {
    return "-";
  }

  return new Date(ms).toLocaleTimeString();
}

function getCrossingBadgeColor(entry: LevelCrossingRuntimeEntryDto): string {
  switch (entry.state) {
    case "closed":
      return "red";
    case "closing":
    case "opening":
      return "orange";
    case "open":
      return "green";
    default:
      return "gray";
  }
}

function describeEvaluation(entry: LevelCrossingRuntimeEntryDto): string {
  const evaluation = entry.lastEvaluation;

  if (!evaluation) {
    return "-";
  }

  const unknown = evaluation.hasUnknownCloseCondition || evaluation.hasUnknownOpenCondition
    ? " / unknown"
    : "";

  return `${evaluation.reason}; close=${evaluation.shouldClose ? "yes" : "no"}; open=${evaluation.mayOpen ? "yes" : "no"}${unknown}`;
}

export default function StatusBar({
  rightPanelMode,
  setRightPanelMode,
}: StatusBarProps) {
  const wsStatus = useWsStatus();
  const serverStats = useServerRuntimeStats();
  const { alive, type, name, powerInfo, locked } = useCommandCenter();

  const [scriptEditorOpened, setScriptEditorOpened] = useState(false);
  const [taskDialogOpened, setTaskDialogOpened] = useState(false);
  const [automationDialogOpened, setAutomationDialogOpened] = useState(false);
  const [taskSnapshot, setTaskSnapshot] = useState<TaskManagerSnapshot | null>(null);
  const [automationState, setAutomationState] = useState<AutomationRuntimeStatePayload>(DEFAULT_AUTOMATION_STATE);
  const [signalLogicState, setSignalLogicState] = useState<SignalLogicRuntimeStateDto>(DEFAULT_SIGNAL_LOGIC_STATE);
  const [levelCrossingState, setLevelCrossingState] = useState<LevelCrossingRuntimeStateDto>(DEFAULT_LEVEL_CROSSING_STATE);
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
  const automationModuleCount = automationState.modules.length;
  const enabledAutomationModules = automationState.modules.filter(module => module.enabled);
  const activeAutomationModuleCount = automationIsRunning ? enabledAutomationModules.length : 0;
  const automationLabel = `AUTO ${activeAutomationModuleCount}/${automationModuleCount}`;

  const automationBadgeColor =
    automationBusy
      ? "orange"
      : automationModuleCount === 0 || activeAutomationModuleCount === 0
        ? "gray"
        : activeAutomationModuleCount === automationModuleCount
          ? "green"
          : "orange";

  const signalLogicModule = getModuleState(automationState, "signalLogic");
  const levelCrossingModule = getModuleState(automationState, "levelCrossing");

  const automationRows = useMemo(() => [
    {
      id: "signalLogic" as const,
      name: "Signal logic",
      description: "Signal control automation",
      module: signalLogicModule,
      enabled: signalLogicState.enabled,
      effectiveRunning: signalLogicState.running && signalLogicModule?.enabled === true,
    },
    {
      id: "levelCrossing" as const,
      name: "Level crossing supervision",
      description: "Barrier / level crossing automation",
      module: levelCrossingModule,
      enabled: levelCrossingState.enabled,
      effectiveRunning: levelCrossingState.running && levelCrossingModule?.enabled === true,
    },
  ], [
    signalLogicModule,
    signalLogicState.enabled,
    signalLogicState.running,
    levelCrossingModule,
    levelCrossingState.enabled,
    levelCrossingState.running,
  ]);

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

  const refreshAutomationDashboard = async (): Promise<void> => {
    if (!wsConnected) {
      return;
    }

    try {
      const [automation, signalLogic, levelCrossing] = await Promise.all([
        getAutomationRuntimeStateWs(),
        getSignalLogicRuntimeStateWs(),
        getLevelCrossingRuntimeSnapshotWs(),
      ]);

      setAutomationState(automation.state);
      setSignalLogicState(signalLogic.state);
      setLevelCrossingState(levelCrossing);
    } catch (error) {
      console.error("Could not refresh automation dashboard:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = wsClient.on("taskManagerSnapshotChanged", data => {
      setTaskSnapshot(data);
    });

    wsApi.getTaskRuntimeState();

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = wsClient.on("automationRuntimeStateChanged", data => {
      setAutomationState(data);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribeSignalLogic = wsClient.on("signalLogicStateChanged", data => {
      setSignalLogicState(data);
      setAutomationState(previous => updateAutomationModuleEnabled(previous, "signalLogic", data.enabled));
    });

    const unsubscribeLevelCrossing = wsClient.on("levelCrossingStateChanged", data => {
      setLevelCrossingState(data);
      setAutomationState(previous => updateAutomationModuleEnabled(previous, "levelCrossing", data.enabled));
    });

    return () => {
      unsubscribeSignalLogic();
      unsubscribeLevelCrossing();
    };
  }, []);

  useEffect(() => {
    if (!wsConnected) {
      setAutomationState(previous => ({ ...previous, running: false }));
      setSignalLogicState(previous => ({ ...previous, running: false }));
      setLevelCrossingState(previous => ({ ...previous, running: false }));
      return;
    }

    void refreshAutomationDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsConnected]);

  useEffect(() => subscribeServerAudioPlaybackChanged(setServerAudioEnabled), []);

  const handleToggleScript = (): void => {
    if (scriptIsRunning) {
      stopScript();
      return;
    }

    scriptEngine.runCurrent({ source: "control-panel" });
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
      .then(() => refreshAutomationDashboard())
      .catch(error => {
        console.error("Could not toggle automation runtime:", error);
      })
      .finally(() => {
        setAutomationBusy(false);
      });
  };

  const handleOpenAutomation = (): void => {
    setAutomationDialogOpened(true);
    void refreshAutomationDashboard();
  };

  const handleToggleAutomationModule = (
    moduleId: AutomationModuleId,
    enabled: boolean
  ): void => {
    if (!wsConnected || automationBusy) {
      return;
    }

    setAutomationBusy(true);

    const request = moduleId === "signalLogic"
      ? (enabled ? startSignalLogicWs() : stopSignalLogicWs()).then(result => {
          setSignalLogicState(result.state);
        })
      : (enabled ? startLevelCrossingRuntimeWs() : stopLevelCrossingRuntimeWs()).then(result => {
          setLevelCrossingState(result);
        });

    void request
      .then(() => refreshAutomationDashboard())
      .catch(error => {
        console.error(`Could not toggle automation module ${moduleId}:`, error);
      })
      .finally(() => {
        setAutomationBusy(false);
      });
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
          <StatusBadge color={scriptBadgeColor}><Group gap={4} wrap="nowrap"><IconCode size={13} /><span>{scriptStatus.toUpperCase()}</span></Group></StatusBadge>
          <StatusActionIcon tooltip={scriptIsRunning ? "Stop running script" : "Start script"} color={scriptIsRunning ? "red" : "green"} disabled={scriptStatus === "stopping"} onClick={handleToggleScript}>{scriptIsRunning ? <IconPlayerStopFilled size={14} /> : <IconPlayerPlayFilled size={14} />}</StatusActionIcon>
          <StatusActionIcon tooltip="Edit script" color="blue" onClick={() => setScriptEditorOpened(true)}><IconEdit size={14} /></StatusActionIcon>
          <Divider orientation="vertical" />
          <StatusBadge color={automationBadgeColor}><Group gap={4} wrap="nowrap"><IconTrafficLights size={13} /><span>{automationIsRunning ? `${automationLabel} RUN` : `${automationLabel} STOP`}</span></Group></StatusBadge>
          <StatusActionIcon tooltip="Open automation status" color="blue" onClick={handleOpenAutomation}><IconListDetails size={14} /></StatusActionIcon>
          <StatusActionIcon tooltip={automationIsRunning ? "Stop automation runtime" : "Start automation runtime"} color={automationIsRunning ? "red" : "green"} disabled={!wsConnected || automationBusy} onClick={handleToggleAutomation}>{automationIsRunning ? <IconPlayerStopFilled size={14} /> : <IconPlayerPlayFilled size={14} />}</StatusActionIcon>
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

      <ScriptEditorDialog opened={scriptEditorOpened} onClose={() => setScriptEditorOpened(false)} title="Script editor" />

      <Modal opened={automationDialogOpened} onClose={() => setAutomationDialogOpened(false)} title="Automation" size="xl" centered>
        <Stack gap="sm">
          <Group gap="xs">
            <StatusBadge color={automationBadgeColor}>Automation task: {automationIsRunning ? "RUNNING" : "STOPPED"}</StatusBadge>
            <StatusBadge color="blue">Tick: {automationState.tickMs} ms</StatusBadge>
          </Group>
          <Group gap="xs">
            <StatusActionIcon tooltip="Refresh automation state" color="blue" onClick={() => void refreshAutomationDashboard()}><IconListDetails size={14} /></StatusActionIcon>
            <StatusActionIcon tooltip="Start automation runtime" color="green" disabled={!wsConnected || automationBusy} onClick={() => { if (!automationIsRunning) handleToggleAutomation(); }}><IconPlayerPlayFilled size={14} /></StatusActionIcon>
            <StatusActionIcon tooltip="Stop automation runtime" color="red" disabled={!wsConnected || automationBusy} onClick={() => { if (automationIsRunning) handleToggleAutomation(); }}><IconPlayerStopFilled size={14} /></StatusActionIcon>
          </Group>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead><Table.Tr><Table.Th>Automation module</Table.Th><Table.Th>Status</Table.Th><Table.Th>Enabled</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>{automationRows.map(row => <Table.Tr key={row.id}><Table.Td><Stack gap={0}><Text size="sm" fw={600}>{row.name}</Text><Text size="xs" c="dimmed">{row.description}</Text></Stack></Table.Td><Table.Td><StatusBadge color={row.effectiveRunning ? "green" : row.enabled ? "orange" : "gray"}>{row.effectiveRunning ? "RUNNING" : row.enabled ? "ENABLED" : "DISABLED"}</StatusBadge></Table.Td><Table.Td><Checkbox checked={row.enabled === true} disabled={!wsConnected || automationBusy} onChange={event => handleToggleAutomationModule(row.id, event.currentTarget.checked)} /></Table.Td></Table.Tr>)}</Table.Tbody>
          </Table>
          <Text size="sm" fw={600}>Level crossing runtime</Text>
          {levelCrossingState.crossings.length === 0 ? <Text size="sm" c="dimmed">No level crossing runtime entries.</Text> : <ScrollArea h={220}><Table striped highlightOnHover withTableBorder withColumnBorders stickyHeader><Table.Thead><Table.Tr><Table.Th>Element</Table.Th><Table.Th>State</Table.Th><Table.Th>Last changed</Table.Th><Table.Th>Last evaluation</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{levelCrossingState.crossings.map(entry => <Table.Tr key={entry.logicId}><Table.Td>{entry.levelCrossingElementId || entry.logicId}</Table.Td><Table.Td><StatusBadge color={getCrossingBadgeColor(entry)}>{entry.state.toUpperCase()}</StatusBadge></Table.Td><Table.Td>{formatTime(entry.lastChangedAtMs)}</Table.Td><Table.Td>{describeEvaluation(entry)}</Table.Td></Table.Tr>)}</Table.Tbody></Table></ScrollArea>}
        </Stack>
      </Modal>

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
