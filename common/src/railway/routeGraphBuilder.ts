// common/src/railway/routeGraphBuilder.ts

import {
  Edge,
  Graph,
  GraphNode,
  type SectionBlock,
  type SectionDetector,
  type SectionSignal,
  type TurnoutStateRequirement,
} from "./graph.js";

import {
  RailwayTopologyLayout,
  type TopologyBlockElement,
  type TopologyPoint,
  type TopologySensorElement,
  type TopologySignalElement,
  type TopologyTrackElement,
  type TopologyTurnoutElement,
  isTopologyTurnoutElement,
  type TravelDirection,
} from "./topology.js";
import { TrackTravelDirectionResolver } from "./trackTravelDirectionResolver.js";

type TurnoutSide =
  | "entry"
  | "straight"
  | "div";

type TurnoutExit = {
  exitSide: TurnoutSide;
  turnoutState: TurnoutStateRequirement;
};

export class RouteGraphBuilder {
  private readonly graph = new Graph();

  /**
   * section szám -> GraphNode
   */
  private readonly sectionNodes =
    new Map<number, GraphNode>();

  /**
   * Duplikált edge-ek ellen.
   */
  private readonly createdEdgeKeys =
    new Set<string>();

  private turnouts: TopologyTurnoutElement[] = [];
  private nextSectionNumber = 1;

  constructor(
    private readonly topology: RailwayTopologyLayout
  ) { }

  build(): Graph {
    this.resetRoutes();

    new TrackTravelDirectionResolver(
      this.topology
    ).resolve();

    this.turnouts = this.topology.getTurnouts();

    this.markTurnoutsVisited();
    this.discoverPhysicalSections();
    this.discoverSectionsFromDirectionElements();
    this.createRouteEdges();

    return this.graph;
  }

  private resetRoutes(): void {
    const elems =
      this.topology.getPhysicalTrackElements();

    for (const elem of elems) {
      elem.isVisited = false;
      elem.isRoute = false;
      elem.section = 0;
      elem.travelDirection = "unknown";
    }
  }

  private markTurnoutsVisited(): void {
    for (const turnout of this.turnouts) {
      turnout.isVisited = true;
    }
  }

  private discoverPhysicalSections(): void {
    for (const turnout of this.turnouts) {
      const connections = turnout.getConnections();

      const connectionPositions = [
        connections.entry,
        connections.straight,
        connections.div,
      ];

      for (const pos of connectionPositions) {
        const firstElem =
          this.topology.getPhysicalTrackAt(pos);

        if (!firstElem) {
          continue;
        }

        if (isTopologyTurnoutElement(firstElem)) {
          continue;
        }

        if (firstElem.isVisited) {
          continue;
        }

        this.createPhysicalSection(firstElem);
      }
    }
  }

  private discoverSectionsFromDirectionElements(): void {
    const directionElements =
      this.topology.getDirectionElements();

    for (const directionElement of directionElements) {
      if (directionElement.isVisited) {
        continue;
      }

      this.createPhysicalSection(directionElement);
    }
  }

  private createPhysicalSection(
    firstElem: TopologyTrackElement
  ): void {
    const sectionNumber =
      this.nextSectionNumber++;

    const sectionElements: TopologyTrackElement[] = [];

    this.walkTrackSection(
      firstElem,
      sectionNumber,
      sectionElements
    );

    const node = this.createSectionGraphNode(
      sectionNumber,
      sectionElements
    );

    this.graph.addNode(node);
    this.sectionNodes.set(sectionNumber, node);
  }

  private walkTrackSection(
    obj: TopologyTrackElement,
    section: number,
    sectionElements: TopologyTrackElement[]
  ): void {
    obj.isVisited = true;
    obj.section = section;

    sectionElements.push(obj);

    const nextPos = obj.getNextItemXy();
    const prevPos = obj.getPrevItemXy();

    this.walkTrackSectionDirection(
      obj,
      nextPos,
      section,
      sectionElements
    );

    this.walkTrackSectionDirection(
      obj,
      prevPos,
      section,
      sectionElements
    );
  }

  private walkTrackSectionDirection(
    current: TopologyTrackElement,
    targetPos: TopologyPoint,
    section: number,
    sectionElements: TopologyTrackElement[]
  ): void {
    const next =
      this.topology.getPhysicalTrackAt(targetPos);

    if (!next) {
      return;
    }

    if (isTopologyTurnoutElement(next)) {
      return;
    }

    const isConnectedBack =
      current.pos.isEqual(next.getNextItemXy()) ||
      current.pos.isEqual(next.getPrevItemXy());

    if (!isConnectedBack) {
      return;
    }

    if (next.isVisited) {
      return;
    }

    this.walkTrackSection(
      next,
      section,
      sectionElements
    );
  }

