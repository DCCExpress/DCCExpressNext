#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  serverStore: path.join(
    ROOT,
    "server/src/services/fastClockRuntimeStore.ts"
  ),
  wsServer: path.join(
    ROOT,
    "server/src/ws/wsServer.ts"
  ),
  clientStore: path.join(
    ROOT,
    "client/src/services/fastClockStore.ts"
  ),
  clientHook: path.join(
    ROOT,
    "client/src/hooks/useFastClock.ts"
  ),
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

const SERVER_STORE = `// server/src/services/fastClockRuntimeStore.ts

import type {
  FastClockSnapshot,
} from "../../../common/src/fastClock.js";

const DAY_MS =
  24 * 60 * 60 * 1000;

type FastClockBroadcast =
  (message: unknown) => void;

type FastClockRuntimeStoreParams = {
  broadcast?: FastClockBroadcast;
};

class FastClockRuntimeStore {
  private timeMs = 0;
  private speed = 1;
  private running = false;
  private lastRealTimestampMs = Date.now();
  private broadcast?: FastClockBroadcast;

  configure(params: FastClockRuntimeStoreParams): void {
    this.broadcast =
      params.broadcast;
  }

  getSnapshot(): FastClockSnapshot {
    this.syncFromRealTime();

    return {
      timeMs: Math.floor(this.timeMs),
      running: this.running,
      speed: this.speed,
      serverNowMs: Date.now(),
    };
  }

  run(): FastClockSnapshot {
    this.syncFromRealTime();
    this.running = true;
    this.lastRealTimestampMs = Date.now();

    return this.broadcastSnapshot();
  }

  pause(): FastClockSnapshot {
    this.syncFromRealTime();
    this.running = false;
    this.lastRealTimestampMs = Date.now();

    return this.broadcastSnapshot();
  }

  reset(): FastClockSnapshot {
    this.timeMs = 0;
    this.running = false;
    this.lastRealTimestampMs = Date.now();

    return this.broadcastSnapshot();
  }

  setSpeed(speed: number): FastClockSnapshot {
    this.syncFromRealTime();

    this.speed =
      Number.isFinite(speed)
        ? Math.max(1, speed)
        : 1;

    this.lastRealTimestampMs = Date.now();

    return this.broadcastSnapshot();
  }

  private broadcastSnapshot(): FastClockSnapshot {
    const snapshot =
      this.getSnapshot();

    this.broadcast?.({
      type: "fastClockChanged",
      data: snapshot,
    });

    return snapshot;
  }

  private syncFromRealTime(): void {
    const now = Date.now();

    if (this.running) {
      const elapsedRealMs =
        Math.max(
          0,
          now - this.lastRealTimestampMs
        );

      this.timeMs =
        this.normalizeDayTime(
          this.timeMs + elapsedRealMs * this.speed
        );
    }

    this.lastRealTimestampMs = now;
  }

  private normalizeDayTime(value: number): number {
    const normalized =
      value % DAY_MS;

    return normalized < 0
      ? normalized + DAY_MS
      : normalized;
  }
}

export const fastClockRuntimeStore =
  new FastClockRuntimeStore();
`;

