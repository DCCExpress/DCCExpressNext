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

console.log("");
console.log("DCCExpressNext runtime layout direction error fixer");
console.log("");

/**
 * 1. layoutRuntimeStore.ts
 * Direction nélküli, de síneket tartalmazó layoutnál konkrét hibaüzenet.
 */
{
  let source = read(files.layoutRuntimeStore);
  const before = source;

  if (!source.includes("validateRuntimeGraphPrerequisites")) {
    const helper = `
  private validateRuntimeGraphPrerequisites(): void {
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

    const marker = `
  private rebuildDerivedRuntime(
    layout: ServerLayoutDto | null
  ): void {`;

    if (!source.includes(marker)) {
      fail("Nem találom a rebuildDerivedRuntime metódus kezdetét.");
    }

    source = source.replace(marker, helper + marker);
    info("validateRuntimeGraphPrerequisites helper hozzáadva.");
  } else {
    info("validateRuntimeGraphPrerequisites helper már létezik.");
  }

  const oldRuntime = `  private rebuildDerivedRuntime(
    layout: ServerLayoutDto | null
  ): void {
    railwayTopologyStore.rebuildFromLayout(layout);

    routeGraphRuntimeStore.rebuildFromTopology(
      railwayTopologyStore.getTopology()
    );
  }`;

  const newRuntime = `  private rebuildDerivedRuntime(
    layout: ServerLayoutDto | null
  ): void {
    railwayTopologyStore.rebuildFromLayout(layout);

    this.validateRuntimeGraphPrerequisites();

    routeGraphRuntimeStore.rebuildFromTopology(
      railwayTopologyStore.getTopology()
    );
  }`;

  if (source.includes(oldRuntime)) {
    source = source.replace(oldRuntime, newRuntime);
    info("rebuildDerivedRuntime direction előfeltétel ellenőrzést kapott.");
  } else if (source.includes("this.validateRuntimeGraphPrerequisites();")) {
    info("rebuildDerivedRuntime már ellenőrzi a direction előfeltételt.");
  } else {
    fail("Nem tudtam módosítani a rebuildDerivedRuntime metódust.");
  }

  writeIfChanged(files.layoutRuntimeStore, before, source);
}

/**
 * 2. layoutRoutes.ts
 * A PUT /api/layout/runtime catch ne nyelje el az Error.message-t.
 */
{
  let source = read(files.layoutRoutes);
  const before = source;

  const oldMessage = `    res.status(500).json({
      success: false,
      message:
        "Nem sikerült frissíteni a szerveroldali runtime layoutot.",
    });`;

  const newMessage = `    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Nem sikerült frissíteni a szerveroldali runtime layoutot.",
    });`;

  if (source.includes(newMessage)) {
    info("PUT /api/layout/runtime már visszaküldi a konkrét Error.message értéket.");
  } else if (source.includes(oldMessage)) {
    source = source.replace(oldMessage, newMessage);
    info("PUT /api/layout/runtime catch konkrét hibaüzenetet küld vissza.");
  } else {
    fail("Nem találom a PUT /api/layout/runtime catch generikus message blokkját.");
  }

  writeIfChanged(files.layoutRoutes, before, source);
}

/**
 * 3. client/src/api/http.ts
 * refreshLayoutRuntime olvassa ki a szerver JSON message mezőjét.
 */
{
  let source = read(files.http);
  const before = source;

  const oldFunction = `export async function refreshLayoutRuntime(
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
    throw new Error(
      "Nem sikerült frissíteni a szerveroldali runtime layoutot."
    );
  }
}`;

  const newFunction = `export async function refreshLayoutRuntime(
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
}`;

  if (source.includes(newFunction)) {
    info("refreshLayoutRuntime már szerver oldali message mezőt használ.");
  } else if (source.includes(oldFunction)) {
    source = source.replace(oldFunction, newFunction);
    info("refreshLayoutRuntime most a szerver konkrét message mezőjét dobja tovább.");
  } else {
    fail("Nem találom a refreshLayoutRuntime függvény eredeti blokkját.");
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
