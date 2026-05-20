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
  TrackSensorElement as CommonTrackSensorElement,
  SensorTypes,
} from "../../../../../common/src/layout/elements/TrackSensorElement";
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
  ITrackSensorElement,
} from "../types/EditorTypes";
import {
  IEditableProperty,
} from "./PropertyDescriptor";

export { SensorTypes };

export class TrackSensorElementView
  extends CommonTrackSensorElement
  implements ITrackSensorElement {
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

  getHelp(): string {
    return getBaseHelp();
  }


  type: typeof ELEMENT_TYPES.TRACK_SENSOR =
    ELEMENT_TYPES.TRACK_SENSOR;

  constructor(x: number, y: number) {
    super(x, y);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    if (!this.visible) return;

    this.beginDraw(ctx, options);

    ctx.fillStyle =
      this.on
        ? this.colorOn
        : "gray";

    ctx.beginPath();
    ctx.arc(
      this.centerX,
      this.centerY,
      this.radius,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (options?.showSensorAddress) {
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

  toJSON(): ITrackSensorElement {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_SENSOR,
      address: this.address,
      length: this.length,
      kind: this.kind,
      colorOn: this.colorOn,
      colorOff: this.colorOff,
      radius: this.radius,
    };
  }

  static fromJSON(
    data: ITrackSensorElement
  ): TrackSensorElementView {
    const element = new TrackSensorElementView(
      data.x,
      data.y
    );

    element.id = data.id;
    element.name = data.name;
    element.layerName = data.layerName;
    element.rotation = data.rotation;
    element.rotationStep = data.rotationStep;
    element.bg = data.bg;
    element.fg = data.fg;
    element.address = data.address;
    element.length = data.length;
    element.kind = data.kind as SensorTypes;
    element.colorOn = data.colorOn;
    element.colorOff = data.colorOff;
    element.radius = data.radius ?? 6;

    return element;
  }

  clone(): TrackSensorElementView {
    const copy = new TrackSensorElementView(
      this.x,
      this.y
    );

    copy.id = generateId();
    copy.rotation = this.rotation;
    copy.rotationStep = this.rotationStep;
    copy.selected = this.selected;
    copy.address = this.address;
    copy.length = this.length;
    copy.kind = this.kind;
    copy.colorOn = this.colorOn;
    copy.colorOff = this.colorOff;
    copy.textOn = this.textOn;
    copy.textOff = this.textOff;
    copy.radius = this.radius;

    return copy;
  }

  getEditableProperties(): IEditableProperty[] {
    return [
      ...getBaseEditableProperties(),
      {
        label: "Sensor Address",
        key: "address",
        type: "number",
        readonly: false,
      },
      {
        label: "Color ON",
        key: "colorOn",
        type: "colorpicker",
        readonly: false,
      },
      {
        label: "Radius",
        key: "radius",
        type: "number",
        min: 4,
        max: 12,
        readonly: false,
      },
    ];
  }
}
