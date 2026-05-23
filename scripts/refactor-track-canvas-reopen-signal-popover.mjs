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
  `  registerTrackCanvasEventListeners,
  saveViewState,`,
  `  registerTrackCanvasEventListeners,
  reopenTrackCanvasSignalAspectPopover,
  saveViewState,`
);

const localReopenFunction = `    const reopenSignalAspectPopover = (
      signal: TrackSignalElementView,
      clientX: number,
      clientY: number
    ) => {
      closeSignalAspectPopover();

      window.setTimeout(() => {
        openSignalAspectPopover(signal, clientX, clientY);
      }, 100);
    };
`;

mustReplace(
  localReopenFunction,
  `    const reopenSignalAspectPopover = (
      signal: TrackSignalElementView,
      clientX: number,
      clientY: number
    ) => {
      reopenTrackCanvasSignalAspectPopover(
        setSignalAspectPopover,
        signal,
        clientX,
        clientY
      );
    };
`
);

source = source.trimEnd() + "\n";

fs.writeFileSync(filePath, source, "utf8");

console.log("TrackCanvas signal popover reopen extraction completed.");
console.log("Run: npm run build");
