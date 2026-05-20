import {
  ELEMENT_TYPES,
} from "../elementTypes.js";
import type {
  TrackSensorElementDto,
} from "../layoutDto.js";
import {
  TrackElement,
} from "../model/TrackElement.js";

export enum SensorTypes {
  circle,
  rect,
}

export class TrackSensorElement extends TrackElement {
  override type: typeof ELEMENT_TYPES.TRACK_SENSOR =
    ELEMENT_TYPES.TRACK_SENSOR;

  on: boolean = false;
  kind: SensorTypes = SensorTypes.rect;
  colorOn: string = "lime";
  colorOff: string = "green";
  textOn: string = "ON";
  textOff: string = "OFF";
  radius: number = 6;

  constructor(x: number, y: number) {
    super(x, y);
    this.layerName = "sensors";
  }

  static fromJSON(
    data: TrackSensorElementDto
  ): TrackSensorElement {
    const element = new TrackSensorElement(data.x, data.y);
    element.id = data.id;
    element.name = data.name;
    element.layerName = data.layerName;
    element.rotation = data.rotation;
    element.rotationStep = data.rotationStep;
    element.bg = data.bg;
    element.fg = data.fg;
    element.address = data.address;
    element.length = data.length;
    element.kind = data.kind as SensorTypes;
    element.colorOn = data.colorOn;
    element.colorOff = data.colorOff;
    element.radius = data.radius ?? 6;
    return element;
  }

  override toJSON(): TrackSensorElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_SENSOR,
      address: this.address,
      kind: this.kind,
      colorOn: this.colorOn,
      colorOff: this.colorOff,
      radius: this.radius,
    };
  }
}
