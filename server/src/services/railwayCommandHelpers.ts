// server/src/services/railwayCommandHelpers.ts

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
