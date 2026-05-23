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

function removeConstFunction(functionName) {
  const pattern = new RegExp(`\\n\\s*const\\s+${functionName}\\s*=\\s*async\\s+function`, "m");
  const match = pattern.exec(source);

  if (!match) {
    throw new Error(`Could not locate const async function ${functionName}.`);
  }

  const start = match.index;
  const openBrace = source.indexOf("{", match.index);

  if (openBrace === -1) {
    throw new Error(`Could not locate opening brace for ${functionName}.`);
  }

  const closeBrace = findMatchingToken(source, openBrace, "{", "}");

  if (closeBrace === -1) {
    throw new Error(`Could not locate closing brace for ${functionName}.`);
  }

  let end = closeBrace + 1;

  if (source[end] === ";") {
    end++;
  }

  while (source[end] === "\n") {
    end++;
  }

  source = source.slice(0, start) + "\n" + source.slice(end);
}

mustReplace(
  'import { generateId, showErrorMessage, showOkMessage, showWarningMessage, sleep } from "../helpers";',
  'import { generateId, showErrorMessage, showWarningMessage } from "../helpers";'
);

mustReplace(
  'import { routeGraphStore } from "../services/routeGraphStore";\n\n',
  ''
);

mustReplace(
  `  createSignalAspectPreviews,
  drawScene,`,
  `  createSignalAspectPreviews,
  drawScene,
  executeExtendedRouteButton,
  executeRouteButton,`
);

removeConstFunction("executeRoute");
removeConstFunction("executeExtendedRoute");

mustReplace(
  `      if (hitElement instanceof RouteButtonElementView) {
        void executeRoute(hitElement);
        return true;
      }

      if (hitElement instanceof ExtendedRouteButtonElementView) {
        void executeExtendedRoute(hitElement);
        return true;
      }`,
  `      if (hitElement instanceof RouteButtonElementView) {
        void executeRouteButton(
          hitElement,
          layoutRef.current,
          {
            t,
            commandCenterLocked: commandCenterRef.current.locked,
            setBusy,
          }
        );
        return true;
      }

      if (hitElement instanceof ExtendedRouteButtonElementView) {
        void executeExtendedRouteButton(
          hitElement,
          {
            t,
            commandCenterLocked: commandCenterRef.current.locked,
            setBusy,
          }
        );
        return true;
      }`
);

source = source.trimEnd() + "\n";

fs.writeFileSync(filePath, source, "utf8");

console.log("TrackCanvas route action extraction completed.");
console.log("Run: npm run build");
