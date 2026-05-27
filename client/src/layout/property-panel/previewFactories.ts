import { ELEMENT_TYPES } from "../../../../common/src/layout/elementTypes";
import type { BaseElementView } from "../../models/editor/core/BaseElementView";
import { TrackSignalElementView } from "../../models/editor/elements/TrackSignalElementView";
import TrackTurnoutDoubleElementView from "../../models/editor/elements/TrackTurnoutDoubleElementView";
import { TrackTurnoutLeftElementView } from "../../models/editor/elements/TrackTurnoutLeftElementView";
import { TrackTurnoutRightElementView } from "../../models/editor/elements/TrackTurnoutRightElementView";

export type SignalPreviewColor = 1 | 2 | 3 | 4;

function createFallbackTurnoutPreview(): BaseElementView {
  const turnout = new TrackTurnoutLeftElementView(0, 0);
  turnout.turnoutClosed = turnout.turnoutClosedValue;
  return turnout;
}

export function createTurnoutPreview(
  selectedElement: BaseElementView,
  closed: boolean
): BaseElementView {
  if (selectedElement.type === ELEMENT_TYPES.TRACK_TURNOUT_LEFT) {
    const turnout = new TrackTurnoutLeftElementView(0, 0);
    turnout.rotation = selectedElement.rotation;
    turnout.turnoutClosed = closed === turnout.turnoutClosedValue;
    return turnout;
  }

  if (selectedElement.type === ELEMENT_TYPES.TRACK_TURNOUT_RIGHT) {
    const turnout = new TrackTurnoutRightElementView(0, 0);
    turnout.rotation = selectedElement.rotation;
    turnout.turnoutClosed = closed === turnout.turnoutClosedValue;
    return turnout;
  }

  return createFallbackTurnoutPreview();
}

export function createDoubleTurnoutPreview(
  selectedElement: TrackTurnoutDoubleElementView,
  firstClosed: boolean,
  secondClosed: boolean
): BaseElementView {
  const turnout = new TrackTurnoutDoubleElementView(0, 0);

  turnout.rotation = selectedElement.rotation;
  turnout.turnout1Address = selectedElement.turnout1Address;
  turnout.turnout2Address = selectedElement.turnout2Address;
  turnout.turnout1ClosedValue = selectedElement.turnout1ClosedValue;
  turnout.turnout2ClosedValue = selectedElement.turnout2ClosedValue;

  turnout.turnout1Closed = firstClosed
    ? turnout.turnout1ClosedValue
    : !turnout.turnout1ClosedValue;

  turnout.turnout2Closed = secondClosed
    ? turnout.turnout2ClosedValue
    : !turnout.turnout2ClosedValue;

  return turnout;
}

export function createSignalPreview(
  selectedElement: BaseElementView,
  color: SignalPreviewColor
): BaseElementView {
  if (selectedElement.type !== ELEMENT_TYPES.TRACK_SIGNAL2) {
    return createFallbackTurnoutPreview();
  }

  const signal = new TrackSignalElementView(0, 0);
  signal.aspect = (selectedElement as TrackSignalElementView).aspect;
  signal.rotation = 90;

  switch (color) {
    case 1:
      signal.setGreen();
      break;
    case 2:
      signal.setRed();
      break;
    case 3:
      signal.setYellow();
      break;
    case 4:
      signal.setWhite();
      break;
  }

  return signal;
}
