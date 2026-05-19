#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  helpers: path.join(
    ROOT,
    "client/src/components/tasks/taskUiHelpers.ts"
  ),
  controllerTab: path.join(
    ROOT,
    "client/src/components/control-panel/ControllerTab.tsx"
  ),
  taskManagerDialog: path.join(
    ROOT,
    "client/src/components/common/TaskManagerDialog.tsx"
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
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Írva: ${path.relative(ROOT, file)}`);
}

function getEol(source) {
  return source.includes("\r\n") ? "\r\n" : "\n";
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

function removeNamedFunction(source, functionName, label) {
  const pattern = new RegExp(
    String.raw`^[ \t]*function[ \t]+${functionName}[ \t]*\(`,
    "m"
  );

  const match = pattern.exec(source);

  if (!match) {
    fail(`${label}: nem találtam ezt a függvényt: ${functionName}`);
  }

  const start = match.index;
  const openBrace = source.indexOf("{", start);

  if (openBrace < 0) {
    fail(`${label}: nem találtam nyitó kapcsos zárójelet: ${functionName}`);
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

        return source.slice(0, start) + source.slice(end);
      }
    }
  }

  fail(`${label}: nem találtam a függvény végét: ${functionName}`);
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    fail(`${label}: nem találtam a keresett mintát.`);
  }

  return source.replace(search, replacement);
}

const HELPERS = `// client/src/components/tasks/taskUiHelpers.ts

import type {
  TrainTask,
  TrainTaskStatus,
} from "../../services/tasks/TaskTypes";

export function getTaskStatusColor(
  status: TrainTaskStatus
): string {
  switch (status) {
    case "queued":
      return "gray";
    case "running":
      return "green";
    case "paused":
      return "yellow";
    case "finishing":
      return "orange";
    case "aborted":
      return "red";
    case "completed":
      return "blue";
    case "error":
      return "red";
  }
}

export function getTaskStatusLabel(
  status: TrainTaskStatus
): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "paused":
      return "Paused";
    case "finishing":
      return "Finishing";
    case "aborted":
      return "Aborted";
    case "completed":
      return "Completed";
    case "error":
      return "Error";
  }
}

