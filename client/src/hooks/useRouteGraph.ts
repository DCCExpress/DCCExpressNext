import { useEffect, useState } from "react";
import { Graph } from "../models/editor/core/Graph";
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
  };
}