#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const filePath = path.join(root, "client/src/components/TrackCanvas.tsx");

let source = fs.readFileSync(filePath, "utf8");

function replaceOnce(input, search, replacement) {
  if (!input.includes(search)) {
    throw new Error(`Expected block was not found:\n${search.slice(0, 160)}`);
  }

  return input.replace(search, replacement);
}

source = replaceOnce(
  source,
  'import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";',
  'import { useEffect, useRef, useState } from "react";'
);

source = replaceOnce(
  source,
  'import { DrawOptions, EditorTool } from "../models/editor/types/EditorTypes";',
  'import { EditorTool } from "../models/editor/types/EditorTypes";'
);

source = replaceOnce(
  source,
  'import { createCursorElement } from "./track-canvas/createCursorElement";',
  `import {\n  applySelectionRect,\n  clamp,\n  createCursorElement,\n  createSignalAspectPreviews,\n  drawScene,\n  fitLayoutToView,\n  getAllLayoutElements,\n  getDistance,\n  getMidpoint,\n  getSelectionRect,\n  loadSavedViewState,\n  saveViewState,\n  screenToGrid,\n  type CanvasSize,\n  type DragState,\n  type PanState,\n  type PinchState,\n  type PointerPanState,\n  type SelectionRect,\n  type SelectionState,\n  type SignalAspectPopoverState,\n  type TouchPoint,\n  type TrackCanvasProps,\n  type ViewState,\n} from "./track-canvas";`
);

const typesStart = source.indexOf("type TrackCanvasProps = {");
const typesEnd = source.indexOf("export default function TrackCanvas(");

if (typesStart === -1 || typesEnd === -1 || typesEnd <= typesStart) {
  throw new Error("Could not locate TrackCanvas local type/helper block.");
}

source = source.slice(0, typesStart) + source.slice(typesEnd);

const drawStart = source.indexOf("function drawScene(\n");
const screenToGridStart = source.indexOf("function screenToGrid(\n");
const selectionStart = source.indexOf("function drawSelectionRect(\n");
const layoutBoundsStart = source.indexOf("function getLayoutBounds(\n");
const distanceStart = source.indexOf("function getDistance(\n");

if (drawStart === -1 || screenToGridStart === -1 || selectionStart === -1 || layoutBoundsStart === -1 || distanceStart === -1) {
  throw new Error("Could not locate one or more TrackCanvas helper blocks.");
}

// Remove drawing helpers while keeping geometry/selection/layout helpers for the next codemod step if desired.
source = source.slice(0, drawStart) + source.slice(screenToGridStart);

// Remove geometry helpers that are now imported.
const clampStart = source.indexOf("function clamp(value: number, min: number, max: number): number {");
const afterClamp = source.indexOf("function drawSelectionRect(\n");

if (clampStart === -1 || afterClamp === -1 || afterClamp <= clampStart) {
  throw new Error("Could not locate geometry helper block after draw helper removal.");
}

source = source.slice(0, screenToGridStart) + source.slice(afterClamp);

// Remove selection helpers through applySelectionRect.
const getLayoutBoundsIndex = source.indexOf("function getLayoutBounds(\n");

if (selectionStart === -1 || getLayoutBoundsIndex === -1 || getLayoutBoundsIndex <= selectionStart) {
  throw new Error("Could not locate selection helper block.");
}

source = source.slice(0, selectionStart) + source.slice(getLayoutBoundsIndex);

// Remove layout bounds helpers through fitLayoutToView.
const distanceIndex = source.indexOf("function getDistance(\n");

if (layoutBoundsStart === -1 || distanceIndex === -1 || distanceIndex <= layoutBoundsStart) {
  throw new Error("Could not locate layout bounds helper block.");
}

source = source.slice(0, layoutBoundsStart) + source.slice(distanceIndex);

// Remove touch geometry helpers at the end of the file.
const distanceIndexAfter = source.indexOf("function getDistance(\n");

if (distanceIndexAfter === -1) {
  throw new Error("Could not locate final touch geometry helper block.");
}

source = source.slice(0, distanceIndexAfter).trimEnd() + "\n";

source = source.replace(
  `    const green = new TrackSignalElementView(0, 0);\n    green.aspect = signal.aspect;\n    green.setGreen();\n\n    const red = new TrackSignalElementView(0, 0);\n    red.aspect = signal.aspect;\n    red.setRed();\n\n    const yellow = new TrackSignalElementView(0, 0);\n    yellow.aspect = signal.aspect;\n    yellow.setYellow();\n\n    const white = new TrackSignalElementView(0, 0);\n    white.aspect = signal.aspect;\n    white.setWhite();\n`,
  `    const previews =\n      createSignalAspectPreviews(signal);\n`
);

source = source.replace(
  `      previews: {\n        green: green,\n        red: red,\n        yellow: yellow,\n        white: white,\n      }`,
  `      previews`
);

fs.writeFileSync(filePath, source, "utf8");

console.log("TrackCanvas helper extraction codemod completed.");
console.log("Run: npm run build");
