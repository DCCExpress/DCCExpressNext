// server/src/ws/wsCommandCenterLifecycle.ts

import type {
  CommandCenterConfig,
} from "../routes/commandCenterRoutes.js";

import {
  setCommandCenterConfigLoadedCallback,
} from "../routes/commandCenterRoutes.js";

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
  railwayTopologyStore,
} from "../services/railwayTopologyStore.js";

import {
  log,
} from "../utility.js";

type BroadcastMessage = (
  message: unknown
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

export function initializeCommandCenter(
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

    default:
      commandCenter =
        new CommandCenterSimulator("Simulator");

      break;
  }

  commandCenter.onRuntimeStateLoaded((blocks, turnouts) => {
    console.log("[Server] Restored runtime state, rebroadcasting...");

    broadcast?.({
      type: "blockStateChanged",
      data: Object.fromEntries(blocks),
    });

    for (const [, turnout] of turnouts) {
      broadcast?.({
        type: "turnoutChanged",
        data: turnout,
      });
    }
  });
}

export function getLogicalTurnoutState(
  address: number
): boolean | null {
  const physicalClosed =
    commandCenter
      ?.getTurnoutInfo(address)
      ?.closed;

  if (typeof physicalClosed !== "boolean") {
    return null;
  }

  const topology =
    railwayTopologyStore.getTopology();

  if (!topology) {
    return null;
  }

  const turnout =
    topology
      .getTurnouts()
      .find(
        item => item.turnoutAddress === address
      );

  if (!turnout) {
    return null;
  }

  /**
   * Fizikai command-center állapotból
   * vissza logikai C/T állapot.
   */
  return (
    physicalClosed === turnout.turnoutClosedValue
  );
}

export function registerCommandCenterConfigLoadedCallback(): void {
  if (configLoadedCallbackRegistered) {
    return;
  }

  configLoadedCallbackRegistered = true;

  setCommandCenterConfigLoadedCallback(
    (conf: CommandCenterConfig | null) => {
      log("Command center config loaded:", conf);
      initializeCommandCenter(conf);
    }
  );
}
