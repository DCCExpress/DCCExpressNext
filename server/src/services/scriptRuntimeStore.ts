import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { dataDir } from "../paths.js";
import { layoutRuntimeStore } from "./layoutRuntimeStore.js";
import {
    findTurnoutByAccessoryAddress,
    getTurnoutPhysicalClosedValue,
} from "./railwayCommandHelpers.js";

import {
    ELEMENT_TYPES,
} from "../../../common/src/layout/elementTypes.js";

import type {
    SerializedLayoutDto,
    SerializedLayoutElementDto,
} from "../../../common/src/railway/topology.js";

import type {
    ScriptDocumentDto,
    ScriptLogEntryDto,
    ScriptRunContext,
    ScriptStateDto,
    TypedServerWsMessage,
} from "../../../common/src/types.js";

export type ScriptRuntimeCommands = {
    setTrackPower(on: boolean): Promise<boolean>;
    emergencyStop(): Promise<boolean>;

    setTurnout(
        address: number,
        closed: boolean
    ): Promise<boolean>;

    getTurnoutState(
        address: number
    ): boolean | null;

    setLocoFunction(
        address: number,
        fn: number,
        active: boolean
    ): Promise<boolean>;

    setBasicAccessory(
        address: number,
        active: boolean
    ): Promise<boolean>;

    isTurnoutBusy(
        address: number
    ): boolean;
};

type ScriptStateListener = (
    state: ScriptStateDto
) => void;

type BroadcastFn = (
    message: TypedServerWsMessage
) => void;

type SignalScriptAspect =
    | "red"
    | "yellow"
    | "green"
    | "white";

class ScriptStoppedError extends Error {
    constructor() {
        super("Script stopped");
        this.name = "ScriptStoppedError";
    }
}

const MAX_SCRIPT_LOG_ITEMS = 500;

const SIGNAL_ELEMENT_TYPES = new Set<string>([
    ELEMENT_TYPES.TRACK_SIGNAL2,
    ELEMENT_TYPES.TRACK_SIGNAL3,
    ELEMENT_TYPES.TRACK_SIGNAL4,
]);

function numberValue(
    value: unknown,
    fallback: number
): number {
    return typeof value === "number" && Number.isFinite(value)
        ? value
        : fallback;
}

function getSignalAspectBits(
    element: SerializedLayoutElementDto,
    aspect: SignalScriptAspect
): number {
    switch (aspect) {
        case "green":
            return numberValue(element.valueGreen, 2);
        case "white":
            return numberValue(element.valueWhite, 3);
        case "yellow":
            return numberValue(element.valueYellow, 1);
        case "red":
        default:
            return numberValue(element.valueRed, 0);
    }
}

function getSignalAddressLength(
    element: SerializedLayoutElementDto
): number {
    return Math.max(
        1,
        Math.floor(numberValue(element.addressLength, 1))
    );
}

function findSignalElementByAddress(
    layout: SerializedLayoutDto | null,
    address: number
): SerializedLayoutElementDto | null {
    if (!layout?.layers) {
        return null;
    }

    for (const layer of layout.layers) {
        for (const element of layer.elements ?? []) {
            if (
                typeof element.type === "string" &&
                SIGNAL_ELEMENT_TYPES.has(element.type) &&
                element.address === address
            ) {
                return element;
            }
        }
    }

    return null;
}

