import {
  Divider,
  Group,
} from "@mantine/core";

import {
  IconEdit,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
} from "@tabler/icons-react";

import {
  useState,
} from "react";

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

  return (
    <>
      <Group
        h="100%"
        px="md"
        justify="space-between"
      >
        <Group gap="md">
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
