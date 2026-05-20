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
  TrackCurveElement as CommonTrackCurveElement,
} from "../../../../../common/src/layout/elements/TrackCurveElement";
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
  ITrackCurveElement,
} from "../types/EditorTypes";

export class TrackCurveElementView
  extends CommonTrackCurveElement
  implements ITrackCurveElement {
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


  type: typeof ELEMENT_TYPES.TRACK_CURVE =
    ELEMENT_TYPES.TRACK_CURVE;

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

    ctx.lineWidth = this.TrackWidth7;
    ctx.strokeStyle = this.TrackPrimaryColor;

    this.drawCurvePath(ctx);
    ctx.stroke();

    ctx.lineWidth = this.TrackWidth3;
    ctx.strokeStyle = this.stateColor;

    const w2 = this.GridSizeX / 3;
    ctx.lineDashOffset = -w2 / 3;
    ctx.setLineDash([w2, w2]);

    this.drawCurvePath(ctx);
    ctx.stroke();

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

  private drawCurvePath(
    ctx: CanvasRenderingContext2D
  ): void {
    ctx.beginPath();

    if (this.rotation == 0) {
      ctx.moveTo(this.PositionX, this.PositionY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(this.PositionX + this.GridSizeX, this.centerY);
    } else if (this.rotation == 45) {
      ctx.moveTo(this.PositionX + this.GridSizeX / 2, this.PositionY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(
        this.PositionX + this.GridSizeX,
        this.PositionY + this.GridSizeY
      );
    } else if (this.rotation == 90) {
      ctx.moveTo(this.PositionX + this.GridSizeX, this.PositionY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(this.centerX, this.PositionY + this.GridSizeY);
    } else if (this.rotation == 135) {
      ctx.moveTo(this.PositionX, this.PositionY + this.GridSizeY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(this.PositionX + this.GridSizeX, this.centerY);
    } else if (this.rotation == 180) {
      ctx.moveTo(this.PositionX, this.centerY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(
        this.PositionX + this.GridSizeX,
        this.PositionY + this.GridSizeY
      );
    } else if (this.rotation == 225) {
      ctx.moveTo(this.PositionX, this.PositionY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(this.centerX, this.PositionY + this.GridSizeY);
    } else if (this.rotation == 270) {
      ctx.moveTo(this.PositionX, this.PositionY + this.GridSizeY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(this.centerX, this.PositionY);
    } else if (this.rotation == 315) {
      ctx.moveTo(this.PositionX, this.centerY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(this.PositionX + this.GridSizeX, this.PositionY);
    }
  }

  hitTest(px: number, py: number): boolean {
    return this.x == px && this.y == py;
  }

  toJSON(): ITrackCurveElement {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_CURVE,
      address: this.address,
      length: this.length,
    };
  }

  static fromJSON(
    data: ITrackCurveElement
  ): TrackCurveElementView {
    const curve = new TrackCurveElementView(
      data.x,
      data.y
    );

    curve.id = data.id;
    curve.name = data.name;
    curve.layerName = data.layerName;
    curve.rotation = data.rotation;
    curve.rotationStep = data.rotationStep;
    curve.address = data.address;
    curve.length = data.length;
    curve.bg = data.bg;
    curve.fg = data.fg;

    return curve;
  }

  clone(): TrackCurveElementView {
    const copy = new TrackCurveElementView(
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
