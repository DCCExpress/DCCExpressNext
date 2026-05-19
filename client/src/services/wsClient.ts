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
    raw: TypedServerWsMessage<TType>
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

    public send<T = any>(
        message: ClientWsMessage<T>
    ): boolean {
        if (
            !this.socket ||
            this.socket.readyState !== WebSocket.OPEN
        ) {
            console.warn(
                "[WS] Cannot send, socket is not open:",
                message
            );

            return false;
        }

        this.socket.send(JSON.stringify(message));
        return true;
    }

    public isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    public getStatus(): WsConnectionStatus {
        return this.status;
    }

    public subscribeStatus(
        listener: StatusListener
    ): () => void {
        this.statusListeners.add(listener);
        listener(this.status);

        return () => {
            this.statusListeners.delete(listener);
        };
    }

    public subscribeMessages(
        listener: MessageListener
    ): () => void {
        this.messageListeners.add(listener);

        return () => {
            this.messageListeners.delete(listener);
        };
    }

    public on<TType extends ServerWsMessageType>(
        type: TType,
        listener: TypedMessageListener<TType>
    ): () => void {
        if (!this.typedListeners.has(type)) {
            this.typedListeners.set(type, new Set());
        }

        const storedListener =
            listener as unknown as AnyTypedMessageListener;

        this.typedListeners.get(type)!.add(storedListener);

        return () => {
            const listeners =
                this.typedListeners.get(type);

            if (!listeners) {
                return;
            }

            listeners.delete(storedListener);

            if (listeners.size === 0) {
                this.typedListeners.delete(type);
            }
        };
    }

    private handleIncoming(rawData: unknown): void {
        try {
            const message =
                JSON.parse(String(rawData)) as TypedServerWsMessage;

            if (
                !message ||
                typeof message.type !== "string"
            ) {
                console.warn(
                    "[WS] Invalid message format:",
                    rawData
                );

                return;
            }

            for (const listener of this.messageListeners) {
                listener(message);
            }

            const listeners =
                this.typedListeners.get(message.type);

            if (listeners) {
                for (const listener of listeners) {
                    listener(
                        message.data as ServerWsPayloadMap[ServerWsMessageType],
                        message
                    );
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

    private scheduleReconnect(): void {
        this.clearReconnectTimer();

        this.reconnectAttempts++;

        const delay = Math.min(
            this.reconnectDelayMs * this.reconnectAttempts,
            this.maxReconnectDelayMs
        );

        console.log(`[WS] Reconnecting in ${delay} ms`);

        this.reconnectTimer = window.setTimeout(() => {
            this.connect();
        }, delay);
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer !== null) {
            window.clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private setStatus(
        status: WsConnectionStatus
    ): void {
        this.status = status;

        for (const listener of this.statusListeners) {
            listener(status);
        }
    }
}

export const wsClient =
    new WsClient();
