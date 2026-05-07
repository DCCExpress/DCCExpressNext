// client/src/services/scriptEngine.ts

import { wsApi } from "./wsApi";
import { layoutStore } from "./layoutStore";
import { BaseElement } from "../models/editor/core/BaseElement";
import { loadJsonFile, saveJsonFile } from "../api/fileApi";


export type ScriptRunSource =
    | "property-panel"
    | "route-button"
    | "control-panel"
    | "unknown";

export type ScriptStatus =
    | "idle"
    | "running"
    | "stopping"
    | "stopped"
    | "finished"
    | "error";

export type ScriptContext = {
    source?: ScriptRunSource;
    element?: BaseElement | null;
};

export type ScriptLogEntry = {
    time: Date;
    source: ScriptRunSource;
    message: string;
};

export type ScriptState = {
    id: string;
    status: ScriptStatus;
    source: ScriptRunSource;
    startedAt?: Date;
    finishedAt?: Date;
    error?: string;
    logs: ScriptLogEntry[];
};

type ScriptStateListener = (state: ScriptState) => void;

class ScriptStoppedError extends Error {
    constructor() {
        super("Script stopped");
        this.name = "ScriptStoppedError";
    }
}

export class ScriptSession {
    private state: ScriptState;
    private listeners = new Set<ScriptStateListener>();
    private stopRequested = false;
    private timers = new Set<number>();

    constructor(
        private readonly script: string,
        private readonly context: ScriptContext,
    ) {
        this.state = {
            id: crypto.randomUUID?.() ?? String(Date.now()),
            status: "idle",
            source: context.source ?? "unknown",
            logs: [],
        };
    }

    getState(): ScriptState {
        return {
            ...this.state,
            logs: [...this.state.logs],
        };
    }

    subscribe(listener: ScriptStateListener) {
        this.listeners.add(listener);
        listener(this.getState());

        return () => {
            this.listeners.delete(listener);
        };
    }

    async start() {
        if (this.state.status !== "idle") return;

        this.setState({
            status: "running",
            startedAt: new Date(),
        });
        this.log("Script started");

        const api = this.createApi();

        try {
            const fn = new Function(
                "api",
                `
const {
  log,
  sleep,
  check,
  powerOn,
  powerOff,
  emergencyStop,
  setTurnout,
  getTurnout,
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
        `
            );

            await fn(api);

            this.clearTimers();

            this.setState({
                status: this.stopRequested ? "stopped" : "finished",
                finishedAt: new Date(),
            });

            this.log(this.stopRequested ? "Script stopped" : "Script finished");
        } catch (error) {
            this.clearTimers();
            if (error instanceof ScriptStoppedError) {
                this.setState({
                    status: "stopped",
                    finishedAt: new Date(),
                });

                this.log("Script stopped");
                return;
            }

            const message =
                error instanceof Error ? error.message : String(error);

            this.setState({
                status: "error",
                error: message,
                finishedAt: new Date(),
            });

            this.log(`Script error: ${message}`);
            console.error("[ScriptEngine]", error);
        }
    }

    private clearTimers() {
        for (const timerId of this.timers) {
            window.clearInterval(timerId);
            window.clearTimeout(timerId);
        }

        this.timers.clear();
    }
    stop() {
        if (this.state.status !== "running") return;

        this.stopRequested = true;

        this.setState({
            status: "stopping",
        });

        this.log("Stopping script...");

        this.clearTimers();
    }

    private async check() {
        if (this.stopRequested) {
            throw new ScriptStoppedError();
        }
    }

