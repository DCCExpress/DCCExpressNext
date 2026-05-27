// client/src/components/track-canvas/TrackCanvas.types.ts

import type {
  Dispatch,
  SetStateAction,
} from "react";

import type {
  Loco,
} from "../../../../common/src/types";

import type {
  BaseElementView,
} from "../../models/editor/core/BaseElementView";

import type {
  LayoutView,
} from "../../models/editor/core/LayoutView";

import type {
  AudioListButtonElementView,
} from "../../models/editor/elements/AudioListButtonElementView";

import type {
  TrackSignalElementView,
} from "../../models/editor/elements/TrackSignalElementView";

import type TrackTurnoutDoubleElementView from "../../models/editor/elements/TrackTurnoutDoubleElementView";

import type {
  EditorTool,
} from "../../models/editor/types/EditorTypes";

import type {
  SignalAspectPreviews,
} from "./trackCanvasSignalAspect";

export type TrackCanvasProps = {
  editMode?: boolean;
  tool: EditorTool;
  layout: LayoutView;
  onLayoutChange: Dispatch<SetStateAction<LayoutView>>;
  onBeforeLayoutChange?: () => void;
  selectedElement: BaseElementView | null;
  onSelectedElementChange: (element: BaseElementView | null) => void;
  invalidateCounter: number;
  onInvalidate: () => void;
  fitCounter: number;
  turnoutSelectionMode: boolean;
  setBusy?: (busy: boolean, text?: string) => void;
  locos: Loco[];
};

export type ViewState = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type PanState = {
  isPanning: boolean;
  lastX: number;
  lastY: number;
};

export type DragState = {
  isDraggingElement: boolean;
  elementId: string | null;
  startMouseGridX: number;
  startMouseGridY: number;
  startElementX: number;
  startElementY: number;
  draggedElements: Array<{
    id: string;
    startX: number;
    startY: number;
  }>;
};

export type PointerPanState = {
  activePointerId: number | null;
  isTouchPanning: boolean;
};

export type TouchPoint = {
  x: number;
  y: number;
};

export type PinchState = {
  isPinching: boolean;
  pointer1Id: number | null;
  pointer2Id: number | null;
  startDistance: number;
  startScale: number;
  worldCenterX: number;
  worldCenterY: number;
};

export type CanvasSize = {
  width: number;
  height: number;
};

export type SelectionRect = {
  startGridX: number;
  startGridY: number;
  endGridX: number;
  endGridY: number;
};

export type SelectionState = {
  isSelecting: boolean;
  additive: boolean;
  startGridX: number;
  startGridY: number;
  endGridX: number;
};

export type SignalAspectValue = 1 | 2 | 3 | 4;

export type SignalAspectPopoverState = {
  opened: boolean;
  x: number;
  y: number;
  signal: TrackSignalElementView | null;
  previews: SignalAspectPreviews | null;
};

export type DoubleTurnoutPopoverState = {
  opened: boolean;
  x: number;
  y: number;
  turnout: TrackTurnoutDoubleElementView | null;
};

export type AudioListPopoverState = {
  opened: boolean;
  x: number;
  y: number;
  audioListButton: AudioListButtonElementView | null;
};
