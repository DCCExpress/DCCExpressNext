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
  TrackTurnoutLeftElementDto,
} from "../layoutDto.js";
import {
  TrackTurnoutElement,
} from "./TrackTurnoutElement.js";

export class TrackTurnoutLeftElement extends TrackTurnoutElement {
  override type: typeof ELEMENT_TYPES.TRACK_TURNOUT_LEFT =
    ELEMENT_TYPES.TRACK_TURNOUT_LEFT;

  override getNextItemXy(): Point {
    if (this.isClosed) {
      return getDirectionXy(this.pos, -this.rotation);
    }
    return getDirectionXy(this.pos, -this.rotation - 45);
  }

  override getPrevItemXy(): Point {
    return getDirectionXy(this.pos, -this.rotation + 180);
  }

  override getConnections(): {
    entry: Point;
    straight: Point;
    div: Point;
  } {
    return {
      straight: getDirectionXy(this.pos, -this.rotation),
      entry: getDirectionXy(this.pos, -this.rotation + 180),
      div: getDirectionXy(this.pos, -this.rotation - 45),
    };
  }

  override getNeigbordsXy(): Point[] {
    return [
      getDirectionXy(this.pos, -this.rotation),
      getDirectionXy(this.pos, -this.rotation - 45),
      getDirectionXy(this.pos, -this.rotation + 180),
    ];
  }

  static fromJSON(
    data: TrackTurnoutLeftElementDto
  ): TrackTurnoutLeftElement {
    const element = new TrackTurnoutLeftElement(data.x, data.y);
    element.id = data.id;
    element.name = data.name;
    element.layerName = data.layerName;
    element.rotation = data.rotation;
    element.rotationStep = data.rotationStep;
    element.address = data.address;
    element.length = data.length;
    element.turnoutAddress = data.turnoutAddress ?? 0;
    element.turnoutClosedValue = data.turnoutClosedValue;
    element.bg = data.bg;
    element.fg = data.fg;
    return element;
  }

  override toJSON(): TrackTurnoutLeftElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_TURNOUT_LEFT,
      turnoutAddress: this.turnoutAddress,
      turnoutClosedValue: this.turnoutClosedValue,
    };
  }
}
