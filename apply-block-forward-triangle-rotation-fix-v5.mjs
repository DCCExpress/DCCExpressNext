#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  blockElement: path.join(
    ROOT,
    "client/src/models/editor/elements/BlockElement.ts"
  ),
  layout: path.join(
    ROOT,
    "client/src/models/editor/core/Layout.ts"
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

function insertAfter(source, marker, insertion, label) {
  const index = source.indexOf(marker);

  if (index < 0) {
    fail(`${label}: nem találtam a beszúrási pontot.`);
  }

  return (
    source.slice(0, index + marker.length) +
    insertion +
    source.slice(index + marker.length)
  );
}

function patchBlockElement() {
  let source = read(FILES.blockElement);
  const eol = getEol(source);

  const runtimePropertyMarker =
    "    runtimeTransitLocoAddress: number = 0;";

  if (!source.includes("runtimeForwardRotation: number | null = null;")) {
    source = insertAfter(
      source,
      runtimePropertyMarker,
      [
        "",
        "",
        "    /**",
        "     * Csak runtime vizuális adat.",
        "     * A blokk alatt fekvő valódi sín elem abszolút forward irányszöge.",
        "     *",
        "     * Nem a blokk saját rotation értékéből következtetünk, mert",
        "     * a blokk 0°/180° vagy 90°/270° elforgatása vizuálisan ugyanaz,",
        "     * de a forward oldal pont megfordulhat.",
        "     */",
        "    runtimeForwardRotation: number | null = null;",
      ].join(eol),
      "BlockElement runtimeForwardRotation property"
    );
  } else {
    console.log("• BlockElement.runtimeForwardRotation már megvan.");
  }

  const helperSignature =
    "    private drawForwardDirectionTriangle(";

  if (!source.includes(helperSignature)) {
    fail(
      "Nem találom a drawForwardDirectionTriangle helper metódust. " +
      "Előbb a korábbi block triangle patch-ek egyikének le kellett futnia."
    );
  }

  const helperRange = findMethodRange(source, helperSignature);

  const helperMethod = [
    "    /**",
    "     * Kis lime háromszög a blokk rövid oldalán.",
    "     *",
    "     * A helper nem a blokk travelDirection + rotation párosából tippeli",
    "     * a nyíl oldalát, hanem a Layout által kiszámolt abszolút",
    "     * runtimeForwardRotation értéket használja.",
    "     *",
    "     * A draw() elején a canvas már this.rotation szerint el van forgatva,",
    "     * ezért az abszolút forward szöget visszatranszformáljuk lokális szöggé.",
    "     */",
    "    private drawForwardDirectionTriangle(",
    "        ctx: CanvasRenderingContext2D,",
    "        blockX: number,",
    "        blockY: number,",
    "        blockW: number,",
    "        blockH: number",
    "    ): void {",
    "        if (this.runtimeForwardRotation === null) {",
    "            return;",
    "        }",
    "",
    "        const normalizeRotation = (angle: number): number => {",
    "            const result = angle % 360;",
    "            return result < 0 ? result + 360 : result;",
    "        };",
    "",
    "        /**",
    "         * A canvas már a blokk rotation értékével el van forgatva.",
    "         * A lokális 0° a blokk jobb rövid oldala.",
    "         */",
    "        const localForwardRotation =",
    "            normalizeRotation(",
    "                this.runtimeForwardRotation - this.rotation",
    "            );",
    "",
    "        const localForwardRad =",
    "            localForwardRotation * Math.PI / 180;",
    "",
    "        /**",
    "         * A blokk hosszanti tengelye mentén várunk 0° vagy 180° körüli irányt.",
    "         * cos >= 0 -> jobb rövid oldal",
    "         * cos <  0 -> bal rövid oldal",
    "         */",
    "        const pointsRight =",
    "            Math.cos(localForwardRad) >= 0;",
    "",
    "        const arrowLength = Math.min(8, Math.max(5, blockW * 0.12));",
    "        const arrowHalfHeight = Math.min(5, Math.max(3, blockH * 0.28));",
    "        const centerY = blockY + blockH / 2;",
    "        const edgePadding = 2;",
    "",
    "        const points = pointsRight",
    "            ? {",
    "                tipX: blockX + blockW - edgePadding,",
    "                backX: blockX + blockW - edgePadding - arrowLength,",
    "            }",
    "            : {",
    "                tipX: blockX + edgePadding,",
    "                backX: blockX + edgePadding + arrowLength,",
    "            };",
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
  ].join(eol);

  source =
    source.slice(0, helperRange.start) +
    helperMethod +
    source.slice(helperRange.end);

  write(FILES.blockElement, source);
}

function patchLayout() {
  let source = read(FILES.layout);
  const eol = getEol(source);

  const methodSignature =
    "    applyRouteGraphRuntime(";

  const methodRange = findMethodRange(source, methodSignature);
  let method = methodRange.text;

  if (
    method.includes("runtimeForwardRotation") &&
    method.includes("centerTrack")
  ) {
    console.log("• Layout.applyRouteGraphRuntime blokk forward-számítás már megvan.");
    return;
  }

  const oldTail = [
    "        for (const runtime of trackRuntime) {",
    "            const elem =",
    "                elementsById.get(runtime.id);",
    "",
    "            if (!elem) {",
    "                continue;",
    "            }",
    "",
    "            elem.section =",
    "                runtime.section;",
    "",
    "            elem.travelDirection =",
    "                runtime.travelDirection;",
    "        }",
  ].join(eol);

  const newTail = [
    "        for (const runtime of trackRuntime) {",
    "            const elem =",
    "                elementsById.get(runtime.id);",
    "",
    "            if (!elem) {",
    "                continue;",
    "            }",
    "",
    "            elem.section =",
    "                runtime.section;",
    "",
    "            elem.travelDirection =",
    "                runtime.travelDirection;",
    "        }",
    "",
    "        /**",
    "         * A blokk irányjelzője ne a blokk saját rotation értékéből",
    "         * próbáljon következtetni, hanem a blokk közepén fekvő",
    "         * valódi sín elem világkoordinátás forward irányából.",
    "         */",
    "        const physicalTrackElements =",
    "            this.track.elements.filter(",
    "                (elem): elem is TrackElement =>",
    "                    elem instanceof TrackElement",
    "            );",
    "",
    "        const normalizeRotation = (angle: number): number => {",
    "            const result = angle % 360;",
    "            return result < 0 ? result + 360 : result;",
    "        };",
    "",
    "        for (const elem of trackElements) {",
    "            if (!(elem instanceof BlockElement)) {",
    "                continue;",
    "            }",
    "",
    "            const centerTrack =",
    "                physicalTrackElements.find(track =>",
    "                    track.x === elem.x &&",
    "                    track.y === elem.y",
    "                );",
    "",
    "            if (",
    "                !centerTrack ||",
    "                centerTrack.travelDirection === \"unknown\"",
    "            ) {",
    "                elem.runtimeForwardRotation = null;",
    "                continue;",
    "            }",
    "",
    "            elem.runtimeForwardRotation =",
    "                normalizeRotation(",
    "                    centerTrack.travelDirection === \"forward\"",
    "                        ? centerTrack.rotation",
    "                        : centerTrack.rotation + 180",
    "                );",
    "        }",
  ].join(eol);

  if (!method.includes(oldTail)) {
    fail(
      "Layout.applyRouteGraphRuntime(): nem találtam a runtime feldolgozó blokk végét."
    );
  }

  method = method.replace(oldTail, newTail);

  source =
    source.slice(0, methodRange.start) +
    method +
    source.slice(methodRange.end);

  write(FILES.layout, source);
}

try {
  console.log("DCCExpressNext – Block forward triangle rotation FIX V5");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  patchBlockElement();
  patchLayout();

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
