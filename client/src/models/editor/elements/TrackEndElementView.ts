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
  TrackEndElement as CommonTrackEndElement,
} from "../../../../../common/src/layout/elements/TrackEndElement";
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
  ITrackEndElement,
} from "../types/EditorTypes";

export class TrackEndElementView
  extends CommonTrackEndElement
  implements ITrackEndElement {
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


  type: typeof ELEMENT_TYPES.TRACK_END =
    ELEMENT_TYPES.TRACK_END;

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

    const h = this.GridSizeY / 4.0;

    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.translate(-this.centerX, -this.centerY);

    ctx.lineWidth = this.TrackWidth7;
    ctx.strokeStyle = this.TrackPrimaryColor;

    if (this.rotation % 90 == 0) {
      ctx.beginPath();
      ctx.moveTo(this.PositionX, this.centerY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.moveTo(this.centerX, this.centerY - h);
      ctx.lineTo(this.centerX, this.centerY + h);
      ctx.stroke();
    } else {
      const r = this.GridSizeX / 2;
      const l = Math.sqrt(2 * r * r);

      ctx.beginPath();
      ctx.moveTo(this.centerX - l, this.centerY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.moveTo(this.centerX, this.centerY - h);
      ctx.lineTo(this.centerX, this.centerY + h);
      ctx.stroke();
    }

    ctx.lineWidth = this.TrackWidth3;
    ctx.strokeStyle = this.stateColor;

    const p = this.GridSizeX / 4;

    if (this.rotation % 90 == 0) {
      ctx.beginPath();
      ctx.moveTo(this.PositionX + p, this.centerY);
      ctx.lineTo(this.centerX - this.TrackWidth7 / 2, this.centerY);
      ctx.stroke();
    } else {
      const r = this.GridSizeX / 2;
      const l = Math.sqrt(2 * r * r) - p;

      ctx.beginPath();
      ctx.moveTo(this.centerX - l, this.centerY);
      ctx.lineTo(this.centerX - this.TrackWidth7 / 2, this.centerY);
      ctx.stroke();
    }

    this.endDraw(ctx);

    this.beginDraw(ctx);

    if (options?.showOccupancySensorAddress) {
      drawTextWithRoundedBackground(
        ctx,
        this.posLeft,
        this.posBottom - 10,
        "#" + this.address.toString()
      );
    }

    this.endDraw(ctx);
    this.drawSelection(ctx);
  }

  hitTest(px: number, py: number): boolean {
    return this.x == px && this.y == py;
  }

  toJSON(): ITrackEndElement {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_END,
      address: this.address,
      length: this.length,
    };
  }

  static fromJSON(
    data: ITrackEndElement
  ): TrackEndElementView {
    const track = new TrackEndElementView(
      data.x,
      data.y
    );

    track.id = data.id;
    track.name = data.name;
    track.layerName = data.layerName;
    track.rotation = data.rotation;
    track.rotationStep = data.rotationStep;
    track.address = data.address;
    track.length = data.length;
    track.bg = data.bg;
    track.fg = data.fg;

    return track;
  }

  clone(): TrackEndElementView {
    const copy = new TrackEndElementView(
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
