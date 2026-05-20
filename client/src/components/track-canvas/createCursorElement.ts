import { ELEMENT_TYPES } from "../../../../common/src/layout/elementTypes";
import { BaseElement } from "../../models/editor/core/BaseElement";
import { AudioButtonElement } from "../../models/editor/elements/AudioButtonElement";
import { BlockElementView } from "../../models/editor/elements/BlockElementView";
import { ButtonElement } from "../../models/editor/elements/ButtonElement";
import { ButtonScriptElement } from "../../models/editor/elements/ButtonScriptElement";
import { ClockElement } from "../../models/editor/elements/ClockElement";
import { ExtendedRouteButtonElement } from "../../models/editor/elements/ExtendedRouteButtonElement";
import { LabelElement } from "../../models/editor/elements/LabelElement";
import { RouteButtonElement } from "../../models/editor/elements/RouteButtonElement";
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
import { TreeElement } from "../../models/editor/elements/TreeElement";
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
const cursorButtonElement = new ButtonElement(0, 0);
const cursorButtonScriptElement = new ButtonScriptElement(0, 0);
const cursorRouteButtonElement = new RouteButtonElement(0, 0);
const cursorExtendedRouteButtonElement = new ExtendedRouteButtonElement(0, 0);
const cursorAudioButtonElement = new AudioButtonElement(0, 0);
const cursorClockElement = new ClockElement(0, 0);
const cursorTreeElement = new TreeElement(0, 0);
const cursorBlockElement = new BlockElementView(0, 0);
const cursorLabelElement = new LabelElement(0, 0);

export function createCursorElement(
  tool: EditorTool
): BaseElement | null {
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
