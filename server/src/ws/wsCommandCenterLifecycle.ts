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
  railwayTopologyStore,
} from "../services/railwayTopologyStore.js";

import {
  log,
  logError,
} from "../utility.js";

import type {
  TypedServerWsMessage,
} from "../../../common/src/types.js";

type BroadcastMessage = (
  message: TypedServerWsMessage
) => void;

let commandCenter: CommandCenter | null = null;
let broadcast: BroadcastMessage | null = null;
let configLoadedCallbackRegistered = false;

export function configureCommandCenterLifecycle(params: {
  broadcast: BroadcastMessage;
}): void {
  broadcast = params.broadcast;
}

export function getCurrentCommandCenter(): CommandCenter | null {
  return commandCenter;
}

function broadcastCommandCenterUnavailable(): void {
  broadcast?.({
    type: "commandCenterInfo",
    data: {
      alive: false,
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
      return new CommandCenterSimulator("Simulator");

    case "z21":
      log("Starting command center:", "Z21");
      return new Z21CommandCenter(
        "Z21",
        conf.z21.host!,
        conf.z21.port!,
        (message: TypedServerWsMessage) => {
          broadcast?.(message);
        }
      );

    case "dcc-ex-tcp":
      log("Starting command center:", "DCC-EX TCP");
      return new DccExTcpCommandCenter(
        "DCC-EX TCP",
        conf.dccexTcp.host!,
        conf.dccexTcp.port!,
        conf.dccexTcp.init ?? ""
      );

    case "dcc-ex-serial":
      log("Starting command center:", "DCC-EX Serial");
      return new DccExSerialCommandCenter(
        "DCC-EX Serial",
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
  const previousCommandCenter = commandCenter;

  if (previousCommandCenter) {
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

  commandCenter = createCommandCenter(conf);

  if (!commandCenter) {
    broadcastCommandCenterUnavailable();
    return;
  }

  try {
    const started =
      await commandCenter.start();

    if (!started) {
      logError(
        "Command center start returned false:",
        conf?.type
      );

      clearCurrentCommandCenter();
      broadcastCommandCenterUnavailable();
      return;
    }

    await commandCenter.loadRuntimeState();
    commandCenter.broadcastBlocks();
    log("Command center started:", conf?.type);
  } catch (error) {
    logError(
      "Failed to start command center:",
      error
    );

    clearCurrentCommandCenter();
    broadcastCommandCenterUnavailable();
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
  const physicalClosed =
    commandCenter?.getTurnoutInfo(address)?.closed;

  if (typeof physicalClosed !== "boolean") {
    return null;
  }

  const turnout =
    railwayTopologyStore
      .getTopology()
      ?.getTurnouts()
      .find(item => item.turnoutAddress === address);

  if (!turnout) {
    return physicalClosed;
  }

  return physicalClosed === turnout.turnoutClosedValue;
}
