// server/src/ws/wsServer.ts

import type http from "node:http";

import {
  WebSocketServer,
  WebSocket,
  type RawData,
} from "ws";

import type {
  TypedServerWsMessage,
} from "../../../common/src/types.js";

import {
  readCommandCenter,
} from "../services/commandCenterConfigStore.js";

import {
  blockAutomationStore,
} from "../services/blockAutomationStore.js";

import {
  automationFlowStore,
} from "../services/automationFlowStore.js";

import {
  automationFlowRuntimeService,
} from "../services/automationFlowRuntimeService.js";

import {
  editorEditModeStore,
} from "../services/editorEditModeStore.js";

import {
  log,
  logError,
  logWs,
} from "../utility.js";

import {
  appSettingsStore,
} from "../services/appSettingsStore.js";

import {
  layoutRuntimeStore,
} from "../services/layoutRuntimeStore.js";

import {
  scriptRuntimeStore,
} from "../services/scriptRuntimeStore.js";

import {
  taskRuntimeStore,
} from "../services/taskRuntimeStore.js";

import {
  wsTrafficStatsStore,
} from "../services/wsTrafficStatsStore.js";

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
  parseIncomingClientWsMessageWithRuntimeActions,
} from "./wsIncomingClientMessageParserRuntimePatch.js";

import {
  configureCommandCenterLifecycle,
  getCurrentCommandCenter,
  getLogicalTurnoutState,
  initializeCommandCenter,
  registerCommandCenterConfigLoadedCallback,
} from "./wsCommandCenterLifecycle.js";

function getByteLength(value: RawData): number {
  if (typeof value === "string") {
    return Buffer.byteLength(value, "utf8");
  }

  if (Buffer.isBuffer(value)) {
    return value.byteLength;
  }

  if (Array.isArray(value)) {
    return value.reduce(
      (total, item) => total + item.byteLength,
      0
    );
  }

  return value.byteLength;
}

function sendTextToClient(
  ws: WebSocket,
  text: string
): void {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }

  wsTrafficStatsStore.recordSentBytes(
    Buffer.byteLength(text, "utf8")
  );

  ws.send(text, error => {
    if (error) {
      logError("WebSocket send failed:", error);
    }
  });
}

function sendToClient(
  ws: WebSocket,
  message: TypedServerWsMessage
): void {
  sendTextToClient(
    ws,
    JSON.stringify(message)
  );
}

let wss: WebSocketServer;

function broadcast(
  message: TypedServerWsMessage,
  exclude?: WebSocket
): void {
  const text =
    JSON.stringify(message);

  for (const client of wss.clients) {
    if (client !== exclude) {
      sendTextToClient(client, text);
    }
  }
}

function canHandleWithoutCommandCenter(type: string): boolean {
  return (
    type === "layoutCommand" ||
    type === "locosCommand" ||
    type === "scriptDocumentCommand" ||
    type === "appSettingsCommand" ||
    type === "blockAutomationCommand" ||
    type === "automationFlowCommand" ||
    type === "taskManagerCommand" ||
    type === "fastClockCommand" ||
    type === "fileCommand"
  );
}

function shouldEvaluateAutomationAfterClientCommand(type: string): boolean {
  return type === "setTurnout" ||
    type === "setSensor" ||
    type === "setBasicAccessory";
}

export function broadcastAll(
  message: TypedServerWsMessage,
  exclude?: WebSocket
): void {
  automationFlowRuntimeService.handleRuntimeEvent(message);
  broadcast(message, exclude);
}

async function initializeWebSocketRuntimeStores(): Promise<void> {
  await appSettingsStore.initialize();

  await layoutRuntimeStore.initialize();

  await blockAutomationStore.initialize();

  await automationFlowStore.initialize();

  const conf =
    await readCommandCenter();

  log(
    "Initial command center config:",
    conf
  );

  await initializeCommandCenter(conf);
  await automationFlowRuntimeService.initializeAndEvaluate("startup");

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
    logWs(
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
      wsTrafficStatsStore.recordReceivedBytes(
        getByteLength(message)
      );

      const text =
        message.toString();

      logWs("incoming:", text);

      const parseResult =
        parseIncomingClientWsMessageWithRuntimeActions(text);

      if (!parseResult.ok) {
        logError("Invalid WebSocket message:", parseResult.reason);

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

      logWs("received message type:", msg.type);

      const currentCommandCenter =
        getCurrentCommandCenter();

      if (
        !currentCommandCenter &&
        !canHandleWithoutCommandCenter(msg.type)
      ) {
        logError(
          "WebSocket message rejected: no command center available for type",
          msg.type
        );

        sendToClient(ws, {
          type: "error",
          data: {
            message: `No command center available for ${msg.type}.`,
          },
        });

        return;
      }

      await routeIncomingWebSocketMessage({
        ws,
        msg,
        commandCenter: currentCommandCenter,
        sendToClient,
        broadcast,
      });

      if (shouldEvaluateAutomationAfterClientCommand(msg.type)) {
        void automationFlowRuntimeService.evaluate(`client:${msg.type}`).catch(error => {
          logError("[AutomationFlowRuntime] Client command evaluation failed:", error);
        });
      }
    });

    ws.on("close", () => {
      logWs("WebSocket client disconnected:", clientUUID);
      editorEditModeStore.removeClient(clientUUID);
    });
  });

  return wss;
}
