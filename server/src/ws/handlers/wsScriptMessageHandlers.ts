// server/src/ws/handlers/wsScriptMessageHandlers.ts

import {
  FEATURE_ENABLE_SCRIPT_ENGINE,
} from "../../../../common/src/featureFlags.js";

import {
  scriptRuntimeStore,
} from "../../services/scriptRuntimeStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

export const handleScriptMessage: WsMessageHandler = async ({
  ws,
  msg,
  sendToClient,
}) => {
  switch (msg.type) {
    case "runScript": {
      if (!FEATURE_ENABLE_SCRIPT_ENGINE) {
        sendToClient(ws, {
          type: "scriptRejected",
          data: {
            reason: "Script engine is disabled.",
          },
        });

        return true;
      }

      try {
        const {
          script,
          source,
          elementId,
        } = msg.data;

        await scriptRuntimeStore.run(
          script,
          {
            source,
            elementId,
          }
        );
      } catch (error) {
        sendToClient(ws, {
          type: "scriptRejected",
          data: {
            reason:
              error instanceof Error
                ? error.message
                : String(error),
          },
        });
      }

      return true;
    }

    case "stopScript":
      if (FEATURE_ENABLE_SCRIPT_ENGINE) {
        scriptRuntimeStore.stopCurrent();
      }
      return true;

    case "getScriptRuntimeState":
      if (!FEATURE_ENABLE_SCRIPT_ENGINE) {
        sendToClient(ws, {
          type: "scriptStateChanged",
          data: null,
        });

        return true;
      }

      sendToClient(ws, {
        type: "scriptDocumentChanged",
        data: scriptRuntimeStore.getDocument(),
      });

      sendToClient(ws, {
        type: "scriptStateChanged",
        data: scriptRuntimeStore.getCurrentState(),
      });

      return true;

    default:
      return false;
  }
};
