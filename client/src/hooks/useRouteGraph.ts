import { useCallback, useEffect, useState } from "react";
import type { Graph } from "../../../common/src/railway/graph";
import { routeGraphStore } from "../services/routeGraphStore";

export function useRouteGraph() {
  const [graph, setGraphState] = useState<Graph | null>(() =>
    routeGraphStore.getGraph()
  );

  useEffect(() => {
    return routeGraphStore.subscribe(setGraphState);
  }, []);

  const setGraph = useCallback((graph: Graph | null) => {
    routeGraphStore.setGraph(graph);
  }, []);

  const clearGraph = useCallback(() => {
    routeGraphStore.clear();
  }, []);

  const ensureLoaded = useCallback(() => {
    return routeGraphStore.ensureLoaded();
  }, []);

  const reload = useCallback(() => {
    return routeGraphStore.reload();
  }, []);

  return {
    graph,
    setGraph,
    clearGraph,
    ensureLoaded,
    reload,
  };
}
