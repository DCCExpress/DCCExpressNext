#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BLOCK_ELEMENT = path.join(
  ROOT,
  "client/src/models/editor/elements/BlockElement.ts"
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

function findMethodRange(source, signature) {
  const start = source.indexOf(signature);

  if (start < 0) {
    fail(`Nem találtam ezt a metódust: ${signature}`);
  }

  const openBrace = source.indexOf("{", start);

  if (openBrace < 0) {
    fail(`Nem találtam nyitó kapcsos zárójelet ehhez: ${signature}`);
  }

  let depth = 0;

  for (let i = openBrace; i < source.length; i++) {
    const char = source[i];

    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;

      if (depth === 0) {
        return {
          start,
          end: i + 1,
          text: source.slice(start, i + 1),
        };
      }
    }
  }

  fail(`Nem találtam a metódus végét ehhez: ${signature}`);
}

function patch() {
  let source = read(BLOCK_ELEMENT);

  if (!source.includes("private drawForwardDirectionTriangle(")) {
    fail(
      "Nem találom a drawForwardDirectionTriangle helper metódust. " +
      "Előbb az előző BlockElement triangle patch fusson le."
    );
  }

  const drawRange = findMethodRange(
    source,
    "    draw(ctx: CanvasRenderingContext2D, options?: DrawOptions): void"
  );

  let drawMethod = drawRange.text;

  if (drawMethod.includes("this.drawForwardDirectionTriangle(")) {
    console.log("• A valódi draw() metódusban már benne van a háromszög hívás.");
    return;
  }

  const hook = [
    "        ctx.fillRect(blockX, blockY, blockW, blockH);",
    "        ctx.strokeRect(blockX, blockY, blockW, blockH);",
  ].join("\n");

  const replacement = [
    "        ctx.fillRect(blockX, blockY, blockW, blockH);",
    "        ctx.strokeRect(blockX, blockY, blockW, blockH);",
    "",
    "        this.drawForwardDirectionTriangle(",
    "            ctx,",
    "            blockX,",
    "            blockY,",
    "            blockW,",
    "            blockH",
    "        );",
  ].join("\n");

  if (!drawMethod.includes(hook)) {
    fail(
      "A draw() metódusban nem találtam a fillRect/strokeRect beszúrási pontot."
    );
  }

  drawMethod = drawMethod.replace(hook, replacement);

  source =
    source.slice(0, drawRange.start) +
    drawMethod +
    source.slice(drawRange.end);

  write(BLOCK_ELEMENT, source);
}

try {
  console.log("DCCExpressNext – BlockElement forward triangle FIX V2");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  patch();

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
