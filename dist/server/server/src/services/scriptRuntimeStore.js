import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { dataDir } from "../paths.js";
import { layoutRuntimeStore } from "./layoutRuntimeStore.js";
import { railwayTopologyStore } from "./railwayTopologyStore.js";
class ScriptStoppedError extends Error {
    constructor() {
        super("Script stopped");
        this.name = "ScriptStoppedError";
    }
}
class ServerScriptSession {
    script;
    context;
    commands;
    state;
    listeners = new Set();
    stopRequested = false;
    timers = new Set();
    constructor(script, context, commands) {
        this.script = script;
        this.context = context;
        this.commands = commands;
        this.state = {
            id: randomUUID(),
            status: "idle",
            source: context.source ?? "unknown",
            logs: [],
        };
    }
    getState() {
        return {
            ...this.state,
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
        this.log("Script started");
        const api = this.createApi();
        try {
            const fn = new Function("api", `
const {
  log,
  sleep,
  check,

  powerOn,
  powerOff,
  emergencyStop,

  setTurnout,
  getTurnoutState,

  setLocoFunction,

  setSignalGreen,
  setSignalYellow,
  setSignalRed,
  setSignalWhite,

  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,

  element,
  layout
} = api;

return (async () => {
  await check();

  ${this.script}

  await check();
})();
        `);
            await fn(api);
            this.clearTimers();
            this.setState({
                status: this.stopRequested
                    ? "stopped"
                    : "finished",
                finishedAt: new Date().toISOString(),
            });
            this.log(this.stopRequested
                ? "Script stopped"
                : "Script finished");
        }
        catch (error) {
            this.clearTimers();
            if (error instanceof ScriptStoppedError) {
                this.setState({
                    status: "stopped",
                    finishedAt: new Date().toISOString(),
                });
                this.log("Script stopped");
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
            this.log(`Script error: ${message}`);
            console.error("[ServerScriptEngine]", error);
        }
    }
    stop() {
        if (this.state.status !== "running") {
            return;
        }
        this.stopRequested = true;
        this.setState({
            status: "stopping",
        });
        this.log("Stopping script...");
        this.clearTimers();
    }
    async check() {
        if (this.stopRequested) {
            throw new ScriptStoppedError();
        }
    }
    async sleep(ms) {
        const step = 50;
        let elapsed = 0;
        while (elapsed < ms) {
            await this.check();
            const remaining = ms - elapsed;
            const currentDelay = Math.min(step, remaining);
            await new Promise(resolve => setTimeout(resolve, currentDelay));
            elapsed += currentDelay;
        }
        await this.check();
    }
    createApi() {
        return {
            log: (...args) => {
                const message = args.map(arg => String(arg)).join(" ");
                this.log(message);
                console.log("[DCCScript]", ...args);
            },
            check: async () => {
                await this.check();
            },
            sleep: async (ms) => {
                await this.sleep(ms);
            },
            powerOn: async () => {
                await this.check();
                const ok = await this.commands.setTrackPower(true);
                if (!ok) {
                    throw new Error("Power ON command failed.");
                }
                await this.check();
            },
            powerOff: async () => {
                await this.check();
                const ok = await this.commands.setTrackPower(false);
                if (!ok) {
                    throw new Error("Power OFF command failed.");
                }
                await this.check();
            },
            emergencyStop: async () => {
                await this.check();
                const ok = await this.commands.emergencyStop();
                if (!ok) {
                    throw new Error("Emergency stop command failed.");
                }
                await this.check();
            },
            setTurnout: async (address, closed) => {
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
                /**
                 * closed itt LOGIKAI gráf/script állapot:
                 *   true  = C
                 *   false = T
                 *
                 * A command center viszont fizikai boolean értéket vár.
                 */
                const physicalClosed = closed === turnout.turnoutClosedValue;
                const ok = await this.commands.setTurnout(address, physicalClosed);
                if (!ok) {
                    throw new Error(`Could not set turnout #${address}.`);
                }
                await this.check();
            },
            getTurnoutState: (address) => {
                return this.commands.getTurnoutState(address);
            },
            setLocoFunction: async (address, fn, active) => {
                await this.check();
                const ok = await this.commands.setLocoFunction(address, fn, active);
                if (!ok) {
                    throw new Error(`Could not set loco function F${fn} for loco ${address}.`);
                }
                await this.check();
            },
            setSignalGreen: async (address) => {
                await this.setSignalAspect(address, "green");
            },
            setSignalYellow: async (address) => {
                await this.setSignalAspect(address, "yellow");
            },
            setSignalRed: async (address) => {
                await this.setSignalAspect(address, "red");
            },
            setSignalWhite: async (address) => {
                await this.setSignalAspect(address, "white");
            },
            setInterval: (callback, ms) => {
                const timerId = setInterval(async () => {
                    try {
                        await this.check();
                        await callback();
                        await this.check();
                    }
                    catch (error) {
                        clearInterval(timerId);
                        this.timers.delete(timerId);
                        if (error instanceof ScriptStoppedError) {
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
                        this.log(`Script interval error: ${message}`);
                    }
                }, ms);
                this.timers.add(timerId);
                return timerId;
            },
            clearInterval: (timerId) => {
                clearInterval(timerId);
                this.timers.delete(timerId);
            },
            setTimeout: (callback, ms) => {
                const timerId = setTimeout(async () => {
                    this.timers.delete(timerId);
                    try {
                        await this.check();
                        await callback();
                        await this.check();
                    }
                    catch (error) {
                        if (error instanceof ScriptStoppedError) {
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
                        this.log(`Script timeout error: ${message}`);
                    }
                }, ms);
                this.timers.add(timerId);
                return timerId;
            },
            clearTimeout: (timerId) => {
                clearTimeout(timerId);
                this.timers.delete(timerId);
            },
            element: this.findSerializedElementById(this.context.elementId ?? null),
            layout: layoutRuntimeStore.getLayout(),
        };
    }
    async setSignalAspect(address, aspect) {
        await this.check();
        const topology = railwayTopologyStore.getTopology();
        if (!topology) {
            throw new Error("No server-side topology is available.");
        }
        const signal = topology.getSignals().find(item => item.address === address);
        if (!signal) {
            throw new Error(`Signal not found for address ${address}.`);
        }
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
        await this.check();
    }
    findSerializedElementById(elementId) {
        if (!elementId) {
            return null;
        }
        const layout = layoutRuntimeStore.getLayout();
        return findElementByIdInLayout(layout, elementId);
    }
    clearTimers() {
        for (const timerId of this.timers) {
            clearTimeout(timerId);
            clearInterval(timerId);
        }
        this.timers.clear();
    }
    log(message) {
        const entry = {
            time: new Date().toISOString(),
            source: this.state.source,
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
function findElementByIdInLayout(layout, elementId) {
    if (!layout?.layers) {
        return null;
    }
    for (const layer of layout.layers) {
        for (const element of layer.elements ?? []) {
            if (element.id === elementId) {
                return element;
            }
        }
    }
    return null;
}
class ScriptRuntimeStore {
    initialized = false;
    autoStartAttempted = false;
    currentSession = null;
    commands = null;
    broadcast = null;
    document = {
        content: "",
        autoStart: false,
    };
    filePath = path.resolve(dataDir, "script.json");
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
            this.document = {
                content: typeof parsed.content === "string"
                    ? parsed.content
                    : "",
                autoStart: parsed.autoStart === true,
                ...(typeof parsed.updatedAt === "string"
                    ? { updatedAt: parsed.updatedAt }
                    : {}),
            };
        }
        catch {
            this.document = {
                content: "",
                autoStart: false,
                updatedAt: new Date().toISOString(),
            };
            await this.persistDocument();
        }
        this.initialized = true;
    }
    getDocument() {
        return {
            ...this.document,
        };
    }
    getCurrentState() {
        return this.currentSession?.getState() ?? null;
    }
    async saveDocument(input) {
        await this.initialize();
        this.document = {
            content: typeof input.content === "string"
                ? input.content
                : this.document.content,
            autoStart: input.autoStart === true,
            updatedAt: new Date().toISOString(),
        };
        await this.persistDocument();
        this.broadcast?.({
            type: "scriptDocumentChanged",
            data: this.getDocument(),
        });
        return this.getDocument();
    }
    async run(script, context = {}) {
        await this.initialize();
        if (!this.commands) {
            throw new Error("Script runtime commands are not configured.");
        }
        const currentState = this.currentSession?.getState();
        if (currentState?.status === "running" ||
            currentState?.status === "stopping") {
            throw new Error("A script is already running.");
        }
        const finalScript = typeof script === "string"
            ? script
            : this.document.content;
        if (!finalScript.trim()) {
            throw new Error("Script content is empty.");
        }
        const session = new ServerScriptSession(finalScript, context, this.commands);
        this.currentSession = session;
        session.subscribe(state => {
            this.broadcast?.({
                type: "scriptStateChanged",
                data: state,
            });
        });
        void session.start();
        return session.getState();
    }
    stopCurrent() {
        this.currentSession?.stop();
    }
    async autoStartIfEnabled() {
        await this.initialize();
        if (this.autoStartAttempted) {
            return;
        }
        this.autoStartAttempted = true;
        if (!this.document.autoStart) {
            return;
        }
        if (!this.document.content.trim()) {
            return;
        }
        await this.run(undefined, {
            source: "auto-start",
        });
    }
    async persistDocument() {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(this.document, null, 2), "utf8");
    }
}
export const scriptRuntimeStore = new ScriptRuntimeStore();
