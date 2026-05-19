#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  wsTypes: path.join(
    ROOT,
    "common/src/wsTypes.ts"
  ),
  wsClient: path.join(
    ROOT,
    "client/src/services/wsClient.ts"
  ),
};

function fail(message) {
  throw new Error(message);
}

function ensureExisting(file) {
  if (!fs.existsSync(file)) {
    fail(`Hiányzó fájl: ${path.relative(ROOT, file)}`);
  }
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Frissítve: ${path.relative(ROOT, file)}`);
}

const WS_TYPES = `// common/src/wsTypes.ts

import type {
  Direction,
} from "./domainTypes.js";

/**
 * Általános, szerveroldalon és bejövő kliensüzeneteknél is
 * használható WebSocket message alap.
 *
 * A data szándékosan opcionális:
 * pl. routeLock / routeUnlock / getBlocks jellegű üzeneteknél
 * nincs értelmes payload.
 */
export type WsMessage<T = any> = {
  type: string;
  data?: T;
  uuid: string | null;
};

/**
 * Kliens -> szerver küldött üzenet.
 * A kliens API minden parancshoz saját, stabil UUID-t ad.
 */
export type ClientWsMessage<T = any> = {
  type: string;
  data?: T;
  uuid: string;
};

export type SetLocoMessage = ClientWsMessage<{
  locoAddress: number;
  speed: number;
  direction: Direction;
}> & {
  type: "setLoco";
};

export type SetLocoFunctionMessage = ClientWsMessage<{
  locoAddress: number;
  functionNumber: number;
  active: boolean;
}> & {
  type: "setLocoFunction";
};

export type SetTurnoutMessage = ClientWsMessage<{
  address: number;
  closed: boolean;
}> & {
  type: "setTurnout";
};

export type TurnoutChangedMessage = {
  type: "turnoutChanged";
  data: {
    address: number;
    closed: boolean;
  };
};

export type AccessoryChangedMessage = {
  type: "accessoryChanged";
  data: {
    address: number;
    active: boolean;
  };
};

export type SetSensorMessage = ClientWsMessage<{
  address: number;
  on: boolean;
}> & {
  type: "setSensor";
};

export type CommandCenterInfo = {
  type: "commandCenterInfo";
  data: {
    type: string;
    alive: boolean;
    power: boolean;
  };
};

export type ReserveRouteMessage = ClientWsMessage<{
  fromBlockName: string;
  toBlockName: string;
}> & {
  type: "reserveRoute";
};

export type ClearAllRouteReservationsMessage = ClientWsMessage<{}> & {
  type: "clearAllRouteReservations";
};

export type RouteReservationChangedMessage = {
  type: "routeReservationChanged";
  data: {
    busy: boolean;
    sectionNames: string[];
    turnoutAddresses: number[];
    fromBlockName?: string;
    toBlockName?: string;
  };
};

export type RouteReservationRejectedMessage = {
  type: "routeReservationRejected";
  data: {
    reason: string;
  };
};
`;

const WS_CLIENT = `// client/src/services/wsClient.ts

import type {
    ClientWsMessage,
    WsMessage,
} from "../../../common/src/types";

export type WsConnectionStatus =
    | "disconnected"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "error";

type StatusListener = (status: WsConnectionStatus) => void;
type MessageListener = (message: WsMessage) => void;
type TypedMessageListener<T = any> = (data: T, raw: WsMessage<T>) => void;

const WS_DEBUG = false;

class WsClient {
    private socket: WebSocket | null = null;
    private status: WsConnectionStatus = "disconnected";

    private statusListeners = new Set<StatusListener>();
    private messageListeners = new Set<MessageListener>();
    private typedListeners = new Map<string, Set<TypedMessageListener>>();

    private reconnectTimer: number | null = null;
    private manuallyClosed = false;

    private reconnectAttempts = 0;
    private readonly reconnectDelayMs = 3000;
    private readonly maxReconnectDelayMs = 10000;

    private url = "";

    public connect(url?: string) {
        if (url) {
            this.url = url;
        }

        if (!this.url) {
            console.error("WebSocket URL is missing.");
            return;
        }

        if (
            this.socket &&
            (
                this.socket.readyState === WebSocket.OPEN ||
                this.socket.readyState === WebSocket.CONNECTING
            )
        ) {
            return;
        }

        this.clearReconnectTimer();
        this.manuallyClosed = false;
        this.setStatus(
            this.reconnectAttempts > 0
                ? "reconnecting"
                : "connecting"
        );

        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            this.reconnectAttempts = 0;
            this.setStatus("connected");
            console.log("[WS] Connected:", this.url);
        };

        this.socket.onmessage = (event: MessageEvent) => {
            try {
                if (WS_DEBUG) {
                    console.debug("[WS] message:", event.data);
                }

                this.handleIncoming(event.data);
            } catch (error) {
                console.log(error);
            }
        };

        this.socket.onerror = (error) => {
            console.error("[WS] Error:", error);
            this.setStatus("error");
        };

        this.socket.onclose = () => {
            console.warn("[WS] Closed");

            if (this.socket) {
                this.socket.onopen = null;
                this.socket.onmessage = null;
                this.socket.onerror = null;
                this.socket.onclose = null;
            }

            this.socket = null;
            this.setStatus("disconnected");

            if (!this.manuallyClosed) {
                this.scheduleReconnect();
            }
        };
    }

    public disconnect() {
        this.manuallyClosed = true;
        this.clearReconnectTimer();

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.setStatus("disconnected");
    }

    public send<T = any>(message: ClientWsMessage<T>) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn("[WS] Cannot send, socket is not open:", message);
            return false;
        }

        this.socket.send(JSON.stringify(message));
        return true;
    }

    public isConnected() {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    public getStatus() {
        return this.status;
    }

    public subscribeStatus(listener: StatusListener) {
        this.statusListeners.add(listener);
        listener(this.status);

        return () => {
            this.statusListeners.delete(listener);
        };
    }

    public subscribeMessages(listener: MessageListener) {
        this.messageListeners.add(listener);

        return () => {
            this.messageListeners.delete(listener);
        };
    }

    public on<T = any>(type: string, listener: TypedMessageListener<T>) {
        if (!this.typedListeners.has(type)) {
            this.typedListeners.set(type, new Set());
        }

        this.typedListeners.get(type)!.add(
            listener as TypedMessageListener
        );

        return () => {
            const listeners = this.typedListeners.get(type);

            if (!listeners) {
                return;
            }

            listeners.delete(listener as TypedMessageListener);

            if (listeners.size === 0) {
                this.typedListeners.delete(type);
            }
        };
    }

    private handleIncoming(rawData: any) {
        try {
            const message =
                JSON.parse(rawData) as WsMessage;

            if (!message || typeof message.type !== "string") {
                console.warn("[WS] Invalid message format:", rawData);
                return;
            }

            for (const listener of this.messageListeners) {
                listener(message);
            }

            const listeners =
                this.typedListeners.get(message.type);

            if (listeners) {
                for (const listener of listeners) {
                    listener(message.data, message);
                }
            }
        } catch (error) {
            console.error(
                "[WS] Failed to parse message:",
                rawData,
                error
            );
        }
    }

    private scheduleReconnect() {
        this.clearReconnectTimer();

        this.reconnectAttempts++;

        const delay = Math.min(
            this.reconnectDelayMs * this.reconnectAttempts,
            this.maxReconnectDelayMs
        );

        console.log(\`[WS] Reconnecting in \${delay} ms\`);

        this.reconnectTimer = window.setTimeout(() => {
            this.connect();
        }, delay);
    }

    private clearReconnectTimer() {
        if (this.reconnectTimer !== null) {
            window.clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private setStatus(status: WsConnectionStatus) {
        this.status = status;

        for (const listener of this.statusListeners) {
            listener(status);
        }
    }
}

export const wsClient = new WsClient();
`;

try {
  console.log("DCCExpressNext – Common WS message base Sprint 10 patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  ensureExisting(FILES.wsTypes);
  ensureExisting(FILES.wsClient);

  write(FILES.wsTypes, WS_TYPES);
  write(FILES.wsClient, WS_CLIENT);

  console.log("");
  console.log("Kész.");
  console.log("Nem készültek .bak fájlok.");
  console.log("");
  console.log("Javasolt ellenőrzés:");
  console.log("  npm run build");
} catch (error) {
  console.error("");
  console.error("PATCH HIBA:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
