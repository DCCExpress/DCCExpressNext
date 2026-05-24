// server/src/ws/handlers/wsAppSettingsMessageHandlers.ts

import type {
  AppSettingsResponsePayload,
} from "../../../../common/src/types.js";

import {
  appSettingsStore,
} from "../../services/appSettingsStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function sendAppSettingsResponse(
  context: Parameters<WsMessageHandler>[0],
  payload: AppSettingsResponsePayload
): void {
  context.sendToClient(context.ws, {
    type: "appSettingsResponse",
    data: payload,
  });
}

export const handleAppSettingsMessage: WsMessageHandler = async context => {
  if (context.msg.type !== "appSettingsCommand") {
    return false;
  }

  const { requestId, action } = context.msg.data;

  try {
    switch (action) {
      case "load": {
        await appSettingsStore.initialize();

        sendAppSettingsResponse(context, {
          requestId,
          action,
          ok: true,
          settings: appSettingsStore.getSettings(),
        });

        return true;
      }

      case "save": {
        const settings =
          await appSettingsStore.saveSettings(
            context.msg.data.settings ?? {}
          );

        sendAppSettingsResponse(context, {
          requestId,
          action,
          ok: true,
          settings,
        });

        context.broadcast({
          type: "appSettingsResponse",
          data: {
            requestId,
            action,
            ok: true,
            settings,
          },
        }, context.ws);

        return true;
      }

      default: {
        sendAppSettingsResponse(context, {
          requestId,
          action,
          ok: false,
          message: "Unknown app settings command action.",
        });

        return true;
      }
    }
  } catch (error) {
    sendAppSettingsResponse(context, {
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
