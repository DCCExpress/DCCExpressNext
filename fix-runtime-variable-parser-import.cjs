#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();

const parserPath = path.join(
  repoRoot,
  "server",
  "src",
  "ws",
  "wsIncomingClientMessageParser.ts"
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

if (!fs.existsSync(parserPath)) {
  fail(`Nem találom a fájlt: ${parserPath}`);
}

console.log("");
console.log("DCCExpressNext runtime variable parser import fixer");
console.log("");

let source = fs.readFileSync(parserPath, "utf8");
const before = source;

if (source.includes("isRuntimeVariableKey")) {
  const hasImport =
    /import\s*\{[\s\S]*isRuntimeVariableKey[\s\S]*\}\s*from\s*["']\.\.\/\.\.\/\.\.\/common\/src\/types\.js["'];/m.test(source) ||
    /import\s*\{[\s\S]*isRuntimeVariableKey[\s\S]*\}\s*from\s*["']\.\.\/\.\.\/\.\.\/common\/src\/runtimeVariables\.js["'];/m.test(source);

  if (!hasImport) {
    const typesImportRegex =
      /import\s*\{\s*isClientWsMessageType\s*,?\s*\}\s*from\s*["']\.\.\/\.\.\/\.\.\/common\/src\/types\.js["'];/m;

    if (typesImportRegex.test(source)) {
      source = source.replace(
        typesImportRegex,
        `import {
  isClientWsMessageType,
  isRuntimeVariableKey,
} from "../../../common/src/types.js";`
      );

      info("isRuntimeVariableKey hozzáadva a types.js importhoz.");
    } else {
      const firstImportRegex =
        /(?:import[\s\S]*?from\s*["'][^"']+["'];\s*)+/m;

      const importText =
`import {
  isRuntimeVariableKey,
} from "../../../common/src/types.js";

`;

      const match =
        firstImportRegex.exec(source);

      if (match) {
        const insertAt =
          match.index + match[0].length;

        source =
          source.slice(0, insertAt) +
          "\n" +
          importText +
          source.slice(insertAt);
      } else {
        source =
          importText +
          source;
      }

      info("isRuntimeVariableKey külön importként hozzáadva.");
    }
  } else {
    info("isRuntimeVariableKey import már létezik.");
  }
} else {
  info("A fájl nem használ isRuntimeVariableKey-et, nincs mit importálni.");
}

if (source !== before) {
  fs.writeFileSync(parserPath, source, "utf8");
  info("server/src/ws/wsIncomingClientMessageParser.ts módosítva.");
} else {
  info("Nem volt mit módosítani.");
}

console.log("");
console.log("🎉 Kész, öcsém!");
console.log("");
console.log("Most futtasd:");
console.log("");
console.log("  npm run build");
console.log("");
