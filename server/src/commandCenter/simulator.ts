// server/src/commandCenter/simulator.ts

import type {
  LocoState,
  SensorInfo,
  TurnoutInfo,
  TypedServerWsMessage,
} from "../../../common/src/types.js";

import {
  CommandCenter,
} from "./CommandCenter.js";

import {
  log,
} from "../utility.js";

import {
  broadcastAll,
} from "../ws/wsServer.js";

export class CommandCenterSimulator extends CommandCenter {
  alive = false;
  aliveTask: NodeJS.Timeout | null = null;

  private power = true;

  async start(): Promise<boolean> {
    log("Starting command center simulator...");

    await this.init();
    this.alive = true;
    this.power = true;

    if (this.aliveTask) {
      clearInterval(this.aliveTask);
      this.aliveTask = null;
    }

    const msg: TypedServerWsMessage<"commandCenterInfo"> = {
      type: "commandCenterInfo",
      data: {
        alive: this.alive,
        power: this.power,
        type: "simulator",
      },
      uuid: this.lockOwnerUUID,
    };

    broadcastAll(msg);

    return Promise.resolve(true);
  }

  stop(): Promise<boolean> {
    log("Stopping command center simulator...");

    this.alive = false;
    //this.power = false;

    if (this.aliveTask) {
      clearInterval(this.aliveTask);
      this.aliveTask = null;
    }

    const msg: TypedServerWsMessage<"commandCenterInfo"> = {
      type: "commandCenterInfo",
      data: {
        alive: this.alive,
        power: this.power,
        type: "simulator",
      },
      uuid: this.lockOwnerUUID,
    };

    broadcastAll(msg);

    return Promise.resolve(true);
  }

  getConnectionString(): string {
    return "simulator://local";
  }

  clientConnected(): void {
    // A kezdeti runtime snapshotokat a WebSocket réteg küldi ki.
  }

  setTurnout(
    address: number,
    closed: boolean
  ): Promise<boolean> {
    log("Sim: setTurnout", {
      address,
      closed,
    });

    const turnout =
      this.getOrCreateTurnout(address);

    turnout.closed = closed;

    const msg: TypedServerWsMessage<"turnoutChanged"> = {
      type: "turnoutChanged",
      data: {
        address,
        closed,
      },
    };

    broadcastAll(msg);

    return Promise.resolve(true);
  }

  getTurnout(
    address: number
  ): Promise<TurnoutInfo | null> {
    return Promise.resolve(
      this.turnouts.get(address) ?? null
    );
  }

  async setLoco(
    address: number,
    speed: number,
    direction: "forward" | "reverse"
  ): Promise<boolean> {
    const loco =
      await this.setLocoRuntimeState(
        address,
        speed,
        direction
      );

    broadcastAll({
      type: "locoState",
      data: {
        loco,
      },
    });

    return true;
  }

  setLocoFunction(
    address: number,
    fn: number,
    active: boolean
  ): Promise<boolean> {
    const loco =
      this.getOrCreateLoco(address);

    loco.functions[fn] = active;

    broadcastAll({
      type: "locoState",
      data: {
        loco,
      },
    });

    return Promise.resolve(true);
  }

  getLoco(
    address: number
  ): Promise<LocoState | null> {
    return Promise.resolve(
      this.getOrCreateLoco(address)
    );
  }

  setBasicAccessory(
    address: number,
    active: boolean
  ): Promise<boolean> {
    if (this.isBasicAccessoryStateAlreadySet(address, active)) {
      return Promise.resolve(true);
    }

    const accessory =
      this.setBasicAccessoryRuntimeState(address, active);

    const msg: TypedServerWsMessage<"accessoryChanged"> = {
      type: "accessoryChanged",
      data: {
        address,
        active,
      },
    };

    broadcastAll(msg);

    return Promise.resolve(true);
  }

  setTrackPower(
    on: boolean
  ): Promise<boolean> {
    this.power = on;
    this.powerInfo.trackVoltageOn = on;
    this.powerInfo.emergencyStop = false;

    const powerInfo = {
      emergencyStop: false,
      trackVoltageOff: !on,
      trackVoltageOn: on,
      shortCircuit: false,
      programmingModeActive: false,
    };
    broadcastAll({
      type: "powerInfo",
      data: powerInfo,
    });

    const commandCenterInfoMessage: TypedServerWsMessage<"commandCenterInfo"> = {
      type: "commandCenterInfo",
      data: {
        alive: this.alive,
        power: this.power,
        type: "simulator",
      },
      uuid: this.lockOwnerUUID,
    };

    broadcastAll(commandCenterInfoMessage);

    return Promise.resolve(true);
  }

  async emergencyStop(): Promise<boolean> {
    log("Sim: emergencyStop");

    this.powerInfo.emergencyStop = true;

    for (const loco of this.locos.values()) {
      if (loco.speed === 0) {
        continue;
      }

      await this.stopLocoRuntimeState(loco);

      broadcastAll({
        type: "locoState",
        data: {
          loco,
        },
      });
    }

    const powerInfo = {
      emergencyStop: true,
      trackVoltageOff: !this.power,
      trackVoltageOn: this.power,
      shortCircuit: false,
      programmingModeActive: false,
    };

    broadcastAll({
      type: "powerInfo",
      data: powerInfo,
    });

    return true;
  }

  setSensor(
    address: number,
    on: boolean
  ): Promise<boolean> {
    log("Sim: setSensor", {
      address,
      on,
    });

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

    return Promise.resolve(true);
  }

  getSensor(
    address: number
  ): Promise<SensorInfo | null> {
    return Promise.resolve(
      this.sensors.get(address) ?? null
    );
  }
}