  private createSectionGraphNode(
    section: number,
    sectionElements: TopologyTrackElement[]
  ): GraphNode {
    let x = 0;
    let y = 0;

    for (const elem of sectionElements) {
      x += elem.pos.x;
      y += elem.pos.y;
    }

    if (sectionElements.length > 0) {
      x /= sectionElements.length;
      y /= sectionElements.length;
    }

    const trackName =
      this.getSectionTrackName(sectionElements);

    const detectors =
      this.collectSectionDetectors(sectionElements);

    const signals =
      this.collectSectionSignals(sectionElements);

    const blocks =
      this.collectSectionBlocks(
        sectionElements,
        trackName
      );

    const elementIds =
      sectionElements.map(elem => elem.id);

    return new GraphNode(
      `S${section}`,
      trackName,
      x,
      y,
      detectors,
      signals,
      blocks,
      elementIds
    );
  }

  private getSectionTrackName(
    sectionElements: TopologyTrackElement[]
  ): string {
    return (
      sectionElements.find(
        elem => elem.trackName.trim().length > 0
      )?.trackName.trim() ?? ""
    );
  }

  private collectSectionDetectors(
    sectionElements: TopologyTrackElement[]
  ): SectionDetector[] {
    const sectionPositions = new Set(
      sectionElements.map(
        elem => `${elem.x}:${elem.y}`
      )
    );

    return this.topology
      .getSensors()
      .filter(sensor =>
        sectionPositions.has(
          `${sensor.x}:${sensor.y}`
        )
      )
      .sort((a, b) => a.address - b.address)
      .map(sensor => ({
        id: sensor.id,
        address: sensor.address,
        label: `D${sensor.address}`,
      }));
  }

  private collectSectionSignals(
    sectionElements: TopologyTrackElement[]
  ): SectionSignal[] {
    const sectionPositions = new Set(
      sectionElements.map(
        elem => `${elem.x}:${elem.y}`
      )
    );

    return this.topology
      .getSignals()
      .filter(signal =>
        sectionPositions.has(
          `${signal.x}:${signal.y}`
        )
      )
      .sort((a, b) => a.address - b.address)
      .map(signal => ({
        id: signal.id,
        address: signal.address,
        label: `L${signal.address}`,
      }));
  }

