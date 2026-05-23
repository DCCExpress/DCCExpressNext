#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const filePath = path.join(
  process.cwd(),
  "client/src/components/TrackCanvas.tsx"
);

let source = fs.readFileSync(filePath, "utf8").replaceAll("\r\n", "\n");

function replaceOnce(search, replacement) {
  if (!source.includes(search)) {
    throw new Error(`Expected text was not found: ${search.slice(0, 120)}`);
  }

  source = source.replace(search, replacement);
}

if (!source.includes('import { fastClockStore } from "../services/fastClockStore";')) {
  replaceOnce(
    'import { wsApi } from "../services/wsApi";\n',
    'import { fastClockStore } from "../services/fastClockStore";\nimport { wsApi } from "../services/wsApi";\n'
  );
}

if (!source.includes("syncClockElementsWithFastClock,")) {
  replaceOnce(
    '  stopTrackCanvasInteraction,\n',
    '  stopTrackCanvasInteraction,\n  syncClockElementsWithFastClock,\n'
  );
}

if (!source.includes("fastClockStore.subscribe")) {
  replaceOnce(
    `  useEffect(() => {
    return subscribeCanvasImageCache(() => {
      onInvalidate();
    });
  }, [onInvalidate]);
`,
    `  useEffect(() => {
    return subscribeCanvasImageCache(() => {
      onInvalidate();
    });
  }, [onInvalidate]);

  useEffect(() => {
    void fastClockStore.ensureLoaded();

    return fastClockStore.subscribe(() => {
      invalidate();
    });
  }, []);
`
  );
}

if (!source.includes("syncClockElementsWithFastClock(layout);")) {
  replaceOnce(
    `    //if(turnoutSelectionModeRef.current){
    if (selectedElementRef.current instanceof RouteButtonElementView) {
      setRouteTurnoutsMarked(selectedElementRef.current as RouteButtonElementView);
    }
    //}

    drawScene(
`,
    `    //if(turnoutSelectionModeRef.current){
    if (selectedElementRef.current instanceof RouteButtonElementView) {
      setRouteTurnoutsMarked(selectedElementRef.current as RouteButtonElementView);
    }
    //}

    syncClockElementsWithFastClock(layout);

    drawScene(
`
  );
}

source = source.trimEnd() + "\n";
fs.writeFileSync(filePath, source, "utf8");

console.log("TrackCanvas fast clock wiring completed.");
console.log("Run: npm run build");
