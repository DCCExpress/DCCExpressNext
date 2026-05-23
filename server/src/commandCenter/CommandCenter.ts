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
    programmingModeActive: false,
  };

  protected locos = new Map<number, LocoState>();
  protected sensors = new Map<number, SensorInfo>();
  protected turnouts = new Map<number, TurnoutInfo>();
  protected accessories = new Map<number, AccessoryInfo>();
  protected blocks = new Map<string, BlockState>();

  private lockedValue = false;
  public lockOwnerUUID: string | null = null;

  protected constructor(name: string) {
    this.name = name;
    CommandCenter.activeInstance = this;

    onLocosChanged(async () => {
      const locos = await readLocos();
      this.setLocos(locos);
    });
  }

  get locked(): boolean {
    return this.lockedValue;
  }

  set locked(value: boolean) {
    if (this.lockedValue === value) {
      return;
    }

    this.lockedValue = value;

    broadcastAll({
      type: "commandCenterLockChanged",
      data: {
        locked: value,
        lockOwner: value
          ? this.lockOwnerUUID
          : null,
      },
    });
  }

  getName(): string {
    return this.name;
  }

  getPowerInfo(): PowerInfo {
    return this.powerInfo;
  }

  setPowerInfo(next: Partial<PowerInfo>): void {
    this.powerInfo = {
      ...this.powerInfo,
      ...next,
    };
  }

  setLocos(locos: Loco[]): void {
    const existingByAddress = new Map(this.locos);

    this.locos.clear();

    for (const loco of locos) {
      const previous =
        existingByAddress.get(loco.address);

      this.locos.set(loco.address, {
        address: loco.address,
        speed: previous?.speed ?? 0,
        direction: previous?.direction ?? "forward",
        functions: previous?.functions ?? {},
        reservation: previous?.reservation,
      });
    }
  }

  getLocoState(address: number): LocoState | null {
    return this.locos.get(address) ?? null;
  }

  getLocos(): LocoState[] {
    return Array.from(this.locos.values());
  }

  getSensors(): SensorInfo[] {
    return Array.from(this.sensors.values());
  }

  getBlocks(): BlockState[] {
    return Array.from(this.blocks.values());
  }

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

  onRuntimeStateLoaded(
    callback: RuntimeStateLoadedCallback
  ): void {
    this.runtimeStateLoadedCallback = callback;
  }

  async loadRuntimeState(): Promise<void> {
    try {
      const content = await fs.readFile(
        this.runtimeStateFile,
        "utf8"
      );

      const state =
        JSON.parse(content) as PersistedCommandCenterState;

      this.blocks =
        new Map(state.blocks);

      this.turnouts =
        new Map(state.turnouts);

      await this.runtimeStateLoadedCallback?.(
        this.blocks,
        this.turnouts
      );
    } catch {
      // No persisted runtime state yet.
    }
  }

  async saveRuntimeState(): Promise<void> {
    const state: PersistedCommandCenterState = {
      version: 1,
      savedAt: new Date().toISOString(),
      blocks: Array.from(this.blocks.entries()),
      turnouts: Array.from(this.turnouts.entries()),
    };

    await fs.mkdir(
      path.dirname(this.runtimeStateFile),
      { recursive: true }
    );

    await fs.writeFile(
      this.runtimeStateFile,
      JSON.stringify(state, null, 2),
      "utf8"
    );
  }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract setTrackPower(on: boolean): Promise<void>;
  abstract setProgrammingPower(on: boolean): Promise<void>;
  abstract emergencyStop(): Promise<void>;
  abstract setLoco(
    address: number,
    speed: number,
    direction: LocoState["direction"]
  ): Promise<void>;
  abstract getLoco(address: number): Promise<LocoState | null>;
  abstract setLocoFunction(
    address: number,
    functionNumber: number,
    active: boolean
  ): Promise<void>;
  abstract setTurnout(
    address: number,
    closed: boolean
  ): Promise<void>;
  abstract getTurnout(address: number): Promise<TurnoutInfo | null>;
  abstract setAccessory(
    address: number,
    active: boolean
  ): Promise<void>;
}
