import { BaseElement } from "./BaseElement";
import { TrackElement } from "../elements/TrackElement";
import { EditorElementData, ELEMENT_TYPES } from "../types/EditorTypes";
import { TrackCornerElement } from "../elements/TrackCornerElement";
import { TrackEndElement } from "../elements/TrackEndElement";
import { TrackCurveElement } from "../elements/TrackCurveElement";
import { TrackTurnoutLeftElement } from "../elements/TrackTurnoutLeftElement";
import { TrackTurnoutRightElement } from "../elements/TrackTurnoutRightElement";
import TrackTurnoutDoubleElement from "../elements/TrackTurnoutDoubleElement";
import { TrackTurnoutTwoWayElement } from "../elements/TrackTurnoutTwoWayElement";
import { TrackSensorElement } from "../elements/TrackSensorElement";
import { ButtonElement } from "../elements/ButtonElement";
import { ClockElement } from "../elements/ClockElement";
import { BlockElement } from "../elements/BlockElement";
import { TreeElement } from "../elements/TreeElement";
import { TrackSignalElement } from "../elements/TrackSignalElement";
import { AudioButtonElement } from "../elements/AudioButtonElement";
import { RouteButtonElement } from "../elements/RouteButtonElement";
import { TrackCrossingElement } from "../elements/TrackCrossingElement";
import { ButtonScriptElement } from "../elements/ButtonScriptElement";
import ca from "zod/v4/locales/ca.cjs";
import { LabelElement } from "../elements/LabelElement";
import { TrackDirectionElement } from "../elements/TrackDirectionElement";
import { ExtendedRouteButtonElement } from "../elements/ExtendedRouteButtonElement";

export class ElementFactory {
  static create(data: EditorElementData): BaseElement {
    switch (data.type) {
      case ELEMENT_TYPES.TRACK: {
        return TrackElement.fromJSON(data)
      }

      case ELEMENT_TYPES.TRACK_DIRECTION: {
        return TrackDirectionElement.fromJSON(data)
      }

      case ELEMENT_TYPES.TRACK_END: {
        return TrackEndElement.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_CORNER: {
        return TrackCornerElement.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_CURVE: {
        return TrackCurveElement.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_CROSSING: {
        return TrackCrossingElement.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_TURNOUT_LEFT: {
        return TrackTurnoutLeftElement.formJSON(data);
      }

      case ELEMENT_TYPES.TRACK_TURNOUT_RIGHT: {
        return TrackTurnoutRightElement.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_TURNOUT_TWO_WAY: {
        return TrackTurnoutTwoWayElement.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE: {
        return TrackTurnoutDoubleElement.fromJSON(data);
      }


      // case ELEMENT_TYPES.TRACK_TURNOUT_THREE_WAY: {
      //   const td = new TrackTurnoutThreeWayElement(data.x, data.y);
      //   td.id = data.id;
      //   td.rotation = data.rotation;
      //   td.address = data.address;
      //   td.turnout1Address = data.turnout1Address;
      //   td.turnout2Address = data.turnout2Address;
      //   return td;
      // }

      case ELEMENT_TYPES.TRACK_SENSOR: {
        return TrackSensorElement.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_SIGNAL2: {
        return TrackSignalElement.fromJSON(data);
      }


      case ELEMENT_TYPES.BUTTON: {
        return ButtonElement.fromJSON(data);
      }

      case ELEMENT_TYPES.BUTTON_SCRIPT: {
        return ButtonScriptElement.fromJSON(data);
      }

      case ELEMENT_TYPES.BUTTON_AUDIO: {
        return AudioButtonElement.fromJSON(data);
      }

      case ELEMENT_TYPES.BUTTON_ROUTE: {
        return RouteButtonElement.fromJSON(data);
      }

      case ELEMENT_TYPES.BUTTON_ROUTE_EXTENDED: {
        return ExtendedRouteButtonElement.fromJSON(data);
      }
      
      case ELEMENT_TYPES.CLOCK: {
        return ClockElement.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_BLOCK: {
        return BlockElement.fromJSON(data);
      }

      case ELEMENT_TYPES.TREE: {
        return TreeElement.fromJSON(data);
      }

      case ELEMENT_TYPES.LABEL: {
        return LabelElement.fromJSON(data);
      }

      default:
        throw new Error(
          `Unsupported element type: ${(data as { type?: string }).type}`
        );
    }
  }

  static createMany(elements: EditorElementData[]): BaseElement[] {
    return elements.map((e) => this.create(e));
  }
}