export function getTaskProgressLabel(
  task: TrainTask
): string {
  if (task.status === "completed") {
    return "Megérkezett";
  }

  if (task.status === "aborted") {
    return "Megszakítva";
  }

  switch (task.runtime.simulation.phase) {
    case "waitingForLoco":
      return "Mozdonyra vár";
    case "waitingForRoute":
      return "Útvonal foglalására vár";
    case "waitingForBlockSensor": {
      const sensorAddress =
        task.runtime.simulation.waitingSensorAddress;

      return sensorAddress && sensorAddress > 0
        ? \`Sensor #\${sensorAddress} felszabadulására vár\`
        : "A következő blokk felszabadulására vár";
    }
    case "departing":
      return "Indulási szakasz";
    case "transit":
      return "Két blokk között halad";
  }

  if (task.runtime.inTransit) {
    return "Két blokk között halad";
  }

  if (task.runtime.hasLeftFromBlock) {
    return "Elhagyta az induló blokkot";
  }

  switch (task.status) {
    case "queued":
      return "Indításra vár";
    case "running":
      return "Futás alatt";
    case "paused":
      return "Szüneteltetve";
    case "finishing":
      return "Befejezés alatt";
    case "error":
      return "Hiba";
  }
}

export function getTaskProgressColor(
  task: TrainTask
): string {
  if (task.runtime.simulation.phase === "waitingForBlockSensor") {
    return "yellow";
  }

  if (task.status === "completed") {
    return "blue";
  }

  if (task.status === "aborted") {
    return "red";
  }

  if (task.runtime.inTransit) {
    return "red";
  }

  if (task.runtime.hasLeftFromBlock) {
    return "orange";
  }

  switch (task.status) {
    case "running":
      return "green";
    case "paused":
      return "yellow";
    case "finishing":
      return "orange";
    case "error":
      return "red";
    default:
      return "gray";
  }
}
`;

function patchControllerTab() {
  let source = read(FILES.controllerTab);
  const eol = getEol(source);

  if (!source.includes('../../components/tasks/taskUiHelpers')) {
    const marker =
      'import FastClockCard from "../common/FastClockCard";';

    const insertion = [
      "",
      'import {',
      '  getTaskProgressColor,',
      '  getTaskProgressLabel,',
      '  getTaskStatusColor,',
      '  getTaskStatusLabel,',
      '} from "../tasks/taskUiHelpers";',
    ].join(eol);

    source = insertAfter(
      source,
      marker,
      insertion,
      "ControllerTab task helper import"
    );
  }

  source = source.replace(
    'import { TrainTask, TrainTaskStatus } from "../../services/tasks/TaskTypes";',
    'import { TrainTask } from "../../services/tasks/TaskTypes";'
  );

  if (source.includes("function getStatusColor(")) {
    source = removeNamedFunction(
      source,
      "getStatusColor",
      "ControllerTab getStatusColor"
    );
  }

  if (source.includes("function getStatusLabel(")) {
    source = removeNamedFunction(
      source,
      "getStatusLabel",
      "ControllerTab getStatusLabel"
    );
  }

  if (source.includes("function getTaskProgressLabel(")) {
    source = removeNamedFunction(
      source,
      "getTaskProgressLabel",
      "ControllerTab getTaskProgressLabel"
    );
  }

  if (source.includes("function getProgressColor(")) {
    source = removeNamedFunction(
      source,
      "getProgressColor",
      "ControllerTab getProgressColor"
    );
  }

  source = source.replaceAll(
    "getStatusColor(",
    "getTaskStatusColor("
  );

  source = source.replaceAll(
    "getStatusLabel(",
    "getTaskStatusLabel("
  );

  source = source.replaceAll(
    "getProgressColor(",
    "getTaskProgressColor("
  );

  write(FILES.controllerTab, source);
}

function patchTaskManagerDialog() {
  let source = read(FILES.taskManagerDialog);
  const eol = getEol(source);

  if (!source.includes('../../components/tasks/taskUiHelpers')) {
    const marker = [
      'import {',
      '    showErrorMessage,',
      '    showOkMessage,',
      '    showWarningMessage,',
      '} from "../../helpers";',
    ].join(eol);

    const insertion = [
      "",
      'import {',
      '    getTaskStatusColor,',
      '    getTaskStatusLabel,',
      '} from "../tasks/taskUiHelpers";',
    ].join(eol);

    source = insertAfter(
      source,
      marker,
      insertion,
      "TaskManagerDialog task helper import"
    );
  }

  source = source.replace(
    [
      'import type {',
      '    TrainTask,',
      '    TrainTaskStatus,',
      '} from "../../services/tasks/TaskTypes";',
    ].join(eol),
    [
      'import type {',
      '    TrainTask,',
      '} from "../../services/tasks/TaskTypes";',
    ].join(eol)
  );

  if (source.includes("function getStatusColor(")) {
    source = removeNamedFunction(
      source,
      "getStatusColor",
      "TaskManagerDialog getStatusColor"
    );
  }

  if (source.includes("function getStatusLabel(")) {
    source = removeNamedFunction(
      source,
      "getStatusLabel",
      "TaskManagerDialog getStatusLabel"
    );
  }

  source = source.replaceAll(
    "getStatusColor(",
    "getTaskStatusColor("
  );

  source = source.replaceAll(
    "getStatusLabel(",
    "getTaskStatusLabel("
  );

  write(FILES.taskManagerDialog, source);
}

try {
  console.log("DCCExpressNext – Task UI helper refactor patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  write(FILES.helpers, HELPERS);
  patchControllerTab();
  patchTaskManagerDialog();

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
