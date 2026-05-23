// server/src/services/taskRuntimeStore.ts

import type {
  RunnableBlockTransition,
} from "../../../common/src/railway/graph.js";

import type {
  Direction,
  Loco,
} from "../../../common/src/types.js";

import type {
  AddTrainTaskResult,
  LoadTrainTasksResult,
  SavedTrainTask,
  TaskManagerActionResult,
  TaskManagerSnapshot,
  TrainTask,
  TrainTaskCreateInput,
  TrainTaskSimulationProgress,
} from "../../../common/src/task.js";

import type {
  BlockState,
  TypedServerWsMessage,
} from "../../../common/src/types.js";

import type {
  CommandCenter,
} from "../commandCenter/CommandCenter.js";

import {
  readLocos,
} from "./locoStore.js";

import {
  locoReservationStore,
} from "./locoReservationStore.js";

import {
  railwayTopologyStore,
} from "./railwayTopologyStore.js";

import {
  routeGraphRuntimeStore,
} from "./routeGraphRuntimeStore.js";

import {
  trainSimulatorRuntimeStore,
} from "./trainSimulatorRuntimeStore.js";

import {
  cloneTrainTask,
  createEmptyTrainTaskRuntimeState,
  createTaskManagerOverlayState,
  createTrainTaskId,
} from "./tasks/taskRuntimeHelpers.js";

import {
  ensureTaskStorage,
  normalizeSavedTrainTask,
  readSavedTrainTaskEntries,
  writeSavedTrainTasks,
} from "./tasks/taskPersistence.js";

import {
  TaskRouteRuntimeCoordinator,
} from "./tasks/taskRouteRuntimeCoordinator.js";

type SimulatorCommandCenterGetter =
  () => CommandCenter | null;

type BlockStateGetter =
  (blockId: string) => BlockState | null;

type BroadcastFn =
  (message: TypedServerWsMessage) => void;

function createTaskOwnerId(taskId: string): string {
  return `task:${taskId}`;
}

function resolveTaskDirection(task: TrainTask): Direction {
  return task.transition.solution.locoDirection === "reverse"
    ? "reverse"
    : "forward";
}

function createRestartingRuntimeState(task: TrainTask) {
  const runtime = createEmptyTrainTaskRuntimeState();

  runtime.hasReachedToBlock = true;
  runtime.simulation = {
    phase: "waitingForLoco",
    legIndex: 0,
    legCount: 0,
    fromBlockId: task.fromBlockId,
    fromBlockName: task.transition.fromBlock.name,
    toBlockId: null,
    toBlockName: null,
    waitingSensorAddress: null,
  };

  return runtime;
}

class TaskRuntimeStore {
  private tasks: TrainTask[] = [];
  private initialized = false;
  private broadcast: BroadcastFn | null = null;
  private getBlockState: BlockStateGetter | null = null;
  private getSimulatorCommandCenter: SimulatorCommandCenterGetter | null = null;
  private routeRuntimeCoordinator: TaskRouteRuntimeCoordinator | null = null;

