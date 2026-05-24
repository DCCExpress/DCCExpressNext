import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Card,
  Tabs,
} from "@mantine/core";

import {
  IconAlertTriangle,
  IconDeviceGamepad2,
  IconEye,
  IconRoute2,
  IconServer,
} from "@tabler/icons-react";

import type { LayoutView } from "../models/editor/core/LayoutView";
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

  layout: LayoutView;
};

const CONTROL_PANEL_ACTIVE_TAB_KEY = "dcc-express.control-panel.active-tab";
const DEFAULT_CONTROL_PANEL_TAB = "system";

export default function ControlPanel(p: ControlPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string | null>(() => {
    const stored =
      window.localStorage.getItem(CONTROL_PANEL_ACTIVE_TAB_KEY) ??
      DEFAULT_CONTROL_PANEL_TAB;

    return stored === "command-center"
      ? DEFAULT_CONTROL_PANEL_TAB
      : stored;
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
            value="system"
            leftSection={<IconServer size={16} />}
            title="System"
            aria-label="System"
          />

          <Tabs.Tab
            value="controller"
            leftSection={<IconDeviceGamepad2 size={16} />}
            title={t("controlPanel.tabs.controller")}
            aria-label={t("controlPanel.tabs.controller")}
          />

          <Tabs.Tab
            value="scripts"
            leftSection={<IconRoute2 size={16} />}
            title={t("controlPanel.tabs.routes")}
            aria-label={t("controlPanel.tabs.routes")}
          />

          <Tabs.Tab
            value="visibility"
            leftSection={<IconEye size={16} />}
            title={t("controlPanel.tabs.visibility")}
            aria-label={t("controlPanel.tabs.visibility")}
          />

          <Tabs.Tab
            value="log"
            leftSection={<IconAlertTriangle size={16} />}
            title={t("controlPanel.tabs.log")}
            aria-label={t("controlPanel.tabs.log")}
          />
        </Tabs.List>

        <Tabs.Panel value="system" pt="sm">
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