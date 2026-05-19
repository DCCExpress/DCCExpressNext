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
