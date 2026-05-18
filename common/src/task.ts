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
  | "stopped"
  | "completed"
  | "error";

export type TrainTaskCreateInput = {
  name?: string | undefined;
  locoAddress: number;
  targetSpeed: number;
  fromBlockId: string;
  toBlockId: string;
};

export type TrainTaskRuntimeState = {
  loco: Loco | null;
  hasLeftFromBlock: boolean;
  hasReachedToBlock: boolean;
  inTransit: boolean;
};

export type TrainTask = {
  id: string;
  name: string;
  locoAddress: number;
  targetSpeed: number;
  fromBlockId: string;
  toBlockId: string;
  transition: RunnableBlockTransition;
  status: TrainTaskStatus;
  createdAt: number;
  startedAt?: number | undefined;
  stoppedAt?: number | undefined;
  completedAt?: number | undefined;
  runtime: TrainTaskRuntimeState;
  error?: string | undefined;
};

export type SavedTrainTask = {
  id: string;
  name: string;
  locoAddress: number;
  targetSpeed: number;
  fromBlockId: string;
  toBlockId: string;
  createdAt: number;
};

export type TaskManagerOverlayState = {
  reservedSectionNames: string[];
  transitSectionNames: string[];
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
