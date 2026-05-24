// common/src/wsTypes.ts

import type {
  ClientWsPayloadMap,
} from "./clientWsCommands.js";

import type {
  ICommandCenter,
  Loco,
} from "./domainTypes.js";

import type {
  SerializedLayoutDto,
} from "./layout/layoutDto.js";

import type {
  RouteGraphResponseDto,
} from "./railway/routeGraphDto.js";

import type {
  ScriptDocumentDto,
  ScriptStateDto,
} from "./scriptTypes.js";

import type {
  AddTrainTaskResult,
  LoadTrainTasksResult,
  TaskLifecycleEventPayload,
  TaskManagerActionResult,
  TaskManagerSnapshot,
  TaskRejectedPayload,
  TaskWaitingForLocoPayload,
} from "./task.js";

import type {
  FastClockSnapshot,
} from "./fastClock.js";

import type {
  RouteReservationChangedPayload,
  RouteReservationRejectedPayload,
  RouteReservationReleasedPayload,
  RouteReservationReleaseRejectedPayload,
} from "./routeReservation.js";

import type {
  AccessoryChangedPayload,
  BlockStateChangedPayload,
  LocoReservationChangedPayload,
  LocoStateChangedPayload,
  SensorChangedPayload,
  TurnoutChangedPayload,
} from "./railwayRuntimeEvents.js";

import type {
  CommandCenterInfoPayload,
  CommandCenterLockChangedPayload,
  CommandRejectedPayload,
  DccExDirectCommandResponsePayload,
  RBusInfo,
  RBusSensorInfo,
  WsPowerInfoPayload,
  Z21AccessoryInfoPayload,
  Z21SerialNumberPayload,
  Z21SystemStatePayload,
  Z21TurnoutInfoPayload,
} from "./commandCenterTelemetry.js";

import type {
  RuntimeVariableChangedPayload,
  RuntimeVariableRejectedPayload,
  RuntimeVariablesSnapshotPayload,
} from "./runtimeVariables.js";

export type WsMessage<T = any> = {
  type: string;
  data?: T;
  uuid: string | null;
};

export type ClientWsMessage<T = any> = {
  type: string;
  data?: T;
  uuid: string;
};

export type {
  ClientWsPayloadMap,
};

export type ClientWsMessageType =
  keyof ClientWsPayloadMap;

export const CLIENT_WS_MESSAGE_TYPES = [
  "setTrackPower",
  "setProgrammingPower",
  "emergencyStop",
  "writeDccExDirectCommand",
  "setLoco",
  "getLoco",
  "setLocoFunction",
  "reserveLoco",
  "releaseLocoReservation",
  "setTurnout",
  "setSensor",
  "setBasicAccessory",
  "setBlock",
  "setBlockRemove",
  "setBlocksReset",
  "getBlocks",
  "routeLock",
  "routeUnlock",
  "reserveRoute",
  "releaseRouteReservation",
  "clearAllRouteReservations",
  "getRouteReservations",
  "layoutCommand",
  "locosCommand",
  "scriptDocumentCommand",
  "commandCenterConfigCommand",
  "taskManagerCommand",
  "fastClockCommand",
  "fileCommand",
  "runScript",
  "stopScript",
  "getScriptRuntimeState",
  "startTask",
  "startAllTasks",
  "finishTask",
  "abortTask",
  "pauseTask",
  "pauseAllTasks",
  "resumeTask",
  "finishAllTasks",
  "abortAllTasks",
  "setRuntimeVariable",
  "getRuntimeVariables",
  "setEditorEditMode",
  "getTaskRuntimeState",
] as const satisfies readonly ClientWsMessageType[];

export function isClientWsMessageType(
  value: unknown
): value is ClientWsMessageType {
  return (
    typeof value === "string" &&
    (CLIENT_WS_MESSAGE_TYPES as readonly string[]).includes(value)
  );
}

export type TypedClientWsMessage<
  TType extends ClientWsMessageType = ClientWsMessageType
> = {
  [K in TType]: {
    type: K;
    data: ClientWsPayloadMap[K];
    uuid: string;
  };
}[TType];

export type ClientWsMessageUnion = {
  [K in ClientWsMessageType]: TypedClientWsMessage<K>;
}[ClientWsMessageType];

export type SetLocoMessage =
  TypedClientWsMessage<"setLoco">;

export type SetLocoFunctionMessage =
  TypedClientWsMessage<"setLocoFunction">;

export type ReserveLocoMessage =
  TypedClientWsMessage<"reserveLoco">;

export type ReleaseLocoReservationMessage =
  TypedClientWsMessage<"releaseLocoReservation">;

export type SetTurnoutMessage =
  TypedClientWsMessage<"setTurnout">;

export type SetSensorMessage =
  TypedClientWsMessage<"setSensor">;

export type ReserveRouteMessage =
  TypedClientWsMessage<"reserveRoute">;

export type ClearAllRouteReservationsMessage =
  TypedClientWsMessage<"clearAllRouteReservations">;

export type TurnoutChangedMessage = {
  type: "turnoutChanged";
  data: TurnoutChangedPayload;
};

