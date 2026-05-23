#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const filePath = path.join(root, "client/src/components/TrackCanvas.tsx");

const originalSource = fs
  .readFileSync(filePath, "utf8")
  .replaceAll("\r\n", "\n");

let source = originalSource;

function replaceOnce(input, search, replacement) {
  if (!input.includes(search)) {
    throw new Error(`Expected block was not found:\n${search.slice(0, 160)}`);
  }

  return input.replace(search, replacement);
}

function findFunctionStart(input, functionName) {
  const pattern = new RegExp(`function\\s+${functionName}\\s*\\(`, "m");
  const match = pattern.exec(input);
  return match?.index ?? -1;
}

function findMatchingBrace(input, openBraceIndex) {
  let depth = 0;
  let inString = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = openBraceIndex; index < input.length; index++) {
    const char = input[index];
    const next = input[index + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index++;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === inString) {
        inString = null;
      }

      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      index++;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      index++;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }

    if (char === "{") {
      depth++;
      continue;
    }

    if (char === "}") {
      depth--;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function removeFunction(input, functionName) {
  const start = findFunctionStart(input, functionName);

  if (start === -1) {
    throw new Error(`Could not locate function ${functionName}.`);
  }

  const openBrace = input.indexOf("{", start);

  if (openBrace === -1) {
    throw new Error(`Could not locate opening brace for ${functionName}.`);
  }

  const closeBrace = findMatchingBrace(input, openBrace);

  if (closeBrace === -1) {
    throw new Error(`Could not locate closing brace for ${functionName}.`);
  }

  let end = closeBrace + 1;

  while (input[end] === "\n") {
    end++;
  }

  return input.slice(0, start) + input.slice(end);
}

function removeLocalTypeBlock(input) {
  const start = input.indexOf("type TrackCanvasProps = {");
  const end = input.indexOf("export default function TrackCanvas(", start);

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not locate TrackCanvas local type/helper block.");
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

source = removeLocalTypeBlock(source);

const helperFunctions = [
  "drawScene",
  "drawBackground",
  "drawGrid",
  "drawInfo",
  "screenToGrid",
  "clamp",
  "drawSelectionRect",
  "normalizeSelectionRect",
  "getSelectionRect",
  "getAllLayoutElements",
  "applySelectionRect",
  "getLayoutBounds",
  "fitLayoutToView",
  "getDistance",
  "getMidpoint",
];

for (const functionName of helperFunctions) {
  source = removeFunction(source, functionName);
}

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

source = source.trimEnd() + "\n";

fs.writeFileSync(filePath, source, "utf8");

console.log("TrackCanvas helper extraction codemod completed.");
console.log("Run: npm run build");
