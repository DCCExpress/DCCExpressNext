#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  fastClockCard: path.join(
    ROOT,
    "client/src/components/common/FastClockCard.tsx"
  ),
  fastClockStatus: path.join(
    ROOT,
    "client/src/components/common/FastClockStatus.tsx"
  ),
};

function fail(message) {
  throw new Error(message);
}

function write(file, content) {
  if (!fs.existsSync(file)) {
    fail(`Hiányzó fájl: ${path.relative(ROOT, file)}`);
  }

  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Frissítve: ${path.relative(ROOT, file)}`);
}

const FAST_CLOCK_CARD = `// client/src/components/common/FastClockCard.tsx

import {
  useEffect,
  useState,
} from "react";

import {
  Badge,
  Button,
  Card,
  Divider,
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

import type {
  FastClockSnapshot,
} from "../../../../common/src/fastClock";

import {
  getFastClockSnapshot,
  pauseFastClock,
  resetFastClock,
  runFastClock,
  setFastClockSpeed,
} from "../../api/fastClockApi";

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

export default function FastClockCard() {
  const [snapshot, setSnapshot] =
    useState<FastClockSnapshot | null>(null);

  const [speedInput, setSpeedInput] =
    useState<string | number>(1);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSnapshot = async (
      syncSpeedInput = false
    ) => {
      try {
        const next =
          await getFastClockSnapshot();

        if (!mounted) {
          return;
        }

        setSnapshot(next);
        setError(null);

        if (syncSpeedInput) {
          setSpeedInput(next.speed);
        }
      } catch (caught) {
        if (!mounted) {
          return;
        }

        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load fast clock state."
        );
      }
    };

    void loadSnapshot(true);

    const timer =
      window.setInterval(() => {
        void loadSnapshot(false);
      }, 500);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const runAction = async (
    action: () => Promise<FastClockSnapshot>,
    syncSpeedInput = false
  ) => {
    setBusy(true);

    try {
      const next =
        await action();

      setSnapshot(next);
      setError(null);

      if (syncSpeedInput) {
        setSpeedInput(next.speed);
      }
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

  const toggleClock = () => {
    if (snapshot?.running) {
      void runAction(pauseFastClock);
      return;
    }

    void runAction(runFastClock);
  };

  const applySpeed = () => {
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
      () => setFastClockSpeed(speed),
      true
    );
  };

  return (
    <Card
      withBorder
      radius="md"
      p="sm"
    >
      <Stack gap="sm">
        <Group
          justify="space-between"
          align="center"
        >
          <Text
            size="sm"
            fw={700}
          >
            Fast Clock
          </Text>

          <Group gap="xs">
            <Badge
              color={snapshot?.running ? "green" : "yellow"}
              variant="light"
            >
              {snapshot?.running ? "RUNNING" : "PAUSED"}
            </Badge>

            <Badge
              color="cyan"
              variant="light"
            >
              {snapshot ? \`\${snapshot.speed}×\` : "-"}
            </Badge>
          </Group>
        </Group>

        <Divider />

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
            color={snapshot?.running ? "yellow" : "green"}
            leftSection={
              snapshot?.running ? (
                <IconPlayerPause size={16} />
              ) : (
                <IconPlayerPlay size={16} />
              )
            }
            disabled={busy || !snapshot}
            onClick={toggleClock}
          >
            {snapshot?.running ? "Pause" : "Run"}
          </Button>

          <Button
            size="xs"
            variant="light"
            color="gray"
            leftSection={<IconRefresh size={16} />}
            disabled={busy}
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
            disabled={busy}
            onClick={applySpeed}
          >
            Set speed
          </Button>
        </Group>

        <Text
          size="xs"
          c="dimmed"
        >
          The fast clock state is served by the backend.
        </Text>

        {error && (
          <Text
            size="xs"
            c="red"
          >
            {error}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
`;

const FAST_CLOCK_STATUS = `// client/src/components/common/FastClockStatus.tsx

import {
  useEffect,
  useState,
} from "react";

import {
  ActionIcon,
  Badge,
  Group,
  Tooltip,
} from "@mantine/core";

import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconRefresh,
} from "@tabler/icons-react";

import type {
  FastClockSnapshot,
} from "../../../../common/src/fastClock";

import {
  getFastClockSnapshot,
  pauseFastClock,
  resetFastClock,
  runFastClock,
} from "../../api/fastClockApi";

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
  const [snapshot, setSnapshot] =
    useState<FastClockSnapshot | null>(null);

  const [busy, setBusy] =
    useState(false);

  const [loadFailed, setLoadFailed] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSnapshot = async () => {
      try {
        const next =
          await getFastClockSnapshot();

        if (!mounted) {
          return;
        }

        setSnapshot(next);
        setLoadFailed(false);
      } catch {
        if (!mounted) {
          return;
        }

        setLoadFailed(true);
      }
    };

    void loadSnapshot();

    const timer =
      window.setInterval(() => {
        void loadSnapshot();
      }, 500);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const runAction = async (
    action: () => Promise<FastClockSnapshot>
  ) => {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      const next =
        await action();

      setSnapshot(next);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
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
      ? \`FC \${formatFastClock(snapshot.timeMs)} · \${snapshot.speed}×\`
      : loadFailed
        ? "FC OFFLINE"
        : "FC --:--:--";

  return (
    <Group gap="xs" wrap="nowrap">
      <Tooltip
        label={
          snapshot
            ? \`Fast Clock · \${snapshot.running ? "running" : "paused"} · \${snapshot.speed}×\`
            : "Fast Clock"
        }
      >
        <Badge
          color={
            loadFailed
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
          {badgeLabel}
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
          disabled={!snapshot || busy}
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
          disabled={!snapshot || busy}
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
`;

try {
  console.log("DCCExpressNext – Fast Clock controls simplify patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  write(FILES.fastClockCard, FAST_CLOCK_CARD);
  write(FILES.fastClockStatus, FAST_CLOCK_STATUS);

  console.log("");
  console.log("Kész.");
  console.log("Nem készültek .bak fájlok.");
  console.log("");
  console.log("Javasolt ellenőrzés:");
  console.log("  npm run build");
} catch (error) {
  console.error("");
  console.error("PATCH HIBA:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
