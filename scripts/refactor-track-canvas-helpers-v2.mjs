#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const filePath = path.join(
  process.cwd(),
  "client/src/components/TrackCanvas.tsx"
);

let source = fs
  .readFileSync(filePath, "utf8")
  .replaceAll("\r\n", "\n");

function mustReplace(search, replacement) {
  if (!source.includes(search)) {
    throw new Error(`Expected text was not found: ${search.slice(0, 120)}`);
  }

  source = source.replace(search, replacement);
}

mustReplace(
  'import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";',
  'import { useEffect, useRef, useState } from "react";'
);

mustReplace(
  'import { isTurnoutElement, LayoutView } from "../models/editor/core/LayoutView";',
  'import { isTurnoutElement } from "../models/editor/core/LayoutView";'
);

mustReplace(
  'import { DrawOptions, EditorTool } from "../models/editor/types/EditorTypes";',
  'import { EditorTool } from "../models/editor/types/EditorTypes";'
);

mustReplace(
  'import { Loco } from "../../../common/src/types";\n',
  ''
);

mustReplace(
  'import { EditorSettings, useEditorSettings } from "../context/EditorSettingsContext";',
  'import { useEditorSettings } from "../context/EditorSettingsContext";'
);

mustReplace(
  'import { createCursorElement } from "./track-canvas/createCursorElement";',
  `import {
  applySelectionRect,
  clamp,
  createCursorElement,
  createSignalAspectPreviews,
  drawScene,
  fitLayoutToView,
  getAllLayoutElements,
  getDistance,
  getMidpoint,
  getSelectionRect,
  loadSavedViewState,
  saveViewState,
  screenToGrid,
  type CanvasSize,
  type DragState,
  type PanState,
  type PinchState,
  type PointerPanState,
  type SelectionRect,
  type SelectionState,
  type SignalAspectPopoverState,
  type TouchPoint,
  type TrackCanvasProps,
  type ViewState,
} from "./track-canvas";`
);

const typeStart = source.indexOf("type TrackCanvasProps = {");
const componentStart = source.indexOf("export default function TrackCanvas(", typeStart);

if (typeStart === -1 || componentStart === -1 || componentStart <= typeStart) {
  throw new Error("Could not locate TrackCanvas local type/helper block.");
}

source = source.slice(0, typeStart) + source.slice(componentStart);

const signalPreviewBlock = `    const green = new TrackSignalElementView(0, 0);
    green.aspect = signal.aspect;
    green.setGreen();

    const red = new TrackSignalElementView(0, 0);
    red.aspect = signal.aspect;
    red.setRed();

    const yellow = new TrackSignalElementView(0, 0);
    yellow.aspect = signal.aspect;
    yellow.setYellow();

    const white = new TrackSignalElementView(0, 0);
    white.aspect = signal.aspect;
    white.setWhite();
`;

mustReplace(
  signalPreviewBlock,
  `    const previews =
      createSignalAspectPreviews(signal);
`
);

mustReplace(
  `      previews: {
        green: green,
        red: red,
        yellow: yellow,
        white: white,
      }`,
  `      previews`
);

const helperTailStart = source.indexOf("function drawScene(\n");

if (helperTailStart === -1) {
  throw new Error("Could not locate TrackCanvas helper tail starting with drawScene.");
}

source = source.slice(0, helperTailStart).trimEnd() + "\n";

fs.writeFileSync(filePath, source, "utf8");

console.log("TrackCanvas helper extraction v2 completed.");
console.log("Run: npm run build");
