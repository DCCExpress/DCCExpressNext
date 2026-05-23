// server/src/commandCenter/CommandCenter.ts

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
} from "../services/locoStore.js";

import {
  log,
} from "../utility.js";

import {
  onLocosChanged,
} from "../services/locoChangeNotifier.js";

import {
  locoReservationStore,
} from "../services/locoReservationStore.js";

import {
  broadcastAll,
} from "../ws/wsServer.js";

import {
  dataDir,
} from "../paths.js";

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
      const locos = await readLocos();

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
      const locoState: LocoState = {
        ...loco,
        speed: 0,
        direction: "forward",
        functions: {},
      };

      this.locos.set(
        loco.address,
        this.syncLocoReservation(locoState)
      );
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

  public broadcastBlocks(): void {
    broadcastAll({
      type: "blockStateChanged",
      data: Object.fromEntries(this.blocks),
      uuid: null,
    });
  }

  public getBlocks(): void {
    this.broadcastBlocks();
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

  protected syncLocoReservation(
    loco: LocoState
  ): LocoState {
    const reservation =
      locoReservationStore.getReservation(
        loco.address
      );

    if (reservation) {
      loco.reservation = reservation;
    } else {
      delete loco.reservation;
    }

    return loco;
  }

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

    return this.syncLocoReservation(loco);
  }

  abstract getLoco(
    address: number
  ): Promise<LocoState | null>;

  getLocos(): LocoState[] {
    return Array.from(this.locos.values()).map(
      loco => this.syncLocoReservation(loco)
    );
  }

  abstract setTrackPower(
    on: boolean
  ): Promise<boolean>;

  setProgrammingPower(
    _on: boolean
  ): Promise<boolean> {
    return Promise.resolve(false);
  }

  writeDirectCommand(
    _command: string
  ): Promise<boolean> {
    return Promise.resolve(false);
  }

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
    const loco =
      this.locos.get(address);

    return loco
      ? this.syncLocoReservation(loco)
      : undefined;
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

    const locos = await readLocos();

    this.setLocos(locos);

    await Promise.all(
      locos.map(async loco => {
        log("getLoco:", loco.address);

        try {
          await this.getLoco(loco.address);
        } catch (error) {
          log(
            "Failed to query loco during init:",
            loco.address,
            error
          );
        }
      })
    );
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
        `[CommandCenter] Runtime state saved: ${this.runtimeStateFile}`
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
          `[CommandCenter] Unsupported runtime state version: ${state.version}`
        );

        return;
      }

      this.blocks =
        new Map(state.blocks ?? []);

      this.turnouts =
        new Map(state.turnouts ?? []);

      console.log(
        `[CommandCenter] Runtime state loaded: ${this.blocks.size} blocks, ${this.turnouts.size} turnouts`
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
