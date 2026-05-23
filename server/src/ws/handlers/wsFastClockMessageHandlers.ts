// server/src/ws/handlers/wsFastClockMessageHandlers.ts

import type {
  FastClockResponsePayload,
} from "../../../../common/src/types.js";

import {
  fastClockRuntimeStore,
} from "../../services/fastClockRuntimeStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function sendFastClockResponse(
  context: Parameters<WsMessageHandler>[0],
  payload: FastClockResponsePayload
): void {
  context.sendToClient(context.ws, {
    type: "fastClockResponse",
    data: payload,
  });
}

export const handleFastClockMessage: WsMessageHandler = async context => {
  if (context.msg.type !== "fastClockCommand") {
    return false;
  }

  const { requestId, action } = context.msg.data;

  try {
    switch (action) {
      case "snapshot": {
        sendFastClockResponse(context, {
          requestId,
          action,
          ok: true,
          snapshot: fastClockRuntimeStore.getSnapshot(),
        });

        return true;
      }

      case "run": {
        sendFastClockResponse(context, {
          requestId,
          action,
          ok: true,
          snapshot: fastClockRuntimeStore.run(),
        });

        return true;
      }

      case "pause": {
        sendFastClockResponse(context, {
          requestId,
          action,
          ok: true,
          snapshot: fastClockRuntimeStore.pause(),
        });

        return true;
      }

      case "reset": {
        sendFastClockResponse(context, {
          requestId,
          action,
          ok: true,
          snapshot: fastClockRuntimeStore.reset(),
        });

        return true;
      }

      case "setSpeed": {
        sendFastClockResponse(context, {
          requestId,
          action,
          ok: true,
          snapshot: fastClockRuntimeStore.setSpeed(
            context.msg.data.speed ?? 1
          ),
        });

        return true;
      }

      default: {
        sendFastClockResponse(context, {
          requestId,
          action,
          ok: false,
          message: "Unknown fast clock command action.",
        });

        return true;
      }
    }
  } catch (error) {
    sendFastClockResponse(context, {
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
