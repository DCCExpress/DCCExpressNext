// common/src/commandCenterTelemetry.ts

/**
 * Szerver -> kliens power állapot payload.
 * Ez a WS contract része, nem azonos a belső CommandCenter PowerInfo típussal.
 */
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

export type CommandCenterInfoPayload = {
  alive: boolean;
  power?: boolean;
  type?: string;
  name?: string;
  ip?: string;
  port?: number;
  serialPort?: string;
  connectionString?: string;
};

export type CommandCenterLockChangedPayload = {
  locked: boolean;
  lockOwner: string | null;
  reason?: "route" | "task-route" | null;
};

export type CommandRejectedPayload = {
  reason: string;
  lockOwner: string | null;
};

export type DccExDirectCommandResponsePayload = {
  response: string;
};

export type RBusInfo = {
  group: number;
  bytes: number[];
};

export type RBusSensorInfo = {
  address: number;
  moduleAddress: number;
  input: number;
  on: boolean;
  group: number;
  byteIndex: number;
  bitIndex: number;
};

export type Z21SerialNumberPayload = {
  serialNumber: number;
};

export type Z21TurnoutInfoPayload = {
  address: number;
  closed: boolean;
  valid: boolean;
  state: string;
  source?: string;
  rawState?: number;
  functionAddress?: number;
};

export type Z21AccessoryInfoPayload = {
  address: number;
  active: boolean;
};
