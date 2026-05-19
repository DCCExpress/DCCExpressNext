// client/src/components/common/FastClockStatus.tsx

import {
  useState,
} from "react";

import {
  ActionIcon,
  Badge,
  Group,
  Tooltip,
} from "@mantine/core";

import {
  IconClock,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconRefresh,
} from "@tabler/icons-react";

import {
  pauseFastClock,
  resetFastClock,
  runFastClock,
} from "../../api/fastClockApi";

import {
  fastClockStore,
} from "../../services/fastClockStore";

import {
  useFastClock,
} from "../../hooks/useFastClock";

function formatFastClock(timeMs: number): string {
  const totalSeconds =
    Math.floor(timeMs / 1000);

  const hours =
    Math.floor(totalSeconds / 3600) % 24;

  const minutes =
    Math.floor(totalSeconds / 60) % 60;

  const seconds =
    totalSeconds % 60;

  return [
    hours,
    minutes,
    seconds,
  ]
    .map(value => value.toString().padStart(2, "0"))
    .join(":");
}

export default function FastClockStatus() {
  const {
    snapshot,
    connected,
  } = useFastClock();

  const [busy, setBusy] =
    useState(false);

  const runAction = async (
    action: () => Promise<NonNullable<typeof snapshot>>
  ) => {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      const next =
        await action();

      fastClockStore.applyServerSnapshot(next);
    } finally {
      setBusy(false);
    }
  };

  const toggleClock = () => {
    if (!snapshot) {
      return;
    }

    if (snapshot.running) {
      void runAction(pauseFastClock);
      return;
    }

    void runAction(runFastClock);
  };

  const badgeLabel =
    snapshot
      ? connected
        ? `${formatFastClock(snapshot.timeMs)} · ${snapshot.speed}×`
        : `OFFLINE · ${formatFastClock(snapshot.timeMs)}`
      : connected
        ? "--:--:--"
        : "OFFLINE";

  return (
    <Group gap="xs" wrap="nowrap">
      <Tooltip
        label={
          !connected
            ? "Fast Clock server disconnected"
            : snapshot
              ? `Fast Clock · ${snapshot.running ? "running" : "paused"} · ${snapshot.speed}×`
              : "Fast Clock"
        }
      >
        <Badge
          color={
            !connected
              ? "red"
              : snapshot?.running
                ? "green"
                : "yellow"
          }
          variant="filled"
          style={{
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <Group gap={4} wrap="nowrap">
            <IconClock size={12} />
            <span>{badgeLabel}</span>
          </Group>
        </Badge>
      </Tooltip>

      <Tooltip
        label={
          snapshot?.running
            ? "Pause fast clock"
            : "Run fast clock"
        }
      >
        <ActionIcon
          size="sm"
          color={snapshot?.running ? "yellow" : "green"}
          variant="filled"
          disabled={!snapshot || busy || !connected}
          onClick={toggleClock}
        >
          {snapshot?.running ? (
            <IconPlayerPauseFilled size={14} />
          ) : (
            <IconPlayerPlayFilled size={14} />
          )}
        </ActionIcon>
      </Tooltip>

      <Tooltip label="Reset fast clock">
        <ActionIcon
          size="sm"
          color="gray"
          variant="filled"
          disabled={!snapshot || busy || !connected}
          onClick={() => {
            void runAction(resetFastClock);
          }}
        >
          <IconRefresh size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
