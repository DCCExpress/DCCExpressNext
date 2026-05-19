// server/src/ws/handlers/wsHandlerTypes.ts

import type {
  WebSocket,
} from "ws";

import type {
  CommandCenter,
} from "../../commandCenter/CommandCenter.js";

import type {
  ClientWsMessageUnion,
  TypedServerWsMessage,
} from "../../../../common/src/types.js";

export type SendToClient = (
  ws: WebSocket,
  message: TypedServerWsMessage
) => void;

export type BroadcastToClients = (
  message: TypedServerWsMessage,
  exclude?: WebSocket
) => void;

export type WsHandlerContext = {
  ws: WebSocket;
  msg: ClientWsMessageUnion;
  commandCenter: CommandCenter;
  sendToClient: SendToClient;
  broadcast: BroadcastToClients;
};

export type WsMessageHandler = (
  context: WsHandlerContext
) => Promise<boolean> | boolean;
