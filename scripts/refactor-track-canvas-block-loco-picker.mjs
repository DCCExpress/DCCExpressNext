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

function findSelfClosingJsxEnd(input, startIndex) {
  let inString = null;
  let escaped = false;
  let inJsExpression = false;
  let braceDepth = 0;

  for (let index = startIndex; index < input.length; index++) {
    const char = input[index];
    const next = input[index + 1];

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

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }

    if (char === "{") {
      inJsExpression = true;
      braceDepth++;
      continue;
    }

    if (char === "}") {
      if (braceDepth > 0) {
        braceDepth--;
      }

      if (braceDepth === 0) {
        inJsExpression = false;
      }

      continue;
    }

    if (!inJsExpression && char === "/" && next === ">") {
      return index + 2;
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

const locoPickerEnd = findSelfClosingJsxEnd(
  source,
  locoPickerStart
);

if (locoPickerEnd === -1) {
  throw new Error("Could not locate end of self-closing LocoPicker JSX block.");
}

source =
  source.slice(0, locoPickerStart) +
  `      <TrackCanvasBlockLocoPicker\n        opened={locoPickerOpen}\n        locos={locos}\n        selectedBlock={selectedBlock}\n        onClose={() => setLocoPickerOpen(false)}\n      />` +
  source.slice(locoPickerEnd);

source = source.trimEnd() + "\n";

fs.writeFileSync(filePath, source, "utf8");

console.log("TrackCanvas block loco picker extraction completed.");
console.log("Run: npm run build");
