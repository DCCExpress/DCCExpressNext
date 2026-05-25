// server/src/ws/handlers/wsSignalLogicMessageHandlers.ts

import type {
  SignalLogicResponsePayload,
} from "../../../../common/src/types.js";
import type {
  SignalLogicRuntimeStateDto,
} from "../../../../common/src/signalLogic.js";
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

let running = false;

function getRuntimeState(): SignalLogicRuntimeStateDto {
  const document = signalLogicRulesStore.getDocument();

  return {
    running,
    autostart: document.autostart,
  };
}

function broadcastRuntimeState(
  context: Parameters<WsMessageHandler>[0]
): void {
  context.broadcast({
    type: "signalLogicStateChanged",
    data: getRuntimeState(),
  });
}

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
    await signalLogicRulesStore.initialize();

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
          state: getRuntimeState(),
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
            state: getRuntimeState(),
            message: "Signal logic contains validation errors.",
          });

          return true;
        }

        const document = await signalLogicRulesStore.saveDocument(inputDocument);
        const state = getRuntimeState();

        sendSignalLogicResponse(context, {
          requestId,
          action,
          ok: true,
          document,
          issues,
          created: false,
          state,
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
            state,
          },
        }, context.ws);

        broadcastRuntimeState(context);

        return true;
      }

      case "state": {
        sendSignalLogicResponse(context, {
          requestId,
          action,
          ok: true,
          document: signalLogicRulesStore.getDocument(),
          issues: validateSignalLogicDocument(signalLogicRulesStore.getDocument()),
          state: getRuntimeState(),
        });

        return true;
      }

      case "start": {
        running = true;
        const state = getRuntimeState();

        sendSignalLogicResponse(context, {
          requestId,
          action,
          ok: true,
          document: signalLogicRulesStore.getDocument(),
          issues: validateSignalLogicDocument(signalLogicRulesStore.getDocument()),
          state,
        });

        broadcastRuntimeState(context);

        return true;
      }

      case "stop": {
        running = false;
        const state = getRuntimeState();

        sendSignalLogicResponse(context, {
          requestId,
          action,
          ok: true,
          document: signalLogicRulesStore.getDocument(),
          issues: validateSignalLogicDocument(signalLogicRulesStore.getDocument()),
          state,
        });

        broadcastRuntimeState(context);

        return true;
      }

      case "setAutostart": {
        const document = await signalLogicRulesStore.setAutostart(
          Boolean(context.msg.data.autostart)
        );
        const state = getRuntimeState();

        sendSignalLogicResponse(context, {
          requestId,
          action,
          ok: true,
          document,
          issues: validateSignalLogicDocument(document),
          state,
        });

        context.broadcast({
          type: "signalLogicResponse",
          data: {
            requestId,
            action,
            ok: true,
            document,
            issues: validateSignalLogicDocument(document),
            state,
          },
        }, context.ws);

        broadcastRuntimeState(context);

        return true;
      }

      default: {
        sendSignalLogicResponse(context, {
          requestId,
          action,
          ok: false,
          state: getRuntimeState(),
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