    private async sleep(ms: number) {
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

    private createApi() {
        return {
            log: (...args: unknown[]) => {
                const message = args.map(a => String(a)).join(" ");
                this.log(message);
                console.log("[DCCScript]", ...args);
            },

            check: async () => {
                await this.check();
            },

            sleep: async (ms: number) => {
                await this.sleep(ms);
            },

            powerOn: async () => {
                await this.check();
                wsApi.powerOn();
                await this.check();
            },

            powerOff: async () => {
                await this.check();
                wsApi.powerOff();
                await this.check();
            },

            emergencyStop: async () => {
                await this.check();
                wsApi.emergencyStop();
                await this.check();
            },

            setTurnout: async (address: number, closed: boolean) => {
                await this.check();

                wsApi.setTurnout(address, closed);
                layoutStore.setTurnoutStateByAddress(address, closed);

                await this.check();
            },

            getTurnout: (address: number) => {
                //await this.check();
                return layoutStore.findTurnoutByAddress(address);
            },

            setSignalGreen: (address: number) => {
                return layoutStore.setSignalGreenByAddress(address);
            },
            setSignalYellow: (address: number) => {
                
                return layoutStore.setSignalYellowByAddress(address);
            },
            setSignalRed: (address: number) => {
                return layoutStore.setSignalRedByAddress(address);
            },
            setSignalWhite: (address: number) => {
                return layoutStore.setSignalWhiteByAddress(address);
            },

            getTurnoutState: (address: number) => {
                //await this.check();
                return layoutStore.getTurnoutStateByAddress(address);
            },

            setLocoFunction: async (address: number, fn: number, active: boolean) => {
                await this.check();
                return wsApi.setLocoFunction(address, fn, active);
            },

            setInterval: (
                callback: () => void | Promise<void>,
                ms: number
            ) => {
                const timerId = window.setInterval(async () => {
                    try {
                        await this.check();
                        await callback();
                        await this.check();
                    } catch (error) {
                        window.clearInterval(timerId);
                        this.timers.delete(timerId);

                        if (error instanceof ScriptStoppedError) {
                            return;
                        }

                        const message =
                            error instanceof Error ? error.message : String(error);

                        this.setState({
                            status: "error",
                            error: message,
                            finishedAt: new Date(),
                        });

                        this.log(`Script interval error: ${message}`);
                        console.error("[ScriptEngine interval]", error);
                    }
                }, ms);

                this.timers.add(timerId);
                return timerId;
            },

            clearInterval: (timerId: number) => {
                window.clearInterval(timerId);
                this.timers.delete(timerId);
            },


            setTimeout: (
                callback: () => void | Promise<void>,
                ms: number
            ) => {
                const timerId = window.setTimeout(async () => {
                    this.timers.delete(timerId);

                    try {
                        await this.check();
                        await callback();
                        await this.check();
                    } catch (error) {
                        if (error instanceof ScriptStoppedError) {
                            return;
                        }

                        const message =
                            error instanceof Error ? error.message : String(error);

                        this.setState({
                            status: "error",
                            error: message,
                            finishedAt: new Date(),
                        });

                        this.log(`Script timeout error: ${message}`);
                        console.error("[ScriptEngine timeout]", error);
                    }
                }, ms);

                this.timers.add(timerId);
                return timerId;
            },

            clearTimeout: (timerId: number) => {
                window.clearTimeout(timerId);
                this.timers.delete(timerId);
            },
            element: this.context.element ?? null,

            layout: layoutStore.getLayout(),
        };
    }

    private log(message: string) {
        const entry: ScriptLogEntry = {
            time: new Date(),
            source: this.state.source,
            message,
        };

        this.state = {
            ...this.state,
            logs: [...this.state.logs, entry],
        };

        this.emit();
    }

    private setState(partial: Partial<ScriptState>) {
        this.state = {
            ...this.state,
            ...partial,
        };

        this.emit();
    }

    private emit() {
        const snapshot = this.getState();

        for (const listener of this.listeners) {
            listener(snapshot);
        }
    }
}

type CurrentSessionListener = (session: ScriptSession | null) => void;

// class ScriptEngine2 {
//     private currentSession: ScriptSession | null = null;
//     private listeners = new Set<CurrentSessionListener>();

//     subscribe(listener: CurrentSessionListener) {
//         this.listeners.add(listener);
//         listener(this.currentSession);

//         return () => {
//             this.listeners.delete(listener);
//         };
//     }

//     private emit() {
//         for (const listener of this.listeners) {
//             listener(this.currentSession);
//         }
//     }

//     run(script: string, context: ScriptContext = {}) {
//         const currentState = this.currentSession?.getState();

//         if (
//             currentState?.status === "running" ||
//             currentState?.status === "stopping"
//         ) {
//             throw new Error("A script is already running");
//         }

//         const session = new ScriptSession(script, context);
//         this.currentSession = session;

//         this.emit();

//         void session.start();

//         return session;
//     }

//     stopCurrent() {
//         this.currentSession?.stop();
//     }

//     getCurrentSession() {
//         return this.currentSession;
//     }
// }


export type ScriptDocument = {
    content: string;
    updatedAt?: string;
};

type ScriptDocumentListener = (script: ScriptDocument) => void;

const DEFAULT_SCRIPT = `for (var i = 0; i < 10; i++) {
  setTurnout(10, true);
  await sleep(1000);
  setTurnout(10, false);
  await sleep(1000);
}`;

class ScriptEngine {
    private currentSession: ScriptSession | null = null;
    private listeners = new Set<CurrentSessionListener>();

    private script: ScriptDocument = {
        content: DEFAULT_SCRIPT,
    };

    private scriptListeners = new Set<ScriptDocumentListener>();

    subscribe(listener: CurrentSessionListener) {
        this.listeners.add(listener);
        listener(this.currentSession);

        return () => {
            this.listeners.delete(listener);
        };
    }

    subscribeScript(listener: ScriptDocumentListener) {
        this.scriptListeners.add(listener);
        listener(this.getScriptDocument());

        return () => {
            this.scriptListeners.delete(listener);
        };
    }

    getScript(): string {
        return this.script.content;
    }

    getScriptDocument(): ScriptDocument {
        return {
            ...this.script,
        };
    }

    setScript(content: string) {
        this.script = {
            content,
            updatedAt: new Date().toISOString(),
        };

        this.emitScript();
    }

    async loadScript() {
        const scriptFile = await loadJsonFile<ScriptDocument>("script.json");

        this.script = {
            content: scriptFile.content ?? "",
            updatedAt: new Date().toISOString(),
        };

        this.emitScript();

        return this.getScriptDocument();
    }

    async saveScript() {
        await saveJsonFile("script.json", this.script);

        this.script = {
            ...this.script,
            updatedAt: new Date().toISOString(),
        };

        this.emitScript();

        return this.getScriptDocument();
    }

    private emitScript() {
        const snapshot = this.getScriptDocument();

        for (const listener of this.scriptListeners) {
            listener(snapshot);
        }
    }

    private emit() {
        for (const listener of this.listeners) {
            listener(this.currentSession);
        }
    }

    run(script: string, context: ScriptContext = {}) {
        const currentState = this.currentSession?.getState();

        if (
            currentState?.status === "running" ||
            currentState?.status === "stopping"
        ) {
            throw new Error("A script is already running");
        }

        const session = new ScriptSession(script, context);
        this.currentSession = session;

        this.emit();

        void session.start();

        return session;
    }

    runCurrent(context: ScriptContext = {}) {
        return this.run(this.script.content, context);
    }

    stopCurrent() {
        this.currentSession?.stop();
    }

    getCurrentSession() {
        return this.currentSession;
    }
}


export const scriptEngine = new ScriptEngine();