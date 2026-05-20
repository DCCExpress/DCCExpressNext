// common/src/layout/model/BaseElement.ts

import { getDirectionXy } from "../../helpers.js";
import {
  type IRect,
  Point,
} from "../../Rect.js";
import {
  ELEMENT_TYPES,
  type ElementType,
} from "../elementTypes.js";
import type {
  BaseElementDto,
  RotationStepDto,
} from "../layoutDto.js";

/**
 * Grafikamentes, szerveroldalon is használható layout elem alap.
 */
export abstract class BaseElement {
  id: string = "";
  type: ElementType = ELEMENT_TYPES.GENERAL;
  name: string = "element";
  layerName: string = "track";

  x: number;
  y: number;
  w: number = 1;
  h: number = 1;

  rotation: number = 0;
  rotationStep: RotationStepDto = 0;

  locked: boolean = false;
  visible: boolean = true;
  bg: string = "black";
  fg: string = "white";
  occupied: boolean = false;
  isVisited: boolean = false;
  trackName: string = "";

  /**
   * Public konstruktor kell ahhoz, hogy a kliensoldali
   * BaseElement is ugyanazt a BaseElementViewMixin(...) ágat
   * használhassa, mint a common domainből leszármazó View elemek.
   *
   * Maga az osztály továbbra is abstract, tehát közvetlenül
   * továbbra sem példányosítható.
   */
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  rotateRight(): void {
    if (this.locked) return;
    this.rotation = this.normalizeRotation(
      this.rotation + this.rotationStep
    );
  }

  rotateLeft(): void {
    if (this.locked) return;
    this.rotation = this.normalizeRotation(
      this.rotation - this.rotationStep
    );
  }

  setRotation(rotation: number): void {
    if (this.locked) return;
    this.rotation = this.normalizeRotation(rotation);
  }

  moveBy(dx: number, dy: number): void {
    if (this.locked) return;
    this.x += dx;
    this.y += dy;
  }

  setPosition(x: number, y: number): void {
    if (this.locked) return;
    this.x = x;
    this.y = y;
  }

  public normalizeRotation(value: number): number {
    let result = value % 360;
    if (result < 0) result += 360;
    return result;
  }

  toJSON(): BaseElementDto {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      layerName: this.layerName,
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      rotationStep: this.rotationStep,
      bg: this.bg,
      fg: this.fg,
    };
  }

  getBounds(): IRect {
    return {
      x: this.x,
      y: this.y,
      width: this.w,
      height: this.h,
    };
  }

  hitTest(px: number, py: number): boolean {
    const bounds = this.getBounds();
    const x2 = bounds.x + bounds.width;
    const y2 = bounds.y + bounds.height;

    return (
      px >= bounds.x &&
      py >= bounds.y &&
      px < x2 &&
      py < y2
    );
  }

  get pos(): Point {
    return new Point(this.x, this.y);
  }

  getNextItemXy(): Point {
    return getDirectionXy(this.pos, this.rotation);
  }

  getPrevItemXy(): Point {
    return getDirectionXy(this.pos, this.rotation + 180);
  }

  getNeigbordsXy(): Point[] {
    return [
      this.getNextItemXy(),
      this.getPrevItemXy(),
    ];
  }
}
