import { Layout, type LayoutJSON } from "@common";
import { JsonObjectFileStore } from "../storage/JsonObjectFileStore.js";

export class FileLayoutStore {
  private readonly store: JsonObjectFileStore<Layout, LayoutJSON>;

  constructor(filePath: string) {
    this.store = new JsonObjectFileStore<Layout, LayoutJSON>(
      filePath,
      () => Layout.createDefault().toJSON(),
      (json) => Layout.fromJSON(json),
      (layout) => layout.toJSON(),
    );
  }

  load(): Promise<Layout> {
    return this.store.load();
  }

  save(layout: Layout): Promise<void> {
    return this.store.save(layout);
  }
}