function findElementByIdInLayout(
    layout: SerializedLayoutDto | null,
    elementId: string
): SerializedLayoutElementDto | null {
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

class ServerScriptSession {
    private state: ScriptStateDto;

    private readonly listeners =
        new Set<ScriptStateListener>();

    private stopRequested = false;
    private detachedAsyncError: Error | null = null;

    private readonly timers =
        new Set<
            ReturnType<typeof setTimeout> |
            ReturnType<typeof setInterval>
        >();

    constructor(
        private readonly script: string,
        private readonly context: ScriptRunContext,
        private readonly commands: ScriptRuntimeCommands
    ) {
        this.state = {
            id: randomUUID(),
            status: "idle",
            source: context.source ?? "unknown",
            logs: [],
        };
    }

    getState(): ScriptStateDto {
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

    async start(): Promise<void> {
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
  getTurnoutState,
  setBasicAccessory,

  setSignalRed,
  setSignalYellow,
  setSignalGreen,
  setSignalWhite,

  setLocoFunction,

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

            if (this.detachedAsyncError) {
                const error = this.detachedAsyncError;
                this.detachedAsyncError = null;
                throw error;
            }

            this.clearTimers();

            this.setState({
                status: this.stopRequested
                    ? "stopped"
                    : "finished",
                finishedAt: new Date().toISOString(),
            });

            this.log(
                this.stopRequested
                    ? "Script stopped"
                    : "Script finished"
            );
        } catch (error) {
            this.clearTimers();

            if (error instanceof ScriptStoppedError) {
                this.setState({
                    status: "stopped",
                    finishedAt: new Date().toISOString(),
                });

                this.log("Script stopped");
                return;
            }

            const message =
                error instanceof Error
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

    stop(): void {
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

    private async check(): Promise<void> {
        if (this.detachedAsyncError) {
            const error = this.detachedAsyncError;
            this.detachedAsyncError = null;
            throw error;
        }

        if (this.stopRequested) {
            throw new ScriptStoppedError();
        }
    }

    private async sleep(ms: number): Promise<void> {
        const step = 50;
        let elapsed = 0;

        while (elapsed < ms) {
            await this.check();

            const remaining = ms - elapsed;
            const currentDelay = Math.min(step, remaining);

            await new Promise<void>(resolve =>
                setTimeout(resolve, currentDelay)
            );

            elapsed += currentDelay;
        }

        await this.check();
    }

    private captureDetachedAsyncError(error: unknown): void {
        if (error instanceof ScriptStoppedError) {
            return;
        }

        if (this.detachedAsyncError) {
            return;
        }

        this.detachedAsyncError =
            error instanceof Error
                ? error
                : new Error(String(error));
    }

    private guardScriptApi<T extends Record<string, unknown>>(api: T): T {
        const asyncApiKeys = [
            "check",
            "sleep",
            "powerOn",
            "powerOff",
            "emergencyStop",
            "setTurnout",
            "setBasicAccessory",
            "setSignalRed",
            "setSignalYellow",
            "setSignalGreen",
            "setSignalWhite",
            "setLocoFunction",
        ] as const;

        const mutableApi = api as Record<string, unknown>;

        for (const key of asyncApiKeys) {
            const value = mutableApi[key];

            if (typeof value !== "function") {
                continue;
            }

            const fn = value as (...args: unknown[]) => unknown;

            mutableApi[key] = (...args: unknown[]) => {
                const result = fn(...args);

                if (
                    result &&
                    typeof (result as Promise<unknown>).then === "function"
                ) {
                    void (result as Promise<unknown>).catch(error => {
                        this.captureDetachedAsyncError(error);
                    });
                }

                return result;
            };
        }

        return api;
    }

    private async setSignalAspect(
        address: number,
        aspect: SignalScriptAspect
    ): Promise<void> {
        await this.check();

        if (!Number.isFinite(address) || address <= 0) {
            throw new Error(
                `Invalid signal address: ${address}.`
            );
        }

        const signalElement = findSignalElementByAddress(
            layoutRuntimeStore.getLayout(),
            address
        );

        if (!signalElement) {
            throw new Error(
                `Signal not found for address ${address}.`
            );
        }

        const addressLength = getSignalAddressLength(signalElement);
        const bits = getSignalAspectBits(signalElement, aspect);

        for (let i = 0; i < addressLength; i += 1) {
            await this.check();

            const accessoryAddress = address + i;
            const active = ((bits >> i) & 1) === 1;
            const ok = await this.commands.setBasicAccessory(
                accessoryAddress,
                active
            );

            if (!ok) {
                throw new Error(
                    `Could not set signal accessory ${accessoryAddress}.`
                );
            }
        }

        this.log(
            `Signal #${address} set to ${aspect}.`
        );

        await this.check();
    }

    private createApi() {
        return this.guardScriptApi({
            log: (...args: unknown[]) => {
                const message =
                    args.map(arg => String(arg)).join(" ");

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

                const ok =
                    await this.commands.setTrackPower(true);

                if (!ok) {
                    throw new Error("Power ON command failed.");
                }

                await this.check();
            },

            powerOff: async () => {
                await this.check();

                const ok =
                    await this.commands.setTrackPower(false);

                if (!ok) {
                    throw new Error("Power OFF command failed.");
                }

                await this.check();
            },

            emergencyStop: async () => {
                await this.check();

                const ok =
                    await this.commands.emergencyStop();

                if (!ok) {
                    throw new Error("Emergency stop command failed.");
                }

                await this.check();
            },

            setTurnout: async (
                address: number,
                closed: boolean
            ) => {
                await this.check();

                if (this.commands.isTurnoutBusy(address)) {
                    throw new Error(
                        `Turnout #${address} is reserved by an active route.`
                    );
                }

                const turnout =
                    findTurnoutByAccessoryAddress(address);

                if (!turnout) {
                    throw new Error(
                        `Turnout not found for address ${address}.`
                    );
                }

                /**
                 * closed itt LOGIKAI gráf/script állapot:
                 *   true  = C
                 *   false = T
                 *
                 * A command center viszont fizikai boolean értéket vár.
                 */
                const physicalClosed =
                    getTurnoutPhysicalClosedValue(
                        turnout,
                        address,
                        closed
                    );

                const ok =
                    await this.commands.setTurnout(
                        address,
                        physicalClosed
                    );

                if (!ok) {
                    throw new Error(
                        `Could not set turnout #${address}.`
                    );
                }

                await this.check();
            },

            getTurnoutState: (
                address: number
            ) => {
                return this.commands.getTurnoutState(
                    address
                );
            },

            setBasicAccessory: async (
                address: number,
                active: boolean
            ) => {
                await this.check();

                const ok =
                    await this.commands.setBasicAccessory(
                        address,
                        active
                    );

                if (!ok) {
                    throw new Error(
                        `Could not set basic accessory ${address}.`
                    );
                }

                await this.check();
            },

            setSignalRed: async (
                address: number
            ) => {
                await this.setSignalAspect(address, "red");
            },

            setSignalYellow: async (
                address: number
            ) => {
                await this.setSignalAspect(address, "yellow");
            },

            setSignalGreen: async (
                address: number
            ) => {
                await this.setSignalAspect(address, "green");
            },

            setSignalWhite: async (
                address: number
            ) => {
                await this.setSignalAspect(address, "white");
            },

            setLocoFunction: async (
                address: number,
                fn: number,
                active: boolean
            ) => {
                await this.check();

                const ok =
                    await this.commands.setLocoFunction(
                        address,
                        fn,
                        active
                    );

                if (!ok) {
                    throw new Error(
                        `Could not set loco function F${fn} for loco ${address}.`
                    );
                }

                await this.check();
            },

            setInterval: (
                callback: () => void | Promise<void>,
                ms: number
            ) => {
                const timerId = setInterval(async () => {
                    try {
                        await this.check();
                        await callback();
                        await this.check();
                    } catch (error) {
                        clearInterval(timerId);
                        this.timers.delete(timerId);

                        if (error instanceof ScriptStoppedError) {
                            return;
                        }

                        const message =
                            error instanceof Error
                                ? error.message
                                : String(error);

                        this.setState({
                            status: "error",
                            error: message,
                            finishedAt: new Date().toISOString(),
                        });

                        this.log(
                            `Script interval error: ${message}`
                        );
                    }
                }, ms);

                this.timers.add(timerId);
                return timerId;
            },

            clearInterval: (
                timerId: ReturnType<typeof setInterval>
            ) => {
                clearInterval(timerId);
                this.timers.delete(timerId);
            },

            setTimeout: (
                callback: () => void | Promise<void>,
                ms: number
            ) => {
                const timerId = setTimeout(async () => {
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
                            error instanceof Error
                                ? error.message
                                : String(error);

                        this.setState({
                            status: "error",
                            error: message,
                            finishedAt: new Date().toISOString(),
                        });

                        this.log(
                            `Script timeout error: ${message}`
                        );
                    }
                }, ms);

                this.timers.add(timerId);
                return timerId;
            },

            clearTimeout: (
                timerId: ReturnType<typeof setTimeout>
            ) => {
                clearTimeout(timerId);
                this.timers.delete(timerId);
            },

            element:
                this.findSerializedElementById(
                    this.context.elementId ?? null
                ),

            layout:
                layoutRuntimeStore.getLayout(),
        });
    }

    private findSerializedElementById(
        elementId: string | null
    ): SerializedLayoutElementDto | null {
        if (!elementId) {
            return null;
        }

        return findElementByIdInLayout(
            layoutRuntimeStore.getLayout(),
            elementId
        );
    }

    private clearTimers(): void {
        for (const timerId of this.timers) {
            clearTimeout(timerId as ReturnType<typeof setTimeout>);
            clearInterval(timerId as ReturnType<typeof setInterval>);
        }

        this.timers.clear();
    }

    private log(message: string): void {
        const entry: ScriptLogEntryDto = {
            time: new Date().toISOString(),
            source: this.state.source,
            message,
        };

        this.state = {
            ...this.state,
            logs: [
                ...this.state.logs,
                entry,
            ].slice(-MAX_SCRIPT_LOG_ITEMS),
        };

        this.emit();
    }

    private setState(
        partial: Partial<ScriptStateDto>
    ): void {
        this.state = {
            ...this.state,
            ...partial,
        };

        this.emit();
    }

    private emit(): void {
        const snapshot = this.getState();

        for (const listener of this.listeners) {
            listener(snapshot);
        }
    }
}

class ScriptRuntimeStore {
    private initialized = false;
    private autoStartAttempted = false;

    private currentSession:
        | ServerScriptSession
        | null = null;

    private commands:
        | ScriptRuntimeCommands
        | null = null;

    private broadcast:
        | BroadcastFn
        | null = null;

    private document: ScriptDocumentDto = {
        content: "",
        autoStart: false,
    };

    private readonly filePath =
        path.resolve(dataDir, "script.json");

    configure(params: {
        commands: ScriptRuntimeCommands;
        broadcast: BroadcastFn;
    }): void {
        this.commands = params.commands;
        this.broadcast = params.broadcast;
    }

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        await fs.mkdir(
            path.dirname(this.filePath),
            { recursive: true }
        );

        try {
            const raw =
                await fs.readFile(
                    this.filePath,
                    "utf8"
                );

            const parsed =
                JSON.parse(raw) as Partial<ScriptDocumentDto>;

            this.document = {
                content:
                    typeof parsed.content === "string"
                        ? parsed.content
                        : "",

                autoStart:
                    parsed.autoStart === true,

                ...(typeof parsed.updatedAt === "string"
                    ? { updatedAt: parsed.updatedAt }
                    : {}),
            };
        } catch {
            this.document = {
                content: "",
                autoStart: false,
                updatedAt: new Date().toISOString(),
            };

            await this.persistDocument();
        }

        this.initialized = true;
    }

    getDocument(): ScriptDocumentDto {
        return {
            ...this.document,
        };
    }

    getCurrentState(): ScriptStateDto | null {
        return this.currentSession?.getState() ?? null;
    }

    async saveDocument(
        input: Partial<ScriptDocumentDto>
    ): Promise<ScriptDocumentDto> {
        await this.initialize();

        this.document = {
            content:
                typeof input.content === "string"
                    ? input.content
                    : this.document.content,

            autoStart:
                input.autoStart === true,

            updatedAt: new Date().toISOString(),
        };

        await this.persistDocument();

        this.broadcast?.({
            type: "scriptDocumentChanged",
            data: this.getDocument(),
        });

        return this.getDocument();
    }

    async run(
        script: string | undefined,
        context: ScriptRunContext = {}
    ): Promise<ScriptStateDto> {
        await this.initialize();

        if (!this.commands) {
            throw new Error(
                "Script runtime commands are not configured."
            );
        }

        const currentState =
            this.currentSession?.getState();

        if (
            currentState?.status === "running" ||
            currentState?.status === "stopping"
        ) {
            throw new Error(
                "A script is already running."
            );
        }

        const finalScript =
            typeof script === "string"
                ? script
                : this.document.content;

        if (!finalScript.trim()) {
            throw new Error(
                "Script content is empty."
            );
        }

        const session =
            new ServerScriptSession(
                finalScript,
                context,
                this.commands
            );

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

    stopCurrent(): void {
        this.currentSession?.stop();
    }

    async autoStartIfEnabled(): Promise<void> {
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

    private async persistDocument(): Promise<void> {
        await fs.mkdir(
            path.dirname(this.filePath),
            { recursive: true }
        );

        await fs.writeFile(
            this.filePath,
            JSON.stringify(this.document, null, 2),
            "utf8"
        );
    }
}

export const scriptRuntimeStore =
    new ScriptRuntimeStore();
