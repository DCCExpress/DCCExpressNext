import { readLocos } from "./locoStore.js";
import { routeGraphRuntimeStore } from "./routeGraphRuntimeStore.js";
import { railwayTopologyStore } from "./railwayTopologyStore.js";
import type { CommandCenter } from "../commandCenter/CommandCenter.js";

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
import { trainSimulatorRuntimeStore } from "./trainSimulatorRuntimeStore.js";

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

import {
  createPendingLocoReservation,
  createTaskLocoOwnerId,
  TaskLocoReservation,
} from "./tasks/taskLocoReservation.js";

import {
  getDirectionForBlockTransition,
} from "./tasks/taskRouteDirection.js";

import {
  createTrainTaskSimulationStep,
} from "./tasks/taskSimulation.js";

import {
  locoReservationStore,
} from "./locoReservationStore.js";

class TaskRuntimeStore {
  private tasks: TrainTask[] = [];
  private initialized = false;
  private broadcast: ((message: TypedServerWsMessage) => void) | null = null;
  private getCommandCenter: (() => CommandCenter | null) | null = null;
  private getBlockState: ((blockId: string) => BlockState | null) | null = null;
  private runningTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly routeRuntimeCoordinator = new TaskRouteRuntimeCoordinator();

  configure(params: {
    broadcast: (message: TypedServerWsMessage) => void;
    getCommandCenter: () => CommandCenter | null;
    getBlockState: (blockId: string) => BlockState | null;
  }): void {
    this.broadcast = params.broadcast;
    this.getCommandCenter = params.getCommandCenter;
    this.getBlockState = params.getBlockState;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await ensureTaskStorage();

    const savedEntries = await readSavedTrainTaskEntries();

    this.tasks = savedEntries.map(
      entry => normalizeSavedTrainTask(entry)
    );

    this.initialized = true;
    this.broadcastSnapshot();
  }

  getSnapshot(): TaskManagerSnapshot {
    return {
      tasks: this.tasks.map(cloneTrainTask),
      overlay: createTaskManagerOverlayState(
        this.tasks
      ),
    };
  }

  private broadcastSnapshot(): void {
    this.broadcast?.({
      type: "taskManagerSnapshotChanged",
      data: this.getSnapshot(),
    });
  }

  private createActionResult(
    ok: boolean,
    error?: string
  ): TaskManagerActionResult {
    return {
      ok,
      ...(error ? { error } : {}),
      snapshot: this.getSnapshot(),
    };
  }

  private findTask(taskId: string): TrainTask | null {
    return this.tasks.find(task => task.id === taskId) ?? null;
  }

  private findTaskByIdOrName(taskIdOrName: string): TrainTask | null {
    return this.tasks.find(task => task.id === taskIdOrName || task.name === taskIdOrName) ?? null;
  }