export type AccessoryChangedMessage = {
  type: "accessoryChanged";
  data: AccessoryChangedPayload;
};

export type CommandCenterInfo = {
  type: "commandCenterInfo";
  data: CommandCenterInfoPayload;
};

export type RouteReservationChangedMessage = {
  type: "routeReservationChanged";
  data: RouteReservationChangedPayload;
};

export type RouteReservationRejectedMessage = {
  type: "routeReservationRejected";
  data: RouteReservationRejectedPayload;
};

export type EditorEditModeRejectedPayload = {
  reason: string;
  editingClients: string[];
};

export type LayoutResponsePayload = {
  requestId: string;
  action: "load" | "save" | "refreshRuntime" | "getRouteGraph";
  ok: boolean;
  message?: string;
  layout?: SerializedLayoutDto;
  routeGraph?: RouteGraphResponseDto;
};

export type LocosResponsePayload = {
  requestId: string;
  action: "load" | "save";
  ok: boolean;
  message?: string;
  locos?: Loco[];
  count?: number;
};

export type ScriptDocumentResponsePayload = {
  requestId: string;
  action: "load" | "save";
  ok: boolean;
  message?: string;
  document?: ScriptDocumentDto;
};

export type CommandCenterConfigResponsePayload = {
  requestId: string;
  action: "load" | "save";
  ok: boolean;
  message?: string;
  config?: ICommandCenter | null;
};

export type TaskManagerResponsePayload = {
  requestId: string;
  action:
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
  ok: boolean;
  message?: string;
  snapshot?: TaskManagerSnapshot;
  addResult?: AddTrainTaskResult;
  actionResult?: TaskManagerActionResult;
  loadResult?: LoadTrainTasksResult;
};

export type FastClockResponsePayload = {
  requestId: string;
  action: "snapshot" | "run" | "pause" | "reset" | "setSpeed";
  ok: boolean;
  message?: string;
  snapshot?: FastClockSnapshot;
};

export type FileResponsePayload = {
  requestId: string;
  action: "readText" | "writeText" | "readJson" | "writeJson";
  ok: boolean;
  fileName: string;
  message?: string;
  content?: string;
  data?: unknown;
};

export type ServerWsPayloadMap = {
  "ws:welcome": {
    message: string;
  };

  error: {
    message: string;
  };

  commandRejected: CommandRejectedPayload;

  commandCenterInfo: CommandCenterInfoPayload;

  commandCenterLockChanged: CommandCenterLockChangedPayload;

  dccExDirectCommandResponse: DccExDirectCommandResponsePayload;

  locoState: LocoStateChangedPayload;

  locoReservationChanged: LocoReservationChangedPayload;

  turnoutChanged: TurnoutChangedPayload;

  accessoryChanged: AccessoryChangedPayload;

  sensorChanged: SensorChangedPayload;

  blockStateChanged: BlockStateChangedPayload;

  routeReservationChanged: RouteReservationChangedPayload;

  routeReservationRejected: RouteReservationRejectedPayload;

  routeReservationReleaseRejected:
  RouteReservationReleaseRejectedPayload;

  routeReservationReleased: RouteReservationReleasedPayload;

  allRouteReservationsCleared: {};

  layoutResponse: LayoutResponsePayload;
  locosResponse: LocosResponsePayload;
  scriptDocumentResponse: ScriptDocumentResponsePayload;
  commandCenterConfigResponse: CommandCenterConfigResponsePayload;
  taskManagerResponse: TaskManagerResponsePayload;
  fastClockResponse: FastClockResponsePayload;
  fileResponse: FileResponsePayload;

  scriptRejected: {
    reason: string;
  };

  scriptDocumentChanged: ScriptDocumentDto;
  scriptStateChanged: ScriptStateDto | null;

  taskRejected: TaskRejectedPayload;

  taskManagerSnapshotChanged: TaskManagerSnapshot;

  taskWaitingForLoco: TaskWaitingForLocoPayload;

  taskCompleted: TaskLifecycleEventPayload;
  taskCycleCompleted: TaskLifecycleEventPayload;

  runtimeVariableChanged: RuntimeVariableChangedPayload;
  runtimeVariableRejected: RuntimeVariableRejectedPayload;
  runtimeVariablesSnapshot: RuntimeVariablesSnapshotPayload;

  editorEditModeRejected: EditorEditModeRejectedPayload;

  fastClockChanged: FastClockSnapshot;

  z21SystemState: Z21SystemStatePayload;
  powerInfo: WsPowerInfoPayload;

  rbusInfo: RBusInfo;

  z21SerialNumber: Z21SerialNumberPayload;

  z21TurnoutInfo: Z21TurnoutInfoPayload;

  z21AccessoryInfo: Z21AccessoryInfoPayload;

  rbusSensorChanged: RBusSensorInfo;
};

export type ServerWsMessageType =
  keyof ServerWsPayloadMap;

export type TypedServerWsMessage<
  TType extends ServerWsMessageType = ServerWsMessageType
> = {
  [K in TType]: {
    type: K;
    data: ServerWsPayloadMap[K];
    uuid?: string | null;
  };
}[TType];