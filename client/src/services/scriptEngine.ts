// client/src/services/scriptEngine.ts

import { wsApi } from "./wsApi";
import { layoutStore } from "./layoutStore";
import { BaseElement } from "../models/editor/core/BaseElement";

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

            this.setState({
                status: this.stopRequested ? "stopped" : "finished",
                finishedAt: new Date(),
            });

            this.log(this.stopRequested ? "Script stopped" : "Script finished");
        } catch (error) {
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

    stop() {
        if (this.state.status !== "running") return;

        this.stopRequested = true;

        this.setState({
            status: "stopping",
        });

        this.log("Stopping script...");
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

            getTurnout: async (address: number) => {
                await this.check();
                return layoutStore.findTurnoutByAddress(address);
            },

            getTurnoutState: async (address: number) => {
                await this.check();
                return layoutStore.getTurnoutStateByAddress(address);
            },

            setLocoFunction: async (address: number, fn: number, active: boolean) => {
                await this.check();
                return wsApi.setLocoFunction(address, fn, active);
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

class ScriptEngine {
    private currentSession: ScriptSession | null = null;
    private listeners = new Set<CurrentSessionListener>();

    subscribe(listener: CurrentSessionListener) {
        this.listeners.add(listener);
        listener(this.currentSession);

        return () => {
            this.listeners.delete(listener);
        };
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

    stopCurrent() {
        this.currentSession?.stop();
    }

    getCurrentSession() {
        return this.currentSession;
    }
}

export const scriptEngine = new ScriptEngine();