const CLIENT_STORE = `// client/src/services/fastClockStore.ts

import type {
  FastClockSnapshot,
} from "../../../common/src/fastClock";

import {
  getFastClockSnapshot,
} from "../api/fastClockApi";

import {
  wsClient,
} from "./wsClient";

const DAY_MS =
  24 * 60 * 60 * 1000;

type FastClockListener =
  (snapshot: FastClockSnapshot | null) => void;

class FastClockStore {
  private serverSnapshot: FastClockSnapshot | null = null;
  private receivedAtClientMs = 0;
  private listeners = new Set<FastClockListener>();
  private initialized = false;
  private loadingPromise: Promise<void> | null = null;
  private animationFrameId: number | null = null;
  private unsubscribeWs: (() => void) | null = null;
  private unsubscribeWsStatus: (() => void) | null = null;

  subscribe(listener: FastClockListener): () => void {
    this.ensureInitialized();

    this.listeners.add(listener);
    listener(this.getDisplaySnapshot());

    this.ensureAnimationFrame();

    return () => {
      this.listeners.delete(listener);

      if (this.listeners.size === 0) {
        this.stopAnimationFrame();
      }
    };
  }

  getDisplaySnapshot(): FastClockSnapshot | null {
    if (!this.serverSnapshot) {
      return null;
    }

    if (!this.serverSnapshot.running) {
      return {
        ...this.serverSnapshot,
      };
    }

    const elapsedClientMs =
      Math.max(
        0,
        performance.now() - this.receivedAtClientMs
      );

    return {
      ...this.serverSnapshot,
      timeMs:
        this.normalizeDayTime(
          this.serverSnapshot.timeMs +
            elapsedClientMs * this.serverSnapshot.speed
        ),
    };
  }

  applyServerSnapshot(snapshot: FastClockSnapshot): void {
    if (!this.isValidSnapshot(snapshot)) {
      return;
    }

    this.serverSnapshot = {
      ...snapshot,
      speed: Math.max(1, snapshot.speed),
    };

    this.receivedAtClientMs =
      performance.now();

    this.emit();
    this.ensureAnimationFrame();
  }

  async ensureLoaded(): Promise<void> {
    this.ensureInitialized();

    if (this.serverSnapshot) {
      return;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise =
      this.loadInitialSnapshot();

    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  private ensureInitialized(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    this.unsubscribeWs =
      wsClient.on<FastClockSnapshot>(
        "fastClockChanged",
        data => {
          this.applyServerSnapshot(data);
        }
      );

    /**
     * Reconnect után a szerver eleve küld fastClockChanged snapshotot,
     * de egy HTTP fallbackkel bebiztosítjuk, hogy a store ne maradjon üresen.
     */
    this.unsubscribeWsStatus =
      wsClient.subscribeStatus(status => {
        if (status === "connected") {
          void this.refreshFromHttp();
        }
      });

    void this.ensureLoaded();
  }

  private async loadInitialSnapshot(): Promise<void> {
    await this.refreshFromHttp();
  }

  private async refreshFromHttp(): Promise<void> {
    try {
      const snapshot =
        await getFastClockSnapshot();

      this.applyServerSnapshot(snapshot);
    } catch {
      // A komponens ettől még életben marad,
      // WS reconnect vagy későbbi vezérlőművelet helyrerakja.
    }
  }

  private ensureAnimationFrame(): void {
    if (
      this.animationFrameId !== null ||
      this.listeners.size === 0 ||
      !this.serverSnapshot?.running
    ) {
      return;
    }

    const tick = () => {
      this.animationFrameId = null;

      this.emit();

      if (
        this.listeners.size > 0 &&
        this.serverSnapshot?.running
      ) {
        this.animationFrameId =
          window.requestAnimationFrame(tick);
      }
    };

    this.animationFrameId =
      window.requestAnimationFrame(tick);
  }

  private stopAnimationFrame(): void {
    if (this.animationFrameId === null) {
      return;
    }

    window.cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  private emit(): void {
    const snapshot =
      this.getDisplaySnapshot();

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private normalizeDayTime(value: number): number {
    const normalized =
      value % DAY_MS;

    return normalized < 0
      ? normalized + DAY_MS
      : normalized;
  }

  private isValidSnapshot(
    snapshot: FastClockSnapshot | null | undefined
  ): snapshot is FastClockSnapshot {
    return (
      !!snapshot &&
      typeof snapshot.timeMs === "number" &&
      typeof snapshot.running === "boolean" &&
      typeof snapshot.speed === "number" &&
      typeof snapshot.serverNowMs === "number"
    );
  }
}

export const fastClockStore =
  new FastClockStore();
`;

