// client/src/components/common/FastClockCard.tsx

import {
  useEffect,
  useState,
} from "react";

import {
  Badge,
  Button,
  Group,
  NumberInput,
  Stack,
  Text,
} from "@mantine/core";

import {
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
} from "@tabler/icons-react";

import {
  pauseFastClock,
  resetFastClock,
  runFastClock,
  setFastClockSpeed,
} from "../../api/fastClockApi";

import {
  fastClockStore,
} from "../../services/fastClockStore";

import {
  useFastClock,
} from "../../hooks/useFastClock";

import CollapsiblePanelCard from "./CollapsiblePanelCard";

const FAST_CLOCK_CARD_COLLAPSED_KEY =
  "dcc-express.fast-clock-card.collapsed";

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

export default function FastClockCard() {
  const {
    snapshot,
    connected,
  } =
    useFastClock();

  const [speedInput, setSpeedInput] =
    useState<string | number>(1);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    setSpeedInput(snapshot.speed);
  }, [snapshot?.speed]);

  const runAction = async (
    action: () => Promise<NonNullable<typeof snapshot>>
  ): Promise<void> => {
    setBusy(true);

    try {
      const next =
        await action();

      fastClockStore.applyServerSnapshot(next);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Fast clock action failed."
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleClock = (): void => {
    if (snapshot?.running) {
      void runAction(pauseFastClock);
      return;
    }

    void runAction(runFastClock);
  };

  const applySpeed = (): void => {
    const speed =
      typeof speedInput === "number"
        ? speedInput
        : Number(speedInput);

    if (
      !Number.isFinite(speed) ||
      speed < 1
    ) {
      setError(
        "A sebességszorzó minimum 1×."
      );

      return;
    }

    void runAction(
      () => setFastClockSpeed(speed)
    );
  };

  return (
    <CollapsiblePanelCard
      title="Fast Clock"
      collapsedStorageKey={
        FAST_CLOCK_CARD_COLLAPSED_KEY
      }
      expandTooltip="Expand fast clock"
      collapseTooltip="Collapse fast clock"
      rightSection={
        <>
          <Badge
            color={
              !connected
                ? "red"
                : snapshot?.running
                  ? "green"
                  : "yellow"
            }
            variant="light"
          >
            {!connected
              ? "OFFLINE"
              : snapshot?.running
                ? "RUNNING"
                : "PAUSED"}
          </Badge>

          <Badge
            color="cyan"
            variant="light"
          >
            {snapshot
              ? `${snapshot.speed}×`
              : "-"}
          </Badge>
        </>
      }
    >
      <Text
        fw={800}
        ta="center"
        style={{
          fontSize: 38,
          lineHeight: 1.1,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.08em",
        }}
      >
        {snapshot
          ? formatFastClock(snapshot.timeMs)
          : "--:--:--"}
      </Text>

      <Group grow>
        <Button
          size="xs"
          variant="light"
          color={
            snapshot?.running
              ? "yellow"
              : "green"
          }
          leftSection={
            snapshot?.running ? (
              <IconPlayerPause size={16} />
            ) : (
              <IconPlayerPlay size={16} />
            )
          }
          disabled={
            busy ||
            !snapshot ||
            !connected
          }
          onClick={toggleClock}
        >
          {snapshot?.running
            ? "Pause"
            : "Run"}
        </Button>

        <Button
          size="xs"
          variant="light"
          color="gray"
          leftSection={
            <IconRefresh size={16} />
          }
          disabled={
            busy ||
            !snapshot ||
            !connected
          }
          onClick={() => {
            void runAction(resetFastClock);
          }}
        >
          Reset
        </Button>
      </Group>

      <Group
        align="end"
        gap="xs"
      >
        <NumberInput
          label="Speed multiplier"
          description="Minimum 1×"
          value={speedInput}
          min={1}
          step={1}
          allowDecimal={false}
          onChange={setSpeedInput}
          style={{ flex: 1 }}
        />

        <Button
          size="xs"
          variant="light"
          color="blue"
          disabled={
            busy ||
            !snapshot ||
            !connected
          }
          onClick={applySpeed}
        >
          Set speed
        </Button>
      </Group>

      <Text
        size="xs"
        c={!connected ? "red" : "dimmed"}
      >
        {!connected
          ? "Server disconnected. The fast clock display is frozen."
          : "Server-synced over WebSocket, rendered smoothly in the client."}
      </Text>

      {error && (
        <Text
          size="xs"
          c="red"
        >
          {error}
        </Text>
      )}
    </CollapsiblePanelCard>
  );
}
