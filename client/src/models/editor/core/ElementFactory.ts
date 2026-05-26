import { BaseElementView } from "./BaseElementView";
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
import { ButtonElementView } from "../elements/ButtonElementView";
import { ClockElementView } from "../elements/ClockElementView";
import { BlockElementView } from "../elements/BlockElementView";
import { TreeElementView } from "../elements/TreeElementView";
import { TrackSignalElementView } from "../elements/TrackSignalElementView";
import { AudioButtonElementView } from "../elements/AudioButtonElementView";
import { AudioListButtonElementView } from "../elements/AudioListButtonElementView";
import { RouteButtonElementView } from "../elements/RouteButtonElementView";
import { TrackCrossingElementView } from "../elements/TrackCrossingElementView";
import { TrackLevelCrossingElementView } from "../elements/TrackLevelCrossingElementView";
import { ButtonScriptElementView } from "../elements/ButtonScriptElementView";
import { LabelElementView } from "../elements/LabelElementView";
import { TrackDirectionElementView } from "../elements/TrackDirectionElementView";
import { ExtendedRouteButtonElementView } from "../elements/ExtendedRouteButtonElementView";
import { ELEMENT_TYPES } from "../../../../../common/src/layout/elementTypes";

export class ElementFactory {
  static create(data: EditorElementData): BaseElementView {
    switch (data.type) {
      case ELEMENT_TYPES.TRACK_STRAIGHT: {
        return TrackStraightElementView.fromJSON(data)
      }

      case ELEMENT_TYPES.TRACK_LEVEL_CROSSING: {
        return TrackLevelCrossingElementView.fromJSON(data);
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
        return ButtonElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.BUTTON_SCRIPT: {
        return ButtonScriptElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.BUTTON_AUDIO: {
        return AudioButtonElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.BUTTON_AUDIO_LIST: {
        return AudioListButtonElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.BUTTON_ROUTE: {
        return RouteButtonElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.BUTTON_ROUTE_EXTENDED: {
        return ExtendedRouteButtonElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.CLOCK: {
        return ClockElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.TRACK_BLOCK: {
        return BlockElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.TREE: {
        return TreeElementView.fromJSON(data);
      }

      case ELEMENT_TYPES.LABEL: {
        return LabelElementView.fromJSON(data);
      }

      default:
        throw new Error(
          `Unsupported element type: ${(data as { type?: string }).type}`
        );
    }
  }

  static createMany(elements: EditorElementData[]): BaseElementView[] {
    return elements.map((e) => this.create(e));
  }
}