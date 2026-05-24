// server/src/ws/handlers/wsLockMessageHandlers.ts

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

export const handleLockMessage: WsMessageHandler = context => {
  const {
    ws,
    msg,
    commandCenter,
    sendToClient,
    broadcast,
  } = context;

  switch (msg.type) {
    case "routeLock": {
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

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
      if (!commandCenter) {
        rejectMissingCommandCenter(context);
        return true;
      }

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
