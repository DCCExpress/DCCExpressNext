#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  source: path.join(ROOT, "client/src/components/ControlPanel.tsx"),
  targetControlPanel: path.join(ROOT, "client/src/components/ControlPanel.tsx"),
  commandCenterTab: path.join(ROOT, "client/src/components/control-panel/CommandCenterTab.tsx"),
  controllerTab: path.join(ROOT, "client/src/components/control-panel/ControllerTab.tsx"),
  routesTab: path.join(ROOT, "client/src/components/control-panel/RoutesTab.tsx"),
  visibilityTab: path.join(ROOT, "client/src/components/control-panel/VisibilityTab.tsx"),
  logTab: path.join(ROOT, "client/src/components/control-panel/LogTab.tsx"),
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

function sliceBetween(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);

  if (start < 0) {
    fail(`${label}: nem találtam a kezdő markert: ${startMarker}`);
  }

  const end = source.indexOf(endMarker, start + startMarker.length);

  if (end < 0) {
    fail(`${label}: nem találtam a záró markert: ${endMarker}`);
  }

  return source.slice(start, end).trim();
}

function sliceFrom(source, startMarker, label) {
  const start = source.indexOf(startMarker);

  if (start < 0) {
    fail(`${label}: nem találtam a kezdő markert: ${startMarker}`);
  }

  return source.slice(start).trim();
}

function replaceFirst(source, search, replacement, label) {
  if (!source.includes(search)) {
    fail(`${label}: nem találtam a cserélendő mintát: ${search}`);
  }

  return source.replace(search, replacement);
}

function normalizeBlock(block, eol) {
  return block.replace(/\r?\n/g, eol).trim() + eol;
}

function buildCommandCenterTab(source, eol) {
  let body = sliceBetween(
    source,
    "type CommandCenterTabProps",
    "function ControllerTab()",
    "CommandCenterTab blokk"
  );

  const helpers = sliceFrom(
    source,
    "function InfoSection(",
    "CommandCenterTab info helper blokk"
  );

  body = replaceFirst(
    body,
    "function CommandCenterTab(",
    "export default function CommandCenterTab(",
    "CommandCenterTab export"
  );

  body = `${body}${eol}${eol}${helpers}`;
  body = body.replaceAll("React.ReactNode", "ReactNode");

  const imports = [
    'import type { ReactNode } from "react";',
    "",
    "import {",
    "  Badge,",
    "  Box,",
    "  Button,",
    "  Divider,",
    "  Group,",
    "  ScrollArea,",
    "  Stack,",
    "  Text,",
    '} from "@mantine/core";',
    "",
    "import {",
    "  IconAlertTriangle,",
    "  IconPower,",
    '} from "@tabler/icons-react";',
    "",
    'import { useCommandCenter } from "../../context/CommandCenterContext";',
    'import { wsApi } from "../../services/wsApi";',
    "",
  ].join(eol);

  return normalizeBlock(`${imports}${body}`, eol);
}

function buildControllerTab(source, eol) {
  let body = sliceBetween(
    source,
    "function ControllerTab()",
    "type RoutesTabProps",
    "ControllerTab blokk"
  );

  body = replaceFirst(
    body,
    "function ControllerTab(",
    "export default function ControllerTab(",
    "ControllerTab export"
  );

  const imports = [
    'import { useState } from "react";',
    "",
    "import {",
    "  ActionIcon,",
    "  Badge,",
    "  Button,",
    "  Card,",
    "  Collapse,",
    "  Divider,",
    "  Group,",
    "  ScrollArea,",
    "  Stack,",
    "  Text,",
    "  TextInput,",
    "  Tooltip,",
    '} from "@mantine/core";',
    "",
    "import {",
    "  IconCheck,",
    "  IconChevronDown,",
    "  IconPlayerPause,",
    "  IconPlayerPlay,",
    "  IconPlayerStop,",
    "  IconRoute,",
    '} from "@tabler/icons-react";',
    "",
    'import { showErrorMessage, showOkMessage } from "../../helpers";',
    'import { wsApi } from "../../services/wsApi";',
    'import { taskManager } from "../../services/tasks/taskManagerSingleton";',
    'import { TrainTask, TrainTaskStatus } from "../../services/tasks/TaskTypes";',
    'import { useTaskManager } from "../../services/tasks/useTaskManager";',
    'import TaskManagerDialog from "../common/TaskManagerDialog";',
    'import FastClockCard from "../common/FastClockCard";',
    "",
    'const ROUTE_TASK_CONTROL_COLLAPSED_KEY =',
    '  "dcc-express.controller.route-task-control.collapsed";',
    "",
    'const TASK_LIST_COLLAPSED_KEY =',
    '  "dcc-express.controller.task-list.collapsed";',
    "",
  ].join(eol);

  return normalizeBlock(`${imports}${body}`, eol);
}

