import {
  ELEMENT_TYPES,
} from "../elementTypes.js";
import type {
  TrackTurnoutTwoWayElementDto,
} from "../layoutDto.js";
import {
  TrackElement,
} from "../model/TrackElement.js";

export class TrackTurnoutTwoWayElement extends TrackElement {
  override type: typeof ELEMENT_TYPES.TRACK_TURNOUT_TWO_WAY =
    ELEMENT_TYPES.TRACK_TURNOUT_TWO_WAY;

  turnoutAddress: number = 0;

  constructor(x: number, y: number) {
    super(x, y);
    this.rotationStep = 45;
  }

  static fromJSON(
    data: TrackTurnoutTwoWayElementDto
  ): TrackTurnoutTwoWayElement {
    const element = new TrackTurnoutTwoWayElement(data.x, data.y);
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

  override toJSON(): TrackTurnoutTwoWayElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_TURNOUT_TWO_WAY,
    };
  }
}
