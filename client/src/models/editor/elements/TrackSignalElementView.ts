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
  TrackSignalElement as CommonTrackSignalElement,
  SignalStates,
} from "../../../../../common/src/layout/elements/TrackSignalElement";
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
  wsApi,
} from "../../../services/wsApi";
import {
  DrawOptions,
  ITrackSignalElement,
} from "../types/EditorTypes";
import {
  IEditableProperty,
} from "./PropertyDescriptor";

export { SignalStates };

export class TrackSignalElementView
  extends CommonTrackSignalElement
  implements ITrackSignalElement {
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


  type: typeof ELEMENT_TYPES.TRACK_SIGNAL2 =
    ELEMENT_TYPES.TRACK_SIGNAL2;

  constructor(x: number, y: number) {
    super(x, y);
  }

  mouseDown(_event: MouseEvent): void {
    let index = this.lights.findIndex(
      light => light.value === this.value
    );

    index++;

    if (index >= this.max) {
      index = 0;
    }

    this.send(this.lights[index]!.value);
  }

  sendGreen(): void {
    this.send(this.valueGreen);
  }

  sendRed(): void {
    this.send(this.valueRed);
  }

  sendYellow(): void {
    this.send(this.valueYellow);
  }

  sendWhite(): void {
    this.send(this.valueWhite);
  }

  sendRedIfNotRed(): void {
    if (!this.isRed) {
      this.sendRed();
    }
  }

  sendGreenIfNotGreen(): void {
    if (!this.isGreen) {
      this.sendGreen();
    }
  }

  sendYellowIfNotYellow(): void {
    if (!this.isYellow) {
      this.sendYellow();
    }
  }

  sendWhiteIfNotWhite(): void {
    if (!this.isWhite) {
      this.sendWhite();
    }
  }

  get canRotate(): boolean {
    return true;
  }

  get hasProperties(): boolean {
    return true;
  }

  drawCircle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string
  ): void {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.stroke();
  }

  draw(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    this.drawSignal(ctx);

    if (options?.showSignalAddress) {
      drawTextWithRoundedBackground(
        ctx,
        this.posLeft,
        this.posBottom - 10,
        "#" + this.address.toString()
      );
    }

    this.beginDraw(ctx);
    this.endDraw(ctx);
    this.drawSelection(ctx);
  }

  drawSignal(
    ctx: CanvasRenderingContext2D
  ): void {
    this.beginDraw(ctx);

    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.translate(-this.centerX, -this.centerY);

    let x = this.posLeft + 6;
    const y = this.centerY - 12;
    const radius = this.width / 13;
    const diameter = 2 * radius;
    const height = diameter + 4;

    let lampCount = this.aspect;

    if (this.dispalyAsSingleLamp) {
      lampCount = 1;
    }

    const frameLampCount =
      lampCount < 2
        ? 2
        : lampCount;

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.roundRect(
      x - 4,
      y - radius - 2,
      frameLampCount * diameter + 5,
      2 * radius + 4,
      height
    );
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "white";
    ctx.fillStyle = "black";
    ctx.roundRect(
      x - 3,
      y - radius - 1,
      frameLampCount * diameter + 3,
      2 * radius + 2,
      height
    );

    ctx.fillRect(
      x,
      y - radius / 2,
      this.width - 10,
      radius
    );

    ctx.fillRect(
      this.posRight - 4,
      y - radius / 2 - 3,
      2,
      radius + 6
    );

    ctx.fill();
    ctx.stroke();

    x += lampCount === 1 ? 3 : 1;

    if (lampCount === 1) {
      this.drawCircle(
        ctx,
        x,
        y,
        radius,
        this.lights[this.signalState]!.color
      );
    } else {
      for (let index = 0; index < lampCount; index++) {
        this.drawCircle(
          ctx,
          x + index * diameter,
          y,
          radius,
          this.lightsAll
            ? this.lights[index]!.color
            : index === this.signalState
              ? this.lights[this.signalState]!.color
              : "gray"
        );
      }
    }

    this.endDraw(ctx);
  }

  drawAddress(_ctx: CanvasRenderingContext2D): void {
    // Kept as a compatibility placeholder.
  }

  send(bits: number): void {
    for (let index = 0; index < this.addressLength; index++) {
      const value =
        ((bits >> index) & 1) === 1;

      wsApi.setBasicAccessory(
        this.address + index,
        value
      );
    }
  }

  toJSON(): ITrackSignalElement {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_SIGNAL2,
      address: this.address,
      length: this.length,
      aspect: this.aspect,
      addressLength: this.addressLength,
      dispalyAsSingleLamp: this.dispalyAsSingleLamp,
      valueGreen: this.valueGreen,
      valueRed: this.valueRed,
      valueYellow: this.valueYellow,
      valueWhite: this.valueWhite,
    };
  }

  static fromJSON(
    data: ITrackSignalElement
  ): TrackSignalElementView {
    const element = new TrackSignalElementView(
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
    element.length = data.length;
    element.aspect = data.aspect ?? 2;
    element.address = data.address ?? 0;
    element.addressLength = data.addressLength ?? 5;
    element.dispalyAsSingleLamp =
      data.dispalyAsSingleLamp ?? false;
    element.valueGreen = data.valueGreen ?? 0;
    element.valueRed = data.valueRed ?? 0;
    element.valueYellow = data.valueYellow ?? 0;
    element.valueWhite = data.valueWhite ?? 0;

    return element;
  }

  clone(): TrackSignalElementView {
    const copy = new TrackSignalElementView(
      this.x,
      this.y
    );

    copy.id = generateId();
    copy.rotation = this.rotation;
    copy.rotationStep = this.rotationStep;
    copy.selected = this.selected;
    copy.bg = this.bg;
    copy.fg = this.fg;
    copy.length = this.length;
    copy.aspect = this.aspect;
    copy.address = this.address;
    copy.addressLength = this.addressLength;
    copy.dispalyAsSingleLamp = this.dispalyAsSingleLamp;
    copy.valueGreen = this.valueGreen;
    copy.valueRed = this.valueRed;
    copy.valueYellow = this.valueYellow;
    copy.valueWhite = this.valueWhite;

    return copy;
  }

  getEditableProperties(): IEditableProperty[] {
    return [
      ...getBaseEditableProperties(),
      {
        label: "Single",
        key: "dispalyAsSingleLamp",
        type: "checkbox",
        readonly: false,
      },
      {
        label: "Start Address",
        key: "address",
        type: "number",
        readonly: false,
      },
      {
        label: "Length",
        key: "addressLength",
        type: "number",
        readonly: false,
      },
      {
        label: "Singnal",
        key: "aspect",
        type: "signal2",
        readonly: true,
      },
    ];
  }
}
