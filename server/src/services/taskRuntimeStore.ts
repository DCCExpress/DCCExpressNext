import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { dataDir } from "../paths.js";
import { readLocos } from "../routes/locoRoutes.js";
import { routeGraphRuntimeStore } from "./routeGraphRuntimeStore.js";
import { railwayTopologyStore } from "./railwayTopologyStore.js";

import type {
  AddTrainTaskResult,
  LoadTrainTasksResult,
  SavedTrainTask,
  TaskManagerActionResult,
  TaskManagerOverlayState,
  TaskManagerSnapshot,
  TrainTask,
  TrainTaskCreateInput,
  TrainTaskRuntimeState,
} from "../../../common/src/task.js";

type BroadcastFn = (
  message: unknown
) => void;

type ConfigureParams = {
  broadcast: BroadcastFn;
};

class TaskRuntimeStore {
  private initialized = false;
  private broadcast: BroadcastFn | null = null;

  private readonly tasks: TrainTask[] = [];
  private readonly savedTasks: SavedTrainTask[] = [];

  private readonly tasksFilePath =
    path.resolve(dataDir, "tasks.json");

  configure(params: ConfigureParams): void {
    this.broadcast = params.broadcast;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await fs.mkdir(
      path.dirname(this.tasksFilePath),
      { recursive: true }
    );

    await this.loadTasksFromDiskInternal();

    this.initialized = true;
  }

  getSnapshot(): TaskManagerSnapshot {
    return {
      tasks: this.tasks.map(cloneTask),
      overlay: this.createOverlayState(),
      hasGraph: routeGraphRuntimeStore.hasGraph(),
      hasLayout: railwayTopologyStore.getTopology() !== null,
    };
  }

  async addTask(
    input: TrainTaskCreateInput
  ): Promise<AddTrainTaskResult> {
    await this.initialize();

    const graph = routeGraphRuntimeStore.getGraph();

    if (!graph) {
      return this.addError(
        "Nincs aktív szerveroldali útvonalgráf."
      );
    }

    const locoAddress = Number(input.locoAddress);
    const targetSpeed = Number(input.targetSpeed);

    if (!Number.isFinite(locoAddress) || locoAddress <= 0) {
      return this.addError(
        "Adj meg érvényes mozdony címet."
      );
    }

    if (!Number.isFinite(targetSpeed) || targetSpeed < 0) {
      return this.addError(
        "Adj meg érvényes célsebességet."
      );
    }

    const transition =
      graph
        .getRunnableBlockTransitions()
        .find(item =>
          item.fromBlock.id === input.fromBlockId &&
          item.toBlock.id === input.toBlockId
        );

    if (!transition) {
      return this.addError(
        "A kiválasztott blokkok között nincs közvetlenül automatizálható útvonal."
      );
    }

    const id = this.createTaskId();
    const name =
      input.name?.trim() ||
      `${transition.fromBlock.name} → ${transition.toBlock.name}`;

    const saved: SavedTrainTask = {
      id,
      name,
      locoAddress,
      targetSpeed,
      fromBlockId: input.fromBlockId,
      toBlockId: input.toBlockId,
      createdAt: Date.now(),
    };

    const task =
      this.createRuntimeTask(
        saved,
        transition
      );

    this.savedTasks.push(saved);
    this.tasks.push(task);

    await this.persistTasks();
    this.broadcastSnapshot();

    return {
      ok: true,
      task: cloneTask(task),
      snapshot: this.getSnapshot(),
    };
  }

  async removeTask(
    taskId: string
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const taskIndex =
      this.tasks.findIndex(task => task.id === taskId);

    if (taskIndex < 0) {
      return this.actionError(
        "A feladat nem található."
      );
    }

    const task = this.tasks[taskIndex]!;

    if (
      task.status === "running" ||
      task.status === "paused"
    ) {
      return this.actionError(
        "Futó vagy szüneteltetett feladatot előbb állíts le."
      );
    }

    this.tasks.splice(taskIndex, 1);

    const savedIndex =
      this.savedTasks.findIndex(
        item => item.id === taskId
      );

    if (savedIndex >= 0) {
      this.savedTasks.splice(savedIndex, 1);
    }

    await this.persistTasks();
    this.broadcastSnapshot();

    return this.actionOk();
  }

