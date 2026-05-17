// server/src/services/routeGraphRuntimeStore.ts
import { RouteGraphBuilder, } from "../../../common/src/railway/routeGraphBuilder.js";
class RouteGraphRuntimeStore {
    graph = null;
    rebuildFromTopology(topology) {
        if (!topology) {
            this.graph = null;
            console.log("[RouteGraphRuntimeStore] Graph cleared: no topology.");
            return;
        }
        this.graph =
            new RouteGraphBuilder(topology).build();
        const blockCount = this.graph.nodes.reduce((sum, node) => sum + node.blocks.length, 0);
        console.log("[RouteGraphRuntimeStore] Graph rebuilt:");
        console.log("  nodes:", this.graph.nodes.length);
        console.log("  edges:", this.graph.edges.length);
        console.log("  blocks:", blockCount);
    }
    getGraph() {
        return this.graph;
    }
    hasGraph() {
        return this.graph !== null;
    }
}
export const routeGraphRuntimeStore = new RouteGraphRuntimeStore();
