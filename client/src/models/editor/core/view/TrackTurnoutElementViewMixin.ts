import type {
  TrackTurnoutElement as CommonTrackTurnoutElement,
} from "../../../../../../common/src/layout/elements/TrackTurnoutElement";
import {
  drawTextWithRoundedBackground,
} from "../../../../graphics";
import {
  wsApi,
} from "../../../../services/wsApi";
import type {
  DrawOptions,
} from "../../types/EditorTypes";
import type {
  IEditableProperty,
} from "../../elements/PropertyDescriptor";
import {
  TrackElementViewMixin,
} from "./TrackElementViewMixin";

type AbstractConstructor<T = object> =
  abstract new (...args: any[]) => T;

/**
 * Kliensoldali turnout UI/editor mixin.
 *
 * A domain/topológiai turnout logika a common osztályokból jön:
 * - isClosed
 * - turnoutAddress / turnoutClosedValue / turnoutClosed
 * - getConnections()
 * - bal/jobb váltó saját next/prev/neighbors logikája
 *
 * Ez a mixin csak a kliensspecifikus részt adja:
 * - draw wrapper
 * - címke
 * - WS turnout kapcsolás
 * - property panel mezők
 * - közös turnout UI színek
 */
export function TrackTurnoutElementViewMixin<
  TBase extends AbstractConstructor<CommonTrackTurnoutElement>
>(Base: TBase) {
  abstract class TrackTurnoutElementView extends TrackElementViewMixin(Base) {
    turnoutLockedColor: string | CanvasGradient | CanvasPattern = "red";
    turnoutUnLockedColor: string | CanvasGradient | CanvasPattern = "white";

    constructor(...args: any[]) {
      super(...args);
    }

    override draw(
      ctx: CanvasRenderingContext2D,
      options?: DrawOptions
    ): void {
      if (!this.visible) {
        return;
      }

      this.beginDraw(ctx, options);
      this.drawTurnout(ctx, this.isClosed);
      this.endDraw(ctx);

      this.beginDraw(ctx);

      if (options?.showTurnoutAddress) {
        drawTextWithRoundedBackground(
          ctx,
          this.posLeft,
          this.posBottom - 10,
          "#" + this.turnoutAddress.toString()
        );
      }

      this.drawSectionInfo(ctx, options);
      this.endDraw(ctx);

      super.drawSelection(ctx);
    }

    abstract drawTurnout(
      ctx: CanvasRenderingContext2D,
      closed: boolean
    ): void;

    override mouseDown(_ev: MouseEvent): void {
      wsApi.setTurnout(
        this.turnoutAddress,
        !this.turnoutClosed
      );
    }

    toggle(): void {
      wsApi.setTurnout(
        this.turnoutAddress,
        !this.turnoutClosed
      );
    }

    override mouseUp(_ev: MouseEvent): void {
      // Default turnout UI: no-op.
    }

    override getEditableProperties(): IEditableProperty[] {
      return [
        ...super.getEditableProperties(),
        {
          label: "Turnout Address",
          key: "turnoutAddress",
          type: "number",
          readonly: false,
          validate: () => true,
        },
        {
          label: "Closed Value",
          key: "turnoutClosedValue",
          type: "bittoggle",
          readonly: false,
          validate: () => true,
        },
      ];
    }
  }

  return TrackTurnoutElementView;
}