function buildRoutesTab(source, eol) {
  let body = sliceBetween(
    source,
    "type RoutesTabProps",
    "function VisibilityTab()",
    "RoutesTab blokk"
  );

  body = replaceFirst(
    body,
    "function RoutesTab(",
    "export default function RoutesTab(",
    "RoutesTab export"
  );

  const imports = [
    'import { useEffect, useState } from "react";',
    "",
    "import {",
    "  Badge,",
    "  Button,",
    "  Group,",
    "  ScrollArea,",
    "  Stack,",
    "  Table,",
    "  Text,",
    '} from "@mantine/core";',
    "",
    "import {",
    "  IconPlayerPlay,",
    "  IconRoute,",
    '} from "@tabler/icons-react";',
    "",
    'import type { Layout } from "../../models/editor/core/Layout";',
    'import { wsApi } from "../../services/wsApi";',
    'import GraphDialog from "../common/GraphDialog";',
    'import type {',
    '  Edge,',
    '  RouteSolution,',
    '  TurnoutStateRequirement,',
    '} from "../../../../common/src/railway/graph";',
    'import {',
    '  showErrorMessage,',
    '  showOkMessage,',
    '  showWarningMessage,',
    '} from "../../helpers";',
    'import { useRouteGraph } from "../../hooks/useRouteGraph";',
    'import { TrackTurnoutElement } from "../../models/editor/elements/TrackTurnoutElement";',
    "",
  ].join(eol);

  return normalizeBlock(`${imports}${body}`, eol);
}

function buildVisibilityTab(source, eol) {
  let body = sliceBetween(
    source,
    "function VisibilityTab()",
    "function LogTab()",
    "VisibilityTab blokk"
  );

  body = replaceFirst(
    body,
    "function VisibilityTab(",
    "export default function VisibilityTab(",
    "VisibilityTab export"
  );

  const imports = [
    "import {",
    "  ScrollArea,",
    "  Stack,",
    '} from "@mantine/core";',
    "",
    'import VisibilitySettings from "../VisibilitySettings";',
    "",
  ].join(eol);

  return normalizeBlock(`${imports}${body}`, eol);
}

function buildLogTab(source, eol) {
  let body = sliceBetween(
    source,
    "function LogTab()",
    "function InfoSection(",
    "LogTab blokk"
  );

  body = replaceFirst(
    body,
    "function LogTab(",
    "export default function LogTab(",
    "LogTab export"
  );

  const imports = [
    'import { useEffect, useState } from "react";',
    "",
    "import {",
    "  Badge,",
    "  Button,",
    "  Card,",
    "  Divider,",
    "  Group,",
    "  ScrollArea,",
    "  Stack,",
    "  Text,",
    '} from "@mantine/core";',
    "",
    "import {",
    "  NotificationLogEntry,",
    "  NotificationLogLevel,",
    "  notificationLogStore,",
    '} from "../../services/notificationLogStore";',
    "",
  ].join(eol);

  return normalizeBlock(`${imports}${body}`, eol);
}

