// server/src/ws/handlers/wsCommandCenterMessageHandlers.ts

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
              `Turnout #${address} is reserved by an active route.`,
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

    case "setProgrammingPower": {
      const {
        on,
      } = msg.data;

      commandCenter
        .setProgrammingPower(on)
        .then(success => {
          log("Set programming power result:", success);

          if (!success) {
            broadcast({
              type: "error",
              data: {
                message: "Failed to set programming power",
              },
            });
          }
        });

      return true;
    }

    case "writeDccExDirectCommand": {
      const {
        command,
      } = msg.data;

      commandCenter
        .writeDirectCommand(command)
        .then(success => {
          log("DCC-EX direct command result:", success);

          if (!success) {
            broadcast({
              type: "error",
              data: {
                message: "Failed to write DCC-EX direct command",
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
