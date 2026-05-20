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
  SerialClient,
} from "./serialClient.js";

export class DccExSerialCommandCenter extends DccExCommandCenter {
  private readonly serialClient: SerialClient;
  private mainTask: NodeJS.Timeout | null = null;
  private lastSentAt = 0;
  private readonly mainTaskIntervalMs = 50;

  constructor(
    name: string,
    private readonly serialPort: string,
    private readonly baudRate: number,
    initCommands: string
  ) {
    super(name, "dcc-ex-serial", initCommands);

    this.serialClient = new SerialClient(
      serialPort,
      baudRate,
      {
        onConnected: () => this.markConnected(),
        onDisconnected: () => this.markDisconnected(),
        onData: data => this.received(data),
        onError: error => this.handleError(error),
      }
    );
  }

  getConnectionString(): string {
    return `serial://${this.serialPort}@${this.baudRate}`;
  }

  protected override getCommandCenterInfoExtra(): Partial<CommandCenterInfoPayload> {
    return {
      serialPort: this.serialPort,
      port: this.baudRate,
    };
  }

  start(): Promise<boolean> {
    this.stop();
    this.serialClient.start();

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

    this.serialClient.stop();
    return Promise.resolve(true);
  }

  private processBuffer(): void {
    const data =
      this.drainQueuedCommands(5);

    if (!data) {
      return;
    }

    if (this.serialClient.send(data)) {
      this.lastSentAt = Date.now();
    }
  }

  private handleError(error: Error): void {
    logError("DCC-EX serial command center error:", error.message);
  }
}
