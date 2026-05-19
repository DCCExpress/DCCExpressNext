#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  layout: path.join(ROOT, "client/src/models/editor/core/Layout.ts"),
  wsApi: path.join(ROOT, "client/src/services/wsApi.ts"),
  http: path.join(ROOT, "client/src/api/http.ts"),
  elementFactory: path.join(ROOT, "client/src/models/editor/core/ElementFactory.ts"),
  serverIndex: path.join(ROOT, "server/src/index.ts"),
  serverApp: path.join(ROOT, "server/src/app.ts"),
  serverPaths: path.join(ROOT, "server/src/paths.ts"),
  layoutRoutes: path.join(ROOT, "server/src/routes/layoutRoutes.ts"),
  commandCenterRoutes: path.join(ROOT, "server/src/routes/commandCenterRoutes.ts"),
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

function normalizeBlankLines(source) {
  return source
    .replace(/[ \t]+\r?\n/g, match => match.includes("\r\n") ? "\r\n" : "\n")
    .replace(/(\r?\n){4,}/g, (_m, _g1) => {
      const eol = source.includes("\r\n") ? "\r\n" : "\n";
      return eol + eol + eol;
    });
}

function replaceOptional(source, search, replacement, label) {
  if (typeof search === "string") {
    if (!source.includes(search)) {
      console.log(`- Kihagyva: ${label}`);
      return source;
    }

    console.log(`  · ${label}`);
    return source.replace(search, replacement);
  }

  if (!search.test(source)) {
    console.log(`- Kihagyva: ${label}`);
    return source;
  }

  console.log(`  · ${label}`);
  return source.replace(search, replacement);
}

function removeNamedMethodIfExists(source, methodName, label) {
  const regex = new RegExp(
    String.raw`^[ \t]*(?:public|private|protected)?[ \t]*(?:static[ \t]+)?(?:async[ \t]+)?${methodName}[ \t]*\(`,
    "m"
  );

  const match = regex.exec(source);

  if (!match) {
    console.log(`- Kihagyva: ${label}`);
    return source;
  }

  const start = match.index;
  const openBrace = source.indexOf("{", start);

  if (openBrace < 0) {
    fail(`${label}: nem találtam nyitó kapcsos zárójelet.`);
  }

  let depth = 0;

  for (let i = openBrace; i < source.length; i++) {
    const char = source[i];

    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;

      if (depth === 0) {
        let end = i + 1;

        while (
          end < source.length &&
          (source[end] === "\r" || source[end] === "\n")
        ) {
          end++;
        }

        console.log(`  · ${label}`);
        return source.slice(0, start) + source.slice(end);
      }
    }
  }

  fail(`${label}: nem találtam a metódus végét.`);
}

function patchLayout() {
  let source = read(FILES.layout);
  const eol = getEol(source);

  source = replaceOptional(
    source,
    [
      'import type {',
      '    Graph,',
      '    RouteSolution,',
      '} from "../../../../../common/src/railway/graph";',
    ].join(eol),
    [
      'import type {',
      '    Graph,',
      '} from "../../../../../common/src/railway/graph";',
    ].join(eol),
    "Layout.ts: RouteSolution import törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(`^import \\{ ExtendedRouteButtonElement \\} from "\\.\\./elements/ExtendedRouteButtonElement";\\r?\\n`, "m"),
    "",
    "Layout.ts: már nem használt ExtendedRouteButtonElement import törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(
      String.raw`type TurnoutSide = "entry" \| "straight" \| "div";\r?\n\r?\n`,
      "m"
    ),
    "",
    "Layout.ts: már nem használt TurnoutSide típus törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(String.raw`^[ \t]*console\.log\("CHECKING ROUTE BUTTON:[^\r\n]*\r?\n`, "gm"),
    "",
    "Layout.ts: removeElement debug log 1 törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(String.raw`^[ \t]*console\.log\("CHECKING TURNOUT:[^\r\n]*\r?\n`, "gm"),
    "",
    "Layout.ts: removeElement debug log 2 törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(String.raw`^[ \t]*console\.log\("REMOVING ROUTE BUTTON:[^\r\n]*\r?\n`, "gm"),
    "",
    "Layout.ts: removeElement debug log 3 törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(String.raw`^[ \t]*console\.log\("COLLISION:[^\r\n]*\r?\n`, "gm"),
    "",
    "Layout.ts: collision debug log törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(
      String.raw`[ \t]*console\.log\(\r?\n[ \t]*\`⏱️ checkRoutes total: \$\{\(performance\.now\(\) - checkRoutesStart\)\.toFixed\(2\)\} ms\`\r?\n[ \t]*\);\r?\n`,
      "m"
    ),
    "",
    "Layout.ts: checkRoutes időmérő debug log törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(
      String.raw`[ \t]*const checkRoutesStart = performance\.now\(\);\r?\n\r?\n`,
      "m"
    ),
    "",
    "Layout.ts: fölöslegessé vált checkRoutesStart törlése"
  );

  source = removeNamedMethodIfExists(
    source,
    "getElement22",
    "Layout.ts: getElement22() törlése"
  );

  source = removeNamedMethodIfExists(
    source,
    "checkRoutes2",
    "Layout.ts: checkRoutes2() törlése"
  );

  source = removeNamedMethodIfExists(
    source,
    "isExtendedRouteSolutionActive22",
    "Layout.ts: isExtendedRouteSolutionActive22() törlése"
  );

  source = removeNamedMethodIfExists(
    source,
    "markExtendedRouteSolution22",
    "Layout.ts: markExtendedRouteSolution22() törlése"
  );

  source = removeNamedMethodIfExists(
    source,
    "test",
    "Layout.ts: test() fejlesztői segéd törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(
      String.raw`\r?\n[ \t]*const extendedRouteButtons = belems\.filter\([\s\S]*?\) as ExtendedRouteButtonElement\[\];\r?\n`,
      "m"
    ),
    eol,
    "Layout.ts: már nem használt extendedRouteButtons lokális változó törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(
      String.raw`\r?\n[ \t]*// ==================================================\r?\n[ \t]*// GRAPH\r?\n[ \t]*// ==================================================[\s\S]*?\r?\n}\s*$`,
      "m"
    ),
    eol + "}",
    "Layout.ts: kommentben bent maradt régi route graph blokk törlése"
  );

  write(FILES.layout, normalizeBlankLines(source));
}

