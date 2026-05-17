import { BlockRouteSolution, Graph } from "../models/editor/core/Graph";


type RouteReservationResult =
  | {
    ok: true;
  }
  | {
    ok: false;
    error: string;
  };

type RouteGraphListener = (graph: Graph | null) => void;

class RouteGraphStore {
  private graph: Graph | null = null;
  private listeners = new Set<RouteGraphListener>();
  private readonly busyTurnoutAddresses = new Set<number>();

  getGraph(): Graph | null {
    return this.graph;
  }

  setGraph(graph: Graph | null): void {
    this.graph = graph;
    this.emit();
  }

  clear(): void {
    this.graph = null;
    this.emit();
  }

  subscribe(listener: RouteGraphListener): () => void {
    this.listeners.add(listener);

    // Az új feliratkozó azonnal megkapja az aktuális gráfot
    listener(this.graph);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.graph);
    }
  }

  setRouteBusy(
    solution: BlockRouteSolution,
    busy: boolean
  ): void {
    for (const node of solution.nodes) {
      node.busy = busy;
    }

    this.emit();
  }

  tryReserveRoute(
    solution: BlockRouteSolution
  ): RouteReservationResult {
    const busyNodes = solution.nodes.filter(node => node.busy);

    if (busyNodes.length > 0) {
      return {
        ok: false,
        error:
          "Az útvonal nem foglalható, mert ezek a szegmensek már busy-k: " +
          busyNodes.map(node => node.name).join(", "),
      };
    }

    const busyTurnouts = solution.turnoutStates.filter(turnoutState =>
      this.busyTurnoutAddresses.has(turnoutState.address)
    );

    if (busyTurnouts.length > 0) {
      return {
        ok: false,
        error:
          "Az útvonal nem foglalható, mert ezek a váltók már busy-k: " +
          busyTurnouts.map(t => `#${t.address}`).join(", "),
      };
    }

    // Szegmensek foglalása a gráfban
    for (const node of solution.nodes) {
      node.busy = true;
    }

    // Váltók foglalása a gráf-store nyilvántartásában
    for (const turnoutState of solution.turnoutStates) {
      this.busyTurnoutAddresses.add(turnoutState.address);
    }

    this.emit();

    return {
      ok: true,
    };
  }

  releaseRoute(solution: BlockRouteSolution): void {
    for (const node of solution.nodes) {
      node.busy = false;
    }

    for (const turnoutState of solution.turnoutStates) {
      this.busyTurnoutAddresses.delete(turnoutState.address);
    }

    this.emit();
  }

  clearAllBusy(): void {
    if (this.graph) {
      for (const node of this.graph.nodes) {
        node.busy = false;
      }
    }
    this.busyTurnoutAddresses.clear();
    this.emit();
  }
}

export const routeGraphStore = new RouteGraphStore();