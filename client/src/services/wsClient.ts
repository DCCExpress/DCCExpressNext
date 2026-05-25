// client/src/services/wsClient.ts

import type {
    ClientWsMessage,
    ServerWsMessageType,
    ServerWsPayloadMap,
    TypedServerWsMessage,
} from "../../../common/src/types";

export type WsConnectionStatus =
    | "disconnected"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "error";

type StatusListener =
    (status: WsConnectionStatus) => void;

type MessageListener =
    (message: TypedServerWsMessage) => void;

type TypedMessageListener<
    TType extends ServerWsMessageType
> = (
    data: ServerWsPayloadMap[TType],
    raw: Extract<TypedServerWsMessage, { type: TType }>
) => void;

type AnyTypedMessageListener =
    (
        data: ServerWsPayloadMap[ServerWsMessageType],
        raw: TypedServerWsMessage
    ) => void;

const WS_DEBUG = false;

class WsClient {
    private socket: WebSocket | null = null;
    private status: WsConnectionStatus = "disconnected";

    private statusListeners =
        new Set<StatusListener>();

    private messageListeners =
        new Set<MessageListener>();

    private typedListeners =
        new Map<string, Set<AnyTypedMessageListener>>();

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

            if (WS_DEBUG) {
                console.info("[WS] connected");
            }
        };

        this.socket.onmessage = event => {
            try {
                const message =
                    JSON.parse(event.data) as TypedServerWsMessage;

                this.messageListeners.forEach(listener =>
                    listener(message)
                );

                const typed =
                    this.typedListeners.get(message.type);

                if (typed) {
                    typed.forEach(listener =>
                        listener(
                            message.data as ServerWsPayloadMap[ServerWsMessageType],
                            message
                        )
                    );
                }
            } catch (error) {
                console.error(
                    "Invalid WebSocket message:",
                    event.data,
                    error
                );
            }
        };

        this.socket.onclose = event => {
            this.socket = null;

            if (this.manuallyClosed) {
                this.setStatus("disconnected");
                return;
            }

            if (WS_DEBUG) {
                console.warn(
                    "[WS] disconnected, reconnecting...",
                    event.reason
                );
            }

            this.setStatus("reconnecting");
            this.scheduleReconnect();
        };

        this.socket.onerror = () => {
            this.setStatus("error");
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

    public isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    public getStatus(): WsConnectionStatus {
        return this.status;
    }

    public send(message: ClientWsMessage): boolean {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn("WebSocket is not connected, message was not sent", message);
            return false;
        }

        this.socket.send(JSON.stringify(message));
        return true;
    }

    public subscribeStatus(listener: StatusListener): () => void {
        this.statusListeners.add(listener);
        listener(this.status);

        return () => {
            this.statusListeners.delete(listener);
        };
    }

    public subscribeMessages(listener: MessageListener): () => void {
        this.messageListeners.add(listener);

        return () => {
            this.messageListeners.delete(listener);
        };
    }

    public on<TType extends ServerWsMessageType>(
        type: TType,
        listener: TypedMessageListener<TType>
    ): () => void {
        const listeners =
            this.typedListeners.get(type) ??
            new Set<AnyTypedMessageListener>();

        listeners.add(listener as AnyTypedMessageListener);
        this.typedListeners.set(type, listeners);

        return () => {
            const current =
                this.typedListeners.get(type);

            if (!current) {
                return;
            }

            current.delete(listener as AnyTypedMessageListener);

            if (current.size === 0) {
                this.typedListeners.delete(type);
            }
        };
    }

    private setStatus(status: WsConnectionStatus) {
        if (this.status === status) {
            return;
        }

        this.status = status;

        this.statusListeners.forEach(listener =>
            listener(status)
        );
    }

    private scheduleReconnect() {
        this.clearReconnectTimer();
        this.reconnectAttempts++;

        const delay = Math.min(
            this.reconnectDelayMs * this.reconnectAttempts,
            this.maxReconnectDelayMs
        );

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
}

export const wsClient = new WsClient();