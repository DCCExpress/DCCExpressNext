import fs from "node:fs/promises";
import path from "node:path";
import { dataDir } from "../paths.js";
import type {
  SerializedLayoutDto,
} from "../../../common/src/layout/layoutDto.js";
import { railwayTopologyStore } from "./railwayTopologyStore.js";
import { routeGraphRuntimeStore } from "./routeGraphRuntimeStore.js";
import { log } from "../utility.js";

/**
 * A szerveren memóriában tartott, mentett layout nyers DTO-ja.
 *
 * A layoutot továbbra is nyers, perzisztálható DTO-ként őrizzük,
 * a szerveroldali vasúti/topológiai modell viszont már ebből
 * a közös common domain elemekre épül fel.
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

    this.tryRebuildDerivedRuntime(
      this.layout,
      "initialize"
    );

    log(
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

    await this.writeLayoutToDisk(layout);

    this.tryRebuildDerivedRuntime(
      layout,
      "replaceLayout"
    );

    console.log(
      "[LayoutRuntimeStore] Layout persisted. Runtime graph was refreshed when possible."
    );
  }

  refreshRuntimeFromLayout(layout: ServerLayoutDto): void {
    this.rebuildDerivedRuntime(layout);

    console.log(
      "[LayoutRuntimeStore] Runtime topology and route graph refreshed without persisting layout."
    );
  }

  private tryRebuildDerivedRuntime(
    layout: ServerLayoutDto | null,
    reason: string
  ): void {
    try {
      this.rebuildDerivedRuntime(layout);
    } catch (error) {
      routeGraphRuntimeStore.rebuildFromTopology(null);

      console.warn(
        `[LayoutRuntimeStore] Runtime graph not ready during ${reason}:`,
        error instanceof Error
          ? error.message
          : error
      );
    }
  }

  private validateRuntimeGraphPrerequisites(): void {
    const topology =
      railwayTopologyStore.getTopology();

    if (!topology) {
      return;
    }

    const physicalTracks =
      topology.getPhysicalTrackElements();

    if (physicalTracks.length === 0) {
      return;
    }

    const directionElements =
      topology.getDirectionElements();

    if (directionElements.length > 0) {
      return;
    }

    throw new Error(
      "A runtime route graph nem építhető fel: hiányzik a Track direction elem. " +
        "Tegyél le legalább egy TrackDirection elemet a pályára, hogy a rendszer tudja a haladási irányokat."
    );
  }

  private rebuildDerivedRuntime(
    layout: ServerLayoutDto | null
  ): void {
    railwayTopologyStore.rebuildFromLayout(layout);

    this.validateRuntimeGraphPrerequisites();

    routeGraphRuntimeStore.rebuildFromTopology(
      railwayTopologyStore.getTopology()
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
