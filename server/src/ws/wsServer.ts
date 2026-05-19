// server/src/ws/wsServer.ts

import type http from "node:http";

import {
  WebSocketServer,
  WebSocket,
} from "ws";

import type {
  WsMessage,
} from "../../../common/src/types.js";

import {
  CommandCenterConfig,
  readCommandCenter,
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
  log,
  logError,
} from "../utility.js";

import {
  railwayTopologyStore,
} from "../services/railwayTopologyStore.js";

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

let commandCenter: CommandCenter | null = null;

function initCommandCenter(
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
          broadcastAll
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

    broadcastAll({
      type: "blockStateChanged",
      data: Object.fromEntries(blocks),
    });

    for (const [, turnout] of turnouts) {
      broadcastAll({
        type: "turnoutChanged",
        data: turnout,
      });
    }
  });
}

function getLogicalTurnoutState(
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

setCommandCenterConfigLoadedCallback(
  (conf: CommandCenterConfig | null) => {
    log("Command center config loaded:", conf);
    initCommandCenter(conf);
  }
);

export function setupWebSocketServer(
  server: http.Server
): WebSocketServer {
  wss =
    new WebSocketServer({
      server,
      path: "/ws",
    });

  configureWebSocketRuntimes({
    broadcast: message => {
      broadcastAll(message);
    },

    getCommandCenter: () => commandCenter,
    getLogicalTurnoutState,
  });

  readCommandCenter()
    .then(async conf => {
      log(
        "Initial command center config:",
        conf
      );

      initCommandCenter(conf);

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
      commandCenter,
      sendToClient,
    });

    ws.on("message", async message => {
      const text =
        message.toString();

      log("WS incoming:", text);

      const currentCommandCenter =
        commandCenter;

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

      if (
        commandCenter &&
        clientUUID &&
        commandCenter.lockOwnerUUID === clientUUID
      ) {
        commandCenter.locked = false;
        commandCenter.lockOwnerUUID = null;

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
