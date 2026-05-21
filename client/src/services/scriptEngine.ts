import type { BaseElementView } from "../models/editor/core/BaseElementView";

import type {
  ScriptDocumentDto,
  ScriptRunSource,
  ScriptStateDto,
  ScriptStatus,
} from "../../../common/src/types";
import { getScript, saveScript } from "../api/http";
import { wsApi } from "./wsApi";
import { wsClient } from "./wsClient";

const MAX_SCRIPT_LOG_ITEMS = 500;

export type ScriptContext = {
  source?: ScriptRunSource;
  element?: BaseElementView | null;
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

export type ScriptDocument =
  ScriptDocumentDto;

type ScriptStateListener = (
  state: ScriptState
) => void;

type CurrentSessionListener = (
  session: ScriptSession | null
) => void;

type ScriptDocumentListener = (
  script: ScriptDocument
) => void;

export class ScriptSession {
  private state: ScriptState;

  private readonly listeners =
    new Set<ScriptStateListener>();

  constructor(initialState: ScriptState) {
    this.state = initialState;
  }

  getState(): ScriptState {
    return {
      ...this.state,
      logs: [...this.state.logs],
    };
  }

  updateState(nextState: ScriptState): void {
    this.state = nextState;
    this.emit();
  }

  subscribe(listener: ScriptStateListener) {
    this.listeners.add(listener);
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  stop(): void {
    wsApi.stopScript();
  }

  private emit(): void {
    const snapshot = this.getState();

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

class ScriptEngine {
  private currentSession:
    | ScriptSession
    | null = null;

  private readonly listeners =
    new Set<CurrentSessionListener>();

  private readonly scriptListeners =
    new Set<ScriptDocumentListener>();

  private script: ScriptDocument = {
    content: "",
    autoStart: false,
  };

  constructor() {
    wsClient.on(
      "scriptDocumentChanged",
      data => {
        this.script =
          this.createScriptDocument({
            content: data.content ?? "",
            autoStart: data.autoStart === true,
            updatedAt: data.updatedAt,
          });

        this.emitScript();
      }
    );

    wsClient.on(
      "scriptStateChanged",
      data => {
        if (!data) {
          this.currentSession = null;
          this.emit();
          return;
        }

        const mapped =
          this.mapServerState(data);

        if (!this.currentSession) {
          this.currentSession =
            new ScriptSession(mapped);
        } else {
          this.currentSession.updateState(
            mapped
          );
        }

        this.emit();
      }
    );

    wsClient.on(
      "scriptRejected",
      data => {
        const previous =
          this.currentSession?.getState();

        if (!previous) {
          return;
        }

        this.currentSession?.updateState({
          ...previous,
          status: "error",
          error: data.reason,
          finishedAt: new Date(),
          logs: [
            ...previous.logs,
            {
              time: new Date(),
              source: previous.source,
              message:
                `Script rejected: ${data.reason}`,
            },
          ].slice(-MAX_SCRIPT_LOG_ITEMS),
        });

        this.emit();
      }
    );

    wsClient.subscribeStatus(status => {
      if (status === "connected") {
        wsApi.getScriptRuntimeState();
      }
    });
  }

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

  getAutoStart(): boolean {
    return this.script.autoStart;
  }

  setAutoStart(autoStart: boolean) {
    this.script = {
      ...this.script,
      autoStart,
      updatedAt: new Date().toISOString(),
    };

    this.emitScript();
  }

  getScriptDocument(): ScriptDocument {
    return {
      ...this.script,
    };
  }

  setScript(content: string) {
    this.script = {
      ...this.script,
      content,
      updatedAt: new Date().toISOString(),
    };

    this.emitScript();
  }

  async loadScript() {
    const scriptFile =
      await getScript();

    this.script =
      this.createScriptDocument({
        content: scriptFile.content ?? "",
        autoStart: scriptFile.autoStart === true,
        updatedAt: scriptFile.updatedAt,
      });

    this.emitScript();

    return this.getScriptDocument();
  }

  async saveScript() {
    const payload = {
      content: this.script.content,
      autoStart: this.script.autoStart,
      ...(this.script.updatedAt
        ? { updatedAt: this.script.updatedAt }
        : {}),
    };

    const saved =
      await saveScript(payload);

    this.script =
      this.createScriptDocument({
        content: saved.content ?? "",
        autoStart: saved.autoStart === true,
        updatedAt: saved.updatedAt,
      });

    this.emitScript();

    return this.getScriptDocument();
  }

  run(
    script: string,
    context: ScriptContext = {}
  ) {
    const optimisticState: ScriptState = {
      id: `pending-${Date.now()}`,
      status: "running",
      source: context.source ?? "unknown",
      startedAt: new Date(),
      logs: [
        {
          time: new Date(),
          source: context.source ?? "unknown",
          message: "Script start requested",
        },
      ],
    };

    this.currentSession =
      new ScriptSession(optimisticState);

    this.emit();

    wsApi.runScript(script, {
      source: context.source ?? "unknown",
      elementId: context.element?.id ?? null,
    });

    return this.currentSession;
  }

  runCurrent(
    context: ScriptContext = {}
  ) {
    return this.run(
      this.script.content,
      context
    );
  }

  stopCurrent() {
    this.currentSession?.stop();
  }

  getCurrentSession() {
    return this.currentSession;
  }

  private emitScript() {
    const snapshot =
      this.getScriptDocument();

    for (const listener of this.scriptListeners) {
      listener(snapshot);
    }
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.currentSession);
    }
  }

  private createScriptDocument(input: {
content: string;
  autoStart: boolean;
  updatedAt: string | undefined;  }): ScriptDocument {
    return {
      content: input.content,
      autoStart: input.autoStart,
      ...(input.updatedAt
        ? { updatedAt: input.updatedAt }
        : {}),
    };
  }

  private mapServerState(
    state: ScriptStateDto
  ): ScriptState {
    const mappedLogs = (state.logs ?? []).map(log => ({
      time: new Date(log.time),
      source: log.source,
      message: log.message,
    })).slice(-MAX_SCRIPT_LOG_ITEMS);

    return {
      id: state.id,
      status: state.status,
      source: state.source,

      ...(state.startedAt
        ? { startedAt: new Date(state.startedAt) }
        : {}),

      ...(state.finishedAt
        ? { finishedAt: new Date(state.finishedAt) }
        : {}),

      ...(state.error
        ? { error: state.error }
        : {}),

      logs: mappedLogs,
    };
  }
}

export const scriptEngine =
  new ScriptEngine();