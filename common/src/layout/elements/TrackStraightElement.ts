// common/src/layout/elements/TrackStraightElement.ts

import {
  ELEMENT_TYPES,
} from "../elementTypes.js";
import type {
  TrackStraightElementDto,
} from "../layoutDto.js";
import {
  TrackElement,
} from "../model/TrackElement.js";

/**
 * Grafikamentes közös egyenes sín modell.
 *
 * Ezt már a szerver is közvetlenül használhatja.
 */
export class TrackStraightElement extends TrackElement {
  override type: typeof ELEMENT_TYPES.TRACK_STRAIGHT =
    ELEMENT_TYPES.TRACK_STRAIGHT;

  constructor(x: number, y: number) {
    super(x, y);

    this.type = ELEMENT_TYPES.TRACK_STRAIGHT;
    this.rotationStep = 45;
    this.length = 200;
  }

  static fromJSON(
    data: TrackStraightElementDto
  ): TrackStraightElement {
    const track = new TrackStraightElement(
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

  override toJSON(): TrackStraightElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_STRAIGHT,
    };
  }
}
