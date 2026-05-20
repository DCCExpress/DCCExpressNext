import {
  ELEMENT_TYPES,
} from "../elementTypes.js";
import type {
  TrackCrossingElementDto,
} from "../layoutDto.js";
import {
  TrackElement,
} from "../model/TrackElement.js";

export class TrackCrossingElement extends TrackElement {
  override type: typeof ELEMENT_TYPES.TRACK_CROSSING =
    ELEMENT_TYPES.TRACK_CROSSING;

  constructor(x: number, y: number) {
    super(x, y);
    this.type = ELEMENT_TYPES.TRACK_CROSSING;
    this.rotationStep = 45;
  }

  static fromJSON(data: TrackCrossingElementDto): TrackCrossingElement {
    const element = new TrackCrossingElement(data.x, data.y);
    element.id = data.id;
    element.name = data.name;
    element.layerName = data.layerName;
    element.rotation = data.rotation;
    element.rotationStep = data.rotationStep;
    element.address = data.address;
    element.length = data.length;
    element.bg = data.bg;
    element.fg = data.fg;
    return element;
  }

  override toJSON(): TrackCrossingElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_CROSSING,
    };
  }
}
