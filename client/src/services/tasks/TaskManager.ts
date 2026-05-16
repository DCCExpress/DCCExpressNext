import { loadJsonFile, saveJsonFile } from "../../api/fileApi";
import { BlockElement } from "../../models/editor/elements/BlockElement";
import { layoutStore } from "../layoutStore";
import { locoStore } from "../locoStore";
import { routeGraphStore } from "../routeGraphStore";

import type {
    AddTrainTaskResult,
    LoadTrainTasksResult,
    SavedTrainTask,
    TaskManagerActionResult,
    TaskManagerOverlayState,
    TaskManagerSnapshot,
    TrainTask,
    TrainTaskCreateInput,
} from "./TaskTypes";


type TaskManagerListener = () => void;

export class TaskManager {
    private readonly tasks: TrainTask[] = [];
    private readonly listeners = new Set<TaskManagerListener>();
    private readonly tasksFileName = "tasks.json";
    private initialTasksLoadStarted = false;
    private initialTasksLoadFinished = false;

    constructor() {
        routeGraphStore.subscribe(() => {
            this.emitChange();

            void this.tryAutoLoadTasksWhenGraphReady();
        });

        layoutStore.subscribe(() => {
            this.emitChange();
        });

        void this.tryAutoLoadTasksWhenGraphReady();
    }

    // ============================================================
    // SUBSCRIBE / SNAPSHOT
    // ============================================================

    subscribe(listener: TaskManagerListener): () => void {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    }

    getSnapshot(): TaskManagerSnapshot {
        return {
            tasks: [...this.tasks],
            overlay: this.createOverlayState(),

            hasGraph: routeGraphStore.getGraph() !== null,
            hasLayout: layoutStore.getLayout() !== null,
        };
    }

    private emitChange(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }

    // ============================================================
    // TASK CREATE / REMOVE
    // ============================================================

    addTask(input: TrainTaskCreateInput): AddTrainTaskResult {
        const graph = routeGraphStore.getGraph();

        if (!graph) {
            return {
                ok: false,
                error: "Nincs aktív útvonalgráf.",
            };
        }

        const transition = graph
            .getRunnableBlockTransitions()
            .find(item =>
                item.fromBlock.id === input.fromBlockId &&
                item.toBlock.id === input.toBlockId
            );

        if (!transition) {
            return {
                ok: false,
                error:
                    "A kiválasztott blokkok között nincs közvetlenül automatizálható útvonal.",
            };
        }

        const task: TrainTask = {
            id: this.createTaskId(),

            name:
                input.name?.trim() ||
                `${transition.fromBlock.name} → ${transition.toBlock.name}`,


            targetSpeed: input.targetSpeed,

            fromBlockId: input.fromBlockId,
            toBlockId: input.toBlockId,

            transition,

            status: "queued",

            createdAt: Date.now(),

            runtime: {
                loco: null,
                hasLeftFromBlock: false,
                hasReachedToBlock: false,
                inTransit: false,

            },
        };

        this.tasks.push(task);
        this.emitChange();

        return {
            ok: true,
            task,
        };
    }

    removeTask(taskId: string): TaskManagerActionResult {
        const index = this.tasks.findIndex(task => task.id === taskId);

        if (index === -1) {
            return {
                ok: false,
                error: "A feladat nem található.",
            };
        }

        const task = this.tasks[index]!;

        if (task.status === "running" || task.status === "paused") {
            return {
                ok: false,
                error:
                    "Futó vagy szüneteltetett feladatot előbb állíts le.",
            };
        }

        this.tasks.splice(index, 1);
        this.emitChange();

        return {
            ok: true,
        };
    }

    // ============================================================
    // TASK CONTROL
    // ============================================================

    startTask(taskId: string): TaskManagerActionResult {
        const task = this.findTask(taskId);

        if (!task) {
            return {
                ok: false,
                error: "A feladat nem található.",
            };
        }

        const loco = this.resolveLocoFromStartBlock(task);

        if (!loco) {
            return {
                ok: false,
                error:
                    "Az induló blokkban nincs azonosított mozdony, ezért a feladat nem indítható.",
            };
        }

        task.runtime.loco = loco;

        if (task.status === "running") {
            return {
                ok: false,
                error: "A feladat már fut.",
            };
        }

        if (task.status === "paused") {
            return {
                ok: false,
                error:
                    "A feladat szüneteltetett állapotban van. Resume kell, nem Start.",
            };
        }

        if (task.status === "completed") {
            return {
                ok: false,
                error: "A feladat már befejeződött.",
            };
        }


        if (task.status === "stopped") {
            task.runtime = {
                loco: null,
                hasLeftFromBlock: false,
                hasReachedToBlock: false,
                inTransit: false,
            };

            delete task.stoppedAt;
            delete task.completedAt;
        }
        task.status = "running";
        task.startedAt = Date.now();

        this.emitChange();

        return {
            ok: true,
        };
    }

