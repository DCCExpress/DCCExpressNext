import {
  TrackStates,
  type TrackElement as CommonTrackElement,
} from "../../../../../../../common/src/layout/model/TrackElement";
import {
  drawTextWithRoundedBackground,
} from "../../../../../graphics";
import type {
  DrawOptions,
} from "../../../types/EditorTypes";
import type {
  BaseElementViewSupportTarget,
} from "./BaseElementViewSupport";

export const TrackColors = {
  free: "gray",
  selected: "yellow",
  occupied: "red",
  transit: "#fd2020",
};

export type TrackElementViewSupportTarget =
  CommonTrackElement &
  BaseElementViewSupportTarget;

export function getTrackStateColor(
  element: TrackElementViewSupportTarget
): string {
  /**
   * Prioritás:
   * 1. Valódi occupancy
   * 2. Mozdony transit / mozgásban
   * 3. Lefoglalt útvonal
   * 4. Sima route-ellenőrzés
   * 5. Egyéb állapot
   */
  if (element.state === TrackStates.occupied) {
    return TrackColors.occupied;
  }

  if (element.isTransit) {
    return TrackColors.transit;
  }

  if (element.isBusy) {
    return "orange";
  }

  if (element.isRoute) {
    return "yellow";
  }

  if (element.state === TrackStates.selected) {
    return TrackColors.selected;
  }

  return TrackColors.free;
}

export function drawTrackSectionInfo(
  element: TrackElementViewSupportTarget,
  ctx: CanvasRenderingContext2D,
  options?: DrawOptions
): void {
  if (!options?.showSection || element.section <= 0) {
    return;
  }

  ctx.save();

  drawTextWithRoundedBackground(
    ctx,
    element.centerX,
    element.centerY + 12,
    "S" + element.section.toString(),
    "white",
    "black"
  );

  drawTextWithRoundedBackground(
    ctx,
    element.centerX,
    element.centerY,
    getTrackTravelDirectionArrow(element),
    "white",
    "black",
    2,
    2
  );

  ctx.restore();
}

export function getTrackTravelDirectionArrow(
  element: TrackElementViewSupportTarget
): string {
  if (element.travelDirection === "unknown") {
    return "?";
  }

  const target =
    element.travelDirection === "forward"
      ? element.getNextItemXy()
      : element.getPrevItemXy();

  const dx = target.x - element.pos.x;
  const dy = target.y - element.pos.y;

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
