// common/src/railway/trackTravelDirectionResolver.ts

import {
  RailwayTopologyLayout,
  TopologyDirectionElement,
  type TopologyTrackElement,
  type TopologyTurnoutElement,
  isTopologyTurnoutElement,
  type TravelDirection,
} from "./topology.js";

type TurnoutSide =
  | "entry"
  | "straight"
  | "div";

type LinearSide =
  | "next"
  | "prev";

type ConnectionSide =
  | TurnoutSide
  | LinearSide;

type FlowSide =
  | "forward"
  | "backward";

type ConnectionPoint = {
  side: ConnectionSide;
  point: {
    isEqual(other: { x: number; y: number }): boolean;
  };
};

export class TrackTravelDirectionResolver {
  constructor(
    private readonly topology: RailwayTopologyLayout
  ) {}

  resolve(): void {
    const physicalTracks =
      this.topology.getPhysicalTrackElements();

    this.resetRuntimeState(physicalTracks);

    const networks =
      this.findConnectedTrackNetworks(physicalTracks);

    for (const network of networks) {
      const directionElements =
        network.filter(
          (elem): elem is TopologyDirectionElement =>
            elem instanceof TopologyDirectionElement
        );

      if (directionElements.length === 0) {
        throw new Error(
          "A connected track network has no TrackDirection element."
        );
      }

      if (directionElements.length > 1) {
        throw new Error(
          "A connected track network has more than one TrackDirection element."
        );
      }

      const directionElement = directionElements[0]!;

      this.assignTrackNameToNetwork(
        network,
        directionElement.name.trim()
      );

      this.propagateTravelDirection(
        directionElement,
        network
      );
    }
  }

  private resetRuntimeState(
    elements: TopologyTrackElement[]
  ): void {
    for (const elem of elements) {
      elem.travelDirection = "unknown";
      elem.trackName = "";
    }
  }

  private findConnectedTrackNetworks(
    elements: TopologyTrackElement[]
  ): TopologyTrackElement[][] {
    const result: TopologyTrackElement[][] = [];
    const visited = new Set<string>();

    for (const elem of elements) {
      if (visited.has(elem.id)) {
        continue;
      }

      const network: TopologyTrackElement[] = [];
      const stack: TopologyTrackElement[] = [elem];

      while (stack.length > 0) {
        const current = stack.pop()!;

        if (visited.has(current.id)) {
          continue;
        }

        visited.add(current.id);
        network.push(current);

        const neighbors =
          this.getConnectedNeighbors(current);

        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.id)) {
            stack.push(neighbor);
          }
        }
      }

      result.push(network);
    }

    return result;
  }

  private assignTrackNameToNetwork(
    network: TopologyTrackElement[],
    trackName: string
  ): void {
    for (const elem of network) {
      elem.trackName = trackName;
    }
  }

  private propagateTravelDirection(
    directionElement: TopologyDirectionElement,
    network: TopologyTrackElement[]
  ): void {
    const networkIds = new Set(
      network.map(elem => elem.id)
    );

    directionElement.travelDirection = "forward";

    const queue: TopologyTrackElement[] = [
      directionElement,
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      const neighbors =
        this.getConnectedNeighbors(current);

      for (const neighbor of neighbors) {
        if (!networkIds.has(neighbor.id)) {
          continue;
        }

        const currentSide =
          this.getSideTowards(current, neighbor);

        const neighborSide =
          this.getSideTowards(neighbor, current);

        if (!currentSide || !neighborSide) {
          continue;
        }

        const currentFlowSide =
          this.getFlowSideForConnection(
            current,
            currentSide
          );

        if (!currentFlowSide) {
          continue;
        }

        const desiredNeighborFlowSide: FlowSide =
          currentFlowSide === "forward"
            ? "backward"
            : "forward";

        const proposedNeighborDirection =
          this.getTravelDirectionForFlowSide(
            neighbor,
            neighborSide,
            desiredNeighborFlowSide
          );

        if (neighbor.travelDirection === "unknown") {
          neighbor.travelDirection =
            proposedNeighborDirection;

          queue.push(neighbor);
          continue;
        }

        if (
          neighbor.travelDirection !==
          proposedNeighborDirection
        ) {
          throw new Error(
            "Track travel direction conflict detected. Check TrackDirection placement and track topology."
          );
        }
      }
    }
  }

  private getConnectedNeighbors(
    element: TopologyTrackElement
  ): TopologyTrackElement[] {
    const result: TopologyTrackElement[] = [];

    for (const connection of this.getConnectionPoints(element)) {
      const candidate =
        this.topology.getPhysicalTrackAt(
          connection.point as any
        );

      if (!candidate) {
        continue;
      }

      if (candidate.id === element.id) {
        continue;
      }

      const candidateSide =
        this.getSideTowards(candidate, element);

      if (!candidateSide) {
        continue;
      }

      result.push(candidate);
    }

    return result;
  }

  private getConnectionPoints(
    element: TopologyTrackElement
  ): ConnectionPoint[] {
    if (isTopologyTurnoutElement(element)) {
      const connections = element.getConnections();

      return [
        {
          side: "entry",
          point: connections.entry,
        },
        {
          side: "straight",
          point: connections.straight,
        },
        {
          side: "div",
          point: connections.div,
        },
      ];
    }

    return [
      {
        side: "next",
        point: element.getNextItemPoint(),
      },
      {
        side: "prev",
        point: element.getPrevItemPoint(),
      },
    ];
  }

  private getSideTowards(
    element: TopologyTrackElement,
    other: TopologyTrackElement
  ): ConnectionSide | undefined {
    for (const connection of this.getConnectionPoints(element)) {
      if (connection.point.isEqual(other.pos)) {
        return connection.side;
      }
    }

    return undefined;
  }

  private getFlowSideForConnection(
    element: TopologyTrackElement,
    side: ConnectionSide
  ): FlowSide | null {
    const direction = element.travelDirection;

    if (direction === "unknown") {
      return null;
    }

    if (isTopologyTurnoutElement(element)) {
      if (direction === "forward") {
        return side === "entry"
          ? "backward"
          : "forward";
      }

      return side === "entry"
        ? "forward"
        : "backward";
    }

    if (direction === "forward") {
      return side === "next"
        ? "forward"
        : "backward";
    }

    return side === "next"
      ? "backward"
      : "forward";
  }

  private getTravelDirectionForFlowSide(
    element: TopologyTrackElement,
    side: ConnectionSide,
    desiredFlowSide: FlowSide
  ): TravelDirection {
    if (isTopologyTurnoutElement(element)) {
      if (desiredFlowSide === "forward") {
        return side === "entry"
          ? "reverse"
          : "forward";
      }

      return side === "entry"
        ? "forward"
        : "reverse";
    }

    if (desiredFlowSide === "forward") {
      return side === "next"
        ? "forward"
        : "reverse";
    }

    return side === "next"
      ? "reverse"
      : "forward";
  }
}
