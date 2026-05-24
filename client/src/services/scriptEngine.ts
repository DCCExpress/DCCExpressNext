import { BaseElementView } from "../models/editor/core/BaseElementView";
import { wsApi } from "./wsApi";
import { wsClient } from "./wsClient";
import type {
  ScriptDocumentDto,
  ScriptRunSource,
  ScriptStateDto,
} from "../../../common/src/types";

export type ScriptStatus =
  | "idle"
  | "running"
  | "stopping"
  | "finished"
  | "error";

export type ScriptLogLevel = "info" | "warn" | "error";

export type ScriptLogEntry = {
  time: Date;
  level?: ScriptLogLevel;
  source?: ScriptRunSource;
  message: string;
};

export type ScriptState = {
  id: string;
  status: ScriptStatus;
  source: ScriptRunSource;
  startedAt?: Date;
  finishedAt?: Date;
  logs: ScriptLogEntry[];
  error?: string;
};

export type ScriptContext = {
  source?: ScriptRunSource;
  element?: BaseElementView | null;
};

export class ScriptSession {
  constructor(
    public readonly state: ScriptState
  ) {}
}

type Listener = () => void;

function toDate(
  value: string | Date | undefined
): Date | undefined {
  if (!value) {
    return undefined;
  }

  return value instanceof Date
    ? value
    : new Date(value);
}

function fromServerState(
  state: ScriptStateDto
): ScriptState {
  return {
    id: state.sessionId,
    status: state.status,
    source: state.source,
    startedAt: toDate(state.startedAt),
    finishedAt: toDate(state.finishedAt),
    logs: state.logs.map(log => ({
      time: toDate(log.timestamp) ?? new Date(),
      level: log.level,
      source: log.source,
      message: log.message,
    })),
    error: state.error,
  };
}

class ScriptEngine {
  private currentSession: ScriptSession | null = null;
  private listeners = new Set<Listener>();
  private scriptListeners = new Set<Listener>();
  private script: ScriptDocumentDto = {
    content: "",
    autoStart: false,
  };

  constructor() {
    wsClient.on("scriptStateChanged", state => {
      this.currentSession = state
        ? new ScriptSession(fromServerState(state))
        : null;

      this.emit();
    });

    wsClient.on("scriptDocumentChanged", document => {
      this.script = {
        content: document.content ?? "",
        autoStart: document.autoStart === true,
        updatedAt: document.updatedAt,
      };

      this.emitScript();
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeScript(listener: Listener): () => void {
    this.scriptListeners.add(listener);

    return () => {
      this.scriptListeners.delete(listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private emitScript() {
    for (const listener of this.scriptListeners) {
      listener();
    }
  }

  getCurrentSession() {
    return this.currentSession;
  }

  getScriptDocument(): ScriptDocumentDto {
    return { ...this.script };
  }

  updateScript(content: string) {
    this.script = {
      ...this.script,
      content,
    };

    this.emitScript();
  }

  setAutoStart(autoStart: boolean) {
    this.script = {
      ...this.script,
      autoStart,
    };

    this.emitScript();
  }

  async loadScript(): Promise<ScriptDocumentDto> {
    const { loadScriptDocumentWs } = await import("../api/scriptDocumentWsApi");

    const loaded = await loadScriptDocumentWs();

    this.script = {
      content: loaded.content ?? "",
      autoStart: loaded.autoStart === true,
      updatedAt: loaded.updatedAt,
    };

    this.emitScript();

    return this.getScriptDocument();
  }

  async saveScript(): Promise<ScriptDocumentDto> {
    const { saveScriptDocumentWs } = await import("../api/scriptDocumentWsApi");

    const saved = await saveScriptDocumentWs(this.script);

    this.script = {
      content: saved.content ?? "",
      autoStart: saved.autoStart === true,
      updatedAt: saved.updatedAt,
    };

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

    wsApi.runScript(
      script,
      context.source ?? "unknown",
      context.element?.id ?? null
    );

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
    wsApi.stopScript();
  }
}

export const scriptEngine = new ScriptEngine();
