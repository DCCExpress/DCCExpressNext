// common/src/wsTypes.ts

import type {
  Direction,
} from "./domainTypes.js";

/**
 * Általános, szerveroldalon és bejövő kliensüzeneteknél is
 * használható WebSocket message alap.
 *
 * A data szándékosan opcionális:
 * pl. routeLock / routeUnlock / getBlocks jellegű üzeneteknél
 * nincs értelmes payload.
 */
export type WsMessage<T = any> = {
  type: string;
  data?: T;
  uuid: string | null;
};

/**
 * Kliens -> szerver küldött üzenet.
 * A kliens API minden parancshoz saját, stabil UUID-t ad.
 */
export type ClientWsMessage<T = any> = {
  type: string;
  data?: T;
  uuid: string;
};

export type SetLocoMessage = ClientWsMessage<{
  locoAddress: number;
  speed: number;
  direction: Direction;
}> & {
  type: "setLoco";
};

export type SetLocoFunctionMessage = ClientWsMessage<{
  locoAddress: number;
  functionNumber: number;
  active: boolean;
}> & {
  type: "setLocoFunction";
};

export type SetTurnoutMessage = ClientWsMessage<{
  address: number;
  closed: boolean;
}> & {
  type: "setTurnout";
};

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

export type SetSensorMessage = ClientWsMessage<{
  address: number;
  on: boolean;
}> & {
  type: "setSensor";
};

export type CommandCenterInfo = {
  type: "commandCenterInfo";
  data: {
    type: string;
    alive: boolean;
    power: boolean;
  };
};

export type ReserveRouteMessage = ClientWsMessage<{
  fromBlockName: string;
  toBlockName: string;
}> & {
  type: "reserveRoute";
};

export type ClearAllRouteReservationsMessage = ClientWsMessage<{}> & {
  type: "clearAllRouteReservations";
};

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
