// server/src/commandCenter/CommandCenter.ts

import path from "node:path";
import fs from "node:fs/promises";

import {
  AccessoryInfo,
  BlockState,
  Direction,
  Loco,
  LocoState,
  PowerInfo,
  SensorInfo,
  TurnoutInfo,
} from "../../../common/src/types.js";

import {
  readLocos,
  updateLocoLastRunAtByAddress,
} from "../services/locoStore.js";

import {
  log,
  logError,
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

  private readonly locoDirectionInvertByAddress =
    new Map<number, boolean>();

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

  private readonly proxiedLocoStates =
    new WeakSet<LocoState>();

  private readonly unsubscribeLocosChanged: () => void;

  constructor(name: string) {
    this.name = name;
    CommandCenter.activeInstance = this;

    this.unsubscribeLocosChanged = onLocosChanged(async () => {
      const locos = await readLocos();

      this.setLocos(locos);

      await this.loadRuntimeState()
        .then(() => {
          log(
            "Runtime state loaded successfully after loco change"
          );
        })
        .catch(err => {
          logError(
            "Failed to load runtime state after loco change:",
            err
          );
        });
    });
  }

  dispose(): void {
    this.unsubscribeLocosChanged();

    if (CommandCenter.activeInstance === this) {
      CommandCenter.activeInstance = null;
    }
  }

  static getActive(): CommandCenter | null {
    return CommandCenter.activeInstance;
  }

  isAlive(): boolean {
    return true;
  }

  setLocos(locos: Loco[]): void {
    this.locos.clear();
    this.locoDirectionInvertByAddress.clear();

    for (const loco of locos) {
      this.locoDirectionInvertByAddress.set(
        loco.address,
        Boolean(loco.invert)
      );

      const locoState: LocoState = {
        ...loco,
        speed: 0,
        direction: "forward",
        functions: {},
      };

      this.locos.set(
        loco.address,
        this.syncLocoReservation(
          this.createLocoRuntimeProxy(locoState)
        )
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

    void this.saveRuntimeState();
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

  setLoco(
    address: number,
    speed: number,
    direction: Direction
  ): Promise<boolean> {
    return this.setPhysicalLoco(
      address,
      speed,
      this.toPhysicalLocoDirection(address, direction),
      direction
    );
  }

  protected abstract setPhysicalLoco(
    address: number,
    speed: number,
    physicalDirection: Direction,
    logicalDirection: Direction
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

  private createLocoRuntimeProxy(
    loco: LocoState
  ): LocoState {
    if (this.proxiedLocoStates.has(loco)) {
      return loco;
    }

    const proxy = new Proxy(loco, {
      set: (target, property, value) => {
        if (property !== "speed") {
          return Reflect.set(target, property, value);
        }

        const previousSpeed =
          Number(target.speed ?? 0);

        const ok = Reflect.set(target, property, value);

        const nextSpeed =
          Number(value);

        if (
          ok &&
          Number.isFinite(previousSpeed) &&
          Number.isFinite(nextSpeed)
        ) {
          void this.persistLocoLastRunAtIfStopped(
            target,
            previousSpeed,
            nextSpeed
          ).catch(error => {
            logError(
              "Failed to persist loco last run time:",
              error
            );
          });
        }

        return ok;
      },
    });

    this.proxiedLocoStates.add(proxy);

    return proxy;
  }

  protected getOrCreateLoco(
    address: number
  ): LocoState {
    let loco =
      this.locos.get(address);

    if (!loco) {
      loco = this.createLocoRuntimeProxy({
        address,
        speed: 0,
        direction: "forward",
        functions: {},
      });

      this.locos.set(address, loco);
    }

    return this.syncLocoReservation(loco);
  }

  protected isLocoDirectionInverted(
    address: number
  ): boolean {
    return this.locoDirectionInvertByAddress.get(address) ?? false;
  }

  protected invertLocoDirection(
    direction: Direction
  ): Direction {
    return direction === "forward"
      ? "reverse"
      : "forward";
  }

  protected toPhysicalLocoDirection(
    address: number,
    logicalDirection: Direction
  ): Direction {
    return this.isLocoDirectionInverted(address)
      ? this.invertLocoDirection(logicalDirection)
      : logicalDirection;
  }

  protected toLogicalLocoDirection(
    address: number,
    physicalDirection: Direction
  ): Direction {
    return this.isLocoDirectionInverted(address)
      ? this.invertLocoDirection(physicalDirection)
      : physicalDirection;
  }

  protected setLocoRuntimeStateSync(
    address: number,
    speed: number,
    logicalDirection: Direction
  ): LocoState {
    const loco =
      this.getOrCreateLoco(address);

    loco.speed = speed;
    loco.direction = logicalDirection;

    return this.syncLocoReservation(loco);
  }

  protected async setLocoRuntimeState(
    address: number,
    speed: number,
    logicalDirection: Direction
  ): Promise<LocoState> {
    return this.setLocoRuntimeStateSync(
      address,
      speed,
      logicalDirection
    );
  }

  protected setLocoRuntimeStateFromPhysical(
    address: number,
    speed: number,
    physicalDirection: Direction
  ): LocoState {
    return this.setLocoRuntimeStateSync(
      address,
      speed,
      this.toLogicalLocoDirection(address, physicalDirection)
    );
  }

  protected async stopLocoRuntimeState(
    loco: LocoState
  ): Promise<void> {
    loco.speed = 0;
  }

  private async persistLocoLastRunAtIfStopped(
    loco: LocoState,
    previousSpeed: number,
    nextSpeed: number
  ): Promise<void> {
    if (
      nextSpeed !== 0 ||
      previousSpeed === 0
    ) {
      return;
    }

    const lastRunAt =
      new Date().toISOString();

    loco.lastRunAt = lastRunAt;

    const saved =
      await updateLocoLastRunAtByAddress(
        loco.address,
        lastRunAt
      );

    if (!saved) {
      log(
        "Loco stopped, but no matching persisted loco was found:",
        loco.address
      );
    }
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

  setSensor(
    _address: number,
    _on: boolean
  ): Promise<boolean> {
    return Promise.resolve(false);
  }

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

  protected isBasicAccessoryStateAlreadySet(
    address: number,
    active: boolean
  ): boolean {
    return this.accessories.get(address)?.active === active;
  }

  protected setBasicAccessoryRuntimeState(
    address: number,
    active: boolean
  ): AccessoryInfo {
    const accessory =
      this.getOrCreateAccessory(address);

    accessory.active = active;

    this.accessories.set(address, accessory);

    return accessory;
  }

  public setKnownBasicAccessoryState(
    address: number,
    active: boolean
  ): AccessoryInfo {
    return this.setBasicAccessoryRuntimeState(address, active);
  }

  abstract setBasicAccessory(
    address: number,
    active: boolean
  ): Promise<boolean>;

  getAccessories(): AccessoryInfo[] {
    return Array.from(this.accessories.values());
  }

  getSensors(): SensorInfo[] {
    return Array.from(this.sensors.values());
  }

  getTurnouts(): TurnoutInfo[] {
    return Array.from(this.turnouts.values());
  }

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
          logError(
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

      log("Command center runtime state saved:", this.runtimeStateFile);
    } catch (error) {
      logError(
        "Failed to save command center runtime state:",
        error
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
        JSON.parse(raw) as Partial<PersistedCommandCenterState>;

      if (state.version !== 1) {
        logError(
          "Unsupported command center runtime state version:",
          state.version
        );

        return;
      }

      this.blocks =
        new Map(Array.isArray(state.blocks) ? state.blocks : []);

      this.turnouts =
        new Map(Array.isArray(state.turnouts) ? state.turnouts : []);

      log("Command center runtime state loaded:", {
        blocks: this.blocks.size,
        turnouts: this.turnouts.size,
      });

      await this.runtimeStateLoadedCallback?.(
        this.blocks,
        this.turnouts
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }

      logError(
        "Failed to load command center runtime state:",
        error
      );
    }
  }
}