  async startTask(
    taskIdOrName: string
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task =
      this.findTask(taskIdOrName);

    if (!task) {
      return this.actionError(
        "A feladat nem található."
      );
    }

    if (task.status === "running") {
      return this.actionError(
        "A feladat már fut."
      );
    }

    if (task.status === "paused") {
      return this.actionError(
        "A feladat szüneteltetett állapotban van. Resume kell, nem Start."
      );
    }

    if (task.status === "completed") {
      return this.actionError(
        "A feladat már befejeződött."
      );
    }

    const loco =
      (await readLocos()).find(
        item => item.address === task.locoAddress
      ) ?? null;

    if (!loco) {
      return this.actionError(
        `A megadott mozdonycímhez nem található mozdony: ${task.locoAddress}.`
      );
    }

    if (task.status === "stopped") {
      task.runtime = this.createRuntimeState();
      delete task.stoppedAt;
      delete task.completedAt;
    }

    task.runtime.loco = loco;
    task.status = "running";
    task.startedAt = Date.now();
    delete task.error;

    this.broadcastSnapshot();

    return this.actionOk();
  }

  async pauseTask(
    taskIdOrName: string
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task =
      this.findTask(taskIdOrName);

    if (!task) {
      return this.actionError(
        "A feladat nem található."
      );
    }

    if (task.status !== "running") {
      return this.actionError(
        "Csak futó feladat szüneteltethető."
      );
    }

    task.status = "paused";
    this.broadcastSnapshot();

    return this.actionOk();
  }

  async resumeTask(
    taskIdOrName: string
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task =
      this.findTask(taskIdOrName);

    if (!task) {
      return this.actionError(
        "A feladat nem található."
      );
    }

    if (task.status !== "paused") {
      return this.actionError(
        "Csak szüneteltetett feladat folytatható."
      );
    }

    task.status = "running";
    this.broadcastSnapshot();

    return this.actionOk();
  }

  async stopTask(
    taskIdOrName: string
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task =
      this.findTask(taskIdOrName);

    if (!task) {
      return this.actionError(
        "A feladat nem található."
      );
    }

    if (task.status === "stopped") {
      return this.actionError(
        "A feladat már le van állítva."
      );
    }

    if (task.status === "completed") {
      return this.actionError(
        "A befejezett feladatot már nem kell leállítani."
      );
    }

    task.status = "stopped";
    task.stoppedAt = Date.now();
    task.runtime.inTransit = false;

    this.broadcastSnapshot();

    return this.actionOk();
  }

  async stopAllTasks(): Promise<TaskManagerActionResult> {
    await this.initialize();

    for (const task of this.tasks) {
      if (
        task.status === "running" ||
        task.status === "paused"
      ) {
        task.status = "stopped";
        task.stoppedAt = Date.now();
        task.runtime.inTransit = false;
      }
    }

    this.broadcastSnapshot();

    return this.actionOk();
  }

  async markTaskLeftFromBlock(
    taskId: string
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task = this.findTask(taskId);

    if (!task) {
      return this.actionError(
        "A feladat nem található."
      );
    }

    task.runtime.hasLeftFromBlock = true;
    task.runtime.inTransit = true;

    this.broadcastSnapshot();

    return this.actionOk();
  }

  async markTaskReachedToBlock(
    taskId: string
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task = this.findTask(taskId);

    if (!task) {
      return this.actionError(
        "A feladat nem található."
      );
    }

    task.runtime.hasReachedToBlock = true;
    task.runtime.inTransit = false;
    task.status = "completed";
    task.completedAt = Date.now();

    this.broadcastSnapshot();

    return this.actionOk();
  }

