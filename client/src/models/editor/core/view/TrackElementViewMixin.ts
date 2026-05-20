import type {
  TrackElement as CommonTrackElement,
} from "../../../../../../common/src/layout/model/TrackElement";
import {
  TrackStates,
} from "../../../../../../common/src/layout/model/TrackElement";
import {
  drawTextWithRoundedBackground,
} from "../../../../graphics";
import type {
  DrawOptions,
} from "../../types/EditorTypes";
import {
  BaseElementViewMixin,
} from "./BaseElementViewMixin";

type AbstractConstructor<T = object> =
  abstract new (...args: any[]) => T;

export const TrackColors = {
  free: "gray",
  selected: "yellow",
  occupied: "red",
};

/**
 * Track-specifikus UI/editor képességek a common TrackElement fölé.
 */
export function TrackElementViewMixin<
  TBase extends AbstractConstructor<CommonTrackElement>
>(Base: TBase) {
  abstract class TrackElementView extends BaseElementViewMixin(Base) {
    constructor(...args: any[]) {
      super(...args);
    }

    get stateColor(): string {
      if (this.isBusy) {
        return "orange";
      }

      if (this.isRoute) {
        return "yellow";
      }

      switch (this.state) {
        case TrackStates.selected:
          return TrackColors.selected;

        case TrackStates.occupied:
          return TrackColors.occupied;
      }

      return TrackColors.free;
    }

    drawSectionInfo(
      ctx: CanvasRenderingContext2D,
      options?: DrawOptions
    ): void {
      if (!options?.showSection || this.section <= 0) {
        return;
      }

      ctx.save();

      drawTextWithRoundedBackground(
        ctx,
        this.centerX,
        this.centerY + 12,
        "S" + this.section.toString(),
        "white",
        "black"
      );

      drawTextWithRoundedBackground(
        ctx,
        this.centerX,
        this.centerY,
        this.getTravelDirectionArrow(),
        "white",
        "black",
        2,
        2
      );

      ctx.restore();
    }

    getTravelDirectionArrow(): string {
      if (this.travelDirection === "unknown") {
        return "?";
      }

      const target =
        this.travelDirection === "forward"
          ? this.getNextItemXy()
          : this.getPrevItemXy();

      const dx = target.x - this.pos.x;
      const dy = target.y - this.pos.y;

      if (dx > 0 && dy === 0) return "→";
      if (dx > 0 && dy > 0) return "↘";
      if (dx === 0 && dy > 0) return "↓";
      if (dx < 0 && dy > 0) return "↙";
      if (dx < 0 && dy === 0) return "←";
      if (dx < 0 && dy < 0) return "↖";
      if (dx === 0 && dy < 0) return "↑";
      if (dx > 0 && dy < 0) return "↗";

      return "?";
    }
  }

  return TrackElementView;
}
