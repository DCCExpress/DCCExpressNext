// server/src/services/railwayTopologyStore.ts
import { buildRailwayTopologyFromLayout, } from "../../../common/src/railway/topology.js";
class RailwayTopologyStore {
    topology = null;
    rebuildFromLayout(layout) {
        this.topology = buildRailwayTopologyFromLayout(layout);
        const physicalTracks = this.topology.getPhysicalTrackElements().length;
        const turnouts = this.topology.getTurnouts().length;
        const blocks = this.topology.getBlocks().length;
        const sensors = this.topology.getSensors().length;
        const signals = this.topology.getSignals().length;
        const directions = this.topology.getDirectionElements().length;
        console.log("[RailwayTopologyStore] Topology rebuilt:");
        console.log("  physical tracks:", physicalTracks);
        console.log("  turnouts:", turnouts);
        console.log("  blocks:", blocks);
        console.log("  sensors:", sensors);
        console.log("  signals:", signals);
        console.log("  direction elements:", directions);
    }
    getTopology() {
        return this.topology;
    }
    hasTopology() {
        return this.topology !== null;
    }
}
export const railwayTopologyStore = new RailwayTopologyStore();
