import type {
  CommandCenterType,
  CommandCenterInfoPayload,
  LocoState,
  SensorInfo,
  TurnoutInfo,
  TypedServerWsMessage,
  WsPowerInfoPayload,
} from "../../../common/src/types.js";

import {
  broadcastAll,
} from "../ws/wsServer.js";

import {
  log,
} from "../utility.js";

import {
  CommandCenter,
} from "./CommandCenter.js";

const DCC_EX_KEEPALIVE_COMMAND = "<#>";

export abstract class DccExCommandCenter extends CommandCenter {
  protected readonly buffer: string[] = [];
  private receiveBuffer = "";
  private alive = false;

  constructor(
    name: string,
    private readonly commandCenterType: Extract<
      CommandCenterType,
      "dcc-ex-tcp" | "dcc-ex-serial"
    >,
    private readonly initCommands = ""
  ) {
    super(name);
  }

  protected abstract isTransportConnected(): boolean;

  protected enqueue(command: string): void {
    const trimmed =
      command.trim();

    if (!trimmed) {
      return;
    }

    if (!trimmed.startsWith(DCC_EX_KEEPALIVE_COMMAND)) {
      log(`DCC-EX ${this.getName()} -> ${trimmed}`);
    }

    this.buffer.push(trimmed);
  }

  protected markConnected(): void {
    this.alive = true;
    this.broadcastCommandCenterInfo();
    this.broadcastPowerInfo();

    for (const line of this.initCommands.split(/\r?\n/u)) {
      this.enqueue(line);
    }

    this.enqueue("<s>");
  }

  protected markDisconnected(): void {
    this.alive = false;
    this.buffer.length = 0;
    this.broadcastCommandCenterInfo();
  }

  protected received(data: Buffer | string): void {
    const message =
      data.toString();

    if (!message.startsWith("<#")) {
      log(`DCC-EX ${this.getName()} <- ${message.trim()}`);
    }

    for (const char of message) {
      if (char === "<") {
        this.receiveBuffer = "";
        continue;
      }

      if (char === ">") {
        this.parseFrame(this.receiveBuffer.trim());
        this.receiveBuffer = "";
        continue;
      }

      if (char === "\n" || char === "\r") {
        continue;
      }

      this.receiveBuffer += char;
    }
  }

  clientConnected(): void {
    this.broadcastCommandCenterInfo();
    this.broadcastPowerInfo();
  }

  setTrackPower(on: boolean): Promise<boolean> {
    if (!this.isTransportConnected()) {
      return Promise.resolve(false);
    }

    this.enqueue(on ? "<1 MAIN>" : "<0>");
    return Promise.resolve(true);
  }

  override setProgrammingPower(on: boolean): Promise<boolean> {
    if (!this.isTransportConnected()) {
      return Promise.resolve(false);
    }

    this.enqueue(on ? "<1 PROG>" : "<0 PROG>");
    return Promise.resolve(true);
  }

  emergencyStop(): Promise<boolean> {
    if (!this.isTransportConnected()) {
      return Promise.resolve(false);
    }

    this.enqueue("<!>");

    this.powerInfo.emergencyStop = true;

    for (const loco of this.locos.values()) {
      if (loco.speed === 0) {
        continue;
      }

      loco.speed = 0;
      this.broadcastLoco(loco);
    }

    this.broadcastPowerInfo();
    return Promise.resolve(true);
  }

  setLoco(
    address: number,
    speed: number,
    direction: "forward" | "reverse"
  ): Promise<boolean> {
    if (!this.isTransportConnected()) {
      return Promise.resolve(false);
    }

    const dccExSpeed =
      Math.max(0, Math.min(126, Math.round(speed)));
    const dccExDirection =
      direction === "forward" ? 1 : 0;

    this.enqueue(
      `<t ${address} ${dccExSpeed} ${dccExDirection}>`
    );

    const loco =
      this.getOrCreateLoco(address);

    loco.speed = dccExSpeed;
    loco.direction = direction;
    this.powerInfo.emergencyStop = false;
    this.broadcastLoco(loco);
    this.broadcastPowerInfo();

    return Promise.resolve(true);
  }

