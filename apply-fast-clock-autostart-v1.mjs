#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILE = path.join(
  ROOT,
  "server/src/services/fastClockRuntimeStore.ts"
);

function fail(message) {
  throw new Error(message);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail(`Hiányzó fájl: ${path.relative(ROOT, file)}`);
  }

  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Frissítve: ${path.relative(ROOT, file)}`);
}

try {
  console.log("DCCExpressNext – Fast Clock autostart patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  let source = read(FILE);

  if (source.includes("  private running = true;")) {
    console.log("• A Fast Clock már automatikusan fut szerverindításkor.");
  } else if (source.includes("  private running = false;")) {
    source = source.replace(
      "  private running = false;",
      "  private running = true;"
    );

    write(FILE, source);
  } else {
    fail(
      "Nem találtam a Fast Clock induló running állapotát. " +
      "A fájl valószínűleg eltér a várt verziótól."
    );
  }

  console.log("");
  console.log("Kész.");
  console.log("Nem készültek .bak fájlok.");
  console.log("");
  console.log("Javasolt ellenőrzés:");
  console.log("  npm run build");
} catch (error) {
  console.error("");
  console.error("PATCH HIBA:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
