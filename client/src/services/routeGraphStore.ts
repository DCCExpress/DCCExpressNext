import { Graph } from "../models/editor/core/Graph";

type RouteGraphListener = (graph: Graph | null) => void;

class RouteGraphStore {
  private graph: Graph | null = null;
  private listeners = new Set<RouteGraphListener>();

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
}

export const routeGraphStore = new RouteGraphStore();