import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { dataDir } from "../paths.js";
import { readLocos } from "../routes/locoRoutes.js";
import { routeGraphRuntimeStore } from "./routeGraphRuntimeStore.js";
import { railwayTopologyStore } from "./railwayTopologyStore.js";
class TaskRuntimeStore {
    initialized = false;
    broadcast = null;
    getBlockState = null;
    tasks = [];
    savedTasks = [];
    tasksFilePath = path.resolve(dataDir, "tasks.json");
    configure(params) {
        this.broadcast = params.broadcast;
        this.getBlockState = params.getBlockState;
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        await fs.mkdir(path.dirname(this.tasksFilePath), { recursive: true });
        await this.loadTasksFromDiskInternal();
        this.initialized = true;
    }
    getSnapshot() {
        return {
            tasks: this.tasks.map(cloneTask),
            overlay: this.createOverlayState(),
            hasGraph: routeGraphRuntimeStore.hasGraph(),
            hasLayout: railwayTopologyStore.getTopology() !== null,
        };
    }
    async addTask(input) {
        await this.initialize();
        const graph = routeGraphRuntimeStore.getGraph();
        if (!graph) {
            return this.addError("Nincs aktív szerveroldali útvonalgráf.");
        }
        const targetSpeed = Number(input.targetSpeed);
        if (!Number.isFinite(targetSpeed) || targetSpeed < 0) {
            return this.addError("Adj meg érvényes célsebességet.");
        }
        const transition = graph
            .getRunnableBlockTransitions()
            .find(item => item.fromBlock.id === input.fromBlockId &&
            item.toBlock.id === input.toBlockId);
        if (!transition) {
            return this.addError("A kiválasztott blokkok között nincs közvetlenül automatizálható útvonal.");
        }
        const id = this.createTaskId();
        const name = input.name?.trim() ||
            `${transition.fromBlock.name} → ${transition.toBlock.name}`;
        const saved = {
            id,
            name,
            targetSpeed,
            fromBlockId: input.fromBlockId,
            toBlockId: input.toBlockId,
            createdAt: Date.now(),
        };
        const task = this.createRuntimeTask(saved, transition);
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
    async updateTask(taskId, input) {
        await this.initialize();
        const task = this.findTask(taskId);
        const saved = this.savedTasks.find(item => item.id === taskId);
        if (!task || !saved) {
            return this.actionError("A feladat nem található.");
        }
        if (task.status === "running" ||
            task.status === "paused") {
            return this.actionError("Futó vagy szüneteltetett feladat nem módosítható.");
        }
        const graph = routeGraphRuntimeStore.getGraph();
        if (!graph) {
            return this.actionError("Nincs aktív szerveroldali útvonalgráf.");
        }
        const targetSpeed = Number(input.targetSpeed);
        if (!Number.isFinite(targetSpeed) ||
            targetSpeed < 0) {
            return this.actionError("Adj meg érvényes célsebességet.");
        }
        if (!input.fromBlockId ||
            !input.toBlockId) {
            return this.actionError("Válassz induló és cél blokkot.");
        }
        const transition = graph
            .getRunnableBlockTransitions()
            .find(item => item.fromBlock.id === input.fromBlockId &&
            item.toBlock.id === input.toBlockId);
        if (!transition) {
            return this.actionError("A kiválasztott blokkok között nincs közvetlenül automatizálható útvonal.");
        }
        const nextName = input.name?.trim() ||
            `${transition.fromBlock.name} → ${transition.toBlock.name}`;
        const routeChanged = saved.fromBlockId !== input.fromBlockId ||
            saved.toBlockId !== input.toBlockId;
        const speedChanged = saved.targetSpeed !== targetSpeed;
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
            task.runtime = this.createRuntimeState();
            delete task.startedAt;
            delete task.stoppedAt;
            delete task.completedAt;
            delete task.error;
        }
        await this.persistTasks();
        this.broadcastSnapshot();
        return this.actionOk();
    }
    async removeTask(taskId) {
        await this.initialize();
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        if (taskIndex < 0) {
            return this.actionError("A feladat nem található.");
        }
        const task = this.tasks[taskIndex];
        if (task.status === "running" ||
            task.status === "paused") {
            return this.actionError("Futó vagy szüneteltetett feladatot előbb állíts le.");
        }
        this.tasks.splice(taskIndex, 1);
        const savedIndex = this.savedTasks.findIndex(item => item.id === taskId);
        if (savedIndex >= 0) {
            this.savedTasks.splice(savedIndex, 1);
        }
        await this.persistTasks();
        this.broadcastSnapshot();
        return this.actionOk();
    }
    async startTask(taskIdOrName) {
        await this.initialize();
        const task = this.findTask(taskIdOrName);
        if (!task) {
            return this.actionError("A feladat nem található.");
        }
        if (task.status === "running") {
            return this.actionError("A feladat már fut.");
        }
        if (task.status === "paused") {
            return this.actionError("A feladat szüneteltetett állapotban van. Resume kell, nem Start.");
        }
        if (task.status === "completed") {
            return this.actionError("A feladat már befejeződött.");
        }
        const blockState = this.getBlockState?.(task.fromBlockId) ?? null;
        if (!blockState?.locoId) {
            return this.actionError("Az induló blokkban nincs mozdony, ezért a feladat nem indítható.");
        }
        const loco = (await readLocos()).find(item => item.id === blockState.locoId) ?? null;
        if (!loco) {
            return this.actionError(`Az induló blokkhoz rendelt mozdony nem található: ${blockState.locoId}.`);
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
    async pauseTask(taskIdOrName) {
        await this.initialize();
        const task = this.findTask(taskIdOrName);
        if (!task) {
            return this.actionError("A feladat nem található.");
        }
        if (task.status !== "running") {
            return this.actionError("Csak futó feladat szüneteltethető.");
        }
        task.status = "paused";
        this.broadcastSnapshot();
        return this.actionOk();
    }
    async resumeTask(taskIdOrName) {
        await this.initialize();
        const task = this.findTask(taskIdOrName);
        if (!task) {
            return this.actionError("A feladat nem található.");
        }
        if (task.status !== "paused") {
            return this.actionError("Csak szüneteltetett feladat folytatható.");
        }
        task.status = "running";
        this.broadcastSnapshot();
        return this.actionOk();
    }
    async stopTask(taskIdOrName) {
        await this.initialize();
        const task = this.findTask(taskIdOrName);
        if (!task) {
            return this.actionError("A feladat nem található.");
        }
        if (task.status === "stopped") {
            return this.actionError("A feladat már le van állítva.");
        }
        if (task.status === "completed") {
            return this.actionError("A befejezett feladatot már nem kell leállítani.");
        }
        task.status = "stopped";
        task.stoppedAt = Date.now();
        task.runtime.inTransit = false;
        this.broadcastSnapshot();
        return this.actionOk();
    }
    async stopAllTasks() {
        await this.initialize();
        for (const task of this.tasks) {
            if (task.status === "running" ||
                task.status === "paused") {
                task.status = "stopped";
                task.stoppedAt = Date.now();
                task.runtime.inTransit = false;
            }
        }
        this.broadcastSnapshot();
        return this.actionOk();
    }
    async markTaskLeftFromBlock(taskId) {
        await this.initialize();
        const task = this.findTask(taskId);
        if (!task) {
            return this.actionError("A feladat nem található.");
        }
        task.runtime.hasLeftFromBlock = true;
        task.runtime.inTransit = true;
        this.broadcastSnapshot();
        return this.actionOk();
    }
    async markTaskReachedToBlock(taskId) {
        await this.initialize();
        const task = this.findTask(taskId);
        if (!task) {
            return this.actionError("A feladat nem található.");
        }
        task.runtime.hasReachedToBlock = true;
        task.runtime.inTransit = false;
        task.status = "completed";
        task.completedAt = Date.now();
        this.broadcastSnapshot();
        return this.actionOk();
    }
    async saveTasks() {
        await this.initialize();
        await this.persistTasks();
        return this.actionOk();
    }
    async reloadTasks() {
        await this.initialize();
        const result = await this.loadTasksFromDiskInternal();
        this.broadcastSnapshot();
        return result;
    }
    async loadTasksFromDiskInternal() {
        const graph = routeGraphRuntimeStore.getGraph();
        if (!graph) {
            this.tasks.splice(0, this.tasks.length);
            this.savedTasks.splice(0, this.savedTasks.length);
            return {
                ok: false,
                error: "A feladatok visszatöltéséhez előbb szükség van az útvonalgráfra.",
                snapshot: this.getSnapshot(),
            };
        }
        let rawSavedTasks = [];
        try {
            const raw = await fs.readFile(this.tasksFilePath, "utf8");
            const parsed = JSON.parse(raw);
            rawSavedTasks =
                Array.isArray(parsed)
                    ? parsed
                    : (parsed &&
                        typeof parsed === "object" &&
                        Array.isArray(parsed.tasks))
                        ? parsed.tasks
                        : [];
        }
        catch (error) {
            const code = typeof error === "object" &&
                error !== null &&
                "code" in error
                ? String(error.code)
                : "";
            if (code !== "ENOENT") {
                console.error("[TaskRuntimeStore] Failed to read tasks.json:", error);
            }
            rawSavedTasks = [];
        }
        const loadedTasks = [];
        const normalizedSavedTasks = [];
        const warnings = [];
        const transitions = graph.getRunnableBlockTransitions();
        for (const rawItem of Array.isArray(rawSavedTasks) ? rawSavedTasks : []) {
            const saved = normalizeSavedTask(rawItem);
            if (!saved) {
                warnings.push("Kihagyva: hibás tasks.json bejegyzés.");
                continue;
            }
            const transition = transitions.find(item => item.fromBlock.id === saved.fromBlockId &&
                item.toBlock.id === saved.toBlockId);
            if (!transition) {
                warnings.push(`Kihagyva: ${saved.name} — az útvonal már nem található vagy nem automatizálható.`);
                continue;
            }
            normalizedSavedTasks.push(saved);
            loadedTasks.push(this.createRuntimeTask(saved, transition));
        }
        this.savedTasks.splice(0, this.savedTasks.length, ...normalizedSavedTasks);
        this.tasks.splice(0, this.tasks.length, ...loadedTasks);
        return {
            ok: true,
            loadedCount: loadedTasks.length,
            skippedCount: warnings.length,
            warnings,
            snapshot: this.getSnapshot(),
        };
    }
    createRuntimeTask(saved, transition) {
        return {
            id: saved.id,
            name: saved.name,
            targetSpeed: saved.targetSpeed,
            fromBlockId: saved.fromBlockId,
            toBlockId: saved.toBlockId,
            transition,
            status: "queued",
            createdAt: saved.createdAt,
            runtime: this.createRuntimeState(),
        };
    }
    createRuntimeState() {
        return {
            loco: null,
            hasLeftFromBlock: false,
            hasReachedToBlock: false,
            inTransit: false,
        };
    }
    createOverlayState() {
        const activeTasks = this.tasks.filter(task => task.status === "running" ||
            task.status === "paused");
        const reservedSectionNames = new Set();
        const transitSectionNames = new Set();
        const activeBlockIds = new Set();
        const activeTurnoutAddresses = new Set();
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
    findTask(taskIdOrName) {
        return this.tasks.find(task => task.id === taskIdOrName ||
            task.name === taskIdOrName);
    }
    createTaskId() {
        return `task-${Date.now()}-${randomUUID().slice(0, 8)}`;
    }
    async persistTasks() {
        await fs.mkdir(path.dirname(this.tasksFilePath), { recursive: true });
        await fs.writeFile(this.tasksFilePath, JSON.stringify(this.savedTasks, null, 2), "utf8");
    }
    broadcastSnapshot() {
        this.broadcast?.({
            type: "taskManagerSnapshotChanged",
            data: this.getSnapshot(),
        });
    }
    actionOk() {
        return {
            ok: true,
            snapshot: this.getSnapshot(),
        };
    }
    actionError(error) {
        return {
            ok: false,
            error,
            snapshot: this.getSnapshot(),
        };
    }
    addError(error) {
        return {
            ok: false,
            error,
            snapshot: this.getSnapshot(),
        };
    }
}
function cloneTask(task) {
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
function normalizeSavedTask(raw) {
    if (!raw ||
        typeof raw !== "object") {
        return null;
    }
    const item = raw;
    const id = typeof item.id === "string"
        ? item.id
        : "";
    const name = typeof item.name === "string"
        ? item.name
        : "";
    const targetSpeed = typeof item.targetSpeed === "number"
        ? item.targetSpeed
        : Number.NaN;
    const fromBlockId = typeof item.fromBlockId === "string"
        ? item.fromBlockId
        : "";
    const toBlockId = typeof item.toBlockId === "string"
        ? item.toBlockId
        : "";
    const createdAt = typeof item.createdAt === "number"
        ? item.createdAt
        : Date.now();
    if (!id ||
        !name ||
        !Number.isFinite(targetSpeed) ||
        targetSpeed < 0 ||
        !fromBlockId ||
        !toBlockId) {
        return null;
    }
    return {
        id,
        name,
        targetSpeed,
        fromBlockId,
        toBlockId,
        createdAt,
    };
}
export const taskRuntimeStore = new TaskRuntimeStore();