  async addTask(input: TrainTaskCreateInput): Promise<AddTrainTaskResult> {
    await this.initialize();

    const task: TrainTask = {
      id: createTrainTaskId(),
      name: input.name,
      status: "queued",
      fromBlockId: input.fromBlockId,
      toBlockId: input.toBlockId,
      targetSpeed: input.targetSpeed,
      transition: input.transition,
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

  async updateTask(taskId: string, input: TrainTaskCreateInput): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task = this.findTask(taskId);

    if (!task) {
      return this.createActionResult(false, "Task not found.");
    }

    task.name = input.name;
    task.fromBlockId = input.fromBlockId;
    task.toBlockId = input.toBlockId;
    task.targetSpeed = input.targetSpeed;
    task.transition = input.transition;

    await this.saveTasks();

    return this.createActionResult(true);
  }

  async removeTask(taskId: string): Promise<TaskManagerActionResult> {
    await this.initialize();

    const before = this.tasks.length;
    this.tasks = this.tasks.filter(task => task.id !== taskId);

    if (this.tasks.length === before) {
      return this.createActionResult(false, "Task not found.");
    }

    await this.saveTasks();

    return this.createActionResult(true);
  }

  async saveTasks(): Promise<TaskManagerActionResult> {
    await this.initialize();

    const savedEntries: SavedTrainTask[] = this.tasks.map(task => ({
      id: task.id,
      name: task.name,
      fromBlockId: task.fromBlockId,
      toBlockId: task.toBlockId,
      targetSpeed: task.targetSpeed,
      transition: task.transition,
    }));

    await writeSavedTrainTasks(savedEntries);
    this.broadcastSnapshot();

    return this.createActionResult(true);
  }

  async reloadTasks(): Promise<LoadTrainTasksResult> {
    this.initialized = false;
    await this.initialize();

    return {
      ok: true,
      snapshot: this.getSnapshot(),
    };
  }

  hasActiveTasks(): boolean {
    return this.tasks.some(
      task =>
        task.status === "running" ||
        task.status === "paused" ||
        task.status === "finishing"
    );
  }

  async startTask(taskIdOrName: string): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task = this.findTaskByIdOrName(taskIdOrName);

    if (!task) {
      return this.createActionResult(false, "Task not found.");
    }

    if (task.status === "running") {
      return this.createActionResult(false, "Task is already running.");
    }

    if (task.status === "paused") {
      return this.resumeTask(task.id);
    }

    const route = routeGraphRuntimeStore.findRouteBetweenBlockIds(
      task.fromBlockId,
      task.toBlockId
    );

    if (!route) {
      return this.createActionResult(false, "No route found between task blocks.");
    }

    const locoAssigned = await this.tryAssignLocoFromStartBlock(task);

    if (!locoAssigned && !task.runtime.locoAddress) {
      const reservation = createPendingLocoReservation(task);
      task.runtime.locoReservation = reservation;
      task.status = "queued";
      this.broadcast?.({
        type: "taskWaitingForLoco",
        data: {
          taskId: task.id,
          taskName: task.name,
        },
      });
      this.broadcastSnapshot();
      return this.createActionResult(false, "No loco assigned to task start block.");
    }

    task.status = "running";
    task.runtime.startedAt = new Date().toISOString();
    task.runtime.completedAt = null;
    task.runtime.error = null;
    task.runtime.route = route;
    task.runtime.simulation = createTrainTaskSimulationStep(task, route);
    task.runtime.locoDirection = getDirectionForBlockTransition(route);

    await this.applyRouteTurnouts(route.turnoutStates);
    await this.startLocoForTask(task);

    this.broadcastSnapshot();
    this.scheduleNextSimulationStep(task.id);

    return this.createActionResult(true);
  }

  async pauseTask(taskIdOrName: string): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task = this.findTaskByIdOrName(taskIdOrName);

    if (!task) return this.createActionResult(false, "Task not found.");
    if (task.status !== "running") return this.createActionResult(false, "Task is not running.");

    this.clearTaskTimer(task.id);
    task.status = "paused";
    await this.stopLocoForTask(task);
    this.broadcastSnapshot();

