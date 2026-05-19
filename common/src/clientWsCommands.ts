// common/src/clientWsCommands.ts

import type {
  Direction,
} from "./domainTypes.js";

import type {
  ScriptRunSource,
} from "./scriptTypes.js";

/**
 * Kliens -> szerver WebSocket parancsok payload DTO-i.
 *
 * A wsTypes.ts innentől nem tárol domain payload definíciókat,
 * hanem csak a WebSocket envelope-okat és message mapeket rakja össze.
 */

export type EmptyClientWsCommandPayload = {};

export type SetTrackPowerCommandPayload = {
  on: boolean;
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

export type RunScriptCommandPayload = {
  script?: string;
  source: ScriptRunSource;
  elementId: string | null;
};

export type TaskIdOrNameCommandPayload = {
  taskIdOrName: string;
};

/**
 * Kliens -> szerver parancstérkép.
 *
 * Ebből épül:
 * - ClientWsMessageType
 * - TypedClientWsMessage
 * - ClientWsMessageUnion
 */
export type ClientWsPayloadMap = {
  setTrackPower: SetTrackPowerCommandPayload;
  emergencyStop: EmptyClientWsCommandPayload;

  setLoco: SetLocoCommandPayload;
  getLoco: GetLocoCommandPayload;
  setLocoFunction: SetLocoFunctionCommandPayload;

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

  runScript: RunScriptCommandPayload;
  stopScript: EmptyClientWsCommandPayload;
  getScriptRuntimeState: EmptyClientWsCommandPayload;

  startTask: TaskIdOrNameCommandPayload;
  finishTask: TaskIdOrNameCommandPayload;
  abortTask: TaskIdOrNameCommandPayload;
  pauseTask: TaskIdOrNameCommandPayload;
  resumeTask: TaskIdOrNameCommandPayload;
  finishAllTasks: EmptyClientWsCommandPayload;
  abortAllTasks: EmptyClientWsCommandPayload;
  getTaskRuntimeState: EmptyClientWsCommandPayload;
};