  setLocoFunction(
    address: number,
    fn: number,
    active: boolean
  ): Promise<boolean> {
    if (!this.isTransportConnected()) {
      return Promise.resolve(false);
    }

    this.enqueue(
      `<F ${address} ${fn} ${active ? 1 : 0}>`
    );

    const loco =
      this.getOrCreateLoco(address);

    loco.functions[fn] = active;
    this.broadcastLoco(loco);

    return Promise.resolve(true);
  }

  getLoco(
    address: number
  ): Promise<LocoState | null> {
    if (!this.isTransportConnected()) {
      return Promise.resolve(
        this.locos.get(address) ?? null
      );
    }

    this.enqueue(`<t ${address}>`);
    return Promise.resolve(
      this.locos.get(address) ?? null
    );
  }

  setTurnout(
    address: number,
    closed: boolean
  ): Promise<boolean> {
    if (!this.isTransportConnected()) {
      return Promise.resolve(false);
    }

    this.enqueue(`<T ${address} ${closed ? 0 : 1}>`);
    this.enqueue(`<JT ${address}>`);

    const turnout =
      this.getOrCreateTurnout(address);

    turnout.closed = closed;
    this.broadcastTurnout(turnout);

    return Promise.resolve(true);
  }

  getTurnout(
    address: number
  ): Promise<TurnoutInfo | null> {
    if (!this.isTransportConnected()) {
      return Promise.resolve(
        this.turnouts.get(address) ?? null
      );
    }

    this.enqueue(`<JT ${address}>`);
    return Promise.resolve(
      this.turnouts.get(address) ?? null
    );
  }

  setBasicAccessory(
    address: number,
    active: boolean
  ): Promise<boolean> {
    if (!this.isTransportConnected()) {
      return Promise.resolve(false);
    }

    if (this.isBasicAccessoryStateAlreadySet(address, active)) {
      return Promise.resolve(true);
    }

    const command =
      `<a ${address} ${active ? 1 : 0}>`;

    this.enqueue(command);
    this.enqueue(command);

    const accessory =
      this.setBasicAccessoryRuntimeState(address, active);

    broadcastAll({
      type: "accessoryChanged",
      data: {
        address,
        active,
      },
    });

    return Promise.resolve(true);
  }

  getSensor(
    address: number
  ): Promise<SensorInfo | null> {
    if (!this.isTransportConnected()) {
      return Promise.resolve(
        this.sensors.get(address) ?? null
      );
    }

    this.enqueue(`<Q ${address}>`);
    return Promise.resolve(
      this.sensors.get(address) ?? null
    );
  }

  override writeDirectCommand(command: string): Promise<boolean> {
    if (!this.isTransportConnected()) {
      return Promise.resolve(false);
    }

    for (const line of command.split(/\r?\n/u)) {
      this.enqueue(line);
    }

    return Promise.resolve(true);
  }

  protected drainQueuedCommands(maxCommands: number): string | null {
    if (this.buffer.length === 0) {
      return null;
    }

    let data = "";
    let count = 0;

    while (this.buffer.length > 0 && count < maxCommands) {
      data += this.buffer.shift();
      count += 1;
    }

    return data;
  }

  protected enqueueKeepalive(): void {
    this.enqueue(DCC_EX_KEEPALIVE_COMMAND);
  }

  private parseFrame(frame: string): void {
    if (!frame || frame === "# 50") {
      return;
    }

    if (frame.startsWith("p1")) {
      this.parsePowerFrame(frame, true);
      return;
    }

    if (frame.startsWith("p0")) {
      this.parsePowerFrame(frame, false);
      return;
    }

    if (frame.startsWith("Q ")) {
      this.parseSensorFrame(frame, true);
      return;
    }

    if (frame.startsWith("q ")) {
      this.parseSensorFrame(frame, false);
      return;
    }

    if (frame.startsWith("l ")) {
      this.parseLocoFrame(frame);
      return;
    }

    if (frame.startsWith("H ")) {
      this.parseLegacyTurnoutFrame(frame);
      return;
    }

    if (frame.startsWith("jT ")) {
      this.parseTurnoutFrame(frame);
      return;
    }

    broadcastAll({
      type: "dccExDirectCommandResponse",
      data: {
        response: frame,
      },
    });
  }