  configure(params: {
    broadcast: BroadcastFn;
    getBlockState: BlockStateGetter;
    getSimulatorCommandCenter: SimulatorCommandCenterGetter;
  }): void {
    this.broadcast = params.broadcast;
    this.getBlockState = params.getBlockState;
    this.getSimulatorCommandCenter = params.getSimulatorCommandCenter;

    this.routeRuntimeCoordinator = new TaskRouteRuntimeCoordinator({
      broadcast: params.broadcast,
      getBlockState: params.getBlockState,
      getSimulatorCommandCenter: params.getSimulatorCommandCenter,
      updateTaskSimulationProgress: async (
        taskId,
        progress
      ) => this.updateTaskSimulationProgress(
        taskId,
        progress
      ),
    });

    trainSimulatorRuntimeStore.configure({
      getTasks: () => this.tasks,
      getBlockState: params.getBlockState,
      getSimulatorCommandCenter: params.getSimulatorCommandCenter,
      tryResolveTaskLoco: async taskId =>
        this.tryResolveTaskLoco(taskId),
      tryPrepareTaskRoute: async taskId => {
        const task = this.findTask(taskId);

        if (!task || !this.routeRuntimeCoordinator) {
          return false;
        }

        return this.routeRuntimeCoordinator.tryPrepareTaskRoute(task);
      },
      markTaskLeftFromBlock: async taskId =>
        this.markTaskLeftFromBlock(taskId),
      markTaskReachedToBlock: async taskId =>
        this.markTaskReachedToBlock(taskId),
      updateTaskSimulationProgress: async (
        taskId,
        progress
      ) => this.updateTaskSimulationProgress(
        taskId,
        progress
      ),
    });

    trainSimulatorRuntimeStore.start();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await ensureTaskStorage();

    const rawEntries =
      await readSavedTrainTaskEntries();

    const normalizedEntries =
      rawEntries
        .map(item => normalizeSavedTrainTask(item))
        .filter((item): item is SavedTrainTask => item !== null);

    this.tasks = normalizedEntries
      .map(item => this.createTaskFromSaved(item))
      .filter((item): item is TrainTask => item !== null);

    this.initialized = true;
    this.broadcastSnapshot();
  }

  getSnapshot(): TaskManagerSnapshot {
    return {
      tasks: this.tasks.map(cloneTrainTask),
      overlay: createTaskManagerOverlayState(this.tasks),
      hasGraph: routeGraphRuntimeStore.hasGraph(),
      hasLayout: railwayTopologyStore.getTopology() !== null,
    };
  }

  private broadcastSnapshot(): void {
    this.broadcast?.({
      type: "taskManagerSnapshotChanged",
      data: this.getSnapshot(),
    });
  }

  private createSuccessResult(): TaskManagerActionResult {
    return {
      ok: true,
      snapshot: this.getSnapshot(),
    };
  }

  private createErrorResult(
    error: string
  ): TaskManagerActionResult {
    return {
      ok: false,
      error,
      snapshot: this.getSnapshot(),
    };
  }

  private findTask(taskId: string): TrainTask | null {
    return this.tasks.find(task => task.id === taskId) ?? null;
  }

  private findTaskByIdOrName(
    taskIdOrName: string
  ): TrainTask | null {
    return (
      this.tasks.find(task =>
        task.id === taskIdOrName ||
        task.name === taskIdOrName
      ) ?? null
    );
  }

  private createTransition(
    fromBlockId: string,
    toBlockId: string
  ): RunnableBlockTransition | null {
    const graph = routeGraphRuntimeStore.getGraph();

    if (!graph) {
      return null;
    }

    const solution = graph.findRouteBetweenBlocks(
      fromBlockId,
      toBlockId
    );

    if (!solution) {
      return null;
    }

    return {
      fromBlock: solution.fromBlock,
      toBlock: solution.toBlock,
      solution,
    };
  }

  private createTaskFromSaved(
    saved: SavedTrainTask
  ): TrainTask | null {
    const transition = this.createTransition(
      saved.fromBlockId,
      saved.toBlockId
    );

    if (!transition) {
      return null;
    }

    return {
      id: saved.id,
      name: saved.name,
      targetSpeed: saved.targetSpeed,
      fromBlockId: saved.fromBlockId,
      toBlockId: saved.toBlockId,
      transition,
      status: "queued",
      createdAt: saved.createdAt,
      runtime: createEmptyTrainTaskRuntimeState(),
    };
  }

