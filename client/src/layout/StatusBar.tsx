import { ActionIcon, Badge, Divider, Group, Tooltip } from "@mantine/core";
import {
    IconEdit,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
} from "@tabler/icons-react";

import { useWsStatus } from "../hooks/useWsStatus";
import { getWsColor } from "./TopMenuBar";
import { useCommandCenter } from "../context/CommandCenterContext";
import { useBrowserStats } from "../hooks/useBrowserStats";
import { wsApi } from "../services/wsApi";
import { useScriptStatus } from "../hooks/useScriptStatus";
import { scriptEngine } from "../services/scriptEngine";

import "../styles/global.css";
import { useState } from "react";
import ScriptEditorDialog from "../components/ScriptEditorDialog";

export default function StatusBar() {
  const wsStatus = useWsStatus();
  const browserStats = useBrowserStats(1000);

  const {
    alive,
    type,
    name,
    powerInfo,
    locked,
  } = useCommandCenter();

  const [scriptEditorOpened, setScriptEditorOpened] = useState(false);
  const wsConnected = wsStatus === "connected";
  const commandCenterOnline = alive && wsConnected;
  const trackPowerOn = powerInfo?.trackVoltageOn === true && wsConnected;

  const { scriptState, stopScript } = useScriptStatus();

  const scriptStatus = scriptState?.status ?? "idle";

  const scriptIsRunning =
    scriptStatus === "running" || scriptStatus === "stopping";

  const scriptBadgeColor =
    scriptStatus === "running"
      ? "green"
      : scriptStatus === "stopping"
        ? "orange"
        : scriptStatus === "error"
          ? "red"
          : scriptStatus === "finished"
            ? "blue"
            : scriptStatus === "stopped"
              ? "gray"
              : "gray";

  const handleStartScript = () => {
    scriptEngine.runCurrent({
      source: "control-panel",
    });
  };

  const handleToggleScript = () => {
    if (scriptIsRunning) {
      stopScript();
      return;
    }

    handleStartScript();
  };

  return (
    <>
    <Group h="100%" px="md" justify="space-between">
      <Group gap="md">
        <Badge color={getWsColor(wsStatus)} variant="filled">
          WS
        </Badge>

        <Badge color={commandCenterOnline ? "green" : "red"} variant="filled">
          {type ?? name ?? "CC"}
        </Badge>

        <Badge color={trackPowerOn ? "green" : "red"} variant="filled">
          PWR
        </Badge>

        <Badge
          style={{ cursor: "pointer" }}
          color={powerInfo?.emergencyStop ? "red" : "gray"}
          className={powerInfo?.emergencyStop ? "blinkBadge" : ""}
          onClick={() => {
            if (!powerInfo) return;

            if (powerInfo.emergencyStop) {
              wsApi.powerOn();
            } else {
              wsApi.emergencyStop();
            }
          }}
          variant="filled"
        >
          ESTOP
        </Badge>

        <Badge
          color={locked ? "orange" : "gray"}
          variant="filled"
          {...(locked ? { className: "blinkBadge" } : {})}
        >
          {locked ? "LOCK" : "FREE"}
        </Badge>

        <Divider orientation="vertical" />

        <Badge color={scriptBadgeColor} variant="filled">
          SCRIPT {scriptStatus.toUpperCase()}
        </Badge>

        <Tooltip label={scriptIsRunning ? "Stop running script" : "Start script"}>
          <ActionIcon
            size="sm"
            color={scriptIsRunning ? "red" : "green"}
            variant="filled"
            disabled={scriptStatus === "stopping"}
            onClick={handleToggleScript}
          >
            {scriptIsRunning ? (
              <IconPlayerStopFilled size={14} />
            ) : (
              <IconPlayerPlayFilled size={14} />
            )}
          </ActionIcon>
        </Tooltip>


        <Tooltip label="Edit script">
          <ActionIcon
            size="sm"
            color="blue"
            variant="filled"
            onClick={() => setScriptEditorOpened(true)}
          >
            <IconEdit size={14} />
          </ActionIcon>
        </Tooltip>
        
        <Divider orientation="vertical" />

        <Badge color={getMemoryColor(browserStats.memoryUsedMb)} variant="filled">
          JS {browserStats.memoryUsedMb ?? "-"} MB
        </Badge>

        <Badge color={getFpsColor(browserStats.fps)} variant="filled">
          FPS {browserStats.fps ?? "-"}
        </Badge>

        <Badge color="blue" variant="filled">
          CPU {browserStats.cpuThreads ?? "-"}
        </Badge>
      </Group>
    </Group>
     <ScriptEditorDialog
      opened={scriptEditorOpened}
      onClose={() => setScriptEditorOpened(false)}
      title="Script editor"
    />
    </>
  );
}

function getMemoryColor(memoryUsedMb: number | null): string {
  if (memoryUsedMb === null) return "gray";
  if (memoryUsedMb > 1000) return "red";
  if (memoryUsedMb > 600) return "orange";
  return "green";
}

function getFpsColor(fps: number | null): string {
  if (fps === null) return "gray";
  if (fps < 30) return "red";
  if (fps < 50) return "orange";
  return "green";
}