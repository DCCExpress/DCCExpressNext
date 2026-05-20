import { ELEMENT_TYPES } from "../../../../common/src/layout/elementTypes";
import { BaseElementView } from "../../models/editor/core/BaseElementView";
import { AudioButtonElementView } from "../../models/editor/elements/AudioButtonElementView";
import { BlockElementView } from "../../models/editor/elements/BlockElementView";
import { ButtonElementView } from "../../models/editor/elements/ButtonElementView";
import { ButtonScriptElementView } from "../../models/editor/elements/ButtonScriptElementView";
import { ClockElementView } from "../../models/editor/elements/ClockElementView";
import { ExtendedRouteButtonElementView } from "../../models/editor/elements/ExtendedRouteButtonElementView";
import { LabelElementView } from "../../models/editor/elements/LabelElementView";
import { RouteButtonElementView } from "../../models/editor/elements/RouteButtonElementView";
import { TrackCornerElementView } from "../../models/editor/elements/TrackCornerElementView";
import { TrackCrossingElementView } from "../../models/editor/elements/TrackCrossingElementView";
import { TrackCurveElementView } from "../../models/editor/elements/TrackCurveElementView";
import { TrackDirectionElementView } from "../../models/editor/elements/TrackDirectionElementView";
import { TrackEndElementView } from "../../models/editor/elements/TrackEndElementView";
import { TrackSensorElementView } from "../../models/editor/elements/TrackSensorElementView";
import { TrackSignalElementView } from "../../models/editor/elements/TrackSignalElementView";
import { TrackStraightElementView } from "../../models/editor/elements/TrackStraightElementView";
import TrackTurnoutDoubleElementView from "../../models/editor/elements/TrackTurnoutDoubleElementView";
import { TrackTurnoutLeftElementView } from "../../models/editor/elements/TrackTurnoutLeftElementView";
import { TrackTurnoutRightElementView } from "../../models/editor/elements/TrackTurnoutRightElementView";
import { TrackTurnoutTwoWayElementView } from "../../models/editor/elements/TrackTurnoutTwoWayElementView";
import { TreeElementView } from "../../models/editor/elements/TreeElementView";
import type { EditorTool } from "../../models/editor/types/EditorTypes";

const cursorTrackElement = new TrackStraightElementView(0, 0);
const cursorTrackDirectionElement = new TrackDirectionElementView(0, 0);
const cursorTrackEndElement = new TrackEndElementView(0, 0);
const cursorTrackCornerElement = new TrackCornerElementView(0, 0);
const cursorTrackCurveElement = new TrackCurveElementView(0, 0);
const cursorTrackTurnoutLeftElement = new TrackTurnoutLeftElementView(0, 0);
const cursorTrackTurnoutRightElement = new TrackTurnoutRightElementView(0, 0);
const cursorTrackTurnoutTwoWayElement = new TrackTurnoutTwoWayElementView(0, 0);
const cursorTrackTurnoutDoubleElement = new TrackTurnoutDoubleElementView(0, 0);
const cursorTrackSensorElement = new TrackSensorElementView(0, 0);

const cursorTrackSignal2Element = new TrackSignalElementView(0, 0);
cursorTrackSignal2Element.aspect = 2;

const cursorTrackSignal3Element = new TrackSignalElementView(0, 0);
cursorTrackSignal3Element.aspect = 3;

const cursorTrackSignal4Element = new TrackSignalElementView(0, 0);
cursorTrackSignal4Element.aspect = 4;

const cursorTrackCrossingElement = new TrackCrossingElementView(0, 0);
const cursorButtonElement = new ButtonElementView(0, 0);
const cursorButtonScriptElement = new ButtonScriptElementView(0, 0);
const cursorRouteButtonElement = new RouteButtonElementView(0, 0);
const cursorExtendedRouteButtonElement = new ExtendedRouteButtonElementView(0, 0);
const cursorAudioButtonElement = new AudioButtonElementView(0, 0);
const cursorClockElement = new ClockElementView(0, 0);
const cursorTreeElement = new TreeElementView(0, 0);
const cursorBlockElement = new BlockElementView(0, 0);
const cursorLabelElement = new LabelElementView(0, 0);

export function createCursorElement(
  tool: EditorTool
): BaseElementView | null {
  switch (tool.elementType) {
    case ELEMENT_TYPES.TRACK_STRAIGHT:
      return cursorTrackElement;

    case ELEMENT_TYPES.TRACK_DIRECTION:
      return cursorTrackDirectionElement;

    case ELEMENT_TYPES.TRACK_END:
      return cursorTrackEndElement;

    case ELEMENT_TYPES.TRACK_CORNER:
      return cursorTrackCornerElement;

    case ELEMENT_TYPES.TRACK_CURVE:
      return cursorTrackCurveElement;

    case ELEMENT_TYPES.TRACK_CROSSING:
      return cursorTrackCrossingElement;

    case ELEMENT_TYPES.TRACK_TURNOUT_LEFT:
      return cursorTrackTurnoutLeftElement;

    case ELEMENT_TYPES.TRACK_TURNOUT_RIGHT:
      return cursorTrackTurnoutRightElement;

    case ELEMENT_TYPES.TRACK_TURNOUT_TWO_WAY:
      return cursorTrackTurnoutTwoWayElement;

    case ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE:
      return cursorTrackTurnoutDoubleElement;

    case ELEMENT_TYPES.TRACK_SENSOR:
      return cursorTrackSensorElement;

    case ELEMENT_TYPES.BUTTON:
      return cursorButtonElement;

    case ELEMENT_TYPES.BUTTON_SCRIPT:
      return cursorButtonScriptElement;

    case ELEMENT_TYPES.BUTTON_AUDIO:
      return cursorAudioButtonElement;

    case ELEMENT_TYPES.BUTTON_ROUTE:
      return cursorRouteButtonElement;

    case ELEMENT_TYPES.BUTTON_ROUTE_EXTENDED:
      return cursorExtendedRouteButtonElement;

    case ELEMENT_TYPES.CLOCK:
      return cursorClockElement;

    case ELEMENT_TYPES.TREE:
      return cursorTreeElement;

    case ELEMENT_TYPES.TRACK_BLOCK:
      return cursorBlockElement;

    case ELEMENT_TYPES.TRACK_SIGNAL2:
      return cursorTrackSignal2Element;

    case ELEMENT_TYPES.TRACK_SIGNAL3:
      return cursorTrackSignal3Element;

    case ELEMENT_TYPES.TRACK_SIGNAL4:
      return cursorTrackSignal4Element;

    case ELEMENT_TYPES.LABEL:
      return cursorLabelElement;

    default:
      return null;
  }
}
