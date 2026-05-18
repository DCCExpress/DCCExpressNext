import { useEffect, useState } from "react";
import type { Graph } from "../../../common/src/railway/graph";
import { routeGraphStore } from "../services/routeGraphStore";

export function useRouteGraph() {
  const [graph, setGraphState] = useState<Graph | null>(() =>
    routeGraphStore.getGraph()
  );

  useEffect(() => {
    return routeGraphStore.subscribe(setGraphState);
  }, []);

  return {
    graph,

    setGraph: (graph: Graph | null) => {
      routeGraphStore.setGraph(graph);
    },

    clearGraph: () => {
      routeGraphStore.clear();
    },

    ensureLoaded: () => {
      return routeGraphStore.ensureLoaded();
    },

    reload: () => {
      return routeGraphStore.reload();
    },
  };
}