    return this.createActionResult(true);
  }

  async resumeTask(taskIdOrName: string): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task = this.findTaskByIdOrName(taskIdOrName);

    if (!task) return this.createActionResult(false, "Task not found.");
    if (task.status !== "paused") return this.createActionResult(false, "Task is not paused.");

    task.status = "running";
    await this.startLocoForTask(task);
    this.broadcastSnapshot();
    this.scheduleNextSimulationStep(task.id);

    return this.createActionResult(true);
  }

  async finishTask(taskIdOrName: string): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task = this.findTaskByIdOrName(taskIdOrName);

    if (!task) return this.createActionResult(false, "Task not found.");

    this.clearTaskTimer(task.id);
    await this.stopLocoForTask(task);
    this.releaseTaskLocoReservation(task);
    task.status = "completed";
    task.runtime.completedAt = new Date().toISOString();
    this.broadcastSnapshot();

    return this.createActionResult(true);
  }

  async abortTask(taskIdOrName: string): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task = this.findTaskByIdOrName(taskIdOrName);

    if (!task) return this.createActionResult(false, "Task not found.");

    this.clearTaskTimer(task.id);
    await this.stopLocoForTask(task);
    this.releaseTaskLocoReservation(task);
    task.status = "aborted";
    task.runtime.completedAt = new Date().toISOString();
    this.broadcastSnapshot();

    return this.createActionResult(true);
  }

  async startAllTasks(): Promise<TaskManagerActionResult> {
    await this.initialize();

    for (const task of this.tasks) {
      if (task.status === "queued" || task.status === "aborted" || task.status === "completed") {
        await this.startTask(task.id);
      }
    }

    return this.createActionResult(true);
  }

  async finishAllTasks(): Promise<TaskManagerActionResult> {
    await this.initialize();

    for (const task of this.tasks) {
      if (task.status === "running" || task.status === "paused" || task.status === "finishing") {
        await this.finishTask(task.id);
      }
    }

    return this.createActionResult(true);
  }

  async abortAllTasks(): Promise<TaskManagerActionResult> {
    await this.initialize();

    for (const task of this.tasks) {
      if (task.status === "running" || task.status === "paused" || task.status === "finishing") {
        await this.abortTask(task.id);
      }
    }

    return this.createActionResult(true);
  }

  private scheduleNextSimulationStep(taskId: string): void {
    this.clearTaskTimer(taskId);

    const timer = setTimeout(() => {
      void this.runSimulationStep(taskId);
    }, 500);

    this.runningTimers.set(taskId, timer);
  }

  private clearTaskTimer(taskId: string): void {
    const timer = this.runningTimers.get(taskId);
    if (timer) clearTimeout(timer);
    this.runningTimers.delete(taskId);
  }

  private async runSimulationStep(taskId: string): Promise<void> {
    const task = this.findTask(taskId);

    if (!task || task.status !== "running") {
      return;
    }

    const progress: TrainTaskSimulationProgress = trainSimulatorRuntimeStore.step(task);

    task.runtime.simulation = progress;

    if (progress.completed) {
      await this.finishTask(task.id);
      this.broadcast?.({
        type: "taskCompleted",
        data: {
          taskId: task.id,
          taskName: task.name,
        },
      });
      return;
    }

    this.broadcastSnapshot();
    this.scheduleNextSimulationStep(task.id);
  }

  private async applyRouteTurnouts(turnoutStates: TrainTask["runtime"]["route"]["turnoutStates"]): Promise<void> {
    const commandCenter = this.getCommandCenter?.();
    if (!commandCenter) return;

    for (const turnoutState of turnoutStates) {
      await commandCenter.setTurnout(turnoutState.address, turnoutState.closed);
    }
  }

  private async startLocoForTask(task: TrainTask): Promise<void> {
    const commandCenter = this.getCommandCenter?.();
    if (!commandCenter || !task.runtime.locoAddress) return;

    await commandCenter.setLoco(
      task.runtime.locoAddress,
      task.targetSpeed,
      task.runtime.locoDirection ?? "forward"
    );
  }

  private async stopLocoForTask(task: TrainTask): Promise<void> {
    const commandCenter = this.getCommandCenter?.();
    if (!commandCenter || !task.runtime.locoAddress) return;

    await commandCenter.setLoco(
      task.runtime.locoAddress,
      0,
      task.runtime.locoDirection ?? "forward"
    );
  }

  private releaseTaskLocoReservation(task: TrainTask): void {
    if (task.runtime.locoAddress) {
      locoReservationStore.releaseReservation(
        task.runtime.locoAddress,
        createTaskLocoOwnerId(task.id)
      );
    }

    task.runtime.locoAddress = null;
    task.runtime.locoReservation = null;
  }

  private async tryAssignLocoFromStartBlock(
    task: TrainTask
  ): Promise<boolean> {
    const blockState = this.getBlockState?.(task.fromBlockId) ?? null;

    if (!blockState?.locoId) {
      return false;
    }

    const loco =
      (await readLocos()).find(
        item => item.id === blockState.locoId
      ) ?? null;

    if (!loco) {
      return false;
    }

    const existingReservation =
      locoReservationStore.getReservation(loco.address);

    if (existingReservation && existingReservation.ownerId !== createTaskLocoOwnerId(task.id)) {
      return false;
    }

    const reservation: TaskLocoReservation = {
      locoAddress: loco.address,
      ownerId: createTaskLocoOwnerId(task.id),
      ownerType: "task",
      ownerName: task.name,
      taskId: task.id,
    };

    locoReservationStore.reserve(reservation);
    task.runtime.locoAddress = loco.address;
    task.runtime.locoReservation = reservation;

    return true;
  }
}

export const taskRuntimeStore = new TaskRuntimeStore();
