#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();

const taskRuntimeStorePath = path.join(
  repoRoot,
  "server",
  "src",
  "services",
  "taskRuntimeStore.ts"
);

const commandCenterHandlerPath = path.join(
  repoRoot,
  "server",
  "src",
  "ws",
  "handlers",
  "wsCommandCenterMessageHandlers.ts"
);

function fail(message) {
  console.error("");
  console.error("❌ " + message);
  console.error("");
  process.exit(1);
}

function warn(message) {
  console.warn("⚠️  " + message);
}

function info(message) {
  console.log("✅ " + message);
}

function readFileOrFail(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(
      `Nem találom a fájlt: ${filePath}\n` +
      "A scriptet a DCCExpressNext repo gyökeréből futtasd."
    );
  }

  return fs.readFileSync(filePath, "utf8");
}

function writeIfChanged(filePath, original, next) {
  if (original === next) {
    info(`${path.relative(repoRoot, filePath)} nem változott.`);
    return;
  }

  fs.writeFileSync(filePath, next, "utf8");
  info(`${path.relative(repoRoot, filePath)} módosítva.`);
}

function findMatchingBrace(source, openBraceIndex) {
  let depth = 0;
  let inString = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = openBraceIndex; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === "\\") {
        escaped = true;
        continue;
      }

      if (ch === inString) {
        inString = null;
      }

      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }

    if (ch === "{") {
      depth += 1;
      continue;
    }

    if (ch === "}") {
      depth -= 1;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function replaceMethod(source, methodName, replacement) {
  const methodRegex = new RegExp(
    `\\n\\s*private\\s+${methodName}\\s*\\(`,
    "m"
  );

  const match = methodRegex.exec(source);

  if (!match) {
    return null;
  }

  const methodStart = match.index;
  const braceIndex = source.indexOf("{", match.index);

  if (braceIndex < 0) {
    return null;
  }

  const methodEnd = findMatchingBrace(source, braceIndex);

  if (methodEnd < 0) {
    return null;
  }

  return (
    source.slice(0, methodStart) +
    "\n" +
    replacement +
    source.slice(methodEnd + 1)
  );
}

function insertBeforeMethod(source, methodName, insertion) {
  const methodRegex = new RegExp(
    `\\n\\s*private\\s+${methodName}\\s*\\(`,
    "m"
  );

  const match = methodRegex.exec(source);

  if (!match) {
    return null;
  }

  return (
    source.slice(0, match.index) +
    "\n" +
    insertion +
    source.slice(match.index)
  );
}

function replaceCase(source, caseName, replacement) {
  const caseRegex = new RegExp(
    `\\n\\s*case\\s+["']${caseName}["']\\s*:\\s*\\{`,
    "m"
  );

  const match = caseRegex.exec(source);

  if (!match) {
    return null;
  }

  const caseStart = match.index;
  const braceIndex = source.indexOf("{", match.index);

  if (braceIndex < 0) {
    return null;
  }

  const caseEnd = findMatchingBrace(source, braceIndex);

  if (caseEnd < 0) {
    return null;
  }

  return (
    source.slice(0, caseStart) +
    "\n" +
    replacement +
    source.slice(caseEnd + 1)
  );
}

console.log("");
console.log("DCCExpressNext Task Loco Release + LocoState response fixer v3");
console.log("");

/**
 * ---------------------------------------------------------------------------
 * 1. taskRuntimeStore.ts
 * ---------------------------------------------------------------------------
 */
{
  let source = readFileOrFail(taskRuntimeStorePath);
  const original = source;

  if (!source.includes("private broadcastSyncedLocoState(")) {
    const helper = `  private broadcastSyncedLocoState(
    locoAddress: number
  ): void {
    const commandCenter =
      this.getSimulatorCommandCenter?.() ?? null;

    const loco =
      commandCenter?.getLocoInfo(locoAddress);

    if (!loco) {
      return;
    }

    this.broadcast?.({
      type: "locoState",
      data: {
        loco,
      },
    });
  }

`;

    const next =
      insertBeforeMethod(source, "releaseTaskLoco", helper) ??
      insertBeforeMethod(source, "persistTasks", helper);

    if (!next) {
      fail("Nem találok helyet a broadcastSyncedLocoState helper beszúrásához.");
    }

    source = next;
    info("broadcastSyncedLocoState helper hozzáadva.");
  } else {
    info("broadcastSyncedLocoState helper már létezik.");
  }

  const newReleaseTaskLoco = `  private releaseTaskLoco(task: TrainTask): void {
    const releasedAddresses =
      new Set<number>();

    const locoAddress =
      task.runtime.loco?.address ?? null;

    if (locoAddress !== null) {
      try {
        locoReservationStore.release(
          locoAddress,
          task.id
        );

        releasedAddresses.add(locoAddress);
      } catch (error) {
        console.warn(
          \`[TaskRuntimeStore] Task loco release failed for #\${locoAddress}:\`,
          error
        );
      }
    }

    /**
     * Biztonsági takarítás:
     * ha a task.runtime.loco már null, de a foglalás ownerId alapján
     * még bent maradt, akkor is engedjük el.
     */
    for (const released of locoReservationStore.releaseByOwner(task.id)) {
      releasedAddresses.add(released.locoAddress);
    }

    for (const releasedAddress of releasedAddresses) {
      this.broadcast?.({
        type: "locoReservationChanged",
        data: {
          locoAddress: releasedAddress,
          reservation: null,
        },
      });

      /**
       * A LocoPanel a LocoState.reservation mezőből dolgozik.
       * Release után ezért kötelező friss locoState is.
       */
      this.broadcastSyncedLocoState(releasedAddress);
    }

    task.runtime.loco = null;
  }
`;

  const replacedRelease =
    replaceMethod(source, "releaseTaskLoco", newReleaseTaskLoco);

  if (!replacedRelease) {
    fail("Nem találom a releaseTaskLoco metódust a taskRuntimeStore.ts-ben.");
  }

  source = replacedRelease;
  info("releaseTaskLoco robusztus release + locoState broadcast javítva.");

  /**
   * Reserve utáni locoState broadcast csak extra frissítés.
   * Ha nem találjuk meg a mintát, nem halunk el miatta.
   */
  if (!source.includes("this.broadcastSyncedLocoState(loco.address);")) {
    const looseNeedles = [
      `this.broadcast?.({
      type: "locoReservationChanged",
      data: {
        locoAddress: loco.address,
        reservation,
      },
    });`,
      `this.broadcast?.({
      type: "locoReservationChanged",
      data: {
        locoAddress: loco.address,
        reservation,
      }
    });`,
    ];

    let inserted = false;

    for (const needle of looseNeedles) {
      if (source.includes(needle)) {
        source = source.replace(
          needle,
          `${needle}

    this.broadcastSyncedLocoState(loco.address);`
        );
        inserted = true;
        break;
      }
    }

    if (inserted) {
      info("Task loco reserve után friss locoState broadcast hozzáadva.");
    } else {
      warn("A tryAssignLocoFromStartBlock reserve broadcast mintát nem találtam. Ezt kihagyom, a release/getLoco javítás ettől még megy.");
    }
  } else {
    info("Task loco reserve után már megy friss locoState broadcast.");
  }

  writeIfChanged(taskRuntimeStorePath, original, source);
}

/**
 * ---------------------------------------------------------------------------
 * 2. wsCommandCenterMessageHandlers.ts
 * ---------------------------------------------------------------------------
 */
{
  let source = readFileOrFail(commandCenterHandlerPath);
  const original = source;

  const getLocoReplacement = `    case "getLoco": {
      const {
        locoAddress,
      } = msg.data;

      commandCenter
        .getLoco(locoAddress)
        .then(loco => {
          log("getLoco result:", loco);

          const syncedLoco =
            commandCenter.getLocoInfo(locoAddress) ??
            loco;

          if (!syncedLoco) {
            return;
          }

          sendToClient(ws, {
            type: "locoState",
            data: {
              loco: syncedLoco,
            },
          });
        })
        .catch(err => {
          logError("Failed to get loco:", err);

          sendToClient(ws, {
            type: "error",
            data: {
              message: "Failed to get loco",
            },
          });
        });

      return true;
    }
`;

  if (!/case\s+["']getLoco["'][\s\S]*?type:\s*["']locoState["']/.test(source)) {
    const replaced =
      replaceCase(source, "getLoco", getLocoReplacement);

    if (!replaced) {
      fail("Nem találom a getLoco case-t.");
    }

    source = replaced;
    info("getLoco handler most visszaküldi a friss locoState-et.");
  } else {
    info("getLoco handler már küld locoState-et.");
  }

  if (!source.includes("const syncedLocoForSetLoco =")) {
    const marker = `log("Set loco result:", success);`;

    const idx = source.indexOf(marker);
    if (idx < 0) {
      warn("Nem találom a setLoco success log sort, ezt a broadcast javítást kihagyom.");
    } else {
      const insertAfter = idx + marker.length;
      const insert = `

          if (success) {
            const syncedLocoForSetLoco =
              commandCenter.getLocoInfo(locoAddress);

            if (syncedLocoForSetLoco) {
              broadcast({
                type: "locoState",
                data: {
                  loco: syncedLocoForSetLoco,
                },
              });
            }
          }`;

      source =
        source.slice(0, insertAfter) +
        insert +
        source.slice(insertAfter);

      info("setLoco siker után friss locoState broadcast hozzáadva.");
    }
  } else {
    info("setLoco siker után már van friss locoState broadcast.");
  }

  if (!source.includes("const syncedLocoForFunction =")) {
    const marker = `log("Set loco function result:", success);`;

    const idx = source.indexOf(marker);
    if (idx < 0) {
      warn("Nem találom a setLocoFunction success log sort, ezt a broadcast javítást kihagyom.");
    } else {
      const insertAfter = idx + marker.length;
      const insert = `

          if (success) {
            const syncedLocoForFunction =
              commandCenter.getLocoInfo(locoAddress);

            if (syncedLocoForFunction) {
              broadcast({
                type: "locoState",
                data: {
                  loco: syncedLocoForFunction,
                },
              });
            }
          }`;

      source =
        source.slice(0, insertAfter) +
        insert +
        source.slice(insertAfter);

      info("setLocoFunction siker után friss locoState broadcast hozzáadva.");
    }
  } else {
    info("setLocoFunction siker után már van friss locoState broadcast.");
  }

  writeIfChanged(commandCenterHandlerPath, original, source);
}

console.log("");
console.log("🎉 Kész, öcsém!");
console.log("");
console.log("Most futtasd:");
console.log("");
console.log("  npm run build");
console.log("");
