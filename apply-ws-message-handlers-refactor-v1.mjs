#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  wsServer: path.join(
    ROOT,
    "server/src/ws/wsServer.ts"
  ),
  router: path.join(
    ROOT,
    "server/src/ws/wsMessageRouter.ts"
  ),
  handlerTypes: path.join(
    ROOT,
    "server/src/ws/handlers/wsHandlerTypes.ts"
  ),
  lockHandlers: path.join(
    ROOT,
    "server/src/ws/handlers/wsLockMessageHandlers.ts"
  ),
  routeHandlers: path.join(
    ROOT,
    "server/src/ws/handlers/wsRouteMessageHandlers.ts"
  ),
  commandCenterHandlers: path.join(
    ROOT,
    "server/src/ws/handlers/wsCommandCenterMessageHandlers.ts"
  ),
  scriptHandlers: path.join(
    ROOT,
    "server/src/ws/handlers/wsScriptMessageHandlers.ts"
  ),
  taskHandlers: path.join(
    ROOT,
    "server/src/ws/handlers/wsTaskMessageHandlers.ts"
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

const HANDLER_TYPES = `// server/src/ws/handlers/wsHandlerTypes.ts

import type {
  WebSocket,
} from "ws";

import type {
  CommandCenter,
} from "../../commandCenter/CommandCenter.js";

import type {
  WsMessage,
} from "../../../../common/src/types.js";

export type SendToClient = (
  ws: WebSocket,
  message: unknown
) => void;

export type BroadcastToClients = (
  message: unknown,
  exclude?: WebSocket
) => void;

export type WsHandlerContext = {
  ws: WebSocket;
  msg: WsMessage;
  commandCenter: CommandCenter;
  sendToClient: SendToClient;
  broadcast: BroadcastToClients;
};

export type WsMessageHandler = (
  context: WsHandlerContext
) => Promise<boolean> | boolean;
`;

const LOCK_HANDLERS = `// server/src/ws/handlers/wsLockMessageHandlers.ts

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

export const handleLockMessage: WsMessageHandler = ({
  ws,
  msg,
  commandCenter,
  sendToClient,
  broadcast,
}) => {
  switch (msg.type) {
    case "routeLock": {
      if (
        commandCenter.locked &&
        commandCenter.lockOwnerUUID !== msg.uuid
      ) {
        sendToClient(ws, {
          type: "commandRejected",
          uuid: msg.uuid,
          data: {
            reason: "Command center busy",
            lockOwner: commandCenter.lockOwnerUUID,
          },
        });

        return true;
      }

      commandCenter.locked = true;
      commandCenter.lockOwnerUUID = msg.uuid;

      broadcast({
        type: "commandCenterLockChanged",
        data: {
          locked: true,
          lockOwner: commandCenter.lockOwnerUUID,
        },
      });

      return true;
    }

    case "routeUnlock": {
      if (commandCenter.lockOwnerUUID === msg.uuid) {
        commandCenter.locked = false;
        commandCenter.lockOwnerUUID = null;

        broadcast({
          type: "commandCenterLockChanged",
          data: {
            locked: false,
            lockOwner: null,
          },
        });
      }

      return true;
    }

    default:
      return false;
  }
};
`;

const ROUTE_HANDLERS = `// server/src/ws/handlers/wsRouteMessageHandlers.ts

import {
  routeGraphRuntimeStore,
} from "../../services/routeGraphRuntimeStore.js";

import {
  railwayTopologyStore,
} from "../../services/railwayTopologyStore.js";

import {
  logError,
} from "../../utility.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

export const handleRouteMessage: WsMessageHandler = async ({
  ws,
  msg,
  commandCenter,
  sendToClient,
  broadcast,
}) => {
  switch (msg.type) {
    case "reserveRoute": {
      const fromBlockName =
        msg.data?.fromBlockName;

      const toBlockName =
        msg.data?.toBlockName;

      if (
        typeof fromBlockName !== "string" ||
        typeof toBlockName !== "string"
      ) {
        sendToClient(ws, {
          type: "routeReservationRejected",
          data: {
            reason: "Invalid reserveRoute payload.",
          },
        });

        return true;
      }

      const graph =
        routeGraphRuntimeStore.getGraph();

      if (!graph) {
        sendToClient(ws, {
          type: "routeReservationRejected",
          data: {
            reason: "Nincs aktív szerveroldali route graph.",
          },
        });

        return true;
      }

      const solution =
        graph.findRouteBetweenBlockNames(
          fromBlockName,
          toBlockName
        );

      if (!solution) {
        sendToClient(ws, {
          type: "routeReservationRejected",
          data: {
            reason: \`Nincs útvonal: \${fromBlockName} → \${toBlockName}\`,
          },
        });

        return true;
      }

      const topology =
        railwayTopologyStore.getTopology();

      if (!topology) {
        sendToClient(ws, {
          type: "routeReservationRejected",
          data: {
            reason: "Nincs aktív szerveroldali topology.",
          },
        });

        return true;
      }

      const reservation =
        routeGraphRuntimeStore.tryReserveRoute(
          fromBlockName,
          toBlockName,
          solution
        );

      if (!reservation.ok) {
        sendToClient(ws, {
          type: "routeReservationRejected",
          data: {
            reason: reservation.error,
          },
        });

        return true;
      }

      /**
       * A route foglalása már sikerült,
       * ezt rögtön broadcastoljuk minden kliensnek.
       */
      broadcast({
        type: "routeReservationChanged",
        data: {
          busy: true,
          sectionNames:
            reservation.reservation.sectionNames,
          elementIds:
            routeGraphRuntimeStore.getElementIdsForSections(
              reservation.reservation.sectionNames
            ),
          turnoutAddresses:
            reservation.reservation.turnoutAddresses,
          fromBlockName,
          toBlockName,
        },
      });

      /**
       * A fizikai váltóállítás idejére lockoljuk a command centert.
       * Ettől villog a StatusBar busy/lock jelzése.
       */
      commandCenter.locked = true;
      commandCenter.lockOwnerUUID = msg.uuid;

      broadcast({
        type: "commandCenterLockChanged",
        data: {
          locked: true,
          lockOwner: commandCenter.lockOwnerUUID,
          reason: "route",
        },
      });

      try {
        /**
         * A graph logikai closed értékét átfordítjuk
         * az adott váltó fizikai command-center boolean értékére.
         */
        for (const turnoutState of solution.turnoutStates) {
          const turnout =
            topology
              .getTurnouts()
              .find(
                item =>
                  item.turnoutAddress === turnoutState.address
              );

          if (!turnout) {
            logError(
              \`[RouteReserve] Turnout not found in topology: \${turnoutState.address}\`
            );

            continue;
          }

          const physicalClosed =
            turnoutState.closed === turnout.turnoutClosedValue;

          await commandCenter.setTurnout(
            turnoutState.address,
            physicalClosed
          );

          commandCenter.saveRuntimeState();

          await new Promise<void>(resolve =>
            setTimeout(resolve, 500)
          );
        }
      } finally {
        /**
         * A műveleti lockot akkor is elengedjük,
         * ha váltóállítás közben történik valami gebasz.
         *
         * FONTOS:
         * Ez csak a command center lock,
         * maga a route reservation továbbra is megmarad.
         */
        commandCenter.locked = false;
        commandCenter.lockOwnerUUID = null;

        broadcast({
          type: "commandCenterLockChanged",
          data: {
            locked: false,
            lockOwner: null,
            reason: null,
          },
        });
      }

      return true;
    }

    case "releaseRouteReservation": {
      const fromBlockName =
        msg.data?.fromBlockName;

      const toBlockName =
        msg.data?.toBlockName;

      if (
        typeof fromBlockName !== "string" ||
        typeof toBlockName !== "string"
      ) {
        sendToClient(ws, {
          type: "routeReservationReleaseRejected",
          data: {
            reason: "Invalid releaseRouteReservation payload.",
          },
        });

        return true;
      }

      const result =
        routeGraphRuntimeStore.releaseRouteReservation(
          fromBlockName,
          toBlockName
        );

      if (!result.ok) {
        sendToClient(ws, {
          type: "routeReservationReleaseRejected",
          data: {
            reason: result.error,
          },
        });

        return true;
      }

      broadcast({
        type: "routeReservationChanged",
        data: {
          busy: false,
          sectionNames: result.releasedSectionNames,
          elementIds:
            routeGraphRuntimeStore.getElementIdsForSections(
              result.releasedSectionNames
            ),
          turnoutAddresses:
            result.releasedTurnoutAddresses,
          fromBlockName,
          toBlockName,
        },
      });

      sendToClient(ws, {
        type: "routeReservationReleased",
        data: {
          fromBlockName,
          toBlockName,
          releasedSectionNames: result.releasedSectionNames,
          retainedSectionNames: result.retainedSectionNames,
          releasedTurnoutAddresses:
            result.releasedTurnoutAddresses,
          retainedTurnoutAddresses:
            result.retainedTurnoutAddresses,
        },
      });

      return true;
    }

    case "clearAllRouteReservations": {
      routeGraphRuntimeStore.clearAllBusy();

      broadcast({
        type: "allRouteReservationsCleared",
        data: {},
      });

      return true;
    }

    case "getRouteReservations": {
      const reservations =
        routeGraphRuntimeStore.getActiveReservations();

      for (const reservation of reservations) {
        sendToClient(ws, {
          type: "routeReservationChanged",
          data: {
            busy: true,
            sectionNames:
              reservation.sectionNames,
            elementIds:
              routeGraphRuntimeStore.getElementIdsForSections(
                reservation.sectionNames
              ),
            turnoutAddresses:
              reservation.turnoutAddresses,
            fromBlockName:
              reservation.fromBlockName,
            toBlockName:
              reservation.toBlockName,
          },
        });
      }

      return true;
    }

    default:
      return false;
  }
};
`;

const COMMAND_CENTER_HANDLERS = `// server/src/ws/handlers/wsCommandCenterMessageHandlers.ts

import {
  routeGraphRuntimeStore,
} from "../../services/routeGraphRuntimeStore.js";

import {
  log,
  logError,
} from "../../utility.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

export const handleCommandCenterMessage: WsMessageHandler = ({
  ws,
  msg,
  commandCenter,
  sendToClient,
  broadcast,
}) => {
  switch (msg.type) {
    case "setLoco": {
      const address =
        msg.data?.locoAddress;

      const speed =
        msg.data?.speed;

      const direction =
        msg.data?.direction;

      if (
        typeof address !== "number" ||
        typeof speed !== "number" ||
        (
          direction !== "forward" &&
          direction !== "reverse"
        )
      ) {
        logError("Invalid setLoco payload:", msg.data);

        sendToClient(ws, {
          type: "error",
          data: {
            message: "Invalid setLoco payload",
          },
        });

        return true;
      }

      commandCenter
        .setLoco(address, speed, direction)
        .then(success => {
          log("Set loco result:", success);

          if (!success) {
            broadcast({
              type: "error",
              data: {
                message: "Failed to set loco",
              },
            });
          }
        });

      return true;
    }

    case "setLocoFunction": {
      const address =
        msg.data?.locoAddress;

      const fn =
        msg.data?.functionNumber;

      const active =
        msg.data?.active;

      if (
        typeof address !== "number" ||
        typeof fn !== "number" ||
        typeof active !== "boolean"
      ) {
        logError("Invalid setLocoFunction payload:", msg.data);

        sendToClient(ws, {
          type: "error",
          data: {
            message: "Invalid setLocoFunction payload",
          },
        });

        return true;
      }

      commandCenter
        .setLocoFunction(address, fn, active)
        .then(success => {
          log("Set loco function result:", success);

          if (!success) {
            broadcast({
              type: "error",
              data: {
                message: "Failed to set loco function",
              },
            });
          }
        });

      return true;
    }

    case "getLoco": {
      const address =
        msg.data?.locoAddress;

      if (typeof address !== "number") {
        sendToClient(ws, {
          type: "error",
          data: {
            message: "Invalid getLoco payload",
          },
        });

        return true;
      }

      commandCenter
        .getLoco(address)
        .then(loco => {
          log("getLoco result:", loco);
        })
        .catch(err => {
          logError("Failed to get loco:", err);

          sendToClient(ws, {
            type: "error",
            data: {
              message: "Failed to get loco",
            },
          });
        });

      return true;
    }

    case "setTurnout": {
      const address =
        msg.data?.address;

      const closed =
        msg.data?.closed;

      if (
        typeof address !== "number" ||
        typeof closed !== "boolean"
      ) {
        sendToClient(ws, {
          type: "error",
          data: {
            message: "Invalid setTurnout payload",
          },
        });

        return true;
      }

      /**
       * Ha a váltó aktív route foglalás része,
       * kézzel nem engedjük átállítani.
       */
      if (routeGraphRuntimeStore.isTurnoutBusy(address)) {
        sendToClient(ws, {
          type: "commandRejected",
          uuid: msg.uuid,
          data: {
            reason:
              \`Turnout #\${address} is reserved by an active route.\`,
            lockOwner: null,
          },
        });

        return true;
      }

      /**
       * A meglévő command center műveleti lock is marad:
       * például route-beállítás közben se állítgatható kézzel.
       */
      if (
        commandCenter.locked &&
        commandCenter.lockOwnerUUID != msg.uuid
      ) {
        sendToClient(ws, {
          type: "commandRejected",
          uuid: msg.uuid,
          data: {
            reason: "Command center busy",
            lockOwner: commandCenter.lockOwnerUUID,
          },
        });

        return true;
      }

      commandCenter
        .setTurnout(address, closed)
        .then(success => {
          log("Turnout set result:", success);

          if (!success) {
            broadcast({
              type: "error",
              data: {
                message: "Failed to set turnout",
              },
            });
          } else {
            commandCenter.saveRuntimeState();
          }
        });

      return true;
    }

    case "setSensor": {
      const address =
        msg.data?.address;

      const on =
        msg.data?.on;

      if (
        typeof address !== "number" ||
        typeof on !== "boolean"
      ) {
        sendToClient(ws, {
          type: "error",
          data: {
            message: "Invalid setSensor payload",
          },
        });
      }

      return true;
    }

    case "setBasicAccessory": {
      const address =
        msg.data?.address;

      const active =
        msg.data?.active;

      if (
        typeof address !== "number" ||
        typeof active !== "boolean"
      ) {
        sendToClient(ws, {
          type: "error",
          data: {
            message: "Invalid setBasicAccessory payload",
          },
        });

        return true;
      }

      commandCenter
        .setBasicAccessory(address, active)
        .then(success => {
          log("Basic accessory set result:", success);

          if (!success) {
            broadcast({
              type: "error",
              data: {
                message: "Failed to set basic accessory",
              },
            });
          }
        });

      return true;
    }

    case "setTrackPower": {
      const on =
        msg.data?.on;

      if (typeof on !== "boolean") {
        sendToClient(ws, {
          type: "error",
          data: {
            message: "Invalid setTrackPower payload",
          },
        });

        return true;
      }

      commandCenter
        .setTrackPower(on)
        .then(success => {
          log("Set track power result:", success);

          if (!success) {
            broadcast({
              type: "error",
              data: {
                message: "Failed to set track power",
              },
            });
          }
        });

      return true;
    }

    case "emergencyStop": {
      commandCenter
        .emergencyStop()
        .then(success => {
          log("Emergency stop result:", success);

          if (!success) {
            broadcast({
              type: "error",
              data: {
                message: "Failed to emergency stop",
              },
            });
          }
        });

      return true;
    }

    case "setBlock":
      log("Setting block:", msg.data);
      commandCenter.setBlock(msg.data);
      return true;

    case "setBlockRemove":
      log("Removing loco from block:", msg.data);
      commandCenter.setBlockRemove(msg.data);
      return true;

    case "setBlocksReset":
      log("Resetting blocks");
      commandCenter.setBlocksReset();
      return true;

    case "getBlocks":
      log("Getting blocks");
      commandCenter.getBlocks();
      return true;

    default:
      return false;
  }
};
`;

const SCRIPT_HANDLERS = `// server/src/ws/handlers/wsScriptMessageHandlers.ts

import {
  scriptRuntimeStore,
} from "../../services/scriptRuntimeStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

export const handleScriptMessage: WsMessageHandler = async ({
  ws,
  msg,
  sendToClient,
}) => {
  switch (msg.type) {
    case "runScript": {
      try {
        const script =
          typeof msg.data?.script === "string"
            ? msg.data.script
            : undefined;

        const source =
          typeof msg.data?.source === "string"
            ? msg.data.source
            : "unknown";

        const elementId =
          typeof msg.data?.elementId === "string"
            ? msg.data.elementId
            : null;

        await scriptRuntimeStore.run(
          script,
          {
            source,
            elementId,
          }
        );
      } catch (error) {
        sendToClient(ws, {
          type: "scriptRejected",
          data: {
            reason:
              error instanceof Error
                ? error.message
                : String(error),
          },
        });
      }

      return true;
    }

    case "stopScript":
      scriptRuntimeStore.stopCurrent();
      return true;

    case "getScriptRuntimeState":
      sendToClient(ws, {
        type: "scriptDocumentChanged",
        data: scriptRuntimeStore.getDocument(),
      });

      sendToClient(ws, {
        type: "scriptStateChanged",
        data: scriptRuntimeStore.getCurrentState(),
      });

      return true;

    default:
      return false;
  }
};
`;

const TASK_HANDLERS = `// server/src/ws/handlers/wsTaskMessageHandlers.ts

import {
  taskRuntimeStore,
} from "../../services/taskRuntimeStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function getTaskIdOrName(
  data: unknown
): string {
  const value =
    (data as { taskIdOrName?: unknown } | undefined)
      ?.taskIdOrName;

  return typeof value === "string"
    ? value
    : "";
}

export const handleTaskMessage: WsMessageHandler = async ({
  ws,
  msg,
  sendToClient,
}) => {
  switch (msg.type) {
    case "startTask": {
      try {
        const taskIdOrName =
          getTaskIdOrName(msg.data);

        if (!taskIdOrName) {
          throw new Error("Missing taskIdOrName.");
        }

        const result =
          await taskRuntimeStore.startTask(
            taskIdOrName
          );

        if (!result.ok) {
          throw new Error(result.error);
        }
      } catch (error) {
        sendToClient(ws, {
          type: "taskRejected",
          data: {
            reason:
              error instanceof Error
                ? error.message
                : String(error),
          },
        });
      }

      return true;
    }

    case "finishTask": {
      const taskIdOrName =
        getTaskIdOrName(msg.data);

      if (taskIdOrName) {
        const result =
          await taskRuntimeStore.finishTask(
            taskIdOrName
          );

        if (!result.ok) {
          sendToClient(ws, {
            type: "taskRejected",
            data: {
              reason: result.error,
            },
          });
        }
      }

      return true;
    }

    case "abortTask": {
      const taskIdOrName =
        getTaskIdOrName(msg.data);

      if (taskIdOrName) {
        const result =
          await taskRuntimeStore.abortTask(
            taskIdOrName
          );

        if (!result.ok) {
          sendToClient(ws, {
            type: "taskRejected",
            data: {
              reason: result.error,
            },
          });
        }
      }

      return true;
    }

    case "pauseTask": {
      const taskIdOrName =
        getTaskIdOrName(msg.data);

      if (taskIdOrName) {
        const result =
          await taskRuntimeStore.pauseTask(
            taskIdOrName
          );

        if (!result.ok) {
          sendToClient(ws, {
            type: "taskRejected",
            data: {
              reason: result.error,
            },
          });
        }
      }

      return true;
    }

    case "resumeTask": {
      const taskIdOrName =
        getTaskIdOrName(msg.data);

      if (taskIdOrName) {
        const result =
          await taskRuntimeStore.resumeTask(
            taskIdOrName
          );

        if (!result.ok) {
          sendToClient(ws, {
            type: "taskRejected",
            data: {
              reason: result.error,
            },
          });
        }
      }

      return true;
    }

    case "finishAllTasks":
      await taskRuntimeStore.finishAllTasks();
      return true;

    case "abortAllTasks":
      await taskRuntimeStore.abortAllTasks();
      return true;

    case "getTaskRuntimeState":
      sendToClient(ws, {
        type: "taskManagerSnapshotChanged",
        data: taskRuntimeStore.getSnapshot(),
      });

      return true;

    default:
      return false;
  }
};
`;

const ROUTER = `// server/src/ws/wsMessageRouter.ts

import {
  logError,
} from "../utility.js";

import type {
  WsHandlerContext,
} from "./handlers/wsHandlerTypes.js";

import {
  handleLockMessage,
} from "./handlers/wsLockMessageHandlers.js";

import {
  handleRouteMessage,
} from "./handlers/wsRouteMessageHandlers.js";

import {
  handleCommandCenterMessage,
} from "./handlers/wsCommandCenterMessageHandlers.js";

import {
  handleScriptMessage,
} from "./handlers/wsScriptMessageHandlers.js";

import {
  handleTaskMessage,
} from "./handlers/wsTaskMessageHandlers.js";

const handlers = [
  handleLockMessage,
  handleRouteMessage,
  handleCommandCenterMessage,
  handleScriptMessage,
  handleTaskMessage,
] as const;

export async function routeIncomingWebSocketMessage(
  context: WsHandlerContext
): Promise<void> {
  for (const handler of handlers) {
    const handled =
      await handler(context);

    if (handled) {
      return;
    }
  }

  logError(
    "Unknown message type:",
    context.msg.type
  );

  context.sendToClient(context.ws, {
    type: "error",
    data: {
      message: "Unknown message type",
    },
  });
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
`;

try {
  console.log("DCCExpressNext – WebSocket message handlers refactor patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  ensureExisting(FILES.wsServer);

  write(FILES.handlerTypes, HANDLER_TYPES);
  write(FILES.lockHandlers, LOCK_HANDLERS);
  write(FILES.routeHandlers, ROUTE_HANDLERS);
  write(FILES.commandCenterHandlers, COMMAND_CENTER_HANDLERS);
  write(FILES.scriptHandlers, SCRIPT_HANDLERS);
  write(FILES.taskHandlers, TASK_HANDLERS);
  write(FILES.router, ROUTER);
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
