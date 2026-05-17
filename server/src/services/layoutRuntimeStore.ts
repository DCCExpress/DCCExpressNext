import fs from "node:fs/promises";
import path from "node:path";
import { dataDir } from "../paths.js";
import type { SerializedLayoutDto } from "../../../common/src/railway/topology.js";
import { railwayTopologyStore } from "./railwayTopologyStore.js";
import { routeGraphRuntimeStore } from "./routeGraphRuntimeStore.js";

/**
 * A szerveren memóriában tartott, mentett layout nyers DTO-ja.
 *
 * Egyelőre szándékosan nem próbáljuk meg teljesen letípusozni,
 * mert a kliens jelenlegi layout modellje még UI-osztályokra épül.
 * A következő lépésben ebből készül majd közös, rajzolásmentes topology modell.
 */
export type ServerLayoutDto = SerializedLayoutDto;

class LayoutRuntimeStore {
  private layout: ServerLayoutDto | null = null;
  private initialized = false;

  private resolveFilePath(): string {
    return path.resolve(dataDir, "layout.json");
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.layout = await this.readLayoutFromDisk();
    this.initialized = true;

    railwayTopologyStore.rebuildFromLayout(this.layout);

    routeGraphRuntimeStore.rebuildFromTopology(
      railwayTopologyStore.getTopology()
    );

    console.log(
      "[LayoutRuntimeStore] Initialized:",
      this.layout ? "layout loaded" : "no layout found"
    );
  }
  getLayout(): ServerLayoutDto | null {
    return this.layout;
  }

  hasLayout(): boolean {
    return this.layout !== null;
  }

  async replaceLayout(layout: ServerLayoutDto): Promise<void> {
    this.layout = layout;
    this.initialized = true;

    railwayTopologyStore.rebuildFromLayout(layout);
    routeGraphRuntimeStore.rebuildFromTopology(
      railwayTopologyStore.getTopology()
    );

    await this.writeLayoutToDisk(layout);

    console.log(
      "[LayoutRuntimeStore] Runtime layout replaced and persisted."
    );
  }

  private async readLayoutFromDisk(): Promise<ServerLayoutDto | null> {
    const filePath = this.resolveFilePath();

    try {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content) as ServerLayoutDto;
    } catch (error) {
      console.log(
        "[LayoutRuntimeStore] Could not read layout:",
        filePath,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }

  private async writeLayoutToDisk(
    layout: ServerLayoutDto
  ): Promise<void> {
    const filePath = this.resolveFilePath();

    await fs.mkdir(path.dirname(filePath), {
      recursive: true,
    });

    await fs.writeFile(
      filePath,
      JSON.stringify(layout, null, 2),
      "utf8"
    );
  }
}

export const layoutRuntimeStore = new LayoutRuntimeStore();