// server/src/ws/wsMessageRouter.ts

import {
  logError,
} from "../utility.js";

import type {
  WsHandlerContext,
} from "./handlers/wsHandlerTypes.js";

import {
  handleLayoutMessage,
} from "./handlers/wsLayoutMessageHandlers.js";

import {
  handleLocosMessage,
} from "./handlers/wsLocosMessageHandlers.js";

import {
  handleScriptDocumentMessage,
} from "./handlers/wsScriptDocumentMessageHandlers.js";

import {
  handleCommandCenterConfigMessage,
} from "./handlers/wsCommandCenterConfigMessageHandlers.js";

import {
  handleLockMessage,
} from "./handlers/wsLockMessageHandlers.js";

import {
  handleRouteMessage,
} from "./handlers/wsRouteMessageHandlers.js";

import {
  handleCommandCenterMessage,
} from "./handlers/wsCommandCenterMessageHandlers.js";

import {
  handleScriptMessage,
} from "./handlers/wsScriptMessageHandlers.js";

import {
  handleTaskMessage,
} from "./handlers/wsTaskMessageHandlers.js";

import {
  handleLocoReservationMessage,
} from "./handlers/wsLocoReservationMessageHandlers.js";

import {
  handleRuntimeVariableMessage,
} from "./handlers/wsRuntimeVariableMessageHandlers.js";

import {
  handleEditorEditModeMessage,
} from "./handlers/wsEditorEditModeMessageHandlers.js";

const handlers = [
  handleLayoutMessage,
  handleLocosMessage,
  handleScriptDocumentMessage,
  handleCommandCenterConfigMessage,
  handleRuntimeVariableMessage,
  handleEditorEditModeMessage,
  handleLockMessage,
  handleRouteMessage,
  handleLocoReservationMessage,
  handleCommandCenterMessage,
  handleScriptMessage,
  handleTaskMessage,
] as const;

export async function routeIncomingWebSocketMessage(
  context: WsHandlerContext
): Promise<void> {
  for (const handler of handlers) {
    const handled =
      await handler(context);

    if (handled) {
      return;
    }
  }

  logError(
    "Unknown message type:",
    context.msg.type
  );

  context.sendToClient(context.ws, {
    type: "error",
    data: {
      message: "Unknown message type",
    },
  });
}