  async addTask(
    input: TrainTaskCreateInput
  ): Promise<AddTrainTaskResult> {
    await this.initialize();

    const transition = this.createTransition(
      input.fromBlockId,
      input.toBlockId
    );

    if (!transition) {
      return {
        ok: false,
        error: "No route found between task blocks.",
        snapshot: this.getSnapshot(),
      };
    }

    const task: TrainTask = {
      id: createTrainTaskId(),
      name:
        input.name?.trim() ||
        `${transition.fromBlock.name} → ${transition.toBlock.name}`,
      targetSpeed: input.targetSpeed,
      fromBlockId: input.fromBlockId,
      toBlockId: input.toBlockId,
      transition,
      status: "queued",
      createdAt: Date.now(),
      runtime: createEmptyTrainTaskRuntimeState(),
    };

    this.tasks.push(task);
    await this.saveTasks();

    return {
      ok: true,
      task: cloneTrainTask(task),
      snapshot: this.getSnapshot(),
    };
  }

  async updateTask(
    taskId: string,
    input: TrainTaskCreateInput
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task = this.findTask(taskId);

    if (!task) {
      return this.createErrorResult("Task not found.");
    }

    if (task.status === "running" || task.status === "paused" || task.status === "finishing") {
      return this.createErrorResult("Active task cannot be modified.");
    }

    const transition = this.createTransition(
      input.fromBlockId,
      input.toBlockId
    );

    if (!transition) {
      return this.createErrorResult("No route found between task blocks.");
    }

    task.name =
      input.name?.trim() ||
      `${transition.fromBlock.name} → ${transition.toBlock.name}`;
    task.targetSpeed = input.targetSpeed;
    task.fromBlockId = input.fromBlockId;
    task.toBlockId = input.toBlockId;
    task.transition = transition;
    task.runtime = createEmptyTrainTaskRuntimeState();
    task.error = undefined;

    await this.saveTasks();

    return this.createSuccessResult();
  }

  async removeTask(
    taskId: string
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task = this.findTask(taskId);

    if (!task) {
      return this.createErrorResult("Task not found.");
    }

    await this.restoreTaskLocoToCurrentFromBlock(task);
    await this.stopTaskLocoIfNeeded(task);
    this.releaseTaskResources(task);
    this.tasks = this.tasks.filter(item => item.id !== taskId);

    await this.saveTasks();

    return this.createSuccessResult();
  }

  async saveTasks(): Promise<TaskManagerActionResult> {
    await this.initialize();

    const savedEntries: SavedTrainTask[] = this.tasks.map(task => ({
      id: task.id,
      name: task.name,
      targetSpeed: task.targetSpeed,
      fromBlockId: task.fromBlockId,
      toBlockId: task.toBlockId,
      createdAt: task.createdAt,
    }));

    await writeSavedTrainTasks(savedEntries);
    this.broadcastSnapshot();

    return this.createSuccessResult();
  }

  async reloadTasks(): Promise<LoadTrainTasksResult> {
    await ensureTaskStorage();

    const rawEntries = await readSavedTrainTaskEntries();
    const warnings: string[] = [];
    const tasks: TrainTask[] = [];
    let skippedCount = 0;

    for (const rawEntry of rawEntries) {
      const saved = normalizeSavedTrainTask(rawEntry);

      if (!saved) {
        skippedCount += 1;
        warnings.push("Invalid task entry skipped.");
        continue;
      }

      const task = this.createTaskFromSaved(saved);

      if (!task) {
        skippedCount += 1;
        warnings.push(
          `No route found for task: ${saved.name}`
        );
        continue;
      }

      tasks.push(task);
    }

    this.tasks = tasks;
    this.initialized = true;
    this.broadcastSnapshot();

    return {
      ok: true,
      loadedCount: tasks.length,
      skippedCount,
      warnings,
      snapshot: this.getSnapshot(),
    };
  }

  hasActiveTasks(): boolean {
    return this.tasks.some(task =>
      task.status === "running" ||
      task.status === "paused" ||
      task.status === "finishing"
    );
  }

