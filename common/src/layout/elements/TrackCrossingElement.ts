import {
  getDirectionXy,
} from "../../helpers.js";
import type {
  Point,
} from "../../Rect.js";
import {
  ELEMENT_TYPES,
} from "../elementTypes.js";
import type {
  TrackCrossingElementDto,
} from "../layoutDto.js";
import {
  type NeighborPointPair,
} from "../model/BaseElement.js";
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

  override getNeighborPointPairs(): NeighborPointPair[] {
    const [straightAngle, crossingAngle] =
      this.getCrossingLineAngles();

    return [
      [
        getDirectionXy(this.pos, straightAngle + 180),
        getDirectionXy(this.pos, straightAngle),
      ],
      [
        getDirectionXy(this.pos, crossingAngle + 180),
        getDirectionXy(this.pos, crossingAngle),
      ],
    ];
  }

  override getNeigbordsXy(): Point[] {
    return this.getNeighborPointPairs().flat();
  }

  private getCrossingLineAngles(): [number, number] {
    const rotation =
      this.normalizeRotation(this.rotation);

    switch (rotation) {
      case 0:
      case 180:
        return [0, 45];

      case 45:
      case 225:
        return [90, 45];

      case 90:
      case 270:
        return [90, 135];

      case 135:
      case 315:
        return [0, 135];

      default:
        return [
          rotation,
          rotation + 45,
        ];
    }
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
