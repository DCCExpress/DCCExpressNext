import {
  ELEMENT_TYPES,
} from "../elementTypes.js";
import type {
  TrackTurnoutDoubleElementDto,
  RotationStepDto,
} from "../layoutDto.js";
import {
  TrackElement,
} from "../model/TrackElement.js";

export default class TrackTurnoutDoubleElement extends TrackElement {
  override type: typeof ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE =
    ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE;

  name: string = ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE;
  rotationStep: RotationStepDto = 45;

  turnout1Address: number = 0;
  turnout2Address: number = 0;

  static fromJSON(
    data: TrackTurnoutDoubleElementDto
  ): TrackTurnoutDoubleElement {
    const element = new TrackTurnoutDoubleElement(data.x, data.y);
    element.id = data.id;
    element.name = data.name;
    element.layerName = data.layerName;
    element.rotation = data.rotation;
    element.rotationStep = data.rotationStep;
    element.address = data.address;
    element.length = data.length;
    element.bg = data.bg;
    element.fg = data.fg;
    element.turnout1Address = data.turnout1Address;
    element.turnout2Address = data.turnout2Address;
    return element;
  }

  override toJSON(): TrackTurnoutDoubleElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE,
      turnout1Address: this.turnout1Address,
      turnout2Address: this.turnout2Address,
    };
  }
}
