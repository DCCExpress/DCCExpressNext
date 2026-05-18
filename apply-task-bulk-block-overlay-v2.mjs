#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const files = {
  taskRuntimeStore: path.join(ROOT, "server/src/services/taskRuntimeStore.ts"),
  taskRoutes: path.join(ROOT, "server/src/routes/taskRoutes.ts"),
  http: path.join(ROOT, "client/src/api/http.ts"),
  taskManager: path.join(ROOT, "client/src/services/tasks/TaskManager.ts"),
  taskManagerDialog: path.join(ROOT, "client/src/components/common/TaskManagerDialog.tsx"),
  controlPanel: path.join(ROOT, "client/src/components/ControlPanel.tsx"),
  blockElement: path.join(ROOT, "client/src/models/editor/elements/BlockElement.ts"),
};

function eolOf(s) {
  return s.includes("\r\n") ? "\r\n" : "\n";
}

function assertExists(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Hiányzó fájl: ${path.relative(ROOT, file)}`);
  }
}

function read(file) {
  assertExists(file);
  return fs.readFileSync(file, "utf8");
}

function backup(file) {
  const backupPath = `${file}.bak-task-bulk-block-overlay-v2`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(file, backupPath);
  }
}

function write(file, content) {
  backup(file);
  fs.writeFileSync(file, content, "utf8");
  console.log(`✓ Frissítve: ${path.relative(ROOT, file)}`);
}

function replaceRegexOnce(source, regex, replacement, label) {
  const matches = source.match(regex);
  if (!matches) {
    throw new Error(`${label}: nem találtam a keresett mintát.`);
  }
  return source.replace(regex, replacement);
}

function insertBeforeRegexOnce(source, regex, insertion, label) {
  const matches = source.match(regex);
  if (!matches) {
    throw new Error(`${label}: nem találtam a beszúrási pontot.`);
  }
  return source.replace(regex, `${insertion}$&`);
}

function already(source, needle, label) {
  if (source.includes(needle)) {
    console.log(`• Már benne van: ${label}`);
    return TrueLike;
  }
  return false;
}
const TrueLike = true;

function patchTaskRuntimeStore() {
  const file = files.taskRuntimeStore;
  let s = read(file);
  const nl = eolOf(s);

  if (!s.includes("async startAllTasks(")) {
    const method = [
      "  async startAllTasks(): Promise<TaskManagerActionResult> {",
      "    await this.initialize();",
      "",
      "    for (const task of this.tasks) {",
      "      if (",
      '        task.status === "queued" ||',
      '        task.status === "stopped" ||',
      '        task.status === "completed"',
      "      ) {",
      "        await this.startTask(task.id);",
      "        continue;",
      "      }",
      "",
      '      if (task.status === "paused") {',
      "        await this.resumeTask(task.id);",
      "      }",
      "    }",
      "",
      "    this.broadcastSnapshot();",
      "",
      "    return this.actionOk();",
      "  }",
      "",
    ].join(nl);

    s = insertBeforeRegexOnce(
      s,
      /  async stopTask\(/,
      method,
      "TaskRuntimeStore.startAllTasks"
    );
  } else {
    console.log("• Már benne van: TaskRuntimeStore.startAllTasks");
  }

  write(file, s);
}

function patchTaskRoutes() {
  const file = files.taskRoutes;
  let s = read(file);
  const nl = eolOf(s);

  if (!s.includes('router.post("/start-all"')) {
    const route = [
      '  router.post("/start-all", async (_req, res) => {',
      "    const result =",
      "      await taskRuntimeStore.startAllTasks();",
      "",
      "    res.status(result.ok ? 200 : 400).json(result);",
      "  });",
      "",
    ].join(nl);

    s = insertBeforeRegexOnce(
      s,
      /  router\.post\("\/stop-all", async \(_req, res\) => \{/,
      route,
      "taskRoutes /start-all"
    );
  } else {
    console.log("• Már benne van: POST /api/tasks/start-all");
  }

  write(file, s);
}

function patchHttp() {
  const file = files.http;
  let s = read(file);
  const nl = eolOf(s);

  if (!s.includes("export async function startAllTrainTasks()")) {
    const fn = [
      "export async function startAllTrainTasks(): Promise<TaskManagerActionResult> {",
      '  const res = await fetch("/api/tasks/start-all", {',
      '    method: "POST",',
      "  });",
      "",
      "  return readTaskResponse<TaskManagerActionResult>(",
      "    res,",
      '    "Failed to start all tasks"',
      "  );",
      "}",
      "",
    ].join(nl);

    s = insertBeforeRegexOnce(
      s,
      /export async function stopAllTrainTasks\(\): Promise<TaskManagerActionResult> \{/,
      fn,
      "http.startAllTrainTasks"
    );
  } else {
    console.log("• Már benne van: http.startAllTrainTasks");
  }

  write(file, s);
}

function patchTaskManager() {
  const file = files.taskManager;
  let s = read(file);
  const nl = eolOf(s);

  if (!s.includes("startAllTrainTasks,")) {
    s = replaceRegexOnce(
      s,
      /  saveTrainTasks,\r?\n  startTrainTask,\r?\n  stopTrainTask,/,
      [
        "  saveTrainTasks,",
        "  startAllTrainTasks,",
        "  startTrainTask,",
        "  stopAllTrainTasks,",
        "  stopTrainTask,"
      ].join(nl),
      "TaskManager import bővítés"
    );
  } else {
    console.log("• Már benne van: TaskManager startAll/stopAll import");
  }

  if (!s.includes('import { layoutStore } from "../layoutStore";')) {
    s = replaceRegexOnce(
      s,
      /import \{ wsClient \} from "\.\.\/wsClient";/,
      [
        'import { wsClient } from "../wsClient";',
        'import { layoutStore } from "../layoutStore";',
        'import { BlockElement } from "../../models/editor/elements/BlockElement";',
      ].join(nl),
      "TaskManager layoutStore/BlockElement import"
    );
  } else {
    console.log("• Már benne van: TaskManager layoutStore import");
  }

  if (!s.includes("async startAllTasks(): Promise<TaskManagerActionResult>")) {
    const methods = [
      "  async startAllTasks(): Promise<TaskManagerActionResult> {",
      "    const result =",
      "      await startAllTrainTasks();",
      "",
      "    if (result.snapshot) {",
      "      this.setSnapshot(result.snapshot);",
      "    }",
      "",
      "    return result;",
      "  }",
      "",
      "  async stopAllTasks(): Promise<TaskManagerActionResult> {",
      "    const result =",
      "      await stopAllTrainTasks();",
      "",
      "    if (result.snapshot) {",
      "      this.setSnapshot(result.snapshot);",
      "    }",
      "",
      "    return result;",
      "  }",
      "",
    ].join(nl);

    s = insertBeforeRegexOnce(
      s,
      /  async saveTasks\(\): Promise<TaskManagerActionResult> \{/,
      methods,
      "TaskManager bulk metódusok"
    );
  } else {
    console.log("• Már benne van: TaskManager.startAllTasks/stopAllTasks");
  }

  if (!s.includes("private applyTransitBlockOverlay(")) {
    const helper = [
      "  private applyTransitBlockOverlay(",
      "    snapshot: TaskManagerSnapshot",
      "  ): void {",
      "    const layout =",
      "      layoutStore.getLayout();",
      "",
      "    if (!layout) {",
      "      return;",
      "    }",
      "",
      "    let changed = false;",
      "",
      "    for (const element of layout.getAllElements()) {",
      "      if (",
      "        element instanceof BlockElement &&",
      "        element.runtimeTransitLocoAddress !== 0",
      "      ) {",
      "        element.runtimeTransitLocoAddress = 0;",
      "        changed = true;",
      "      }",
      "    }",
      "",
      "    for (const task of snapshot.tasks) {",
      "      if (",
      '        task.status !== "running" &&',
      '        task.status !== "paused"',
      "      ) {",
      "        continue;",
      "      }",
      "",
      "      const simulation =",
      "        task.runtime.simulation;",
      "",
      '      if (simulation.phase !== "transit") {',
      "        continue;",
      "      }",
      "",
      "      const locoAddress =",
      "        task.runtime.loco?.address ?? 0;",
      "",
      "      if (locoAddress <= 0) {",
      "        continue;",
      "      }",
      "",
      "      for (const blockId of [",
      "        simulation.fromBlockId,",
      "        simulation.toBlockId,",
      "      ]) {",
      "        if (!blockId) {",
      "          continue;",
      "        }",
      "",
      "        const element =",
      "          layout.getElementById(blockId);",
      "",
      "        if (!(element instanceof BlockElement)) {",
      "          continue;",
      "        }",
      "",
      "        if (element.runtimeTransitLocoAddress !== locoAddress) {",
      "          element.runtimeTransitLocoAddress = locoAddress;",
      "          changed = true;",
      "        }",
      "      }",
      "    }",
      "",
      "    if (changed) {",
      "      layoutStore.setLayout(layout);",
      "    }",
      "  }",
      "",
    ].join(nl);

    s = insertBeforeRegexOnce(
      s,
      /  private setSnapshot\(snapshot: TaskManagerSnapshot\): void \{/,
      helper,
      "TaskManager transit overlay"
    );
  } else {
    console.log("• Már benne van: TaskManager transit overlay");
  }

  if (!s.includes("this.applyTransitBlockOverlay(this.snapshot);")) {
    s = replaceRegexOnce(
      s,
      /  private setSnapshot\(snapshot: TaskManagerSnapshot\): void \{\r?\n    this\.snapshot = cloneSnapshot\(snapshot\);\r?\n    this\.emitChange\(\);\r?\n  \}/,
      [
        "  private setSnapshot(snapshot: TaskManagerSnapshot): void {",
        "    this.snapshot = cloneSnapshot(snapshot);",
        "    this.applyTransitBlockOverlay(this.snapshot);",
        "    this.emitChange();",
        "  }",
      ].join(nl),
      "TaskManager setSnapshot overlay hívás"
    );
  } else {
    console.log("• Már benne van: TaskManager setSnapshot overlay hívás");
  }

  if (!s.includes("simulation: {\n          ...task.runtime.simulation,") &&
      !s.includes("simulation: {\r\n          ...task.runtime.simulation,")) {
    s = replaceRegexOnce(
      s,
      /      runtime: \{\r?\n        \.\.\.task\.runtime,\r?\n        \.\.\.\(task\.runtime\.loco/,
      [
        "      runtime: {",
        "        ...task.runtime,",
        "        simulation: {",
        "          ...task.runtime.simulation,",
        "        },",
        "        ...(task.runtime.loco",
      ].join(nl),
      "TaskManager cloneSnapshot simulation mély klón"
    );
  } else {
    console.log("• Már benne van: cloneSnapshot simulation mély klón");
  }

  write(file, s);
}

function patchTaskManagerDialog() {
  const file = files.taskManagerDialog;
  let s = read(file);
  const nl = eolOf(s);

  if (!s.includes("const handleStartAllTasks = async () =>")) {
    const handlers = [
      "    const handleStartAllTasks = async () => {",
      "        setActionError(null);",
      "",
      "        const result =",
      "            await taskManager.startAllTasks();",
      "",
      "        if (!result.ok) {",
      "            setActionError(result.error);",
      '            showErrorMessage("ERROR", result.error);',
      "            return;",
      "        }",
      "",
      '        showOkMessage("SUCCESSFUL", "All tasks started.");',
      "    };",
      "",
      "    const handleStopAllTasks = async () => {",
      "        setActionError(null);",
      "",
      "        const result =",
      "            await taskManager.stopAllTasks();",
      "",
      "        if (!result.ok) {",
      "            setActionError(result.error);",
      '            showErrorMessage("ERROR", result.error);',
      "            return;",
      "        }",
      "",
      '        showOkMessage("SUCCESSFUL", "All tasks stopped.");',
      "    };",
      "",
    ].join(nl);

    s = insertBeforeRegexOnce(
      s,
      /    const handleSaveTasks = async \(\) => \{/,
      handlers,
      "TaskManagerDialog bulk handler"
    );
  } else {
    console.log("• Már benne van: TaskManagerDialog bulk handlerek");
  }

  if (!s.includes(">Start all<")) {
    s = replaceRegexOnce(
      s,
      /(<Button[\s\S]*?onClick=\{\(\) => setAddTaskOpened\(true\)\}[\s\S]*?>\s*Add task\s*<\/Button>\s*)/,
      `$1${nl}                                <Button${nl}                                    size="xs"${nl}                                    variant="light"${nl}                                    color="green"${nl}                                    leftSection={<IconPlayerPlay size={16} />}${nl}                                    onClick={() => {${nl}                                        void handleStartAllTasks();${nl}                                    }}${nl}                                    disabled={snapshot.tasks.length === 0}${nl}                                >${nl}                                    Start all${nl}                                </Button>${nl}${nl}                                <Button${nl}                                    size="xs"${nl}                                    variant="light"${nl}                                    color="red"${nl}                                    leftSection={<IconPlayerStop size={16} />}${nl}                                    onClick={() => {${nl}                                        void handleStopAllTasks();${nl}                                    }}${nl}                                    disabled={snapshot.tasks.length === 0}${nl}                                >${nl}                                    Stop all${nl}                                </Button>${nl}${nl}`,
      "TaskManagerDialog Start all / Stop all gombok"
    );
  } else {
    console.log("• Már benne van: TaskManagerDialog Start all / Stop all gombok");
  }

  write(file, s);
}

function patchControlPanel() {
  const file = files.controlPanel;
  let s = read(file);
  const nl = eolOf(s);

  if (!s.includes("const handleStartAllTasks = async () =>")) {
    const handlers = [
      "  const handleStartAllTasks = async () => {",
      "    const result =",
      "      await taskManager.startAllTasks();",
      "",
      "    if (!result.ok) {",
      '      showErrorMessage("ERROR", result.error);',
      "      return;",
      "    }",
      "",
      '    showOkMessage("SUCCESSFUL", "All tasks started.");',
      "  };",
      "",
      "  const handleStopAllTasks = async () => {",
      "    const result =",
      "      await taskManager.stopAllTasks();",
      "",
      "    if (!result.ok) {",
      '      showErrorMessage("ERROR", result.error);',
      "      return;",
      "    }",
      "",
      '    showOkMessage("SUCCESSFUL", "All tasks stopped.");',
      "  };",
      "",
    ].join(nl);

    s = insertBeforeRegexOnce(
      s,
      /  function getStatusColor\(status: TrainTaskStatus\): string \{/,
      handlers,
      "ControlPanel bulk task handler"
    );
  } else {
    console.log("• Már benne van: ControlPanel bulk handlerek");
  }

  if (!s.includes(">Start all tasks<")) {
    s = replaceRegexOnce(
      s,
      /(<Button[\s\S]*?onClick=\{\(\) => setTaskManagerOpened\(true\)\}[\s\S]*?>\s*Task Manager\.\.\.\s*<\/Button>\s*)/,
      `$1${nl}          <Group grow>${nl}            <Button${nl}              size="xs"${nl}              variant="light"${nl}              color="green"${nl}              leftSection={<IconPlayerPlay size={16} />}${nl}              onClick={() => {${nl}                void handleStartAllTasks();${nl}              }}${nl}              disabled={snapshot.tasks.length === 0}${nl}            >${nl}              Start all tasks${nl}            </Button>${nl}${nl}            <Button${nl}              size="xs"${nl}              variant="light"${nl}              color="red"${nl}              leftSection={<IconPlayerStop size={16} />}${nl}              onClick={() => {${nl}                void handleStopAllTasks();${nl}              }}${nl}              disabled={snapshot.tasks.length === 0}${nl}            >${nl}              Stop all tasks${nl}            </Button>${nl}          </Group>${nl}${nl}`,
      "ControlPanel Start all tasks / Stop all tasks gombok"
    );
  } else {
    console.log("• Már benne van: ControlPanel bulk gombok");
  }

  if (!s.includes('case "waitingForRoute":')) {
    s = replaceRegexOnce(
      s,
      /  function getTaskProgressLabel\(task: TrainTask\): string \{\r?\n    if \(task\.status === "completed"\) \{\r?\n      return "Megérkezett";\r?\n    \}\r?\n\r?\n    if \(task\.runtime\.inTransit\) \{\r?\n      return "Két blokk között halad";\r?\n    \}\r?\n\r?\n    if \(task\.runtime\.hasLeftFromBlock\) \{\r?\n      return "Elhagyta az induló blokkot";\r?\n    \}\r?\n\r?\n    switch \(task\.status\) \{/,
      [
        "  function getTaskProgressLabel(task: TrainTask): string {",
        '    if (task.status === "completed") {',
        '      return "Megérkezett";',
        "    }",
        "",
        "    switch (task.runtime.simulation.phase) {",
        '      case "waitingForLoco":',
        '        return "Mozdonyra vár";',
        '      case "waitingForRoute":',
        '        return "Útvonal foglalására vár";',
        '      case "departing":',
        '        return "Indulási szakasz";',
        '      case "transit":',
        '        return "Két blokk között halad";',
        "    }",
        "",
        "    if (task.runtime.inTransit) {",
        '      return "Két blokk között halad";',
        "    }",
        "",
        "    if (task.runtime.hasLeftFromBlock) {",
        '      return "Elhagyta az induló blokkot";',
        "    }",
        "",
        "    switch (task.status) {",
      ].join(nl),
      "ControlPanel progress label finomítás"
    );
  } else {
    console.log("• Már benne van: ControlPanel waitingForRoute progress");
  }

  write(file, s);
}

function patchBlockElement() {
  const file = files.blockElement;
  let s = read(file);
  const nl = eolOf(s);

  if (!s.includes("runtimeTransitLocoAddress: number = 0;")) {
    s = replaceRegexOnce(
      s,
      /    locoAddress: number = 0;\r?\n    length: number = 1;/,
      [
        "    locoAddress: number = 0;",
        "",
        "    /**",
        "     * Csak kliensoldali, átmeneti overlay:",
        "     * ha a task két blokk között halad,",
        "     * mindkét érintett blokkban ezt a címet mutatjuk.",
        "     */",
        "    runtimeTransitLocoAddress: number = 0;",
        "",
        "    length: number = 1;",
      ].join(nl),
      "BlockElement runtimeTransitLocoAddress"
    );
  } else {
    console.log("• Már benne van: BlockElement.runtimeTransitLocoAddress");
  }

  const drawRegex = /    draw\(ctx: CanvasRenderingContext2D, options\?: DrawOptions\): void \{[\s\S]*?\r?\n    \}\r?\n\r?\n    override getBounds\(\): IRect \{/m;
  const match = s.match(drawRegex);
  if (!match) {
    throw new Error("BlockElement.draw metódust nem találtam.");
  }

  let drawBlock = match[0];
  if (!drawBlock.includes("const displayLocoAddress =")) {
    drawBlock = drawBlock.replace(
      /        const bg = options\?\.darkMode \? "#888888" : "#f0f0f0";\r?\n        const fg = "black";/,
      [
        "        const occupied =",
        "            this.locoAddress > 0;",
        "",
        "        const inTransit =",
        "            !occupied &&",
        "            this.runtimeTransitLocoAddress > 0;",
        "",
        "        const bg = occupied",
        '            ? (options?.darkMode ? "#7f1d1d" : "#ffc9c9")',
        "            : inTransit",
        '                ? (options?.darkMode ? "#8a5a00" : "#ffe8a3")',
        "                : options?.darkMode",
        '                    ? "#888888"',
        '                    : "#f0f0f0";',
        "",
        '        const fg = "black";',
        "",
        "        const displayLocoAddress =",
        "            occupied",
        "                ? this.locoAddress",
        "                : this.runtimeTransitLocoAddress;",
      ].join(nl)
    );

    drawBlock = drawBlock.replaceAll(
      "if (this.locoAddress <= 0)",
      "if (displayLocoAddress <= 0)"
    );

    drawBlock = drawBlock.replaceAll(
      "if (this.locoAddress > 0)",
      "if (displayLocoAddress > 0)"
    );

    drawBlock = drawBlock.replaceAll(
      "l => l.address === this.locoAddress",
      "l => l.address === displayLocoAddress"
    );

    drawBlock = drawBlock.replaceAll(
      '"#" + this.locoAddress.toString()',
      '"#" + displayLocoAddress.toString()'
    );

    drawBlock = drawBlock.replaceAll(
      "this.locoAddress.toString(),",
      "displayLocoAddress.toString(),"
    );

    s = s.replace(drawRegex, drawBlock);
  } else {
    console.log("• Már benne van: BlockElement háttérszínezés/transit address");
  }

  write(file, s);
}

function run() {
  console.log("DCCExpressNext – bulk task controls + block occupancy overlay patch V2");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  patchTaskRuntimeStore();
  patchTaskRoutes();
  patchHttp();
  patchTaskManager();
  patchTaskManagerDialog();
  patchControlPanel();
  patchBlockElement();

  console.log("");
  console.log("Kész.");
  console.log("A módosított fájlokról .bak-task-bulk-block-overlay-v2 mentés készült.");
}

try {
  run();
} catch (error) {
  console.error("");
  console.error("PATCH HIBA:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