  async startTask(
    taskIdOrName: string
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task = this.findTaskByIdOrName(taskIdOrName);

    if (!task) {
      return this.createErrorResult("Task not found.");
    }

    if (task.status === "running") {
      return this.createErrorResult("Task is already running.");
    }

    if (task.status === "paused") {
      return this.resumeTask(task.id);
    }

    const transition = this.createTransition(
      task.fromBlockId,
      task.toBlockId
    );

    if (!transition) {
      return this.createErrorResult("No route found between task blocks.");
    }

    task.transition = transition;
    task.status = "running";
    task.startedAt = Date.now();
    task.abortedAt = undefined;
    task.completedAt = undefined;
    task.error = undefined;
    task.runtime = createEmptyTrainTaskRuntimeState();

    await this.tryResolveTaskLoco(task.id);

    this.broadcastSnapshot();

    return this.createSuccessResult();
  }

  async pauseTask(
    taskIdOrName: string
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task = this.findTaskByIdOrName(taskIdOrName);

    if (!task) {
      return this.createErrorResult("Task not found.");
    }

    if (task.status !== "running") {
      return this.createErrorResult("Task is not running.");
    }

    task.status = "paused";
    this.broadcastSnapshot();

    return this.createSuccessResult();
  }

  async resumeTask(
    taskIdOrName: string
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task = this.findTaskByIdOrName(taskIdOrName);

    if (!task) {
      return this.createErrorResult("Task not found.");
    }

    if (task.status !== "paused") {
      return this.createErrorResult("Task is not paused.");
    }

    task.status = "running";
    this.broadcastSnapshot();

    return this.createSuccessResult();
  }

  async finishTask(
    taskIdOrName: string
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task = this.findTaskByIdOrName(taskIdOrName);

    if (!task) {
      return this.createErrorResult("Task not found.");
    }

    this.requestTaskFinish(task);
    this.broadcastSnapshot();

    return this.createSuccessResult();
  }

  async abortTask(
    taskIdOrName: string
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task = this.findTaskByIdOrName(taskIdOrName);

    if (!task) {
      return this.createErrorResult("Task not found.");
    }

    await this.restoreTaskLocoToCurrentFromBlock(task);
    await this.stopTaskLocoIfNeeded(task);
    this.releaseTaskResources(task);
    task.status = "aborted";
    task.abortedAt = Date.now();
    task.error = undefined;
    task.runtime = createEmptyTrainTaskRuntimeState();
    this.broadcastSnapshot();

    return this.createSuccessResult();
  }

  async startAllTasks(): Promise<TaskManagerActionResult> {
    await this.initialize();

    for (const task of this.tasks) {
      if (
        task.status === "queued" ||
        task.status === "aborted" ||
        task.status === "completed" ||
        task.status === "error"
      ) {
        await this.startTask(task.id);
      }
    }

    return this.createSuccessResult();
  }

  async finishAllTasks(): Promise<TaskManagerActionResult> {
    await this.initialize();

    for (const task of this.tasks) {
      if (
        task.status === "running" ||
        task.status === "paused" ||
        task.status === "finishing"
      ) {
        this.requestTaskFinish(task);
      }
    }

    this.broadcastSnapshot();

    return this.createSuccessResult();
  }

  async abortAllTasks(): Promise<TaskManagerActionResult> {
    await this.initialize();

    for (const task of this.tasks) {
      if (
        task.status === "running" ||
        task.status === "paused" ||
        task.status === "finishing"
      ) {
        await this.restoreTaskLocoToCurrentFromBlock(task);
        await this.stopTaskLocoIfNeeded(task);
        this.releaseTaskResources(task);
        task.status = "aborted";
        task.abortedAt = Date.now();
        task.error = undefined;
        task.runtime = createEmptyTrainTaskRuntimeState();
      }
    }

    this.broadcastSnapshot();

    return this.createSuccessResult();
  }

