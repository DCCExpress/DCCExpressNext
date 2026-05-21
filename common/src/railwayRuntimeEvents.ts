// common/src/railwayRuntimeEvents.ts

import type {
  BlockState,
  LocoReservation,
  LocoState,
} from "./domainTypes.js";

/**
 * Szerver -> kliens vasúti runtime event payloadok.
 *
 * Ezek az élő állapotfrissítések a command center,
 * a szimulátor és a kliens közös contractjai.
 */
export type LocoReservationChangedPayload = {
  locoAddress: number;
  reservation: LocoReservation | null;
};

export type LocoStateChangedPayload = {
  loco: LocoState;
};

export type TurnoutChangedPayload = {
  address: number;
  closed: boolean;
};

export type AccessoryChangedPayload = {
  address: number;
  active: boolean;
};

export type SensorChangedPayload = {
  address: number;
  on: boolean;
};

export type BlockStateChangedPayload =
  Record<string, BlockState>;
