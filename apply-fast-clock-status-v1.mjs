#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  statusComponent: path.join(
    ROOT,
    "client/src/components/common/FastClockStatus.tsx"
  ),
  statusBar: path.join(
    ROOT,
    "client/src/layout/StatusBar.tsx"
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
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Írva: ${path.relative(ROOT, file)}`);
}

function getEol(source) {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

function insertAfter(source, marker, insertion, label) {
  const index = source.indexOf(marker);

  if (index < 0) {
    fail(`${label}: nem találtam a beszúrási pontot.`);
  }

  return (
    source.slice(0, index + marker.length) +
    insertion +
    source.slice(index + marker.length)
  );
}

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
} from "@tabler/icons-react";

import type {
  FastClockSnapshot,
} from "../../../../common/src/fastClock";

import {
  getFastClockSnapshot,
  pauseFastClock,
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

  const toggleClock = async () => {
    if (!snapshot || busy) {
      return;
    }

    setBusy(true);

    try {
      const next =
        snapshot.running
          ? await pauseFastClock()
          : await runFastClock();

      setSnapshot(next);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setBusy(false);
    }
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
          onClick={() => {
            void toggleClock();
          }}
        >
          {snapshot?.running ? (
            <IconPlayerPauseFilled size={14} />
          ) : (
            <IconPlayerPlayFilled size={14} />
          )}
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
`;

function patchStatusBar() {
  let source = read(FILES.statusBar);
  const eol = getEol(source);

  if (!source.includes('import FastClockStatus from "../components/common/FastClockStatus";')) {
    const importMarker =
      'import ScriptEditorDialog from "../components/ScriptEditorDialog";';

    source = insertAfter(
      source,
      importMarker,
      `${eol}import FastClockStatus from "../components/common/FastClockStatus";`,
      "StatusBar FastClockStatus import"
    );
  } else {
    console.log("• StatusBar FastClockStatus import már megvan.");
  }

  if (!source.includes("<FastClockStatus />")) {
    const marker = [
      "        <Divider orientation=\"vertical\" />",
      "",
      "        <Badge color={getMemoryColor(browserStats.memoryUsedMb)} variant=\"filled\">",
    ].join(eol);

    const insertion = [
      "        <Divider orientation=\"vertical\" />",
      "",
      "        <FastClockStatus />",
      "",
      "        <Divider orientation=\"vertical\" />",
      "",
      "        <Badge color={getMemoryColor(browserStats.memoryUsedMb)} variant=\"filled\">",
    ].join(eol);

    if (!source.includes(marker)) {
      fail("StatusBar: nem találtam a browser stats előtti Divider/Badge blokkot.");
    }

    source = source.replace(marker, insertion);
  } else {
    console.log("• StatusBar FastClockStatus már be van szúrva.");
  }

  write(FILES.statusBar, source);
}

try {
  console.log("DCCExpressNext – Fast Clock status bar patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  write(FILES.statusComponent, FAST_CLOCK_STATUS);
  patchStatusBar();

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
