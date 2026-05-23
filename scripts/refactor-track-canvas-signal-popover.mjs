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
  const closeTag = `</${tagName}>`;
  let depth = 0;
  let index = startIndex;

  const isExactOpeningTagAt = (position) => {
    const token = `<${tagName}`;

    if (!input.startsWith(token, position)) {
      return false;
    }

    const next = input[position + token.length];

    return (
      next === " " ||
      next === "\n" ||
      next === "\t" ||
      next === ">"
    );
  };

  while (index < input.length) {
    const nextClose = input.indexOf(closeTag, index);

    if (nextClose === -1) {
      return -1;
    }

    let nextOpen = -1;
    let searchFrom = index;

    while (true) {
      const candidate = input.indexOf(`<${tagName}`, searchFrom);

      if (candidate === -1 || candidate > nextClose) {
        break;
      }

      if (isExactOpeningTagAt(candidate)) {
        nextOpen = candidate;
        break;
      }

      searchFrom = candidate + 1;
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      index = nextOpen + tagName.length + 1;
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
  'import { Box, Group, Popover, Stack, useMantineColorScheme } from "@mantine/core";',
  'import { useMantineColorScheme } from "@mantine/core";'
);

mustReplace(
  'import ElementPreview from "../models/editor/rendering/ElementPreviewRenderer";\n',
  ''
);

mustReplace(
  `  createSignalAspectPreviews,
  drawScene,`,
  `  createSignalAspectPreviews,
  drawScene,
  TrackCanvasSignalAspectPopover,`
);

const popoverStart = source.indexOf(
  `      <Popover\n        opened={signalAspectPopover.opened}`
);

if (popoverStart === -1) {
  throw new Error("Could not locate signal aspect Popover JSX block.");
}

const popoverEnd = findMatchingJsxTagEnd(
  source,
  popoverStart,
  "Popover"
);

if (popoverEnd === -1) {
  throw new Error("Could not locate end of signal aspect Popover JSX block.");
}

source =
  source.slice(0, popoverStart) +
  `      <TrackCanvasSignalAspectPopover\n        state={signalAspectPopover}\n        onClose={closeSignalAspectPopover}\n      />` +
  source.slice(popoverEnd);

source = source.trimEnd() + "\n";

fs.writeFileSync(filePath, source, "utf8");

console.log("TrackCanvas signal popover extraction completed.");
console.log("Run: npm run build");
