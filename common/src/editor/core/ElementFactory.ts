import { TrackStraightElement, type TrackStraightElementJSON } from "../elements/TrackStraightElement";
import { UnknownElement } from "../elements/UnknownElement";
import { BaseElement } from "./BaseElement";
import type { ElementJSON } from "./types";

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
