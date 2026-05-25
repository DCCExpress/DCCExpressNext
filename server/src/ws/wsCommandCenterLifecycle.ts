// server/src/ws/wsCommandCenterLifecycle.ts

import type {
  CommandCenterConfig,
} from "../services/commandCenterConfigStore.js";

import {
  setCommandCenterConfigLoadedCallback,
} from "../services/commandCenterConfigStore.js";

import {
  CommandCenter,
} from "../commandCenter/CommandCenter.js";

import {
  CommandCenterSimulator,
} from "../commandCenter/simulator.js";

import {
  Z21CommandCenter,
} from "../commandCenter/z21CommandCenter.js";

import {
  DccExTcpCommandCenter,
} from "../commandCenter/dccExTcpCommandCenter.js";

import {
  DccExSerialCommandCenter,
} from "../commandCenter/dccExSerialCommandCenter.js";

import {
  routeGraphRuntimeStore,
} from "../services/routeGraphRuntimeStore.js";

import {
  getLogicalTurnoutStateFromCommandCenter,
} from "../services/railwayCommandHelpers.js";

import {
  log,
  logError,
} from "../utility.js";

import type {
  CommandCenterInfoPayload,
  TypedServerWsMessage,
} from "../../../common/src/types.js";

type BroadcastMessage = (
  message: TypedServerWsMessage
) => void;

let commandCenter: CommandCenter | null = null;
let selectedCommandCenterInfo: CommandCenterInfoPayload | null = null;
let broadcast: BroadcastMessage | null = null;
let configLoadedCallbackRegistered = false;
let commandCenterInitializationVersion = 0;

export function configureCommandCenterLifecycle(params: {
  broadcast: BroadcastMessage;
}): void {
  broadcast = params.broadcast;
}

export function getCurrentCommandCenter(): CommandCenter | null {
  return commandCenter;
}

function withOptionalString(
  info: CommandCenterInfoPayload,
  key: "ip" | "serialPort" | "connectionString",
  value: string | undefined
): CommandCenterInfoPayload {
  if (!value) {
    return info;
  }

  return {
    ...info,
    [key]: value,
  };
}

function withOptionalNumber(
  info: CommandCenterInfoPayload,
  key: "port",
  value: number | undefined
): CommandCenterInfoPayload {
  if (typeof value !== "number") {
    return info;
  }

  return {
    ...info,
    [key]: value,
  };
}

function createCommandCenterInfoFromConfig(
  conf: CommandCenterConfig | null,
  alive: boolean
): CommandCenterInfoPayload {
  switch (conf?.type) {
    case "simulator":
      return {
        alive,
        type: "simulator",
        name: conf.name ?? "Simulator",
        connectionString: "simulator://local",
      };

    case "z21": {
      let info: CommandCenterInfoPayload = {
        alive,
        type: "z21",
        name: conf.name ?? "Z21",
        connectionString: `z21://${conf.z21.host ?? ""}:${conf.z21.port ?? ""}`,
      };

      info = withOptionalString(info, "ip", conf.z21.host);
      info = withOptionalNumber(info, "port", conf.z21.port);

      return info;
    }

    case "dcc-ex-tcp": {
      let info: CommandCenterInfoPayload = {
        alive,
        type: "dcc-ex-tcp",
        name: conf.name ?? "DCC-EX TCP",
        connectionString: `tcp://${conf.dccexTcp.host ?? ""}:${conf.dccexTcp.port ?? ""}`,
      };

      info = withOptionalString(info, "ip", conf.dccexTcp.host);
      info = withOptionalNumber(info, "port", conf.dccexTcp.port);

      return info;
    }

    case "dcc-ex-serial": {
      let info: CommandCenterInfoPayload = {
        alive,
        type: "dcc-ex-serial",
        name: conf.name ?? "DCC-EX Serial",
        connectionString: `serial://${conf.dccexSerial.serialPort ?? ""}@${conf.dccexSerial.baudRate ?? ""}`,
      };

      info = withOptionalString(
        info,
        "serialPort",
        conf.dccexSerial.serialPort
      );
      info = withOptionalNumber(
        info,
        "port",
        conf.dccexSerial.baudRate
      );

      return info;
    }

    default:
      return {
        alive,
        type: "none",
        name: "No command center",
      };
  }
}

function broadcastCommandCenterInfo(
  info: CommandCenterInfoPayload
): void {
  broadcast?.({
    type: "commandCenterInfo",
    data: info,
  });
}

