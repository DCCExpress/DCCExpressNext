// server/src/services/railwayCommandHelpers.ts

import type {
  SignalAspect,
} from "../../../common/src/signalLogic.js";

import type {
  CommandCenter,
} from "../commandCenter/CommandCenter.js";

import {
  railwayTopologyStore,
} from "./railwayTopologyStore.js";

export function getLogicalTurnoutStateFromCommandCenter(
  commandCenter: CommandCenter | null,
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

export async function setSignalAspectFromCommandCenter(
  commandCenter: CommandCenter,
  address: number,
  aspect: SignalAspect
): Promise<void> {
  const topology =
    railwayTopologyStore.getTopology();

  if (!topology) {
    throw new Error(
      "No server-side topology is available."
    );
  }

  const signal =
    topology.getSignals().find(
      item => item.address === address
    );

  if (!signal) {
    throw new Error(
      `Signal not found for address ${address}.`
    );
  }

  const bits =
    aspect === "green"
      ? signal.valueGreen
      : aspect === "yellow"
        ? signal.valueYellow
        : aspect === "red"
          ? signal.valueRed
          : signal.valueWhite;

  for (let i = 0; i < signal.addressLength; i++) {
    const active =
      ((bits >> i) & 1) === 1;

    const accessoryAddress =
      signal.address + i;

    const ok =
      await commandCenter.setBasicAccessory(
        accessoryAddress,
        active
      );

    if (!ok) {
      throw new Error(
        `Could not set signal accessory ${accessoryAddress}.`
      );
    }
  }
}
