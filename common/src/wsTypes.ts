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
  AppSettings,
} from "./appSettings.js";

import type {
  ServerRuntimeStatsSnapshot,
} from "./serverRuntimeStats.js";

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
  "getLayoutRuntimeSnapshot",
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
  "appSettingsCommand",
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

export type RouteReservationReleasedMessage = {
  type: "routeReservationReleased";
  data: RouteReservationReleasedPayload;
};

export type RouteReservationReleaseRejectedMessage = {
  type: "routeReservationReleaseRejected";
  data: RouteReservationReleaseRejectedPayload;
};

export type TypedServerWsMessage =
  | { type: "ws:welcome"; data: { message: string } }
  | { type: "error"; data: { message: string } }
  | { type: "commandRejected"; uuid?: string | null; data: CommandRejectedPayload }
  | { type: "editorEditModeRejected"; data: { reason: string } }
  | { type: "commandCenterInfo"; data: CommandCenterInfoPayload }
  | { type: "commandCenterLockChanged"; data: CommandCenterLockChangedPayload }
  | { type: "powerInfo"; data: WsPowerInfoPayload }
  | { type: "turnoutChanged"; data: TurnoutChangedPayload }
  | { type: "sensorChanged"; data: SensorChangedPayload }
  | { type: "accessoryChanged"; data: AccessoryChangedPayload }
  | { type: "blockStateChanged"; data: BlockStateChangedPayload }
  | { type: "locoState"; data: LocoStateChangedPayload }
  | { type: "locoReservationChanged"; data: LocoReservationChangedPayload }
  | { type: "routeReservationChanged"; data: RouteReservationChangedPayload }
  | { type: "routeReservationRejected"; data: RouteReservationRejectedPayload }
  | { type: "routeReservationReleased"; data: RouteReservationReleasedPayload }
  | { type: "routeReservationReleaseRejected"; data: RouteReservationReleaseRejectedPayload }
  | { type: "allRouteReservationsCleared"; data: {} }
  | { type: "z21SystemState"; data: Z21SystemStatePayload }
  | { type: "z21TurnoutInfo"; data: Z21TurnoutInfoPayload }
  | { type: "z21AccessoryInfo"; data: Z21AccessoryInfoPayload }
  | { type: "z21SerialNumber"; data: Z21SerialNumberPayload }
  | { type: "dccExDirectCommandResponse"; data: DccExDirectCommandResponsePayload }
  | { type: "rbusInfo"; data: RBusInfo }
  | { type: "rbusSensorChanged"; data: RBusSensorInfo }
  | { type: "scriptDocumentChanged"; data: ScriptDocumentDto }
  | { type: "scriptStateChanged"; data: ScriptStateDto }
  | { type: "taskManagerSnapshotChanged"; data: TaskManagerSnapshot }
  | { type: "taskManagerResponse"; data: any }
  | { type: "taskRejected"; data: TaskRejectedPayload }
  | { type: "taskWaitingForLoco"; data: TaskWaitingForLocoPayload }
  | { type: "taskCycleCompleted"; data: TaskLifecycleEventPayload }
  | { type: "fastClockChanged"; data: FastClockSnapshot }
  | { type: "runtimeVariableChanged"; data: RuntimeVariableChangedPayload }
  | { type: "runtimeVariableRejected"; data: RuntimeVariableRejectedPayload }
  | { type: "runtimeVariablesSnapshot"; data: RuntimeVariablesSnapshotPayload }
  | { type: "serverRuntimeStatsChanged"; data: ServerRuntimeStatsSnapshot }
  | { type: "layoutResponse"; data: any }
  | { type: "locosResponse"; data: any }
  | { type: "scriptDocumentResponse"; data: any }
  | { type: "commandCenterConfigResponse"; data: any }
  | { type: "appSettingsResponse"; data: any }
  | { type: "fastClockResponse"; data: any }
  | { type: "fileResponse"; data: any }
  | { type: "playAudio"; data: { fileName: string } }
  | { type: "locoActionListStatus"; data: any }
  | { type: "blockActionListStatus"; data: any };

export type ServerWsMessageType =
  TypedServerWsMessage["type"];

export type ServerWsPayloadMap = {
  [M in TypedServerWsMessage as M["type"]]: M["data"];
};