#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  typesIndex: path.join(
    ROOT,
    "common/src/types.ts"
  ),
  domainTypes: path.join(
    ROOT,
    "common/src/domainTypes.ts"
  ),
  scriptTypes: path.join(
    ROOT,
    "common/src/scriptTypes.ts"
  ),
  wsTypes: path.join(
    ROOT,
    "common/src/wsTypes.ts"
  ),
};

function fail(message) {
  throw new Error(message);
}

function ensureExisting(file) {
  if (!fs.existsSync(file)) {
    fail(`Hiányzó fájl: ${path.relative(ROOT, file)}`);
  }
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Írva: ${path.relative(ROOT, file)}`);
}

const DOMAIN_TYPES = `// common/src/domainTypes.ts

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
`;

const SCRIPT_TYPES = `// common/src/scriptTypes.ts

export type SingleScriptFile = {
  content: string;
  autoStart?: boolean;
  updatedAt?: string;
};
`;

const WS_TYPES = `// common/src/wsTypes.ts

import type {
  Direction,
} from "./domainTypes.js";

export type SetLocoMessage = {
  type: "setLoco";
  data: {
    address: number;
    speed: number;
    direction: Direction;
  };
};

export type SetLocoFunctionMessage = {
  type: "setLocoFunction";
  data: {
    fn: number;
    on: boolean;
  };
};

export type SetTurnoutMessage = {
  type: "setTurnout";
  data: {
    address: number;
    closed: boolean;
  };
  uuid: string;
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

export type SetSensorMessage = {
  type: "setSensor";
  data: {
    address: number;
    on: boolean;
  };
  uuid: string;
};

export type CommandCenterInfo = {
  type: "commandCenterInfo";
  data: {
    type: string;
    alive: boolean;
    power: boolean;
  };
};

export type WsMessage = {
  type: string;
  data: any;
  uuid: string | null;
};

export type ReserveRouteMessage = {
  type: "reserveRoute";
  data: {
    fromBlockName: string;
    toBlockName: string;
  };
  uuid: string;
};

export type ClearAllRouteReservationsMessage = {
  type: "clearAllRouteReservations";
  data: {};
  uuid: string;
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
`;

const TYPES_INDEX = `// common/src/types.ts

/**
 * Backward-compatible public type barrel.
 *
 * A projekt régebbi részei továbbra is innen importálnak:
 *   "../../../common/src/types"
 *
 * A konkrét típusok már tematikus fájlokban élnek:
 * - domainTypes.ts
 * - scriptTypes.ts
 * - wsTypes.ts
 */

export * from "./domainTypes.js";
export * from "./scriptTypes.js";
export * from "./wsTypes.js";
`;

try {
  console.log("DCCExpressNext – Common types split Sprint 9 patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  ensureExisting(FILES.typesIndex);

  write(FILES.domainTypes, DOMAIN_TYPES);
  write(FILES.scriptTypes, SCRIPT_TYPES);
  write(FILES.wsTypes, WS_TYPES);
  write(FILES.typesIndex, TYPES_INDEX);

  console.log("");
  console.log("Kész.");
  console.log("Nem készültek .bak fájlok.");
  console.log("");
  console.log("Javasolt ellenőrzés:");
  console.log("  npm run build");
} catch (error) {
  console.error("");
  console.error("PATCH HIBA:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
