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
  | "stopped"
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

type SessionListener = (state: ScriptState) => void;
type EngineListener = (session: ScriptSession | null) => void;
type ScriptDocumentListener = (scriptDocument: ScriptDocumentDto) => void;

export class ScriptSession {
  private readonly listeners = new Set<SessionListener>();

  constructor(
    private state: ScriptState
  ) {}

  getState(): ScriptState {
    return this.state;
  }

  updateState(state: ScriptState): void {
    this.state = state;
    this.emit();
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

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

function toScriptDocument(
  document: ScriptDocumentDto
): ScriptDocumentDto {
  return {
    content: document.content ?? "",
    autoStart: document.autoStart === true,
    ...(document.updatedAt !== undefined
      ? { updatedAt: document.updatedAt }
      : {}),
  };
}

function fromServerState(
  state: ScriptStateDto
): ScriptState {
  const startedAt = toDate(state.startedAt);
  const finishedAt = toDate(state.finishedAt);

  return {
    id: state.id,
    status: state.status,
    source: state.source,
    logs: state.logs.map(log => ({
      time: toDate(log.time) ?? new Date(),
      source: log.source,
      message: log.message,
    })),
    ...(startedAt !== undefined
      ? { startedAt }
      : {}),
    ...(finishedAt !== undefined
      ? { finishedAt }
      : {}),
    ...(state.error !== undefined
      ? { error: state.error }
      : {}),
  };
}

class ScriptEngine {
  private currentSession: ScriptSession | null = null;
  private listeners = new Set<EngineListener>();
  private scriptListeners = new Set<ScriptDocumentListener>();
  private script: ScriptDocumentDto = {
    content: "",
    autoStart: false,
  };

  constructor() {
    wsClient.on("scriptStateChanged", state => {
      if (!state) {
        this.currentSession = null;
        this.emit();
        return;
      }

      const nextState = fromServerState(state);

      if (this.currentSession?.getState().id === nextState.id) {
        this.currentSession.updateState(nextState);
      } else {
        this.currentSession = new ScriptSession(nextState);
      }

      this.emit();
    });

    wsClient.on("scriptDocumentChanged", document => {
      this.script = toScriptDocument(document);
      this.emitScript();
    });
  }

  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    listener(this.currentSession);

    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeScript(listener: ScriptDocumentListener): () => void {
    this.scriptListeners.add(listener);
    listener(this.getScriptDocument());

    return () => {
      this.scriptListeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.currentSession);
    }
  }

  private emitScript(): void {
    const document = this.getScriptDocument();

    for (const listener of this.scriptListeners) {
      listener(document);
    }
  }

  getCurrentSession(): ScriptSession | null {
    return this.currentSession;
  }

  getScriptDocument(): ScriptDocumentDto {
    return { ...this.script };
  }

  getScript(): string {
    return this.script.content ?? "";
  }

  setScript(content: string): void {
    this.script = {
      ...this.script,
      content,
    };

    this.emitScript();
  }

  updateScript(content: string): void {
    this.setScript(content);
  }

  getAutoStart(): boolean {
    return this.script.autoStart === true;
  }

  setAutoStart(autoStart: boolean): void {
    this.script = {
      ...this.script,
      autoStart,
    };

    this.emitScript();
  }

  async loadScript(): Promise<ScriptDocumentDto> {
    const { getScriptWs } = await import("../api/scriptWsApi");

    const loaded = await getScriptWs();

    this.script = toScriptDocument(loaded);

    this.emitScript();

    return this.getScriptDocument();
  }

  async saveScript(): Promise<ScriptDocumentDto> {
    const { saveScriptWs } = await import("../api/scriptWsApi");

    const saved = await saveScriptWs(this.script);

    this.script = toScriptDocument(saved);

    this.emitScript();

    return this.getScriptDocument();
  }

  run(
    script: string,
    context: ScriptContext = {}
  ): ScriptSession {
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

    this.currentSession = new ScriptSession(optimisticState);
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
  ): ScriptSession {
    return this.run(
      this.script.content,
      context
    );
  }

  stopCurrent(): void {
    wsApi.stopScript();
  }
}

export const scriptEngine = new ScriptEngine();
