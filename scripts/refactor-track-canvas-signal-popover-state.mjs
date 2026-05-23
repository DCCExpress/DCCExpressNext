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
    throw new Error(`Expected text was not found: ${search.slice(0, 160)}`);
  }

  source = source.replace(search, replacement);
}

function findMatchingToken(input, openIndex, openToken, closeToken) {
  let depth = 0;
  let inString = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = openIndex; index < input.length; index++) {
    const char = input[index];
    const next = input[index + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
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

    if (char === openToken) {
      depth++;
      continue;
    }

    if (char === closeToken) {
      depth--;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function replaceConstArrowFunction(functionName, replacement) {
  const start = source.indexOf(`  const ${functionName} = (`);

  if (start === -1) {
    throw new Error(`Could not locate ${functionName}.`);
  }

  const openBrace = source.indexOf("{", start);

  if (openBrace === -1) {
    throw new Error(`Could not locate body for ${functionName}.`);
  }

  const closeBrace = findMatchingToken(source, openBrace, "{", "}");

  if (closeBrace === -1) {
    throw new Error(`Could not locate end of ${functionName}.`);
  }

  let end = closeBrace + 1;

  if (source[end] === ";") {
    end++;
  }

  source = source.slice(0, start) + replacement + source.slice(end);
}

mustReplace(
  `  createCursorElement,
  createSignalAspectPreviews,
  drawScene,`,
  `  createCursorElement,
  closeTrackCanvasSignalAspectPopover,
  drawScene,`
);

mustReplace(
  `  saveViewState,
  screenToGrid,`,
  `  openTrackCanvasSignalAspectPopover,
  saveViewState,
  screenToGrid,`
);

replaceConstArrowFunction(
  "openSignalAspectPopover",
  `  const openSignalAspectPopover = (
    signal: TrackSignalElementView,
    clientX: number,
    clientY: number
  ) => {
    openTrackCanvasSignalAspectPopover(
      setSignalAspectPopover,
      signal,
      clientX,
      clientY
    );
  };`
);

replaceConstArrowFunction(
  "closeSignalAspectPopover",
  `  const closeSignalAspectPopover = () => {
    closeTrackCanvasSignalAspectPopover(
      setSignalAspectPopover
    );
  };`
);

source = source.trimEnd() + "\n";

fs.writeFileSync(filePath, source, "utf8");

console.log("TrackCanvas signal popover state extraction completed.");
console.log("Run: npm run build");
