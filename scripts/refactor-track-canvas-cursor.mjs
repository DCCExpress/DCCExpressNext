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

mustReplace(
  `  getDistance,
  getMidpoint,`,
  `  getDistance,
  getMidpoint,
  getTrackCanvasCursor,`
);

const cursorBlock = `      if (!editModeRef.current) {
        if (hoveredElement instanceof TrackTurnoutLeftElementView ||
          hoveredElement instanceof TrackTurnoutRightElementView ||
          hoveredElement instanceof TrackTurnoutTwoWayElementView ||
          hoveredElement instanceof TrackTurnoutDoubleElementView ||
          hoveredElement instanceof TrackSignalElementView ||
          hoveredElement instanceof ClickableBaseElementView ||
          hoveredElement instanceof AudioButtonElementView ||
          hoveredElement instanceof BlockElementView

        ) {
          canvas.style.cursor = "pointer";
        } else {
          canvas.style.cursor = "default";
        }

      } else if (currentTool.mode === "draw") {
        canvas.style.cursor = "crosshair";
      } else {
        canvas.style.cursor = "default";
      }`;

mustReplace(
  cursorBlock,
  `      canvas.style.cursor = getTrackCanvasCursor(
        editModeRef.current,
        currentTool,
        hoveredElement
      );`
);

source = source.trimEnd() + "\n";

fs.writeFileSync(filePath, source, "utf8");

console.log("TrackCanvas cursor helper extraction completed.");
console.log("Run: npm run build");
