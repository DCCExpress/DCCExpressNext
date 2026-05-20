import {
  SerialPort,
} from "serialport";

import {
  log,
  logError,
} from "../utility.js";

type SerialClientCallbacks = {
  onConnected: () => void;
  onDisconnected: () => void;
  onData: (data: Buffer) => void;
  onError: (error: Error) => void;
};

export class SerialClient {
  private port: SerialPort | null = null;
  private stopped = true;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly reconnectDelayMs = 5000;

  constructor(
    private readonly path: string,
    private readonly baudRate: number,
    private readonly callbacks: SerialClientCallbacks
  ) {}

  get isOpen(): boolean {
    return Boolean(this.port?.isOpen);
  }

  start(): void {
    if (!this.stopped) {
      return;
    }

    this.stopped = false;
    this.open();
  }

  stop(): void {
    this.stopped = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (!this.port) {
      this.callbacks.onDisconnected();
      return;
    }

    const port =
      this.port;

    this.port = null;
    port.removeAllListeners();

    if (port.isOpen) {
      port.close(() => {
        port.destroy();
        this.callbacks.onDisconnected();
      });
      return;
    }

    port.destroy();
    this.callbacks.onDisconnected();
  }

  send(data: string): boolean {
    if (!this.port || !this.port.isOpen) {
      logError(
        "DCC-EX serial send failed: no active serial connection."
      );
      return false;
    }

    this.port.write(data);
    return true;
  }

  private open(): void {
    if (this.stopped) {
      return;
    }

    log(
      `DCC-EX serial opening ${this.path} at ${this.baudRate} baud`
    );

    const port =
      new SerialPort({
        path: this.path,
        baudRate: this.baudRate,
        autoOpen: false,
        rtscts: false,
      });

    this.port = port;

    port.on("open", () => {
      port.set(
        {
          rts: false,
          dtr: false,
        },
        error => {
          if (error) {
            logError("DCC-EX serial RTS/DTR error:", error.message);
          }
        }
      );

      this.callbacks.onConnected();
    });

    port.on("data", data => {
      this.callbacks.onData(data);
    });

    port.on("error", error => {
      this.callbacks.onError(error);
    });

    port.on("close", () => {
      if (this.port === port) {
        this.port = null;
      }

      this.callbacks.onDisconnected();

      if (!this.stopped) {
        this.scheduleReconnect();
      }
    });

    port.open(error => {
      if (error) {
        this.callbacks.onError(error);
        port.removeAllListeners();
        port.destroy();

        if (this.port === port) {
          this.port = null;
        }

        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, this.reconnectDelayMs);
  }
}