  private resolveStartBlockState(task: TrainTask): BlockState | null {
    const blockIds = [
      task.fromBlockId,
      task.transition.fromBlock.id,
      task.transition.fromBlock.name,
      task.transition.fromBlock.label,
      task.transition.fromBlock.trackName,
    ];

    const uniqueBlockIds = Array.from(
      new Set(
        blockIds
          .map(blockId => blockId?.trim())
          .filter((blockId): blockId is string => Boolean(blockId))
      )
    );

    for (const blockId of uniqueBlockIds) {
      const blockState =
        this.getBlockState?.(blockId) ?? null;

      if (blockState?.locoId) {
        return blockState;
      }
    }

    return null;
  }

  private resolveLocoFromBlockLocoId(
    locos: Loco[],
    locoId: string
  ): Loco | null {
    const normalizedLocoId =
      locoId.trim();

    const byId =
      locos.find(loco => loco.id === normalizedLocoId);

    if (byId) {
      return byId;
    }

    const byName =
      locos.find(loco => loco.name === normalizedLocoId);

    if (byName) {
      return byName;
    }

    const numericLocoId =
      Number(normalizedLocoId);

    if (Number.isFinite(numericLocoId)) {
      return (
        locos.find(loco => loco.address === numericLocoId) ?? null
      );
    }

    return null;
  }

  private async tryResolveTaskLoco(
    taskId: string
  ): Promise<TaskManagerActionResult> {
    const task = this.findTask(taskId);

    if (!task) {
      return this.createErrorResult("Task not found.");
    }

    if (task.runtime.loco) {
      return this.createSuccessResult();
    }

    const blockState =
      this.resolveStartBlockState(task);

    const locoId =
      blockState?.locoId ?? null;

    if (!locoId) {
      this.broadcast?.({
        type: "taskWaitingForLoco",
        data: {
          taskId: task.id,
          taskName: task.name,
          blockId: task.fromBlockId,
          message: `No loco assigned to task start block (${task.transition.fromBlock.name}).`,
        },
      });

      return this.createErrorResult("No loco assigned to task start block.");
    }

    const locos =
      await readLocos();

    const loco =
      this.resolveLocoFromBlockLocoId(locos, locoId);

    if (!loco) {
      return this.createErrorResult(
        `Assigned loco was not found for block value: ${locoId}`
      );
    }

    const ownerId = createTaskOwnerId(task.id);

    if (
      locoReservationStore.isReservedByOther(
        loco.address,
        ownerId
      )
    ) {
      return this.createErrorResult("Loco is reserved by another owner.");
    }

    const reservation = locoReservationStore.reserve({
      locoAddress: loco.address,
      ownerId,
      ownerType: "task",
      ownerName: task.name,
      reason: "task-runtime",
    });

    task.runtime.loco = {
      ...loco,
    };

    this.broadcast?.({
      type: "locoReservationChanged",
      data: {
        locoAddress: loco.address,
        reservation,
      },
    });

    this.broadcastSnapshot();

    return this.createSuccessResult();
  }

  private async updateTaskSimulationProgress(
    taskId: string,
    progress: TrainTaskSimulationProgress
  ): Promise<TaskManagerActionResult> {
    const task = this.findTask(taskId);

    if (!task) {
      return this.createErrorResult("Task not found.");
    }

    task.runtime.simulation = progress;
    this.broadcastSnapshot();

    return this.createSuccessResult();
  }

  private async markTaskLeftFromBlock(
    taskId: string
  ): Promise<TaskManagerActionResult> {
    const task = this.findTask(taskId);

    if (!task) {
      return this.createErrorResult("Task not found.");
    }

    task.runtime.hasLeftFromBlock = true;
    task.runtime.inTransit = true;
    this.broadcastSnapshot();

    return this.createSuccessResult();
  }

