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
import CommonTrackTurnoutDoubleElement from "../../../../../common/src/layout/elements/TrackTurnoutDoubleElement";
import {
  ELEMENT_TYPES,
} from "../../../../../common/src/layout/elementTypes";
import {
  generateId,
} from "../../../helpers";
import type {
  DrawOptions,
  ITrackTurnoutDoubleElement,
} from "../types/EditorTypes";

export default class TrackTurnoutDoubleElementView
  extends CommonTrackTurnoutDoubleElement
  implements ITrackTurnoutDoubleElement {
  selected: boolean = false;
  marked: boolean = false;
  enabled: boolean = true;
  alpha: number = 0.5;
  debug: boolean = false;

  type: typeof ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE =
    ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE;

  turnoutLocked: string | CanvasGradient | CanvasPattern = "red";
  turnoutUnLocked: string | CanvasGradient | CanvasPattern = "white";

  constructor(x: number, y: number) {
    super(x, y);
  }

  get stateColor(): string {
    return getTrackStateColor(this);
  }

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

  drawSectionInfo(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    drawTrackSectionInfo(this, ctx, options);
  }

  getTravelDirectionArrow(): string {
    return getTrackTravelDirectionArrow(this);
  }

  getEditableProperties() {
    return [
      ...getBaseEditableProperties(),
      {
        label: "Turnout 1 Address",
        key: "turnout1Address",
        type: "number",
        readonly: false,
        validate: () => true,
      },
      {
        label: "Turnout 2 Address",
        key: "turnout2Address",
        type: "number",
        readonly: false,
        validate: () => true,
      },
      {
        label: "Double Turnout Positions",
        key: "turnout1ClosedValue",
        type: "bittoggle",
        readonly: false,
        validate: () => true,
      },
      {
        label: "Turnout 2 Closed Value",
        key: "turnout2ClosedValue",
        type: "bittoggle",
        readonly: false,
        validate: () => true,
      },
    ];
  }

  getHelp(): string {
    return getBaseHelp();
  }

  draw(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    if (!this.visible) return;

    this.beginDraw(ctx, options);
    this.drawTurnout(
      ctx,
      this.firstLogicalClosed,
      this.secondLogicalClosed
    );
    this.endDraw(ctx);

    this.beginDraw(ctx);
    if (options?.showTurnoutAddress) {
      this.drawAddressLabels(ctx);
    }
    this.drawSectionInfo(ctx, options);
    this.endDraw(ctx);

    this.drawSelection(ctx);
  }

  drawTurnout(
    ctx: CanvasRenderingContext2D,
    firstClosed: boolean,
    secondClosed: boolean
  ): void {
    ctx.beginPath();
    ctx.strokeStyle = this.TrackPrimaryColor;
    ctx.lineWidth = this.TrackWidth7;

    if (this.rotation == 0 || this.rotation == 180) {
      ctx.moveTo(this.posLeft, this.centerY);
      ctx.lineTo(this.posRight, this.centerY);
      ctx.moveTo(this.posLeft, this.posTop);
      ctx.lineTo(this.posRight, this.posBottom);
    } else if (this.rotation == 45 || this.rotation == 225) {
      ctx.moveTo(this.centerX, this.posTop);
      ctx.lineTo(this.centerX, this.posBottom);
      ctx.moveTo(this.posLeft, this.posTop);
      ctx.lineTo(this.posRight, this.posBottom);
    } else if (this.rotation == 90 || this.rotation == 270) {
      ctx.moveTo(this.centerX, this.posTop);
      ctx.lineTo(this.centerX, this.posBottom);
      ctx.moveTo(this.posRight, this.posTop);
      ctx.lineTo(this.posLeft, this.posBottom);
    } else if (this.rotation == 135 || this.rotation == 315) {
      ctx.moveTo(this.posLeft, this.centerY);
      ctx.lineTo(this.posRight, this.centerY);
      ctx.moveTo(this.posRight, this.posTop);
      ctx.lineTo(this.posLeft, this.posBottom);
    }

    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = this.stateColor;
    ctx.lineWidth = this.TrackWidth3;

    const dx = this.width / 5;

    if (this.rotation == 0) {
      if (firstClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posLeft + dx, this.posTop + dx);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posLeft + dx, this.centerY);
      }
    } else if (this.rotation == 45) {
      if (firstClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.centerX, this.posTop + dx);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posLeft + dx, this.posTop + dx);
      }
    } else if (this.rotation == 90) {
      if (firstClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx, this.posTop + dx);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.centerX, this.posTop + dx);
      }
    } else if (this.rotation == 135) {
      if (firstClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx, this.centerY);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx, this.posTop + dx);
      }
    } else if (this.rotation == 180) {
      if (firstClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx, this.posBottom - dx);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx, this.centerY);
      }
    } else if (this.rotation == 225) {
      if (firstClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.centerX, this.posBottom - dx);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx, this.posBottom - dx);
      }
    } else if (this.rotation == 270) {
      if (firstClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posLeft + dx, this.posBottom - dx);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.centerX, this.posBottom - dx);
      }
    } else if (this.rotation == 315) {
      if (firstClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posLeft + dx, this.centerY);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posLeft + dx, this.posBottom - dx);
      }
    }

    ctx.stroke();

    ctx.beginPath();

    if (this.rotation == 0) {
      if (secondClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx, this.posBottom - dx);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx, this.centerY);
      }
    } else if (this.rotation == 45) {
      if (secondClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.centerX, this.posBottom - dx);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx, this.posBottom - dx);
      }
    } else if (this.rotation == 90) {
      if (secondClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posLeft + dx, this.posBottom - dx);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.centerX, this.posBottom - dx);
      }
    } else if (this.rotation == 135) {
      if (secondClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posLeft + dx, this.centerY);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posLeft + dx, this.posBottom - dx);
      }
    } else if (this.rotation == 180) {
      if (secondClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posLeft + dx, this.posTop + dx);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posLeft + dx, this.centerY);
      }
    } else if (this.rotation == 225) {
      if (secondClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.centerX, this.posTop + dx);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posLeft + dx, this.posTop + dx);
      }
    } else if (this.rotation == 270) {
      if (secondClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx, this.posTop + dx);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.centerX, this.posTop + dx);
      }
    } else if (this.rotation == 315) {
      if (secondClosed) {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx, this.centerY);
      } else {
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(this.posRight - dx, this.posTop + dx);
      }
    }

    ctx.stroke();

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

  private drawAddressLabels(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = "black";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `#${this.turnout1Address}`,
      this.posLeft + this.width * 0.25,
      this.posBottom - 8
    );
    ctx.fillText(
      `#${this.turnout2Address}`,
      this.posLeft + this.width * 0.75,
      this.posBottom - 8
    );
    ctx.restore();
  }

  toJSON(): ITrackTurnoutDoubleElement {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE,
      address: this.address,
      length: this.length,
      turnout1Address: this.turnout1Address,
      turnout2Address: this.turnout2Address,
      turnout1ClosedValue: this.turnout1ClosedValue,
      turnout2ClosedValue: this.turnout2ClosedValue,
    };
  }

  static fromJSON(
    data: ITrackTurnoutDoubleElement
  ): TrackTurnoutDoubleElementView {
    const element = new TrackTurnoutDoubleElementView(
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
    element.turnout1Address = data.turnout1Address;
    element.turnout2Address = data.turnout2Address;
    element.turnout1ClosedValue = data.turnout1ClosedValue ?? element.turnout1ClosedValue;
    element.turnout2ClosedValue = data.turnout2ClosedValue ?? element.turnout2ClosedValue;

    return element;
  }

  clone(): TrackTurnoutDoubleElementView {
    const copy = new TrackTurnoutDoubleElementView(
      this.x,
      this.y
    );

    copy.id = generateId();
    copy.rotation = this.rotation;
    copy.rotationStep = this.rotationStep;
    copy.selected = this.selected;
    copy.address = this.address;
    copy.length = this.length;
    copy.turnout1Address = this.turnout1Address;
    copy.turnout2Address = this.turnout2Address;
    copy.turnout1ClosedValue = this.turnout1ClosedValue;
    copy.turnout2ClosedValue = this.turnout2ClosedValue;
    copy.turnout1Closed = this.turnout1Closed;
    copy.turnout2Closed = this.turnout2Closed;

    return copy;
  }
}
