#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  commandCenterHandlers: path.join(
    ROOT,
    "server/src/ws/handlers/wsCommandCenterMessageHandlers.ts"
  ),
  routeHandlers: path.join(
    ROOT,
    "server/src/ws/handlers/wsRouteMessageHandlers.ts"
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
  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Frissítve: ${path.relative(ROOT, file)}`);
}

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
      const {
        locoAddress,
        speed,
        direction,
      } = msg.data;

      commandCenter
        .setLoco(locoAddress, speed, direction)
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
      const {
        locoAddress,
        functionNumber,
        active,
      } = msg.data;

      commandCenter
        .setLocoFunction(
          locoAddress,
          functionNumber,
          active
        )
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
      const {
        locoAddress,
      } = msg.data;

      commandCenter
        .getLoco(locoAddress)
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
      const {
        address,
        closed,
      } = msg.data;

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

    case "setSensor":
      /**
       * A payload validálását már a WS parser elvégzi.
       *
       * Ez az ág a korábbi működést tartja meg:
       * a kliensoldali setSensor parancs jelenleg nem
       * avatkozik be a CommandCenter rétegbe.
       */
      return true;

    case "setBasicAccessory": {
      const {
        address,
        active,
      } = msg.data;

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
      const {
        on,
      } = msg.data;

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
      const {
        fromBlockName,
        toBlockName,
      } = msg.data;

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
      const {
        fromBlockName,
        toBlockName,
      } = msg.data;

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

const SCRIPT_HANDLERS = `// server/src/ws/handlers/wsScriptMessageHandlers.ts

import {
  scriptRuntimeStore,
} from "../../services/scriptRuntimeStore.js";

import type {
  ScriptRunSource,
} from "../../services/scriptRuntimeStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function normalizeScriptRunSource(
  value: string
): ScriptRunSource {
  switch (value) {
    case "property-panel":
    case "route-button":
    case "control-panel":
    case "auto-start":
    case "unknown":
      return value;

    default:
      return "unknown";
  }
}

export const handleScriptMessage: WsMessageHandler = async ({
  ws,
  msg,
  sendToClient,
}) => {
  switch (msg.type) {
    case "runScript": {
      try {
        const {
          script,
          source,
          elementId,
        } = msg.data;

        await scriptRuntimeStore.run(
          script,
          {
            source: normalizeScriptRunSource(source),
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

export const handleTaskMessage: WsMessageHandler = async ({
  ws,
  msg,
  sendToClient,
}) => {
  switch (msg.type) {
    case "startTask": {
      try {
        const {
          taskIdOrName,
        } = msg.data;

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
      const {
        taskIdOrName,
      } = msg.data;

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
      const {
        taskIdOrName,
      } = msg.data;

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
      const {
        taskIdOrName,
      } = msg.data;

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
      const {
        taskIdOrName,
      } = msg.data;

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

try {
  console.log("DCCExpressNext – WS handler validation cleanup Sprint 16 patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  for (const file of Object.values(FILES)) {
    ensureExisting(file);
  }

  write(FILES.commandCenterHandlers, COMMAND_CENTER_HANDLERS);
  write(FILES.routeHandlers, ROUTE_HANDLERS);
  write(FILES.scriptHandlers, SCRIPT_HANDLERS);
  write(FILES.taskHandlers, TASK_HANDLERS);

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
