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
  broadcast =
    params.broadcast;
}

export function getCurrentCommandCenter(): CommandCenter | null {
  return commandCenter;
}

export function initializeCommandCenter2(
  conf: CommandCenterConfig | null
): void {
  if (commandCenter) {
    commandCenter
      .stop()
      .then(() => {
        log("Previous command center stopped");
      });
  }

  switch (conf?.type) {
    case "simulator":
      log("Starting command center:", conf.type);

      commandCenter =
        new CommandCenterSimulator("Simulator");

      commandCenter
        .start()
        .then(() => {
          log("Command center started:", conf.type);
        })
        .catch(err => {
          console.error("Failed to start command center:", err);
        });

      break;

    case "z21":
      log("Starting command center:", "Z21");

      commandCenter =
        new Z21CommandCenter(
          "Z21",
          conf.z21.host!,
          conf.z21.port!,
          message => {
            broadcast?.(message);
          }
        );

      commandCenter
        .start()
        .then(() => {
          log("Command center started:", conf?.type);
        })
        .catch(err => {
          console.error("Failed to start command center:", err);
        });

      break;

    case "dcc-ex-tcp":
      log("Starting command center:", "DCC-EX TCP");

      commandCenter =
        new DccExTcpCommandCenter(
          conf.name || "DCC-EX TCP",
          conf.dccexTcp.host!,
          conf.dccexTcp.port!,
          message => {
            broadcast?.(message);
          },
          {
            init: conf.dccexTcp.init,
          }
        );

      commandCenter
        .start()
        .then(() => {
          log("Command center started:", conf?.type);
        })
        .catch(err => {
          console.error("Failed to start command center:", err);
        });

      break;

    case "dcc-ex-serial":
      log("Starting command center:", "DCC-EX Serial");

      commandCenter =
        new DccExSerialCommandCenter(
          conf.name || "DCC-EX Serial",
          conf.dccexSerial.serialPort!,
          conf.dccexSerial.baudRate!,
          message => {
            broadcast?.(message);
          },
          {
            init: conf.dccexSerial.init,
          }
        );

      commandCenter
        .start()
        .then(() => {
          log("Command center started:", conf?.type);
        })
        .catch(err => {
          console.error("Failed to start command center:", err);
        });

      break;

    default:
      log("No command center configured");
      commandCenter = null;
      break;
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

  switch (conf?.type) {
    case "simulator":
      log("Starting command center:", conf.type);

      commandCenter =
        new CommandCenterSimulator("Simulator");
      break;

    case "z21":
      log("Starting command center:", "Z21");

      commandCenter =
        new Z21CommandCenter(
          conf.name || "Z21",
          conf.z21.host!,
          conf.z21.port!,
          message => {
            broadcast?.(message);
          }
        );
      break;

    case "dcc-ex-tcp":
      log("Starting command center:", "DCC-EX TCP");

      commandCenter =
        new DccExTcpCommandCenter(
          conf.name || "DCC-EX TCP",
          conf.dccexTcp.host!,
          conf.dccexTcp.port!,
          message => {
            broadcast?.(message);
          },
          {
            init: conf.dccexTcp.init,
          }
        );
      break;

    case "dcc-ex-serial":
      log("Starting command center:", "DCC-EX Serial");

      commandCenter =
        new DccExSerialCommandCenter(
          conf.name || "DCC-EX Serial",
          conf.dccexSerial.serialPort!,
          conf.dccexSerial.baudRate!,
          message => {
            broadcast?.(message);
          },
          {
            init: conf.dccexSerial.init,
          }
        );
      break;

    default:
      log("No command center configured");
      commandCenter = null;
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
): boolean | undefined {
  return railwayTopologyStore.getTurnoutState(address);
}
