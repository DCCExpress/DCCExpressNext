#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTROL_PANEL = path.join(
  ROOT,
  "client/src/components/ControlPanel.tsx"
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

function sliceBetween(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);

  if (start < 0) {
    fail(`${label}: nem találtam a kezdő markert.`);
  }

  const end = source.indexOf(endMarker, start + startMarker.length);

  if (end < 0) {
    fail(`${label}: nem találtam a záró markert.`);
  }

  return {
    start,
    end,
    text: source.slice(start, end),
  };
}

function patchImports(source, eol) {
  if (!source.includes("  ActionIcon,")) {
    source = replaceOnce(
      source,
      [
        "import {",
        "  Badge,",
      ].join(eol),
      [
        "import {",
        "  ActionIcon,",
        "  Badge,",
      ].join(eol),
      "Mantine ActionIcon import"
    );
  }

  if (!source.includes("  Collapse,")) {
    source = replaceOnce(
      source,
      "  Card,",
      [
        "  Card,",
        "  Collapse,",
      ].join(eol),
      "Mantine Collapse import"
    );
  }

  if (!source.includes("  Tooltip,")) {
    source = replaceOnce(
      source,
      "  TextInput",
      [
        "  TextInput,",
        "  Tooltip",
      ].join(eol),
      "Mantine Tooltip import"
    );
  }

  if (!source.includes("  IconChevronDown,")) {
    source = replaceOnce(
      source,
      "  IconCheck,",
      [
        "  IconCheck,",
        "  IconChevronDown,",
      ].join(eol),
      "IconChevronDown import"
    );
  }

  return source;
}

function patchStorageKeys(source, eol) {
  if (
    source.includes("ROUTE_TASK_CONTROL_COLLAPSED_KEY") &&
    source.includes("TASK_LIST_COLLAPSED_KEY")
  ) {
    return source;
  }

  const marker =
    'const DEFAULT_CONTROL_PANEL_TAB = "command-center";';

  const insertion = [
    "",
    'const ROUTE_TASK_CONTROL_COLLAPSED_KEY =',
    '  "dcc-express.controller.route-task-control.collapsed";',
    "",
    'const TASK_LIST_COLLAPSED_KEY =',
    '  "dcc-express.controller.task-list.collapsed";',
  ].join(eol);

  return insertAfter(
    source,
    marker,
    insertion,
    "Controller card localStorage kulcsok"
  );
}

function patchControllerState(source, eol) {
  if (
    source.includes("routeTaskControlCollapsed") &&
    source.includes("taskListCollapsed")
  ) {
    return source;
  }

  const marker =
    '  const [toBlockName, setToBlockName] = useState("C1");';

  const insertion = [
    "",
    "",
    "  const [routeTaskControlCollapsed, setRouteTaskControlCollapsed] =",
    "    useState<boolean>(() =>",
    "      window.localStorage.getItem(",
    "        ROUTE_TASK_CONTROL_COLLAPSED_KEY",
    '      ) === "true"',
    "    );",
    "",
    "  const [taskListCollapsed, setTaskListCollapsed] =",
    "    useState<boolean>(() =>",
    "      window.localStorage.getItem(",
    "        TASK_LIST_COLLAPSED_KEY",
    '      ) === "true"',
    "    );",
  ].join(eol);

  return insertAfter(
    source,
    marker,
    insertion,
    "Controller card collapsed state-ek"
  );
}

function patchToggleFunctions(source, eol) {
  if (
    source.includes("toggleRouteTaskControlCollapsed") &&
    source.includes("toggleTaskListCollapsed")
  ) {
    return source;
  }

  const marker = [
    "  const handleClearAllBusy = () => {",
    "    wsApi.clearAllRouteReservations();",
    "  };",
  ].join(eol);

  const insertion = [
    "",
    "",
    "  const toggleRouteTaskControlCollapsed = () => {",
    "    setRouteTaskControlCollapsed(current => {",
    "      const next = !current;",
    "",
    "      window.localStorage.setItem(",
    "        ROUTE_TASK_CONTROL_COLLAPSED_KEY,",
    "        String(next)",
    "      );",
    "",
    "      return next;",
    "    });",
    "  };",
    "",
    "  const toggleTaskListCollapsed = () => {",
    "    setTaskListCollapsed(current => {",
    "      const next = !current;",
    "",
    "      window.localStorage.setItem(",
    "        TASK_LIST_COLLAPSED_KEY,",
    "        String(next)",
    "      );",
    "",
    "      return next;",
    "    });",
    "  };",
  ].join(eol);

  return insertAfter(
    source,
    marker,
    insertion,
    "Controller card toggle függvények"
  );
}

