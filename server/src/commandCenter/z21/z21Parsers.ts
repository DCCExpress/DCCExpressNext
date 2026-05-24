// server/src/commandCenter/z21/z21Parsers.ts

import type {
  RBusInfo,
  RBusSensorInfo,
  Z21SystemStatePayload,
} from "../../../../common/src/types.js";

import {
  decodeLocoAddress,
  hasFlag,
  isZ21Header,
  LAN_RMBUS_DATACHANGED,
  LAN_SYSTEMSTATE_DATACHANGED,
  LAN_X_HEADER,
  LAN_X_LOCO_INFO,
  LAN_X_TURNOUT_INFO,
} from "./z21Protocol.js";

import {
  bufferToHex,
} from "../udpClient.js";

export type Z21TurnoutInfo = {
  address: number;
  closed: boolean;
  valid: boolean;
  state: string;
  rawState: number;
  functionAddress: number;
};

export type Z21LocoInfo = {
  address: number;
  speed: number;
  direction: "forward" | "reverse";
  functions: Record<number, boolean>;
};

export function parseSystemStatePacket(
  data: Buffer
): Z21SystemStatePayload {
  if (!isZ21Header(data, LAN_SYSTEMSTATE_DATACHANGED)) {
    throw new Error(
      `Invalid Z21 system state packet: ${bufferToHex(data)}`
    );
  }

  const len = data.readUInt16LE(0);

  if (len < 0x14 || data.length < 0x14) {
    throw new Error(
      `Invalid Z21 system state length: len=${len}, bufferLength=${data.length}`
    );
  }

  const mainCurrentMa = data.readInt16LE(4);
  const progCurrentMa = data.readInt16LE(6);
  const filteredMainCurrentMa = data.readInt16LE(8);
  const temperatureC = data.readInt16LE(10);
  const supplyVoltageMv = data.readUInt16LE(12);
  const vccVoltageMv = data.readUInt16LE(14);
  const centralState = data.readUInt8(16);
  const centralStateEx = data.readUInt8(17);
  const reserved = data.readUInt8(18);
  const capabilities = data.readUInt8(19);

  const powerInfo = {
    emergencyStop: hasFlag(centralState, 0x01),
    trackVoltageOff: hasFlag(centralState, 0x02),
    trackVoltageOn: !hasFlag(centralState, 0x02),
    shortCircuit: hasFlag(centralState, 0x04),
    programmingModeActive: hasFlag(centralState, 0x20),
  };

  return {
    mainCurrentMa,
    progCurrentMa,
    filteredMainCurrentMa,
    temperatureC,
    supplyVoltageMv,
    vccVoltageMv,
    centralState,
    centralStateEx,
    reserved,
    capabilities,
    powerInfo,
    flags: {
      highTemperature: hasFlag(centralStateEx, 0x01),
      powerLost: hasFlag(centralStateEx, 0x02),
      shortCircuitExternal: hasFlag(centralStateEx, 0x04),
      shortCircuitInternal: hasFlag(centralStateEx, 0x08),
      rcn213: hasFlag(centralStateEx, 0x20),
      capDcc: hasFlag(capabilities, 0x01),
      capMm: hasFlag(capabilities, 0x02),
      capRailCom: hasFlag(capabilities, 0x08),
      capLocoCmds: hasFlag(capabilities, 0x10),
      capAccessoryCmds: hasFlag(capabilities, 0x20),
      capDetectorCmds: hasFlag(capabilities, 0x40),
      capNeedsUnlockCode: hasFlag(capabilities, 0x80),
    },
  };
}

export function isTurnoutInfoPacket(data: Buffer): boolean {
  if (data.length < 9) {
    return false;
  }

  const len = data.readUInt16LE(0);
  const header = data.readUInt16LE(2);
  const xHeader = data.readUInt8(4);

  return (
    len === 0x09 &&
    header === LAN_X_HEADER &&
    xHeader === LAN_X_TURNOUT_INFO
  );
}

export function parseTurnoutInfoPacket(
  data: Buffer
): Z21TurnoutInfo | null {
  if (!isTurnoutInfoPacket(data)) {
    return null;
  }

  const xHeader = data.readUInt8(4);
  const msb = data.readUInt8(5);
  const lsb = data.readUInt8(6);
  const zzRaw = data.readUInt8(7);
  const xor = data.readUInt8(8);

  const valid = (xHeader ^ msb ^ lsb ^ zzRaw) === xor;
  const functionAddress = (msb << 8) + lsb;
  const address = functionAddress + 1;
  const zz = zzRaw & 0x03;

  let closed = false;
  let state = "NA";

  switch (zz) {
    case 0:
      state = "Turnout not switched yet";
      break;
    case 1:
      state = "pos: P0";
      closed = false;
      break;
    case 2:
      state = "pos: P1";
      closed = true;
      break;
    case 3:
      state = "Invalid";
      break;
  }

  return {
    address,
    closed,
    valid,
    state,
    rawState: zz,
    functionAddress,
  };
}

