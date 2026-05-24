import type {
  BlockState,
  Direction,
} from "../../../common/src/types.js";

import type {
  TaskManagerActionResult,
  TrainTask,
  TrainTaskSimulationProgress,
} from "../../../common/src/task.js";

import { log, logError } from "../utility.js";
import { railwayTopologyStore } from "./railwayTopologyStore.js";

type SimulatorCommandCenterPort = {
  setLoco: (
    address: number,
    speed: number,
    direction: Direction
  ) => Promise<boolean>;

  setBlock: (
    block: BlockState
  ) => void;

  setBlockRemove: (
    block: BlockState
  ) => void;

  setSensor?: (
    address: number,
    on: boolean
  ) => Promise<boolean>;
};

type TrainSimulatorConfigureParams = {
  getTasks: () => TrainTask[];

  getBlockState: (
    blockId: string
  ) => BlockState | null;

  tryResolveTaskLoco: (
    taskId: string
  ) => Promise<TaskManagerActionResult>;

  tryPrepareTaskRoute: (
    taskId: string
  ) => Promise<boolean>;

  markTaskLeftFromBlock: (
    taskId: string
  ) => Promise<TaskManagerActionResult>;

  markTaskReachedToBlock: (
    taskId: string
  ) => Promise<TaskManagerActionResult>;

  updateTaskSimulationProgress: (
    taskId: string,
    progress: TrainTaskSimulationProgress
  ) => Promise<TaskManagerActionResult>;

  getSimulatorCommandCenter: () => SimulatorCommandCenterPort | null;
};

type SimulationPhase =
  | "departing"
  | "waitingForBlockSensor"
  | "transit";

type SimulationLeg = {
  fromBlockId: string;
  fromBlockName: string;
  toBlockId: string;
  toBlockName: string;
  segmentCount: number;
};

type SimulationSession = {
  taskId: string;
  legs: SimulationLeg[];
  legIndex: number;
  phase: SimulationPhase;
  phaseStartedAt: number;
  pausedAt: number | null;
};

const TICK_MS = 250;

/**
 * Mennyi ideig álljon a köztes blokkban,
 * mielőtt "elhagyja" azt.
 */
const DEPARTURE_DELAY_MS = 3000;

/**
 * Egy útvonalszegmenshez tartozó szimulált haladási idő.
 * Ha két blokk között több szakasz van, arányosan nő az idő.
 */
const BASE_TRANSIT_PER_SEGMENT_MS = 5000;

/**
 * Legyen minimális menetidő két blokk között,
 * hogy ne villanjon át túl gyorsan.
 */
const MIN_TRANSIT_PER_LEG_MS = 5000;

class TrainSimulatorRuntimeStore {
  private params: TrainSimulatorConfigureParams | null = null;
  private timer: NodeJS.Timeout | null = null;
  private tickRunning = false;
  private readonly sessions = new Map<string, SimulationSession>();

