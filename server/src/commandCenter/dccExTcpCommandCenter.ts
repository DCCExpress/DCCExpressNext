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
    this.tcpClient.start();

    this.mainTask = setInterval(() => {
      this.processBuffer();

      if (Date.now() - this.lastSentAt > 5000) {
        this.enqueueKeepalive();
      }
    }, this.mainTaskIntervalMs);

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

  private processBuffer(): void {
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
