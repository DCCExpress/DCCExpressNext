#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  blockElement: path.join(
    ROOT,
    "client/src/models/editor/elements/BlockElement.ts"
  ),
  layoutRoutes: path.join(
    ROOT,
    "server/src/routes/layoutRoutes.ts"
  ),
};

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

function getEol(source) {
  return source.includes("\r\n") ? "\r\n" : "\n";
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

function insertBefore(source, marker, insertion, label) {
  const index = source.indexOf(marker);

  if (index < 0) {
    fail(`${label}: nem találtam a beszúrási pontot.`);
  }

  return source.slice(0, index) + insertion + source.slice(index);
}

function patchBlockElement() {
  let source = read(FILES.blockElement);
  const eol = getEol(source);

  if (!source.includes("private drawForwardDirectionTriangle(")) {
    const helper = [
      "    /**",
      "     * Kis lime háromszög a blokk rövid oldalán.",
      "     *",
      "     * A draw() elején a canvas már a blokk rotation értékére van forgatva,",
      "     * ezért lokális koordinátákkal dolgozunk.",
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
    ].join(eol);

    source = insertBefore(
      source,
      "    override getBounds(): IRect {",
      helper,
      "BlockElement helper"
    );
  } else {
    console.log("• BlockElement helper már megvan.");
  }

  const drawRange = findMethodRange(
    source,
    "    draw(ctx: CanvasRenderingContext2D, options?: DrawOptions): void"
  );

  let drawMethod = drawRange.text;

  if (!drawMethod.includes("this.drawForwardDirectionTriangle(")) {
    const anchor =
      "        ctx.strokeRect(blockX, blockY, blockW, blockH);";

    if (!drawMethod.includes(anchor)) {
      fail("BlockElement.draw(): nem találtam a strokeRect(...) sort.");
    }

    const insertion = [
      anchor,
      "",
      "        this.drawForwardDirectionTriangle(",
      "            ctx,",
      "            blockX,",
      "            blockY,",
      "            blockW,",
      "            blockH",
      "        );",
    ].join(eol);

    drawMethod = drawMethod.replace(anchor, insertion);

    source =
      source.slice(0, drawRange.start) +
      drawMethod +
      source.slice(drawRange.end);
  } else {
    console.log("• BlockElement.draw() háromszög hívás már megvan.");
  }

  write(FILES.blockElement, source);
}

function patchLayoutRoutes() {
  let source = read(FILES.layoutRoutes);
  const eol = getEol(source);

  if (source.includes("...topology.getBlocks().map(block =>")) {
    console.log("• layoutRoutes.ts már küldi a block runtime irányt.");
    return;
  }

  const oldBlock = [
    "    trackRuntime:",
    "      topology?.getPhysicalTrackElements().map(elem => ({",
    "        id: elem.id,",
    "        section: elem.section,",
    "        travelDirection: elem.travelDirection,",
    "      })) ?? [],",
  ].join(eol);

  const newBlock = [
    "    trackRuntime:",
    "      topology",
    "        ? [",
    "          ...topology.getPhysicalTrackElements().map(elem => ({",
    "            id: elem.id,",
    "            section: elem.section,",
    "            travelDirection: elem.travelDirection,",
    "          })),",
    "",
    "          /**",
    "           * A BlockElement nem része a fizikai sínbejárásnak,",
    "           * ezért a travelDirection runtime értékét a blokk középpontján",
    "           * fekvő valódi sín elemtől örökli.",
    "           */",
    "          ...topology.getBlocks().map(block => {",
    "            const centerTrack =",
    "              topology.getPhysicalTrackAt(block.pos);",
    "",
    "            return {",
    "              id: block.id,",
    "              section: centerTrack?.section ?? 0,",
    "              travelDirection:",
    "                centerTrack?.travelDirection ?? \"unknown\",",
    "            };",
    "          }),",
    "        ]",
    "        : [],",
  ].join(eol);

  if (!source.includes(oldBlock)) {
    fail(
      "layoutRoutes.ts: nem találtam a régi trackRuntime blokkot. " +
      "A fájl valószínűleg már eltér a várt alakjától."
    );
  }

  source = source.replace(oldBlock, newBlock);
  write(FILES.layoutRoutes, source);
}

try {
  console.log("DCCExpressNext – Block forward triangle REAL FIX V4");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  patchBlockElement();
  patchLayoutRoutes();

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
