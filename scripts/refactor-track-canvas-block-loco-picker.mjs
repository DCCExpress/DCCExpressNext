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

function findMatchingJsxTagEnd(input, startIndex, tagName) {
  const openTag = `<${tagName}`;
  const closeTag = `</${tagName}>`;
  let depth = 0;
  let index = startIndex;

  while (index < input.length) {
    const nextOpen = input.indexOf(openTag, index);
    const nextClose = input.indexOf(closeTag, index);

    if (nextClose === -1) {
      return -1;
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      index = nextOpen + openTag.length;
      continue;
    }

    depth--;
    index = nextClose + closeTag.length;

    if (depth === 0) {
      return index;
    }
  }

  return -1;
}

mustReplace(
  'import LocoPicker from "./loco/LocoPicker";\n',
  ''
);

mustReplace(
  `  TrackCanvasSignalAspectPopover,
  executeExtendedRouteButton,`,
  `  TrackCanvasBlockLocoPicker,
  TrackCanvasSignalAspectPopover,
  executeExtendedRouteButton,`
);

const locoPickerStart = source.indexOf(
  `      <LocoPicker\n        opened={locoPickerOpen}`
);

if (locoPickerStart === -1) {
  throw new Error("Could not locate LocoPicker JSX block.");
}

const locoPickerEnd = findMatchingJsxTagEnd(
  source,
  locoPickerStart,
  "LocoPicker"
);

if (locoPickerEnd === -1) {
  throw new Error("Could not locate end of LocoPicker JSX block.");
}

source =
  source.slice(0, locoPickerStart) +
  `      <TrackCanvasBlockLocoPicker\n        opened={locoPickerOpen}\n        locos={locos}\n        selectedBlock={selectedBlock}\n        onClose={() => setLocoPickerOpen(false)}\n      />` +
  source.slice(locoPickerEnd);

source = source.trimEnd() + "\n";

fs.writeFileSync(filePath, source, "utf8");

console.log("TrackCanvas block loco picker extraction completed.");
console.log("Run: npm run build");
