import {
  TrackEndElement as CommonTrackEndElement,
} from "../../../../../common/src/layout/elements/TrackEndElement";
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
  ITrackEndElement,
} from "../types/EditorTypes";

export class TrackEndElementView
  extends TrackElementViewMixin(CommonTrackEndElement)
  implements ITrackEndElement {
  override type: typeof ELEMENT_TYPES.TRACK_END =
    ELEMENT_TYPES.TRACK_END;

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

    const h = this.GridSizeY / 4.0;

    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.translate(-this.centerX, -this.centerY);

    ctx.lineWidth = this.TrackWidth7;
    ctx.strokeStyle = this.TrackPrimaryColor;

    if (this.rotation % 90 == 0) {
      ctx.beginPath();
      ctx.moveTo(this.PositionX, this.centerY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.moveTo(this.centerX, this.centerY - h);
      ctx.lineTo(this.centerX, this.centerY + h);
      ctx.stroke();
    } else {
      const r = this.GridSizeX / 2;
      const l = Math.sqrt(2 * r * r);

      ctx.beginPath();
      ctx.moveTo(this.centerX - l, this.centerY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.moveTo(this.centerX, this.centerY - h);
      ctx.lineTo(this.centerX, this.centerY + h);
      ctx.stroke();
    }

    ctx.lineWidth = this.TrackWidth3;
    ctx.strokeStyle = this.stateColor;

    const p = this.GridSizeX / 4;

    if (this.rotation % 90 == 0) {
      ctx.beginPath();
      ctx.moveTo(this.PositionX + p, this.centerY);
      ctx.lineTo(this.centerX - this.TrackWidth7 / 2, this.centerY);
      ctx.stroke();
    } else {
      const r = this.GridSizeX / 2;
      const l = Math.sqrt(2 * r * r) - p;

      ctx.beginPath();
      ctx.moveTo(this.centerX - l, this.centerY);
      ctx.lineTo(this.centerX - this.TrackWidth7 / 2, this.centerY);
      ctx.stroke();
    }

    this.endDraw(ctx);

    this.beginDraw(ctx);

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

  override hitTest(px: number, py: number): boolean {
    return this.x == px && this.y == py;
  }

  override toJSON(): ITrackEndElement {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_END,
      address: this.address,
      length: this.length,
    };
  }

  static fromJSON(
    data: ITrackEndElement
  ): TrackEndElementView {
    const track = new TrackEndElementView(
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

  clone(): TrackEndElementView {
    const copy = new TrackEndElementView(
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
