import type {
  BlockState,
  Direction,
} from "../../../common/src/types.js";

import type {
  TaskManagerActionResult,
  TrainTask,
} from "../../../common/src/task.js";


import { log, logError } from "../utility.js";

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
};

type TrainSimulatorConfigureParams = {
  getTasks: () => TrainTask[];

  markTaskLeftFromBlock: (
    taskId: string
  ) => Promise<TaskManagerActionResult>;

  markTaskReachedToBlock: (
    taskId: string
  ) => Promise<TaskManagerActionResult>;

  getSimulatorCommandCenter: () => SimulatorCommandCenterPort | null;
};

type SimulationPhase =
  | "departing"
  | "transit";

type SimulationSession = {
  taskId: string;
  phase: SimulationPhase;
  phaseStartedAt: number;
  pausedAt: number | null;
};

const TICK_MS = 250;
const DEPARTURE_DELAY_MS = 1200;
const BASE_TRANSIT_PER_NODE_MS = 1400;
const MIN_TRANSIT_MS = 2800;

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

      for (const [taskId, session] of this.sessions.entries()) {
        const task = tasks.find(item => item.id === taskId);

        if (
          !task ||
          task.status === "stopped" ||
          task.status === "completed" ||
          task.status === "error" ||
          task.status === "queued"
        ) {
          await this.stopLocoIfKnown(simulator, task);
          this.sessions.delete(session.taskId);
        }
      }

      for (const task of tasks) {
        if (
          task.status !== "running" &&
          task.status !== "paused"
        ) {
          continue;
        }

        if (!task.runtime.loco) {
          continue;
        }

        let session = this.sessions.get(task.id);

        if (!session) {
          session = {
            taskId: task.id,
            phase: "departing",
            phaseStartedAt: Date.now(),
            pausedAt: task.status === "paused"
              ? Date.now()
              : null,
          };

          this.sessions.set(task.id, session);

          await simulator.setLoco(
            task.runtime.loco.address,
            task.status === "paused"
              ? 0
              : task.targetSpeed,
            this.resolveDirection(task)
          );

          log(
            `[TrainSimulator] Session created: ${task.name} (${task.id})`
          );
        }

        if (task.status === "paused") {
          await this.pauseSession(simulator, task, session);
          continue;
        }

        await this.resumeSessionIfNeeded(simulator, task, session);
        await this.advanceRunningSession(simulator, task, session);
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

    await simulator.setLoco(
      task.runtime.loco!.address,
      0,
      this.resolveDirection(task)
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

    await simulator.setLoco(
      task.runtime.loco!.address,
      task.targetSpeed,
      this.resolveDirection(task)
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
    const elapsed =
      Date.now() - session.phaseStartedAt;

    if (
      session.phase === "departing" &&
      elapsed >= DEPARTURE_DELAY_MS
    ) {
      simulator.setBlockRemove({
        blockId: task.fromBlockId,
        locoId: task.runtime.loco!.id,
      });

      await this.params!.markTaskLeftFromBlock(task.id);

      session.phase = "transit";
      session.phaseStartedAt = Date.now();

      log(
        `[TrainSimulator] Loco left block ${task.fromBlockId}: ${task.name} (${task.id})`
      );

      return;
    }

    if (
      session.phase === "transit" &&
      elapsed >= this.getTransitDurationMs(task)
    ) {
      simulator.setBlock({
        blockId: task.toBlockId,
        locoId: task.runtime.loco!.id,
      });

      await simulator.setLoco(
        task.runtime.loco!.address,
        0,
        this.resolveDirection(task)
      );

      await this.params!.markTaskReachedToBlock(task.id);
      this.sessions.delete(task.id);

      log(
        `[TrainSimulator] Loco reached block ${task.toBlockId}: ${task.name} (${task.id})`
      );
    }
  }

  private async stopLocoIfKnown(
    simulator: SimulatorCommandCenterPort,
    task: TrainTask | undefined
  ): Promise<void> {
    if (!task?.runtime.loco) {
      return;
    }

    await simulator.setLoco(
      task.runtime.loco.address,
      0,
      this.resolveDirection(task)
    );
  }

  private getTransitDurationMs(task: TrainTask): number {
    const nodeCount =
      Math.max(
        1,
        task.transition.solution.nodes.length
      );

    return Math.max(
      MIN_TRANSIT_MS,
      nodeCount * BASE_TRANSIT_PER_NODE_MS
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
