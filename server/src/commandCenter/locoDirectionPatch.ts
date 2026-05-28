// server/src/commandCenter/locoDirectionPatch.ts

import type {
  Direction,
  LocoState,
} from "../../../common/src/types.js";

import {
  DccExCommandCenter,
} from "./dccExCommandCenter.js";

import {
  Z21CommandCenter,
} from "./z21CommandCenter.js";

import {
  buildSetLocoDrivePacket,
} from "./z21/z21CommandBuilders.js";

import {
  parseLocoInfoPacket,
} from "./z21/z21Parsers.js";

import {
  logError,
} from "../utility.js";

type RuntimeLocoState = LocoState & {
  invert?: boolean;
};

type DirectionAwareCommandCenter = {
  locos?: Map<number, RuntimeLocoState>;
  getOrCreateLoco(address: number): RuntimeLocoState;
};

const PATCH_INSTALLED = Symbol.for(
  "dccExpress.locoDirectionPatchInstalled"
);

function invertDirection(
  direction: Direction
): Direction {
  return direction === "forward"
    ? "reverse"
    : "forward";
}

function isLocoDirectionInverted(
  commandCenter: DirectionAwareCommandCenter,
  address: number
): boolean {
  return Boolean(
    commandCenter.locos?.get(address)?.invert
  );
}

function toPhysicalLocoDirection(
  commandCenter: DirectionAwareCommandCenter,
  address: number,
  logicalDirection: Direction
): Direction {
  return isLocoDirectionInverted(commandCenter, address)
    ? invertDirection(logicalDirection)
    : logicalDirection;
}

function toLogicalLocoDirection(
  commandCenter: DirectionAwareCommandCenter,
  address: number,
  physicalDirection: Direction
): Direction {
  return isLocoDirectionInverted(commandCenter, address)
    ? invertDirection(physicalDirection)
    : physicalDirection;
}

function setLogicalLocoRuntimeState(
  commandCenter: DirectionAwareCommandCenter,
  address: number,
  speed: number,
  logicalDirection: Direction
): RuntimeLocoState {
  const loco =
    commandCenter.getOrCreateLoco(address);

  loco.address = address;
  loco.speed = speed;
  loco.direction = logicalDirection;

  return loco;
}

function installZ21DirectionPatch(): void {
  const proto =
    Z21CommandCenter.prototype as any;

  proto.setLoco = async function setLoco(
    this: DirectionAwareCommandCenter & any,
    address: number,
    speed: number,
    logicalDirection: Direction
  ): Promise<boolean> {
    try {
      const physicalDirection =
        toPhysicalLocoDirection(
          this,
          address,
          logicalDirection
        );

      const {
        normalizedSpeed,
        packet,
      } = buildSetLocoDrivePacket(
        address,
        speed,
        physicalDirection
      );

      await this.udpClient.send(packet);

      const loco =
        setLogicalLocoRuntimeState(
          this,
          address,
          normalizedSpeed,
          logicalDirection
        );

      this.broadcastLocoState(loco);
      this.scheduleLocoRefresh(address, "setLoco");

      return true;
    } catch (error) {
      logError("Z21 setLoco failed:", {
        address,
        speed,
        logicalDirection,
        error,
      });

      return false;
    }
  };

  proto.applyLocoInfo = function applyLocoInfo(
    this: DirectionAwareCommandCenter & any,
    data: Buffer
  ): void {
    const parsed =
      parseLocoInfoPacket(data);

    if (!parsed) {
      logError("Z21 invalid loco info packet");
      return;
    }

    const logicalDirection =
      toLogicalLocoDirection(
        this,
        parsed.address,
        parsed.direction
      );

    const loco =
      setLogicalLocoRuntimeState(
        this,
        parsed.address,
        parsed.speed,
        logicalDirection
      );

    for (const [fn, active] of Object.entries(parsed.functions)) {
      loco.functions[Number(fn)] = active;
    }

    this.broadcastLocoState(loco);
  };
}

function installDccExDirectionPatch(): void {
  const proto =
    DccExCommandCenter.prototype as any;

  proto.setLoco = function setLoco(
    this: DirectionAwareCommandCenter & any,
    address: number,
    speed: number,
    logicalDirection: Direction
  ): Promise<boolean> {
    if (!this.isTransportConnected()) {
      return Promise.resolve(false);
    }

    const dccExSpeed =
      Math.max(0, Math.min(126, Math.round(speed)));

    const physicalDirection =
      toPhysicalLocoDirection(
        this,
        address,
        logicalDirection
      );

    const dccExDirection =
      physicalDirection === "forward" ? 1 : 0;

    this.enqueue(
      `<t ${address} ${dccExSpeed} ${dccExDirection}>`
    );

    const loco =
      setLogicalLocoRuntimeState(
        this,
        address,
        dccExSpeed,
        logicalDirection
      );

    this.powerInfo.emergencyStop = false;
    this.broadcastLoco(loco);
    this.broadcastPowerInfo();

    return Promise.resolve(true);
  };

  proto.parseLocoFrame = function parseLocoFrame(
    this: DirectionAwareCommandCenter & any,
    frame: string
  ): void {
    const parts =
      frame.split(/\s+/u);

    const address =
      Number(parts[1]);

    const speedByte =
      Number(parts[3]);

    const functionMap =
      Number(parts[4] ?? 0);

    if (
      !Number.isFinite(address) ||
      !Number.isFinite(speedByte)
    ) {
      return;
    }

    let speed = 0;
    let physicalDirection: Direction = "forward";

    if (speedByte >= 2 && speedByte <= 127) {
      speed = speedByte - 1;
      physicalDirection = "reverse";
    } else if (speedByte >= 130 && speedByte <= 255) {
      speed = speedByte - 129;
      physicalDirection = "forward";
    } else if (speedByte === 0) {
      speed = 0;
      physicalDirection = "reverse";
    } else if (speedByte === 128) {
      speed = 0;
      physicalDirection = "forward";
    }

    const logicalDirection =
      toLogicalLocoDirection(
        this,
        address,
        physicalDirection
      );

    const loco =
      setLogicalLocoRuntimeState(
        this,
        address,
        speed,
        logicalDirection
      );

    if (Number.isFinite(functionMap)) {
      for (let fn = 0; fn < 32; fn += 1) {
        loco.functions[fn] =
          (functionMap & (1 << fn)) !== 0;
      }
    }

    this.broadcastLoco(loco);
  };
}

export function installLocoDirectionPatch(): void {
  const globalState =
    globalThis as Record<symbol, boolean>;

  if (globalState[PATCH_INSTALLED]) {
    return;
  }

  installZ21DirectionPatch();
  installDccExDirectionPatch();

  globalState[PATCH_INSTALLED] = true;
}
