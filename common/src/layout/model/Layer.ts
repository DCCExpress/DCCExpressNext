// common/src/layout/model/Layer.ts

import {
  BaseElement,
} from "./BaseElement.js";

export type LayerId =
  | "track"
  | "blocks"
  | "buildings"
  | "sensors"
  | "signals"
  | string;

export type LayerOptions = Partial<
  Pick<Layer, "visible" | "locked">
>;

/**
 * Grafikamentes, közös layout réteg.
 *
 * A rajzolás szándékosan nincs itt:
 * azt a kliensoldali LayerView adja hozzá.
 */
export class Layer<
  TElement extends BaseElement = BaseElement
> {
  public readonly id: LayerId;
  public name: string;
  public visible: boolean;
  public locked: boolean;
  public elements: TElement[];

  constructor(
    id: LayerId,
    name: string,
    options?: LayerOptions
  ) {
    this.id = id;
    this.name = name;
    this.visible = options?.visible ?? true;
    this.locked = options?.locked ?? false;
    this.elements = [];
  }

  add(element: TElement): void {
    this.elements.push(element);
  }

  remove(element: TElement): void {
    this.elements = this.elements.filter(
      current => current !== element
    );
  }

  clear(): void {
    this.elements = [];
  }

  hitTest(x: number, y: number): boolean {
    return this.elements.some(
      element => element.hitTest(x, y)
    );
  }
}
