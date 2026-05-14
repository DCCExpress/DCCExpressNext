import { Dir } from "node:fs";
import { AccessoryInfo, BlockState, Direction, Loco, LocoState, PowerInfo, SensorInfo, TurnoutInfo, } from "../../../common/src/types.js";
import { readLocos } from "../routes/locoRoutes.js";
import { log } from "../utility.js";
import { onLocosChanged } from "../services/locoChangeNotifier.js";
import { broadcastAll } from "../ws/wsServer.js";
import { dataDir } from "../paths.js";
import path from "path/win32";
import fs from "node:fs/promises";

// export interface PowerInfo {
//   trackVoltageOn: boolean;
//   emergencyStop: boolean;
//   shortCircuit: boolean;
//   current: number;
// }

// export interface LocoState {
//   address: number;
//   speed: number;
//   direction: Direction;
//   functions: { [fn: number]: boolean };
// }

// export interface TurnoutInfo {
//   address: number;
//   closed: boolean;
// }

// export interface SensorInfo {
//   address: number;
//   active: boolean;
// }

// export interface AccessoryInfo {
//   address: number;
//   active: boolean;
// }

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
  protected name: string;
  protected powerInfo: PowerInfo = {
    trackVoltageOn: false,
    emergencyStop: false,
    shortCircuit: false,
    current: 0,
  };


  protected locos: Map<number, LocoState> = new Map();
  private blocks: Map<string, BlockState> = new Map();
  protected turnouts: Map<number, TurnoutInfo> = new Map();
  protected sensors: Map<number, SensorInfo> = new Map();
  protected accessories: Map<number, AccessoryInfo> = new Map();
  protected readonly rbusGroups = new Map<number, number[]>();
  public locked: boolean = false;
  public lockOwnerUUID: string | null = "";

  constructor(name: string) {
    this.name = name;

    onLocosChanged(async () => {
      const llocos = await readLocos();

      this.setLocos(llocos);

      await this.loadRuntimeState().then(() => {
        log("Runtime state loaded successfully after loco change");
      }).catch(err => {
        log("Failed to load runtime state after loco change:", err);
      });
    });
  }
  setLocos(llocos: Loco[]): void {
    this.locos.clear();

    for (const loco of llocos) {
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
      this.blocks.set(block.blockId.toString(), block);
    }
    this.saveRuntimeState();
  }

  setBlock(block: BlockState): void {
    for (const [b, v] of this.blocks) {
      if (v.locoId === block.locoId) {
        v.locoId = null;
        this.blocks.set(b, v);
      }
    }
    this.blocks.set(block.blockId, block);
    const data = { type: "blockStateChanged", data: Object.fromEntries(this.blocks), uuid: null };
    broadcastAll(data);
    this.saveRuntimeState();
  }

  setBlockRemove(b: BlockState): void {
    log("setBlockRemove", b);
    const block = this.blocks.get(b.blockId);
    if (block && block.locoId === block.locoId) {
      block.locoId = null;
      this.blocks.set(block.blockId, block);
    }
    const data = { type: "blockStateChanged", data: Object.fromEntries(this.blocks), uuid: null };
    broadcastAll(data);
    this.saveRuntimeState();
  }

  setBlocksReset(): void {
    for (const [b, v] of this.blocks) {
      v.locoId = null;
      this.blocks.set(b, v);
    }
    const data = { type: "blockStateChanged", data: Object.fromEntries(this.blocks), uuid: null };
    broadcastAll(data);
  }

  public getBlocks(): void {
    this.loadRuntimeState().then(() => {
      log("GET BLOCKS:", this.blocks);
      const data = { type: "blockStateChanged", data: Object.fromEntries(this.blocks), uuid: null };
      broadcastAll(data);
    }).catch(err => {
      log("Failed to load runtime state in getBlocks:", err);
    });
  }

  abstract getConnectionString(): string;
  abstract start(): Promise<boolean>;
  abstract stop(): Promise<boolean>;
  abstract clientConnected(): void;

  abstract setTurnout(address: number, closed: boolean): Promise<boolean>;
  abstract getTurnout(address: number): Promise<TurnoutInfo | null>;

  abstract setLoco(address: number, speed: number, direction: "forward" | "reverse"): Promise<boolean>;
  abstract setLocoFunction(address: number, fn: number, active: boolean): Promise<boolean>;

  protected getOrCreateLoco(address: number): LocoState {
    let loco = this.locos.get(address);

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

  abstract getLoco(address: number): Promise<LocoState | null>;

  getLocos(): LocoState[] {
    return Array.from(this.locos.values());
  }
  abstract setTrackPower(on: boolean): Promise<boolean>;
  abstract emergencyStop(): Promise<boolean>;

  abstract getSensor(address: number): Promise<SensorInfo | null>;

  getPowerInfo(): PowerInfo {
    return this.powerInfo;
  }

  getLocoInfo(address: number): LocoState | undefined {
    return this.locos.get(address);
  }

  getTurnoutInfo(address: number): TurnoutInfo | undefined {
    return this.turnouts.get(address);
  }

  getName(): string {
    return this.name;
  }

  protected getOrCreateTurnout(address: number): TurnoutInfo {
    let turnout = this.turnouts.get(address);
    if (!turnout) {
      turnout = {
        address,
        closed: false,
      };
      this.turnouts.set(address, turnout);
    }
    return turnout;
  }

  protected getOrCreateAccessory(address: number): AccessoryInfo {
    let accessory = this.accessories.get(address);
    if (!accessory) {
      accessory = {
        address: address,
        active: false,
      };
      this.accessories.set(address, accessory);
    }
    return accessory;
  }

  // 
  abstract setBasicAccessory(address: number, active: boolean): Promise<boolean>;

  getAccessories(): AccessoryInfo[] {
    return Array.from(this.accessories.values());
  }

  getTurnouts(): TurnoutInfo[] {
    return Array.from(this.turnouts.values());
  }

  // Ha csatlakozott a commandcenter a 
  // locos layout belvasása és lekérni az állapotokat
  async init() {
    log("========================================");
    log("COMMANDCENTER INIT");
    log("========================================");

    const locos = await readLocos();
    if (locos) {
      for (const loco of locos) {
        log("getLoco:", loco.address);
        this.getLoco(loco.address);
      }
    }

  }

  private runtimeStateLoadedCallback?: RuntimeStateLoadedCallback;
  private readonly runtimeStateFile = path.resolve(
    dataDir,
    "command-center-runtime-state.json"
  );

  public onRuntimeStateLoaded(callback: RuntimeStateLoadedCallback): void {
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

      await fs.mkdir(path.dirname(this.runtimeStateFile), {
        recursive: true,
      });

      await fs.writeFile(
        this.runtimeStateFile,
        JSON.stringify(state, null, 2),
        "utf-8"
      );

      console.log(
        `[CommandCenter] Runtime state saved: ${this.runtimeStateFile}`
      );
    } catch (err) {
      console.error("[CommandCenter] Failed to save runtime state:", err);
    }
  }

  public async loadRuntimeState(): Promise<void> {
    try {
      const raw = await fs.readFile(this.runtimeStateFile, "utf-8");
      const state = JSON.parse(raw) as PersistedCommandCenterState;

      if (state.version !== 1) {
        console.warn(
          `[CommandCenter] Unsupported runtime state version: ${state.version}`
        );
        return;
      }

      this.blocks = new Map(state.blocks ?? []);
      this.turnouts = new Map(state.turnouts ?? []);

      console.log(
        `[CommandCenter] Runtime state loaded: ${this.blocks.size} blocks, ${this.turnouts.size} turnouts`
      );

      await this.runtimeStateLoadedCallback?.(this.blocks, this.turnouts);
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        console.log("[CommandCenter] No previous runtime state file found.");
        return;
      }

      console.error("[CommandCenter] Failed to load runtime state:", err);
    }
  }

}
