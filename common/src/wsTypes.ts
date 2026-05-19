// common/src/wsTypes.ts

import type {
  BlockState,
  Direction,
  LocoState,
} from "./domainTypes.js";

import type {
  ScriptDocumentDto,
  ScriptRunSource,
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
  CommandCenterInfoPayload,
  CommandCenterLockChangedPayload,
  CommandRejectedPayload,
  RBusInfo,
  RBusSensorInfo,
  WsPowerInfoPayload,
  Z21AccessoryInfoPayload,
  Z21SerialNumberPayload,
  Z21SystemStatePayload,
  Z21TurnoutInfoPayload,
} from "./commandCenterTelemetry.js";

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

/**
 * Kliens -> szerver WebSocket parancsok payload térképe.
 */
export type ClientWsPayloadMap = {
  setTrackPower: {
    on: boolean;
  };

  emergencyStop: {};

  setLoco: {
    locoAddress: number;
    speed: number;
    direction: Direction;
  };

  getLoco: {
    locoAddress: number;
  };

  setLocoFunction: {
    locoAddress: number;
    functionNumber: number;
    active: boolean;
  };

  setTurnout: {
    address: number;
    closed: boolean;
  };

  setSensor: {
    address: number;
    on: boolean;
  };

  setBasicAccessory: {
    address: number;
    active: boolean;
  };

  setBlock: {
    blockId: string;
    locoId: string | null;
  };

  setBlockRemove: {
    blockId: string;
    locoId: string | null;
  };

  setBlocksReset: {};
  getBlocks: {};

  routeLock: {};
  routeUnlock: {};

  reserveRoute: {
    fromBlockName: string;
    toBlockName: string;
  };

  releaseRouteReservation: {
    fromBlockName: string;
    toBlockName: string;
  };

  clearAllRouteReservations: {};
  getRouteReservations: {};

  runScript: {
    script?: string;
    source: ScriptRunSource;
    elementId: string | null;
  };

  stopScript: {};
  getScriptRuntimeState: {};

  startTask: {
    taskIdOrName: string;
  };

  finishTask: {
    taskIdOrName: string;
  };

  abortTask: {
    taskIdOrName: string;
  };

  pauseTask: {
    taskIdOrName: string;
  };

  resumeTask: {
    taskIdOrName: string;
  };

  finishAllTasks: {};
  abortAllTasks: {};
  getTaskRuntimeState: {};
};

export type ClientWsMessageType =
  keyof ClientWsPayloadMap;

export const CLIENT_WS_MESSAGE_TYPES = [
  "setTrackPower",
  "emergencyStop",
  "setLoco",
  "getLoco",
  "setLocoFunction",
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
  data: {
    address: number;
    closed: boolean;
  };
};

export type AccessoryChangedMessage = {
  type: "accessoryChanged";
  data: {
    address: number;
    active: boolean;
  };
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

  locoState: {
    loco: LocoState;
  };

  turnoutChanged: {
    address: number;
    closed: boolean;
  };

  accessoryChanged: {
    address: number;
    active: boolean;
  };

  /**
   * Egységes szerver -> kliens szenzor esemény.
   * A külső WS contractban minden command center `on` mezőt használ.
   */
  sensorChanged: {
    address: number;
    on: boolean;
  };

  blockStateChanged: Record<string, BlockState>;

  routeReservationChanged: RouteReservationChangedPayload;

  routeReservationRejected: RouteReservationRejectedPayload;

  routeReservationReleaseRejected: RouteReservationReleaseRejectedPayload;

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