function broadcastSelectedCommandCenterUnavailable(): void {
  broadcastCommandCenterInfo({
    ...(selectedCommandCenterInfo ?? {
      alive: false,
      type: "none",
      name: "No command center",
    }),
    alive: false,
  });
}

function broadcastCommandCenterUnlocked(): void {
  broadcast?.({
    type: "commandCenterLockChanged",
    data: {
      locked: false,
      lockOwner: null,
      reason: null,
    },
  });
}

function clearCurrentCommandCenter(): void {
  if (!commandCenter) {
    return;
  }

  commandCenter.dispose();
  commandCenter = null;
}

function createCommandCenter(
  conf: CommandCenterConfig | null
): CommandCenter | null {
  switch (conf?.type) {
    case "simulator":
      log("Starting command center:", conf.type);
      return new CommandCenterSimulator(
        conf.name ?? "Simulator"
      );

    case "z21":
      log("Starting command center:", "Z21");
      return new Z21CommandCenter(
        conf.name ?? "Z21",
        conf.z21.host!,
        conf.z21.port!,
        (message: TypedServerWsMessage) => {
          broadcast?.(message);
        }
      );

    case "dcc-ex-tcp":
      log("Starting command center:", "DCC-EX TCP");
      return new DccExTcpCommandCenter(
        conf.name ?? "DCC-EX TCP",
        conf.dccexTcp.host!,
        conf.dccexTcp.port!,
        conf.dccexTcp.init ?? ""
      );

    case "dcc-ex-serial":
      log("Starting command center:", "DCC-EX Serial");
      return new DccExSerialCommandCenter(
        conf.name ?? "DCC-EX Serial",
        conf.dccexSerial.serialPort!,
        conf.dccexSerial.baudRate!,
        conf.dccexSerial.init ?? ""
      );

    default:
      log("No command center configured");
      return null;
  }
}

export async function initializeCommandCenter(
  conf: CommandCenterConfig | null
): Promise<void> {
  const initializationVersion =
    ++commandCenterInitializationVersion;

  selectedCommandCenterInfo = createCommandCenterInfoFromConfig(
    conf,
    false
  );

  broadcastSelectedCommandCenterUnavailable();
  broadcastCommandCenterUnlocked();
  routeGraphRuntimeStore.clearAllBusy();

  const previousCommandCenter = commandCenter;

  if (previousCommandCenter) {
    previousCommandCenter.locked = false;
    previousCommandCenter.lockOwnerUUID = null;

    try {
      await previousCommandCenter.stop();
      log("Previous command center stopped");
    } catch (error) {
      logError(
        "Failed to stop previous command center:",
        error
      );
    } finally {
      previousCommandCenter.dispose();
      commandCenter = null;
    }
  }

  const nextCommandCenter = createCommandCenter(conf);

  if (initializationVersion !== commandCenterInitializationVersion) {
    nextCommandCenter?.dispose();
    return;
  }

  commandCenter = nextCommandCenter;

  if (!commandCenter) {
    broadcastSelectedCommandCenterUnavailable();
    return;
  }

  try {
    const started =
      await commandCenter.start();

    if (initializationVersion !== commandCenterInitializationVersion) {
      await commandCenter.stop();
      clearCurrentCommandCenter();
      return;
    }

    if (!started) {
      logError(
        "Command center start returned false:",
        conf?.type
      );

      clearCurrentCommandCenter();
      broadcastSelectedCommandCenterUnavailable();
      return;
    }

    selectedCommandCenterInfo = {
      ...selectedCommandCenterInfo,
      alive: commandCenter.isAlive(),
      name: commandCenter.getName(),
      connectionString: commandCenter.getConnectionString(),
    };

    await commandCenter.loadRuntimeState();
    commandCenter.broadcastBlocks();
    log("Command center started:", conf?.type);
  } catch (error) {
    logError(
      "Failed to start command center:",
      error
    );

    clearCurrentCommandCenter();
    broadcastSelectedCommandCenterUnavailable();
  }
}

export function registerCommandCenterConfigLoadedCallback(): void {
  if (configLoadedCallbackRegistered) {
    return;
  }

  setCommandCenterConfigLoadedCallback(conf => {
    initializeCommandCenter(conf).catch(error => {
      logError(
        "Failed to reinitialize command center:",
        error
      );
    });
  });

  configLoadedCallbackRegistered = true;
}

export function getLogicalTurnoutState(
  address: number
): boolean | null {
  return getLogicalTurnoutStateFromCommandCenter(
    commandCenter,
    address
  );
}