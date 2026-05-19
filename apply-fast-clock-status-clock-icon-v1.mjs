#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILE = path.join(
  ROOT,
  "client/src/components/common/FastClockStatus.tsx"
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

function getEol(source) {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    fail(`${label}: nem találtam a keresett mintát.`);
  }

  return source.replace(search, replacement);
}

try {
  console.log("DCCExpressNext – Fast Clock status clock icon patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  let source = read(FILE);
  const eol = getEol(source);

  if (!source.includes("IconClock,")) {
    source = replaceOnce(
      source,
      [
        "import {",
        "  IconPlayerPauseFilled,",
        "  IconPlayerPlayFilled,",
        "  IconRefresh,",
        '} from "@tabler/icons-react";',
      ].join(eol),
      [
        "import {",
        "  IconClock,",
        "  IconPlayerPauseFilled,",
        "  IconPlayerPlayFilled,",
        "  IconRefresh,",
        '} from "@tabler/icons-react";',
      ].join(eol),
      "IconClock import"
    );
  } else {
    console.log("• IconClock import már megvan.");
  }

  source = replaceOnce(
    source,
    [
      "  const badgeLabel =",
      "    snapshot",
      "      ? connected",
      "        ? `FC ${formatFastClock(snapshot.timeMs)} · ${snapshot.speed}×`",
      "        : `FC OFFLINE · ${formatFastClock(snapshot.timeMs)}`",
      "      : connected",
      '        ? "FC --:--:--"',
      '        : "FC OFFLINE";',
    ].join(eol),
    [
      "  const badgeLabel =",
      "    snapshot",
      "      ? connected",
      "        ? `${formatFastClock(snapshot.timeMs)} · ${snapshot.speed}×`",
      "        : `OFFLINE · ${formatFastClock(snapshot.timeMs)}`",
      "      : connected",
      '        ? "--:--:--"',
      '        : "OFFLINE";',
    ].join(eol),
    "FastClock badge label FC prefix removal"
  );

  if (!source.includes("<IconClock size={12} />")) {
    source = replaceOnce(
      source,
      "          {badgeLabel}",
      [
        "          <Group gap={4} wrap=\"nowrap\">",
        "            <IconClock size={12} />",
        "            <span>{badgeLabel}</span>",
        "          </Group>",
      ].join(eol),
      "Clock icon badge content"
    );
  } else {
    console.log("• Clock icon már benne van a badge-ben.");
  }

  write(FILE, source);

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
