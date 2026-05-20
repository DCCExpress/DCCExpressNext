import {
  drawTurnoutElement,
  getTurnoutEditableProperties,
  mouseDownTurnout,
  toggleTurnout,
} from "../core/view/support/TrackTurnoutElementViewSupport";
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
import type {
  DrawOptions,
} from "../types/EditorTypes";
import {
  TrackTurnoutLeftElement as CommonTrackTurnoutLeftElement,
} from "../../../../../common/src/layout/elements/TrackTurnoutLeftElement";
import {
  ELEMENT_TYPES,
} from "../../../../../common/src/layout/elementTypes";
import {
  generateId,
} from "../../../helpers";
import type {
  ITrackTurnoutLeftElement,
} from "../types/EditorTypes";

export class TrackTurnoutLeftElementView
  extends CommonTrackTurnoutLeftElement
  implements ITrackTurnoutLeftElement {
  turnoutLockedColor: string | CanvasGradient | CanvasPattern = "red";
  turnoutUnLockedColor: string | CanvasGradient | CanvasPattern = "white";

  draw(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    drawTurnoutElement(this, ctx, options);
  }

  toggle(): void {
    toggleTurnout(this);
  }

  getEditableProperties() {
    return getTurnoutEditableProperties(
      getBaseEditableProperties()
    );
  }


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
    mouseDownTurnout(this, ev);
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

  getHelp(): string {
    return getBaseHelp();
  }


  type: typeof ELEMENT_TYPES.TRACK_TURNOUT_LEFT =
    ELEMENT_TYPES.TRACK_TURNOUT_LEFT;

  constructor(x: number, y: number) {
    super(x, y);
  }

  drawTurnout(
    ctx: CanvasRenderingContext2D,
    closed: boolean
  ): void {
    ctx.beginPath();

    ctx.strokeStyle = this.TrackPrimaryColor;
    ctx.lineWidth = this.TrackWidth7;

    ctx.translate(this.centerX, this.centerY);
    ctx.scale(1, -1);
    ctx.translate(-this.centerX, -this.centerY);

    if (this.rotation == 0) {
      ctx.moveTo(this.posLeft, this.centerY);
      ctx.lineTo(this.posRight, this.centerY);
      ctx.moveTo(this.centerX, this.centerY);
      ctx.lineTo(this.posRight, this.posBottom);
    } else if (this.rotation == 45) {
      ctx.moveTo(this.posLeft, this.posTop);
      ctx.lineTo(this.posRight, this.posBottom);
      ctx.moveTo(this.centerX, this.centerY);
      ctx.lineTo(this.centerX, this.posBottom);
    } else if (this.rotation == 90) {
      ctx.moveTo(this.centerX, this.posTop);
      ctx.lineTo(this.centerX, this.posBottom);
      ctx.moveTo(this.centerX, this.centerY);
      ctx.lineTo(this.posLeft, this.posBottom);
    } else if (this.rotation == 135) {
      ctx.moveTo(this.posRight, this.posTop);
      ctx.lineTo(this.posLeft, this.posBottom);
      ctx.moveTo(this.centerX, this.centerY);
      ctx.lineTo(this.posLeft, this.centerY);
    } else if (this.rotation == 180) {
      ctx.moveTo(this.posLeft, this.centerY);
      ctx.lineTo(this.posRight, this.centerY);
      ctx.moveTo(this.centerX, this.centerY);
      ctx.lineTo(this.posLeft, this.posTop);
    } else if (this.rotation == 225) {
      ctx.moveTo(this.posLeft, this.posTop);
      ctx.lineTo(this.posRight, this.posBottom);
      ctx.moveTo(this.centerX, this.centerY);
      ctx.lineTo(this.centerX, this.posTop);
    } else if (this.rotation == 270) {
      ctx.moveTo(this.centerX, this.posTop);
      ctx.lineTo(this.centerX, this.posBottom);
      ctx.moveTo(this.centerX, this.centerY);
      ctx.lineTo(this.posRight, this.posTop);
    } else if (this.rotation == 315) {
      ctx.moveTo(this.posRight, this.posTop);
      ctx.lineTo(this.posLeft, this.posBottom);
      ctx.moveTo(this.centerX, this.centerY);
      ctx.lineTo(this.posRight, this.centerY);
    }

    ctx.stroke();

    ctx.lineWidth = this.TrackWidth3;
    ctx.strokeStyle = this.stateColor;

    if (closed) {
      ctx.beginPath();

      const dx = this.width / 5;

      if (this.rotation == 0) {
        ctx.moveTo(this.posLeft + dx, this.centerY);
        ctx.lineTo(this.posRight - dx, this.centerY);
      } else if (this.rotation == 45) {
        ctx.moveTo(this.posLeft + dx, this.posTop + dx);
        ctx.lineTo(this.posRight - dx, this.posBottom - dx);
      } else if (this.rotation == 90) {
        ctx.moveTo(this.centerX, this.posTop + dx);
        ctx.lineTo(this.centerX, this.posBottom - dx);
      } else if (this.rotation == 135) {
        ctx.moveTo(this.posRight - dx, this.posTop + dx);
        ctx.lineTo(this.posLeft + dx, this.posBottom - dx);
      } else if (this.rotation == 180) {
        ctx.moveTo(this.posLeft + dx, this.centerY);
        ctx.lineTo(this.posRight - dx, this.centerY);
      } else if (this.rotation == 225) {
        ctx.moveTo(this.posLeft + dx, this.posTop + dx);
        ctx.lineTo(this.posRight - dx, this.posBottom - dx);
      } else if (this.rotation == 270) {
        ctx.moveTo(this.centerX, this.posTop + dx);
        ctx.lineTo(this.centerX, this.posBottom - dx);
      } else if (this.rotation == 315) {
        ctx.moveTo(this.posRight - dx, this.posTop + dx);
        ctx.lineTo(this.posLeft + dx, this.posBottom - dx);
      }

      ctx.stroke();
    } else {
      ctx.beginPath();

      const dx = this.width / 5;
      const dx2 = this.width / 5;

      if (this.rotation == 0) {
        ctx.moveTo(this.posLeft + dx, this.centerY);
        ctx.lineTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx2, this.posBottom - dx2);
      } else if (this.rotation == 45) {
        ctx.moveTo(this.posLeft + dx, this.posTop + dx);
        ctx.lineTo(this.centerX, this.centerY);
        ctx.lineTo(this.centerX, this.posBottom - dx2);
      } else if (this.rotation == 90) {
        ctx.moveTo(this.centerX, this.posTop + dx);
        ctx.lineTo(this.centerX, this.centerY);
        ctx.lineTo(this.posLeft + dx2, this.posBottom - dx2);
      } else if (this.rotation == 135) {
        ctx.moveTo(this.posRight - dx2, this.posTop + dx2);
        ctx.lineTo(this.centerX, this.centerY);
        ctx.lineTo(this.posLeft + dx, this.centerY);
      } else if (this.rotation == 180) {
        ctx.moveTo(this.posLeft + dx2, this.posTop + dx2);
        ctx.lineTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx, this.centerY);
      } else if (this.rotation == 225) {
        ctx.moveTo(this.centerX, this.posTop + dx);
        ctx.lineTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx2, this.posBottom - dx2);
      } else if (this.rotation == 270) {
        ctx.moveTo(this.posRight - dx2, this.posTop + dx2);
        ctx.lineTo(this.centerX, this.centerY);
        ctx.lineTo(this.centerX, this.posBottom - dx);
      } else if (this.rotation == 315) {
        ctx.moveTo(this.posRight - dx, this.centerY);
        ctx.lineTo(this.centerX, this.centerY);
        ctx.lineTo(this.posLeft + dx2, this.posBottom - dx2);
      }

      ctx.stroke();
    }

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle =
      this.locked
        ? this.turnoutLockedColor
        : this.turnoutUnLockedColor;

    ctx.arc(this.centerX, this.centerY, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  toJSON(): ITrackTurnoutLeftElement {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_TURNOUT_LEFT,
      address: this.address,
      length: this.length,
      turnoutAddress: this.turnoutAddress,
      turnoutClosedValue: this.turnoutClosedValue,
    };
  }

  static fromJSON(
    data: ITrackTurnoutLeftElement
  ): TrackTurnoutLeftElementView {
    const element = new TrackTurnoutLeftElementView(
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
    element.turnoutAddress = data.turnoutAddress ?? 0;
    element.turnoutClosedValue = data.turnoutClosedValue;
    element.bg = data.bg;
    element.fg = data.fg;

    return element;
  }

  clone(): TrackTurnoutLeftElementView {
    const copy = new TrackTurnoutLeftElementView(
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
    copy.turnoutClosed = this.turnoutClosed;
    copy.turnoutClosedValue = this.turnoutClosedValue;

    return copy;
  }
}
