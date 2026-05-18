import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { dataDir } from "../paths.js";
import { railwayTopologyStore } from "./railwayTopologyStore.js";
class TaskStoppedError extends Error {
    constructor() {
        super("Task stopped");
        this.name = "TaskStoppedError";
    }
}
class ServerTaskSession {
    definition;
    commands;
    broadcast;
    id = randomUUID();
    state;
    listeners = new Set();
    index = 0;
    locoAddress = 0;
    stopRequested = false;
    paused = false;
    pauseResolver = null;
    constructor(definition, commands, broadcast) {
        this.definition = definition;
        this.commands = commands;
        this.broadcast = broadcast;
        this.state = {
            id: this.id,
            taskId: definition.id,
            taskName: definition.name,
            status: "idle",
            index: 0,
            totalSteps: definition.steps.length,
            logs: [],
        };
    }
    getState() {
        return {
            ...this.state,
            ...(this.state.currentStep
                ? { currentStep: cloneStep(this.state.currentStep) }
                : {}),
            logs: [...this.state.logs],
        };
    }
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.getState());
        return () => {
            this.listeners.delete(listener);
        };
    }
    async start() {
        if (this.state.status !== "idle") {
            return;
        }
        this.setState({
            status: "running",
            startedAt: new Date().toISOString(),
        });
        this.log("Task started");
        try {
            while (true) {
                await this.check();
                if (this.index >= this.definition.steps.length) {
                    if (!this.definition.finishOnComplete) {
                        this.index = 0;
                        this.setIndexState();
                        this.log("Task restarted from the first step");
                        continue;
                    }
                    this.setState({
                        status: "finished",
                        finishedAt: new Date().toISOString(),
                    });
                    this.log("Task finished");
                    return;
                }
                const step = this.definition.steps[this.index];
                if (!step) {
                    this.index++;
                    this.setIndexState();
                    continue;
                }
                this.setState({
                    status: this.paused ? "paused" : "running",
                    index: this.index,
                    currentStep: cloneStep(step),
                });
                this.log(`Step ${this.index + 1}/${this.definition.steps.length}: ${step.type}`);
                await this.executeStep(step);
            }
        }
        catch (error) {
            if (error instanceof TaskStoppedError) {
                this.setState({
                    status: "stopped",
                    finishedAt: new Date().toISOString(),
                });
                this.log("Task stopped");
                return;
            }
            const message = error instanceof Error
                ? error.message
                : String(error);
            this.setState({
                status: "error",
                error: message,
                finishedAt: new Date().toISOString(),
            });
            this.log(`Task error: ${message}`);
            console.error("[TaskRuntimeStore]", error);
        }
    }
    stop() {
        if (this.state.status !== "running" &&
            this.state.status !== "paused") {
            return;
        }
        this.stopRequested = true;
        this.paused = false;
        this.pauseResolver?.();
        this.pauseResolver = null;
        this.setState({
            status: "stopping",
        });
        this.log("Stopping task...");
    }
    pause() {
        if (this.state.status !== "running") {
            return;
        }
        this.paused = true;
        this.setState({
            status: "paused",
        });
        this.log("Task paused");
    }
    resume() {
        if (this.state.status !== "paused") {
            return;
        }
        this.paused = false;
        this.pauseResolver?.();
        this.pauseResolver = null;
        this.setState({
            status: "running",
        });
        this.log("Task resumed");
    }
    async executeStep(step) {
        switch (step.type) {
            case "setLoco": {
                this.locoAddress = numberData(step, "address");
                this.next();
                return;
            }
            case "setTurnout": {
                const address = numberData(step, "address");
                const closed = booleanData(step, "closed");
                await this.setTurnout(address, closed);
                this.next();
                return;
            }
            case "forward": {
                const speed = numberData(step, "speed");
                await this.setLocoSpeed(speed, "forward");
                this.next();
                return;
            }
            case "reverse": {
                const speed = numberData(step, "speed");
                await this.setLocoSpeed(speed, "reverse");
                this.next();
                return;
            }
            case "stopLoco": {
                await this.setLocoSpeed(0, "forward");
                this.next();
                return;
            }
            case "setFunction": {
                const fn = numberData(step, "fn");
                const active = booleanData(step, "on");
                if (!this.locoAddress) {
                    throw new Error("setFunction requires a prior setLoco step.");
                }
                const ok = await this.commands.setLocoFunction(this.locoAddress, fn, active);
                if (!ok) {
                    throw new Error(`Could not set F${fn} for loco ${this.locoAddress}.`);
                }
                this.next();
                return;
            }
            case "delay": {
                const ms = numberData(step, "ms");
                await this.sleep(ms);
                this.next();
                return;
            }
            case "waitForSensor": {
                const address = numberData(step, "address");
                const on = booleanData(step, "on");
                await this.waitUntil(async () => {
                    const state = await this.commands.getSensorState(address);
                    return state === on;
                });
                this.next();
                return;
            }
            case "waitForMinutes": {
                const minute = numberData(step, "minute");
                if (minute <= 0) {
                    throw new Error("waitForMinutes.minute must be greater than 0.");
                }
                await this.waitUntil(async () => {
                    return new Date().getMinutes() % minute === 0;
                }, 1000);
                this.next();
                return;
            }
            case "startAtMinutes": {
                const minutes = numberArrayData(step, "minutes");
                await this.waitUntil(async () => {
                    return minutes.includes(new Date().getMinutes());
                }, 1000);
                this.next();
                return;
            }
            case "playSound": {
                const fname = stringData(step, "fname");
                this.broadcast?.({
                    type: "taskPlaySound",
                    data: {
                        taskId: this.definition.id,
                        taskName: this.definition.name,
                        fname,
                    },
                });
                this.next();
                return;
            }
            case "label": {
                this.next();
                return;
            }
            case "goto": {
                const label = stringData(step, "text");
                this.gotoLabel(label);
                return;
            }
            case "ifClosed": {
                const address = numberData(step, "address");
                const state = this.commands.getTurnoutState(address);
                if (state === true) {
                    this.next();
                }
                else {
                    this.gotoNextEndOrElse();
                }
                return;
            }
            case "ifOpen": {
                const address = numberData(step, "address");
                const state = this.commands.getTurnoutState(address);
                if (state === false) {
                    this.next();
                }
                else {
                    this.gotoNextEndOrElse();
                }
                return;
            }
            case "else": {
                this.gotoNextEnd();
                return;
            }
            case "endIf": {
                this.next();
                return;
            }
            case "break": {
                const text = typeof step.data?.text === "string"
                    ? step.data.text
                    : "";
                this.log(text ? `Break: ${text}` : "Break");
                this.stopRequested = true;
                await this.check();
                return;
            }
            case "restart": {
                if (this.definition.finishOnComplete) {
                    this.setState({
                        status: "finished",
                        finishedAt: new Date().toISOString(),
                    });
                    this.log("Task finished on restart step");
                    throw new TaskStoppedError();
                }
                this.index = 0;
                this.setIndexState();
                return;
            }
            case "setOutput":
            case "setAccessory": {
                const address = numberData(step, "address");
                const active = booleanData(step, "on");
                const ok = await this.commands.setBasicAccessory(address, active);
                if (!ok) {
                    throw new Error(`Could not set accessory/output #${address}.`);
                }
                this.next();
                return;
            }
            case "ifOutputIsOn":
            case "ifAccessoryIsOn": {
                const address = numberData(step, "address");
                const state = this.commands.getAccessoryState(address);
                if (state === true) {
                    this.next();
                }
                else {
                    this.gotoNextEndOrElse();
                }
                return;
            }
            case "ifOutputIsOff":
            case "ifAccessoryIsOff": {
                const address = numberData(step, "address");
                const state = this.commands.getAccessoryState(address);
                if (state === false) {
                    this.next();
                }
                else {
                    this.gotoNextEndOrElse();
                }
                return;
            }
            case "setSignalGreen": {
                await this.setSignalAspect(numberData(step, "address"), "green");
                this.next();
                return;
            }
            case "setSignalYellow": {
                await this.setSignalAspect(numberData(step, "address"), "yellow");
                this.next();
                return;
            }
            case "setSignalRed": {
                await this.setSignalAspect(numberData(step, "address"), "red");
                this.next();
                return;
            }
            case "setSignalWhite": {
                await this.setSignalAspect(numberData(step, "address"), "white");
                this.next();
                return;
            }
            case "ifSignalIsGreen": {
                if (this.isSignalAspect(numberData(step, "address"), "green")) {
                    this.next();
                }
                else {
                    this.gotoNextEndOrElse();
                }
                return;
            }
            case "ifSignalIsYellow": {
                if (this.isSignalAspect(numberData(step, "address"), "yellow")) {
                    this.next();
                }
                else {
                    this.gotoNextEndOrElse();
                }
                return;
            }
            case "ifSignalIsRed": {
                if (this.isSignalAspect(numberData(step, "address"), "red")) {
                    this.next();
                }
                else {
                    this.gotoNextEndOrElse();
                }
                return;
            }
            case "ifSignalIsWhite": {
                if (this.isSignalAspect(numberData(step, "address"), "white")) {
                    this.next();
                }
                else {
                    this.gotoNextEndOrElse();
                }
                return;
            }
            case "ifSensorIsOn": {
                const address = numberData(step, "address");
                const state = await this.commands.getSensorState(address);
                if (state === true) {
                    this.next();
                }
                else {
                    this.gotoNextEndOrElse();
                }
                return;
            }
            case "ifSensorIsOff": {
                const address = numberData(step, "address");
                const state = await this.commands.getSensorState(address);
                if (state === false) {
                    this.next();
                }
                else {
                    this.gotoNextEndOrElse();
                }
                return;
            }
            case "setRoute": {
                const routeName = stringData(step, "routeName");
                throw new Error(`setRoute("${routeName}") is not migrated yet. Use the server route reservation flow instead.`);
            }
            case "ifFree": {
                throw new Error("ifFree is not migrated yet because the current server route model uses reservations.");
            }
            default: {
                const neverStep = step.type;
                throw new Error(`Unsupported task step: ${String(neverStep)}`);
            }
        }
    }
    async setTurnout(address, closed) {
        await this.check();
        if (this.commands.isTurnoutBusy(address)) {
            throw new Error(`Turnout #${address} is reserved by an active route.`);
        }
        const topology = railwayTopologyStore.getTopology();
        if (!topology) {
            throw new Error("No server-side topology is available.");
        }
        const turnout = topology.getTurnouts().find(item => item.turnoutAddress === address);
        if (!turnout) {
            throw new Error(`Turnout not found for address ${address}.`);
        }
        const physicalClosed = closed === turnout.turnoutClosedValue;
        const ok = await this.commands.setTurnout(address, physicalClosed);
        if (!ok) {
            throw new Error(`Could not set turnout #${address}.`);
        }
        await this.check();
    }
    async setLocoSpeed(speed, direction) {
        if (!this.locoAddress) {
            throw new Error("Loco motion requires a prior setLoco step.");
        }
        const ok = await this.commands.setLoco(this.locoAddress, speed, direction);
        if (!ok) {
            throw new Error(`Could not set loco ${this.locoAddress}.`);
        }
    }
    async setSignalAspect(address, aspect) {
        await this.check();
        const signal = this.getSignal(address);
        const bits = aspect === "green"
            ? signal.valueGreen
            : aspect === "yellow"
                ? signal.valueYellow
                : aspect === "red"
                    ? signal.valueRed
                    : signal.valueWhite;
        for (let i = 0; i < signal.addressLength; i++) {
            const active = ((bits >> i) & 1) === 1;
            const ok = await this.commands.setBasicAccessory(signal.address + i, active);
            if (!ok) {
                throw new Error(`Could not set signal accessory ${signal.address + i}.`);
            }
        }
    }
    isSignalAspect(address, aspect) {
        const signal = this.getSignal(address);
        const bits = aspect === "green"
            ? signal.valueGreen
            : aspect === "yellow"
                ? signal.valueYellow
                : aspect === "red"
                    ? signal.valueRed
                    : signal.valueWhite;
        for (let i = 0; i < signal.addressLength; i++) {
            const expected = ((bits >> i) & 1) === 1;
            const current = this.commands.getAccessoryState(signal.address + i);
            if (current !== expected) {
                return false;
            }
        }
        return true;
    }
    getSignal(address) {
        const topology = railwayTopologyStore.getTopology();
        if (!topology) {
            throw new Error("No server-side topology is available.");
        }
        const signal = topology.getSignals().find(item => item.address === address);
        if (!signal) {
            throw new Error(`Signal not found for address ${address}.`);
        }
        return signal;
    }
    gotoLabel(label) {
        const targetIndex = this.definition.steps.findIndex(step => {
            return (step.type === "label" &&
                step.data?.text === label);
        });
        if (targetIndex < 0) {
            throw new Error(`Could not find task label "${label}".`);
        }
        this.index = targetIndex;
        this.setIndexState();
    }
    gotoNextEndOrElse() {
        const target = this.findMatchingBranchTarget(this.index, true);
        if (target < 0) {
            throw new Error("Could not find matching else/endIf.");
        }
        const step = this.definition.steps[target];
        this.index =
            step?.type === "else"
                ? target + 1
                : target + 1;
        this.setIndexState();
    }
    gotoNextEnd() {
        const target = this.findMatchingBranchTarget(this.index, false);
        if (target < 0) {
            throw new Error("Could not find matching endIf.");
        }
        this.index = target + 1;
        this.setIndexState();
    }
    findMatchingBranchTarget(fromIndex, includeElse) {
        let depth = 0;
        for (let i = fromIndex + 1; i < this.definition.steps.length; i++) {
            const type = this.definition.steps[i]?.type;
            if (isIfStep(type)) {
                depth++;
                continue;
            }
            if (type === "endIf") {
                if (depth === 0) {
                    return i;
                }
                depth--;
                continue;
            }
            if (includeElse &&
                type === "else" &&
                depth === 0) {
                return i;
            }
        }
        return -1;
    }
    next() {
        this.index++;
        this.setIndexState();
    }
    setIndexState() {
        this.setState({
            index: this.index,
            totalSteps: this.definition.steps.length,
            ...(this.definition.steps[this.index]
                ? { currentStep: cloneStep(this.definition.steps[this.index]) }
                : { currentStep: undefined }),
        });
    }
    async waitUntil(predicate, pollMs = 100) {
        while (true) {
            await this.check();
            if (await predicate()) {
                return;
            }
            await this.sleep(pollMs);
        }
    }
    async sleep(ms) {
        const total = Number.isFinite(ms) && ms > 0
            ? ms
            : 0;
        const step = 50;
        let elapsed = 0;
        while (elapsed < total) {
            await this.check();
            const currentDelay = Math.min(step, total - elapsed);
            await new Promise(resolve => setTimeout(resolve, currentDelay));
            elapsed += currentDelay;
        }
        await this.check();
    }
    async check() {
        if (this.stopRequested) {
            throw new TaskStoppedError();
        }
        while (this.paused) {
            await new Promise(resolve => {
                this.pauseResolver = resolve;
            });
            if (this.stopRequested) {
                throw new TaskStoppedError();
            }
        }
    }
    log(message) {
        const entry = {
            time: new Date().toISOString(),
            taskId: this.definition.id,
            taskName: this.definition.name,
            message,
        };
        this.state = {
            ...this.state,
            logs: [
                ...this.state.logs,
                entry,
            ],
        };
        this.emit();
    }
    setState(partial) {
        this.state = {
            ...this.state,
            ...partial,
        };
        this.emit();
    }
    emit() {
        const snapshot = this.getState();
        for (const listener of this.listeners) {
            listener(snapshot);
        }
    }
}
function cloneStep(step) {
    return {
        type: step.type,
        ...(step.data
            ? { data: { ...step.data } }
            : {}),
    };
}
function numberData(step, key) {
    const value = step.data?.[key];
    if (typeof value !== "number") {
        throw new Error(`${step.type}.${key} must be a number.`);
    }
    return value;
}
function booleanData(step, key) {
    const value = step.data?.[key];
    if (typeof value !== "boolean") {
        throw new Error(`${step.type}.${key} must be a boolean.`);
    }
    return value;
}
function stringData(step, key) {
    const value = step.data?.[key];
    if (typeof value !== "string") {
        throw new Error(`${step.type}.${key} must be a string.`);
    }
    return value;
}
function numberArrayData(step, key) {
    const value = step.data?.[key];
    if (!Array.isArray(value) ||
        !value.every(item => typeof item === "number")) {
        throw new Error(`${step.type}.${key} must be a number array.`);
    }
    return value;
}
function isIfStep(type) {
    return (type === "ifClosed" ||
        type === "ifOpen" ||
        type === "ifFree" ||
        type === "ifOutputIsOn" ||
        type === "ifOutputIsOff" ||
        type === "ifAccessoryIsOn" ||
        type === "ifAccessoryIsOff" ||
        type === "ifSignalIsGreen" ||
        type === "ifSignalIsYellow" ||
        type === "ifSignalIsRed" ||
        type === "ifSignalIsWhite" ||
        type === "ifSensorIsOn" ||
        type === "ifSensorIsOff");
}
class TaskRuntimeStore {
    initialized = false;
    commands = null;
    broadcast = null;
    document = {
        tasks: [],
    };
    sessions = new Map();
    filePath = path.resolve(dataDir, "tasks.json");
    configure(params) {
        this.commands = params.commands;
        this.broadcast = params.broadcast;
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        try {
            const raw = await fs.readFile(this.filePath, "utf8");
            const parsed = JSON.parse(raw);
            this.document =
                normalizeTaskDocument(parsed);
        }
        catch {
            this.document = {
                tasks: [],
                updatedAt: new Date().toISOString(),
            };
            await this.persistDocument();
        }
        this.initialized = true;
    }
    getDocument() {
        return {
            ...this.document,
            tasks: this.document.tasks.map(task => ({
                ...task,
                steps: task.steps.map(cloneStep),
            })),
        };
    }
    getStates() {
        return Array.from(this.sessions.values()).map(session => session.getState());
    }
    async saveDocument(input) {
        await this.initialize();
        this.document = {
            ...normalizeTaskDocument(input),
            updatedAt: new Date().toISOString(),
        };
        await this.persistDocument();
        this.broadcast?.({
            type: "taskDocumentChanged",
            data: this.getDocument(),
        });
        return this.getDocument();
    }
    async startTask(taskIdOrName) {
        await this.initialize();
        if (!this.commands) {
            throw new Error("Task runtime commands are not configured.");
        }
        const definition = this.findTask(taskIdOrName);
        if (!definition) {
            throw new Error(`Task not found: ${taskIdOrName}`);
        }
        const current = this.sessions.get(definition.id);
        const currentState = current?.getState();
        if (currentState?.status === "running" ||
            currentState?.status === "paused" ||
            currentState?.status === "stopping") {
            throw new Error(`Task "${definition.name}" is already active.`);
        }
        const session = new ServerTaskSession(definition, this.commands, this.broadcast);
        this.sessions.set(definition.id, session);
        session.subscribe(() => {
            this.broadcastStates();
        });
        void session.start();
        return session.getState();
    }
    stopTask(taskIdOrName) {
        const definition = this.findTask(taskIdOrName);
        if (!definition) {
            return;
        }
        this.sessions
            .get(definition.id)
            ?.stop();
        this.broadcastStates();
    }
    pauseTask(taskIdOrName) {
        const definition = this.findTask(taskIdOrName);
        if (!definition) {
            return;
        }
        this.sessions
            .get(definition.id)
            ?.pause();
        this.broadcastStates();
    }
    resumeTask(taskIdOrName) {
        const definition = this.findTask(taskIdOrName);
        if (!definition) {
            return;
        }
        this.sessions
            .get(definition.id)
            ?.resume();
        this.broadcastStates();
    }
    stopAll() {
        for (const session of this.sessions.values()) {
            session.stop();
        }
        this.broadcastStates();
    }
    async autoStartEnabledTasks() {
        await this.initialize();
        for (const task of this.document.tasks) {
            if (!task.autoStart) {
                continue;
            }
            try {
                await this.startTask(task.id);
            }
            catch (error) {
                console.error(`[TaskRuntimeStore] Could not auto-start task "${task.name}":`, error);
            }
        }
    }
    findTask(taskIdOrName) {
        return this.document.tasks.find(task => {
            return (task.id === taskIdOrName ||
                task.name === taskIdOrName);
        });
    }
    broadcastStates() {
        this.broadcast?.({
            type: "taskStatesChanged",
            data: this.getStates(),
        });
    }
    async persistDocument() {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(this.document, null, 2), "utf8");
    }
}
function normalizeTaskDocument(input) {
    const tasks = Array.isArray(input.tasks)
        ? input.tasks
        : [];
    return {
        tasks: tasks
            .filter(task => task && typeof task === "object")
            .map((task, index) => {
            const raw = task;
            return {
                id: typeof raw.id === "string" && raw.id.trim()
                    ? raw.id
                    : randomUUID(),
                name: typeof raw.name === "string" && raw.name.trim()
                    ? raw.name
                    : `Task ${index + 1}`,
                autoStart: raw.autoStart === true,
                finishOnComplete: raw.finishOnComplete !== false,
                steps: Array.isArray(raw.steps)
                    ? raw.steps
                        .filter(step => step && typeof step === "object")
                        .map(step => {
                        const rawStep = step;
                        return {
                            type: String(rawStep.type ?? "break"),
                            ...(rawStep.data && typeof rawStep.data === "object"
                                ? { data: { ...rawStep.data } }
                                : {}),
                        };
                    })
                    : [],
            };
        }),
        ...(typeof input.updatedAt === "string"
            ? { updatedAt: input.updatedAt }
            : {}),
    };
}
export const taskRuntimeStore = new TaskRuntimeStore();
