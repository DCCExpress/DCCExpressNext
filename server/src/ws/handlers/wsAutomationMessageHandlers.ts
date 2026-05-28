import type {
  AutomationResponsePayload,
} from "../../../../common/src/types.js";

import {
  automationRuntimeService,
} from "../../services/automationRuntimeService.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function sendAutomationResponse(
  context: Parameters<WsMessageHandler>[0],
  payload: AutomationResponsePayload
): void {
  context.sendToClient(context.ws, {
    type: "automationResponse",
    data: payload,
  });
}

export const handleAutomationMessage: WsMessageHandler = async context => {
  if (context.msg.type !== "automationCommand") {
    return false;
  }

  const { requestId, action } = context.msg.data;

  try {
    switch (action) {
      case "snapshot": {
        sendAutomationResponse(context, {
          requestId,
          action,
          ok: true,
          state: await automationRuntimeService.getState(),
        });

        return true;
      }

      case "start": {
        const state = await automationRuntimeService.start();

        sendAutomationResponse(context, {
          requestId,
          action,
          ok: true,
          state,
        });

        return true;
      }

      case "stop": {
        const state = await automationRuntimeService.stop();

        sendAutomationResponse(context, {
          requestId,
          action,
          ok: true,
          state,
        });

        return true;
      }

      default: {
        sendAutomationResponse(context, {
          requestId,
          action,
          ok: false,
          message: "Unknown automation command action.",
        });

        return true;
      }
    }
  } catch (error) {
    sendAutomationResponse(context, {
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
