import {
  beginElementDraw,
  degreesToRadians,
  drawElementBounds,
  drawElementIconPath,
  drawElementMarked,
  drawElementNeighbors,
  drawElementOccupied,
  drawElementSelection,
  endElementDraw,
  getBaseEditableProperties,
  getBaseHelp,
  getCenterX,
  getCenterY,
  getGridSizeX,
  getGridSizeY,
  getHeight,
  getPosBottom,
  getPosLeft,
  getPosRight,
  getPosTop,
  getPositionX,
  getPositionY,
  getWidth,
  noopFromJSON,
  noopMouseHandler,
} from "../core/view/support/BaseElementViewSupport";
import {
  drawTrackSectionInfo,
  getTrackStateColor,
  getTrackTravelDirectionArrow,
} from "../core/view/support/TrackElementViewSupport";
import {
  TrackCornerElement as CommonTrackCornerElement,
} from "../../../../../common/src/layout/elements/TrackCornerElement";
import {
  ELEMENT_TYPES,
} from "../../../../../common/src/layout/elementTypes";
import {
  drawTextWithRoundedBackground,
} from "../../../graphics";
import {
  generateId,
} from "../../../helpers";
import {
  DrawOptions,
  ITrackCornerElement,
} from "../types/EditorTypes";

export class TrackCornerElementView
  extends CommonTrackCornerElement
  implements ITrackCornerElement {
  get stateColor(): string {
    return getTrackStateColor(this);
  }

  drawSectionInfo(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    drawTrackSectionInfo(this, ctx, options);
  }

  getTravelDirectionArrow(): string {
    return getTrackTravelDirectionArrow(this);
  }


  selected: boolean = false;
  marked: boolean = false;
  enabled: boolean = true;
  alpha: number = 0.5;
  debug: boolean = false;

  get GridSizeX(): number {
    return getGridSizeX();
  }

  get GridSizeY(): number {
    return getGridSizeY();
  }

  get PositionX(): number {
    return getPositionX(this);
  }

  get PositionY(): number {
    return getPositionY(this);
  }

  get posLeft(): number {
    return getPosLeft(this);
  }

  get posRight(): number {
    return getPosRight(this);
  }

  get posTop(): number {
    return getPosTop(this);
  }

  get posBottom(): number {
    return getPosBottom(this);
  }

  get centerX(): number {
    return getCenterX(this);
  }

  get centerY(): number {
    return getCenterY(this);
  }

  get width(): number {
    return getWidth(this);
  }

  get height(): number {
    return getHeight(this);
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
    beginElementDraw(this, ctx, options);
  }

  endDraw(ctx: CanvasRenderingContext2D): void {
    endElementDraw(this, ctx);
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
    drawElementIconPath(
      ctx,
      path,
      x,
      y,
      size,
      color,
      strokeWidth
    );
  }

  drawMarked(ctx: CanvasRenderingContext2D): void {
    drawElementMarked(this, ctx);
  }

  drawOccupied(ctx: CanvasRenderingContext2D): void {
    drawElementOccupied(this, ctx);
  }

  drawSelection(ctx: CanvasRenderingContext2D): void {
    drawElementSelection(this, ctx);
  }

  drawEnabled(_ctx: CanvasRenderingContext2D): void {
    return;
  }

  mouseDown(ev: MouseEvent): void {
    noopMouseHandler(ev);
  }

  mouseUp(ev: MouseEvent): void {
    noopMouseHandler(ev);
  }

  fromJSON(data: any): void {
    noopFromJSON(data);
  }

  degreesToRadians(degrees: number): number {
    return degreesToRadians(degrees);
  }

  drawBounds(ctx: CanvasRenderingContext2D): void {
    drawElementBounds(this, ctx);
  }

  drawNeighbors(ctx: CanvasRenderingContext2D): void {
    drawElementNeighbors(this, ctx);
  }

  getEditableProperties() {
    return getBaseEditableProperties();
  }

  getHelp(): string {
    return getBaseHelp();
  }


  type: typeof ELEMENT_TYPES.TRACK_CORNER =
    ELEMENT_TYPES.TRACK_CORNER;

  constructor(x: number, y: number) {
    super(x, y);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    if (!this.visible) return;

    this.beginDraw(ctx, options);

    if (!this.enabled) {
      ctx.globalAlpha = this.alpha;
    }

    const w = this.GridSizeX / 4.0;
    const h = this.GridSizeY / 4.0;

    ctx.lineWidth = this.TrackWidth7;
    ctx.strokeStyle = this.TrackPrimaryColor;

    if (this.rotation == 0) {
      ctx.beginPath();
      ctx.moveTo(this.PositionX, this.centerY);
      ctx.lineTo(this.PositionX + 1 * w, this.centerY);
      ctx.lineTo(this.centerX, this.centerY + 1 * h);
      ctx.lineTo(this.centerX, this.PositionY + this.GridSizeY);
      ctx.stroke();
    } else if (this.rotation == 90) {
      ctx.beginPath();
      ctx.moveTo(this.PositionX, this.centerY);
      ctx.lineTo(this.PositionX + 1 * w, this.centerY);
      ctx.lineTo(this.centerX, this.centerY - 1 * h);
      ctx.lineTo(this.centerX, this.PositionY);
      ctx.stroke();
    } else if (this.rotation == 180) {
      ctx.beginPath();
      ctx.moveTo(this.centerX, this.PositionY);
      ctx.lineTo(this.centerX, this.PositionY + h);
      ctx.lineTo(this.centerX + w, this.centerY);
      ctx.lineTo(this.PositionX + this.GridSizeX, this.centerY);
      ctx.stroke();
    } else if (this.rotation == 270) {
      ctx.beginPath();
      ctx.moveTo(this.PositionX + this.GridSizeX, this.centerY);
      ctx.lineTo(this.centerX + w, this.centerY);
      ctx.lineTo(this.centerX, this.centerY + h);
      ctx.lineTo(this.centerX, this.PositionY + this.GridSizeY);
      ctx.stroke();
    }

    ctx.lineWidth = 3;
    ctx.strokeStyle = this.stateColor;

    if (this.rotation == 0) {
      ctx.beginPath();
      ctx.moveTo(this.PositionX + 1 * w, this.centerY);
      ctx.lineTo(this.centerX, this.centerY + 1 * h);
      ctx.stroke();
    } else if (this.rotation == 90) {
      ctx.beginPath();
      ctx.moveTo(this.PositionX + 1 * w, this.centerY);
      ctx.lineTo(this.centerX, this.centerY - 1 * h);
      ctx.stroke();
    } else if (this.rotation == 180) {
      ctx.beginPath();
      ctx.moveTo(this.centerX, this.PositionY + h);
      ctx.lineTo(this.centerX + w, this.centerY);
      ctx.stroke();
    } else if (this.rotation == 270) {
      ctx.beginPath();
      ctx.moveTo(this.centerX + w, this.centerY);
      ctx.lineTo(this.centerX, this.centerY + h);
      ctx.stroke();
    }

    if (options?.showOccupancySensorAddress) {
      drawTextWithRoundedBackground(
        ctx,
        this.posLeft,
        this.posBottom - 10,
        "#" + this.address.toString()
      );
    }

    this.drawSectionInfo(ctx, options);
    this.endDraw(ctx);
    this.drawSelection(ctx);
  }

  hitTest(px: number, py: number): boolean {
    return this.x == px && this.y == py;
  }

  toJSON(): ITrackCornerElement {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_CORNER,
      address: this.address,
      length: this.length,
    };
  }

  static fromJSON(
    data: ITrackCornerElement
  ): TrackCornerElementView {
    const corner = new TrackCornerElementView(
      data.x,
      data.y
    );

    corner.id = data.id;
    corner.name = data.name;
    corner.layerName = data.layerName;
    corner.rotation = data.rotation;
    corner.rotationStep = data.rotationStep;
    corner.address = data.address;
    corner.length = data.length;
    corner.bg = data.bg;
    corner.fg = data.fg;

    return corner;
  }

  clone(): TrackCornerElementView {
    const copy = new TrackCornerElementView(
      this.x,
      this.y
    );

    copy.id = generateId();
    copy.rotation = this.rotation;
    copy.rotationStep = this.rotationStep;
    copy.selected = this.selected;
    copy.address = this.address;
    copy.length = this.length;

    return copy;
  }
}