  configure(params: TrainSimulatorConfigureParams): void {
    this.params = params;
  }

  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.tick();
    }, TICK_MS);

    this.timer.unref?.();

    log("[TrainSimulator] Runtime loop started.");
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.sessions.clear();
    log("[TrainSimulator] Runtime loop stopped.");
  }

  private async tick(): Promise<void> {
    if (
      this.tickRunning ||
      !this.params
    ) {
      return;
    }

    this.tickRunning = true;

    try {
      const simulator =
        this.params.getSimulatorCommandCenter();

      if (!simulator) {
        this.sessions.clear();
        return;
      }

      const tasks = this.params.getTasks();

      /**
       * Már nem aktív sessionök kipucolása.
       */
      for (const [taskId, session] of this.sessions.entries()) {
        const task = tasks.find(item => item.id === taskId);

        if (
          !task ||
          task.status === "aborted" ||
          task.status === "completed" ||
          task.status === "error" ||
          task.status === "queued"
        ) {
          await this.stopLocoIfKnown(simulator, task);
          this.sessions.delete(session.taskId);
        }
      }

      /**
       * Aktív taskok futtatása.
       */
      for (const task of tasks) {
        if (
          task.status !== "running" &&
          task.status !== "paused" &&
          task.status !== "finishing"
        ) {
          continue;
        }

        /**
         * Running task, de még nincs hozzárendelt mozdony.
         * Nézzük meg újra, bekerült-e már az induló blokkba.
         */
        if (!task.runtime.loco) {
          if (task.status === "running") {
            await this.params.tryResolveTaskLoco(task.id);

            await this.params.updateTaskSimulationProgress(
              task.id,
              {
                phase: "waitingForLoco",
                legIndex: 0,
                legCount: 0,
                fromBlockId: task.fromBlockId,
                fromBlockName: task.transition.fromBlock.name,
                toBlockId: null,
                toBlockName: null,
              }
            );
          }

          continue;
        }

        let session =
          this.sessions.get(task.id);

        /**
         * Új ciklus indul.
         */
        if (!session) {
          const legs =
            this.createSimulationLegs(task);

          if (legs.length === 0) {
            logError(
              `[TrainSimulator] No block legs found for task: ${task.name} (${task.id})`
            );
            continue;
          }

          /**
           * A mozdony már megvan, de csak akkor indulhatunk,
           * ha a teljes útvonal lefoglalható és a váltók beálltak.
           * Ha nem sikerül, a task futva marad és később újrapróbálkozik.
           */
          const routePrepared =
            await this.params.tryPrepareTaskRoute(task.id);

          if (!routePrepared) {
            continue;
          }

          session = {
            taskId: task.id,
            legs,
            legIndex: 0,
            phase: "departing",
            phaseStartedAt: Date.now(),
            pausedAt:
              task.status === "paused"
                ? Date.now()
                : null,
          };

          const firstLeg =
            legs[0]!;

          await this.setBlockSensor(
            simulator,
            firstLeg.fromBlockId,
            true
          );

          await this.params.updateTaskSimulationProgress(
            task.id,
            {
              phase: "departing",
              legIndex: 0,
              legCount: legs.length,
              fromBlockId: firstLeg.fromBlockId,
              fromBlockName: firstLeg.fromBlockName,
              toBlockId: firstLeg.toBlockId,
              toBlockName: firstLeg.toBlockName,
            }
          );

          this.sessions.set(task.id, session);

          await this.setLocoSafely(
            simulator,
            task,
            task.status === "paused"
              ? 0
              : task.targetSpeed,
            "session start"
          );

          log(
            `[TrainSimulator] Session created: ${task.name} (${task.id}), legs: ${legs
              .map(leg => `${leg.fromBlockName}→${leg.toBlockName}`)
              .join(", ")}`
          );
        }

        if (task.status === "paused") {
          await this.pauseSession(
            simulator,
            task,
            session
          );

          continue;
        }

        await this.resumeSessionIfNeeded(
          simulator,
          task,
          session
        );

        await this.advanceRunningSession(
          simulator,
          task,
          session
        );
      }
    } catch (error) {
      logError("[TrainSimulator] Tick failed:", error);
    } finally {
      this.tickRunning = false;
    }
  }

  private async pauseSession(
    simulator: SimulatorCommandCenterPort,
    task: TrainTask,
    session: SimulationSession
  ): Promise<void> {
    if (session.pausedAt !== null) {
      return;
    }

    session.pausedAt = Date.now();

    await this.setLocoSafely(
      simulator,
      task,
      0,
      "pause"
    );

    log(
      `[TrainSimulator] Session paused: ${task.name} (${task.id})`
    );
  }

  private async resumeSessionIfNeeded(
    simulator: SimulatorCommandCenterPort,
    task: TrainTask,
    session: SimulationSession
  ): Promise<void> {
    if (session.pausedAt === null) {
      return;
    }

    const pausedDuration =
      Date.now() - session.pausedAt;

    session.phaseStartedAt += pausedDuration;
    session.pausedAt = null;

    await this.setLocoSafely(
      simulator,
      task,
      task.targetSpeed,
      "resume"
    );

    log(
      `[TrainSimulator] Session resumed: ${task.name} (${task.id})`
    );
  }

  private async advanceRunningSession(
    simulator: SimulatorCommandCenterPort,
    task: TrainTask,
    session: SimulationSession
  ): Promise<void> {
    const params = this.params;

    if (!params) {
      return;
    }

    const elapsed =
      Date.now() - session.phaseStartedAt;

    const currentLeg =
      session.legs[session.legIndex];

    if (!currentLeg) {
      logError(
        `[TrainSimulator] Missing current leg for task: ${task.name} (${task.id})`
      );
      this.sessions.delete(task.id);
      return;
    }

    /**
     * Ütközésvédelem:
     * mielőtt a mozdony elhagyná az aktuális blokkot,
     * megnézzük, hogy a következő blokk foglalt-e másik mozdonnyal.
     * Ha igen, megállítjuk a mozdonyt és várunk.
     */
    if (
      session.phase === "departing" &&
      this.isBlockOccupiedByOtherLoco(
        currentLeg.toBlockId,
        task
      )
    ) {
      const waitingSensorAddress =
        this.getBlockSensorAddress(currentLeg.toBlockId);

      await this.setLocoSafely(
        simulator,
        task,
        0,
        "collision guard"
      );

      session.phase = "waitingForBlockSensor";
      session.phaseStartedAt = Date.now();

      await params.updateTaskSimulationProgress(
        task.id,
        {
          phase: "waitingForBlockSensor",
          legIndex: session.legIndex,
          legCount: session.legs.length,
          fromBlockId: currentLeg.fromBlockId,
          fromBlockName: currentLeg.fromBlockName,
          toBlockId: currentLeg.toBlockId,
          toBlockName: currentLeg.toBlockName,
          waitingSensorAddress:
            waitingSensorAddress > 0
              ? waitingSensorAddress
              : null,
        }
      );

      log(
        `[TrainSimulator] Waiting for sensor #${waitingSensorAddress > 0 ? waitingSensorAddress : "?"} before entering ${currentLeg.toBlockName}: ${task.name} (${task.id})`
      );

      return;
    }

    /**
     * Ha korábban ütközésvédelem miatt álltunk meg,
     * addig maradunk itt, amíg a célblokk fel nem szabadul.
     */
    if (session.phase === "waitingForBlockSensor") {
      if (
        this.isBlockOccupiedByOtherLoco(
          currentLeg.toBlockId,
          task
        )
      ) {
        return;
      }

      await this.setLocoSafely(
        simulator,
        task,
        task.targetSpeed,
        "collision guard release"
      );

      session.phase = "departing";
      session.phaseStartedAt = Date.now();

      await params.updateTaskSimulationProgress(
        task.id,
        {
          phase: "departing",
          legIndex: session.legIndex,
          legCount: session.legs.length,
          fromBlockId: currentLeg.fromBlockId,
          fromBlockName: currentLeg.fromBlockName,
          toBlockId: currentLeg.toBlockId,
          toBlockName: currentLeg.toBlockName,
          waitingSensorAddress: null,
        }
      );

      log(
        `[TrainSimulator] Collision guard released, departure allowed: ${currentLeg.fromBlockName}→${currentLeg.toBlockName}: ${task.name} (${task.id})`
      );

      return;
    }
    /**
     * 1. fázis:
     * a jelenlegi blokk elhagyása.
     *
     * Első legnél A1 ürül.
     * Köztes legnél például B1 ürül.
     */
    if (
      session.phase === "departing" &&
      elapsed >= DEPARTURE_DELAY_MS
    ) {

      await this.setBlockSensor(
        simulator,
        currentLeg.fromBlockId,
        false
      );
      simulator.setBlockRemove({
        blockId: currentLeg.fromBlockId,
        locoId: task.runtime.loco!.id,
      });

      /**
       * Csak az első induló blokk elhagyásakor
       * jelezzük a task runtime felé.
       */
      if (session.legIndex === 0) {
        await params.markTaskLeftFromBlock(task.id);
      }

      session.phase = "transit";
      session.phaseStartedAt = Date.now();

      await params.updateTaskSimulationProgress(
        task.id,
        {
          phase: "transit",
          legIndex: session.legIndex,
          legCount: session.legs.length,
          fromBlockId: currentLeg.fromBlockId,
          fromBlockName: currentLeg.fromBlockName,
          toBlockId: currentLeg.toBlockId,
          toBlockName: currentLeg.toBlockName,
        }
      );

      log(
        `[TrainSimulator] Loco left block ${currentLeg.fromBlockName}: ${task.name} (${task.id})`
      );

      return;
    }

    /**
     * 2. fázis:
     * megérkezés a következő blokkba.
     */
    if (
      session.phase === "transit" &&
      elapsed >= this.getLegTransitDurationMs(currentLeg)
    ) {

      await this.setBlockSensor(
        simulator,
        currentLeg.toBlockId,
        true
      );
      simulator.setBlock({
        blockId: currentLeg.toBlockId,
        locoId: task.runtime.loco!.id,
      });

      log(
        `[TrainSimulator] Loco reached block ${currentLeg.toBlockName}: ${task.name} (${task.id})`
      );

      const isLastLeg =
        session.legIndex >= session.legs.length - 1;

      /**
       * Ha ez volt az utolsó blokk:
       * megállítjuk a mozdonyt,
       * a task runtime lezárja az aktuális ciklust,
       * majd újra várakozás következik.
       */
      if (isLastLeg) {
        await this.setLocoSafely(
          simulator,
          task,
          0,
          "route cycle finish"
        );

        await params.markTaskReachedToBlock(task.id);

        this.sessions.delete(task.id);

        log(
          `[TrainSimulator] Route cycle finished: ${task.name} (${task.id})`
        );

        return;
      }

      /**
       * Van még következő blokk:
       * továbblépünk a következő legre.
       *
       * Példa:
       * A1→B1 után jön B1→C1.
       */
      session.legIndex += 1;
      session.phase = "departing";
      session.phaseStartedAt = Date.now();

      const nextLeg =
        session.legs[session.legIndex];

      if (!nextLeg) {
        logError(
          `[TrainSimulator] Missing next leg for task: ${task.name} (${task.id})`
        );
        this.sessions.delete(task.id);
        return;
      }

      await params.updateTaskSimulationProgress(
        task.id,
        {
          phase: "departing",
          legIndex: session.legIndex,
          legCount: session.legs.length,
          fromBlockId: nextLeg.fromBlockId,
          fromBlockName: nextLeg.fromBlockName,
          toBlockId: nextLeg.toBlockId,
          toBlockName: nextLeg.toBlockName,
        }
      );

      return;
    }
  }

  private async stopLocoIfKnown(
    simulator: SimulatorCommandCenterPort,
    task: TrainTask | undefined
  ): Promise<void> {
    if (!task?.runtime.loco) {
      return;
    }

    await this.setLocoSafely(
      simulator,
      task,
      0,
      "session cleanup"
    );
  }

  private async setLocoSafely(
    simulator: SimulatorCommandCenterPort,
    task: TrainTask,
    speed: number,
    reason: string
  ): Promise<boolean> {
    const loco = task.runtime.loco;

    if (!loco) {
      return false;
    }

    try {
      const success = await simulator.setLoco(
        loco.address,
        speed,
        this.resolveDirection(task)
      );

      if (!success) {
        logError("[TrainSimulator] Failed to set loco:", {
          taskId: task.id,
          taskName: task.name,
          locoAddress: loco.address,
          speed,
          reason,
        });
      }

      return success;
    } catch (error) {
      logError("[TrainSimulator] setLoco threw:", {
        taskId: task.id,
        taskName: task.name,
        locoAddress: loco.address,
        speed,
        reason,
        error,
      });

      return false;
    }
  }

  private async setBlockSensor(
    simulator: SimulatorCommandCenterPort,
    blockId: string,
    on: boolean
  ): Promise<void> {
    if (!simulator.setSensor) {
      return;
    }

    const sensorAddress =
      this.getBlockSensorAddress(blockId);

    if (sensorAddress <= 0) {
      return;
    }

    try {
      const success =
        await simulator.setSensor(sensorAddress, on);

      if (!success) {
        logError(
          `[TrainSimulator] Failed to set sensor #${sensorAddress} to ${on ? "ON" : "OFF"}.`
        );
      }
    } catch (error) {
      logError("[TrainSimulator] setSensor threw:", {
        sensorAddress,
        blockId,
        on,
        error,
      });
    }
  }

  private isBlockOccupiedByOtherLoco(
    blockId: string,
    task: TrainTask
  ): boolean {
    const blockState =
      this.params?.getBlockState(blockId) ?? null;

    const occupantLocoId =
      blockState?.locoId ?? null;

    const currentLocoId =
      task.runtime.loco?.id ?? null;

    return (
      occupantLocoId !== null &&
      occupantLocoId !== currentLocoId
    );
  }
  private getBlockSensorAddress(
    blockId: string
  ): number {
    const topology =
      railwayTopologyStore.getTopology();

    if (!topology) {
      return 0;
    }

    const block =
      topology
        .getBlocks()
        .find(item => item.id === blockId);

    if (!block) {
      return 0;
    }

    return Number.isFinite(block.sensorAddress)
      ? block.sensorAddress
      : 0;
  }
  /**
   * A teljes route path-ból dinamikusan blokk-lépéseket gyártunk.
   *
   * Például:
   * path:
   *   A1, S1, B1, S2, C1
   *
   * legs:
   *   A1 -> B1
   *   B1 -> C1
   */
  private createSimulationLegs(
    task: TrainTask
  ): SimulationLeg[] {
    const legs: SimulationLeg[] = [];

    let previousBlock:
      | {
        id: string;
        name: string;
      }
      | null = null;

    let segmentCountSincePreviousBlock = 0;

    for (const item of task.transition.solution.path) {
      if (item.type === "segment") {
        segmentCountSincePreviousBlock += 1;
        continue;
      }

      if (item.type !== "block") {
        continue;
      }

      const currentBlock = {
        id: item.block.id,
        name: item.block.name,
      };

      if (!previousBlock) {
        previousBlock = currentBlock;
        segmentCountSincePreviousBlock = 0;
        continue;
      }

      if (previousBlock.id === currentBlock.id) {
        continue;
      }

      legs.push({
        fromBlockId: previousBlock.id,
        fromBlockName: previousBlock.name,
        toBlockId: currentBlock.id,
        toBlockName: currentBlock.name,
        segmentCount:
          Math.max(
            1,
            segmentCountSincePreviousBlock
          ),
      });

      previousBlock = currentBlock;
      segmentCountSincePreviousBlock = 0;
    }

    return legs;
  }

  private getLegTransitDurationMs(
    leg: SimulationLeg
  ): number {
    return Math.max(
      MIN_TRANSIT_PER_LEG_MS,
      leg.segmentCount * BASE_TRANSIT_PER_SEGMENT_MS
    );
  }

  private resolveDirection(task: TrainTask): Direction {
    const direction =
      task.transition.solution.locoDirection;

    return direction === "reverse"
      ? "reverse"
      : "forward";
  }
}

export const trainSimulatorRuntimeStore =
  new TrainSimulatorRuntimeStore();
