import fs from "node:fs/promises";
import path from "node:path";
import { dataDir } from "../paths.js";
import { railwayTopologyStore } from "./railwayTopologyStore.js";
import { routeGraphRuntimeStore } from "./routeGraphRuntimeStore.js";
class LayoutRuntimeStore {
    layout = null;
    initialized = false;
    resolveFilePath() {
        return path.resolve(dataDir, "layout.json");
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        this.layout = await this.readLayoutFromDisk();
        this.initialized = true;
        railwayTopologyStore.rebuildFromLayout(this.layout);
        routeGraphRuntimeStore.rebuildFromTopology(railwayTopologyStore.getTopology());
        console.log("[LayoutRuntimeStore] Initialized:", this.layout ? "layout loaded" : "no layout found");
    }
    getLayout() {
        return this.layout;
    }
    hasLayout() {
        return this.layout !== null;
    }
    async replaceLayout(layout) {
        this.layout = layout;
        this.initialized = true;
        railwayTopologyStore.rebuildFromLayout(layout);
        routeGraphRuntimeStore.rebuildFromTopology(railwayTopologyStore.getTopology());
        await this.writeLayoutToDisk(layout);
        console.log("[LayoutRuntimeStore] Runtime layout replaced and persisted.");
    }
    async readLayoutFromDisk() {
        const filePath = this.resolveFilePath();
        try {
            const content = await fs.readFile(filePath, "utf8");
            return JSON.parse(content);
        }
        catch (error) {
            console.log("[LayoutRuntimeStore] Could not read layout:", filePath, error instanceof Error ? error.message : error);
            return null;
        }
    }
    async writeLayoutToDisk(layout) {
        const filePath = this.resolveFilePath();
        await fs.mkdir(path.dirname(filePath), {
            recursive: true,
        });
        await fs.writeFile(filePath, JSON.stringify(layout, null, 2), "utf8");
    }
    refreshRuntimeFromLayout(layout) {
        railwayTopologyStore.rebuildFromLayout(layout);
        routeGraphRuntimeStore.rebuildFromTopology(railwayTopologyStore.getTopology());
        console.log("[LayoutRuntimeStore] Runtime topology and route graph refreshed without persisting layout.");
    }
}
export const layoutRuntimeStore = new LayoutRuntimeStore();
