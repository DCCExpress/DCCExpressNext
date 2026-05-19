// common/src/domainTypes.ts

export type Direction =
  | "forward"
  | "reverse";

export interface TurnoutInfo {
  address: number;
  closed: boolean;
}

export interface SensorInfo {
  address: number;
  active: boolean;
}

export interface AccessoryInfo {
  address: number;
  active: boolean;
}

export type LocoFunction = {
  id: string;
  number: number;
  name: string;
  icon: string;
  momentary: boolean;
  active?: boolean;
};

export type Loco = {
  id: string;
  name: string;
  address: number;
  maxSpeed: number;
  invert: boolean;
  image?: string;
  length: number;
  functions: LocoFunction[];
};

export type LocoState = {
  address: number;
  speed: number;
  direction: Direction;
  functions: Record<number, boolean>;
};

export type BlockState = {
  blockId: string;
  locoId: string | null;
};

export type CommandCenterType =
  | "z21"
  | "dcc-ex-tcp"
  | "dcc-ex-serial"
  | "simulator";

export interface ICommandCenter {
  name: string;
  type: CommandCenterType;
  z21: {
    host?: string;
    port?: number;
  };
  dccexTcp: {
    host?: string;
    port?: number;
  };
  dccexSerial: {
    serialPort?: string;
    baudRate?: number;
  };
  autoConnect?: boolean;
}

export interface PowerInfo {
  trackVoltageOn: boolean;
  emergencyStop: boolean;
  shortCircuit: boolean;
  current: number;
}
