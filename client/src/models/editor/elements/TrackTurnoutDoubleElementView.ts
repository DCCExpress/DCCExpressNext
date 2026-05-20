import CommonTrackTurnoutDoubleElement from "../../../../../common/src/layout/elements/TrackTurnoutDoubleElement";
import {
  ELEMENT_TYPES,
} from "../../../../../common/src/layout/elementTypes";
import {
  generateId,
} from "../../../helpers";
import {
  TrackElementViewMixin,
} from "../core/view/TrackElementViewMixin";
import {
  DrawOptions,
  ITrackTurnoutDoubleElement,
} from "../types/EditorTypes";

export default class TrackTurnoutDoubleElementView
  extends TrackElementViewMixin(CommonTrackTurnoutDoubleElement)
  implements ITrackTurnoutDoubleElement {
  override type: typeof ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE =
    ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE;

  turnoutLocked: string | CanvasGradient | CanvasPattern = "red";
  turnoutUnLocked: string | CanvasGradient | CanvasPattern = "white";

  constructor(x: number, y: number) {
    super(x, y);
  }

  override draw(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    if (!this.visible) return;

    this.beginDraw(ctx, options);
    this.drawTurnout(ctx, false, false);
    this.endDraw(ctx);

    super.drawSelection(ctx);
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

  override toJSON(): ITrackTurnoutDoubleElement {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE,
      address: this.address,
      length: this.length,
      turnout1Address: this.turnout1Address,
      turnout2Address: this.turnout2Address,
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

    return copy;
  }
}