  private collectSectionBlocks(
    sectionElements: TopologyTrackElement[],
    trackName: string
  ): SectionBlock[] {
    return this.topology
      .getBlocks()
      .filter(block =>
        sectionElements.some(sectionElem =>
          this.isSectionElementInsideBlock(
            sectionElem,
            block
          )
        )
      )
      .sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "")
      )
      .map(block => {
        const blockName =
          block.name?.trim()
            ? block.name.trim()
            : "Block";

        const resolvedTrackName =
          trackName?.trim()
            ? trackName.trim()
            : "";

        return {
          id: block.id,
          name: blockName,
          trackName: resolvedTrackName,
          label: resolvedTrackName
            ? `${resolvedTrackName}: ${blockName}`
            : blockName,
        };
      });
  }

  private isSectionElementInsideBlock(
    sectionElem: TopologyTrackElement,
    block: TopologyBlockElement
  ): boolean {
    const bounds = block.getBounds();

    return (
      sectionElem.x >= bounds.x &&
      sectionElem.x < bounds.x + bounds.width &&
      sectionElem.y >= bounds.y &&
      sectionElem.y < bounds.y + bounds.height
    );
  }

  private createRouteEdges(): void {
    for (const turnout of this.turnouts) {
      const connections = turnout.getConnections();

      const sides: TurnoutSide[] = [
        "entry",
        "straight",
        "div",
      ];

      for (const side of sides) {
        const connectedElem =
          this.topology.getPhysicalTrackAt(
            connections[side]
          );

        if (!connectedElem) {
          continue;
        }

        if (isTopologyTurnoutElement(connectedElem)) {
          continue;
        }

        if (!connectedElem.section) {
          continue;
        }

        const fromNode =
          this.sectionNodes.get(
            connectedElem.section
          );

        if (!fromNode) {
          continue;
        }

        const locoDirection =
          this.getLocoDirectionFromSectionTowardsTurnout(
            connectedElem,
            turnout
          );

        this.walkTurnoutChainToSections(
          fromNode,
          turnout,
          side,
          [],
          new Set<string>(),
          locoDirection
        );
      }
    }
  }

  private walkTurnoutChainToSections(
    fromNode: GraphNode,
    turnout: TopologyTurnoutElement,
    enteredSide: TurnoutSide,
    turnoutStates: TurnoutStateRequirement[],
    visitedTurnoutSides: Set<string>,
    locoDirection: TravelDirection
  ): void {
    const visitKey =
      `${turnout.id}:${enteredSide}`;

    if (visitedTurnoutSides.has(visitKey)) {
      return;
    }

    const nextVisited =
      new Set(visitedTurnoutSides);

    nextVisited.add(visitKey);

    const exits =
      this.getAllowedTurnoutExits(
        turnout,
        enteredSide
      );

    for (const exit of exits) {
      const nextTurnoutStates = [
        ...turnoutStates,
        exit.turnoutState,
      ];

      const connections =
        turnout.getConnections();

      const exitPos =
        connections[exit.exitSide];

      const nextElem =
        this.topology.getPhysicalTrackAt(exitPos);

      if (!nextElem) {
        continue;
      }

      if (!isTopologyTurnoutElement(nextElem)) {
        this.finishRouteEdge(
          fromNode,
          nextElem,
          nextTurnoutStates,
          locoDirection
        );

        continue;
      }

      const nextTurnout = nextElem;

      const nextEnteredSide =
        this.getTurnoutSideConnectedToElement(
          nextTurnout,
          turnout
        );

      if (!nextEnteredSide) {
        continue;
      }

      this.walkTurnoutChainToSections(
        fromNode,
        nextTurnout,
        nextEnteredSide,
        nextTurnoutStates,
        nextVisited,
        locoDirection
      );
    }
  }

  private finishRouteEdge(
    fromNode: GraphNode,
    targetElem: TopologyTrackElement,
    turnoutStates: TurnoutStateRequirement[],
    locoDirection: TravelDirection
  ): void {
    if (!targetElem.section) {
      return;
    }

    const toNode =
      this.sectionNodes.get(targetElem.section);

    if (!toNode) {
      return;
    }

    if (toNode === fromNode) {
      return;
    }

    this.addRouteEdgeIfMissing(
      fromNode,
      toNode,
      turnoutStates,
      locoDirection
    );
  }

  private addRouteEdgeIfMissing(
    from: GraphNode,
    to: GraphNode,
    turnoutStates: TurnoutStateRequirement[],
    locoDirection: TravelDirection
  ): void {
    const turnoutKey = turnoutStates
      .map(state =>
        `${state.address}:${state.closed ? "C" : "T"}`
      )
      .join("|");

    const edgeKey =
      `${from.name}->${to.name}:${turnoutKey}:${locoDirection}`;

    if (this.createdEdgeKeys.has(edgeKey)) {
      return;
    }

    this.createdEdgeKeys.add(edgeKey);

    this.graph.addEdge(
      new Edge(
        from,
        to,
        turnoutStates,
        locoDirection
      )
    );
  }

  private getAllowedTurnoutExits(
    turnout: TopologyTurnoutElement,
    enteredSide: TurnoutSide
  ): TurnoutExit[] {
    const straightState: TurnoutStateRequirement = {
      address: turnout.turnoutAddress,
      closed: true,
    };

    const divState: TurnoutStateRequirement = {
      address: turnout.turnoutAddress,
      closed: false,
    };

    switch (enteredSide) {
      case "entry":
        return [
          {
            exitSide: "straight",
            turnoutState: straightState,
          },
          {
            exitSide: "div",
            turnoutState: divState,
          },
        ];

      case "straight":
        return [
          {
            exitSide: "entry",
            turnoutState: straightState,
          },
        ];

      case "div":
        return [
          {
            exitSide: "entry",
            turnoutState: divState,
          },
        ];
    }
  }

  private getTurnoutSideConnectedToElement(
    turnout: TopologyTurnoutElement,
    other: TopologyTrackElement
  ): TurnoutSide | undefined {
    const connections = turnout.getConnections();

    if (connections.entry.isEqual(other.pos)) {
      return "entry";
    }

    if (connections.straight.isEqual(other.pos)) {
      return "straight";
    }

    if (connections.div.isEqual(other.pos)) {
      return "div";
    }

    return undefined;
  }

  private getLocoDirectionFromSectionTowardsTurnout(
    sectionElem: TopologyTrackElement,
    turnout: TopologyTurnoutElement
  ): TravelDirection {
    if (sectionElem.travelDirection === "unknown") {
      return "unknown";
    }

    const towardsNext =
      sectionElem.getNextItemXy().isEqual(turnout.pos);

    const towardsPrev =
      sectionElem.getPrevItemXy().isEqual(turnout.pos);

    if (towardsNext) {
      return sectionElem.travelDirection;
    }

    if (towardsPrev) {
      return sectionElem.travelDirection === "forward"
        ? "reverse"
        : "forward";
    }

    return "unknown";
  }
}
