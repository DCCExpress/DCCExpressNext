import { ELEMENT_TYPES } from "../../../../common/src/layout/elementTypes";
import type { BaseElement } from "../../models/editor/core/BaseElement";
import { TrackSignalElementView } from "../../models/editor/elements/TrackSignalElementView";
import { TrackTurnoutLeftElementView } from "../../models/editor/elements/TrackTurnoutLeftElementView";
import { TrackTurnoutRightElementView } from "../../models/editor/elements/TrackTurnoutRightElementView";

export type SignalPreviewColor = 1 | 2 | 3 | 4;

function createFallbackTurnoutPreview(): BaseElement {
  const turnout = new TrackTurnoutLeftElementView(0, 0);
  turnout.turnoutClosed = turnout.turnoutClosedValue;
  return turnout;
}

export function createTurnoutPreview(
  selectedElement: BaseElement,
  closed: boolean
): BaseElement {
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

export function createSignalPreview(
  selectedElement: BaseElement,
  color: SignalPreviewColor
): BaseElement {
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
