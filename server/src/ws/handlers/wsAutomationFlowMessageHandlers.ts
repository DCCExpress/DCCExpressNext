import type {
  AutomationFlowResponsePayload,
} from "../../../../common/src/automationFlow.js";
import {
  createEmptyAutomationFlowDocument,
} from "../../../../common/src/automationFlow.js";

import {
  automationFlowStore,
} from "../../services/automationFlowStore.js";

import {
  automationFlowRuntimeService,
} from "../../services/automationFlowRuntimeService.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function sendAutomationFlowResponse(
  context: Parameters<WsMessageHandler>[0],
  payload: AutomationFlowResponsePayload
): void {
  context.sendToClient(context.ws, {
    type: "automationFlowResponse",
    data: payload,
  });
}

export const handleAutomationFlowMessage: WsMessageHandler = async context => {
  if (context.msg.type !== "automationFlowCommand") {
    return false;
  }

  const { requestId, action } = context.msg.data;

  try {
    switch (action) {
      case "load": {
        const initializeResult = await automationFlowStore.initialize();
        const document = automationFlowStore.getDocument();

        sendAutomationFlowResponse(context, {
          requestId,
          action,
          ok: true,
          document,
          created: initializeResult.created,
          ...(initializeResult.created
            ? {
                message: "Automation flow file did not exist, so an empty one was created.",
              }
            : {}),
        });

        return true;
      }

      case "save": {
        const inputDocument =
          context.msg.data.document ?? createEmptyAutomationFlowDocument();

        const document = await automationFlowStore.saveDocument(inputDocument);
        await automationFlowRuntimeService.evaluate("flow-save");

        const payload: AutomationFlowResponsePayload = {
          requestId,
          action,
          ok: true,
          document,
          created: false,
        };

        sendAutomationFlowResponse(context, payload);

        context.broadcast({
          type: "automationFlowChanged",
          data: document,
        }, context.ws);

        return true;
      }

      default: {
        sendAutomationFlowResponse(context, {
          requestId,
          action,
          ok: false,
          message: "Unknown automation flow command action.",
        });

        return true;
      }
    }
  } catch (error) {
    sendAutomationFlowResponse(context, {
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
