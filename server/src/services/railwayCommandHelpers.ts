// server/src/services/railwayCommandHelpers.ts

import type {
  SignalAspect,
} from "../../../common/src/signalLogic.js";

import TrackTurnoutDoubleElement from "../../../common/src/layout/elements/TrackTurnoutDoubleElement.js";

import type {
  CommandCenter,
} from "../commandCenter/CommandCenter.js";

import {
  railwayTopologyStore,
} from "./railwayTopologyStore.js";

import type {
  TopologyTurnoutElement,
} from "../../../common/src/railway/topology.js";

type SetBasicAccessoryFn = (
  address: number,
  active: boolean
) => Promise<boolean>;

export function findTurnoutByAccessoryAddress(
  address: number
): TopologyTurnoutElement | undefined {
  return railwayTopologyStore
    .getTopology()
    ?.getTurnouts()
    .find(turnout =>
      isTurnoutMatchingAccessoryAddress(
        turnout,
        address
      )
    );
}

export function isTurnoutMatchingAccessoryAddress(
  turnout: TopologyTurnoutElement,
  address: number
): boolean {
  if (turnout instanceof TrackTurnoutDoubleElement) {
    return (
      turnout.turnout1Address === address ||
      turnout.turnout2Address === address
    );
  }

  return turnout.turnoutAddress === address;
}

export function getTurnoutPhysicalClosedValue(
  turnout: TopologyTurnoutElement,
  address: number,
  logicalClosed: boolean
): boolean {
  if (turnout instanceof TrackTurnoutDoubleElement) {
    if (
      turnout.turnout1Address === address ||
      turnout.turnout2Address === address
    ) {
      return logicalClosed;
    }

    return logicalClosed;
  }

  return logicalClosed === turnout.turnoutClosedValue;
}

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
    findTurnoutByAccessoryAddress(address);

  if (!turnout) {
    return physicalClosed;
  }

  if (turnout instanceof TrackTurnoutDoubleElement) {
    return physicalClosed;
  }

  return physicalClosed === turnout.turnoutClosedValue;
}

export async function setSignalAspectWithAccessorySetter(
  setBasicAccessory: SetBasicAccessoryFn,
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
      await setBasicAccessory(
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

export async function setSignalAspectFromCommandCenter(
  commandCenter: CommandCenter,
  address: number,
  aspect: SignalAspect
): Promise<void> {
  await setSignalAspectWithAccessorySetter(
    (accessoryAddress, active) => commandCenter.setBasicAccessory(
      accessoryAddress,
      active
    ),
    address,
    aspect
  );
}
