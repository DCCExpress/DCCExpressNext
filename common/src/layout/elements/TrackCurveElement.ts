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
  TrackCurveElementDto,
} from "../layoutDto.js";
import {
  TrackElement,
} from "../model/TrackElement.js";

export class TrackCurveElement extends TrackElement {
  override type: typeof ELEMENT_TYPES.TRACK_CURVE =
    ELEMENT_TYPES.TRACK_CURVE;

  constructor(x: number, y: number) {
    super(x, y);
    this.type = ELEMENT_TYPES.TRACK_CURVE;
    this.rotationStep = 45;
  }

  override getNextItemXy(): Point {
    return getDirectionXy(this.pos, this.rotation);
  }

  override getPrevItemXy(): Point {
    return getDirectionXy(this.pos, this.rotation + 225);
  }

  static fromJSON(data: TrackCurveElementDto): TrackCurveElement {
    const element = new TrackCurveElement(data.x, data.y);
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

  override toJSON(): TrackCurveElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_CURVE,
    };
  }
}
