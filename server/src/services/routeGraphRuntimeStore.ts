// server/src/services/routeGraphRuntimeStore.ts

import {
  Graph,
  type BlockRouteSolution,
} from "../../../common/src/railway/graph.js";

import {
  RouteGraphBuilder,
} from "../../../common/src/railway/routeGraphBuilder.js";

import type {
  RailwayTopologyLayout,
} from "../../../common/src/railway/topology.js";

type RouteReservation = {
  key: string;
  fromBlockName: string;
  toBlockName: string;
  sectionNames: string[];
  turnoutAddresses: number[];
};

class RouteGraphRuntimeStore {
  private graph: Graph | null = null;
  private readonly busyTurnoutAddresses = new Set<number>();

  private readonly reservations = new Map<string, RouteReservation>();



  rebuildFromTopology(
    topology: RailwayTopologyLayout | null
  ): void {
    if (!topology) {
      this.graph = null;

      console.log(
        "[RouteGraphRuntimeStore] Graph cleared: no topology."
      );

      return;
    }

    this.busyTurnoutAddresses.clear();
    this.reservations.clear();
    this.graph =
      new RouteGraphBuilder(topology).build();

    const blockCount =
      this.graph.nodes.reduce(
        (sum, node) => sum + node.blocks.length,
        0
      );

    console.log(
      "[RouteGraphRuntimeStore] Graph rebuilt:"
    );

    console.log("  nodes:", this.graph.nodes.length);
    console.log("  edges:", this.graph.edges.length);
    console.log("  blocks:", blockCount);
  }

  getGraph(): Graph | null {
    return this.graph;
  }

  hasGraph(): boolean {
    return this.graph !== null;
  }

  private createReservationKey(
    fromBlockName: string,
    toBlockName: string
  ): string {
    return `${fromBlockName.trim()}=>${toBlockName.trim()}`;
  }

  tryReserveRoute(
    fromBlockName: string,
    toBlockName: string,
    solution: BlockRouteSolution
  ):
    | {
      ok: true;
      reservation: RouteReservation;
    }
    | {
      ok: false;
      error: string;
    } {
    const key = this.createReservationKey(
      fromBlockName,
      toBlockName
    );

    if (this.reservations.has(key)) {
      return {
        ok: false,
        error: `Ez az útvonal már foglalt: ${fromBlockName} → ${toBlockName}`,
      };
    }

    const busyNodes = solution.nodes.filter(
      node => node.busy
    );

    if (busyNodes.length > 0) {
      return {
        ok: false,
        error:
          "Az útvonal nem foglalható, mert ezek a szegmensek már foglaltak: " +
          busyNodes.map(node => node.name).join(", "),
      };
    }

    const busyTurnouts =
      solution.turnoutStates.filter(turnout =>
        this.busyTurnoutAddresses.has(
          turnout.address
        )
      );

    if (busyTurnouts.length > 0) {
      return {
        ok: false,
        error:
          "Az útvonal nem foglalható, mert ezek a váltók már foglaltak: " +
          busyTurnouts
            .map(turnout => `#${turnout.address}`)
            .join(", "),
      };
    }

    const sectionNames =
      solution.nodes.map(node => node.name);

    const turnoutAddresses =
      solution.turnoutStates.map(
        turnout => turnout.address
      );

    for (const node of solution.nodes) {
      node.busy = true;
    }

    for (const address of turnoutAddresses) {
      this.busyTurnoutAddresses.add(address);
    }

    const reservation: RouteReservation = {
      key,
      fromBlockName,
      toBlockName,
      sectionNames,
      turnoutAddresses,
    };

    this.reservations.set(key, reservation);

    return {
      ok: true,
      reservation,
    };
  }

  releaseRouteReservation(
    fromBlockName: string,
    toBlockName: string
  ):
    | {
      ok: true;
      releasedSectionNames: string[];
      retainedSectionNames: string[];
      releasedTurnoutAddresses: number[];
      retainedTurnoutAddresses: number[];
    }
    | {
      ok: false;
      error: string;
    } {
    const key = this.createReservationKey(
      fromBlockName,
      toBlockName
    );

    const reservation = this.reservations.get(key);

    if (!reservation) {
      return {
        ok: false,
        error: `Nincs ilyen lefoglalt útvonal: ${fromBlockName} → ${toBlockName}`,
      };
    }

    /**
     * Először kivesszük ezt a reservationt.
     * Így amikor megnézzük, hogy egy section/váltó
     * kell-e még másik útvonalnak, már csak a TÖBBI foglalás számít.
     */
    this.reservations.delete(key);

    const releasedSectionNames: string[] = [];
    const retainedSectionNames: string[] = [];

    const releasedTurnoutAddresses: number[] = [];
    const retainedTurnoutAddresses: number[] = [];

    /**
     * SZAKASZOK FELOLDÁSA
     */
    for (const sectionName of reservation.sectionNames) {
      const stillUsedByAnotherReservation = [
        ...this.reservations.values(),
      ].some(otherReservation =>
        otherReservation.sectionNames.includes(sectionName)
      );

      if (stillUsedByAnotherReservation) {
        retainedSectionNames.push(sectionName);
        continue;
      }

      const node = this.graph?.nodes.find(
        item => item.name === sectionName
      );

      if (node) {
        node.busy = false;
      }

      releasedSectionNames.push(sectionName);
    }

    /**
     * VÁLTÓK FELOLDÁSA
     */
    for (const turnoutAddress of reservation.turnoutAddresses) {
      const stillUsedByAnotherReservation = [
        ...this.reservations.values(),
      ].some(otherReservation =>
        otherReservation.turnoutAddresses.includes(turnoutAddress)
      );

      if (stillUsedByAnotherReservation) {
        retainedTurnoutAddresses.push(turnoutAddress);
        continue;
      }

      this.busyTurnoutAddresses.delete(turnoutAddress);
      releasedTurnoutAddresses.push(turnoutAddress);
    }

    return {
      ok: true,
      releasedSectionNames,
      retainedSectionNames,
      releasedTurnoutAddresses,
      retainedTurnoutAddresses,
    };
  }

  clearAllBusy(): void {
    if (this.graph) {
      for (const node of this.graph.nodes) {
        node.busy = false;
      }
    }

    this.busyTurnoutAddresses.clear();
    this.reservations.clear();
  }

  getElementIdsForSections(
    sectionNames: string[]
  ): string[] {
    if (!this.graph) {
      return [];
    }

    const sectionNameSet =
      new Set(sectionNames);

    return this.graph.nodes
      .filter(node => sectionNameSet.has(node.name))
      .flatMap(node => node.elementIds);
  }
  
  isTurnoutBusy(address: number): boolean {
    return this.busyTurnoutAddresses.has(address);
  }
}

export const routeGraphRuntimeStore =
  new RouteGraphRuntimeStore();