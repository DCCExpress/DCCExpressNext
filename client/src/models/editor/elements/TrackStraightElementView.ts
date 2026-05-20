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
  ELEMENT_TYPES,
} from "../../../../../common/src/layout/elementTypes";
import {
  TrackStraightElement as CommonTrackStraightElement,
} from "../../../../../common/src/layout/elements/TrackStraightElement";
import {
  drawTextWithRoundedBackground,
} from "../../../graphics";
import {
  generateId,
} from "../../../helpers";
import {
  DrawOptions,
  ITrackStraightElement,
} from "../types/EditorTypes";

/**
 * Kliensoldali rajzolható/editoros nézet az egyenes sínhez.
 *
 * Most már ténylegesen a common TrackStraightElementView domain modellből örököl,
 * a kliensoldali canvas/editor képességeket pedig a TrackElementViewMixin adja hozzá.
 */
export class TrackStraightElementView
  extends CommonTrackStraightElement
  implements ITrackStraightElement {
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


  type: typeof ELEMENT_TYPES.TRACK_STRAIGHT =
    ELEMENT_TYPES.TRACK_STRAIGHT;

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

    ctx.lineWidth = 7;
    ctx.strokeStyle = "black";

    if (this.rotation == 0 || this.rotation == 180) {
      ctx.beginPath();
      ctx.moveTo(this.posLeft, this.centerY);
      ctx.lineTo(this.posLeft + this.GridSizeX, this.centerY);
      ctx.stroke();
    } else if (this.rotation == 45 || this.rotation == 225) {
      ctx.beginPath();
      ctx.moveTo(this.PositionX, this.PositionY);
      ctx.lineTo(
        this.PositionX + this.GridSizeX,
        this.PositionY + this.GridSizeY
      );
      ctx.stroke();
    } else if (this.rotation == 90 || this.rotation == 270) {
      ctx.beginPath();
      ctx.moveTo(this.centerX, this.PositionY);
      ctx.lineTo(this.centerX, this.PositionY + this.GridSizeY);
      ctx.stroke();
    } else if (this.rotation == 135 || this.rotation == 315) {
      ctx.beginPath();
      ctx.moveTo(
        this.PositionX + this.GridSizeX,
        this.PositionY
      );
      ctx.lineTo(
        this.PositionX,
        this.PositionY + this.GridSizeY
      );
      ctx.stroke();
    }

    ctx.lineWidth = this.TrackWidth3;
    ctx.strokeStyle = this.stateColor;

    const w4 = this.GridSizeX / 4;

    if (this.rotation == 0 || this.rotation == 180) {
      ctx.beginPath();
      ctx.moveTo(this.posLeft + w4, this.centerY);
      ctx.lineTo(this.posRight - w4, this.centerY);
      ctx.stroke();
    } else if (this.rotation == 45 || this.rotation == 225) {
      ctx.beginPath();
      ctx.moveTo(this.posLeft + w4, this.posTop + w4);
      ctx.lineTo(this.posRight - w4, this.posBottom - w4);
      ctx.stroke();
    } else if (this.rotation == 90 || this.rotation == 270) {
      ctx.beginPath();
      ctx.moveTo(this.centerX, this.posTop + w4);
      ctx.lineTo(this.centerX, this.posBottom - w4);
      ctx.stroke();
    } else if (this.rotation == 135 || this.rotation == 315) {
      ctx.beginPath();
      ctx.moveTo(this.posRight - w4, this.posTop + w4);
      ctx.lineTo(this.posLeft + w4, this.posBottom - w4);
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

  static fromJSON(
    data: ITrackStraightElement
  ): TrackStraightElementView {
    const track = new TrackStraightElementView(
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

  clone(): TrackStraightElementView {
    const copy = new TrackStraightElementView(
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

  getHelp(): string {
    return `
    <h3 style="margin-top:0;">Track element</h3>
    <p>This is a straight track section.</p>
    <ul>
      <li>You can rotate it with R</li>
      <li>You can move it by drag and drop</li>
    </ul>
  `;
  }
}