  async saveTasks(): Promise<TaskManagerActionResult> {
    await this.initialize();
    await this.persistTasks();

    return this.actionOk();
  }

  async reloadTasks(): Promise<LoadTrainTasksResult> {
    await this.initialize();

    const result =
      await this.loadTasksFromDiskInternal();

    this.broadcastSnapshot();

    return result;
  }

  private async loadTasksFromDiskInternal(): Promise<LoadTrainTasksResult> {
    const graph = routeGraphRuntimeStore.getGraph();

    if (!graph) {
      this.tasks.splice(0, this.tasks.length);
      this.savedTasks.splice(0, this.savedTasks.length);

      return {
        ok: false,
        error:
          "A feladatok visszatöltéséhez előbb szükség van az útvonalgráfra.",
        snapshot: this.getSnapshot(),
      };
    }

    let rawSavedTasks: unknown = [];

    try {
      const raw =
        await fs.readFile(
          this.tasksFilePath,
          "utf8"
        );

      const parsed = JSON.parse(raw) as unknown;

      rawSavedTasks =
        Array.isArray(parsed)
          ? parsed
          : (
              parsed &&
              typeof parsed === "object" &&
              Array.isArray((parsed as { tasks?: unknown }).tasks)
            )
            ? (parsed as { tasks: unknown[] }).tasks
            : [];
    } catch (error: unknown) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? String((error as { code?: unknown }).code)
          : "";

      if (code !== "ENOENT") {
        console.error(
          "[TaskRuntimeStore] Failed to read tasks.json:",
          error
        );
      }

      rawSavedTasks = [];
    }

    const loadedTasks: TrainTask[] = [];
    const normalizedSavedTasks: SavedTrainTask[] = [];
    const warnings: string[] = [];

    const transitions =
      graph.getRunnableBlockTransitions();

    for (const rawItem of Array.isArray(rawSavedTasks) ? rawSavedTasks : []) {
      const saved = normalizeSavedTask(rawItem);

      if (!saved) {
        warnings.push(
          "Kihagyva: hibás tasks.json bejegyzés."
        );
        continue;
      }

      const transition =
        transitions.find(item =>
          item.fromBlock.id === saved.fromBlockId &&
          item.toBlock.id === saved.toBlockId
        );

      if (!transition) {
        warnings.push(
          `Kihagyva: ${saved.name} — az útvonal már nem található vagy nem automatizálható.`
        );
        continue;
      }

      normalizedSavedTasks.push(saved);
      loadedTasks.push(
        this.createRuntimeTask(
          saved,
          transition
        )
      );
    }

    this.savedTasks.splice(
      0,
      this.savedTasks.length,
      ...normalizedSavedTasks
    );

    this.tasks.splice(
      0,
      this.tasks.length,
      ...loadedTasks
    );

