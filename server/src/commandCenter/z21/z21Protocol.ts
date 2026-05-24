// server/src/commandCenter/z21/z21Protocol.ts

export const LAN_X_HEADER = 0x0040;

export const LAN_X_SET_TRACK_POWER_OFF = [0x21, 0x80] as const;
export const LAN_X_SET_TRACK_POWER_ON = [0x21, 0x81] as const;
export const LAN_X_SET_STOP = [0x80] as const;

export const LAN_X_GET_TURNOUT_INFO = 0x43;
export const LAN_X_SET_TURNOUT = 0x53;
export const LAN_X_TURNOUT_INFO = 0x43;

export const LAN_X_GET_LOCO_INFO = 0xe3;
export const LAN_X_SET_LOCO_DRIVE = 0xe4;
export const LAN_X_SET_LOCO_FUNCTION = 0xe4;
export const LAN_X_LOCO_INFO = 0xef;

export const Z21_SPEED_STEPS_128 = 0x13;
export const Z21_LOCO_FUNCTION = 0xf8;

export const LAN_SYSTEMSTATE_GETDATA = 0x0085;
export const LAN_SYSTEMSTATE_DATACHANGED = 0x0084;

export const LAN_SET_BROADCASTFLAGS = 0x0050;

export const BC_ALL = 0x00000001;
export const BC_RBUS = 0x00000002;
export const BC_SYSTEM_STATE = 0x00000100;

export const LAN_RMBUS_DATACHANGED = 0x0080;
export const LAN_RMBUS_GETDATA = 0x0081;
export const LAN_RMBUS_PROGRAMMODULE = 0x0082;

export function buildZ21Packet(
  header: number,
  payload?: Buffer
): Buffer {
  const data = payload ?? Buffer.alloc(0);
  const len = 4 + data.length;

  const packet = Buffer.alloc(len);

  packet.writeUInt16LE(len, 0);
  packet.writeUInt16LE(header, 2);

  data.copy(packet, 4);

  return packet;
}

export function buildLanXPacket(
  bytesWithoutXor: readonly number[]
): Buffer {
  const xor = bytesWithoutXor.reduce(
    (acc, value) => acc ^ value,
    0
  );

  const payload = Buffer.from([
    ...bytesWithoutXor,
    xor,
  ]);

  return buildZ21Packet(
    LAN_X_HEADER,
    payload
  );
}

export function isZ21Header(
  buffer: Buffer,
  header: number
): boolean {
  if (buffer.length < 4) {
    return false;
  }

  const len = buffer.readUInt16LE(0);
  const packetHeader = buffer.readUInt16LE(2);

  return len <= buffer.length && packetHeader === header;
}

export function splitZ21Packets(buffer: Buffer): Buffer[] {
  const packets: Buffer[] = [];
  let offset = 0;

  while (offset + 4 <= buffer.length) {
    const len = buffer.readUInt16LE(offset);

    if (len <= 0) {
      throw new Error(
        `Invalid Z21 packet length: len=${len}, offset=${offset}`
      );
    }

    if (offset + len > buffer.length) {
      throw new Error(
        `Z21 packet size mismatch: len=${len}, offset=${offset}, bufferLength=${buffer.length}`
      );
    }

    packets.push(buffer.subarray(offset, offset + len));
    offset += len;
  }

  if (offset !== buffer.length) {
    throw new Error(
      `Z21 trailing bytes: offset=${offset}, bufferLength=${buffer.length}`
    );
  }

  return packets;
}

export function containsZ21Header(
  buffer: Buffer,
  header: number
): boolean {
  try {
    return splitZ21Packets(buffer).some(packet =>
      isZ21Header(packet, header)
    );
  } catch {
    return false;
  }
}

export function toZ21FunctionAddress(address: number): number {
  if (!Number.isInteger(address) || address < 1) {
    throw new Error(`Invalid turnout address: ${address}`);
  }

  return address - 1;
}

export function encodeLocoAddress(
  address: number
): { msb: number; lsb: number } {
  if (!Number.isInteger(address) || address < 1 || address > 9999) {
    throw new Error(`Invalid loco address: ${address}`);
  }

  let msb = (address >> 8) & 0x3f;
  const lsb = address & 0xff;

  if (address >= 128) {
    msb |= 0xc0;
  }

  return { msb, lsb };
}

export function decodeLocoAddress(
  msb: number,
  lsb: number
): number {
  return ((msb & 0x3f) << 8) | lsb;
}

export function hasFlag(
  value: number,
  flag: number
): boolean {
  return (value & flag) === flag;
}

export function clampInt(
  value: number,
  min: number,
  max: number
): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(
    min,
    Math.min(max, Math.round(value))
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });
}
