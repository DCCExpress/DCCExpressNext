#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const filePath = path.join(root, "client/src/components/TrackCanvas.tsx");

let source = fs.readFileSync(filePath, "utf8");

// Windows checkouts may use CRLF line endings. The codemod works on LF to keep
// block matching deterministic, then writes LF back. Prettier/formatting can
// normalize it later if needed.
source = source.replaceAll("\r\n", "\n");

function replaceOnce(input, search, replacement) {
  if (!input.includes(search)) {
    throw new Error(`Expected block was not found:\n${search.slice(0, 160)}`);
  }

  return input.replace(search, replacement);
}

function removeBlock(input, startNeedle, endNeedle, label) {
  const start = input.indexOf(startNeedle);
  const end = input.indexOf(endNeedle, start + startNeedle.length);

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Could not locate ${label}.`);
  }

  return input.slice(0, start) + input.slice(end);
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

source = removeBlock(
  source,
  "type TrackCanvasProps = {",
  "export default function TrackCanvas(",
  "TrackCanvas local type/helper block"
);

source = "export default function TrackCanvas(" + source.split("export default function TrackCanvas(").slice(1).join("export default function TrackCanvas(");
source = source.replace(
  `import { Box, Group, Popover, Stack, useMantineColorScheme } from "@mantine/core";`,
  `import { Box, Group, Popover, Stack, useMantineColorScheme } from "@mantine/core";`
);

// The previous block removal starts at the first type definition and keeps the
// component, but we need to prepend imports that were before the type block.
const importEndMarker = `} from "./track-canvas";`;
const originalWithImports = fs.readFileSync(filePath, "utf8").replaceAll("\r\n", "\n");
let imports = originalWithImports.slice(0, originalWithImports.indexOf("type TrackCanvasProps = {"));
imports = imports.replace(
  'import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";',
  'import { useEffect, useRef, useState } from "react";'
);
imports = imports.replace(
  'import { DrawOptions, EditorTool } from "../models/editor/types/EditorTypes";',
  'import { EditorTool } from "../models/editor/types/EditorTypes";'
);
imports = imports.replace(
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

source = imports + source;

source = removeBlock(
  source,
  "function drawScene(\n",
  "function screenToGrid(\n",
  "draw helper block"
);

source = removeBlock(
  source,
  "function screenToGrid(\n",
  "function drawSelectionRect(\n",
  "geometry helper block"
);

source = removeBlock(
  source,
  "function drawSelectionRect(\n",
  "function getLayoutBounds(\n",
  "selection helper block"
);

source = removeBlock(
  source,
  "function getLayoutBounds(\n",
  "function getDistance(\n",
  "layout bounds helper block"
);

const finalDistanceStart = source.indexOf("function getDistance(\n");

if (finalDistanceStart === -1) {
  throw new Error("Could not locate final touch geometry helper block.");
}

source = source.slice(0, finalDistanceStart).trimEnd() + "\n";

source = source.replace(
  `    const green = new TrackSignalElementView(0, 0);
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
`,
  `    const previews =
      createSignalAspectPreviews(signal);
`
);

source = source.replace(
  `      previews: {
        green: green,
        red: red,
        yellow: yellow,
        white: white,
      }`,
  `      previews`
);

fs.writeFileSync(filePath, source, "utf8");

console.log("TrackCanvas helper extraction codemod completed.");
console.log("Run: npm run build");