const CLIENT_HOOK = `// client/src/hooks/useFastClock.ts

import {
  useEffect,
  useState,
} from "react";

import type {
  FastClockSnapshot,
} from "../../../common/src/fastClock";

import {
  fastClockStore,
} from "../services/fastClockStore";

export function useFastClock() {
  const [snapshot, setSnapshot] =
    useState<FastClockSnapshot | null>(() =>
      fastClockStore.getDisplaySnapshot()
    );

  useEffect(() => {
    void fastClockStore.ensureLoaded();

    return fastClockStore.subscribe(setSnapshot);
  }, []);

  return snapshot;
}
`;

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
  const snapshot =
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
            disabled={busy || !snapshot}
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
            disabled={busy || !snapshot}
            onClick={applySpeed}
          >
            Set speed
          </Button>
        </Group>

        <Text
          size="xs"
          c="dimmed"
        >
          Server-synced over WebSocket, rendered smoothly in the client.
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
  const snapshot =
    useFastClock();

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
      ? \`FC \${formatFastClock(snapshot.timeMs)} · \${snapshot.speed}×\`
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
          color={snapshot?.running ? "green" : "yellow"}
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

function patchWsServer() {
  let source = read(FILES.wsServer);
  const eol = getEol(source);

  if (!source.includes('import { fastClockRuntimeStore } from "../services/fastClockRuntimeStore.js";')) {
    const importMarker =
      'import { taskRuntimeStore } from "../services/taskRuntimeStore.js";';

    source = insertAfter(
      source,
      importMarker,
      `${eol}import { fastClockRuntimeStore } from "../services/fastClockRuntimeStore.js";`,
      "wsServer fastClockRuntimeStore import"
    );
  } else {
    console.log("• wsServer fastClockRuntimeStore import már megvan.");
  }

  if (!source.includes("function configureFastClockRuntime()")) {
    const marker =
      "function configureTaskRuntime() {";

    const insertion = [
      "function configureFastClockRuntime() {",
      "  fastClockRuntimeStore.configure({",
      "    broadcast: message => {",
      "      broadcastAll(message);",
      "    },",
      "  });",
      "}",
      "",
    ].join(eol);

    const index = source.indexOf(marker);

    if (index < 0) {
      fail("wsServer: nem találtam a configureTaskRuntime() beszúrási pontot.");
    }

    source =
      source.slice(0, index) +
      insertion +
      source.slice(index);
  } else {
    console.log("• wsServer configureFastClockRuntime már megvan.");
  }

  if (!source.includes("  configureFastClockRuntime();")) {
    const setupMarker =
      [
        "  configureScriptRuntime();",
        "  configureTaskRuntime();",
      ].join(eol);

    source = source.replace(
      setupMarker,
      [
        "  configureScriptRuntime();",
        "  configureTaskRuntime();",
        "  configureFastClockRuntime();",
      ].join(eol)
    );

    if (!source.includes("  configureFastClockRuntime();")) {
      fail("wsServer: nem sikerült beszúrni a configureFastClockRuntime() hívást.");
    }
  } else {
    console.log("• wsServer configureFastClockRuntime() hívás már megvan.");
  }

  if (!source.includes('type: "fastClockChanged"')) {
    const snapshotMarker = [
      "    sendToClient(ws, {",
      '      type: "taskManagerSnapshotChanged",',
      "      data: taskRuntimeStore.getSnapshot(),",
      "    });",
    ].join(eol);

    const insertion = [
      snapshotMarker,
      "",
      "    sendToClient(ws, {",
      '      type: "fastClockChanged",',
      "      data: fastClockRuntimeStore.getSnapshot(),",
      "    });",
    ].join(eol);

    if (!source.includes(snapshotMarker)) {
      fail("wsServer: nem találtam a taskManagerSnapshotChanged kezdeti snapshot blokkot.");
    }

    source =
      source.replace(
        snapshotMarker,
        insertion
      );
  } else {
    console.log("• wsServer fastClockChanged connection snapshot már megvan.");
  }

  write(FILES.wsServer, source);
}

try {
  console.log("DCCExpressNext – Fast Clock WebSocket smooth patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  write(FILES.serverStore, SERVER_STORE);
  patchWsServer();

  write(FILES.clientStore, CLIENT_STORE);
  write(FILES.clientHook, CLIENT_HOOK);
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
