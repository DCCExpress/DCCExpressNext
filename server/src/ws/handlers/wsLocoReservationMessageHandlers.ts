// server/src/ws/handlers/wsLocoReservationMessageHandlers.ts

import {
  locoReservationStore,
} from "../../services/locoReservationStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

export const handleLocoReservationMessage: WsMessageHandler = async ({
  ws,
  msg,
  sendToClient,
  broadcast,
}) => {
  switch (msg.type) {
    case "reserveLoco": {
      try {
        const reservation =
          locoReservationStore.reserve(msg.data);

        broadcast({
          type: "locoReservationChanged",
          uuid: msg.uuid,
          data: {
            locoAddress: msg.data.locoAddress,
            reservation,
          },
        });
      } catch (error) {
        sendToClient(ws, {
          type: "commandRejected",
          uuid: msg.uuid,
          data: {
            reason:
              error instanceof Error
                ? error.message
                : String(error),
            lockOwner: null,
          },
        });
      }

      return true;
    }

    case "releaseLocoReservation": {
      try {
        locoReservationStore.release(
          msg.data.locoAddress,
          msg.data.ownerId
        );

        broadcast({
          type: "locoReservationChanged",
          uuid: msg.uuid,
          data: {
            locoAddress: msg.data.locoAddress,
            reservation: null,
          },
        });
      } catch (error) {
        sendToClient(ws, {
          type: "commandRejected",
          uuid: msg.uuid,
          data: {
            reason:
              error instanceof Error
                ? error.message
                : String(error),
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
