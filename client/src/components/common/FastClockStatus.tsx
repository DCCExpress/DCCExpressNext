// client/src/components/common/FastClockStatus.tsx

import {
  useState,
} from "react";

import {
  Group,
} from "@mantine/core";
import { useTranslation } from "react-i18next";

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
  useFastClock,
} from "../../hooks/useFastClock";

import {
  fastClockStore,
} from "../../services/fastClockStore";

import StatusActionIcon from "./StatusActionIcon";
import StatusBadge from "./StatusBadge";

function formatFastClock(
  timeMs: number
): string {
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
    .map(value =>
      value
        .toString()
        .padStart(2, "0")
    )
    .join(":");
}

export default function FastClockStatus() {
  const { t } = useTranslation();

  const {
    snapshot,
    connected,
  } =
    useFastClock();

  const [busy, setBusy] =
    useState(false);

  const runAction = async (
    action: () => Promise<NonNullable<typeof snapshot>>
  ): Promise<void> => {
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

  const toggleClock = (): void => {
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
        : `${t("common.offline")} · ${formatFastClock(snapshot.timeMs)}`
      : connected
        ? "--:--:--"
        : t("common.offline");

  const statusTooltip =
    !connected
      ? t("fastClock.status.serverDisconnected")
      : snapshot
        ? `Fast Clock · ${snapshot.running ? t("fastClock.runningLower") : t("fastClock.pausedLower")} · ${snapshot.speed}×`
        : t("fastClock.title");

  return (
    <Group
      gap="xs"
      wrap="nowrap"
    >
      <StatusBadge
        tooltip={statusTooltip}
        color={
          !connected
            ? "red"
            : snapshot?.running
              ? "green"
              : "yellow"
        }
        numeric
        icon={<IconClock size={12} />}
      >
        {badgeLabel}
      </StatusBadge>

      <StatusActionIcon
        tooltip={
          snapshot?.running
            ? t("fastClock.pauseAction")
            : t("fastClock.runAction")
        }
        color={
          snapshot?.running
            ? "yellow"
            : "green"
        }
        disabled={
          !snapshot ||
          busy ||
          !connected
        }
        onClick={toggleClock}
      >
        {snapshot?.running ? (
          <IconPlayerPauseFilled size={14} />
        ) : (
          <IconPlayerPlayFilled size={14} />
        )}
      </StatusActionIcon>

      <StatusActionIcon
        tooltip={t("fastClock.resetAction")}
        color="gray"
        disabled={
          !snapshot ||
          busy ||
          !connected
        }
        onClick={() => {
          void runAction(resetFastClock);
        }}
      >
        <IconRefresh size={14} />
      </StatusActionIcon>
    </Group>
  );
}
