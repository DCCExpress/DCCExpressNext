// server/src/ws/handlers/wsRuntimeVariableMessageHandlers.ts

import {
  isRuntimeVariableKey,
} from "../../../../common/src/runtimeVariables.js";

import {
  runtimeVariableService,
} from "../../services/runtimeVariableService.js";

import type {
  WsMessageHandler,
} from "./wsHandlerTypes.js";

export const handleRuntimeVariableMessage: WsMessageHandler = async ({
  ws,
  msg,
  sendToClient,
}) => {
  switch (msg.type) {
    case "getRuntimeVariables": {
      sendToClient(ws, {
        type: "runtimeVariablesSnapshot",
        data: runtimeVariableService.getSnapshot(),
      });

      return true;
    }

    case "setRuntimeVariable": {
      const data =
        msg.data as {
          key?: unknown;
          value?: unknown;
        };

      if (!isRuntimeVariableKey(data.key)) {
        sendToClient(ws, {
          type: "runtimeVariableRejected",
          data: {
            key: "editor.editMode",
            reason: "Unknown runtime variable key.",
          },
        });

        return true;
      }

      const result =
        await runtimeVariableService.requestSet(
          data.key,
          data.value as never,
          {
            clientId: msg.uuid,
            source: "ws",
          }
        );

      if (!result.ok) {
        sendToClient(ws, {
          type: "runtimeVariableRejected",
          data: {
            key: data.key,
            reason: result.reason,
          },
        });
      }

      return true;
    }

    default:
      return false;
  }
};
