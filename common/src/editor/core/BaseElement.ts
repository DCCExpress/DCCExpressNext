import type { ElementId, ElementJSON, LayerId, Rect } from "./types.js";

export abstract class BaseElement<TJSON extends ElementJSON = ElementJSON> {
  readonly id: ElementId;
  abstract readonly type: string;

  layerId: LayerId;

  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;

  visible: boolean;
  locked: boolean;
  name?: string;

  protected constructor(json: TJSON) {
    this.id = json.id;
    this.layerId = json.layerId;

    this.x = json.x;
    this.y = json.y;
    this.width = json.width;
    this.height = json.height;
    this.rotation = json.rotation;

    this.visible = json.visible ?? true;
    this.locked = json.locked ?? false;
    this.name = json.name;
  }

  getBounds(): Rect {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  containsGridPoint(x: number, y: number): boolean {
    return (
      x >= this.x &&
      y >= this.y &&
      x < this.x + this.width &&
      y < this.y + this.height
    );
  }

  moveTo(x: number, y: number): void {
    this.assertNotLocked();
    this.x = x;
    this.y = y;
  }

  rotateTo(rotation: number): void {
    this.assertNotLocked();
    this.rotation = ((rotation % 360) + 360) % 360;
  }

  updateFromJSON(patch: Partial<TJSON>): void {
    this.assertNotLocked();

    if (patch.layerId !== undefined) this.layerId = patch.layerId;
    if (patch.x !== undefined) this.x = patch.x;
    if (patch.y !== undefined) this.y = patch.y;
    if (patch.width !== undefined) this.width = patch.width;
    if (patch.height !== undefined) this.height = patch.height;
    if (patch.rotation !== undefined) this.rotation = patch.rotation;
    if (patch.visible !== undefined) this.visible = patch.visible;
    if (patch.locked !== undefined) this.locked = patch.locked;
    if (patch.name !== undefined) this.name = patch.name;
  }

  protected baseToJSON(): ElementJSON {
    return {
      id: this.id,
      type: this.type,
      layerId: this.layerId,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      visible: this.visible,
      locked: this.locked,
      name: this.name,
    };
  }

  protected assertNotLocked(): void {
    if (this.locked) {
      throw new Error(`Element is locked: ${this.id}`);
    }
  }

  abstract clone(changes?: Partial<TJSON>): BaseElement<TJSON>;

  abstract toJSON(): TJSON;
}
