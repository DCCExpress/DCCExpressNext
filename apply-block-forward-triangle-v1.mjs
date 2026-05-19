#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BLOCK_ELEMENT = path.join(
  ROOT,
  "client/src/models/editor/elements/BlockElement.ts"
);

function assertFile(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Hiányzó fájl: ${path.relative(ROOT, file)}`);
  }
}

function read(file) {
  assertFile(file);
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Frissítve: ${path.relative(ROOT, file)}`);
}

function eolOf(source) {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`${label}: nem találtam a keresett mintát.`);
  }

  return source.replace(search, replacement);
}

function insertBeforeOnce(source, anchor, insertion, label) {
  if (!source.includes(anchor)) {
    throw new Error(`${label}: nem találtam a beszúrási pontot.`);
  }

  return source.replace(anchor, `${insertion}${anchor}`);
}

function patchBlockElement() {
  let s = read(BLOCK_ELEMENT);
  const nl = eolOf(s);

  if (!s.includes("private drawForwardDirectionTriangle(")) {
    const helper = [
      "    /**",
      "     * Kis lime háromszög a blokk rövid oldalán.",
      "     *",
      "     * A canvas a BlockElement.draw() elején már a blokk rotation értékére",
      "     * van elforgatva, ezért itt lokális koordinátákkal dolgozunk:",
      "     *   - travelDirection = forward -> jobb rövid oldal",
      "     *   - travelDirection = reverse -> bal rövid oldal",
      "     *",
      "     * Így forgatott blokknál is automatikusan a helyes forward irányba mutat.",
      "     */",
      "    private drawForwardDirectionTriangle(",
      "        ctx: CanvasRenderingContext2D,",
      "        blockX: number,",
      "        blockY: number,",
      "        blockW: number,",
      "        blockH: number",
      "    ): void {",
      "        if (this.travelDirection === \"unknown\") {",
      "            return;",
      "        }",
      "",
      "        const arrowLength = Math.min(8, Math.max(5, blockW * 0.12));",
      "        const arrowHalfHeight = Math.min(5, Math.max(3, blockH * 0.28));",
      "        const centerY = blockY + blockH / 2;",
      "        const edgePadding = 2;",
      "",
      "        const points =",
      "            this.travelDirection === \"forward\"",
      "                ? {",
      "                    tipX: blockX + blockW - edgePadding,",
      "                    backX: blockX + blockW - edgePadding - arrowLength,",
      "                }",
      "                : {",
      "                    tipX: blockX + edgePadding,",
      "                    backX: blockX + edgePadding + arrowLength,",
      "                };",
      "",
      "        ctx.save();",
      "        ctx.beginPath();",
      "        ctx.moveTo(points.tipX, centerY);",
      "        ctx.lineTo(points.backX, centerY - arrowHalfHeight);",
      "        ctx.lineTo(points.backX, centerY + arrowHalfHeight);",
      "        ctx.closePath();",
      "",
      "        ctx.fillStyle = \"lime\";",
      "        ctx.fill();",
      "",
      "        ctx.strokeStyle = \"black\";",
      "        ctx.lineWidth = 1;",
      "        ctx.stroke();",
      "        ctx.restore();",
      "    }",
      "",
    ].join(nl);

    s = insertBeforeOnce(
      s,
      "    override getBounds(): IRect {",
      helper,
      "BlockElement forward triangle helper"
    );
  } else {
    console.log("• Már benne van: drawForwardDirectionTriangle helper");
  }

  const drawHook = [
    "        ctx.fillRect(blockX, blockY, blockW, blockH);",
    "        ctx.strokeRect(blockX, blockY, blockW, blockH);",
    "",
  ].join(nl);

  const drawHookWithTriangle = [
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
    "",
  ].join(nl);

  if (!s.includes("this.drawForwardDirectionTriangle(")) {
    s = replaceOnce(
      s,
      drawHook,
      drawHookWithTriangle,
      "BlockElement draw forward triangle call"
    );
  } else {
    console.log("• Már benne van: drawForwardDirectionTriangle hívás");
  }

  write(BLOCK_ELEMENT, s);
}

try {
  console.log("DCCExpressNext – BlockElement forward direction triangle patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  patchBlockElement();

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