  private async markTaskReachedToBlock(
    taskId: string
  ): Promise<TaskManagerActionResult> {
    const task = this.findTask(taskId);

    if (!task) {
      return this.createErrorResult("Task not found.");
    }

    if (task.status === "finishing") {
      this.completeTask(task);
      this.broadcastTaskLifecycle("taskCompleted", task);
      this.broadcastSnapshot();

      return this.createSuccessResult();
    }

    this.releaseTaskResources(task);
    task.status = "running";
    task.runtime = createRestartingRuntimeState(task);
    this.broadcastTaskLifecycle("taskCycleCompleted", task);
    this.broadcastSnapshot();

    return this.createSuccessResult();
  }

  private completeTask(task: TrainTask): void {
    this.releaseTaskResources(task);
    task.status = "completed";
    task.completedAt = Date.now();
    task.runtime.hasReachedToBlock = true;
    task.runtime.inTransit = false;
  }

  private requestTaskFinish(task: TrainTask): void {
    if (task.status === "completed") {
      return;
    }

    if (!task.runtime.loco || !task.runtime.hasLeftFromBlock) {
      this.completeTask(task);
      this.broadcastTaskLifecycle("taskCompleted", task);
      return;
    }

    task.status = "finishing";
    task.error = undefined;
  }

  private isSameLocoReference(
    locoReference: string,
    loco: Loco
  ): boolean {
    const normalized =
      locoReference.trim();

    if (normalized === loco.id) {
      return true;
    }

    if (normalized === loco.name) {
      return true;
    }

    const numericReference =
      Number(normalized);

    return (
      Number.isFinite(numericReference) &&
      numericReference === loco.address
    );
  }

  private canRestoreLocoToBlock(
    blockId: string,
    loco: Loco
  ): boolean {
    const blockState =
      this.getBlockState?.(blockId) ?? null;

    const occupantLocoId =
      blockState?.locoId ?? null;

    return (
      !occupantLocoId ||
      this.isSameLocoReference(occupantLocoId, loco)
    );
  }

  private async restoreTaskLocoToCurrentFromBlock(task: TrainTask): Promise<void> {
    const loco = task.runtime.loco;

    if (!loco) {
      return;
    }

    const simulator =
      this.getSimulatorCommandCenter?.() ?? null;

    if (!simulator) {
      return;
    }

    const blockId =
      task.runtime.simulation?.fromBlockName ||
      task.transition.fromBlock.name;

    if (!blockId) {
      return;
    }

    if (!this.canRestoreLocoToBlock(blockId, loco)) {
      this.broadcast?.({
        type: "taskRejected",
        data: {
          reason: `Cannot restore loco ${loco.name} to ${blockId}, block is occupied by another loco.`,
        },
      });

      return;
    }

    simulator.setBlock({
      blockId,
      locoId: loco.id,
    });
  }

  private async stopTaskLocoIfNeeded(task: TrainTask): Promise<void> {
    const loco = task.runtime.loco;

    if (!loco) {
      return;
    }

    const simulator =
      this.getSimulatorCommandCenter?.() ?? null;

    if (!simulator) {
      return;
    }

    await simulator.setLoco(
      loco.address,
      0,
      resolveTaskDirection(task)
    );
  }

  private releaseTaskResources(task: TrainTask): void {
    this.routeRuntimeCoordinator?.releaseTaskRoute(task.id);

    const ownerId = createTaskOwnerId(task.id);
    const releases =
      locoReservationStore.releaseByOwner(ownerId);

    for (const release of releases) {
      this.broadcast?.({
        type: "locoReservationChanged",
        data: release,
      });
    }

    task.runtime.loco = null;
  }

  private broadcastTaskLifecycle(
    type: "taskCompleted" | "taskCycleCompleted",
    task: TrainTask
  ): void {
    this.broadcast?.({
      type,
      data: {
        taskId: task.id,
        taskName: task.name,
        fromBlockId: task.fromBlockId,
        toBlockId: task.toBlockId,
        completedAt: Date.now(),
        message: type === "taskCompleted"
          ? `${task.name} completed.`
          : `${task.name} cycle completed and is waiting for the next start.`,
      },
    });
  }
}

export const taskRuntimeStore = new TaskRuntimeStore();