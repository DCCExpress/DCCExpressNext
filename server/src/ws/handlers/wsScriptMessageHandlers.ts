// server/src/ws/handlers/wsScriptMessageHandlers.ts

import {
  scriptRuntimeStore,
} from "../../services/scriptRuntimeStore.js";

import type {
  ScriptRunSource,
} from "../../services/scriptRuntimeStore.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

function normalizeScriptRunSource(
  value: string
): ScriptRunSource {
  switch (value) {
    case "property-panel":
    case "route-button":
    case "control-panel":
    case "auto-start":
    case "unknown":
      return value;

    default:
      return "unknown";
  }
}

export const handleScriptMessage: WsMessageHandler = async ({
  ws,
  msg,
  sendToClient,
}) => {
  switch (msg.type) {
    case "runScript": {
      try {
        const {
          script,
          source,
          elementId,
        } = msg.data;

        await scriptRuntimeStore.run(
          script,
          {
            source: normalizeScriptRunSource(source),
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
      scriptRuntimeStore.stopCurrent();
      return true;

    case "getScriptRuntimeState":
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
