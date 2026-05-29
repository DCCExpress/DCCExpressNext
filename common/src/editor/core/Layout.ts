import { ElementFactory } from "./ElementFactory";
import { Layer } from "./Layer";
import type { BaseElement } from "./BaseElement";
import type { ElementId, ElementJSON, LayerId, LayoutJSON } from "./types";

export class Layout {
  version: number;
  name: string;
  gridSize: number;

  private layers: Layer[];
  private layerMap: Map<LayerId, Layer>;
  private elementMap: Map<ElementId, BaseElement>;

  constructor(params?: { version?: number; name?: string; gridSize?: number; layers?: Layer[] }) {
    this.version = params?.version ?? 1;
    this.name = params?.name ?? "Untitled layout";
    this.gridSize = params?.gridSize ?? 32;
    this.layers = [];
    this.layerMap = new Map();
    this.elementMap = new Map();

    for (const layer of params?.layers ?? []) {
      this.addLayer(layer);
    }
  }

  static createDefault(): Layout {
    return new Layout({
      layers: [
        new Layer({ id: "track", name: "Track", kind: "track", order: 10 }),
        new Layer({ id: "block", name: "Blocks", kind: "block", order: 20 }),
        new Layer({ id: "sensor", name: "Sensors", kind: "sensor", order: 30 }),
        new Layer({ id: "signal", name: "Signals", kind: "signal", order: 40 }),
        new Layer({ id: "control", name: "Controls", kind: "control", order: 50 }),
      ],
    });
  }

  static fromJSON(json: LayoutJSON): Layout {
    const layers = json.layers.map((layerJson) => {
      const elements = layerJson.elements.map((elementJson) => ElementFactory.fromJSON(elementJson));

      return new Layer({
        id: layerJson.id,
        name: layerJson.name,
        kind: layerJson.kind,
        order: layerJson.order,
        visible: layerJson.visible,
        locked: layerJson.locked,
        elements,
      });
    });

    return new Layout({
      version: json.version,
      name: json.name,
      gridSize: json.gridSize,
      layers,
    });
  }

  toJSON(): LayoutJSON {
    return {
      version: this.version,
      name: this.name,
      gridSize: this.gridSize,
      layers: this.getLayers().map((layer) => layer.toJSON()),
    };
  }

  addLayer(layer: Layer): void {
    this.layers.push(layer);
    this.layerMap.set(layer.id, layer);

    for (const element of layer.getAllElements()) {
      this.elementMap.set(element.id, element);
    }

    this.layers.sort((left, right) => left.order - right.order);
  }

  getLayer(id: LayerId): Layer | undefined {
    return this.layerMap.get(id);
  }

  requireLayer(id: LayerId): Layer {
    const layer = this.getLayer(id);

    if (!layer) {
      throw new Error(`Layer not found: ${id}`);
    }

    return layer;
  }

  getLayers(): Layer[] {
    return [...this.layers];
  }

  addElement(element: BaseElement, layerId = element.layerId): void {
    const layer = this.requireLayer(layerId);
    layer.addElement(element);
    this.elementMap.set(element.id, element);
  }

  addElementJSON(json: ElementJSON): BaseElement {
    const element = ElementFactory.fromJSON(json);
    this.addElement(element, json.layerId);
    return element;
  }

  findElement(id: ElementId): BaseElement | undefined {
    return this.elementMap.get(id);
  }

  requireElement(id: ElementId): BaseElement {
    const element = this.findElement(id);

    if (!element) {
      throw new Error(`Element not found: ${id}`);
    }

    return element;
  }

  getAllElements(): BaseElement[] {
    return this.getLayers().flatMap((layer) => layer.getAllElements());
  }

  removeElement(id: ElementId): BaseElement | undefined {
    const element = this.elementMap.get(id);

    if (!element) {
      return undefined;
    }

    const removed = this.requireLayer(element.layerId).removeElement(id);

    if (removed) {
      this.elementMap.delete(id);
    }

    return removed;
  }
}
