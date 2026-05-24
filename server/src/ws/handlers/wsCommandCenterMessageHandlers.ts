// server/src/ws/handlers/wsCommandCenterMessageHandlers.ts

import {
  routeGraphRuntimeStore,
} from "../../services/routeGraphRuntimeStore.js";

import {
  log,
  logError,
} from "../../utility.js";

import type {
  WsHandlerContext,
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function rejectMissingCommandCenter({
  ws,
  sendToClient,
}: WsHandlerContext): void {
  sendToClient(ws, {
    type: "error",
    data: {
      message: "No command center available",
    },
  });
}

export const handleCommandCenterMessage: WsMessageHandler = context => {
  const {
    ws,
    msg,
    commandCenter,
    sendToClient,
    broadcast,
  } = context;

  switch (msg.type) {
    case "setLoco": {
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

      const {
        locoAddress,
        speed,
        direction,
      } = msg.data;

      commandCenter
        .setLoco(locoAddress, speed, direction)
        .then(success => {
          log("Set loco result:", success);

          if (success) {
            const syncedLocoForSetLoco =
              commandCenter.getLocoInfo(locoAddress);

            if (syncedLocoForSetLoco) {
              broadcast({
                type: "locoState",
                data: {
                  loco: syncedLocoForSetLoco,
                },
              });
            }
          }

          if (!success) {
            broadcast({
              type: "error",
              data: {
                message: "Failed to set loco",
              },
            });
          }
        })
        .catch(error => {
          logError("Failed to set loco:", error);
          sendToClient(ws, {
            type: "error",
            data: {
              message: "Failed to set loco",
            },
          });
        });

      return true;
    }

    case "setLocoFunction": {
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

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

          if (success) {
            const syncedLocoForFunction =
              commandCenter.getLocoInfo(locoAddress);

            if (syncedLocoForFunction) {
              broadcast({
                type: "locoState",
                data: {
                  loco: syncedLocoForFunction,
                },
              });
            }
          }

          if (!success) {
            broadcast({
              type: "error",
              data: {
                message: "Failed to set loco function",
              },
            });
          }
        })
        .catch(error => {
          logError("Failed to set loco function:", error);
          sendToClient(ws, {
            type: "error",
            data: {
              message: "Failed to set loco function",
            },
          });
        });

      return true;
    }
    case "getLoco": {
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

      const {
        locoAddress,
      } = msg.data;

      commandCenter
        .getLoco(locoAddress)
        .then(loco => {
          log("getLoco result:", loco);

          const syncedLoco =
            commandCenter.getLocoInfo(locoAddress) ??
            loco;

          if (!syncedLoco) {
            return;
          }

          sendToClient(ws, {
            type: "locoState",
            data: {
              loco: syncedLoco,
            },
          });
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
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

      const {
        address,
        closed,
      } = msg.data;

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
        })
        .catch(error => {
          logError("Failed to set turnout:", error);
          sendToClient(ws, {
            type: "error",
            data: {
              message: "Failed to set turnout",
            },
          });
        });

      return true;
    }

    case "setSensor": {
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

      const {
        address,
        on,
      } = msg.data;

      commandCenter
        .setSensor(address, on)
        .then(success => {
          log("Sensor set result:", success);

          if (!success) {
            sendToClient(ws, {
              type: "error",
              data: {
                message: "Failed to set sensor",
              },
            });
          }
        })
        .catch(error => {
          logError("Failed to set sensor:", error);
          sendToClient(ws, {
            type: "error",
            data: {
              message: "Failed to set sensor",
            },
          });
        });

      return true;
    }

    case "setBasicAccessory": {
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

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
        })
        .catch(error => {
          logError("Failed to set basic accessory:", error);
          sendToClient(ws, {
            type: "error",
            data: {
              message: "Failed to set basic accessory",
            },
          });
        });

      return true;
    }

    case "setTrackPower": {
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

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
        })
        .catch(error => {
          logError("Failed to set track power:", error);
          sendToClient(ws, {
            type: "error",
            data: {
              message: "Failed to set track power",
            },
          });
        });

      return true;
    }

    case "setProgrammingPower": {
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

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
        })
        .catch(error => {
          logError("Failed to set programming power:", error);
          sendToClient(ws, {
            type: "error",
            data: {
              message: "Failed to set programming power",
            },
          });
        });

      return true;
    }

    case "writeDccExDirectCommand": {
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

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
        })
        .catch(error => {
          logError("Failed to write DCC-EX direct command:", error);
          sendToClient(ws, {
            type: "error",
            data: {
              message: "Failed to write DCC-EX direct command",
            },
          });
        });

      return true;
    }

    case "emergencyStop": {
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

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
        })
        .catch(error => {
          logError("Failed to emergency stop:", error);
          sendToClient(ws, {
            type: "error",
            data: {
              message: "Failed to emergency stop",
            },
          });
        });

      return true;
    }

    case "setBlock":
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

      log("Setting block:", msg.data);
      commandCenter.setBlock(msg.data);
      return true;

    case "setBlockRemove":
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

      log("Removing loco from block:", msg.data);
      commandCenter.setBlockRemove(msg.data);
      return true;

    case "setBlocksReset":
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

      log("Resetting blocks");
      commandCenter.setBlocksReset();
      return true;

    case "getBlocks":
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

      log("Getting blocks");
      commandCenter.getBlocks();
      return true;

    default:
      return false;
  }
};
