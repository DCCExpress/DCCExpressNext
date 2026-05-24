// server/src/commandCenter/z21/z21CommandBuilders.ts

import {
  buildLanXPacket,
  encodeLocoAddress,
  LAN_X_GET_LOCO_INFO,
  LAN_X_GET_TURNOUT_INFO,
  LAN_X_SET_LOCO_DRIVE,
  LAN_X_SET_LOCO_FUNCTION,
  LAN_X_SET_STOP,
  LAN_X_SET_TRACK_POWER_OFF,
  LAN_X_SET_TRACK_POWER_ON,
  LAN_X_SET_TURNOUT,
  toZ21FunctionAddress,
  Z21_LOCO_FUNCTION,
  Z21_SPEED_STEPS_128,
  clampInt,
} from "./z21Protocol.js";

export type Z21TurnoutCommandPackets = {
  functionAddress: number;
  activatePacket: Buffer;
  deactivatePacket: Buffer;
};

export type Z21LocoDriveCommandPacket = {
  normalizedSpeed: number;
  packet: Buffer;
};

export type Z21LocoFunctionCommandPacket = {
  functionByte: number;
  packet: Buffer;
};

export function buildSetTurnoutPackets(
  address: number,
  closed: boolean
): Z21TurnoutCommandPackets {
  const functionAddress = toZ21FunctionAddress(address);
  const msb = (functionAddress >> 8) & 0xff;
  const lsb = functionAddress & 0xff;
  const position = closed ? 1 : 0;

  const activateDb2 = 0x88 | position;
  const deactivateDb2 = 0x80 | position;

  return {
    functionAddress,
    activatePacket: buildLanXPacket([
      LAN_X_SET_TURNOUT,
      msb,
      lsb,
      activateDb2,
    ]),
    deactivatePacket: buildLanXPacket([
      LAN_X_SET_TURNOUT,
      msb,
      lsb,
      deactivateDb2,
    ]),
  };
}

export function buildGetTurnoutInfoPacket(
  address: number
): { functionAddress: number; packet: Buffer } {
  const functionAddress = toZ21FunctionAddress(address);
  const msb = (functionAddress >> 8) & 0xff;
  const lsb = functionAddress & 0xff;

  return {
    functionAddress,
    packet: buildLanXPacket([
      LAN_X_GET_TURNOUT_INFO,
      msb,
      lsb,
    ]),
  };
}

export function buildSetLocoDrivePacket(
  address: number,
  speed: number,
  direction: "forward" | "reverse"
): Z21LocoDriveCommandPacket {
  const { msb, lsb } = encodeLocoAddress(address);
  const normalizedSpeed = clampInt(speed, 0, 126);
  const z21Speed = normalizedSpeed === 0 ? 0 : normalizedSpeed + 1;
  const directionBit = direction === "forward" ? 0x80 : 0x00;
  const speedByte = directionBit | z21Speed;

  return {
    normalizedSpeed,
    packet: buildLanXPacket([
      LAN_X_SET_LOCO_DRIVE,
      Z21_SPEED_STEPS_128,
      msb,
      lsb,
      speedByte,
    ]),
  };
}

export function buildGetLocoInfoPacket(
  address: number
): Buffer {
  const { msb, lsb } = encodeLocoAddress(address);

  return buildLanXPacket([
    LAN_X_GET_LOCO_INFO,
    0xf0,
    msb,
    lsb,
  ]);
}

export function buildSetLocoFunctionPacket(
  address: number,
  fn: number,
  active: boolean
): Z21LocoFunctionCommandPacket {
  if (!Number.isInteger(fn) || fn < 0 || fn > 28) {
    throw new Error(`Invalid loco function index: ${fn}`);
  }

  const { msb, lsb } = encodeLocoAddress(address);
  const functionByte = (active ? 0x40 : 0x00) | (fn & 0x3f);

  return {
    functionByte,
    packet: buildLanXPacket([
      LAN_X_SET_LOCO_FUNCTION,
      Z21_LOCO_FUNCTION,
      msb,
      lsb,
      functionByte,
    ]),
  };
}

export function buildSetBasicAccessoryPacket(
  address: number,
  active: boolean
): { functionAddress: number; packet: Buffer } {
  const functionAddress = toZ21FunctionAddress(address);
  const msb = (functionAddress >> 8) & 0xff;
  const lsb = functionAddress & 0xff;
  const position = 0;
  const db2 = active
    ? 0x88 | position
    : 0x80 | position;

  return {
    functionAddress,
    packet: buildLanXPacket([
      LAN_X_SET_TURNOUT,
      msb,
      lsb,
      db2,
    ]),
  };
}

export function buildSetTrackPowerPacket(on: boolean): Buffer {
  return buildLanXPacket(
    on
      ? LAN_X_SET_TRACK_POWER_ON
      : LAN_X_SET_TRACK_POWER_OFF
  );
}

export function buildEmergencyStopPacket(): Buffer {
  return buildLanXPacket(LAN_X_SET_STOP);
}
