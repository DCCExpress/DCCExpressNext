#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();

const httpPath = path.join(
  repoRoot,
  "client",
  "src",
  "api",
  "http.ts"
);

function fail(message) {
  console.error("");
  console.error("❌ " + message);
  console.error("");
  process.exit(1);
}

function info(message) {
  console.log("✅ " + message);
}

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Nem találom a fájlt: ${filePath}`);
  }

  return fs.readFileSync(filePath, "utf8");
}

function writeIfChanged(filePath, before, after) {
  if (before === after) {
    info(`${path.relative(repoRoot, filePath)} nem változott.`);
    return;
  }

  fs.writeFileSync(filePath, after, "utf8");
  info(`${path.relative(repoRoot, filePath)} módosítva.`);
}

function findMatchingBrace(source, openBraceIndex) {
  let depth = 0;
  let inString = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = openBraceIndex; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === "\\") {
        escaped = true;
        continue;
      }

      if (ch === inString) {
        inString = null;
      }

      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }

    if (ch === "{") {
      depth += 1;
      continue;
    }

    if (ch === "}") {
      depth -= 1;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function replaceExportedFunction(source, functionName, replacement) {
  const regex = new RegExp(
    `export\\s+async\\s+function\\s+${functionName}\\s*\\(`,
    "m"
  );

  const match = regex.exec(source);

  if (!match) {
    return null;
  }

  const start = match.index;
  const brace = source.indexOf("{", match.index);

  if (brace < 0) {
    return null;
  }

  const end = findMatchingBrace(source, brace);

  if (end < 0) {
    return null;
  }

  return (
    source.slice(0, start) +
    replacement +
    source.slice(end + 1)
  );
}

console.log("");
console.log("DCCExpressNext refreshLayoutRuntime client message fixer v3");
console.log("");

let source = read(httpPath);
const before = source;

if (
  source.includes("const data = await response.json() as") &&
  source.includes("typeof data.message ===")
) {
  info("refreshLayoutRuntime már kiolvassa a szerver message mezőjét.");
} else {
  const replacement = `export async function refreshLayoutRuntime(
  layout: LayoutView
): Promise<void> {
  const response = await fetch("/api/layout/runtime", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(layout),
  });

  if (!response.ok) {
    let message =
      "Nem sikerült frissíteni a szerveroldali runtime layoutot.";

    try {
      const data = await response.json() as {
        message?: unknown;
      };

      if (typeof data.message === "string") {
        message = data.message;
      }
    } catch {
      // Ha a szerver nem JSON-t küldött, marad a fallback üzenet.
    }

    throw new Error(message);
  }
}
`;

  const replaced =
    replaceExportedFunction(
      source,
      "refreshLayoutRuntime",
      replacement
    );

  if (!replaced) {
    fail("Nem találom/cserélem a refreshLayoutRuntime függvényt.");
  }

  source = replaced;
  info("refreshLayoutRuntime most a szerver konkrét message mezőjét dobja tovább.");
}

writeIfChanged(httpPath, before, source);

console.log("");
console.log("🎉 Kész, öcsém!");
console.log("");
console.log("Ez csak a client/src/api/http.ts refreshLayoutRuntime részét javította.");
console.log("A korábban sikerült szerveroldali módosításokat nem piszkálta.");
console.log("");
console.log("Most futtasd:");
console.log("");
console.log("  npm run build");
console.log("");
