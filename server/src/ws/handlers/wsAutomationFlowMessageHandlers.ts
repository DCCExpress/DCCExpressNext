import type {
  AutomationFlowResponsePayload,
  AutomationFlowRuntimeResponsePayload,
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

function sendAutomationFlowRuntimeResponse(
  context: Parameters<WsMessageHandler>[0],
  payload: AutomationFlowRuntimeResponsePayload
): void {
  context.sendToClient(context.ws, {
    type: "automationFlowRuntimeResponse",
    data: payload,
  });
}

function broadcastAutomationFlowRuntimeState(
  context: Parameters<WsMessageHandler>[0]
): void {
  context.broadcast({
    type: "automationFlowRuntimeStateChanged",
    data: automationFlowRuntimeService.getSnapshot(),
  });
}

async function handleAutomationFlowRuntimeCommand(
  context: Parameters<WsMessageHandler>[0]
): Promise<boolean> {
  if (context.msg.type !== "automationFlowRuntimeCommand") {
    return false;
  }

  const { requestId, action } = context.msg.data;

  try {
    switch (action) {
      case "snapshot": {
        sendAutomationFlowRuntimeResponse(context, {
          requestId,
          action,
          ok: true,
          snapshot: automationFlowRuntimeService.getSnapshot(),
        });

        return true;
      }

      case "run": {
        const snapshot = await automationFlowRuntimeService.start("statusbar-run");

        sendAutomationFlowRuntimeResponse(context, {
          requestId,
          action,
          ok: true,
          snapshot,
        });

        broadcastAutomationFlowRuntimeState(context);
        return true;
      }

      case "stop": {
        const snapshot = automationFlowRuntimeService.stop("statusbar-stop");

        sendAutomationFlowRuntimeResponse(context, {
          requestId,
          action,
          ok: true,
          snapshot,
        });

        broadcastAutomationFlowRuntimeState(context);
        return true;
      }

      default: {
        sendAutomationFlowRuntimeResponse(context, {
          requestId,
          action,
          ok: false,
          message: "Unknown automation runtime command action.",
        });

        return true;
      }
    }
  } catch (error) {
    sendAutomationFlowRuntimeResponse(context, {
      requestId,
      action,
      ok: false,
      snapshot: automationFlowRuntimeService.getSnapshot(),
      message: error instanceof Error
        ? error.message
        : String(error),
    });

    broadcastAutomationFlowRuntimeState(context);
    return true;
  }
}

export const handleAutomationFlowMessage: WsMessageHandler = async context => {
  const runtimeHandled = await handleAutomationFlowRuntimeCommand(context);
  if (runtimeHandled) {
    return true;
  }

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

        broadcastAutomationFlowRuntimeState(context);
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

    broadcastAutomationFlowRuntimeState(context);
    return true;
  }
};
