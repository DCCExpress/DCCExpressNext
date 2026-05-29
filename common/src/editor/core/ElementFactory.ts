import { TrackStraightElement, type TrackStraightElementJSON } from "../elements/TrackStraightElement.js";
import { UnknownElement } from "../elements/UnknownElement.js";
import { BaseElement } from "./BaseElement.js";
import type { ElementJSON } from "./types.js";

export class ElementFactory {
  static fromJSON(json: ElementJSON): BaseElement {
    switch (json.type) {
      case TrackStraightElement.TYPE:
        return new TrackStraightElement(json as TrackStraightElementJSON);

      default:
        return new UnknownElement(json);
    }
  }
}