function patchWsApi() {
  let source = read(FILES.wsApi);
  const eol = getEol(source);

  source = replaceOptional(
    source,
    'import { Direction, SetTurnoutMessage } from "../../../common/src/types";',
    'import { Direction } from "../../../common/src/types";',
    "wsApi.ts: nem használt SetTurnoutMessage import törlése"
  );

  source = replaceOptional(
    source,
    /class WebscoketApi/g,
    "class WebSocketApi",
    "wsApi.ts: WebscoketApi elírás javítása"
  );

  source = replaceOptional(
    source,
    /new WebscoketApi\(\)/g,
    "new WebSocketApi()",
    "wsApi.ts: példányosítás átnevezése"
  );

  source = replaceOptional(
    source,
    new RegExp(
      String.raw`\r?\n[ \t]*// powerOn\(\) \{[\s\S]*?[ \t]*// \};\r?\n\r?\n[ \t]*// powerOff\(\) \{[\s\S]*?[ \t]*// \};\r?\n\r?\n[ \t]*// emergencyStop\(\) \{[\s\S]*?[ \t]*// \};\r?\n`,
      "m"
    ),
    eol,
    "wsApi.ts: régi kommentelt power metódusok törlése"
  );

  source = removeNamedMethodIfExists(
    source,
    "stopTask",
    "wsApi.ts: elavult stopTask() törlése"
  );

  source = removeNamedMethodIfExists(
    source,
    "stopAllTasks",
    "wsApi.ts: elavult stopAllTasks() törlése"
  );

  write(FILES.wsApi, normalizeBlankLines(source));
}

function patchHttp() {
  let source = read(FILES.http);

  source = replaceOptional(
    source,
    new RegExp(String.raw`^import \{ ElementType \} from "react";\r?\n`, "m"),
    "",
    "http.ts: hibás/árva React ElementType import törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(
      String.raw`export type LayoutElementDto = \{\r?\n[ \t]*id: string;\r?\n[ \t]*type: ElementType;\r?\n[ \t]*x: number;\r?\n[ \t]*y: number;\r?\n[ \t]*rotation\?: number;\r?\n[ \t]*width\?: number;\r?\n[ \t]*height\?: number;\r?\n\};\r?\n\r?\n`,
      "m"
    ),
    "",
    "http.ts: régi lokális LayoutElementDto törlése"
  );

  write(FILES.http, normalizeBlankLines(source));
}

function patchElementFactory() {
  let source = read(FILES.elementFactory);

  source = replaceOptional(
    source,
    new RegExp(String.raw`^import ca from "zod\/v4\/locales\/ca\.cjs";\r?\n`, "m"),
    "",
    "ElementFactory.ts: véletlen zod/ca import törlése"
  );

  write(FILES.elementFactory, normalizeBlankLines(source));
}

