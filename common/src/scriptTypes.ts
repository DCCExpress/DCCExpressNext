// common/src/scriptTypes.ts

export type SingleScriptFile = {
  content: string;
  autoStart?: boolean;
  updatedAt?: string;
};

export type ScriptRunSource =
  | "property-panel"
  | "route-button"
  | "control-panel"
  | "auto-start"
  | "unknown";

export type ScriptStatus =
  | "idle"
  | "running"
  | "stopping"
  | "stopped"
  | "finished"
  | "error";

export type ScriptRunContext = {
  source?: ScriptRunSource;
  elementId?: string | null;
};

export type ScriptLogEntryDto = {
  time: string;
  source: ScriptRunSource;
  message: string;
};

export type ScriptStateDto = {
  id: string;
  status: ScriptStatus;
  source: ScriptRunSource;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  logs: ScriptLogEntryDto[];
};

export type ScriptDocumentDto = SingleScriptFile & {
  autoStart: boolean;
};
