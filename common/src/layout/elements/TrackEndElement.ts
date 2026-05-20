import {
  ELEMENT_TYPES,
} from "../elementTypes.js";
import type {
  TrackEndElementDto,
} from "../layoutDto.js";
import {
  TrackElement,
} from "../model/TrackElement.js";

export class TrackEndElement extends TrackElement {
  override type: typeof ELEMENT_TYPES.TRACK_END =
    ELEMENT_TYPES.TRACK_END;

  constructor(x: number, y: number) {
    super(x, y);
    this.type = ELEMENT_TYPES.TRACK_END;
    this.rotationStep = 45;
  }

  static fromJSON(data: TrackEndElementDto): TrackEndElement {
    const element = new TrackEndElement(data.x, data.y);
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

  override toJSON(): TrackEndElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_END,
    };
  }
}
