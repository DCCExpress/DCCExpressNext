// server/src/services/railwayTopologyStore.ts

import {
  buildRailwayTopologyFromLayout,
  RailwayTopologyLayout,
} from "../../../common/src/railway/topology.js";
import type {
  SerializedLayoutDto,
} from "../../../common/src/layout/layoutDto.js";
import { log } from "../utility.js";

class RailwayTopologyStore {
  private topology: RailwayTopologyLayout | null = null;

  rebuildFromLayout(
    layout: SerializedLayoutDto | null
  ): void {
    this.topology = buildRailwayTopologyFromLayout(layout);

    const physicalTracks =
      this.topology.getPhysicalTrackElements().length;

    const turnouts =
      this.topology.getTurnouts().length;

    const blocks =
      this.topology.getBlocks().length;

    const sensors =
      this.topology.getSensors().length;

    const signals =
      this.topology.getSignals().length;

    const directions =
      this.topology.getDirectionElements().length;

    log("[RailwayTopologyStore] Topology rebuilt:");
    log("  physical tracks:", physicalTracks);
    log("  turnouts:", turnouts);
    log("  blocks:", blocks);
    log("  sensors:", sensors);
    log("  signals:", signals);
    log("  direction elements:", directions);
  }

  getTopology(): RailwayTopologyLayout | null {
    return this.topology;
  }

  hasTopology(): boolean {
    return this.topology !== null;
  }
}

export const railwayTopologyStore =
  new RailwayTopologyStore();
