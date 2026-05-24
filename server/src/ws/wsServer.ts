// server/src/ws/wsServer.ts

import type http from "node:http";

import {
  WebSocketServer,
  WebSocket,
} from "ws";

import type {
  TypedServerWsMessage,
} from "../../../common/src/types.js";

import {
  readCommandCenter,
} from "../services/commandCenterConfigStore.js";

import {
  editorEditModeStore,
} from "../services/editorEditModeStore.js";

import {
  log,
  logError,
} from "../utility.js";

import {
  appSettingsStore,
} from "../services/appSettingsStore.js";

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
  parseIncomingClientWsMessage,
} from "./wsIncomingClientMessageParser.js";

import {
  configureCommandCenterLifecycle,
  getCurrentCommandCenter,
  getLogicalTurnoutState,
  initializeCommandCenter,
  registerCommandCenterConfigLoadedCallback,
} from "./wsCommandCenterLifecycle.js";

function sendToClient(
  ws: WebSocket,
  message: TypedServerWsMessage
): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

let wss: WebSocketServer;

function broadcast(
  message: TypedServerWsMessage,
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

function canHandleWithoutCommandCenter(type: string): boolean {
  return (
    type === "layoutCommand" ||
    type === "locosCommand" ||
    type === "scriptDocumentCommand" ||
    type === "appSettingsCommand" ||
    type === "taskManagerCommand" ||
    type === "fastClockCommand" ||
    type === "fileCommand"
  );
}

export function broadcastAll(
  message: TypedServerWsMessage,
  exclude?: WebSocket
): void {
  broadcast(message, exclude);
}

async function initializeWebSocketRuntimeStores(): Promise<void> {
  await appSettingsStore.initialize();

  const conf =
    await readCommandCenter();

  log(
    "Initial command center config:",
    conf
  );

  await initializeCommandCenter(conf);

  await taskRuntimeStore.initialize();

  await scriptRuntimeStore.initialize();
  await scriptRuntimeStore.autoStartIfEnabled();
}

export async function setupWebSocketServer(
  server: http.Server
): Promise<WebSocketServer> {
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

  await initializeWebSocketRuntimeStores();

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

      const parseResult =
        parseIncomingClientWsMessage(text);

      if (!parseResult.ok) {
        sendToClient(ws, {
          type: "error",
          data: {
            message: parseResult.reason,
          },
        });

        return;
      }

      const msg =
        parseResult.message;

      clientUUID =
        msg.uuid;

      log("Received message of type:", msg.type);

      const currentCommandCenter =
        getCurrentCommandCenter();

      if (
        !currentCommandCenter &&
        !canHandleWithoutCommandCenter(msg.type)
      ) {
        sendToClient(ws, {
          type: "error",
          data: {
            message: "No command center available",
          },
        });

        return;
      }

      try {
        await routeIncomingWebSocketMessage({
          ws,
          msg,
          commandCenter: currentCommandCenter!,
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

      editorEditModeStore.removeClient(clientUUID);

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