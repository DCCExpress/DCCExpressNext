// server/src/ws/wsMessageRouter.ts

import {
  logError,
} from "../utility.js";

import type {
  WsHandlerContext,
} from "./handlers/wsHandlerTypes.js";

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
import { handleLocoReservationMessage } from "./handlers/wsLocoReservationMessageHandlers.js";

const handlers = [
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
