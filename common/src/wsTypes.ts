// common/src/wsTypes.ts

import type {
  ClientWsPayloadMap,
} from "./clientWsCommands.js";

import type {
  ScriptDocumentDto,
  ScriptStateDto,
} from "./scriptTypes.js";

import type {
  TaskLifecycleEventPayload,
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

/**
 * Általános, szerveroldalon és bejövő kliensüzeneteknél is
 * használható WebSocket message alap.
 */
export type WsMessage<T = any> = {
  type: string;
  data?: T;
  uuid: string | null;
};

/**
 * Lazább kliensüzenet-alap.
 * A konkrét, típusos küldést a TypedClientWsMessage végzi.
 */
export type ClientWsMessage<T = any> = {
  type: string;
  data?: T;
  uuid: string;
};

export type {
  ClientWsPayloadMap,
};

/**
 * Kliens -> szerver parancs message type.
 */
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
  "runScript",
  "stopScript",
  "getScriptRuntimeState",
  "startTask",
  "finishTask",
  "abortTask",
  "pauseTask",
  "resumeTask",
"finishAllTasks",
  "abortAllTasks",
  "setRuntimeVariable",
  "getRuntimeVariables",
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

/**
 * Megtartott, konkrét server event aliasok.
 */
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

/**
 * Szerver -> kliens WebSocket események payload térképe.
 */
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
