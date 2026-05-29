import { BaseElement } from "./BaseElement.js";
import type { ElementId, LayerId, LayerJSON, LayerKind } from "./types.js";

export class Layer {
  readonly id: LayerId;

  name: string;
  kind: LayerKind;
  order: number;
  visible: boolean;
  locked: boolean;

  private elements: BaseElement[] = [];
  private elementMap = new Map<ElementId, BaseElement>();

  constructor(params: {
    id: LayerId;
    name: string;
    kind: LayerKind;
    order: number;
    visible?: boolean;
    locked?: boolean;
    elements?: BaseElement[];
  }) {
    this.id = params.id;
    this.name = params.name;
    this.kind = params.kind;
    this.order = params.order;
    this.visible = params.visible ?? true;
    this.locked = params.locked ?? false;

    for (const element of params.elements ?? []) {
      this.addElement(element);
    }
  }

  addElement(element: BaseElement): void {
    this.assertNotLocked();

    if (this.elementMap.has(element.id)) {
      throw new Error(`Element already exists in layer ${this.id}: ${element.id}`);
    }

    element.layerId = this.id;
    this.elements.push(element);
    this.elementMap.set(element.id, element);
  }

  removeElement(id: ElementId): BaseElement | undefined {
    this.assertNotLocked();

    const element = this.elementMap.get(id);
    if (!element) return undefined;

    this.elements = this.elements.filter((item) => item.id !== id);
    this.elementMap.delete(id);

    return element;
  }

  findElement(id: ElementId): BaseElement | undefined {
    return this.elementMap.get(id);
  }

  hasElement(id: ElementId): boolean {
    return this.elementMap.has(id);
  }

  getAllElements(): BaseElement[] {
    return [...this.elements];
  }

  getVisibleElements(): BaseElement[] {
    if (!this.visible) return [];
    return this.elements.filter((element) => element.visible);
  }

  toJSON(): LayerJSON {
    return {
      id: this.id,
      name: this.name,
      kind: this.kind,
      order: this.order,
      visible: this.visible,
      locked: this.locked,
      elements: this.elements.map((element) => element.toJSON()),
    };
  }

  private assertNotLocked(): void {
    if (this.locked) {
      throw new Error(`Layer is locked: ${this.id}`);
    }
  }
}
