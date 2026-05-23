// server/src/ws/handlers/wsCommandCenterConfigMessageHandlers.ts

import type {
  CommandCenterConfigResponsePayload,
} from "../../../../common/src/types.js";

import {
  readCommandCenter,
  saveCommandCenterConfig,
} from "../../routes/commandCenterRoutes.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function sendCommandCenterConfigResponse(
  context: Parameters<WsMessageHandler>[0],
  payload: CommandCenterConfigResponsePayload
): void {
  context.sendToClient(context.ws, {
    type: "commandCenterConfigResponse",
    data: payload,
  });
}

export const handleCommandCenterConfigMessage: WsMessageHandler = async context => {
  if (context.msg.type !== "commandCenterConfigCommand") {
    return false;
  }

  const { requestId, action } = context.msg.data;

  try {
    switch (action) {
      case "load": {
        const config = await readCommandCenter();

        sendCommandCenterConfigResponse(context, {
          requestId,
          action,
          ok: true,
          config,
        });

        return true;
      }

      case "save": {
        const config = await saveCommandCenterConfig(
          context.msg.data.config ?? {}
        );

        sendCommandCenterConfigResponse(context, {
          requestId,
          action,
          ok: true,
          config,
        });

        return true;
      }

      default: {
        sendCommandCenterConfigResponse(context, {
          requestId,
          action,
          ok: false,
          message: "Unknown command center config action.",
        });

        return true;
      }
    }
  } catch (error) {
    sendCommandCenterConfigResponse(context, {
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
