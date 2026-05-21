#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();

const files = {
  layoutRuntimeStore: path.join(
    repoRoot,
    "server",
    "src",
    "services",
    "layoutRuntimeStore.ts"
  ),
  layoutRoutes: path.join(
    repoRoot,
    "server",
    "src",
    "routes",
    "layoutRoutes.ts"
  ),
  http: path.join(
    repoRoot,
    "client",
    "src",
    "api",
    "http.ts"
  ),
};

function fail(message) {
  console.error("");
  console.error("❌ " + message);
  console.error("");
  process.exit(1);
}

function info(message) {
  console.log("✅ " + message);
}

function warn(message) {
  console.warn("⚠️  " + message);
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

function findClassEnd(source, className) {
  const classIndex =
    source.indexOf(`class ${className}`);

  if (classIndex < 0) {
    return -1;
  }

  const openBraceIndex =
    source.indexOf("{", classIndex);

  if (openBraceIndex < 0) {
    return -1;
  }

  return findMatchingBrace(source, openBraceIndex);
}

function findMethodStart(source, methodName) {
  const regex = new RegExp(
    `\\n\\s*(?:private\\s+|public\\s+|protected\\s+)?${methodName}\\s*\\(`,
    "m"
  );

  const match = regex.exec(source);

  return match
    ? match.index
    : -1;
}

function replaceMethod(source, methodName, replacement) {
  const start = findMethodStart(source, methodName);

  if (start < 0) {
    return null;
  }

  const brace = source.indexOf("{", start);

  if (brace < 0) {
    return null;
  }

  const end = findMatchingBrace(source, brace);

  if (end < 0) {
    return null;
  }

  return (
    source.slice(0, start) +
    "\n" +
    replacement +
    source.slice(end + 1)
  );
}

console.log("");
console.log("DCCExpressNext runtime layout direction error fixer v2");
console.log("");

/**
 * 1. server/src/services/layoutRuntimeStore.ts
 */
{
  let source = read(files.layoutRuntimeStore);
  const before = source;

  const helper = `  private validateRuntimeGraphPrerequisites(): void {
    const topology =
      railwayTopologyStore.getTopology();

    if (!topology) {
      return;
    }

    const physicalTracks =
      topology.getPhysicalTrackElements();

    if (physicalTracks.length === 0) {
      return;
    }

    const directionElements =
      topology.getDirectionElements();

    if (directionElements.length > 0) {
      return;
    }

    throw new Error(
      "A runtime route graph nem építhető fel: hiányzik a Track direction elem. " +
        "Tegyél le legalább egy TrackDirection elemet a pályára, hogy a rendszer tudja a haladási irányokat."
    );
  }

`;

  if (!source.includes("validateRuntimeGraphPrerequisites")) {
    const rebuildStart =
      findMethodStart(source, "rebuildDerivedRuntime");

    if (rebuildStart >= 0) {
      source =
        source.slice(0, rebuildStart) +
        "\n" +
        helper +
        source.slice(rebuildStart);

      info("validateRuntimeGraphPrerequisites helper beszúrva rebuildDerivedRuntime elé.");
    } else {
      const classEnd =
        findClassEnd(source, "LayoutRuntimeStore");

      if (classEnd < 0) {
        fail("Nem találom a LayoutRuntimeStore class végét.");
      }

      source =
        source.slice(0, classEnd) +
        "\n" +
        helper +
        source.slice(classEnd);

      info("validateRuntimeGraphPrerequisites helper beszúrva a class végére.");
    }
  } else {
    info("validateRuntimeGraphPrerequisites helper már létezik.");
  }

  if (!source.includes("this.validateRuntimeGraphPrerequisites();")) {
    const replacement = `  private rebuildDerivedRuntime(
    layout: ServerLayoutDto | null
  ): void {
    railwayTopologyStore.rebuildFromLayout(layout);

    this.validateRuntimeGraphPrerequisites();

    routeGraphRuntimeStore.rebuildFromTopology(
      railwayTopologyStore.getTopology()
    );
  }
`;

    const replaced =
      replaceMethod(source, "rebuildDerivedRuntime", replacement);

    if (!replaced) {
      fail("Nem találom/cserélem a rebuildDerivedRuntime metódust.");
    }

    source = replaced;
    info("rebuildDerivedRuntime direction előfeltétel ellenőrzést kapott.");
  } else {
    info("rebuildDerivedRuntime már ellenőrzi a direction előfeltételt.");
  }

  writeIfChanged(files.layoutRuntimeStore, before, source);
}

/**
 * 2. server/src/routes/layoutRoutes.ts
 */
{
  let source = read(files.layoutRoutes);
  const before = source;

  if (
    source.includes("error instanceof Error") &&
    source.includes("? error.message") &&
    source.includes("Nem sikerült frissíteni a szerveroldali runtime layoutot.")
  ) {
    info("layoutRoutes már visszaküldi az Error.message értéket.");
  } else {
    const genericMessage =
      `"Nem sikerült frissíteni a szerveroldali runtime layoutot."`;

    const runtimeCatchRegex =
      /(layoutRoutes\.put\(["']\/runtime["'][\s\S]*?catch\s*\(\s*error\s*\)\s*\{[\s\S]*?res\.status\(500\)\.json\(\{\s*success:\s*false,\s*message:\s*)([\s\S]*?)(\s*,?\s*\}\s*\)\s*;\s*\}\s*\}\s*\);)/m;

    const match =
      runtimeCatchRegex.exec(source);

    if (!match) {
      fail("Nem találom a PUT /api/layout/runtime catch response blokkját.");
    }

    source = source.replace(
      runtimeCatchRegex,
      `$1error instanceof Error
          ? error.message
          : ${genericMessage}$3`
    );

    info("PUT /api/layout/runtime catch konkrét Error.message értéket küld vissza.");
  }

  writeIfChanged(files.layoutRoutes, before, source);
}

/**
 * 3. client/src/api/http.ts
 */
{
  let source = read(files.http);
  const before = source;

  if (source.includes("const data = await response.json() as") && source.includes("typeof data.message ===")) {
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
      replaceMethod(source, "refreshLayoutRuntime", replacement);

    if (!replaced) {
      fail("Nem találom/cserélem a refreshLayoutRuntime függvényt.");
    }

    source = replaced;
    info("refreshLayoutRuntime most a szerver konkrét message mezőjét dobja tovább.");
  }

  writeIfChanged(files.http, before, source);
}

console.log("");
console.log("🎉 Kész, öcsém!");
console.log("");
console.log("Most direction nélküli pályánál konkrét üzenetet kell látnod:");
console.log("Hiányzik a Track direction elem...");
console.log("");
console.log("Most futtasd:");
console.log("");
console.log("  npm run build");
console.log("");
