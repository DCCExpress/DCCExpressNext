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
  TrackTurnoutTwoWayElement as CommonTrackTurnoutTwoWayElement,
} from "../../../../../common/src/layout/elements/TrackTurnoutTwoWayElement";
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
  ITrackTurnoutTwoWayElement,
} from "../types/EditorTypes";

export class TrackTurnoutTwoWayElementView
  extends CommonTrackTurnoutTwoWayElement
  implements ITrackTurnoutTwoWayElement {
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


  type: typeof ELEMENT_TYPES.TRACK_TURNOUT_TWO_WAY =
    ELEMENT_TYPES.TRACK_TURNOUT_TWO_WAY;

  turnoutLocked: string | CanvasGradient | CanvasPattern = "yellow";
  turnoutUnLocked: string | CanvasGradient | CanvasPattern = "red";

  constructor(x: number, y: number) {
    super(x, y);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    if (!this.visible) return;

    this.beginDraw(ctx, options);
    this.drawTurnout(ctx, false);
    this.endDraw(ctx);

    this.beginDraw(ctx);

    if (options?.showTurnoutAddress) {
      drawTextWithRoundedBackground(
        ctx,
        this.posLeft,
        this.posBottom - 10,
        "#" + this.turnoutAddress.toString()
      );
    }

    this.endDraw(ctx);
    this.drawSelection(ctx);
  }

  drawTurnout(
    ctx: CanvasRenderingContext2D,
    firstClosed: boolean
  ): void {
    const dx = this.width / 5;

    ctx.beginPath();
    ctx.strokeStyle = this.TrackPrimaryColor;
    ctx.lineWidth = this.TrackWidth7;

    if (this.rotation % 90 == 0) {
      ctx.translate(this.centerX, this.centerY);
      ctx.rotate(this.rotation * Math.PI / 180);
      ctx.translate(-this.centerX, -this.centerY);

      ctx.moveTo(this.posLeft, this.centerY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(this.posRight, this.posTop);
      ctx.moveTo(this.centerX, this.centerY);
      ctx.lineTo(this.posRight, this.posBottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = this.stateColor;
      ctx.lineWidth = this.TrackWidth3;

      ctx.moveTo(this.posLeft + dx, this.centerY);
      ctx.lineTo(this.centerX, this.centerY);

      if (firstClosed) {
        ctx.lineTo(this.posRight - dx, this.posTop + dx);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx, this.posBottom - dx);
      }

      ctx.stroke();

      if (this.selected) {
        ctx.beginPath();
        ctx.strokeStyle = "red";
        ctx.moveTo(this.posRight - 3, this.centerY);
        ctx.lineTo(this.posRight - 6, this.centerY - 2);
        ctx.lineTo(this.posRight - 6, this.centerY + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else {
      ctx.translate(this.centerX, this.centerY);
      ctx.rotate((this.rotation + 45) * Math.PI / 180);
      ctx.translate(-this.centerX, -this.centerY);

      ctx.moveTo(this.posLeft, this.posBottom);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(this.centerX, this.posTop);
      ctx.moveTo(this.centerX, this.centerY);
      ctx.lineTo(this.posRight, this.centerY);
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = this.stateColor;
      ctx.lineWidth = this.TrackWidth3;

      ctx.moveTo(this.posLeft + dx, this.posBottom - dx);
      ctx.lineTo(this.centerX, this.centerY);

      if (firstClosed) {
        ctx.lineTo(this.centerX, this.posTop + dx);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx, this.centerY);
      }

      ctx.stroke();

      if (this.selected) {
        ctx.translate(this.centerX, this.centerY);
        ctx.rotate(-this.rotation * Math.PI * 180);
        ctx.rotate((this.rotation - 45) * Math.PI * 180);
        ctx.translate(-this.centerX, -this.centerY);

        ctx.beginPath();
        ctx.strokeStyle = "red";
        ctx.moveTo(this.posRight - 3, this.centerY);
        ctx.lineTo(this.posRight - 6, this.centerY - 2);
        ctx.lineTo(this.posRight - 6, this.centerY + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle =
      this.locked
        ? this.turnoutLocked
        : this.turnoutUnLocked;

    ctx.arc(this.centerX, this.centerY, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  toJSON(): ITrackTurnoutTwoWayElement {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_TURNOUT_TWO_WAY,
      address: this.address,
      length: this.length,
    };
  }

  static fromJSON(
    data: ITrackTurnoutTwoWayElement
  ): TrackTurnoutTwoWayElementView {
    const element = new TrackTurnoutTwoWayElementView(
      data.x,
      data.y
    );

    element.id = data.id;
    element.name = data.name;
    element.layerName = data.layerName;
    element.rotation = data.rotation;
    element.rotationStep = data.rotationStep;
    element.address = data.address;
    element.length = data.length;
    element.bg = data.bg;
    element.fg = data.fg;

    return element;
  }

  clone(): TrackTurnoutTwoWayElementView {
    const copy = new TrackTurnoutTwoWayElementView(
      this.x,
      this.y
    );

    copy.id = generateId();
    copy.rotation = this.rotation;
    copy.rotationStep = this.rotationStep;
    copy.selected = this.selected;
    copy.address = this.address;
    copy.length = this.length;
    copy.turnoutAddress = this.turnoutAddress;

    return copy;
  }
}
