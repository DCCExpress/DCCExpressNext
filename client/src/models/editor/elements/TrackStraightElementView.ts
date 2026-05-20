import { ELEMENT_TYPES } from "../../../../../common/src/layout/elementTypes";
import { drawTextWithRoundedBackground } from "../../../graphics";
import { generateId } from "../../../helpers";
import { TrackElement } from "../core/TrackElement";
import {
  DrawOptions,
  ITrackElement as ITrackStraightElement,
} from "../types/EditorTypes";

/**
 * Kliensoldali rajzolható/editoros nézet az egyenes sínhez.
 *
 * Fontos:
 * - a common oldali grafikamentes modell már létezik:
 *   common/src/layout/elements/TrackStraightElement.ts
 * - ez a View osztály most még a meglévő kliens TrackElement
 *   öröklési láncban marad, hogy a Layout / Canvas / PropertyPanel
 *   változtatás nélkül kompatibilis maradjon
 * - a következő nagy lépésben ezt a láncot lehet fokozatosan
 *   a common modellre ráültetni
 */
export class TrackStraightElementView
  extends TrackElement
  implements ITrackStraightElement {
  override type: typeof ELEMENT_TYPES.TRACK_STRAIGHT =
    ELEMENT_TYPES.TRACK_STRAIGHT;

  constructor(x: number, y: number) {
    super(x, y);

    this.type = ELEMENT_TYPES.TRACK_STRAIGHT;
    this.rotationStep = 45;
    this.length = 200;
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

    ctx.lineWidth = 7;
    ctx.strokeStyle = "black";

    if (this.rotation == 0 || this.rotation == 180) {
      ctx.beginPath();
      ctx.moveTo(this.posLeft, this.centerY);
      ctx.lineTo(this.posLeft + this.GridSizeX, this.centerY);
      ctx.stroke();
    } else if (this.rotation == 45 || this.rotation == 225) {
      ctx.beginPath();
      ctx.moveTo(this.PositionX, this.PositionY);
      ctx.lineTo(
        this.PositionX + this.GridSizeX,
        this.PositionY + this.GridSizeY
      );
      ctx.stroke();
    } else if (this.rotation == 90 || this.rotation == 270) {
      ctx.beginPath();
      ctx.moveTo(this.centerX, this.PositionY);
      ctx.lineTo(this.centerX, this.PositionY + this.GridSizeY);
      ctx.stroke();
    } else if (this.rotation == 135 || this.rotation == 315) {
      ctx.beginPath();
      ctx.moveTo(
        this.PositionX + this.GridSizeX,
        this.PositionY
      );
      ctx.lineTo(
        this.PositionX,
        this.PositionY + this.GridSizeY
      );
      ctx.stroke();
    }

    ctx.lineWidth = this.TrackWidth3;
    ctx.strokeStyle = this.stateColor;

    const w4 = this.GridSizeX / 4;

    if (this.rotation == 0 || this.rotation == 180) {
      ctx.beginPath();
      ctx.moveTo(this.posLeft + w4, this.centerY);
      ctx.lineTo(this.posRight - w4, this.centerY);
      ctx.stroke();
    } else if (this.rotation == 45 || this.rotation == 225) {
      ctx.beginPath();
      ctx.moveTo(this.posLeft + w4, this.posTop + w4);
      ctx.lineTo(this.posRight - w4, this.posBottom - w4);
      ctx.stroke();
    } else if (this.rotation == 90 || this.rotation == 270) {
      ctx.beginPath();
      ctx.moveTo(this.centerX, this.posTop + w4);
      ctx.lineTo(this.centerX, this.posBottom - w4);
      ctx.stroke();
    } else if (this.rotation == 135 || this.rotation == 315) {
      ctx.beginPath();
      ctx.moveTo(this.posRight - w4, this.posTop + w4);
      ctx.lineTo(this.posLeft + w4, this.posBottom - w4);
      ctx.stroke();
    }

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
    super.draw(ctx);
  }

  static fromJSON(
    data: ITrackStraightElement
  ): TrackStraightElementView {
    const track = new TrackStraightElementView(
      data.x,
      data.y
    );

    track.id = data.id;
    track.name = data.name;
    track.rotation = data.rotation;
    track.address = data.address;
    track.bg = data.bg;
    track.fg = data.fg;

    return track;
  }

  override clone(): TrackStraightElementView {
    const copy = new TrackStraightElementView(
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

  getHelp(): string {
    return `
    <h3 style="margin-top:0;">Track element</h3>
    <p>This is a straight track section.</p>
    <ul>
      <li>You can rotate it with R</li>
      <li>You can move it by drag and drop</li>
    </ul>
  `;
  }
}