function buildControlPanel(eol) {
  const content = [
    'import { useState } from "react";',
    "",
    "import {",
    "  Card,",
    "  Tabs,",
    '} from "@mantine/core";',
    "",
    "import {",
    "  IconAlertTriangle,",
    "  IconBolt,",
    "  IconDeviceGamepad2,",
    "  IconEye,",
    "  IconRoute2,",
    '} from "@tabler/icons-react";',
    "",
    'import type { Layout } from "../models/editor/core/Layout";',
    'import { wsApi } from "../services/wsApi";',
    "",
    'import CommandCenterTab from "./control-panel/CommandCenterTab";',
    'import ControllerTab from "./control-panel/ControllerTab";',
    'import RoutesTab from "./control-panel/RoutesTab";',
    'import VisibilityTab from "./control-panel/VisibilityTab";',
    'import LogTab from "./control-panel/LogTab";',
    "",
    "type ControlPanelProps = {",
    "  onConnectCommandCenter?: () => void;",
    "  onDisconnectCommandCenter?: () => void;",
    "  onRefreshCommandCenter?: () => void;",
    "",
    "  onPowerOn?: () => void;",
    "  onPowerOff?: () => void;",
    "  onEmergencyStop?: () => void;",
    "",
    "  routes?: string | undefined;",
    "",
    "  layout: Layout;",
    "};",
    "",
    'const CONTROL_PANEL_ACTIVE_TAB_KEY = "dcc-express.control-panel.active-tab";',
    'const DEFAULT_CONTROL_PANEL_TAB = "command-center";',
    "",
    "export default function ControlPanel(p: ControlPanelProps) {",
    "  const [activeTab, setActiveTab] = useState<string | null>(() => {",
    "    return (",
    "      window.localStorage.getItem(CONTROL_PANEL_ACTIVE_TAB_KEY) ??",
    "      DEFAULT_CONTROL_PANEL_TAB",
    "    );",
    "  });",
    "",
    "  const handleActiveTabChange = (value: string | null) => {",
    "    const nextValue = value ?? DEFAULT_CONTROL_PANEL_TAB;",
    "",
    "    setActiveTab(nextValue);",
    "    window.localStorage.setItem(CONTROL_PANEL_ACTIVE_TAB_KEY, nextValue);",
    "  };",
    "",
    "  return (",
    '    <Card withBorder radius="md" p="xs">',
    '      <Tabs value={activeTab} onChange={handleActiveTabChange} keepMounted={false}>',
    "        <Tabs.List>",
    "          <Tabs.Tab",
    '            value="command-center"',
    "            leftSection={<IconBolt size={16} />}",
    "          >",
    "            {/* CC */}",
    "          </Tabs.Tab>",
    "",
    "          <Tabs.Tab",
    '            value="controller"',
    "            leftSection={<IconDeviceGamepad2 size={16} />}",
    "          >",
    "            {/* Controller */}",
    "          </Tabs.Tab>",
    "",
    '          <Tabs.Tab value="scripts" leftSection={<IconRoute2 size={16} />}>',
    "            {/* Scripts */}",
    "          </Tabs.Tab>",
    "",
    '          <Tabs.Tab value="visibility" leftSection={<IconEye size={16} />}>',
    "            {/* Visibility */}",
    "          </Tabs.Tab>",
    "",
    "          <Tabs.Tab",
    '            value="log"',
    "            leftSection={<IconAlertTriangle size={16} />}",
    "          >",
    "            {/* Log */}",
    "          </Tabs.Tab>",
    "        </Tabs.List>",
    "",
    '        <Tabs.Panel value="command-center" pt="sm">',
    "          <CommandCenterTab",
    "            onConnect={p.onConnectCommandCenter}",
    "            onDisconnect={p.onDisconnectCommandCenter}",
    "            onRefresh={p.onRefreshCommandCenter}",
    "            onPowerOn={() => wsApi.powerOn()}",
    "            onPowerOff={() => wsApi.powerOff()}",
    "            onEmergencyStop={() => wsApi.emergencyStop()}",
    "          />",
    "        </Tabs.Panel>",
    "",
    '        <Tabs.Panel value="controller" pt="sm">',
    "          <ControllerTab />",
    "        </Tabs.Panel>",
    "",
    '        <Tabs.Panel value="scripts" pt="sm">',
    "          <RoutesTab routes={p.routes} layout={p.layout} />",
    "        </Tabs.Panel>",
    "",
    '        <Tabs.Panel value="visibility" pt="sm">',
    "          <VisibilityTab />",
    "        </Tabs.Panel>",
    "",
    '        <Tabs.Panel value="log" pt="sm">',
    "          <LogTab />",
    "        </Tabs.Panel>",
    "      </Tabs>",
    "    </Card>",
    "  );",
    "}",
    "",
  ].join(eol);

  return content;
}

try {
  console.log("DCCExpressNext – ControlPanel tab split patch V1");
  console.log("Repo gyökér:", ROOT);
  console.log("");

  const source = read(FILES.source);
  const eol = getEol(source);

  write(FILES.commandCenterTab, buildCommandCenterTab(source, eol));
  write(FILES.controllerTab, buildControllerTab(source, eol));
  write(FILES.routesTab, buildRoutesTab(source, eol));
  write(FILES.visibilityTab, buildVisibilityTab(source, eol));
  write(FILES.logTab, buildLogTab(source, eol));
  write(FILES.targetControlPanel, buildControlPanel(eol));

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
