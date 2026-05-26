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

export type LocoTrainType =
  | "passenger"
  | "freight"
  | "mixed"
  | "maintenance"
  | "other";

export type LocoOccupancyDetectionPosition =
  | "forward"
  | "reverse"
  | "both";

export type LocoActionHook =
  | "beforeStart"
  | "afterStart"
  | "beforeStop"
  | "afterStop";

export type LocoAction =
  | {
      id: string;
      type: "setFunction";
      functionNumber: number;
      active: boolean;
    }
  | {
      id: string;
      type: "momentaryFunction";
      functionNumber: number;
      ms: number;
    }
  | {
      id: string;
      type: "playAudio";
      fileName: string;
    }
  | {
      id: string;
      type: "wait";
      ms: number;
    };

export type LocoActionHooks = Partial<Record<LocoActionHook, LocoAction[]>>;

export type BlockActionHook =
  | "onTrainEnter"
  | "onTrainLeave";

export type BlockAction =
  | {
      id: string;
      type: "playAudio";
      fileName: string;
    }
  | {
      id: string;
      type: "wait";
      ms: number;
    };

export type BlockActionHooks = Partial<Record<BlockActionHook, BlockAction[]>>;

export type Loco = {
  id: string;
  name: string;
  address: number;
  maxSpeed: number;
  invert: boolean;
  image?: string;
  length: number;
  trainType?: LocoTrainType;
  occupancyDetectionPosition?: LocoOccupancyDetectionPosition;
  lastRunAt?: string;
  functions: LocoFunction[];
  actions?: LocoActionHooks;
};


export type ReservationOwnerType = "task" | "client" | "system";

export type LocoReservation = {
  locoAddress: number;
  ownerId: string;
  ownerType: ReservationOwnerType;
  ownerName?: string;
  reason?: string;
  reservedAt: number;
};

export type LocoState = {
  address: number;
  speed: number;
  direction: Direction;
  lastRunAt?: string;
  functions: Record<number, boolean>;
  reservation?: LocoReservation;
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
  name?: string;
  type: CommandCenterType;
  z21: {
    host?: string;
    port?: number;
  };
  dccexTcp: {
    host?: string;
    port?: number;
    init?: string;
  };
  dccexSerial: {
    serialPort?: string;
    baudRate?: number;
    init?: string;
  };
  autoConnect?: boolean;
}

export interface PowerInfo {
  trackVoltageOn: boolean;
  emergencyStop: boolean;
  shortCircuit: boolean;
  current: number;
}