// server/src/ws/handlers/wsSignalLogicMessageHandlers.ts

import type {
  SignalLogicResponsePayload,
} from "../../../../common/src/types.js";
import {
  normalizeSignalLogicDocument,
  validateSignalLogicDocument,
} from "../../../../common/src/signalLogic.js";

import {
  signalLogicRulesStore,
} from "../../services/signalLogicRulesStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function sendSignalLogicResponse(
  context: Parameters<WsMessageHandler>[0],
  payload: SignalLogicResponsePayload
): void {
  context.sendToClient(context.ws, {
    type: "signalLogicResponse",
    data: payload,
  });
}

export const handleSignalLogicMessage: WsMessageHandler = async context => {
  if (context.msg.type !== "signalLogicCommand") {
    return false;
  }

  const { requestId, action } = context.msg.data;

  try {
    switch (action) {
      case "load": {
        const initializeResult = await signalLogicRulesStore.initialize();
        const document = signalLogicRulesStore.getDocument();
        const payload: SignalLogicResponsePayload = {
          requestId,
          action,
          ok: true,
          document,
          issues: validateSignalLogicDocument(document),
          created: initializeResult.created,
          ...(initializeResult.created
            ? {
                message: "Signal rules file did not exist, so an empty one was created.",
              }
            : {}),
        };

        sendSignalLogicResponse(context, payload);

        return true;
      }

      case "save": {
        const inputDocument = normalizeSignalLogicDocument(
          context.msg.data.document
        );

        const issues = validateSignalLogicDocument(inputDocument);
        const hasErrors = issues.some(issue => issue.level === "error");

        if (hasErrors) {
          sendSignalLogicResponse(context, {
            requestId,
            action,
            ok: false,
            document: inputDocument,
            issues,
            message: "Signal logic contains validation errors.",
          });

          return true;
        }

        const document = await signalLogicRulesStore.saveDocument(inputDocument);

        sendSignalLogicResponse(context, {
          requestId,
          action,
          ok: true,
          document,
          issues,
          created: false,
        });

        context.broadcast({
          type: "signalLogicResponse",
          data: {
            requestId,
            action,
            ok: true,
            document,
            issues,
            created: false,
          },
        }, context.ws);

        return true;
      }

      default: {
        sendSignalLogicResponse(context, {
          requestId,
          action,
          ok: false,
          message: "Unknown signal logic command action.",
        });

        return true;
      }
    }
  } catch (error) {
    sendSignalLogicResponse(context, {
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
