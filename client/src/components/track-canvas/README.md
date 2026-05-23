# TrackCanvas helper modules

This folder contains the extracted helper modules for `TrackCanvas.tsx`.

## Core

- `TrackCanvas.types.ts` contains shared types used by the canvas and helpers.
- `createCursorElement.ts` creates the draw-mode cursor element for the selected editor tool.

## Rendering and geometry

- `trackCanvasDraw.ts` contains canvas drawing functions.
- `trackCanvasGeometry.ts` contains coordinate, distance, midpoint and clamp helpers.
- `trackCanvasLayoutBounds.ts` contains layout bounds and fit-to-view logic.
- `trackCanvasSelection.ts` contains selection rectangle helpers.
- `trackCanvasViewStorage.ts` loads and saves the canvas view state.

## Interaction

- `trackCanvasEventListeners.ts` registers and unregisters canvas DOM event listeners.
- `trackCanvasKeyboard.ts` handles keyboard shortcuts.
- `trackCanvasMouseDown.ts` handles mouse down logic.
- `trackCanvasMouseMove.ts` handles mouse move, pan, drag and hover logic.
- `trackCanvasWheel.ts` handles wheel zoom.
- `trackCanvasInteractionStop.ts` finalizes selection, drag and pan interactions.
- `trackCanvasClickableActions.ts` dispatches clickable element actions.
- `trackCanvasCursor.ts` decides the canvas cursor style.

## Route and signal helpers

- `trackCanvasRouteActions.ts` executes route button actions.
- `trackCanvasSignalAspect.ts` creates signal aspect preview elements.
- `trackCanvasSignalPopoverState.ts` opens, closes and reopens the signal aspect popover.

## UI components

- `TrackCanvasSignalAspectPopover.tsx` renders the signal aspect popover.
- `TrackCanvasBlockLocoPicker.tsx` renders the block locomotive picker.

Keep this folder grouped by responsibility. Avoid creating tiny one-off helpers unless they remove a clear responsibility from `TrackCanvas.tsx`.
