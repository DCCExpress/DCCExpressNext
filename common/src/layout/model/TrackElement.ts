// common/src/layout/model/TrackElement.ts

import type {
  TrackElementDto,
} from "../layoutDto.js";
import {
  BaseElement,
} from "./BaseElement.js";

export enum TrackStates {
  free,
  selected,
  occupied,
}

export type TravelDirection =
  | "unknown"
  | "forward"
  | "reverse";

export abstract class TrackElement extends BaseElement {
  address: number = 0;
  length: number = 200;

  state: TrackStates = TrackStates.free;
  section: number = 0;
  isRoute: boolean = false;
  travelDirection: TravelDirection = "unknown";
  isBusy: boolean = false;

  /**
   * Csak runtime kliensoldali overlay:
   * true, ha egy aktív train task szerint
   * a mozdony éppen ezen a sín-szakaszon halad.
   */
  isTransit: boolean = false;

  override toJSON(): TrackElementDto {
    return {
      ...super.toJSON(),
      address: this.address,
      length: this.length,
    };
  }
}
