// common/src/wsTypes.ts

import type {
  Direction,
} from "./domainTypes.js";

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
    source: string;
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
