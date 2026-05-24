import dgram, { type RemoteInfo, type Socket } from "node:dgram";
import { EventEmitter } from "node:events";
import { logError, logZ21 } from "../utility.js";

export type UdpClientOptions = {
  host: string;
  port: number;
  localPort?: number;
  timeoutMs: number;
  debug?: boolean;
};

export type UdpMessage = {
  data: Buffer;
  remote: RemoteInfo;
};

export class UdpClient extends EventEmitter {
  private readonly host: string;
  private readonly port: number;
  private readonly localPort?: number | undefined;
  private readonly timeoutMs: number;
  private readonly debug: boolean;

  private socket: Socket | undefined;
  public lastReceivedMessage = 0;

  constructor(options: UdpClientOptions) {
    super();

    this.host = options.host;
    this.port = options.port;
    this.localPort = options.localPort;
    this.timeoutMs = options.timeoutMs;
    this.debug = options.debug ?? false;
  }

  get isOpen(): boolean {
    return Boolean(
      this.socket &&
      this.lastReceivedMessage > 0 &&
      Date.now() - this.lastReceivedMessage <= this.timeoutMs
    );
  }

  async open(): Promise<void> {
    logZ21("UDP open requested");

    if (this.socket) return;

    const socket = dgram.createSocket("udp4");
    this.socket = socket;

    socket.on("message", (data, remote) => {
      const message: UdpMessage = { data, remote };

      this.lastReceivedMessage = Date.now();

      if (this.debug) {
        logZ21(
          "UDP receive",
          `${remote.address}:${remote.port}`,
          bufferToHex(data)
        );
      }

      this.emit("message", message);
    });

    socket.on("error", (error) => {
      if (this.debug) {
        logError("UDP socket error:", error);
      }

      this.emit("error", error);
    });

    socket.on("close", () => {
      if (this.socket === socket) {
        this.socket = undefined;
      }

      this.lastReceivedMessage = 0;

      if (this.debug) {
        logZ21("UDP socket closed");
      }

      this.emit("close");
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => {
          socket.off("listening", onListening);
          reject(error);
        };

        const onListening = () => {
          socket.off("error", onError);
          resolve();
        };

        socket.once("error", onError);
        socket.once("listening", onListening);

        if (this.localPort !== undefined) {
          socket.bind(this.localPort);
        } else {
          socket.bind();
        }
      });
    } catch (error) {
      if (this.socket === socket) {
        this.socket = undefined;
      }

      socket.removeAllListeners();
      socket.close();

      throw error;
    }
  }

  close(): void {
    if (this.socket) {
      const socket = this.socket;
      this.socket = undefined;

      try {
        socket.close();
      } catch (error) {
        if (this.debug) {
          logError("UDP socket close failed:", error);
        }
      }
    }

    this.lastReceivedMessage = 0;
  }

  async send(data: Buffer | Uint8Array | number[]): Promise<void> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

    if (this.debug) {
      logZ21("UDP send", `${this.host}:${this.port}`, bufferToHex(buffer));
    }

    await new Promise<void>((resolve, reject) => {
      const socket = this.socket;

      if (!socket) {
        reject(new Error("UDP socket is not open"));
        return;
      }

      socket.send(buffer, this.port, this.host, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

export function bufferToHex(buffer: Buffer): string {
  return [...buffer]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join(" ");
}