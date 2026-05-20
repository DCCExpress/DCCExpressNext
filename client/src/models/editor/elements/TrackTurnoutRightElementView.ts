import {
  TrackTurnoutRightElement as CommonTrackTurnoutRightElement,
} from "../../../../../common/src/layout/elements/TrackTurnoutRightElement";
import {
  ELEMENT_TYPES,
} from "../../../../../common/src/layout/elementTypes";
import {
  generateId,
} from "../../../helpers";
import {
  TrackTurnoutElementViewMixin,
} from "../core/view/TrackTurnoutElementViewMixin";
import type {
  ITrackTurnoutRightElement,
} from "../types/EditorTypes";

export class TrackTurnoutRightElementView
  extends TrackTurnoutElementViewMixin(CommonTrackTurnoutRightElement)
  implements ITrackTurnoutRightElement {
  override type: typeof ELEMENT_TYPES.TRACK_TURNOUT_RIGHT =
    ELEMENT_TYPES.TRACK_TURNOUT_RIGHT;

  constructor(x: number, y: number) {
    super(x, y);
  }

  override drawTurnout(
    ctx: CanvasRenderingContext2D,
    closed: boolean
  ): void {
    ctx.beginPath();

    ctx.strokeStyle = this.TrackPrimaryColor;
    ctx.lineWidth = this.TrackWidth7;

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

  override toJSON(): ITrackTurnoutRightElement {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_TURNOUT_RIGHT,
      address: this.address,
      length: this.length,
      turnoutAddress: this.turnoutAddress,
      turnoutClosedValue: this.turnoutClosedValue,
    };
  }

  static fromJSON(
    data: ITrackTurnoutRightElement
  ): TrackTurnoutRightElementView {
    const element = new TrackTurnoutRightElementView(
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

  clone(): TrackTurnoutRightElementView {
    const copy = new TrackTurnoutRightElementView(
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
