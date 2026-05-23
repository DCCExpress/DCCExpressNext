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
  'import { generateId, showErrorMessage, showWarningMessage } from "../helpers";\n',
  'import { isTurnoutElement } from "../models/editor/core/LayoutView";\n',
  'import { TrackTurnoutLeftElementView } from "../models/editor/elements/TrackTurnoutLeftElementView";\n',
  'import { TrackTurnoutRightElementView } from "../models/editor/elements/TrackTurnoutRightElementView";\n',
  'import { ClickableBaseElementView } from "../models/editor/core/ClickableBaseElementView";\n',
  'import { AudioButtonElementView } from "../models/editor/elements/AudioButtonElementView";\n',
  'import { ExtendedRouteButtonElementView } from "../models/editor/elements/ExtendedRouteButtonElementView";\n',
  'import TrackTurnoutDoubleElementView from "../models/editor/elements/TrackTurnoutDoubleElementView";\n',
  'import { TrackTurnoutTwoWayElementView } from "../models/editor/elements/TrackTurnoutTwoWayElementView";\n',
  'import { ELEMENT_TYPES } from "../../../common/src/layout/elementTypes";\n',
];

for (const removal of removals) {
  source = source.replace(removal, "");
}

const trackCanvasImportCleanup = [
  "  applySelectionRect,\n",
  "  clamp,\n",
  "  handleTrackCanvasClickableDown,\n",
  "  handleTrackCanvasClickableUp,\n",
  "  fitLayoutToView,\n",
  "  getAllLayoutElements,\n",
  "  getDistance,\n",
  "  getMidpoint,\n",
  "  getTrackCanvasCursor,\n",
  "  getSelectionRect,\n",
  "  screenToGrid,\n",
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
