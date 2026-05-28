import {
  ELEMENT_TYPES,
} from "../elementTypes.js";
import type {
  TrackLevelCrossingElementDto,
} from "../layoutDto.js";
import {
  TrackElement,
} from "../model/TrackElement.js";

export class TrackLevelCrossingElement extends TrackElement {
  override type: typeof ELEMENT_TYPES.TRACK_LEVEL_CROSSING =
    ELEMENT_TYPES.TRACK_LEVEL_CROSSING;

  basicAccessoryAddress = 0;
  basicAccessoryClosedValue = true;
  barrierType: TrackLevelCrossingElementDto["barrierType"] = "half";
  barrierClosed = false;
  lightsEnabled = true;
  blinkingEnabled = true;
  roadColor = "#6c757d";

  constructor(x: number, y: number) {
    super(x, y);
    this.type = ELEMENT_TYPES.TRACK_LEVEL_CROSSING;
    this.name = "Level crossing";
    this.rotationStep = 45;
    this.length = 200;
  }

  static fromJSON(data: TrackLevelCrossingElementDto): TrackLevelCrossingElement {
    const element = new TrackLevelCrossingElement(data.x, data.y);
    element.id = data.id;
    element.name = data.name;
    element.layerName = data.layerName;
    element.rotation = data.rotation;
    element.rotationStep = data.rotationStep;
    element.address = data.address;
    element.length = data.length;
    element.bg = data.bg;
    element.fg = data.fg;
    element.basicAccessoryAddress = data.basicAccessoryAddress ?? 0;
    element.basicAccessoryClosedValue = data.basicAccessoryClosedValue ?? true;
    element.barrierType = data.barrierType ?? "half";
    element.barrierClosed = data.barrierClosed ?? false;
    element.lightsEnabled = data.lightsEnabled ?? true;
    element.blinkingEnabled = data.blinkingEnabled ?? true;
    element.roadColor = data.roadColor ?? "#6c757d";
    return element;
  }

  override toJSON(): TrackLevelCrossingElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_LEVEL_CROSSING,
      basicAccessoryAddress: this.basicAccessoryAddress,
      basicAccessoryClosedValue: this.basicAccessoryClosedValue,
      barrierType: this.barrierType,
      barrierClosed: this.barrierClosed,
      lightsEnabled: this.lightsEnabled,
      blinkingEnabled: this.blinkingEnabled,
      roadColor: this.roadColor,
    };
  }
}