    return {
      ok: true,
      loadedCount: loadedTasks.length,
      skippedCount: warnings.length,
      warnings,
      snapshot: this.getSnapshot(),
    };
  }

  private createRuntimeTask(
    saved: SavedTrainTask,
    transition: TrainTask["transition"]
  ): TrainTask {
    return {
      id: saved.id,
      name: saved.name,
      locoAddress: saved.locoAddress,
      targetSpeed: saved.targetSpeed,
      fromBlockId: saved.fromBlockId,
      toBlockId: saved.toBlockId,
      transition,
      status: "queued",
      createdAt: saved.createdAt,
      runtime: this.createRuntimeState(),
    };
  }

  private createRuntimeState(): TrainTaskRuntimeState {
    return {
      loco: null,
      hasLeftFromBlock: false,
      hasReachedToBlock: false,
      inTransit: false,
    };
  }

  private createOverlayState(): TaskManagerOverlayState {
    const activeTasks =
      this.tasks.filter(task =>
        task.status === "running" ||
        task.status === "paused"
      );

    const reservedSectionNames =
      new Set<string>();

    const transitSectionNames =
      new Set<string>();

    const activeBlockIds =
      new Set<string>();

    const activeTurnoutAddresses =
      new Set<number>();

    for (const task of activeTasks) {
      const solution =
        task.transition.solution;

      for (const node of solution.nodes) {
        reservedSectionNames.add(node.name);

        if (task.runtime.inTransit) {
          transitSectionNames.add(node.name);
        }
      }

      activeBlockIds.add(task.fromBlockId);
      activeBlockIds.add(task.toBlockId);

      for (const turnoutState of solution.turnoutStates) {
        activeTurnoutAddresses.add(
          turnoutState.address
        );
      }
    }

    return {
      reservedSectionNames: [
        ...reservedSectionNames,
      ],
      transitSectionNames: [
        ...transitSectionNames,
      ],
      activeBlockIds: [
        ...activeBlockIds,
      ],
      activeTurnoutAddresses: [
        ...activeTurnoutAddresses,
      ],
    };
  }

  private findTask(
    taskIdOrName: string
  ): TrainTask | undefined {
    return this.tasks.find(task =>
      task.id === taskIdOrName ||
      task.name === taskIdOrName
    );
  }

  private createTaskId(): string {
    return `task-${Date.now()}-${randomUUID().slice(0, 8)}`;
  }

  private async persistTasks(): Promise<void> {
    await fs.mkdir(
      path.dirname(this.tasksFilePath),
      { recursive: true }
    );

    await fs.writeFile(
      this.tasksFilePath,
      JSON.stringify(this.savedTasks, null, 2),
      "utf8"
    );
  }

  private broadcastSnapshot(): void {
    this.broadcast?.({
      type: "taskManagerSnapshotChanged",
      data: this.getSnapshot(),
    });
  }

  private actionOk(): TaskManagerActionResult {
    return {
      ok: true,
      snapshot: this.getSnapshot(),
    };
  }

  private actionError(
    error: string
  ): TaskManagerActionResult {
    return {
      ok: false,
      error,
      snapshot: this.getSnapshot(),
    };
  }

  private addError(
    error: string
  ): AddTrainTaskResult {
    return {
      ok: false,
      error,
      snapshot: this.getSnapshot(),
    };
  }
}

function cloneTask(task: TrainTask): TrainTask {
  return {
    ...task,
    transition: task.transition,
    runtime: {
      ...task.runtime,
      ...(task.runtime.loco
        ? { loco: { ...task.runtime.loco } }
        : { loco: null }),
    },
  };
}

function normalizeSavedTask(
  raw: unknown
): SavedTrainTask | null {
  if (
    !raw ||
    typeof raw !== "object"
  ) {
    return null;
  }

  const item = raw as Record<string, unknown>;

  const id =
    typeof item.id === "string"
      ? item.id
      : "";

  const name =
    typeof item.name === "string"
      ? item.name
      : "";

  const locoAddress =
    typeof item.locoAddress === "number"
      ? item.locoAddress
      : 0;

  const targetSpeed =
    typeof item.targetSpeed === "number"
      ? item.targetSpeed
      : Number.NaN;

  const fromBlockId =
    typeof item.fromBlockId === "string"
      ? item.fromBlockId
      : "";

  const toBlockId =
    typeof item.toBlockId === "string"
      ? item.toBlockId
      : "";

  const createdAt =
    typeof item.createdAt === "number"
      ? item.createdAt
      : Date.now();

  if (
    !id ||
    !name ||
    !Number.isFinite(locoAddress) ||
    locoAddress <= 0 ||
    !Number.isFinite(targetSpeed) ||
    targetSpeed < 0 ||
    !fromBlockId ||
    !toBlockId
  ) {
    return null;
  }

  return {
    id,
    name,
    locoAddress,
    targetSpeed,
    fromBlockId,
    toBlockId,
    createdAt,
  };
}

export const taskRuntimeStore =
  new TaskRuntimeStore();
