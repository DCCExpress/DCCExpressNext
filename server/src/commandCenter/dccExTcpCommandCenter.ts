import type {
  CommandCenterInfoPayload,
} from "../../../common/src/types.js";

import {
  logError,
} from "../utility.js";

import {
  DccExCommandCenter,
} from "./dccExCommandCenter.js";

import {
  TcpClient,
} from "./tcpClient.js";

export class DccExTcpCommandCenter extends DccExCommandCenter {
  private readonly tcpClient: TcpClient;
  private mainTask: NodeJS.Timeout | null = null;
  private lastSentAt = 0;
  private readonly mainTaskIntervalMs = 50;

  constructor(
    name: string,
    private readonly host: string,
    private readonly port: number,
    initCommands: string
  ) {
    super(name, "dcc-ex-tcp", initCommands);

    this.tcpClient = new TcpClient(
      host,
      port,
      5000,
      {
        onConnected: () => this.markConnected(),
        onDisconnected: () => this.markDisconnected(),
        onData: data => this.received(data),
        onError: error => this.handleError(error),
      }
    );
  }

  protected override isTransportConnected(): boolean {
    return this.tcpClient.isOpen;
  }

  getConnectionString(): string {
    return `tcp://${this.host}:${this.port}`;
  }

  protected override getCommandCenterInfoExtra(): Partial<CommandCenterInfoPayload> {
    return {
      ip: this.host,
      port: this.port,
    };
  }

  start(): Promise<boolean> {
    this.stop();
    this.lastSentAt = Date.now();
    this.tcpClient.start();

    this.mainTask = setInterval(() => {
      this.tickCommandLoop();
    }, this.mainTaskIntervalMs);

    this.mainTask.unref?.();

    return Promise.resolve(true);
  }

  stop(): Promise<boolean> {
    if (this.mainTask) {
      clearInterval(this.mainTask);
      this.mainTask = null;
    }

    this.tcpClient.stop();
    return Promise.resolve(true);
  }

  private tickCommandLoop(): void {
    try {
      this.processBuffer();

      if (
        this.tcpClient.isOpen &&
        Date.now() - this.lastSentAt > 5000
      ) {
        this.enqueueKeepalive();
      }
    } catch (error) {
      logError("DCC-EX TCP command loop failed:", error);
    }
  }

  private processBuffer(): void {
    if (!this.tcpClient.isOpen) {
      return;
    }

    const data =
      this.drainQueuedCommands(25);

    if (!data) {
      return;
    }

    if (this.tcpClient.send(data)) {
      this.lastSentAt = Date.now();
    }
  }

  private handleError(error: Error): void {
    logError("DCC-EX TCP command center error:", error.message);
  }
}
