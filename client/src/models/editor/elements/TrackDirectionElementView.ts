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
  TrackDirectionElement as CommonTrackDirectionElement,
} from "../../../../../common/src/layout/elements/TrackDirectionElement";
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
  ITrackDirectionElement,
} from "../types/EditorTypes";

export class TrackDirectionElementView
  extends CommonTrackDirectionElement
  implements ITrackDirectionElement {
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


  type: typeof ELEMENT_TYPES.TRACK_DIRECTION =
    ELEMENT_TYPES.TRACK_DIRECTION;

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

    this.drawDirectionArrow(ctx);

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

  /**
   * Lime színű háromszög az elem közepén.
   */
  private drawDirectionArrow(
    ctx: CanvasRenderingContext2D
  ): void {
    this.beginDraw(ctx);

    const centerX = this.centerX;
    const centerY = this.centerY;

    const angle =
      this.rotation * Math.PI / 180;

    const fx = Math.cos(angle);
    const fy = Math.sin(angle);

    const px = -fy;
    const py = fx;

    const arrowLength = 7;
    const arrowHalfWidth = 7;

    const tipX = centerX + fx * arrowLength;
    const tipY = centerY + fy * arrowLength;

    const backX =
      centerX - fx * arrowLength * 0.65;
    const backY =
      centerY - fy * arrowLength * 0.65;

    const leftX = backX + px * arrowHalfWidth;
    const leftY = backY + py * arrowHalfWidth;

    const rightX = backX - px * arrowHalfWidth;
    const rightY = backY - py * arrowHalfWidth;

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();

    ctx.fillStyle = "lime";
    ctx.fill();

    ctx.strokeStyle = "black";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    this.endDraw(ctx);
  }

  static fromJSON(
    data: ITrackDirectionElement
  ): TrackDirectionElementView {
    const track = new TrackDirectionElementView(
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

  clone(): TrackDirectionElementView {
    const copy = new TrackDirectionElementView(
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
        <h3 style="margin-top:0;">Track direction element</h3>
        <p>
            This element defines the reference forward travel direction
            for an entire connected track network.
        </p>
        <p>
            The direction is propagated automatically through the connected
            tracks and is used to determine whether a locomotive must travel
            forward or in reverse along a calculated route.
        </p>
        <ul>
            <li>You can rotate it with R</li>
            <li>The lime arrow shows the reference forward direction</li>
            <li>Each separate connected track network must contain exactly one direction element</li>
            <li>Missing or multiple direction elements in the same track network will cause route graph generation to fail</li>
        </ul>
    `;
  }
}