function patchServerIndex() {
  let source = read(FILES.serverIndex);

  source = replaceOptional(
    source,
    new RegExp(
      String.raw`^// import http from "node:http";[\s\S]*?// \}\);\r?\n\r?\n`,
      "m"
    ),
    "",
    "server index.ts: kommentben maradt régi bootstrap blokk törlése"
  );

  write(FILES.serverIndex, normalizeBlankLines(source));
}

function patchServerApp() {
  let source = read(FILES.serverApp);

  source = replaceOptional(
    source,
    new RegExp(String.raw`^\s*\/\/app\.use\("\/images"[\s\S]*?\r?\n`, "m"),
    "",
    "app.ts: régi kommentelt images route törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(String.raw`^\s*\/\/ await commandCenter\.saveRuntimeState\(\);\r?\n`, "m"),
    "",
    "app.ts: régi shutdown komment törlése"
  );

  write(FILES.serverApp, normalizeBlankLines(source));
}

function patchServerPaths() {
  let source = read(FILES.serverPaths);

  source = replaceOptional(
    source,
    new RegExp(
      String.raw`^\r?\n?\r?\n?//const __filename = fileURLToPath\(import\.meta\.url\);\r?\n//const __dirname = path\.dirname\(path\.cwd\(\)\);\r?\n\r?\n\r?\n//export const projectRoot = path\.resolve\(__dirname, "\.\/\.\.\/\.\."\);\r?\n\r?\n`,
      "m"
    ),
    "",
    "paths.ts: régi kommentelt root-felderítés törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(String.raw`^console\.log\("PATHSEPARATOR:", path\.sep\);\r?\n`, "m"),
    "",
    "paths.ts: PATHSEPARATOR debug log törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(String.raw`^console\.log\("CURRENT_DIR:", currentDir\);\r?\n`, "m"),
    "",
    "paths.ts: CURRENT_DIR debug log törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(String.raw`^console\.log\("PROJECT_ROOT:", projectRoot\);\r?\n`, "m"),
    "",
    "paths.ts: PROJECT_ROOT debug log törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(String.raw`^console\.log\("DATA_DIR:", dataDir\);\r?\n`, "m"),
    "",
    "paths.ts: DATA_DIR debug log törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(String.raw`^\s*\/\/export const publicDir[^\r\n]*\r?\n`, "m"),
    "",
    "paths.ts: régi publicDir komment törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(
      String.raw`export function dataFilePath\(fileName: string\): string \{\r?\n[ \t]*console\.log\("=+"\);\r?\n[ \t]*console\.log\("DATA_DIR:", dataDir\);\r?\n[ \t]*console\.log\("=+"\);\r?\n\r?\n[ \t]*return path\.resolve\(dataDir, fileName\);\r?\n\}`,
      "m"
    ),
    [
      "export function dataFilePath(fileName: string): string {",
      "  return path.resolve(dataDir, fileName);",
      "}",
    ].join(getEol(source)),
    "paths.ts: dataFilePath belső debug logok törlése"
  );

  write(FILES.serverPaths, normalizeBlankLines(source));
}

function patchLayoutRoutes() {
  let source = read(FILES.layoutRoutes);

  source = replaceOptional(
    source,
    new RegExp(
      String.raw`\r?\n// layoutRoutes\.get\("\/route-graph-summary",[\s\S]*?\r?\n// \}\);\r?\n`,
      "m"
    ),
    getEol(source),
    "layoutRoutes.ts: kommentben maradt duplikált route-graph-summary törlése"
  );

  write(FILES.layoutRoutes, normalizeBlankLines(source));
}

function patchCommandCenterRoutes() {
  let source = read(FILES.commandCenterRoutes);

  source = replaceOptional(
    source,
    new RegExp(String.raw`^//export type CommandCenterType[^\r\n]*\r?\n\r?\n`, "m"),
    "",
    "commandCenterRoutes.ts: régi kommentelt CommandCenterType alias törlése"
  );

  source = replaceOptional(
    source,
    new RegExp(
      String.raw`\r?\n[ \t]*// if \(cbCommandCenterConfigLoaded\) \{\r?\n[ \t]*//   cbCommandCenterConfigLoaded\(CurrentCommandCenterConfig\);\r?\n[ \t]*// \}\r?\n`,
      "m"
    ),
    getEol(source),
    "commandCenterRoutes.ts: régi kommentelt callback blokk törlése"
  );

  write(FILES.commandCenterRoutes, normalizeBlankLines(source));
}

try {
  console.log("DCCExpressNext – Safe Cleanup Sprint 7 patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  patchLayout();
  patchWsApi();
  patchHttp();
  patchElementFactory();
  patchServerIndex();
  patchServerApp();
  patchServerPaths();
  patchLayoutRoutes();
  patchCommandCenterRoutes();

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
