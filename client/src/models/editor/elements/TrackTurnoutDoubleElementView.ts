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
import type {
  DoubleTurnoutSide,
} from "../../../../../common/src/layout/elements/TrackTurnoutDoubleElement";
import {
  ELEMENT_TYPES,
} from "../../../../../common/src/layout/elementTypes";
import type {
  Point,
} from "../../../../../common/src/Rect";
import {
  generateId,
} from "../../../helpers";
import type {
  DrawOptions,
  ITrackTurnoutDoubleElement,
} from "../types/EditorTypes";
import type {
  IEditableProperty,
} from "./PropertyDescriptor";

export default class TrackTurnoutDoubleElementView
  extends CommonTrackTurnoutDoubleElement
  implements ITrackTurnoutDoubleElement {
  selected: boolean = false;
  marked: boolean = false;
  enabled: boolean = true;
  alpha: number = 0.5;
  debug: boolean = false;

  /**
   * Used only by ElementPreview in the property panel.
   * Null means: draw the real runtime state received from WS.
   */
  firstPreviewClosed: boolean | null = null;
  secondPreviewClosed: boolean | null = null;

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

  getEditableProperties(): IEditableProperty[] {
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
        label: "Turnout 1 Closed Value",
        key: "turnout1ClosedValue",
        type: "bittoggle",
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
        label: "Turnout 2 Closed Value",
        key: "turnout2ClosedValue",
        type: "bittoggle",
        readonly: false,
        validate: () => true,
      },
    ];
  }

  getHelp(): string {
    return `
      <h3 style="margin-top:0;">Double turnout</h3>
      <p>
        The double turnout is controlled by two accessory addresses.
        Each motor has its own address and closed-value mapping.
      </p>
      <ul>
        <li><b>Turnout 1 Address</b>: accessory address of the first motor.</li>
        <li><b>Turnout 1 Closed Value</b>: physical value that represents the logical closed state of the first motor.</li>
        <li><b>Turnout 2 Address</b>: accessory address of the second motor.</li>
        <li><b>Turnout 2 Closed Value</b>: physical value that represents the logical closed state of the second motor.</li>
      </ul>
      <p>
        The bit toggles only configure the physical value mapping.
        The Closed / Opened previews send turnout commands when clicked.
      </p>
    `;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    if (!this.visible) return;

    const firstClosed =
      this.firstPreviewClosed ?? this.firstLogicalClosed;

    const secondClosed =
      this.secondPreviewClosed ?? this.secondLogicalClosed;

    this.beginDraw(ctx, options);
    this.drawTurnout(ctx, firstClosed, secondClosed);
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
    const connections = this.getConnections();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.strokeStyle = this.TrackPrimaryColor;
    ctx.lineWidth = this.TrackWidth7;
    this.drawConnectionLine(ctx, connections.aStraight, connections.bStraight);
    this.drawConnectionLine(ctx, connections.aDiv, connections.bDiv);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = this.stateColor;
    ctx.lineWidth = this.TrackWidth3;
    this.drawCenterToSide(
      ctx,
      firstClosed ? "aDiv" : "aStraight"
    );
    this.drawCenterToSide(
      ctx,
      secondClosed ? "bDiv" : "bStraight"
    );
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

  private drawConnectionLine(
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point
  ): void {
    const p1 = this.getElementEdgePoint(from);
    const p2 = this.getElementEdgePoint(to);

    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
  }

  private drawCenterToSide(
    ctx: CanvasRenderingContext2D,
    side: DoubleTurnoutSide
  ): void {
    const point = this.getConnections()[side];
    const target = this.getElementEdgePoint(point);

    ctx.moveTo(this.centerX, this.centerY);
    ctx.lineTo(target.x, target.y);
  }

  private getElementEdgePoint(point: Point): { x: number; y: number } {
    const targetCenterX =
      point.x * this.GridSizeX + this.GridSizeX / 2;

    const targetCenterY =
      point.y * this.GridSizeY + this.GridSizeY / 2;

    return {
      x: this.centerX + (targetCenterX - this.centerX) * 0.5,
      y: this.centerY + (targetCenterY - this.centerY) * 0.5,
    };
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