    pauseTask(taskId: string): TaskManagerActionResult {
        const task = this.findTask(taskId);

        if (!task) {
            return {
                ok: false,
                error: "A feladat nem található.",
            };
        }

        if (task.status !== "running") {
            return {
                ok: false,
                error: "Csak futó feladat szüneteltethető.",
            };
        }

        task.status = "paused";

        this.emitChange();

        return {
            ok: true,
        };
    }

    resumeTask(taskId: string): TaskManagerActionResult {
        const task = this.findTask(taskId);

        if (!task) {
            return {
                ok: false,
                error: "A feladat nem található.",
            };
        }

        if (task.status !== "paused") {
            return {
                ok: false,
                error: "Csak szüneteltetett feladat folytatható.",
            };
        }

        task.status = "running";

        this.emitChange();

        return {
            ok: true,
        };
    }

    stopTask(taskId: string): TaskManagerActionResult {
        const task = this.findTask(taskId);

        if (!task) {
            return {
                ok: false,
                error: "A feladat nem található.",
            };
        }

        if (task.status === "stopped") {
            return {
                ok: false,
                error: "A feladat már le van állítva.",
            };
        }

        if (task.status === "completed") {
            return {
                ok: false,
                error: "A befejezett feladatot már nem kell leállítani.",
            };
        }

        task.status = "stopped";
        task.stoppedAt = Date.now();

        task.runtime.inTransit = false;

        this.emitChange();

        return {
            ok: true,
        };
    }

    // ============================================================
    // SENSOR TRACKING - KÉSŐBB ERRE KÖTJÜK RÁ A WS SENSOR EVENTET
    // ============================================================

    /**
     * Akkor hívjuk majd, amikor a vonat
     * lemegy az induló blokk foglaltsági szenzoráról.
     */
    markTaskLeftFromBlock(taskId: string): TaskManagerActionResult {
        const task = this.findTask(taskId);

        if (!task) {
            return {
                ok: false,
                error: "A feladat nem található.",
            };
        }

        task.runtime.hasLeftFromBlock = true;
        task.runtime.inTransit = true;

        this.emitChange();

        return {
            ok: true,
        };
    }

    /**
     * Akkor hívjuk majd, amikor a célblokk
     * foglaltsági szenzora aktív lesz.
     */
    markTaskReachedToBlock(taskId: string): TaskManagerActionResult {
        const task = this.findTask(taskId);

        if (!task) {
            return {
                ok: false,
                error: "A feladat nem található.",
            };
        }

        task.runtime.hasReachedToBlock = true;
        task.runtime.inTransit = false;

        task.status = "completed";
        task.completedAt = Date.now();

        this.emitChange();

        return {
            ok: true,
        };
    }

    // ============================================================
    // OVERLAY - TRACKCANVAS MAJD EBBŐL RAJZOL
    // ============================================================

