import {
  TrackCurveElement as CommonTrackCurveElement,
} from "../../../../../common/src/layout/elements/TrackCurveElement";
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
  ITrackCurveElement,
} from "../types/EditorTypes";

export class TrackCurveElementView
  extends TrackElementViewMixin(CommonTrackCurveElement)
  implements ITrackCurveElement {
  override type: typeof ELEMENT_TYPES.TRACK_CURVE =
    ELEMENT_TYPES.TRACK_CURVE;

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

    ctx.lineWidth = this.TrackWidth7;
    ctx.strokeStyle = this.TrackPrimaryColor;

    this.drawCurvePath(ctx);
    ctx.stroke();

    ctx.lineWidth = this.TrackWidth3;
    ctx.strokeStyle = this.stateColor;

    const w2 = this.GridSizeX / 3;
    ctx.lineDashOffset = -w2 / 3;
    ctx.setLineDash([w2, w2]);

    this.drawCurvePath(ctx);
    ctx.stroke();

    if (options?.showOccupancySensorAddress) {
      drawTextWithRoundedBackground(
        ctx,
        this.posLeft,
        this.posBottom - 10,
        "#" + this.address.toString()
      );
    }

    this.drawSectionInfo(ctx, options);

    this.endDraw(ctx);
    super.drawSelection(ctx);
  }

  private drawCurvePath(
    ctx: CanvasRenderingContext2D
  ): void {
    ctx.beginPath();

    if (this.rotation == 0) {
      ctx.moveTo(this.PositionX, this.PositionY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(this.PositionX + this.GridSizeX, this.centerY);
    } else if (this.rotation == 45) {
      ctx.moveTo(this.PositionX + this.GridSizeX / 2, this.PositionY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(
        this.PositionX + this.GridSizeX,
        this.PositionY + this.GridSizeY
      );
    } else if (this.rotation == 90) {
      ctx.moveTo(this.PositionX + this.GridSizeX, this.PositionY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(this.centerX, this.PositionY + this.GridSizeY);
    } else if (this.rotation == 135) {
      ctx.moveTo(this.PositionX, this.PositionY + this.GridSizeY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(this.PositionX + this.GridSizeX, this.centerY);
    } else if (this.rotation == 180) {
      ctx.moveTo(this.PositionX, this.centerY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(
        this.PositionX + this.GridSizeX,
        this.PositionY + this.GridSizeY
      );
    } else if (this.rotation == 225) {
      ctx.moveTo(this.PositionX, this.PositionY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(this.centerX, this.PositionY + this.GridSizeY);
    } else if (this.rotation == 270) {
      ctx.moveTo(this.PositionX, this.PositionY + this.GridSizeY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(this.centerX, this.PositionY);
    } else if (this.rotation == 315) {
      ctx.moveTo(this.PositionX, this.centerY);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.lineTo(this.PositionX + this.GridSizeX, this.PositionY);
    }
  }

  override hitTest(px: number, py: number): boolean {
    return this.x == px && this.y == py;
  }

  override toJSON(): ITrackCurveElement {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_CURVE,
      address: this.address,
      length: this.length,
    };
  }

  static fromJSON(
    data: ITrackCurveElement
  ): TrackCurveElementView {
    const curve = new TrackCurveElementView(
      data.x,
      data.y
    );

    curve.id = data.id;
    curve.name = data.name;
    curve.layerName = data.layerName;
    curve.rotation = data.rotation;
    curve.rotationStep = data.rotationStep;
    curve.address = data.address;
    curve.length = data.length;
    curve.bg = data.bg;
    curve.fg = data.fg;

    return curve;
  }

  clone(): TrackCurveElementView {
    const copy = new TrackCurveElementView(
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