export function isLocoInfoPacket(data: Buffer): boolean {
  if (data.length < 11) {
    return false;
  }

  const len = data.readUInt16LE(0);
  const header = data.readUInt16LE(2);
  const xHeader = data.readUInt8(4);

  return (
    len >= 0x0b &&
    header === LAN_X_HEADER &&
    xHeader === LAN_X_LOCO_INFO
  );
}

export function parseLocoInfoPacket(
  data: Buffer
): Z21LocoInfo | null {
  if (!isLocoInfoPacket(data)) {
    return null;
  }

  const len = data.readUInt16LE(0);
  const adrMsb = data.readUInt8(5);
  const adrLsb = data.readUInt8(6);
  const db3 = data.readUInt8(8);

  const address = decodeLocoAddress(adrMsb, adrLsb);
  const rawSpeed = db3 & 0x7f;
  const direction: "forward" | "reverse" =
    (db3 & 0x80) !== 0 ? "forward" : "reverse";

  const speed =
    rawSpeed === 0
      ? 0
      : rawSpeed === 1
        ? 0
        : rawSpeed - 1;

  const functions: Record<number, boolean> = {};

  if (data.length > 9) {
    const db4 = data.readUInt8(9);
    functions[0] = (db4 & 0x10) !== 0;
    functions[1] = (db4 & 0x01) !== 0;
    functions[2] = (db4 & 0x02) !== 0;
    functions[3] = (db4 & 0x04) !== 0;
    functions[4] = (db4 & 0x08) !== 0;
  }

  if (data.length > 10) {
    const db5 = data.readUInt8(10);

    for (let i = 0; i < 8; i += 1) {
      functions[5 + i] = (db5 & (1 << i)) !== 0;
    }
  }

  if (data.length > 11) {
    const db6 = data.readUInt8(11);

    for (let i = 0; i < 8; i += 1) {
      functions[13 + i] = (db6 & (1 << i)) !== 0;
    }
  }

  if (data.length > 12) {
    const db7 = data.readUInt8(12);

    for (let i = 0; i < 8; i += 1) {
      functions[21 + i] = (db7 & (1 << i)) !== 0;
    }
  }

  if (len >= 15 && data.length > 13) {
    const db8 = data.readUInt8(13);

    for (let i = 0; i < 3; i += 1) {
      functions[29 + i] = (db8 & (1 << i)) !== 0;
    }
  }

  return {
    address,
    speed,
    direction,
    functions,
  };
}

export function isRBusDataChangedPacket(data: Buffer): boolean {
  if (data.length < 15) {
    return false;
  }

  const len = data.readUInt16LE(0);
  const header = data.readUInt16LE(2);

  return len === 0x0f && header === LAN_RMBUS_DATACHANGED;
}

export function parseRBusDataChangedPacket(
  data: Buffer
): RBusInfo | null {
  if (!isRBusDataChangedPacket(data)) {
    return null;
  }

  return {
    group: data.readUInt8(4),
    bytes: Array.from(data.subarray(5, 15)),
  };
}

export function decodeRBusSensors(
  group: number,
  bytes: number[],
  previousBytes: number[]
): RBusSensorInfo[] {
  const changedSensors: RBusSensorInfo[] = [];

  for (let byteIndex = 0; byteIndex < 10; byteIndex += 1) {
    const currentByte = bytes[byteIndex] ?? 0;
    const previousByte = previousBytes[byteIndex] ?? 0;
    const changedBits = currentByte ^ previousByte;

    if (changedBits === 0) {
      continue;
    }

    for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
      const mask = 1 << bitIndex;

      if ((changedBits & mask) === 0) {
        continue;
      }

      const on = (currentByte & mask) !== 0;
      const moduleAddress = group * 10 + byteIndex + 1;
      const input = bitIndex + 1;
      const address = (moduleAddress - 1) * 8 + input;

      changedSensors.push({
        address,
        moduleAddress,
        input,
        on,
        group,
        byteIndex,
        bitIndex,
      });
    }
  }

  return changedSensors;
}
