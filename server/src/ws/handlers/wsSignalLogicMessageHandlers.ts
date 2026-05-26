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

import {
  signalLogicRuntimeService,
} from "../../services/signalLogicRuntimeService.js";

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
          state: await signalLogicRuntimeService.getState(),
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
            state: await signalLogicRuntimeService.getState(),
            message: "Signal logic contains validation errors.",
          });

          return true;
        }

        const document = await signalLogicRulesStore.saveDocument(inputDocument);
        const state = await signalLogicRuntimeService.getState();

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

        context.broadcast({
          type: "signalLogicStateChanged",
          data: state,
        });

        return true;
      }

      case "state": {
        const document = signalLogicRulesStore.getDocument();

        sendSignalLogicResponse(context, {
          requestId,
          action,
          ok: true,
          document,
          issues: validateSignalLogicDocument(document),
          state: await signalLogicRuntimeService.getState(),
        });

        return true;
      }

      case "integrityCheck": {
        sendSignalLogicResponse(context, {
          requestId,
          action,
          ok: true,
          integrity: await signalLogicRulesStore.checkIntegrity(),
          state: await signalLogicRuntimeService.getState(),
        });

        return true;
      }

      case "deleteOrphanSignals": {
        const result = await signalLogicRulesStore.deleteSignalRuleGroups(
          context.msg.data.signalAddresses ?? []
        );
        const state = await signalLogicRuntimeService.getState();
        const payload: SignalLogicResponsePayload = {
          requestId,
          action,
          ok: true,
          document: result.document,
          issues: validateSignalLogicDocument(result.document),
          integrity: result.integrity,
          deletedSignalAddresses: result.deletedSignalAddresses,
          state,
        };

        sendSignalLogicResponse(context, payload);

        context.broadcast({
          type: "signalLogicResponse",
          data: payload,
        }, context.ws);

        return true;
      }

      case "start": {
        const state = await signalLogicRuntimeService.start();
        const document = signalLogicRulesStore.getDocument();

        sendSignalLogicResponse(context, {
          requestId,
          action,
          ok: true,
          document,
          issues: validateSignalLogicDocument(document),
          state,
        });

        return true;
      }

      case "stop": {
        const state = await signalLogicRuntimeService.stop();
        const document = signalLogicRulesStore.getDocument();

        sendSignalLogicResponse(context, {
          requestId,
          action,
          ok: true,
          document,
          issues: validateSignalLogicDocument(document),
          state,
        });

        return true;
      }

      default: {
        sendSignalLogicResponse(context, {
          requestId,
          action,
          ok: false,
          state: await signalLogicRuntimeService.getState(),
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