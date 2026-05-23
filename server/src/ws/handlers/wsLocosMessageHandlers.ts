// server/src/ws/handlers/wsLocosMessageHandlers.ts

import type {
  LocosResponsePayload,
} from "../../../../common/src/types.js";

import {
  readLocos,
  writeLocos,
} from "../../services/locoStore.js";

import {
  notifyLocosChanged,
} from "../../services/locoChangeNotifier.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function sendLocosResponse(
  context: Parameters<WsMessageHandler>[0],
  payload: LocosResponsePayload
): void {
  context.sendToClient(context.ws, {
    type: "locosResponse",
    data: payload,
  });
}

export const handleLocosMessage: WsMessageHandler = async context => {
  if (context.msg.type !== "locosCommand") {
    return false;
  }

  const { requestId, action } = context.msg.data;

  try {
    switch (action) {
      case "load": {
        const locos = await readLocos();

        sendLocosResponse(context, {
          requestId,
          action,
          ok: true,
          locos,
          count: locos.length,
        });

        return true;
      }

      case "save": {
        const locos = context.msg.data.locos ?? [];

        await writeLocos(locos);
        await notifyLocosChanged();

        sendLocosResponse(context, {
          requestId,
          action,
          ok: true,
          count: locos.length,
        });

        return true;
      }

      default: {
        sendLocosResponse(context, {
          requestId,
          action,
          ok: false,
          message: "Unknown locos command action.",
        });

        return true;
      }
    }
  } catch (error) {
    sendLocosResponse(context, {
      requestId,
      action,
      ok: false,
      message: error instanceof Error
        ? error.message
        : String(error),
    });

    return true;
  }
};
