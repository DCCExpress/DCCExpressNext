import {
  ELEMENT_TYPES,
} from "../elementTypes.js";
import type {
  TrackDirectionElementDto,
} from "../layoutDto.js";
import {
  Point,
} from "../../Rect.js";
import {
  TrackElement,
} from "../model/TrackElement.js";

export class TrackDirectionElement extends TrackElement {
  override type: typeof ELEMENT_TYPES.TRACK_DIRECTION =
    ELEMENT_TYPES.TRACK_DIRECTION;

  constructor(x: number, y: number) {
    super(x, y);
    this.type = ELEMENT_TYPES.TRACK_DIRECTION;
    this.rotationStep = 45;
    this.length = 200;
  }

  getForwardItemXy(): Point {
    return this.getNextItemXy();
  }

  getBackwardItemXy(): Point {
    return this.getPrevItemXy();
  }

  isForwardTowards(pos: Point): boolean {
    return this.getForwardItemXy().isEqual(pos);
  }

  isBackwardTowards(pos: Point): boolean {
    return this.getBackwardItemXy().isEqual(pos);
  }

  static fromJSON(data: TrackDirectionElementDto): TrackDirectionElement {
    const element = new TrackDirectionElement(data.x, data.y);
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

  override toJSON(): TrackDirectionElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_DIRECTION,
    };
  }
}
