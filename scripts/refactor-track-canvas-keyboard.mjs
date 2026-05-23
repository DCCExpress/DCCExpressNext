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

mustReplace(
  `  getDistance,
  getMidpoint,`,
  `  getDistance,
  getMidpoint,
  handleTrackCanvasKeyDown,`
);

const effectStart = source.indexOf(
  `  useEffect(() => {\n    const handleKeyDown = (ev: KeyboardEvent) => {`
);

if (effectStart === -1) {
  throw new Error("Could not locate TrackCanvas keyboard useEffect block.");
}

const effectOpenBrace = source.indexOf("{", effectStart);

if (effectOpenBrace === -1) {
  throw new Error("Could not locate opening brace for keyboard useEffect.");
}

const effectCloseBrace = findMatchingToken(
  source,
  effectOpenBrace,
  "{",
  "}"
);

if (effectCloseBrace === -1) {
  throw new Error("Could not locate closing brace for keyboard useEffect callback.");
}

const effectEnd = source.indexOf(
  `, []);`,
  effectCloseBrace
);

if (effectEnd === -1) {
  throw new Error("Could not locate end of keyboard useEffect.");
}

const fullEffectEnd = effectEnd + `, []);`.length;

const replacement = `  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleTrackCanvasKeyDown(event, {
        canvasRef,
        layoutRef,
        toolRef,
        editModeRef,
        currentCursorRef,
        selectedElementRef,
        viewRef,
        setCurrentCursor,
        onBeforeLayoutChange,
        onLayoutChange,
        onSelectedElementChange,
        closeSignalAspectPopover,
        persistView,
        invalidate,
      });
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);`;

source =
  source.slice(0, effectStart) +
  replacement +
  source.slice(fullEffectEnd);

source = source.trimEnd() + "\n";

fs.writeFileSync(filePath, source, "utf8");

console.log("TrackCanvas keyboard extraction completed.");
console.log("Run: npm run build");
