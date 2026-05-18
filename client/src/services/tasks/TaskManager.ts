import {
  addTrainTask,
  deleteTrainTask,
  getTaskManagerSnapshot,
  pauseTrainTask,
  reloadTrainTasks,
  resumeTrainTask,
  saveTrainTasks,
  startTrainTask,
  stopTrainTask,
} from "../../api/http";

import { wsClient } from "../wsClient";

import type {
  AddTrainTaskResult,
  LoadTrainTasksResult,
  TaskManagerActionResult,
  TaskManagerSnapshot,
  TrainTaskCreateInput,
} from "./TaskTypes";

type TaskManagerListener = () => void;

export class TaskManager {
  private snapshot: TaskManagerSnapshot = createEmptySnapshot();
  private readonly listeners =
    new Set<TaskManagerListener>();

  private initialLoadStarted = false;

  constructor() {
    wsClient.on<TaskManagerSnapshot>(
      "taskManagerSnapshotChanged",
      snapshot => {
        this.setSnapshot(snapshot);
      }
    );

    wsClient.subscribeStatus(status => {
      if (status === "connected") {
        void this.loadTasks();
      }
    });

    void this.loadTasks();
  }

  subscribe(listener: TaskManagerListener): () => void {
    this.listeners.add(listener);
    listener();

    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): TaskManagerSnapshot {
    return cloneSnapshot(this.snapshot);
  }

  async addTask(
    input: TrainTaskCreateInput
  ): Promise<AddTrainTaskResult> {
    const result =
      await addTrainTask(input);

    if (result.ok) {
      this.setSnapshot(result.snapshot);
    } else if (result.snapshot) {
      this.setSnapshot(result.snapshot);
    }

    return result;
  }

  async removeTask(
    taskId: string
  ): Promise<TaskManagerActionResult> {
    const result =
      await deleteTrainTask(taskId);

    if (result.snapshot) {
      this.setSnapshot(result.snapshot);
    }

    return result;
  }

  async startTask(
    taskId: string
  ): Promise<TaskManagerActionResult> {
    const result =
      await startTrainTask(taskId);

    if (result.snapshot) {
      this.setSnapshot(result.snapshot);
    }

    return result;
  }

  async pauseTask(
    taskId: string
  ): Promise<TaskManagerActionResult> {
    const result =
      await pauseTrainTask(taskId);

    if (result.snapshot) {
      this.setSnapshot(result.snapshot);
    }

    return result;
  }

  async resumeTask(
    taskId: string
  ): Promise<TaskManagerActionResult> {
    const result =
      await resumeTrainTask(taskId);

    if (result.snapshot) {
      this.setSnapshot(result.snapshot);
    }

    return result;
  }

  async stopTask(
    taskId: string
  ): Promise<TaskManagerActionResult> {
    const result =
      await stopTrainTask(taskId);

    if (result.snapshot) {
      this.setSnapshot(result.snapshot);
    }

    return result;
  }

  async saveTasks(): Promise<TaskManagerActionResult> {
    const result =
      await saveTrainTasks();

    if (result.snapshot) {
      this.setSnapshot(result.snapshot);
    }

    return result;
  }

  async loadTasks(): Promise<LoadTrainTasksResult> {
    if (this.initialLoadStarted) {
      try {
        const snapshot =
          await getTaskManagerSnapshot();

        this.setSnapshot(snapshot);

        return {
          ok: true,
          loadedCount: snapshot.tasks.length,
          skippedCount: 0,
          warnings: [],
          snapshot,
        };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Nem sikerült betölteni a feladatokat.",
          snapshot: this.getSnapshot(),
        };
      }
    }

    this.initialLoadStarted = true;

    try {
      const result =
        await reloadTrainTasks();

      if (result.ok) {
        this.setSnapshot(result.snapshot);
      } else if (result.snapshot) {
        this.setSnapshot(result.snapshot);
      }

      return result;
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nem sikerült betölteni a feladatokat.",
        snapshot: this.getSnapshot(),
      };
    }
  }

  private setSnapshot(snapshot: TaskManagerSnapshot): void {
    this.snapshot = cloneSnapshot(snapshot);
    this.emitChange();
  }

  private emitChange(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

function createEmptySnapshot(): TaskManagerSnapshot {
  return {
    tasks: [],
    overlay: {
      reservedSectionNames: [],
      transitSectionNames: [],
      activeBlockIds: [],
      activeTurnoutAddresses: [],
    },
    hasGraph: false,
    hasLayout: false,
  };
}

function cloneSnapshot(
  snapshot: TaskManagerSnapshot
): TaskManagerSnapshot {
  return {
    ...snapshot,
    tasks: snapshot.tasks.map(task => ({
      ...task,
      transition: task.transition,
      runtime: {
        ...task.runtime,
        ...(task.runtime.loco
          ? {
              loco: {
                ...task.runtime.loco,
              },
            }
          : { loco: null }),
      },
    })),
    overlay: {
      reservedSectionNames: [
        ...snapshot.overlay.reservedSectionNames,
      ],
      transitSectionNames: [
        ...snapshot.overlay.transitSectionNames,
      ],
      activeBlockIds: [
        ...snapshot.overlay.activeBlockIds,
      ],
      activeTurnoutAddresses: [
        ...snapshot.overlay.activeTurnoutAddresses,
      ],
    },
  };
}
