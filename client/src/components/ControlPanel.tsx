import { useState } from "react";

import {
  Card,
  Tabs,
} from "@mantine/core";

import {
  IconAlertTriangle,
  IconBolt,
  IconDeviceGamepad2,
  IconEye,
  IconRoute2,
} from "@tabler/icons-react";

import type { Layout } from "../models/editor/core/Layout";
import { wsApi } from "../services/wsApi";

import CommandCenterTab from "./control-panel/CommandCenterTab";
import ControllerTab from "./control-panel/ControllerTab";
import RoutesTab from "./control-panel/RoutesTab";
import VisibilityTab from "./control-panel/VisibilityTab";
import LogTab from "./control-panel/LogTab";

type ControlPanelProps = {
  onConnectCommandCenter?: () => void;
  onDisconnectCommandCenter?: () => void;
  onRefreshCommandCenter?: () => void;

  onPowerOn?: () => void;
  onPowerOff?: () => void;
  onEmergencyStop?: () => void;

  routes?: string | undefined;

  layout: Layout;
};

const CONTROL_PANEL_ACTIVE_TAB_KEY = "dcc-express.control-panel.active-tab";
const DEFAULT_CONTROL_PANEL_TAB = "command-center";

export default function ControlPanel(p: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<string | null>(() => {
    return (
      window.localStorage.getItem(CONTROL_PANEL_ACTIVE_TAB_KEY) ??
      DEFAULT_CONTROL_PANEL_TAB
    );
  });

  const handleActiveTabChange = (value: string | null) => {
    const nextValue = value ?? DEFAULT_CONTROL_PANEL_TAB;

    setActiveTab(nextValue);
    window.localStorage.setItem(CONTROL_PANEL_ACTIVE_TAB_KEY, nextValue);
  };

  return (
    <Card withBorder radius="md" p="xs">
      <Tabs value={activeTab} onChange={handleActiveTabChange} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab
            value="command-center"
            leftSection={<IconBolt size={16} />}
          >
            {/* CC */}
          </Tabs.Tab>

          <Tabs.Tab
            value="controller"
            leftSection={<IconDeviceGamepad2 size={16} />}
          >
            {/* Controller */}
          </Tabs.Tab>

          <Tabs.Tab value="scripts" leftSection={<IconRoute2 size={16} />}>
            {/* Scripts */}
          </Tabs.Tab>

          <Tabs.Tab value="visibility" leftSection={<IconEye size={16} />}>
            {/* Visibility */}
          </Tabs.Tab>

          <Tabs.Tab
            value="log"
            leftSection={<IconAlertTriangle size={16} />}
          >
            {/* Log */}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="command-center" pt="sm">
          <CommandCenterTab
            onConnect={p.onConnectCommandCenter}
            onDisconnect={p.onDisconnectCommandCenter}
            onRefresh={p.onRefreshCommandCenter}
            onPowerOn={() => wsApi.powerOn()}
            onPowerOff={() => wsApi.powerOff()}
            onEmergencyStop={() => wsApi.emergencyStop()}
          />
        </Tabs.Panel>

        <Tabs.Panel value="controller" pt="sm">
          <ControllerTab />
        </Tabs.Panel>

        <Tabs.Panel value="scripts" pt="sm">
          <RoutesTab routes={p.routes} layout={p.layout} />
        </Tabs.Panel>

        <Tabs.Panel value="visibility" pt="sm">
          <VisibilityTab />
        </Tabs.Panel>

        <Tabs.Panel value="log" pt="sm">
          <LogTab />
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}
