#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
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

function write(file, content) {
  if (!fs.existsSync(file)) {
    fail(`Hiányzó fájl: ${path.relative(ROOT, file)}`);
  }

  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Frissítve: ${path.relative(ROOT, file)}`);
}

const CLIENT_STORE = `// client/src/services/fastClockStore.ts

import type {
  FastClockSnapshot,
} from "../../../common/src/fastClock";

import {
  getFastClockSnapshot,
} from "../api/fastClockApi";

import {
  wsClient,
  type WsConnectionStatus,
} from "./wsClient";

const DAY_MS =
  24 * 60 * 60 * 1000;

export type FastClockViewState = {
  snapshot: FastClockSnapshot | null;
  connected: boolean;
};

type FastClockListener =
  (state: FastClockViewState) => void;

class FastClockStore {
  private serverSnapshot: FastClockSnapshot | null = null;
  private receivedAtClientMs = 0;
  private listeners = new Set<FastClockListener>();
  private initialized = false;
  private loadingPromise: Promise<void> | null = null;
  private animationFrameId: number | null = null;
  private unsubscribeWs: (() => void) | null = null;
  private unsubscribeWsStatus: (() => void) | null = null;

  private connected =
    wsClient.getStatus() === "connected";

  subscribe(listener: FastClockListener): () => void {
    this.ensureInitialized();

    this.listeners.add(listener);
    listener(this.getViewState());

    this.ensureAnimationFrame();

    return () => {
      this.listeners.delete(listener);

      if (this.listeners.size === 0) {
        this.stopAnimationFrame();
      }
    };
  }

  getViewState(): FastClockViewState {
    return {
      snapshot: this.getDisplaySnapshot(),
      connected: this.connected,
    };
  }

  getDisplaySnapshot(): FastClockSnapshot | null {
    if (!this.serverSnapshot) {
      return null;
    }

    /**
     * Ha nincs élő WS kapcsolat, a szerver már nem hiteles időforrás.
     * Ilyenkor a legutolsó ismert kijelzett állapotot fagyasztjuk be,
     * és nem interpolálunk tovább.
     */
    if (
      !this.connected ||
      !this.serverSnapshot.running
    ) {
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
          this.connected = true;
          this.applyServerSnapshot(data);
        }
      );

    this.unsubscribeWsStatus =
      wsClient.subscribeStatus(status => {
        this.handleWsStatusChanged(status);
      });

    void this.ensureLoaded();
  }

  private handleWsStatusChanged(
    status: WsConnectionStatus
  ): void {
    const nextConnected =
      status === "connected";

    if (this.connected === nextConnected) {
      if (nextConnected) {
        void this.refreshFromHttp();
      }

      return;
    }

    /**
     * Disconnect előtt rögzítjük az éppen látott, interpolált időt.
     * Így nem a legutolsó régi szerver-snapshotra ugrik vissza,
     * hanem azon a pillanaton fagy meg, amit a felhasználó ténylegesen látott.
     */
    if (!nextConnected) {
      const frozen =
        this.getDisplaySnapshot();

      if (frozen) {
        this.serverSnapshot = {
          ...frozen,
        };

        this.receivedAtClientMs =
          performance.now();
      }

      this.connected = false;
      this.stopAnimationFrame();
      this.emit();

      return;
    }

    this.connected = true;
    this.emit();

    /**
     * Reconnectnél a szerver WS-en is küld snapshotot,
     * de HTTP fallbackkel azonnal bebiztosítjuk a visszaszinkront.
     */
    void this.refreshFromHttp();
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
      // WS reconnect vagy későbbi művelet majd helyrerakja.
    }
  }

  private ensureAnimationFrame(): void {
    if (
      this.animationFrameId !== null ||
      this.listeners.size === 0 ||
      !this.connected ||
      !this.serverSnapshot?.running
    ) {
      return;
    }

    const tick = () => {
      this.animationFrameId = null;

      this.emit();

      if (
        this.listeners.size > 0 &&
        this.connected &&
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
    const state =
      this.getViewState();

    for (const listener of this.listeners) {
      listener(state);
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

import {
  fastClockStore,
  type FastClockViewState,
} from "../services/fastClockStore";

export function useFastClock(): FastClockViewState {
  const [state, setState] =
    useState<FastClockViewState>(() =>
      fastClockStore.getViewState()
    );

  useEffect(() => {
    void fastClockStore.ensureLoaded();

    return fastClockStore.subscribe(setState);
  }, []);

  return state;
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
        ? \`FC \${formatFastClock(snapshot.timeMs)} · \${snapshot.speed}×\`
        : \`FC OFFLINE · \${formatFastClock(snapshot.timeMs)}\`
      : connected
        ? "FC --:--:--"
        : "FC OFFLINE";

  return (
    <Group gap="xs" wrap="nowrap">
      <Tooltip
        label={
          !connected
            ? "Fast Clock server disconnected"
            : snapshot
              ? \`Fast Clock · \${snapshot.running ? "running" : "paused"} · \${snapshot.speed}×\`
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
`;

try {
  console.log("DCCExpressNext – Fast Clock disconnect freeze patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

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
