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
  TaskManagerSnapshot,
} from "./task.js";

import type {
  FastClockSnapshot,
} from "./fastClock.js";

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
  data: {
    alive: boolean;
    power?: boolean;
    type?: string;
    name?: string;
    ip?: string;
    port?: number;
  };
};

export type RouteReservationChangedMessage = {
  type: "routeReservationChanged";
  data: {
    busy: boolean;
    sectionNames: string[];
    elementIds: string[];
    turnoutAddresses: number[];
    fromBlockName?: string;
    toBlockName?: string;
  };
};

export type RouteReservationRejectedMessage = {
  type: "routeReservationRejected";
  data: {
    reason: string;
  };
};

type TaskLifecycleEventPayload = {
  taskId: string;
  taskName: string;
  fromBlockId: string;
  toBlockId: string;
  completedAt: number;
  message: string;
};

export type WsPowerInfoPayload = {
  emergencyStop: boolean;
  trackVoltageOn: boolean;
  trackVoltageOff: boolean;
  shortCircuit: boolean;
  programmingModeActive: boolean;
};

export type Z21SystemStatePayload = {
  mainCurrentMa: number;
  progCurrentMa: number;
  filteredMainCurrentMa: number;
  temperatureC: number;
  supplyVoltageMv: number;
  vccVoltageMv: number;
  centralState: number;
  centralStateEx: number;
  reserved: number;
  capabilities: number;

  powerInfo: WsPowerInfoPayload;

  flags: {
    highTemperature: boolean;
    powerLost: boolean;
    shortCircuitExternal: boolean;
    shortCircuitInternal: boolean;
    rcn213: boolean;

    capDcc: boolean;
    capMm: boolean;
    capRailCom: boolean;
    capLocoCmds: boolean;
    capAccessoryCmds: boolean;
    capDetectorCmds: boolean;
    capNeedsUnlockCode: boolean;
  };
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

  commandRejected: {
    reason: string;
    lockOwner: string | null;
  };

  commandCenterInfo: {
    alive: boolean;
    power?: boolean;
    type?: string;
    name?: string;
    ip?: string;
    port?: number;
  };

  commandCenterLockChanged: {
    locked: boolean;
    lockOwner: string | null;
    reason?: "route" | "task-route" | null;
  };

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
   * A projektben jelenleg két alak is előfordul:
   * - simulator: on
   * - Z21 cache rebroadcast: active
   *
   * A későbbi szenzor-egységesítésnél érdemes egyetlen mezőre átállni.
   */
  sensorChanged: {
    address: number;
    on?: boolean;
    active?: boolean;
  };

  blockStateChanged: Record<string, BlockState>;

  routeReservationChanged: {
    busy: boolean;
    sectionNames: string[];
    elementIds: string[];
    turnoutAddresses: number[];
    fromBlockName?: string;
    toBlockName?: string;
  };

  routeReservationRejected: {
    reason: string;
  };

  routeReservationReleaseRejected: {
    reason: string;
  };

  routeReservationReleased: {
    fromBlockName: string;
    toBlockName: string;
    releasedSectionNames: string[];
    retainedSectionNames: string[];
    releasedTurnoutAddresses: number[];
    retainedTurnoutAddresses: number[];
  };

  allRouteReservationsCleared: {};

  scriptRejected: {
    reason: string;
  };

  scriptDocumentChanged: ScriptDocumentDto;
  scriptStateChanged: ScriptStateDto | null;

  taskRejected: {
    reason: string;
  };

  taskManagerSnapshotChanged: TaskManagerSnapshot;

  taskWaitingForLoco: {
    taskId: string;
    taskName: string;
    blockId: string;
    message: string;
  };

  taskCompleted: TaskLifecycleEventPayload;
  taskCycleCompleted: TaskLifecycleEventPayload;

  fastClockChanged: FastClockSnapshot;

  z21SystemState: Z21SystemStatePayload;
  powerInfo: WsPowerInfoPayload;

  rbusInfo: {
    group: number;
    bytes: number[];
  };

  z21SerialNumber: {
    serialNumber: number;
  };

  z21TurnoutInfo: {
    address: number;
    closed: boolean;
    valid: boolean;
    state: string;
    source?: string;
    rawState?: number;
    functionAddress?: number;
  };

  z21AccessoryInfo: {
    address: number;
    active: boolean;
  };

  rbusSensorChanged: {
    address: number;
    moduleAddress: number;
    input: number;
    on: boolean;
    group: number;
    byteIndex: number;
    bitIndex: number;
  };
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
