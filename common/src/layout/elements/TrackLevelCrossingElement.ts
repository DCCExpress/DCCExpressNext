import {
  ELEMENT_TYPES,
} from "../elementTypes.js";
import type {
  TrackLevelCrossingElementDto,
} from "../layoutDto.js";
import {
  TrackStraightElement,
} from "./TrackStraightElement.js";

export class TrackLevelCrossingElement extends TrackStraightElement {
  override type: typeof ELEMENT_TYPES.TRACK_LEVEL_CROSSING =
    ELEMENT_TYPES.TRACK_LEVEL_CROSSING;

  barrierType: TrackLevelCrossingElementDto["barrierType"] = "half";
  barrierClosed = false;
  lightsEnabled = true;
  roadColor = "#6c757d";

  constructor(x: number, y: number) {
    super(x, y);
    this.type = ELEMENT_TYPES.TRACK_LEVEL_CROSSING;
    this.name = "Level crossing";
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
    element.barrierType = data.barrierType ?? "half";
    element.barrierClosed = data.barrierClosed ?? false;
    element.lightsEnabled = data.lightsEnabled ?? true;
    element.roadColor = data.roadColor ?? "#6c757d";
    return element;
  }

  override toJSON(): TrackLevelCrossingElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_LEVEL_CROSSING,
      barrierType: this.barrierType,
      barrierClosed: this.barrierClosed,
      lightsEnabled: this.lightsEnabled,
      roadColor: this.roadColor,
    };
  }
}
