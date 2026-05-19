// server/src/ws/handlers/wsScriptMessageHandlers.ts

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
      try {
        const script =
          typeof msg.data?.script === "string"
            ? msg.data.script
            : undefined;

        const source =
          typeof msg.data?.source === "string"
            ? msg.data.source
            : "unknown";

        const elementId =
          typeof msg.data?.elementId === "string"
            ? msg.data.elementId
            : null;

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
