import { BaseElement } from "./BaseElement";
import { TrackStraightElementView } from "../elements/TrackStraightElementView";
import { EditorElementData } from "../types/EditorTypes";
import { TrackCornerElementView } from "../elements/TrackCornerElementView";
import { TrackEndElementView } from "../elements/TrackEndElementView";
import { TrackCurveElementView } from "../elements/TrackCurveElementView";
import { TrackTurnoutLeftElementView } from "../elements/TrackTurnoutLeftElementView";
import { TrackTurnoutRightElementView } from "../elements/TrackTurnoutRightElementView";
import TrackTurnoutDoubleElementView from "../elements/TrackTurnoutDoubleElementView";
import { TrackTurnoutTwoWayElementView } from "../elements/TrackTurnoutTwoWayElementView";
import { TrackSensorElementView } from "../elements/TrackSensorElementView";
import { ButtonElement } from "../elements/ButtonElement";
import { ClockElement } from "../elements/ClockElement";
import { BlockElementView } from "../elements/BlockElementView";
import { TreeElement } from "../elements/TreeElement";
import { TrackSignalElementView } from "../elements/TrackSignalElementView";
import { AudioButtonElement } from "../elements/AudioButtonElement";
import { RouteButtonElement } from "../elements/RouteButtonElement";
import { TrackCrossingElementView } from "../elements/TrackCrossingElementView";
import { ButtonScriptElement } from "../elements/ButtonScriptElement";
import { LabelElement } from "../elements/LabelElement";
import { TrackDirectionElementView } from "../elements/TrackDirectionElementView";
import { ExtendedRouteButtonElement } from "../elements/ExtendedRouteButtonElement";
import { ELEMENT_TYPES } from "../../../../../common/src/layout/elementTypes";

export class ElementFactory {
  static create(data: EditorElementData): BaseElement {
    switch (data.type) {
      case ELEMENT_TYPES.TRACK_STRAIGHT: {
        return TrackStraightElementView.fromJSON(data)
      }

      case ELEMENT_TYPES.TRACK_DIRECTION: {
        return TrackDirectionElementView.fromJSON(data)
      }

      case ELEMENT_TYPES.TRACK_END: {
        return TrackEndElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_CORNER: {
        return TrackCornerElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_CURVE: {
        return TrackCurveElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_CROSSING: {
        return TrackCrossingElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_TURNOUT_LEFT: {
        return TrackTurnoutLeftElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_TURNOUT_RIGHT: {
        return TrackTurnoutRightElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_TURNOUT_TWO_WAY: {
        return TrackTurnoutTwoWayElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE: {
        return TrackTurnoutDoubleElementView.fromJSON(data);
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
        return TrackSensorElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_SIGNAL2: {
        return TrackSignalElementView.fromJSON(data);
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
        return BlockElementView.fromJSON(data);
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