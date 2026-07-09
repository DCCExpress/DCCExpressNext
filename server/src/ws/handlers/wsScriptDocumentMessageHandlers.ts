// server/src/ws/handlers/wsScriptDocumentMessageHandlers.ts

import {
  FEATURE_ENABLE_SCRIPT_ENGINE,
} from "../../../../common/src/featureFlags.js";

import type {
  ScriptDocumentResponsePayload,
} from "../../../../common/src/types.js";

import {
  scriptRuntimeStore,
} from "../../services/scriptRuntimeStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function sendScriptDocumentResponse(
  context: Parameters<WsMessageHandler>[0],
  payload: ScriptDocumentResponsePayload
): void {
  context.sendToClient(context.ws, {
    type: "scriptDocumentResponse",
    data: payload,
  });
}

export const handleScriptDocumentMessage: WsMessageHandler = async context => {
  if (context.msg.type !== "scriptDocumentCommand") {
    return false;
  }

  const { requestId, action } = context.msg.data;

  if (!FEATURE_ENABLE_SCRIPT_ENGINE) {
    sendScriptDocumentResponse(context, {
      requestId,
      action,
      ok: false,
      message: "Script engine is disabled.",
    });

    return true;
  }

  try {
    switch (action) {
      case "load": {
        await scriptRuntimeStore.initialize();

        sendScriptDocumentResponse(context, {
          requestId,
          action,
          ok: true,
          document: scriptRuntimeStore.getDocument(),
        });

        return true;
      }

      case "save": {
        const document =
          await scriptRuntimeStore.saveDocument(
            context.msg.data.document ?? {}
          );

        sendScriptDocumentResponse(context, {
          requestId,
          action,
          ok: true,
          document,
        });

        return true;
      }

      default: {
        sendScriptDocumentResponse(context, {
          requestId,
          action,
          ok: false,
          message: "Unknown script document command action.",
        });

        return true;
      }
    }
  } catch (error) {
    sendScriptDocumentResponse(context, {
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
