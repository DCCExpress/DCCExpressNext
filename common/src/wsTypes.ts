// common/src/wsTypes.ts

import type {
  BlockState,
  Direction,
  LocoState,
} from "./domainTypes.js";

import type {
  ScriptRunSource,
} from "./scriptTypes.js";

/**
 * Általános, szerveroldalon és bejövő kliensüzeneteknél is
 * használható WebSocket message alap.
 *
 * A data szándékosan opcionális:
 * régebbi és szerverről érkező üzenetek között is van olyan,
 * ahol nincs értelmes payload.
 */
export type WsMessage<T = any> = {
  type: string;
  data?: T;
  uuid: string | null;
};

/**
 * Lazább kliensüzenet-alap.
 *
 * Ezt megtartjuk kompatibilitási célból, de az új wsApi.send()
 * már a ClientWsPayloadMap alapján típusosított
 * TypedClientWsMessage formát állítja elő.
 */
export type ClientWsMessage<T = any> = {
  type: string;
  data?: T;
  uuid: string;
};

/**
 * Kliens -> szerver WebSocket parancsok payload térképe.
 *
 * Ez a wsApi.send() típusalapja:
 * ha itt el van írva egy mezőnév, a kliensoldali fordítás
 * rögtön szólni fog.
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

export type SetSensorMessage =
  TypedClientWsMessage<"setSensor">;

export type CommandCenterInfo = {
  type: "commandCenterInfo";
  data: {
    type: string;
    alive: boolean;
    power: boolean;
  };
};

export type ReserveRouteMessage =
  TypedClientWsMessage<"reserveRoute">;

export type ClearAllRouteReservationsMessage =
  TypedClientWsMessage<"clearAllRouteReservations">;

export type RouteReservationChangedMessage = {
  type: "routeReservationChanged";
  data: {
    busy: boolean;
    sectionNames: string[];
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


/**
 * Szerver -> kliens WebSocket események payload térképe.
 *
 * Ez az első, óvatos közös alap:
 * - a stabil, egyszerű server eventek már pontos payloadot kapnak,
 * - a jelenleg még szerver-local DTO-kat használó eseményeknél
 *   szándékosan unknown marad a payload.
 *
 * A következő sprintben ezek közül több DTO-t is commonba lehet emelni,
 * majd a wsServer send/broadcast segédfüggvényeit erre a térképre húzni.
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
  };

  commandCenterLockChanged: {
    locked: boolean;
    lockOwner: string | null;
    reason?: "route" | null;
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

  sensorChanged: {
    address: number;
    on: boolean;
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

  taskRejected: {
    reason: string;
  };

  /**
   * Ezek payloadja jelenleg szerveroldali DTO-kból él.
   * A következő common-DTO sprintben pontosíthatók.
   */
  scriptDocumentChanged: unknown;
  scriptStateChanged: unknown;
  taskManagerSnapshotChanged: unknown;
  fastClockChanged: unknown;

  /**
   * A z21 és command center specifikus státuszcsomagokat
   * most még nem betonozzuk be commonban.
   */
  z21SystemState: unknown;
  powerInfo: unknown;
  rbusInfo: unknown;
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
