#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  wsServer: path.join(
    ROOT,
    "server/src/ws/wsServer.ts"
  ),
  lifecycle: path.join(
    ROOT,
    "server/src/ws/wsCommandCenterLifecycle.ts"
  ),
};

function fail(message) {
  throw new Error(message);
}

function ensureExisting(file) {
  if (!fs.existsSync(file)) {
    fail(`Hiányzó fájl: ${path.relative(ROOT, file)}`);
  }
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Írva: ${path.relative(ROOT, file)}`);
}

const LIFECYCLE = `// server/src/ws/wsCommandCenterLifecycle.ts

import type {
  CommandCenterConfig,
} from "../routes/commandCenterRoutes.js";

import {
  setCommandCenterConfigLoadedCallback,
} from "../routes/commandCenterRoutes.js";

import {
  CommandCenter,
} from "../commandCenter/CommandCenter.js";

import {
  CommandCenterSimulator,
} from "../commandCenter/simulator.js";

import {
  Z21CommandCenter,
} from "../commandCenter/z21CommandCenter.js";

import {
  railwayTopologyStore,
} from "../services/railwayTopologyStore.js";

import {
  log,
} from "../utility.js";

type BroadcastMessage = (
  message: unknown
) => void;

let commandCenter: CommandCenter | null = null;
let broadcast: BroadcastMessage | null = null;
let configLoadedCallbackRegistered = false;

export function configureCommandCenterLifecycle(params: {
  broadcast: BroadcastMessage;
}): void {
  broadcast =
    params.broadcast;
}

export function getCurrentCommandCenter(): CommandCenter | null {
  return commandCenter;
}

export function initializeCommandCenter(
  conf: CommandCenterConfig | null
): void {
  if (commandCenter) {
    commandCenter
      .stop()
      .then(() => {
        log("Previous command center stopped");
      });
  }

  switch (conf?.type) {
    case "simulator":
      log("Starting command center:", conf.type);

      commandCenter =
        new CommandCenterSimulator("Simulator");

      commandCenter
        .start()
        .then(() => {
          log("Command center started:", conf.type);
        })
        .catch(err => {
          console.error("Failed to start command center:", err);
        });

      break;

    case "z21":
      log("Starting command center:", "Z21");

      commandCenter =
        new Z21CommandCenter(
          "Z21",
          conf.z21.host!,
          conf.z21.port!,
          message => {
            broadcast?.(message);
          }
        );

      commandCenter
        .start()
        .then(() => {
          log("Command center started:", conf?.type);
        })
        .catch(err => {
          console.error("Failed to start command center:", err);
        });

      break;

    default:
      commandCenter =
        new CommandCenterSimulator("Simulator");

      break;
  }

  commandCenter.onRuntimeStateLoaded((blocks, turnouts) => {
    console.log("[Server] Restored runtime state, rebroadcasting...");

    broadcast?.({
      type: "blockStateChanged",
      data: Object.fromEntries(blocks),
    });

    for (const [, turnout] of turnouts) {
      broadcast?.({
        type: "turnoutChanged",
        data: turnout,
      });
    }
  });
}

export function getLogicalTurnoutState(
  address: number
): boolean | null {
  const physicalClosed =
    commandCenter
      ?.getTurnoutInfo(address)
      ?.closed;

  if (typeof physicalClosed !== "boolean") {
    return null;
  }

  const topology =
    railwayTopologyStore.getTopology();

  if (!topology) {
    return null;
  }

  const turnout =
    topology
      .getTurnouts()
      .find(
        item => item.turnoutAddress === address
      );

  if (!turnout) {
    return null;
  }

  /**
   * Fizikai command-center állapotból
   * vissza logikai C/T állapot.
   */
  return (
    physicalClosed === turnout.turnoutClosedValue
  );
}

export function registerCommandCenterConfigLoadedCallback(): void {
  if (configLoadedCallbackRegistered) {
    return;
  }

  configLoadedCallbackRegistered = true;

  setCommandCenterConfigLoadedCallback(
    (conf: CommandCenterConfig | null) => {
      log("Command center config loaded:", conf);
      initializeCommandCenter(conf);
    }
  );
}
`;

const WS_SERVER = `// server/src/ws/wsServer.ts

import type http from "node:http";

import {
  WebSocketServer,
  WebSocket,
} from "ws";

import type {
  WsMessage,
} from "../../../common/src/types.js";

import {
  readCommandCenter,
} from "../routes/commandCenterRoutes.js";

import {
  log,
  logError,
} from "../utility.js";

import {
  scriptRuntimeStore,
} from "../services/scriptRuntimeStore.js";

import {
  taskRuntimeStore,
} from "../services/taskRuntimeStore.js";

import {
  configureWebSocketRuntimes,
} from "./wsRuntimeConfiguration.js";

import {
  sendInitialWebSocketSnapshots,
} from "./wsInitialSnapshots.js";

import {
  routeIncomingWebSocketMessage,
} from "./wsMessageRouter.js";

import {
  configureCommandCenterLifecycle,
  getCurrentCommandCenter,
  getLogicalTurnoutState,
  initializeCommandCenter,
  registerCommandCenterConfigLoadedCallback,
} from "./wsCommandCenterLifecycle.js";

function sendToClient(
  ws: WebSocket,
  message: unknown
): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

let wss: WebSocketServer;

function broadcast(
  message: unknown,
  exclude?: WebSocket
): void {
  const text =
    JSON.stringify(message);

  for (const client of wss.clients) {
    if (
      client !== exclude &&
      client.readyState === WebSocket.OPEN
    ) {
      client.send(text);
    }
  }
}

export function broadcastAll(
  message: unknown,
  exclude?: WebSocket
): void {
  broadcast(message, exclude);
}

export function setupWebSocketServer(
  server: http.Server
): WebSocketServer {
  wss =
    new WebSocketServer({
      server,
      path: "/ws",
    });

  configureCommandCenterLifecycle({
    broadcast: message => {
      broadcastAll(message);
    },
  });

  registerCommandCenterConfigLoadedCallback();

  configureWebSocketRuntimes({
    broadcast: message => {
      broadcastAll(message);
    },

    getCommandCenter: getCurrentCommandCenter,
    getLogicalTurnoutState,
  });

  readCommandCenter()
    .then(async conf => {
      log(
        "Initial command center config:",
        conf
      );

      initializeCommandCenter(conf);

      await scriptRuntimeStore.initialize();
      await scriptRuntimeStore.autoStartIfEnabled();

      await taskRuntimeStore.initialize();
    })
    .catch(err => {
      logError(
        "Failed to read initial command center config:",
        err
      );
    });

  wss.on("connection", (ws, req) => {
    log(
      "WebSocket client connected:",
      req.socket.remoteAddress
    );

    let clientUUID: string | null = null;

    sendInitialWebSocketSnapshots({
      ws,
      commandCenter: getCurrentCommandCenter(),
      sendToClient,
    });

    ws.on("message", async message => {
      const text =
        message.toString();

      log("WS incoming:", text);

      const currentCommandCenter =
        getCurrentCommandCenter();

      if (!currentCommandCenter) {
        sendToClient(ws, {
          type: "error",
          data: {
            message: "No command center available",
          },
        });

        return;
      }

      try {
        const msg =
          JSON.parse(text) as WsMessage;

        if (msg.uuid) {
          clientUUID =
            msg.uuid;
        }

        log("Received message of type:", msg.type);

        await routeIncomingWebSocketMessage({
          ws,
          msg,
          commandCenter: currentCommandCenter,
          sendToClient,
          broadcast: broadcastAll,
        });
      } catch (error) {
        sendToClient(ws, {
          type: "error",
          data: {
            message: String(error),
          },
        });
      }
    });

    ws.on("close", () => {
      log("WebSocket client disconnected");

      const currentCommandCenter =
        getCurrentCommandCenter();

      if (
        currentCommandCenter &&
        clientUUID &&
        currentCommandCenter.lockOwnerUUID === clientUUID
      ) {
        currentCommandCenter.locked = false;
        currentCommandCenter.lockOwnerUUID = null;

        broadcastAll({
          type: "commandCenterLockChanged",
          data: {
            locked: false,
            lockOwner: null,
          },
        });
      }
    });

    ws.on("error", error => {
      console.error("WebSocket client error:", error);
    });
  });

  return wss;
}
`;

try {
  console.log("DCCExpressNext – WS command center lifecycle refactor patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  ensureExisting(FILES.wsServer);

  write(FILES.lifecycle, LIFECYCLE);
  write(FILES.wsServer, WS_SERVER);

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