function patchRouteCard(source, eol) {
  const startMarker = [
    "        {/* =========================",
    "          ROUTE / TASK CONTROL CARD",
    "         ========================= */}",
  ].join(eol);

  const endMarker = [
    "        {/* =========================",
    "          TASK LIST CARD",
    "         ========================= */}",
  ].join(eol);

  const section = sliceBetween(
    source,
    startMarker,
    endMarker,
    "Route & Task control card szakasz"
  );

  let card = section.text;

  if (card.includes("toggleRouteTaskControlCollapsed")) {
    return source;
  }

  const oldHeader = [
    '            <Group justify="space-between" align="center">',
    '              <Text size="sm" fw={700}>',
    "                Route & Task control",
    "              </Text>",
    "",
    '              <Badge variant="light">',
    "                {snapshot.tasks.length} task",
    "              </Badge>",
    "            </Group>",
  ].join(eol);

  const newHeader = [
    '            <Group justify="space-between" align="center" wrap="nowrap">',
    '              <Text size="sm" fw={700}>',
    "                Route & Task control",
    "              </Text>",
    "",
    '              <Group gap="xs" wrap="nowrap">',
    '                <Badge variant="light">',
    "                  {snapshot.tasks.length} task",
    "                </Badge>",
    "",
    "                <Tooltip",
    "                  label={",
    "                    routeTaskControlCollapsed",
    '                      ? "Expand route and task controls"',
    '                      : "Collapse route and task controls"',
    "                  }",
    "                >",
    "                  <ActionIcon",
    '                    size="sm"',
    '                    variant="light"',
    '                    color="gray"',
    "                    onClick={toggleRouteTaskControlCollapsed}",
    "                  >",
    "                    <IconChevronDown",
    "                      size={16}",
    "                      style={{",
    "                        transform: routeTaskControlCollapsed",
    '                          ? "rotate(-90deg)"',
    '                          : "rotate(0deg)",',
    '                        transition: "transform 150ms ease",',
    "                      }}",
    "                    />",
    "                  </ActionIcon>",
    "                </Tooltip>",
    "              </Group>",
    "            </Group>",
  ].join(eol);

  card = replaceOnce(
    card,
    oldHeader,
    newHeader,
    "Route card fejléc"
  );

  const divider =
    '            <Divider />';

  const openCollapse = [
    "            <Collapse expanded={!routeTaskControlCollapsed}>",
    '              <Stack gap="sm">',
    "",
    "                <Divider />",
  ].join(eol);

  card = replaceOnce(
    card,
    divider,
    openCollapse,
    "Route card Collapse nyitás"
  );

  const outerClose = [
    "          </Stack>",
    "        </Card>",
    "",
  ].join(eol);

  const closeCollapse = [
    "              </Stack>",
    "            </Collapse>",
    "          </Stack>",
    "        </Card>",
    "",
  ].join(eol);

  const closeIndex = card.lastIndexOf(outerClose);

  if (closeIndex < 0) {
    fail("Route card: nem találtam a kártya zárását.");
  }

  card =
    card.slice(0, closeIndex) +
    closeCollapse +
    card.slice(closeIndex + outerClose.length);

  return (
    source.slice(0, section.start) +
    card +
    source.slice(section.end)
  );
}

function patchTaskListCard(source, eol) {
  const startMarker = [
    "        {/* =========================",
    "          TASK LIST CARD",
    "         ========================= */}",
  ].join(eol);

  const endMarker = [
    "      </Stack>",
    "    </>",
    "  );",
  ].join(eol);

  const section = sliceBetween(
    source,
    startMarker,
    endMarker,
    "Task list card szakasz"
  );

  let card = section.text;

  if (card.includes("toggleTaskListCollapsed")) {
    return source;
  }

  const oldHeader = [
    '              <Group justify="space-between" align="center">',
    '                <Text size="sm" fw={700}>',
    "                  Task list",
    "                </Text>",
    "",
    '                <Badge variant="light">',
    "                  {snapshot.tasks.length} task",
    "                </Badge>",
    "              </Group>",
  ].join(eol);

  const newHeader = [
    '              <Group justify="space-between" align="center" wrap="nowrap">',
    '                <Text size="sm" fw={700}>',
    "                  Task list",
    "                </Text>",
    "",
    '                <Group gap="xs" wrap="nowrap">',
    '                  <Badge variant="light">',
    "                    {snapshot.tasks.length} task",
    "                  </Badge>",
    "",
    "                  <Tooltip",
    "                    label={",
    "                      taskListCollapsed",
    '                        ? "Expand task list"',
    '                        : "Collapse task list"',
    "                    }",
    "                  >",
    "                    <ActionIcon",
    '                      size="sm"',
    '                      variant="light"',
    '                      color="gray"',
    "                      onClick={toggleTaskListCollapsed}",
    "                    >",
    "                      <IconChevronDown",
    "                        size={16}",
    "                        style={{",
    "                          transform: taskListCollapsed",
    '                            ? "rotate(-90deg)"',
    '                            : "rotate(0deg)",',
    '                          transition: "transform 150ms ease",',
    "                        }}",
    "                      />",
    "                    </ActionIcon>",
    "                  </Tooltip>",
    "                </Group>",
    "              </Group>",
  ].join(eol);

  card = replaceOnce(
    card,
    oldHeader,
    newHeader,
    "Task list card fejléc"
  );

  const divider =
    '              <Divider />';

  const openCollapse = [
    "              <Collapse expanded={!taskListCollapsed}>",
    '                <Stack gap="sm">',
    "",
    "                  <Divider />",
  ].join(eol);

  card = replaceOnce(
    card,
    divider,
    openCollapse,
    "Task list Collapse nyitás"
  );

  const outerClose = [
    "            </Stack>",
    "          </ScrollArea.Autosize>",
    "        </Card>",
    "",
  ].join(eol);

  const closeCollapse = [
    "                </Stack>",
    "              </Collapse>",
    "            </Stack>",
    "          </ScrollArea.Autosize>",
    "        </Card>",
    "",
  ].join(eol);

  const closeIndex = card.lastIndexOf(outerClose);

  if (closeIndex < 0) {
    fail("Task list card: nem találtam a kártya zárását.");
  }

  card =
    card.slice(0, closeIndex) +
    closeCollapse +
    card.slice(closeIndex + outerClose.length);

  return (
    source.slice(0, section.start) +
    card +
    source.slice(section.end)
  );
}

try {
  console.log("DCCExpressNext – Controller Route/Task cards collapse patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  let source = read(CONTROL_PANEL);
  const eol = getEol(source);

  source = patchImports(source, eol);
  source = patchStorageKeys(source, eol);
  source = patchControllerState(source, eol);
  source = patchToggleFunctions(source, eol);
  source = patchRouteCard(source, eol);
  source = patchTaskListCard(source, eol);

  write(CONTROL_PANEL, source);

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
