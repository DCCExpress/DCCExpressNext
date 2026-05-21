#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();

const uiStatePath = path.join(
  repoRoot,
  "client",
  "src",
  "hooks",
  "layout",
  "useLayoutPageUiState.ts"
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

if (!fs.existsSync(uiStatePath)) {
  fail(`Nem találom a fájlt: ${uiStatePath}`);
}

console.log("");
console.log("DCCExpressNext RuntimeVariable editor.editMode wire fixer v4");
console.log("");

const before = fs.readFileSync(uiStatePath, "utf8");

const after = '// client/src/hooks/layout/useLayoutPageUiState.ts\n\nimport {\n  useEffect,\n  useState,\n  type Dispatch,\n  type SetStateAction,\n} from "react";\n\nimport {\n  useRuntimeVariable,\n} from "../useRuntimeVariable";\n\nconst LOCO_PANEL_COLLAPSED_KEY =\n  "dcc-express.editor.locoPanelCollapsed";\n\nconst PROPERTY_PANEL_COLLAPSED_KEY =\n  "dcc-express.editor.propertyPanelCollapsed";\n\ntype BooleanSetter =\n  Dispatch<SetStateAction<boolean>>;\n\nexport type UseLayoutPageUiStateResult = {\n  editMode: boolean;\n  setEditMode: BooleanSetter;\n  locoPanelCollapsed: boolean;\n  setLocoPanelCollapsed: BooleanSetter;\n  propertyPanelCollapsed: boolean;\n  setPropertyPanelCollapsed: BooleanSetter;\n};\n\nfunction readStoredBoolean(\n  key: string,\n  fallback: boolean\n): boolean {\n  try {\n    const raw =\n      localStorage.getItem(key);\n\n    return raw === null\n      ? fallback\n      : raw === "true";\n  } catch {\n    return fallback;\n  }\n}\n\nfunction writeStoredBoolean(\n  key: string,\n  value: boolean\n): void {\n  try {\n    localStorage.setItem(\n      key,\n      String(value)\n    );\n  } catch {\n    // Storage unavailable; ignore.\n  }\n}\n\nexport function useLayoutPageUiState(): UseLayoutPageUiStateResult {\n  /**\n   * Server-authoritative shared runtime state.\n   *\n   * A kliens csak kérést küld, a tényleges érték akkor frissül,\n   * amikor a szerver runtimeVariableChanged üzenettel visszaigazolja.\n   */\n  const [\n    editMode,\n    setEditMode,\n  ] =\n    useRuntimeVariable("editor.editMode");\n\n  const [\n    locoPanelCollapsed,\n    setLocoPanelCollapsed,\n  ] =\n    useState<boolean>(() =>\n      readStoredBoolean(\n        LOCO_PANEL_COLLAPSED_KEY,\n        false\n      )\n    );\n\n  const [\n    propertyPanelCollapsed,\n    setPropertyPanelCollapsed,\n  ] =\n    useState<boolean>(() =>\n      readStoredBoolean(\n        PROPERTY_PANEL_COLLAPSED_KEY,\n        false\n      )\n    );\n\n  useEffect(() => {\n    writeStoredBoolean(\n      LOCO_PANEL_COLLAPSED_KEY,\n      locoPanelCollapsed\n    );\n  }, [locoPanelCollapsed]);\n\n  useEffect(() => {\n    writeStoredBoolean(\n      PROPERTY_PANEL_COLLAPSED_KEY,\n      propertyPanelCollapsed\n    );\n  }, [propertyPanelCollapsed]);\n\n  return {\n    editMode,\n    setEditMode,\n    locoPanelCollapsed,\n    setLocoPanelCollapsed,\n    propertyPanelCollapsed,\n    setPropertyPanelCollapsed,\n  };\n}\n';

if (before === after) {
  info("useLayoutPageUiState.ts már a tiszta RuntimeVariable verzió.");
} else {
  fs.writeFileSync(uiStatePath, after, "utf8");
  info("client/src/hooks/layout/useLayoutPageUiState.ts teljesen lecserélve.");
}

console.log("");
console.log("🎉 Kész, öcsém!");
console.log("");
console.log("Ez a v4 nem keres lokális editMode blokkot.");
console.log("Teljesen tiszta fájlt ír:");
console.log("- editMode: useRuntimeVariable(\"editor.editMode\")");
console.log("- locoPanelCollapsed/propertyPanelCollapsed: marad localStorage");
console.log("");
console.log("Most futtasd:");
console.log("");
console.log("  npm run build");
console.log("");
