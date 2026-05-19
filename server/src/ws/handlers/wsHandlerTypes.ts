// server/src/ws/handlers/wsHandlerTypes.ts

import type {
  WebSocket,
} from "ws";

import type {
  CommandCenter,
} from "../../commandCenter/CommandCenter.js";

import type {
  WsMessage,
} from "../../../../common/src/types.js";

export type SendToClient = (
  ws: WebSocket,
  message: unknown
) => void;

export type BroadcastToClients = (
  message: unknown,
  exclude?: WebSocket
) => void;

export type WsHandlerContext = {
  ws: WebSocket;
  msg: WsMessage;
  commandCenter: CommandCenter;
  sendToClient: SendToClient;
  broadcast: BroadcastToClients;
};

export type WsMessageHandler = (
  context: WsHandlerContext
) => Promise<boolean> | boolean;
