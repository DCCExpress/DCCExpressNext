import { Graph } from "../models/editor/core/Graph";
import { getRouteGraph } from "../api/http";
import { createClientGraphFromRouteGraphDto } from "./routeGraphDtoMapper";

type RouteGraphListener = (graph: Graph | null) => void;

class RouteGraphStore {
  private graph: Graph | null = null;
  private listeners = new Set<RouteGraphListener>();

  /**
   * true = a cache nem tekinthető frissnek,
   * következő ensureLoaded() újratölt a szerverről.
   */
  private stale = true;

  /**
   * Ha több komponens egyszerre kér gráfot,
   * ne induljon több HTTP kérés.
   */
  private loadingPromise: Promise<Graph | null> | null = null;

  getGraph(): Graph | null {
    return this.graph;
  }

  isLoaded(): boolean {
    return this.graph !== null && !this.stale;
  }

  /**
   * Kézi beállítás főleg akkor kell,
   * ha valahol már létrejött Graph objektum.
   */
  setGraph(graph: Graph | null): void {
    this.graph = graph;
    this.stale = graph === null;
    this.emit();
  }

  /**
   * A jelenlegi kliens cache már nem biztos, hogy a szerver aktuális gráfja.
   * Példa: layout mentés után.
   */
  invalidate(): void {
    this.graph = null;
    this.stale = true;
    this.emit();
  }

  /**
   * Régi clear() hívások kompatibilitására.
   * Most ugyanaz, mint invalidate().
   */
  clear(): void {
    this.invalidate();
  }

  /**
   * Ha már van friss gráf, nem csinál semmit.
   * Ha nincs, pontosan egyszer lekéri.
   */
  async ensureLoaded(): Promise<Graph | null> {
    if (this.graph && !this.stale) {
      return this.graph;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.loadFromServer();

    try {
      return await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  /**
   * Mindig újratölti a szerver aktuális route graphját.
   * Generate / Refresh gombhoz ezt használjuk.
   */
  async reload(): Promise<Graph | null> {
    this.stale = true;
    this.graph = null;
    this.emit();

    return this.ensureLoaded();
  }

  subscribe(listener: RouteGraphListener): () => void {
    this.listeners.add(listener);

    listener(this.graph);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private async loadFromServer(): Promise<Graph | null> {
    const response = await getRouteGraph();

    if (!response.ready) {
      this.graph = null;
      this.stale = true;
      this.emit();
      return null;
    }

    const graph =
      createClientGraphFromRouteGraphDto(response);

    this.graph = graph;
    this.stale = false;
    this.emit();

    return graph;
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.graph);
    }
  }
}

export const routeGraphStore = new RouteGraphStore();