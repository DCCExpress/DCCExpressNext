import net from "node:net";

import {
  log,
  logError,
} from "../utility.js";

type TcpClientCallbacks = {
  onConnected: () => void;
  onDisconnected: () => void;
  onData: (data: Buffer) => void;
  onError: (error: Error) => void;
};

export class TcpClient {
  private socket: net.Socket | null = null;
  private stopped = true;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly reconnectDelayMs: number,
    private readonly callbacks: TcpClientCallbacks
  ) {}

  get isOpen(): boolean {
    return Boolean(
      this.socket &&
      !this.socket.destroyed &&
      this.socket.readyState === "open"
    );
  }

  start(): void {
    if (!this.stopped) {
      return;
    }

    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const socket = this.socket;

    if (!socket) {
      return;
    }

    this.socket = null;
    socket.removeAllListeners();
    socket.destroy();

    this.callbacks.onDisconnected();
  }

  send(data: string): boolean {
    const socket = this.socket;

    if (!this.isOpen || !socket) {
      logError(
        "DCC-EX TCP send failed: no active connection."
      );
      return false;
    }

    socket.write(data, error => {
      if (error) {
        logError("DCC-EX TCP write failed:", error.message);
        this.callbacks.onError(error);
      }
    });

    return true;
  }

  private connect(): void {
    if (this.stopped) {
      return;
    }

    log(`DCC-EX TCP connecting to ${this.host}:${this.port}`);

    const socket =
      new net.Socket();

    this.socket = socket;

    socket.connect(this.port, this.host, () => {
      log(`DCC-EX TCP connected to ${this.host}:${this.port}`);
      this.callbacks.onConnected();
    });

    socket.on("data", data => {
      this.callbacks.onData(Buffer.from(data));
    });

    socket.on("error", error => {
      logError("DCC-EX TCP error:", error.message);
      this.callbacks.onError(error);
    });

    socket.on("close", () => {
      if (this.socket === socket) {
        this.socket = null;
      }

      this.callbacks.onDisconnected();

      if (!this.stopped) {
        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    log(
      `DCC-EX TCP reconnect scheduled in ${this.reconnectDelayMs}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelayMs);

    this.reconnectTimer.unref?.();
  }
}