  private parsePowerFrame(
    frame: string,
    on: boolean
  ): void {
    const [, track] =
      frame.split(/\s+/u);

    if (!track || track === "MAIN" || track === "A") {
      this.powerInfo.trackVoltageOn = on;
      this.powerInfo.emergencyStop = false;
    }

    if (track === "PROG" || track === "B") {
      this.powerInfo.emergencyStop = false;
    }

    this.broadcastPowerInfo();
    this.broadcastCommandCenterInfo();
  }

  private parseSensorFrame(
    frame: string,
    on: boolean
  ): void {
    const [, addressText] =
      frame.split(/\s+/u);
    const address =
      Number(addressText);

    if (!Number.isFinite(address)) {
      return;
    }

    this.sensors.set(address, {
      address,
      active: on,
    });

    broadcastAll({
      type: "sensorChanged",
      data: {
        address,
        on,
      },
    });
  }

  private parseLocoFrame(frame: string): void {
    const parts =
      frame.split(/\s+/u);
    const address =
      Number(parts[1]);
    const speedByte =
      Number(parts[3]);
    const functionMap =
      Number(parts[4] ?? 0);

    if (
      !Number.isFinite(address) ||
      !Number.isFinite(speedByte)
    ) {
      return;
    }

    const loco =
      this.getOrCreateLoco(address);

    if (speedByte >= 2 && speedByte <= 127) {
      loco.speed = speedByte - 1;
      loco.direction = "reverse";
    } else if (speedByte >= 130 && speedByte <= 255) {
      loco.speed = speedByte - 129;
      loco.direction = "forward";
    } else if (speedByte === 0) {
      loco.speed = 0;
      loco.direction = "reverse";
    } else if (speedByte === 128) {
      loco.speed = 0;
      loco.direction = "forward";
    }

    if (Number.isFinite(functionMap)) {
      for (let fn = 0; fn < 32; fn += 1) {
        loco.functions[fn] =
          (functionMap & (1 << fn)) !== 0;
      }
    }

    this.broadcastLoco(loco);
  }

  private parseLegacyTurnoutFrame(frame: string): void {
    const parts =
      frame.split(/\s+/u);
    const address =
      Number(parts[1]);
    const state =
      Number(parts[2]);

    if (!Number.isFinite(address)) {
      return;
    }

    const turnout =
      this.getOrCreateTurnout(address);

    turnout.closed = state === 0;
    this.broadcastTurnout(turnout);
  }

  private parseTurnoutFrame(frame: string): void {
    const parts =
      frame.split(/\s+/u);
    const address =
      Number(parts[1]);
    const state =
      parts[2];

    if (!Number.isFinite(address)) {
      return;
    }

    const turnout =
      this.getOrCreateTurnout(address);

    turnout.closed = state === "C";
    this.broadcastTurnout(turnout);
  }

  private broadcastLoco(loco: LocoState): void {
    broadcastAll({
      type: "locoState",
      data: {
        loco,
      },
    });
  }

  private broadcastTurnout(turnout: TurnoutInfo): void {
    const msg: TypedServerWsMessage<"turnoutChanged"> = {
      type: "turnoutChanged",
      data: {
        address: turnout.address,
        closed: turnout.closed,
      },
    };

    broadcastAll(msg);
  }

  protected broadcastPowerInfo(): void {
    const powerInfo: WsPowerInfoPayload = {
      emergencyStop: this.powerInfo.emergencyStop,
      trackVoltageOn: this.powerInfo.trackVoltageOn,
      trackVoltageOff: !this.powerInfo.trackVoltageOn,
      shortCircuit: this.powerInfo.shortCircuit,
      programmingModeActive: false,
    };

    broadcastAll({
      type: "powerInfo",
      data: powerInfo,
    });
  }

  protected getCommandCenterInfoExtra(): Partial<CommandCenterInfoPayload> {
    return {};
  }

  protected broadcastCommandCenterInfo(): void {
    broadcastAll({
      type: "commandCenterInfo",
      data: {
        alive: this.alive,
        power: this.powerInfo.trackVoltageOn,
        type: this.commandCenterType,
        name: this.getName(),
        connectionString: this.getConnectionString(),
        ...this.getCommandCenterInfoExtra(),
      },
    });
  }
}
