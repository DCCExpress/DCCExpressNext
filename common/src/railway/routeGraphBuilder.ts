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
  type TopologyTrackElement,
  type TopologyTurnoutElement,
  isTopologyTurnoutElement,
  type TravelDirection,
} from "./topology.js";
import TrackTurnoutDoubleElement from "../layout/elements/TrackTurnoutDoubleElement.js";
import { TrackTravelDirectionResolver } from "./trackTravelDirectionResolver.js";

type TurnoutSide = string;

type TurnoutExit = {
  exitSide: TurnoutSide;
  turnoutStates: TurnoutStateRequirement[];
};

type TrackConnectionGroup = {
  index: number;
  endpoints: TopologyPoint[];
};

type LinearConnectionSide =
  | "prev"
  | "next";

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

  /**
   * Track elem kapcsolatcsoport -> section szám.
   *
   * Normál sínnél egyetlen kapcsolatcsoport van: prev <-> next.
   * Crossingnál két független kapcsolatcsoport van, ezért ugyanaz az elem
   * két külön fizikai section része is lehet.
   */
  private readonly sectionByTrackConnectionKey =
    new Map<string, number>();

  private readonly visitedTrackConnectionKeys =
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
    this.discoverRemainingTrackConnectionSections();
    this.createRouteEdges();

    return this.graph;
  }

  private resetRoutes(): void {
    const elems =
      this.topology.getPhysicalTrackElements();

    this.sectionNodes.clear();
    this.createdEdgeKeys.clear();
    this.sectionByTrackConnectionKey.clear();
    this.visitedTrackConnectionKeys.clear();

    this.nextSectionNumber = 1;
    this.turnouts = [];

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
      const connections = this.getTurnoutConnectionPoints(turnout);

      for (const pos of Object.values(connections)) {
        const firstElem =
          this.topology.getPhysicalTrackAt(pos);

        if (!firstElem) {
          continue;
        }

        if (isTopologyTurnoutElement(firstElem)) {
          continue;
        }

        if (!this.hasTrackConnectionAt(firstElem, turnout.pos)) {
          continue;
        }

        if (this.isTrackConnectionVisited(firstElem, turnout.pos)) {
          continue;
        }

        this.createPhysicalSection(firstElem, turnout.pos);
      }
    }
  }

  private discoverSectionsFromDirectionElements(): void {
    const directionElements =
      this.topology.getDirectionElements();

    for (const directionElement of directionElements) {
      if (this.areAllTrackConnectionsVisited(directionElement)) {
        continue;
      }

      this.createPhysicalSection(directionElement);
    }
  }

  private discoverRemainingTrackConnectionSections(): void {
    const physicalTracks =
      this.topology.getPhysicalTrackElements();

    for (const elem of physicalTracks) {
      if (isTopologyTurnoutElement(elem)) {
        continue;
      }

      if (this.areAllTrackConnectionsVisited(elem)) {
        continue;
      }

      this.createPhysicalSection(elem);
    }
  }

  private createPhysicalSection(
    firstElem: TopologyTrackElement,
    incomingPos?: TopologyPoint
  ): void {
    const sectionNumber =
      this.nextSectionNumber++;

    const sectionElements: TopologyTrackElement[] = [];

    this.walkTrackSection(
      firstElem,
      incomingPos,
      sectionNumber,
      sectionElements
    );

    if (sectionElements.length === 0) {
      this.nextSectionNumber--;
      return;
    }

    const node = this.createSectionGraphNode(
      sectionNumber,
      sectionElements
    );

    this.graph.addNode(node);
    this.sectionNodes.set(sectionNumber, node);
  }

  private walkTrackSection(
    obj: TopologyTrackElement,
    incomingPos: TopologyPoint | undefined,
    section: number,
    sectionElements: TopologyTrackElement[]
  ): void {
    const groups =
      this.getTrackConnectionGroupsForIncoming(
        obj,
        incomingPos
      );

    for (const group of groups) {
      const key =
        this.getTrackConnectionKey(obj, group.index);

      if (this.visitedTrackConnectionKeys.has(key)) {
        continue;
      }

      this.visitedTrackConnectionKeys.add(key);
      this.sectionByTrackConnectionKey.set(key, section);

      if (obj.section === 0) {
        obj.section = section;
      }

      this.addSectionElementOnce(
        sectionElements,
        obj
      );

      for (const endpoint of group.endpoints) {
        if (incomingPos?.isEqual(endpoint)) {
          continue;
        }

        this.walkTrackSectionDirection(
          obj,
          endpoint,
          section,
          sectionElements
        );
      }

      obj.isVisited =
        this.areAllTrackConnectionsVisited(obj);
    }
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

    if (!this.hasTrackConnectionAt(next, current.pos)) {
      return;
    }

    if (this.isTrackConnectionVisited(next, current.pos)) {
      return;
    }

    this.walkTrackSection(
      next,
      current.pos,
      section,
      sectionElements
    );
  }

  private addSectionElementOnce(
    sectionElements: TopologyTrackElement[],
    elem: TopologyTrackElement
  ): void {
    if (sectionElements.some(existing => existing.id === elem.id)) {
      return;
    }

    sectionElements.push(elem);
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
      const connections = this.getTurnoutConnectionPoints(turnout);

      for (const [side, point] of Object.entries(connections)) {
        const connectedElem =
          this.topology.getPhysicalTrackAt(point);

        if (!connectedElem) {
          continue;
        }

        if (isTopologyTurnoutElement(connectedElem)) {
          continue;
        }

        const connectedSection =
          this.getSectionForTrackConnection(
            connectedElem,
            turnout.pos
          );

        if (!connectedSection) {
          continue;
        }

        const fromNode =
          this.sectionNodes.get(connectedSection);

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
        ...exit.turnoutStates,
      ];

      const connections =
        this.getTurnoutConnectionPoints(turnout);

      const exitPos =
        connections[exit.exitSide];

      if (!exitPos) {
        continue;
      }

      const nextElem =
        this.topology.getPhysicalTrackAt(exitPos);

      if (!nextElem) {
        continue;
      }

      if (!isTopologyTurnoutElement(nextElem)) {
        this.finishRouteEdge(
          fromNode,
          nextElem,
          turnout.pos,
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
    connectedFrom: TopologyPoint,
    turnoutStates: TurnoutStateRequirement[],
    locoDirection: TravelDirection
  ): void {
    const targetSection =
      this.getSectionForTrackConnection(
        targetElem,
        connectedFrom
      );

    if (!targetSection) {
      return;
    }

    const toNode =
      this.sectionNodes.get(targetSection);

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
    const normalizedStates = this.normalizeTurnoutStates(turnoutStates);

    const turnoutKey = normalizedStates
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
        normalizedStates,
        locoDirection
      )
    );
  }

  private normalizeTurnoutStates(
    turnoutStates: TurnoutStateRequirement[]
  ): TurnoutStateRequirement[] {
    const byAddress = new Map<number, boolean>();

    for (const state of turnoutStates) {
      if (state.address <= 0) {
        continue;
      }

      const existing = byAddress.get(state.address);

      if (existing !== undefined && existing !== state.closed) {
        return turnoutStates;
      }

      byAddress.set(state.address, state.closed);
    }

    return [...byAddress.entries()]
      .sort(([a], [b]) => a - b)
      .map(([address, closed]) => ({
        address,
        closed,
      }));
  }

  private getAllowedTurnoutExits(
    turnout: TopologyTurnoutElement,
    enteredSide: TurnoutSide
  ): TurnoutExit[] {
    if (turnout instanceof TrackTurnoutDoubleElement) {
      return turnout
        .getOppositeRoutesFromSide(enteredSide as any)
        .map(route => {
          const exitSide =
            turnout.getRouteExitSide(route, enteredSide as any);

          if (!exitSide) {
            return null;
          }

          return {
            exitSide,
            turnoutStates: [...route.turnoutStates],
          };
        })
        .filter((exit): exit is TurnoutExit => exit !== null);
    }

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
            turnoutStates: [straightState],
          },
          {
            exitSide: "div",
            turnoutStates: [divState],
          },
        ];

      case "straight":
        return [
          {
            exitSide: "entry",
            turnoutStates: [straightState],
          },
        ];

      case "div":
        return [
          {
            exitSide: "entry",
            turnoutStates: [divState],
          },
        ];

      default:
        return [];
    }
  }

  private getTurnoutConnectionPoints(
    turnout: TopologyTurnoutElement
  ): Record<string, TopologyPoint> {
    return turnout.getConnections() as unknown as Record<string, TopologyPoint>;
  }

  private getTurnoutSideConnectedToElement(
    turnout: TopologyTurnoutElement,
    other: TopologyTrackElement
  ): TurnoutSide | undefined {
    const connections = this.getTurnoutConnectionPoints(turnout);

    for (const [side, point] of Object.entries(connections)) {
      if (point.isEqual(other.pos)) {
        return side;
      }
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

    const side =
      this.getLinearConnectionSideTowards(
        sectionElem,
        turnout.pos
      );

    if (side === "next") {
      return sectionElem.travelDirection;
    }

    if (side === "prev") {
      return sectionElem.travelDirection === "forward"
        ? "reverse"
        : "forward";
    }

    return "unknown";
  }

  private getSectionForTrackConnection(
    element: TopologyTrackElement,
    connectedFrom: TopologyPoint
  ): number {
    const group =
      this.getTrackConnectionGroupsForIncoming(
        element,
        connectedFrom
      )[0];

    if (!group) {
      return 0;
    }

    const key =
      this.getTrackConnectionKey(
        element,
        group.index
      );

    return (
      this.sectionByTrackConnectionKey.get(key) ??
      element.section ??
      0
    );
  }

  private isTrackConnectionVisited(
    element: TopologyTrackElement,
    connectedFrom: TopologyPoint
  ): boolean {
    const groups =
      this.getTrackConnectionGroupsForIncoming(
        element,
        connectedFrom
      );

    return (
      groups.length > 0 &&
      groups.every(group =>
        this.visitedTrackConnectionKeys.has(
          this.getTrackConnectionKey(
            element,
            group.index
          )
        )
      )
    );
  }

  private areAllTrackConnectionsVisited(
    element: TopologyTrackElement
  ): boolean {
    const groups =
      this.getTrackConnectionGroups(element);

    return (
      groups.length > 0 &&
      groups.every(group =>
        this.visitedTrackConnectionKeys.has(
          this.getTrackConnectionKey(
            element,
            group.index
          )
        )
      )
    );
  }

  private hasTrackConnectionAt(
    element: TopologyTrackElement,
    point: TopologyPoint
  ): boolean {
    return this.getTrackConnectionGroupsForIncoming(
      element,
      point
    ).length > 0;
  }

  private getLinearConnectionSideTowards(
    element: TopologyTrackElement,
    point: TopologyPoint
  ): LinearConnectionSide | undefined {
    for (const pair of element.getNeighborPointPairs()) {
      if (pair[0].isEqual(point)) {
        return "prev";
      }

      if (pair[1].isEqual(point)) {
        return "next";
      }
    }

    return undefined;
  }

  private getTrackConnectionGroupsForIncoming(
    element: TopologyTrackElement,
    incomingPos?: TopologyPoint
  ): TrackConnectionGroup[] {
    const groups =
      this.getTrackConnectionGroups(element);

    if (!incomingPos) {
      return groups;
    }

    return groups.filter(group =>
      group.endpoints.some(endpoint =>
        endpoint.isEqual(incomingPos)
      )
    );
  }

  private getTrackConnectionGroups(
    element: TopologyTrackElement
  ): TrackConnectionGroup[] {
    return element.getNeighborPointPairs().map(
      (pair, index) => ({
        index,
        endpoints: [...pair],
      })
    );
  }

  private getTrackConnectionKey(
    element: TopologyTrackElement,
    groupIndex: number
  ): string {
    return `${element.id}:${groupIndex}`;
  }
}
