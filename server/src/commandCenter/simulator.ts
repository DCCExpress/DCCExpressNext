import { Loco, LocoState, SetLocoFunctionMessage, SetLocoMessage, WsMessage } from "../../../common/src/types.js";

export class CommandCenterSimulator {
  private power = false;
  private alive = true;

  private locos = new Map<number, LocoState>();
  private turnouts = new Map<number, boolean>();
  private sensors = new Map<number, boolean>();

  private sensorTimer: NodeJS.Timeout | null = null;

//   constructor(private broadcaster: BroadcastFn) {}

  start() {
    this.broadcastInfo();

    this.sensorTimer = setInterval(() => {
      this.randomSensorTick();
    }, 5000);
  }

  stop() {
    if (this.sensorTimer) {
      clearInterval(this.sensorTimer);
      this.sensorTimer = null;
    }
  }

  handleMessage(message: WsMessage) {
    switch (message.type) {
      case "powerOn":
        this.power = true;
        this.broadcastInfo();
        return;

      case "powerOff":
        this.power = false;
        this.broadcastInfo();
        return;

      case "setLoco":
        this.handleSetLoco(message.data);
        return;

      case "setLocoFunction":
        this.handleSetLocoFunction(message.data);
        return;

      case "setTurnout":
        this.turnouts.set(message.data.address, message.data.closed);
        this.emit("turnoutChanged", {
          address: message.data.address,
          closed: message.data.closed,
        });
        return;

      case "setSensor":
        this.sensors.set(message.data.address, message.data.on);
        this.emit("sensorChanged", {
          address: message.data.address,
          on: message.data.on,
        });
        return;
    }
  }

  sendInitialState() {
    this.broadcastInfo();

    for (const [address, loco] of this.locos.entries()) {
      this.emit("locoChanged", {
        address,
        speed: loco.speed,
        direction: loco.direction,
        functions: loco.functions,
      });

    //   for (const [fn, active] of Object.entries(loco.functions)) {
    //     this.emit("locoFunctionChanged", {
    //       locoId: `sim-${address}`,
    //       address,
    //       functionNumber: Number(fn),
    //       active,
    //     });
    //   }
    }

    for (const [address, closed] of this.turnouts.entries()) {
      this.emit("turnoutChanged", { address, closed });
    }

    for (const [address, on] of this.sensors.entries()) {
      this.emit("sensorChanged", { address, on });
    }
  }

  private handleSetLoco(msg: SetLocoMessage) {
    const loco = this.getOrCreateLoco(msg.data.address);
    loco.speed = msg.data.speed;
    loco.direction = msg.data.direction;

    this.emit("locoChanged", {
      address: msg.data.address,
      speed: msg.data.speed,
      direction: msg.data.direction,
    });
  }

  private handleSetLocoFunction(msg: SetLocoFunctionMessage) {
    const loco = this.getOrCreateLoco(msg.data.fn);
    //loco.functions[data.functionNumber] = msg.data.on;

    // this.emit("locoFunctionChanged", {
    //   locoId: data.locoId,
    //   address: data.address,
    //   functionNumber: data.functionNumber,
    //   active: data.active,
    //   momentary: data.momentary,
    // });

    // if (data.momentary && data.active) {
    //   setTimeout(() => {
    //     loco.functions[data.functionNumber] = false;

    //     this.emit("locoFunctionChanged", {
    //       locoId: data.locoId,
    //       address: data.address,
    //       functionNumber: data.functionNumber,
    //       active: false,
    //       momentary: true,
    //     });
    //   }, 500);
    // }
  }

  private getOrCreateLoco(address: number): LocoState {
    let loco = this.locos.get(address);
    // if (!loco) {
    //   loco = {
    //     address,
    //     speed: 0,
    //     direction: true,
    //     functions: {},
    //   };
    //   this.locos.set(address, loco);
    // }
    return loco!;
  }

  private randomSensorTick() {
    if (!this.power) return;

    const address = Math.floor(Math.random() * 8) + 1;
    const current = this.sensors.get(address) ?? false;
    const next = !current;

    this.sensors.set(address, next);

    // this.emit("sensorChanged", {
    //   address,
    //   on: next,
    // });
  }

  private broadcastInfo() {
    // this.emit("commandCenterInfo", {
    //   alive: this.alive,
    //   power: this.power,
    //   type: "simulator",
    // });
  }

  private emit(t: any, data: any){
//     type: K,
//     data: ServerToClientEvents[K]
//   ) {
//     this.broadcaster(type, data);
  }
}