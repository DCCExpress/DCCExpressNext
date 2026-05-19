#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  commandCenter: path.join(
    ROOT,
    "server/src/commandCenter/CommandCenter.ts"
  ),
  simulator: path.join(
    ROOT,
    "server/src/commandCenter/simulator.ts"
  ),
};

function fail(message) {
  throw new Error(message);
}

function ensureExisting(file) {
  if (!fs.existsSync(file)) {
    fail(`Hiányzó fájl: ${path.relative(ROOT, file)}`);
  }
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Frissítve: ${path.relative(ROOT, file)}`);
}

const COMMAND_CENTER = `// server/src/commandCenter/CommandCenter.ts

import path from "node:path";
import fs from "node:fs/promises";

import {
  AccessoryInfo,
  BlockState,
  Loco,
  LocoState,
  PowerInfo,
  SensorInfo,
  TurnoutInfo,
} from "../../../common/src/types.js";

import {
  readLocos,
} from "../routes/locoRoutes.js";

import {
  log,
} from "../utility.js";

import {
  onLocosChanged,
} from "../services/locoChangeNotifier.js";

import {
  broadcastAll,
} from "../ws/wsServer.js";

import {
  dataDir,
} from "../paths.js";

export type RBusInfo = {
  group: number;
  bytes: number[];
};

export type RBusSensorInfo = {
  address: number;
  moduleAddress: number;
  input: number;
  on: boolean;
  group: number;
  byteIndex: number;
  bitIndex: number;
};

type PersistedCommandCenterState = {
  version: 1;
  savedAt: string;
  blocks: [string, BlockState][];
  turnouts: [number, TurnoutInfo][];
};

type RuntimeStateLoadedCallback = (
  blocks: Map<string, BlockState>,
  turnouts: Map<number, TurnoutInfo>
) => void | Promise<void>;

export abstract class CommandCenter {
  private static activeInstance: CommandCenter | null = null;

  protected name: string;

  protected powerInfo: PowerInfo = {
    trackVoltageOn: false,
    emergencyStop: false,
    shortCircuit: false,
    current: 0,
  };

  protected locos: Map<number, LocoState> =
    new Map();

  private blocks: Map<string, BlockState> =
    new Map();

  protected turnouts: Map<number, TurnoutInfo> =
    new Map();

  protected sensors: Map<number, SensorInfo> =
    new Map();

  protected accessories: Map<number, AccessoryInfo> =
    new Map();

  protected readonly rbusGroups =
    new Map<number, number[]>();

  public locked = false;
  public lockOwnerUUID: string | null = "";

  constructor(name: string) {
    this.name = name;
    CommandCenter.activeInstance = this;

    onLocosChanged(async () => {
      const locos =
        await readLocos();

      this.setLocos(locos);

      await this.loadRuntimeState()
        .then(() => {
          log(
            "Runtime state loaded successfully after loco change"
          );
        })
        .catch(err => {
          log(
            "Failed to load runtime state after loco change:",
            err
          );
        });
    });
  }

  static getActive(): CommandCenter | null {
    return CommandCenter.activeInstance;
  }

  setLocos(locos: Loco[]): void {
    this.locos.clear();

    for (const loco of locos) {
      this.locos.set(loco.address, {
        ...loco,
        speed: 0,
        direction: "forward",
        functions: {},
      });
    }
  }

  setBlocks(blocks: BlockState[]): void {
    this.blocks.clear();

    for (const block of blocks) {
      this.blocks.set(
        block.blockId.toString(),
        block
      );
    }

    void this.saveRuntimeState();
  }

  setBlock(block: BlockState): void {
    for (const [blockId, state] of this.blocks) {
      if (state.locoId === block.locoId) {
        state.locoId = null;
        this.blocks.set(blockId, state);
      }
    }

    this.blocks.set(block.blockId, block);

    broadcastAll({
      type: "blockStateChanged",
      data: Object.fromEntries(this.blocks),
      uuid: null,
    });

    void this.saveRuntimeState();
  }

  setBlockRemove(blockState: BlockState): void {
    log("setBlockRemove", blockState);

    const block =
      this.blocks.get(blockState.blockId);

    if (
      block &&
      block.locoId === blockState.locoId
    ) {
      block.locoId = null;
      this.blocks.set(block.blockId, block);
    }

    broadcastAll({
      type: "blockStateChanged",
      data: Object.fromEntries(this.blocks),
      uuid: null,
    });

    void this.saveRuntimeState();
  }

  setBlocksReset(): void {
    for (const [blockId, block] of this.blocks) {
      block.locoId = null;
      this.blocks.set(blockId, block);
    }

    broadcastAll({
      type: "blockStateChanged",
      data: Object.fromEntries(this.blocks),
      uuid: null,
    });
  }

  public getBlocks(): void {
    this.loadRuntimeState()
      .then(() => {
        log("GET BLOCKS:", this.blocks);

        broadcastAll({
          type: "blockStateChanged",
          data: Object.fromEntries(this.blocks),
          uuid: null,
        });
      })
      .catch(err => {
        log(
          "Failed to load runtime state in getBlocks:",
          err
        );
      });
  }

  getBlockState(blockId: string): BlockState | null {
    const block =
      this.blocks.get(blockId);

    return block
      ? { ...block }
      : null;
  }

  abstract getConnectionString(): string;
  abstract start(): Promise<boolean>;
  abstract stop(): Promise<boolean>;
  abstract clientConnected(): void;

  abstract setTurnout(
    address: number,
    closed: boolean
  ): Promise<boolean>;

  abstract getTurnout(
    address: number
  ): Promise<TurnoutInfo | null>;

  abstract setLoco(
    address: number,
    speed: number,
    direction: "forward" | "reverse"
  ): Promise<boolean>;

  abstract setLocoFunction(
    address: number,
    fn: number,
    active: boolean
  ): Promise<boolean>;

  protected getOrCreateLoco(
    address: number
  ): LocoState {
    let loco =
      this.locos.get(address);

    if (!loco) {
      loco = {
        address,
        speed: 0,
        direction: "forward",
        functions: {},
      };

      this.locos.set(address, loco);
    }

    return loco;
  }

  abstract getLoco(
    address: number
  ): Promise<LocoState | null>;

  getLocos(): LocoState[] {
    return Array.from(this.locos.values());
  }

  abstract setTrackPower(
    on: boolean
  ): Promise<boolean>;

  abstract emergencyStop(): Promise<boolean>;

  abstract getSensor(
    address: number
  ): Promise<SensorInfo | null>;

  getPowerInfo(): PowerInfo {
    return this.powerInfo;
  }

  getLocoInfo(
    address: number
  ): LocoState | undefined {
    return this.locos.get(address);
  }

  getTurnoutInfo(
    address: number
  ): TurnoutInfo | undefined {
    return this.turnouts.get(address);
  }

  getName(): string {
    return this.name;
  }

  protected getOrCreateTurnout(
    address: number
  ): TurnoutInfo {
    let turnout =
      this.turnouts.get(address);

    if (!turnout) {
      turnout = {
        address,
        closed: false,
      };

      this.turnouts.set(address, turnout);
    }

    return turnout;
  }

  protected getOrCreateAccessory(
    address: number
  ): AccessoryInfo {
    let accessory =
      this.accessories.get(address);

    if (!accessory) {
      accessory = {
        address,
        active: false,
      };

      this.accessories.set(address, accessory);
    }

    return accessory;
  }

  abstract setBasicAccessory(
    address: number,
    active: boolean
  ): Promise<boolean>;

  getAccessories(): AccessoryInfo[] {
    return Array.from(this.accessories.values());
  }

  getTurnouts(): TurnoutInfo[] {
    return Array.from(this.turnouts.values());
  }

  /**
   * Command center indulásakor a felvett mozdonyok aktuális
   * állapotát is bekérjük az implementációtól.
   */
  async init(): Promise<void> {
    log("========================================");
    log("COMMANDCENTER INIT");
    log("========================================");

    const locos =
      await readLocos();

    for (const loco of locos) {
      log("getLoco:", loco.address);
      void this.getLoco(loco.address);
    }
  }

  private runtimeStateLoadedCallback?: RuntimeStateLoadedCallback;

  private readonly runtimeStateFile = path.resolve(
    dataDir,
    "command-center-runtime-state.json"
  );

  public onRuntimeStateLoaded(
    callback: RuntimeStateLoadedCallback
  ): void {
    this.runtimeStateLoadedCallback = callback;
  }

  public async saveRuntimeState(): Promise<void> {
    try {
      const state: PersistedCommandCenterState = {
        version: 1,
        savedAt: new Date().toISOString(),
        blocks: Array.from(this.blocks.entries()),
        turnouts: Array.from(this.turnouts.entries()),
      };

      await fs.mkdir(
        path.dirname(this.runtimeStateFile),
        {
          recursive: true,
        }
      );

      await fs.writeFile(
        this.runtimeStateFile,
        JSON.stringify(state, null, 2),
        "utf-8"
      );

      console.log(
        \`[CommandCenter] Runtime state saved: \${this.runtimeStateFile}\`
      );
    } catch (err) {
      console.error(
        "[CommandCenter] Failed to save runtime state:",
        err
      );
    }
  }

  public async loadRuntimeState(): Promise<void> {
    try {
      const raw =
        await fs.readFile(
          this.runtimeStateFile,
          "utf-8"
        );

      const state =
        JSON.parse(raw) as PersistedCommandCenterState;

      if (state.version !== 1) {
        console.warn(
          \`[CommandCenter] Unsupported runtime state version: \${state.version}\`
        );

        return;
      }

      this.blocks =
        new Map(state.blocks ?? []);

      this.turnouts =
        new Map(state.turnouts ?? []);

      console.log(
        \`[CommandCenter] Runtime state loaded: \${this.blocks.size} blocks, \${this.turnouts.size} turnouts\`
      );

      await this.runtimeStateLoadedCallback?.(
        this.blocks,
        this.turnouts
      );
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        console.log(
          "[CommandCenter] No previous runtime state file found."
        );

        return;
      }

      console.error(
        "[CommandCenter] Failed to load runtime state:",
        err
      );
    }
  }
}
`;

const SIMULATOR = `// server/src/commandCenter/simulator.ts

import {
  AccessoryChangedMessage,
  LocoState,
  SensorInfo,
  TurnoutChangedMessage,
  TurnoutInfo,
  WsMessage,
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

  private power = false;

  start(): Promise<boolean> {
    log("Starting command center simulator...");

    this.alive = true;
    this.power = true;

    if (this.aliveTask) {
      clearInterval(this.aliveTask);
      this.aliveTask = null;
    }

    this.aliveTask = setInterval(() => {
      const msg: WsMessage = {
        type: "commandCenterInfo",
        data: {
          alive: this.alive,
          power: this.power,
          type: "simulator",
        },
        uuid: this.lockOwnerUUID,
      };

      broadcastAll(msg);
    }, 1000);

    return Promise.resolve(true);
  }

  stop(): Promise<boolean> {
    log("Stopping command center simulator...");

    this.alive = false;
    this.power = false;

    if (this.aliveTask) {
      clearInterval(this.aliveTask);
      this.aliveTask = null;
    }

    const msg: WsMessage = {
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

    const msg: TurnoutChangedMessage = {
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

  setLoco(
    address: number,
    speed: number,
    direction: "forward" | "reverse"
  ): Promise<boolean> {
    const loco =
      this.getOrCreateLoco(address);

    loco.speed = speed;
    loco.direction = direction;

    broadcastAll({
      type: "locoState",
      data: {
        loco,
      },
    });

    return Promise.resolve(true);
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
    const accessory =
      this.getOrCreateAccessory(address);

    accessory.active = active;

    const msg: AccessoryChangedMessage = {
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

    const state = {
      alive: this.alive,
      power: this.power,
      type: "simulator",
      trackPower: on,
      powerInfo,
    };

    broadcastAll({
      type: "z21SystemState",
      data: state,
    });

    broadcastAll({
      type: "powerInfo",
      data: powerInfo,
    });

    broadcastAll({
      type: "commandCenterInfo",
      data: {
        alive: this.alive,
        power: this.power,
        type: "simulator",
      },
      uuid: this.lockOwnerUUID,
    } as WsMessage);

    return Promise.resolve(true);
  }

  emergencyStop(): Promise<boolean> {
    log("Sim: emergencyStop");

    this.powerInfo.emergencyStop = true;

    for (const loco of this.locos.values()) {
      if (loco.speed === 0) {
        continue;
      }

      loco.speed = 0;

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

    return Promise.resolve(true);
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
`;

try {
  console.log("DCCExpressNext – CommandCenter + Simulator cleanup Sprint 8 patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  ensureExisting(FILES.commandCenter);
  ensureExisting(FILES.simulator);

  write(FILES.commandCenter, COMMAND_CENTER);
  write(FILES.simulator, SIMULATOR);

  console.log("");
  console.log("Kész.");
  console.log("Nem készültek .bak fájlok.");
  console.log("");
  console.log("Javasolt ellenőrzés:");
  console.log("  npm run build");
} catch (error) {
  console.error("");
  console.error("PATCH HIBA:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