    private createOverlayState(): TaskManagerOverlayState {
        const activeTasks = this.tasks.filter(task =>
            task.status === "running" || task.status === "paused"
        );

        const reservedSectionNames = new Set<string>();
        const transitSectionNames = new Set<string>();
        const activeBlockIds = new Set<string>();
        const activeTurnoutAddresses = new Set<number>();

        for (const task of activeTasks) {
            const solution = task.transition.solution;

            for (const node of solution.nodes) {
                reservedSectionNames.add(node.name);

                if (task.runtime.inTransit) {
                    transitSectionNames.add(node.name);
                }
            }

            activeBlockIds.add(task.fromBlockId);
            activeBlockIds.add(task.toBlockId);

            for (const turnoutState of solution.turnoutStates) {
                activeTurnoutAddresses.add(turnoutState.address);
            }
        }

        return {
            reservedSectionNames: [...reservedSectionNames],
            transitSectionNames: [...transitSectionNames],
            activeBlockIds: [...activeBlockIds],
            activeTurnoutAddresses: [...activeTurnoutAddresses],
        };
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private findTask(taskId: string): TrainTask | undefined {
        return this.tasks.find(task => task.id === taskId);
    }

    private createTaskId(): string {
        return `task-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 10)}`;
    }
    private resolveLocoFromStartBlock(task: TrainTask) {
        const layout = layoutStore.getLayout();

        if (!layout) {
            return null;
        }

        const element = layout.getElementById(task.fromBlockId);

        if (!(element instanceof BlockElement)) {
            return null;
        }

        if (element.locoAddress <= 0) {
            return null;
        }

        return locoStore.findByAddress(element.locoAddress);
    }
    // =========================================
    // JSON
    // =========================================
    async saveTasks(): Promise<TaskManagerActionResult> {
        try {
            const savedTasks: SavedTrainTask[] = this.tasks.map(task => ({
                id: task.id,
                name: task.name,


                targetSpeed: task.targetSpeed,

                fromBlockId: task.fromBlockId,
                toBlockId: task.toBlockId,

                createdAt: task.createdAt,
            }));

            await saveJsonFile(this.tasksFileName, savedTasks);

            return {
                ok: true,
            };
        } catch (error) {
            return {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Nem sikerült elmenteni a feladatokat.",
            };
        }
    }

    async loadTasks(): Promise<LoadTrainTasksResult> {
        const graph = routeGraphStore.getGraph();

        if (!graph) {
            return {
                ok: false,
                error:
                    "A feladatok visszatöltéséhez előbb szükség van az útvonalgráfra.",
            };
        }

        try {
            const savedTasks =
                await loadJsonFile<SavedTrainTask[]>(this.tasksFileName);

            if (!Array.isArray(savedTasks)) {
                return {
                    ok: false,
                    error: "A tasks.json tartalma nem feladat tömb.",
                };
            }

            const transitions = graph.getRunnableBlockTransitions();

            const loadedTasks: TrainTask[] = [];
            const warnings: string[] = [];

            for (const savedTask of savedTasks) {
                const transition = transitions.find(item =>
                    item.fromBlock.id === savedTask.fromBlockId &&
                    item.toBlock.id === savedTask.toBlockId
                );

                if (!transition) {
                    warnings.push(
                        `Kihagyva: ${savedTask.name} — az útvonal már nem található vagy nem automatizálható.`
                    );
                    continue;
                }

                loadedTasks.push({
                    id: savedTask.id,
                    name: savedTask.name,


                    targetSpeed: savedTask.targetSpeed,

                    fromBlockId: savedTask.fromBlockId,
                    toBlockId: savedTask.toBlockId,

                    transition,

                    status: "queued",

                    createdAt: savedTask.createdAt,

                    runtime: {
                        loco: null,
                        hasLeftFromBlock: false,
                        hasReachedToBlock: false,
                        inTransit: false,
                    },
                });
            }

            this.tasks.splice(0, this.tasks.length, ...loadedTasks);
            this.emitChange();

            return {
                ok: true,
                loadedCount: loadedTasks.length,
                skippedCount: warnings.length,
                warnings,
            };
        } catch (error) {
            return {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Nem sikerült betölteni a feladatokat.",
            };
        }
    }

    private async tryAutoLoadTasksWhenGraphReady(): Promise<void> {
        if (this.initialTasksLoadStarted || this.initialTasksLoadFinished) {
            return;
        }

        const graph = routeGraphStore.getGraph();

        if (!graph) {
            return;
        }

        /**
         * FONTOS:
         * A routeGraphStore induláskor kaphat olyan korai / üres gráfot,
         * amely még nem a ténylegesen betöltött layoutból készült.
         *
         * Taskokat csak akkor töltünk vissza automatikusan,
         * ha már létezik legalább egy automatizálható blokkátmenet.
         */
        const runnableTransitions = graph.getRunnableBlockTransitions();

        if (runnableTransitions.length === 0) {
            console.info(
                "[TaskManager] Graph exists, but has no runnable block transitions yet. Automatic task load deferred."
            );
            return;
        }

        this.initialTasksLoadStarted = true;

        const result = await this.loadTasks();

        if (!result.ok) {
            console.info(
                "[TaskManager] Automatic task load skipped:",
                result.error
            );
        } else {
            console.log("[TaskManager] Tasks automatically loaded:", {
                loaded: result.loadedCount,
                skipped: result.skippedCount,
                warnings: result.warnings,
            });
        }

        this.initialTasksLoadFinished = true;
        this.emitChange();
    }
}