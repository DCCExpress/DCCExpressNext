// common/src/clientWsCommands.ts

import type {
  Direction,
  ICommandCenter,
  Loco,
  ReservationOwnerType,
} from "./domainTypes.js";

import type {
  SerializedLayoutDto,
} from "./layout/layoutDto.js";

import type {
  ScriptDocumentDto,
  ScriptRunSource,
} from "./scriptTypes.js";

import type {
  TrainTaskCreateInput,
} from "./task.js";

import type {
  SetRuntimeVariablePayload,
} from "./runtimeVariables.js";

export type EmptyClientWsCommandPayload = {};

export type SetTrackPowerCommandPayload = {
  on: boolean;
};

export type SetProgrammingPowerCommandPayload = {
  on: boolean;
};

export type DccExDirectCommandPayload = {
  command: string;
};

export type SetLocoCommandPayload = {
  locoAddress: number;
  speed: number;
  direction: Direction;
};

export type GetLocoCommandPayload = {
  locoAddress: number;
};

export type SetLocoFunctionCommandPayload = {
  locoAddress: number;
  functionNumber: number;
  active: boolean;
};

export type ReserveLocoCommandPayload = {
  locoAddress: number;
  ownerId: string;
  ownerType: ReservationOwnerType;
  ownerName?: string;
  reason?: string;
};

export type ReleaseLocoReservationCommandPayload = {
  locoAddress: number;
  ownerId: string;
};

export type SetTurnoutCommandPayload = {
  address: number;
  closed: boolean;
};

export type SetSensorCommandPayload = {
  address: number;
  on: boolean;
};

export type SetBasicAccessoryCommandPayload = {
  address: number;
  active: boolean;
};

export type SetBlockCommandPayload = {
  blockId: string;
  locoId: string | null;
};

export type SetBlockRemoveCommandPayload =
  SetBlockCommandPayload;

export type RouteReservationCommandPayload = {
  fromBlockName: string;
  toBlockName: string;
};

export type LayoutCommandAction =
  | "load"
  | "save"
  | "refreshRuntime"
  | "getRouteGraph";

export type LayoutCommandPayload = {
  requestId: string;
  action: LayoutCommandAction;
  layout?: SerializedLayoutDto;
};

export type LocosCommandAction =
  | "load"
  | "save";

export type LocosCommandPayload = {
  requestId: string;
  action: LocosCommandAction;
  locos?: Loco[];
};

export type ScriptDocumentCommandAction =
  | "load"
  | "save";

export type ScriptDocumentCommandPayload = {
  requestId: string;
  action: ScriptDocumentCommandAction;
  document?: Partial<ScriptDocumentDto>;
};

export type CommandCenterConfigCommandAction =
  | "load"
  | "save";

export type CommandCenterConfigCommandPayload = {
  requestId: string;
  action: CommandCenterConfigCommandAction;
  config?: Partial<ICommandCenter>;
};

export type TaskManagerCommandAction =
  | "snapshot"
  | "add"
  | "update"
  | "delete"
  | "save"
  | "reload"
  | "start"
  | "pause"
  | "resume"
  | "finish"
  | "abort"
  | "startAll"
  | "pauseAll"
  | "finishAll"
  | "abortAll";

export type TaskManagerCommandPayload = {
  requestId: string;
  action: TaskManagerCommandAction;
  taskId?: string;
  input?: TrainTaskCreateInput;
};

export type FastClockCommandAction =
  | "snapshot"
  | "run"
  | "pause"
  | "reset"
  | "setSpeed";

export type FastClockCommandPayload = {
  requestId: string;
  action: FastClockCommandAction;
  speed?: number;
};

export type FileCommandAction =
  | "readText"
  | "writeText"
  | "readJson"
  | "writeJson";

export type FileCommandPayload = {
  requestId: string;
  action: FileCommandAction;
  fileName: string;
  content?: string;
  data?: unknown;
};

export type RunScriptCommandPayload = {
  script?: string;
  source: ScriptRunSource;
  elementId: string | null;
};

export type TaskIdOrNameCommandPayload = {
  taskIdOrName: string;
};

export type SetEditorEditModeCommandPayload = {
  editMode: boolean;
};

export type ClientWsPayloadMap = {
  setTrackPower: SetTrackPowerCommandPayload;
  setProgrammingPower: SetProgrammingPowerCommandPayload;
  emergencyStop: EmptyClientWsCommandPayload;
  writeDccExDirectCommand: DccExDirectCommandPayload;

  setLoco: SetLocoCommandPayload;
  getLoco: GetLocoCommandPayload;
  setLocoFunction: SetLocoFunctionCommandPayload;
  reserveLoco: ReserveLocoCommandPayload;
  releaseLocoReservation: ReleaseLocoReservationCommandPayload;

  setTurnout: SetTurnoutCommandPayload;
  setSensor: SetSensorCommandPayload;
  setBasicAccessory: SetBasicAccessoryCommandPayload;

  setBlock: SetBlockCommandPayload;
  setBlockRemove: SetBlockRemoveCommandPayload;
  setBlocksReset: EmptyClientWsCommandPayload;
  getBlocks: EmptyClientWsCommandPayload;

  routeLock: EmptyClientWsCommandPayload;
  routeUnlock: EmptyClientWsCommandPayload;

  reserveRoute: RouteReservationCommandPayload;
  releaseRouteReservation: RouteReservationCommandPayload;
  clearAllRouteReservations: EmptyClientWsCommandPayload;
  getRouteReservations: EmptyClientWsCommandPayload;

  layoutCommand: LayoutCommandPayload;
  locosCommand: LocosCommandPayload;
  scriptDocumentCommand: ScriptDocumentCommandPayload;
  commandCenterConfigCommand: CommandCenterConfigCommandPayload;
  taskManagerCommand: TaskManagerCommandPayload;
  fastClockCommand: FastClockCommandPayload;
  fileCommand: FileCommandPayload;

  runScript: RunScriptCommandPayload;
  stopScript: EmptyClientWsCommandPayload;
  getScriptRuntimeState: EmptyClientWsCommandPayload;

  startTask: TaskIdOrNameCommandPayload;
  startAllTasks: EmptyClientWsCommandPayload;
  pauseTask: TaskIdOrNameCommandPayload;
  pauseAllTasks: EmptyClientWsCommandPayload;
  resumeTask: TaskIdOrNameCommandPayload;
  finishTask: TaskIdOrNameCommandPayload;
  abortTask: TaskIdOrNameCommandPayload;
  finishAllTasks: EmptyClientWsCommandPayload;
  abortAllTasks: EmptyClientWsCommandPayload;

  setRuntimeVariable: SetRuntimeVariablePayload;
  getRuntimeVariables: EmptyClientWsCommandPayload;

  setEditorEditMode: SetEditorEditModeCommandPayload;

  getTaskRuntimeState: EmptyClientWsCommandPayload;
};