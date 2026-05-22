import type {
  RunnableBlockTransition,
} from "./railway/graph.js";

import type {
  Loco,
} from "./types.js";

export type TrainTaskStatus =
  | "queued"
  | "running"
  | "paused"
  | "finishing"
  | "aborted"
  | "completed"
  | "error";

export type TrainTaskCreateInput = {
  name?: string | undefined;
  targetSpeed: number;
  fromBlockId: string;
  toBlockId: string;
};

export type TrainTaskSimulationPhase =
  | "idle"
  | "waitingForLoco"
  | "waitingForRoute"
  | "waitingForBlockSensor"
  | "departing"
  | "transit";

export type TrainTaskSimulationProgress = {
  phase: TrainTaskSimulationPhase;

  /**
   * 0-based index.
   * Pl. A1→B1 = 0, B1→C1 = 1
   */
  legIndex: number;

  /**
   * Összes blokk-közti leg száma.
   */
  legCount: number;

  fromBlockId: string | null;
  fromBlockName: string | null;

  toBlockId: string | null;
  toBlockName: string | null;

  /**
   * Ütközésvédelemnél megmutatjuk,
   * melyik foglaltsági szenzor felszabadulására vár a task.
   */
  waitingSensorAddress?: number | null;
};

export type TrainTaskRuntimeState = {
  loco: Loco | null;
  hasLeftFromBlock: boolean;
  hasReachedToBlock: boolean;
  inTransit: boolean;
  simulation: TrainTaskSimulationProgress;
};

export type TrainTask = {
  id: string;
  name: string;
  targetSpeed: number;
  fromBlockId: string;
  toBlockId: string;
  transition: RunnableBlockTransition;
  status: TrainTaskStatus;
  createdAt: number;
  startedAt?: number | undefined;
  abortedAt?: number | undefined;
  completedAt?: number | undefined;
  runtime: TrainTaskRuntimeState;
  error?: string | undefined;
};

export type SavedTrainTask = {
  id: string;
  name: string;
  targetSpeed: number;
  fromBlockId: string;
  toBlockId: string;
  createdAt: number;
};

export type TaskManagerOverlayState = {
  reservedSectionNames: string[];
  transitSectionNames: string[];
  transitTurnoutAddresses: number[];
  activeBlockIds: string[];
  activeTurnoutAddresses: number[];
};

export type TaskManagerSnapshot = {
  tasks: TrainTask[];
  overlay: TaskManagerOverlayState;
  hasGraph: boolean;
  hasLayout: boolean;
};

export type TaskManagerActionResult =
  | {
      ok: true;
      snapshot: TaskManagerSnapshot;
    }
  | {
      ok: false;
      error: string;
      snapshot?: TaskManagerSnapshot | undefined;
    };

export type AddTrainTaskResult =
  | {
      ok: true;
      task: TrainTask;
      snapshot: TaskManagerSnapshot;
    }
  | {
      ok: false;
      error: string;
      snapshot?: TaskManagerSnapshot | undefined;
    };

export type LoadTrainTasksResult =
  | {
      ok: true;
      loadedCount: number;
      skippedCount: number;
      warnings: string[];
      snapshot: TaskManagerSnapshot;
    }
  | {
      ok: false;
      error: string;
      snapshot?: TaskManagerSnapshot | undefined;
    };

/**
 * Task manager szerver -> kliens domain event payloadok.
 */
export type TaskRejectedPayload = {
  reason: string;
};

export type TaskWaitingForLocoPayload = {
  taskId: string;
  taskName: string;
  blockId: string;
  messageKey?: string;
  message: string;
};

export type TaskLifecycleEventPayload = {
  taskId: string;
  taskName: string;
  fromBlockId: string;
  toBlockId: string;
  completedAt: number;
  messageKey?: string;
  message: string;
};
