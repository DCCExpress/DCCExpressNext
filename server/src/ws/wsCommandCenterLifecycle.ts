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
  log,
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
        conf.name || "Z21",
        conf.z21.host!,
        conf.z21.port!,
        (message: TypedServerWsMessage) => {
          broadcast?.(message);
        }
      );

    case "dcc-ex-tcp":
      log("Starting command center:", "DCC-EX TCP");
      return new DccExTcpCommandCenter(
        conf.name || "DCC-EX TCP",
        conf.dccexTcp.host!,
        conf.dccexTcp.port!,
        conf.dccexTcp.init ?? ""
      );

    case "dcc-ex-serial":
      log("Starting command center:", "DCC-EX Serial");
      return new DccExSerialCommandCenter(
        conf.name || "DCC-EX Serial",
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
  if (commandCenter) {
    try {
      await commandCenter.stop();
      log("Previous command center stopped");
    } catch (error) {
      console.error(
        "Failed to stop previous command center:",
        error
      );
    }
  }

  commandCenter = createCommandCenter(conf);

  if (!commandCenter) {
    return;
  }

  try {
    await commandCenter.start();
    log("Command center started:", conf?.type);
  } catch (error) {
    console.error(
      "Failed to start command center:",
      error
    );
  }
}

export function registerCommandCenterConfigLoadedCallback(): void {
  if (configLoadedCallbackRegistered) {
    return;
  }

  setCommandCenterConfigLoadedCallback(conf => {
    initializeCommandCenter(conf).catch(error => {
      console.error(
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
  return commandCenter?.getTurnoutInfo(address)?.closed ?? null;
}
