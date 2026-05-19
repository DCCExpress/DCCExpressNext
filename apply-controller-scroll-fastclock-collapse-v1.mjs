#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  controlPanel: path.join(
    ROOT,
    "client/src/components/ControlPanel.tsx"
  ),
  fastClockCard: path.join(
    ROOT,
    "client/src/components/common/FastClockCard.tsx"
  ),
};

function fail(message) {
  throw new Error(message);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail(`Hiányzó fájl: ${path.relative(ROOT, file)}`);
  }

  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Frissítve: ${path.relative(ROOT, file)}`);
}

function getEol(source) {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

function findFunctionRange(source, signature) {
  const start = source.indexOf(signature);

  if (start < 0) {
    fail(`Nem találom ezt a függvényt: ${signature}`);
  }

  const openBrace = source.indexOf("{", start);

  if (openBrace < 0) {
    fail(`Nem találom a függvény nyitó kapcsos zárójelét: ${signature}`);
  }

  let depth = 0;

  for (let i = openBrace; i < source.length; i++) {
    const char = source[i];

    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;

      if (depth === 0) {
        return {
          start,
          end: i + 1,
          text: source.slice(start, i + 1),
        };
      }
    }
  }

  fail(`Nem találom a függvény végét: ${signature}`);
}

function patchControlPanel() {
  let source = read(FILES.controlPanel);
  const eol = getEol(source);

  const range = findFunctionRange(
    source,
    "function ControllerTab()"
  );

  let fn = range.text;

  if (fn.includes("<ScrollArea.Autosize") && fn.includes("<FastClockCard />")) {
    console.log("• ControllerTab már scrollozható.");
    return;
  }

  const openMarker = [
    "      />",
    "",
    '      <Stack gap="sm">',
  ].join(eol);

  const openReplacement = [
    "      />",
    "",
    '      <ScrollArea.Autosize',
    '        mah="calc(100vh - 220px)"',
    '        type="auto"',
    '        offsetScrollbars',
    '      >',
    '        <Stack gap="sm">',
  ].join(eol);

  if (!fn.includes(openMarker)) {
    fail(
      "ControllerTab: nem találtam a TaskManagerDialog utáni Stack kezdést."
    );
  }

  fn = fn.replace(openMarker, openReplacement);

  const closeMarker = [
    "      </Stack>",
    "    </>",
  ].join(eol);

  const closeReplacement = [
    "        </Stack>",
    "      </ScrollArea.Autosize>",
    "    </>",
  ].join(eol);

  if (!fn.includes(closeMarker)) {
    fail(
      "ControllerTab: nem találtam a fő Stack zárását."
    );
  }

  fn = fn.replace(closeMarker, closeReplacement);

  source =
    source.slice(0, range.start) +
    fn +
    source.slice(range.end);

  write(FILES.controlPanel, source);
}

const FAST_CLOCK_CARD = `// client/src/components/common/FastClockCard.tsx

import {
  useEffect,
  useState,
} from "react";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  NumberInput,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";

import {
  IconChevronDown,
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

const FAST_CLOCK_CARD_COLLAPSED_KEY =
  "dcc-express.fast-clock-card.collapsed";

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
  const {
    snapshot,
    connected,
  } = useFastClock();

  const [speedInput, setSpeedInput] =
    useState<string | number>(1);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [collapsed, setCollapsed] =
    useState<boolean>(() =>
      window.localStorage.getItem(
        FAST_CLOCK_CARD_COLLAPSED_KEY
      ) === "true"
    );

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    setSpeedInput(snapshot.speed);
  }, [snapshot?.speed]);

  const runAction = async (
    action: () => Promise<NonNullable<typeof snapshot>>
  ) => {
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

  const toggleClock = () => {
    if (snapshot?.running) {
      void runAction(pauseFastClock);
      return;
    }

    void runAction(runFastClock);
  };

  const toggleCollapsed = () => {
    setCollapsed(current => {
      const next =
        !current;

      window.localStorage.setItem(
        FAST_CLOCK_CARD_COLLAPSED_KEY,
        String(next)
      );

      return next;
    });
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
      () => setFastClockSpeed(speed)
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
          wrap="nowrap"
        >
          <Text
            size="sm"
            fw={700}
          >
            Fast Clock
          </Text>

          <Group gap="xs" wrap="nowrap">
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
              {snapshot ? \`\${snapshot.speed}×\` : "-"}
            </Badge>

            <Tooltip
              label={
                collapsed
                  ? "Expand fast clock"
                  : "Collapse fast clock"
              }
            >
              <ActionIcon
                size="sm"
                variant="light"
                color="gray"
                onClick={toggleCollapsed}
              >
                <IconChevronDown
                  size={16}
                  style={{
                    transform: collapsed
                      ? "rotate(-90deg)"
                      : "rotate(0deg)",
                    transition: "transform 150ms ease",
                  }}
                />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Collapse in={!collapsed}>
          <Stack gap="sm">
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
                disabled={busy || !snapshot || !connected}
                onClick={toggleClock}
              >
                {snapshot?.running ? "Pause" : "Run"}
              </Button>

              <Button
                size="xs"
                variant="light"
                color="gray"
                leftSection={<IconRefresh size={16} />}
                disabled={busy || !snapshot || !connected}
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
                disabled={busy || !snapshot || !connected}
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
          </Stack>
        </Collapse>
      </Stack>
    </Card>
  );
}
`;

try {
  console.log("DCCExpressNext – Controller scroll + Fast Clock collapse patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  patchControlPanel();
  write(FILES.fastClockCard, FAST_CLOCK_CARD);

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
