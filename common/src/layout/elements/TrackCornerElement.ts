import {
  getDirectionXy,
} from "../../helpers.js";
import {
  Point,
} from "../../Rect.js";
import {
  ELEMENT_TYPES,
} from "../elementTypes.js";
import type {
  TrackCornerElementDto,
} from "../layoutDto.js";
import {
  TrackElement,
} from "../model/TrackElement.js";

export class TrackCornerElement extends TrackElement {
  override type: typeof ELEMENT_TYPES.TRACK_CORNER =
    ELEMENT_TYPES.TRACK_CORNER;

  constructor(x: number, y: number) {
    super(x, y);
    this.type = ELEMENT_TYPES.TRACK_CORNER;
    this.rotationStep = 90;
  }

  override getNextItemXy(): Point {
    return getDirectionXy(this.pos, this.rotation + 90);
  }

  override getPrevItemXy(): Point {
    return getDirectionXy(this.pos, this.rotation - 180);
  }

  static fromJSON(data: TrackCornerElementDto): TrackCornerElement {
    const element = new TrackCornerElement(data.x, data.y);
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

  override toJSON(): TrackCornerElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_CORNER,
    };
  }
}
