#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();

const routerPath = path.join(
  repoRoot,
  "server",
  "src",
  "ws",
  "wsMessageRouter.ts"
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

function appendImportAfterLastImport(source, importText) {
  if (source.includes(importText.trim())) {
    return source;
  }

  const importRegex =
    /(?:import[\s\S]*?from\s*["'][^"']+["'];\s*)+/m;

  const match =
    importRegex.exec(source);

  if (!match) {
    return importText + "\n" + source;
  }

  const insertAt =
    match.index + match[0].length;

  return (
    source.slice(0, insertAt) +
    "\n" +
    importText +
    source.slice(insertAt)
  );
}

console.log("");
console.log("DCCExpressNext RuntimeVariable router fixer");
console.log("");

let source = read(routerPath);
const before = source;

const importText =
`import {
  handleRuntimeVariableMessage,
} from "./handlers/wsRuntimeVariableMessageHandlers.js";

`;

if (!source.includes("handleRuntimeVariableMessage")) {
  source = appendImportAfterLastImport(
    source,
    importText
  );

  info("handleRuntimeVariableMessage import hozzáadva.");
} else if (!source.includes('from "./handlers/wsRuntimeVariableMessageHandlers.js"')) {
  source = appendImportAfterLastImport(
    source,
    importText
  );

  info("handleRuntimeVariableMessage import pótolva.");
} else {
  info("handleRuntimeVariableMessage import már létezik.");
}

if (!/const\s+handlers\s*=\s*\[[\s\S]*handleRuntimeVariableMessage/.test(source)) {
  const handlersStartRegex =
    /const\s+handlers\s*=\s*\[\s*/m;

  if (!handlersStartRegex.test(source)) {
    fail("Nem találom a handlers tömb kezdetét.");
  }

  source = source.replace(
    handlersStartRegex,
    match => match + "\n  handleRuntimeVariableMessage,"
  );

  info("handleRuntimeVariableMessage hozzáadva a handlers tömb elejére.");
} else {
  info("handleRuntimeVariableMessage már benne van a handlers tömbben.");
}

writeIfChanged(routerPath, before, source);

console.log("");
console.log("🎉 Kész, öcsém!");
console.log("");
console.log("Ez csak a server/src/ws/wsMessageRouter.ts fájlt javította.");
console.log("Most a setRuntimeVariable üzenetet a runtime variable handlernek kell elkapnia.");
console.log("");
console.log("Most futtasd:");
console.log("");
console.log("  npm run build");
console.log("");
