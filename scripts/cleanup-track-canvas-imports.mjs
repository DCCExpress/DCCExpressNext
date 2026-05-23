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

const removals = [
  'import { ClickableBaseElementView } from "../models/editor/core/ClickableBaseElementView";\n',
  'import { ExtendedRouteButtonElementView } from "../models/editor/elements/ExtendedRouteButtonElementView";\n',
  'import TrackTurnoutDoubleElementView from "../models/editor/elements/TrackTurnoutDoubleElementView";\n',
  'import { TrackTurnoutTwoWayElementView } from "../models/editor/elements/TrackTurnoutTwoWayElementView";\n',
];

for (const removal of removals) {
  source = source.replace(removal, "");
}

const trackCanvasImportCleanup = [
  "  applySelectionRect,\n",
  "  getTrackCanvasCursor,\n",
  "  type SelectionRect,\n",
];

for (const removal of trackCanvasImportCleanup) {
  source = source.replace(removal, "");
}

source = source.replaceAll("\n\n\n", "\n\n");
source = source.trimEnd() + "\n";

fs.writeFileSync(filePath, source, "utf8");

console.log("TrackCanvas import cleanup completed.");
console.log("Run: npm run build");
