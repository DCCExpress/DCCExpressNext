import {
  BaseElement as CommonBaseElement,
} from "../../../../../common/src/layout/model/BaseElement";
import {
  sampleLayout,
} from "../sample/sampleLayout";
import {
  type DrawOptions,
  type IBaseElement,
} from "../types/EditorTypes";
import type {
  IEditableProperty,
} from "../elements/PropertyDescriptor";

/**
 * Kliensoldali editor/UI alap elem.
 *
 * A domain alapállapot és a grafikamentes geometriai logika már
 * a common BaseElementből jön:
 * - id / type / name / layerName
 * - x / y / w / h
 * - rotation / rotationStep
 * - locked / visible / bg / fg / occupied / isVisited / trackName
 * - rotate / move / setPosition
 * - normalizeRotation()
 * - getBounds() / hitTest()
 * - pos / next / prev / neighbor pontok
 *
 * Itt már csak a kliensoldali editor és canvas felület marad.
 */
export abstract class BaseElement
  extends CommonBaseElement
  implements IBaseElement {
  selected: boolean = false;
  marked: boolean = false;
  enabled: boolean = true;
  alpha: number = 0.5;
  debug: boolean = false;

  constructor(x: number, y: number) {
    super(x, y);
  }

  get GridSizeX(): number {
    return sampleLayout.settings.gridSize;
  }

  get GridSizeY(): number {
    return sampleLayout.settings.gridSize;
  }

  get PositionX(): number {
    return this.x * this.GridSizeX;
  }

  get PositionY(): number {
    return this.y * this.GridSizeY;
  }

  get posLeft(): number {
    return this.x * this.GridSizeX;
  }

  get posRight(): number {
    return this.x * this.GridSizeX + this.w * this.GridSizeX;
  }

  get posTop(): number {
    return this.y * this.GridSizeY;
  }

  get posBottom(): number {
    return this.y * this.GridSizeY + this.h * this.GridSizeY;
  }

  get centerX(): number {
    return this.x * this.GridSizeX + this.w * this.GridSizeX / 2;
  }

  get centerY(): number {
    return this.y * this.GridSizeY + this.h * this.GridSizeY / 2;
  }

  get width(): number {
    return this.posRight - this.posLeft;
  }

  get height(): number {
    return this.posBottom - this.posTop;
  }

  get TrackWidth7(): number {
    return 7;
  }

  get TrackWidth3(): number {
    return 3;
  }

  get TrackPrimaryColor(): string {
    return "black";
  }

  beginDraw(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    const scale = options?.scale ?? 1;
    const offsetX = options?.offsetX ?? 0;
    const offsetY = options?.offsetY ?? 0;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    if (options?.ghost) {
      ctx.globalAlpha = 0.5;
    }
  }

  endDraw(ctx: CanvasRenderingContext2D): void {
    ctx.restore();

    if (this.debug) {
      this.drawNeighbors(ctx);
    }
  }

  drawIconPath(
    ctx: CanvasRenderingContext2D,
    path: string,
    x: number,
    y: number,
    size: number,
    color = "black",
    strokeWidth = 2
  ): void {
    ctx.save();

    const scale = size / 24;

    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const p = new Path2D(path);
    ctx.stroke(p);

    ctx.restore();
  }

  drawMarked(ctx: CanvasRenderingContext2D): void {
    if (!this.marked) {
      return;
    }

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#f6b83b";
    ctx.fillStyle = "#f6b83b33";
    ctx.strokeRect(
      this.posLeft,
      this.posTop,
      this.width,
      this.height
    );
    ctx.fillRect(
      this.posLeft,
      this.posTop,
      this.width,
      this.height
    );
    ctx.restore();
  }

  drawOccupied(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = "#403b82f6";
    ctx.fillRect(
      this.posLeft,
      this.posTop,
      this.width,
      this.height
    );
    ctx.restore();
  }

  drawSelection(ctx: CanvasRenderingContext2D): void {
    this.drawEnabled(ctx);

    if (!this.selected) {
      return;
    }

    this.beginDraw(ctx);

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "red";
    ctx.strokeRect(
      this.posLeft,
      this.posTop,
      this.width,
      this.height
    );

    this.endDraw(ctx);
  }

  drawEnabled(_ctx: CanvasRenderingContext2D): void {
    // A régi BaseElementben ez jelenleg szándékosan no-op volt.
    // Meghagyjuk ugyanazzal a futó viselkedéssel.
  }

  mouseDown(_ev: MouseEvent): void {
    // Default: no-op.
  }

  mouseUp(_ev: MouseEvent): void {
    // Default: no-op.
  }

  /**
   * Kompatibilitási példánymetódus.
   *
   * A valódi deszerializálás továbbra is a konkrét elemek
   * static fromJSON(...) metódusain keresztül történik.
   */
  fromJSON(_data: IBaseElement): void {
    // Default: no-op.
  }

  draw(
    _ctx: CanvasRenderingContext2D,
    _options?: DrawOptions
  ): void {
    // Default: no-op.
  }

  degreesToRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  drawBounds(ctx: CanvasRenderingContext2D): void {
    const bounds = this.getBounds();

    ctx.strokeStyle = "lime";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(
      bounds.x * this.GridSizeX,
      bounds.y * this.GridSizeX,
      bounds.width * this.GridSizeX,
      bounds.height * this.GridSizeX
    );

    ctx.strokeStyle = "blue";
    ctx.strokeRect(
      bounds.x * this.GridSizeX,
      bounds.y * this.GridSizeX,
      this.GridSizeX,
      this.GridSizeX
    );
  }

  abstract clone(): BaseElement;

  drawNeighbors(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    const neighbors = [
      this.getNextItemXy(),
      this.getPrevItemXy(),
    ];

    ctx.fillStyle = "blue";

    for (const point of neighbors) {
      ctx.beginPath();
      ctx.arc(
        point.x * this.GridSizeX + this.GridSizeX / 2,
        point.y * this.GridSizeY + this.GridSizeY / 2,
        5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
  }

  getEditableProperties(): IEditableProperty[] {
    return [
      {
        label: "Name",
        key: "name",
        type: "string",
        readonly: false,
      },
    ];
  }

  getHelp(): string {
    return `
    <h3 style="margin-top:0;">Base element</h3>
      `;
  }
}
