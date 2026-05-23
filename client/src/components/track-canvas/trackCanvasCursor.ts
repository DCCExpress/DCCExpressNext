// client/src/components/track-canvas/trackCanvasCursor.ts

import type {
  BaseElementView,
} from "../../models/editor/core/BaseElementView";

import {
  ClickableBaseElementView,
} from "../../models/editor/core/ClickableBaseElementView";

import {
  AudioButtonElementView,
} from "../../models/editor/elements/AudioButtonElementView";

import {
  BlockElementView,
} from "../../models/editor/elements/BlockElementView";

import {
  TrackSignalElementView,
} from "../../models/editor/elements/TrackSignalElementView";

import {
  TrackTurnoutLeftElementView,
} from "../../models/editor/elements/TrackTurnoutLeftElementView";

import {
  TrackTurnoutRightElementView,
} from "../../models/editor/elements/TrackTurnoutRightElementView";

import TrackTurnoutDoubleElementView from "../../models/editor/elements/TrackTurnoutDoubleElementView";

import {
  TrackTurnoutTwoWayElementView,
} from "../../models/editor/elements/TrackTurnoutTwoWayElementView";

import type {
  EditorTool,
} from "../../models/editor/types/EditorTypes";

export function isTrackCanvasPointerElement(
  element: BaseElementView | null
): boolean {
  return (
    element instanceof TrackTurnoutLeftElementView ||
    element instanceof TrackTurnoutRightElementView ||
    element instanceof TrackTurnoutTwoWayElementView ||
    element instanceof TrackTurnoutDoubleElementView ||
    element instanceof TrackSignalElementView ||
    element instanceof ClickableBaseElementView ||
    element instanceof AudioButtonElementView ||
    element instanceof BlockElementView
  );
}

export function getTrackCanvasCursor(
  editMode: boolean,
  tool: EditorTool,
  hoveredElement: BaseElementView | null
): string {
  if (!editMode) {
    return isTrackCanvasPointerElement(hoveredElement)
      ? "pointer"
      : "default";
  }

  if (tool.mode === "draw") {
    return "crosshair";
  }

  return "default";
}
