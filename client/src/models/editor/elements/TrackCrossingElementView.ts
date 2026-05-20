import {
  TrackCrossingElement as CommonTrackCrossingElement,
} from "../../../../../common/src/layout/elements/TrackCrossingElement";
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
  TrackElementViewMixin,
} from "../core/view/TrackElementViewMixin";
import {
  DrawOptions,
  ITrackCrossingElement,
} from "../types/EditorTypes";

export class TrackCrossingElementView
  extends TrackElementViewMixin(CommonTrackCrossingElement)
  implements ITrackCrossingElement {
  override type: typeof ELEMENT_TYPES.TRACK_CROSSING =
    ELEMENT_TYPES.TRACK_CROSSING;

  constructor(x: number, y: number) {
    super(x, y);
  }

  override draw(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    if (!this.visible) return;

    this.beginDraw(ctx, options);

    if (!this.enabled) {
      ctx.globalAlpha = this.alpha;
    }

    ctx.beginPath();
    ctx.strokeStyle = this.TrackPrimaryColor;
    ctx.lineWidth = this.TrackWidth7;

    this.drawCrossingPath(ctx, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = this.stateColor;
    ctx.lineWidth = this.TrackWidth3;

    const dx = this.width / 5;
    this.drawCrossingPath(ctx, dx);
    ctx.stroke();

    if (options?.showOccupancySensorAddress) {
      drawTextWithRoundedBackground(
        ctx,
        this.posLeft,
        this.posBottom - 10,
        "#" + this.address.toString()
      );
    }

    this.endDraw(ctx);
    super.drawSelection(ctx);
  }

  private drawCrossingPath(
    ctx: CanvasRenderingContext2D,
    dx: number
  ): void {
    if (this.rotation == 0 || this.rotation == 180) {
      ctx.moveTo(this.posLeft + dx, this.centerY);
      ctx.lineTo(this.posRight - dx, this.centerY);
      ctx.moveTo(this.posLeft + dx, this.posTop + dx);
      ctx.lineTo(this.posRight - dx, this.posBottom - dx);
    } else if (this.rotation == 45 || this.rotation == 225) {
      ctx.moveTo(this.centerX, this.posTop + dx);
      ctx.lineTo(this.centerX, this.posBottom - dx);
      ctx.moveTo(this.posLeft + dx, this.posTop + dx);
      ctx.lineTo(this.posRight - dx, this.posBottom - dx);
    } else if (this.rotation == 90 || this.rotation == 270) {
      ctx.moveTo(this.centerX, this.posTop + dx);
      ctx.lineTo(this.centerX, this.posBottom - dx);
      ctx.moveTo(this.posRight - dx, this.posTop + dx);
      ctx.lineTo(this.posLeft + dx, this.posBottom - dx);
    } else if (this.rotation == 135 || this.rotation == 315) {
      ctx.moveTo(this.posLeft + dx, this.centerY);
      ctx.lineTo(this.posRight - dx, this.centerY);
      ctx.moveTo(this.posRight - dx, this.posTop + dx);
      ctx.lineTo(this.posLeft + dx, this.posBottom - dx);
    }
  }

  override hitTest(px: number, py: number): boolean {
    return this.x == px && this.y == py;
  }

  override toJSON(): ITrackCrossingElement {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_CROSSING,
      address: this.address,
      length: this.length,
    };
  }

  static fromJSON(
    data: ITrackCrossingElement
  ): TrackCrossingElementView {
    const element = new TrackCrossingElementView(
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

  clone(): TrackCrossingElementView {
    const copy = new TrackCrossingElementView(
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
