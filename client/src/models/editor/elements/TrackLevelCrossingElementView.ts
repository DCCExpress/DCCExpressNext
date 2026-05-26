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
import {
  ELEMENT_TYPES,
} from "../../../../../common/src/layout/elementTypes";
import {
  TrackLevelCrossingElement as CommonTrackLevelCrossingElement,
} from "../../../../../common/src/layout/elements/TrackLevelCrossingElement";
import {
  drawTextWithRoundedBackground,
} from "../../../graphics";
import {
  generateId,
} from "../../../helpers";
import type {
  DrawOptions,
  ITrackLevelCrossingElement,
} from "../types/EditorTypes";
import type { IEditableProperty } from "./PropertyDescriptor";
import {
  TrackStraightElementView,
} from "./TrackStraightElementView";

function isHorizontalRotation(rotation: number): boolean {
  return rotation === 0 || rotation === 180;
}

function isVerticalRotation(rotation: number): boolean {
  return rotation === 90 || rotation === 270;
}

export class TrackLevelCrossingElementView
  extends CommonTrackLevelCrossingElement
  implements ITrackLevelCrossingElement {
  selected = false;
  marked = false;
  enabled = true;
  alpha = 0.5;
  debug = false;

  override type: typeof ELEMENT_TYPES.TRACK_LEVEL_CROSSING =
    ELEMENT_TYPES.TRACK_LEVEL_CROSSING;

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
    drawElementIconPath(ctx, path, x, y, size, color, strokeWidth);
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

  private drawRoad(ctx: CanvasRenderingContext2D): void {
    const roadWidth = Math.max(16, this.GridSizeX * 0.38);

    ctx.save();
    ctx.translate(this.centerX, this.centerY);

    if (isHorizontalRotation(this.rotation)) {
      ctx.rotate(Math.PI / 2);
    } else if (this.rotation === 45 || this.rotation === 225) {
      ctx.rotate(-Math.PI / 4);
    } else if (this.rotation === 135 || this.rotation === 315) {
      ctx.rotate(Math.PI / 4);
    }

    ctx.fillStyle = this.roadColor;
    ctx.strokeStyle = "#343a40";
    ctx.lineWidth = 1;
    ctx.fillRect(-roadWidth / 2, -this.height / 2, roadWidth, this.height);
    ctx.strokeRect(-roadWidth / 2, -this.height / 2, roadWidth, this.height);

    ctx.strokeStyle = "#f8f9fa";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2 + 5);
    ctx.lineTo(0, this.height / 2 - 5);
    ctx.stroke();

    ctx.restore();
  }

  private drawBarrier(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = "#343a40";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = "#f8f9fa";
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(24, 0);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fa5252";
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(24, 0);
    ctx.stroke();

    ctx.restore();
  }

  private drawLight(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    if (!this.lightsEnabled) return;

    ctx.save();
    ctx.fillStyle = "#212529";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.barrierClosed ? "#ff0000" : "#7a1f1f";
    ctx.beginPath();
    ctx.arc(x - 2, y - 1, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.barrierClosed ? "#ff6b6b" : "#7a1f1f";
    ctx.beginPath();
    ctx.arc(x + 2, y + 1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawCrossingDetails(ctx: CanvasRenderingContext2D): void {
    const closed = this.barrierClosed;

    if (this.barrierEnabled && this.barrierType !== "none") {
      const leftAngle = closed ? 0 : -Math.PI / 3;
      const rightAngle = closed ? Math.PI : Math.PI + Math.PI / 3;

      if (isVerticalRotation(this.rotation)) {
        this.drawBarrier(ctx, this.centerX - 18, this.centerY - 18, Math.PI / 2 + leftAngle);
        this.drawBarrier(ctx, this.centerX + 18, this.centerY + 18, -Math.PI / 2 + rightAngle);
      } else {
        this.drawBarrier(ctx, this.centerX - 18, this.centerY - 18, leftAngle);
        this.drawBarrier(ctx, this.centerX + 18, this.centerY + 18, rightAngle);
      }

      if (this.barrierType === "full") {
        if (isVerticalRotation(this.rotation)) {
          this.drawBarrier(ctx, this.centerX + 18, this.centerY - 18, Math.PI / 2 + leftAngle);
          this.drawBarrier(ctx, this.centerX - 18, this.centerY + 18, -Math.PI / 2 + rightAngle);
        } else {
          this.drawBarrier(ctx, this.centerX - 18, this.centerY + 18, leftAngle);
          this.drawBarrier(ctx, this.centerX + 18, this.centerY - 18, rightAngle);
        }
      }
    }

    this.drawLight(ctx, this.centerX - 18, this.centerY + 18);
    this.drawLight(ctx, this.centerX + 18, this.centerY - 18);
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

    this.drawRoad(ctx);

    const straightPreview = new TrackStraightElementView(this.x, this.y);
    straightPreview.id = this.id;
    straightPreview.name = this.name;
    straightPreview.layerName = this.layerName;
    straightPreview.rotation = this.rotation;
    straightPreview.rotationStep = this.rotationStep;
    straightPreview.address = this.address;
    straightPreview.length = this.length;
    straightPreview.bg = this.bg;
    straightPreview.fg = this.fg;
    straightPreview.selected = false;
    straightPreview.enabled = this.enabled;
    straightPreview.marked = this.marked;
    straightPreview.draw(ctx, options);

    this.drawCrossingDetails(ctx);
    this.drawSectionInfo(ctx, options);

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

  static fromJSON(
    data: ITrackLevelCrossingElement
  ): TrackLevelCrossingElementView {
    const crossing = new TrackLevelCrossingElementView(data.x, data.y);

    crossing.id = data.id;
    crossing.name = data.name;
    crossing.layerName = data.layerName;
    crossing.rotation = data.rotation;
    crossing.rotationStep = data.rotationStep;
    crossing.address = data.address;
    crossing.length = data.length;
    crossing.bg = data.bg;
    crossing.fg = data.fg;
    crossing.basicAccessoryAddress = data.basicAccessoryAddress ?? 0;
    crossing.barrierEnabled = data.barrierEnabled ?? true;
    crossing.barrierType = data.barrierType ?? "half";
    crossing.barrierClosed = data.barrierClosed ?? false;
    crossing.lightsEnabled = data.lightsEnabled ?? true;
    crossing.roadColor = data.roadColor ?? "#6c757d";

    return crossing;
  }

  clone(): TrackLevelCrossingElementView {
    const copy = new TrackLevelCrossingElementView(this.x, this.y);

    copy.id = generateId();
    copy.rotation = this.rotation;
    copy.rotationStep = this.rotationStep;
    copy.selected = this.selected;
    copy.address = this.address;
    copy.length = this.length;
    copy.basicAccessoryAddress = this.basicAccessoryAddress;
    copy.barrierEnabled = this.barrierEnabled;
    copy.barrierType = this.barrierType;
    copy.barrierClosed = this.barrierClosed;
    copy.lightsEnabled = this.lightsEnabled;
    copy.roadColor = this.roadColor;

    return copy;
  }

  getEditableProperties(): IEditableProperty[] {
    return [
      ...getBaseEditableProperties(),
      { key: "basicAccessoryAddress", label: "Basic accessory address", type: "number", min: 0 },
      { key: "barrierEnabled", label: "Barrier", type: "checkbox" },
      { key: "barrierClosed", label: "Barrier closed", type: "checkbox" },
      { key: "lightsEnabled", label: "Lights", type: "checkbox" },
      { key: "roadColor", label: "Road color", type: "colorpicker" },
    ];
  }

  getHelp(): string {
    return `
      <h3 style="margin-top:0;">Level crossing</h3>
      <p>A straight track section with a road crossing overlay.</p>
      <ul>
        <li>It behaves like a straight track element for layout connectivity.</li>
        <li>Basic accessory address is the future control address for the crossing accessory.</li>
        <li>Use Barrier to show/hide barrier arms.</li>
        <li>Use Barrier closed to show closed barriers and active red warning lights.</li>
        <li>The first version is visual only; automation can be added later.</li>
      </ul>
    `;
  }
}
