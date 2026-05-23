
import { readLocos } from "../routes/locoRoutes.js";
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
import { locoReservationStore } from "./locoReservationStore.js";

type BroadcastFn = (
  message: TypedServerWsMessage
) => void;

type ConfigureParams = {
  broadcast: BroadcastFn;
  getBlockState: (
    blockId: string
  ) => BlockState | null;
  getSimulatorCommandCenter: () => CommandCenter | null;
};

type ReservedTaskRoute = {
  fromBlockName: string;
  toBlockName: string;
};

class TaskRuntimeStore {
  private initialized = false;
  private broadcast: BroadcastFn | null = null;

  private getBlockState:
    | ((blockId: string) => BlockState | null)
    | null = null;

  private getSimulatorCommandCenter:
    | (() => CommandCenter | null)
    | null = null;

  private readonly tasks: TrainTask[] = [];
  private readonly savedTasks: SavedTrainTask[] = [];

  private routeCoordinator:
    | TaskRouteRuntimeCoordinator
    | null = null;
  private readonly reservedRoutesByTaskId =
    new Map<string, ReservedTaskRoute>();

  configure(params: ConfigureParams): void {
    this.broadcast = params.broadcast;
    this.getBlockState = params.getBlockState;
    this.getSimulatorCommandCenter =
      params.getSimulatorCommandCenter;


    this.routeCoordinator =
      new TaskRouteRuntimeCoordinator({
        broadcast: params.broadcast,
        getBlockState: params.getBlockState,
        getSimulatorCommandCenter:
          params.getSimulatorCommandCenter,
        updateTaskSimulationProgress: (
          taskId: string,
          progress: TrainTaskSimulationProgress
        ) => {
          return this.updateTaskSimulationProgress(
            taskId,
            progress
          );
        },
      });

    trainSimulatorRuntimeStore.configure({
      getTasks: () => this.tasks.map(cloneTrainTask),
      getBlockState: (blockId: string) =>
        params.getBlockState(blockId),

      tryResolveTaskLoco: (
        taskId: string
      ) => {
        return this.tryResolveTaskLoco(taskId);
      },

      tryPrepareTaskRoute: (
        taskId: string
      ) => {
        return this.tryPrepareTaskRoute(taskId);
      },

      markTaskLeftFromBlock: (
        taskId: string
      ) => {
        return this.markTaskLeftFromBlock(taskId);
      },

      markTaskReachedToBlock: (
        taskId: string
      ) => {
        return this.markTaskReachedToBlock(taskId);
      },

      updateTaskSimulationProgress: (
        taskId: string,
        progress: TrainTaskSimulationProgress
      ) => {
        return this.updateTaskSimulationProgress(
          taskId,
          progress
        );
      },

      getSimulatorCommandCenter:
        params.getSimulatorCommandCenter,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await ensureTaskStorage();

    await this.loadTasksFromDiskInternal();

    this.initialized = true;

    trainSimulatorRuntimeStore.start();
  }

  getSnapshot(): TaskManagerSnapshot {
    return {
      tasks: this.tasks.map(cloneTrainTask),
      overlay: createTaskManagerOverlayState(
        this.tasks
      ),
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

    const targetSpeed = Number(input.targetSpeed);

    if (!Number.isFinite(targetSpeed) || targetSpeed < 0) {
      return this.addError(
        "Adj meg érvényes célsebességet."
      );
    }

    const transition =
      graph
        .getRunnableBlockRoutes()
        .find(item =>
          item.fromBlock.id === input.fromBlockId &&
          item.toBlock.id === input.toBlockId
        );

    if (!transition) {
      return this.addError(
        "A kiválasztott blokkok között nincs automatizálható útvonal."
      );
    }

    const id = createTrainTaskId();
    const name =
      input.name?.trim() ||
      `${transition.fromBlock.name} → ${transition.toBlock.name}`;

    const saved: SavedTrainTask = {
      id,
      name,
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
      task: cloneTrainTask(task),
      snapshot: this.getSnapshot(),
    };
  }

  async updateTask(
    taskId: string,
    input: TrainTaskCreateInput
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task =
      this.findTask(taskId);

    const saved =
      this.savedTasks.find(item => item.id === taskId);

    if (!task || !saved) {
      return this.actionError(
        "A feladat nem található."
      );
    }

    if (
      task.status === "running" ||
      task.status === "paused"
    ) {
      return this.actionError(
        "Futó vagy szüneteltetett feladat nem módosítható."
      );
    }

    const graph =
      routeGraphRuntimeStore.getGraph();

    if (!graph) {
      return this.actionError(
        "Nincs aktív szerveroldali útvonalgráf."
      );
    }

    const targetSpeed =
      Number(input.targetSpeed);

    if (
      !Number.isFinite(targetSpeed) ||
      targetSpeed < 0
    ) {
      return this.actionError(
        "Adj meg érvényes célsebességet."
      );
    }

    if (
      !input.fromBlockId ||
      !input.toBlockId
    ) {
      return this.actionError(
        "Válassz induló és cél blokkot."
      );
    }

    const transition =
      graph
        .getRunnableBlockRoutes()
        .find(item =>
          item.fromBlock.id === input.fromBlockId &&
          item.toBlock.id === input.toBlockId
        );

    if (!transition) {
      return this.actionError(
        "A kiválasztott blokkok között nincs automatizálható útvonal."
      );
    }

    const nextName =
      input.name?.trim() ||
      `${transition.fromBlock.name} → ${transition.toBlock.name}`;

    const routeChanged =
      saved.fromBlockId !== input.fromBlockId ||
      saved.toBlockId !== input.toBlockId;

    const speedChanged =
      saved.targetSpeed !== targetSpeed;

    saved.name = nextName;
    saved.targetSpeed = targetSpeed;
    saved.fromBlockId = input.fromBlockId;
    saved.toBlockId = input.toBlockId;

    task.name = nextName;
    task.targetSpeed = targetSpeed;
    task.fromBlockId = input.fromBlockId;
    task.toBlockId = input.toBlockId;
    task.transition = transition;

    if (routeChanged || speedChanged) {
      task.status = "queued";
      task.runtime = createEmptyTrainTaskRuntimeState();

      delete task.startedAt;
      delete task.abortedAt;
      delete task.completedAt;
      delete task.error;
    }

    await this.persistTasks();
    this.broadcastSnapshot();

    return this.actionOk();
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
      task.status === "paused" ||
      task.status === "finishing"
    ) {
      return this.actionError(
        "Futó, szüneteltetett vagy befejezés alatt álló feladatot előbb abortálj vagy várd meg a végét."
      );
    }

    this.routeCoordinator?.releaseTaskRoute(task.id);
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

    if (task.status === "finishing") {
      return this.actionError(
        "A feladat már befejezés alatt áll."
      );
    }

    if (task.status === "paused") {
      return this.actionError(
        "A feladat szüneteltetett állapotban van. Resume kell, nem Start."
      );
    }

    /**
     * Régi completed / stopped állapotból
     * újra elindítható a folyamatos task.
     */
    if (
      task.status === "aborted" ||
      task.status === "completed"
    ) {
      task.runtime = createEmptyTrainTaskRuntimeState();

      delete task.abortedAt;
      delete task.completedAt;
    }

    task.status = "running";
    task.startedAt = Date.now();
    delete task.error;

    task.runtime.simulation = {
      phase: "waitingForLoco",
      legIndex: 0,
      legCount: 0,
      fromBlockId: task.fromBlockId,
      fromBlockName: task.transition.fromBlock.name,
      toBlockId: null,
      toBlockName: null,
      waitingSensorAddress: null,
    };

    /**
     * Ha már most van mozdony az induló blokkban,
     * azonnal feloldjuk.
     * Ha nincs, akkor running marad,
     * és a simulator tick fogja figyelni.
     */
    const locoResolved =
      await this.tryAssignLocoFromStartBlock(task);

    if (!locoResolved) {
      this.broadcast?.({
        type: "taskWaitingForLoco",
        data: {
          taskId: task.id,
          taskName: task.name,
          blockId: task.fromBlockId,
          messageKey: "task.manager.messages.startedWaitingForLoco",
          message:
            "A task elindult, de az induló blokkban még nincs mozdony. Várakozás...",
        },
      });
    }

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

  async tryResolveTaskLoco(
    taskId: string
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task =
      this.findTask(taskId);

    if (!task) {
      return this.actionError(
        "A feladat nem található."
      );
    }

    if (
      task.status !== "running" &&
      task.status !== "paused"
    ) {
      return this.actionOk();
    }

    if (task.runtime.loco) {
      return this.actionOk();
    }

    const locoResolved =
      await this.tryAssignLocoFromStartBlock(task);

    if (locoResolved) {
      this.broadcastSnapshot();
    }

    return this.actionOk();
  }

  async tryPrepareTaskRoute(
    taskId: string
  ): Promise<boolean> {
    await this.initialize();

    const task =
      this.findTask(taskId);

    if (!task) {
      return false;
    }

    return (
      await this.routeCoordinator
        ?.tryPrepareTaskRoute(task)
    ) ?? false;
  }

  async updateTaskSimulationProgress(
    taskId: string,
    progress: TrainTaskSimulationProgress
  ): Promise<TaskManagerActionResult> {
    await this.initialize();

    const task =
      this.findTask(taskId);

    if (!task) {
      return this.actionError(
        "A feladat nem található."
      );
    }

    const previous =
      task.runtime.simulation;

    const changed =
      previous.phase !== progress.phase ||
      previous.legIndex !== progress.legIndex ||
      previous.legCount !== progress.legCount ||
      previous.fromBlockId !== progress.fromBlockId ||
      previous.fromBlockName !== progress.fromBlockName ||
      previous.toBlockId !== progress.toBlockId ||
      previous.toBlockName !== progress.toBlockName ||
      (previous.waitingSensorAddress ?? null) !==
      (progress.waitingSensorAddress ?? null);

    if (!changed) {
      return this.actionOk();
    }

    task.runtime.simulation = {
      ...progress,
      waitingSensorAddress:
        progress.waitingSensorAddress ?? null,
    };

    this.broadcastSnapshot();

    return this.actionOk();
  }

  async startAllTasks(): Promise<TaskManagerActionResult> {
    await this.initialize();

    for (const task of this.tasks) {
      if (
        task.status === "queued" ||
        task.status === "aborted" ||
        task.status === "completed"
      ) {
        await this.startTask(task.id);
        continue;
      }

      if (task.status === "paused") {
        await this.resumeTask(task.id);
      }
    }

    this.broadcastSnapshot();

    return this.actionOk();
  }


  async finishTask(
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

    if (task.status === "completed") {
      return this.actionError(
        "A feladat már befejeződött."
      );
    }

    if (task.status === "aborted") {
      return this.actionError(
        "A megszakított feladatot Starttal tudod újraindítani."
      );
    }

    if (task.status === "finishing") {
      return this.actionError(
        "A feladat már befejezés alatt áll."
      );
    }

    if (
      task.status !== "running" &&
      task.status !== "paused"
    ) {
      return this.actionError(
        "Csak futó vagy szüneteltetett feladat kérhető befejezésre."
      );
    }

    /**
     * Ha a task még nem foglalt útvonalat és a mozdony sem hagyta el
     * az induló blokkot, akkor nincs aktív ciklus, amit kulturáltan
     * végig kellene futtatni. Ilyenkor azonnal completed lesz.
     */
    const hasActiveCycle =
      (this.routeCoordinator?.hasReservedRoute(task.id) ?? false) ||
      task.runtime.hasLeftFromBlock ||
      task.runtime.inTransit ||
      task.runtime.simulation.phase === "departing" ||
      task.runtime.simulation.phase === "transit" ||
      task.runtime.simulation.phase === "waitingForBlockSensor";

    if (!hasActiveCycle) {
      task.status = "completed";
      task.completedAt = Date.now();
      task.runtime.inTransit = false;
      task.runtime.simulation = {
        phase: "idle",
        legIndex: 0,
        legCount: 0,
        fromBlockId: null,
        fromBlockName: null,
        toBlockId: null,
        toBlockName: null,
        waitingSensorAddress: null,
      };

      this.routeCoordinator?.releaseTaskRoute(task.id);
      this.releaseTaskLoco(task);

      this.broadcast?.({
        type: "taskCompleted",
        data: {
          taskId: task.id,
          taskName: task.name,
          fromBlockId: task.fromBlockId,
          toBlockId: task.toBlockId,
          completedAt: task.completedAt,
          messageKey: "task.manager.messages.completedWithoutActiveRun",
          message:
            "A task aktív menet nélkül befejezve.",
        },
      });

      this.broadcastSnapshot();
      return this.actionOk();
    }

    /**
     * Aktív ciklus van: a simulator még végigviszi a mozdonyt
     * a célblokkig, ott a markTaskReachedToBlock completed állapotba teszi.
     */
    task.status = "finishing";
    delete task.error;

    this.broadcastSnapshot();

    return this.actionOk();
  }
  async abortTask(
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

    if (task.status === "aborted") {
      return this.actionError(
        "A feladat már meg van szakítva."
      );
    }

    if (task.status === "completed") {
      return this.actionError(
        "A befejezett feladatot már nem kell abortálni."
      );
    }

    await this.stopTaskLoco(task);


    this.parkTaskLocoInKnownBlock(task);



    task.status = "aborted";
    task.abortedAt = Date.now();
    task.runtime.inTransit = false;
    task.runtime.simulation = {
      phase: "idle",
      legIndex: 0,
      legCount: 0,
      fromBlockId: null,
      fromBlockName: null,
      toBlockId: null,
      toBlockName: null,
      waitingSensorAddress: null,
    };

    this.routeCoordinator?.releaseTaskRoute(task.id);
    this.releaseTaskLoco(task);
    this.broadcastSnapshot();

    return this.actionOk();
  }

  async finishAllTasks(): Promise<TaskManagerActionResult> {
    await this.initialize();

    for (const task of this.tasks) {
      if (
        task.status === "running" ||
        task.status === "paused"
      ) {
        await this.finishTask(task.id);
      }
    }

    this.broadcastSnapshot();

    return this.actionOk();
  }
  async abortAllTasks(): Promise<TaskManagerActionResult> {
    await this.initialize();

    for (const task of this.tasks) {
      if (
        task.status === "running" ||
        task.status === "paused" ||
        task.status === "finishing"
      ) {
        await this.abortTask(task.id);
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
    task.completedAt = Date.now();

    /**
     * A célblokk elérésével a foglalás megszűnik,
     * és a kliensről is eltűnik a lefoglalt route színezés.
     */
    this.routeCoordinator?.releaseTaskRoute(task.id);

    /**
     * Finish módban a task nem indul új ciklusba,
     * hanem valódi completed végállapotot kap.
     */
    if (task.status === "finishing") {
      task.status = "completed";

      this.releaseTaskLoco(task);

      this.broadcast?.({
        type: "taskCompleted",
        data: {
          taskId: task.id,
          taskName: task.name,
          fromBlockId: task.fromBlockId,
          toBlockId: task.toBlockId,
          completedAt: task.completedAt,
          messageKey: "task.manager.messages.finishedInDestinationBlock",
          message:
            "A task a célblokkban befejeződött.",
        },
      });

      this.broadcastSnapshot();

      return this.actionOk();
    }

    /**
     * Normál running tasknál a ciklus lefutott,
     * de maga a task továbbra is él és újra várakozik.
     */
    this.broadcast?.({
      type: "taskCycleCompleted",
      data: {
        taskId: task.id,
        taskName: task.name,
        fromBlockId: task.fromBlockId,
        toBlockId: task.toBlockId,
        completedAt: task.completedAt,
        messageKey: "task.manager.messages.cycleCompletedWaitingForLoco",
        message:
          "A task ciklusa lefutott, újra várakozik az induló blokk mozdonyára.",
      },
    });

    this.releaseTaskLoco(task);
    task.runtime = createEmptyTrainTaskRuntimeState();

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

    const rawSavedTasks =
      await readSavedTrainTaskEntries();

    const loadedTasks: TrainTask[] = [];
    const normalizedSavedTasks: SavedTrainTask[] = [];
    const warnings: string[] = [];

    const transitions =
      graph.getRunnableBlockRoutes();

    for (const rawItem of Array.isArray(rawSavedTasks) ? rawSavedTasks : []) {
      const saved = normalizeSavedTrainTask(rawItem);

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
      targetSpeed: saved.targetSpeed,
      fromBlockId: saved.fromBlockId,
      toBlockId: saved.toBlockId,
      transition,
      status: "queued",
      createdAt: saved.createdAt,
      runtime: createEmptyTrainTaskRuntimeState(),
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

  private async tryAssignLocoFromStartBlock(
    task: TrainTask
  ): Promise<boolean> {
    const blockState =
      this.getBlockState?.(
        task.fromBlockId
      ) ?? null;

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

    if (
      existingReservation &&
      existingReservation.ownerId !== task.id
    ) {
      await this.updateTaskSimulationProgress(
        task.id,
        {
          phase: "waitingForLoco",
          legIndex: 0,
          legCount: 0,
          fromBlockId: task.fromBlockId,
          fromBlockName: task.transition.fromBlock.name,
          toBlockId: null,
          toBlockName: null,
          waitingSensorAddress: null,
        }
      );

      return false;
    }

    const reservation =
      locoReservationStore.reserve({
        locoAddress: loco.address,
        ownerId: task.id,
        ownerType: "task",
        ownerName: task.name,
        reason: "Task is controlling this locomotive",
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

    return true;
  }

  private findFirstOccupiedRouteBlock(
    task: TrainTask
  ): {
    blockId: string;
    blockName: string;
    sensorAddress: number | null;
  } | null {
    const ownLocoId =
      task.runtime.loco?.id ?? null;

    for (const item of task.transition.solution.path) {
      if (item.type !== "block") {
        continue;
      }

      /**
       * Az induló blokkban a saját mozdony áll.
       * Ez nem akadály, ettől még a route indulhat.
       */
      if (item.block.id === task.fromBlockId) {
        continue;
      }

      const blockState =
        this.getBlockState?.(item.block.id) ?? null;

      const occupyingLocoId =
        blockState?.locoId ?? null;

      if (
        occupyingLocoId !== null &&
        occupyingLocoId !== ownLocoId
      ) {
        const block =
          railwayTopologyStore
            .getTopology()
            ?.getBlocks()
            .find(topologyBlock =>
              topologyBlock.id === item.block.id
            );

        const rawSensorAddress =
          block?.sensorAddress ?? 0;

        return {
          blockId: item.block.id,
          blockName: item.block.name,
          sensorAddress:
            Number.isFinite(rawSensorAddress) &&
              rawSensorAddress > 0
              ? rawSensorAddress
              : null,
        };
      }
    }

    return null;
  }

  private async markTaskWaitingForRouteBlockSensor(
    task: TrainTask,
    blockedBlock: {
      blockId: string;
      blockName: string;
      sensorAddress: number | null;
    }
  ): Promise<void> {
    await this.updateTaskSimulationProgress(
      task.id,
      {
        phase: "waitingForBlockSensor",
        legIndex: 0,
        legCount: 0,
        fromBlockId: task.fromBlockId,
        fromBlockName: task.transition.fromBlock.name,
        toBlockId: blockedBlock.blockId,
        toBlockName: blockedBlock.blockName,
        waitingSensorAddress:
          blockedBlock.sensorAddress,
      }
    );
  }
  private async markTaskWaitingForRoute(
    task: TrainTask
  ): Promise<void> {
    await this.updateTaskSimulationProgress(
      task.id,
      {
        phase: "waitingForRoute",
        legIndex: 0,
        legCount: 0,
        fromBlockId: task.fromBlockId,
        fromBlockName: task.transition.fromBlock.name,
        toBlockId: task.toBlockId,
        toBlockName: task.transition.toBlock.name,
        waitingSensorAddress: null,
      }
    );
  }
  private async stopTaskLoco(
    task: TrainTask
  ): Promise<void> {
    const locoAddress =
      task.runtime.loco?.address ?? null;

    if (locoAddress === null) {
      return;
    }

    const commandCenter =
      this.getSimulatorCommandCenter?.() ?? null;

    if (!commandCenter) {
      return;
    }

    const direction =
      commandCenter.getLocoInfo(locoAddress)?.direction ??
      "forward";

    try {
      await commandCenter.setLoco(
        locoAddress,
        0,
        direction
      );
    } catch (error) {
      console.warn(
        `[TaskRuntimeStore] Failed to stop loco #${locoAddress} while stopping task:`,
        error
      );
    }
  }

  private parkTaskLocoInKnownBlock(
    task: TrainTask
  ): void {
    const locoId =
      task.runtime.loco?.id ?? null;

    if (!locoId) {
      return;
    }

    const commandCenter =
      this.getSimulatorCommandCenter?.() ?? null;

    if (!commandCenter) {
      return;
    }

    const topology =
      railwayTopologyStore.getTopology();

    const blocks =
      topology?.getBlocks() ?? [];

    for (const block of blocks) {
      const blockState =
        this.getBlockState?.(block.id) ?? null;

      if (blockState?.locoId === locoId) {
        return;
      }
    }

    const simulation =
      task.runtime.simulation;

    const fallbackBlockId =
      simulation.fromBlockId ??
      task.fromBlockId;

    if (!fallbackBlockId) {
      return;
    }

    commandCenter.setBlock({
      blockId: fallbackBlockId,
      locoId,
    });
  }



  private releaseTaskRoute(
    taskId: string
  ): void {
    const reservedRoute =
      this.reservedRoutesByTaskId.get(taskId);

    if (!reservedRoute) {
      return;
    }

    const result =
      routeGraphRuntimeStore.releaseRouteReservation(
        reservedRoute.fromBlockName,
        reservedRoute.toBlockName
      );

    this.reservedRoutesByTaskId.delete(taskId);

    if (!result.ok) {
      console.warn(
        `[TaskRuntimeStore] Task route release failed for ${reservedRoute.fromBlockName} → ${reservedRoute.toBlockName}: ${result.error}`
      );

      return;
    }

    /**
     * Ettől tűnik el a foglaltsági színezés a kliensen.
     */
    this.broadcast?.({
      type: "routeReservationChanged",
      data: {
        busy: false,
        sectionNames:
          result.releasedSectionNames,
        elementIds:
          routeGraphRuntimeStore.getElementIdsForSections(
            result.releasedSectionNames
          ),
        turnoutAddresses:
          result.releasedTurnoutAddresses,
        fromBlockName:
          reservedRoute.fromBlockName,
        toBlockName:
          reservedRoute.toBlockName,
      },
    });
  }

  private async persistTasks(): Promise<void> {
    await writeSavedTrainTasks(
      this.savedTasks
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
  private broadcastSyncedLocoState(
    locoAddress: number
  ): void {
    const commandCenter =
      this.getSimulatorCommandCenter?.() ?? null;

    const loco =
      commandCenter?.getLocoInfo(locoAddress);

    if (!loco) {
      return;
    }

    this.broadcast?.({
      type: "locoState",
      data: {
        loco,
      },
    });
  }
  private releaseTaskLoco(task: TrainTask): void {
    const releasedAddresses =
      new Set<number>();

    const locoAddress =
      task.runtime.loco?.address ?? null;

    if (locoAddress !== null) {
      try {
        locoReservationStore.release(
          locoAddress,
          task.id
        );

        releasedAddresses.add(locoAddress);
      } catch (error) {
        console.warn(
          `[TaskRuntimeStore] Task loco release failed for #${locoAddress}:`,
          error
        );
      }
    }

    /**
     * Biztonsági takarítás:
     * ha a task.runtime.loco már null, de a foglalás ownerId alapján
     * még bent maradt, akkor is engedjük el.
     */
    for (const released of locoReservationStore.releaseByOwner(task.id)) {
      releasedAddresses.add(released.locoAddress);
    }

    for (const releasedAddress of releasedAddresses) {
      this.broadcast?.({
        type: "locoReservationChanged",
        data: {
          locoAddress: releasedAddress,
          reservation: null,
        },
      });

      /**
       * A LocoPanel a LocoState.reservation mezőből dolgozik.
       * Release után ezért kötelező friss locoState is.
       */
      this.broadcastSyncedLocoState(releasedAddress);
    }

    task.runtime.loco = null;
  }


  hasActiveTasks(): boolean {
    return this.tasks.some(task =>
      task.status === "running" ||
      task.status === "paused" ||
      task.status === "finishing"
    );
  }

}


export const taskRuntimeStore =
  new TaskRuntimeStore();
