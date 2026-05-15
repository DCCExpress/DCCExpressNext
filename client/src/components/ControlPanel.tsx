import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Table,
  Tabs,
  Text,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBolt,
  IconCode,
  IconDeviceGamepad2,
  IconPlayerPlay,
  IconPower,
  IconRoute,
  IconRoute2,
} from "@tabler/icons-react";

import { useCommandCenter } from "../context/CommandCenterContext";
import { wsApi } from "../services/wsApi";
import { isTurnoutElement, Layout } from "../models/editor/core/Layout";
import GraphDialog from "./common/GraphDialog";
import { Edge, Graph, RouteSolution, TurnoutStateRequirement,} from "../models/editor/core/Graph";
import { useEditorSettings } from "../context/EditorSettingsContext";
import { showErrorMessage, showOkMessage } from "../helpers";
import { TrackTurnoutElement } from "../models/editor/elements/TrackTurnoutElement";


type ControlPanelProps = {
  onConnectCommandCenter?: () => void;
  onDisconnectCommandCenter?: () => void;
  onRefreshCommandCenter?: () => void;

  onPowerOn?: () => void;
  onPowerOff?: () => void;
  onEmergencyStop?: () => void;

  routes?: string | undefined;
  onRunRouteProcess: (() => Graph | null);
  layout: Layout
};

const CONTROL_PANEL_ACTIVE_TAB_KEY = "dcc-express.control-panel.active-tab";
const DEFAULT_CONTROL_PANEL_TAB = "command-center";

export default function ControlPanel(p: ControlPanelProps) {
  //const [activeTab, setActiveTab] = useState<string | null>("command-center");
  const [activeTab, setActiveTab] = useState<string | null>(() => {
    return (
      window.localStorage.getItem(CONTROL_PANEL_ACTIVE_TAB_KEY) ??
      DEFAULT_CONTROL_PANEL_TAB
    );
  });


  // useEffect(() => {
  //   const unsubscribe = scriptEngine.subscribeScript((scriptDocument) => {
  //     setScript(scriptDocument.content);
  //   });

  //   void scriptEngine.loadScript().catch((error) => {
  //     console.error("Failed to load script:", error);
  //   });

  //   return unsubscribe;
  // }, []);

  // const handleScriptChange = (value: string) => {
  //   scriptEngine.setScript(value);
  // };

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
          <RoutesTab routes={p.routes} onRunRouteProcess={p.onRunRouteProcess} layout={p.layout} />
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}

type CommandCenterTabProps = {
  onConnect: (() => void) | undefined;
  onDisconnect: (() => void) | undefined;
  onRefresh: (() => void) | undefined;
  onPowerOn: (() => void) | undefined;
  onPowerOff: (() => void) | undefined;
  onEmergencyStop: (() => void) | undefined;
};

function CommandCenterTab(p: CommandCenterTabProps) {
  const {
    alive,
    type,
    ip,
    port,

    locked,
    lockOwner,
    reason,

    powerInfo,
    z21SystemState,
  } = useCommandCenter();

  return (
    <ScrollArea.Autosize mah="calc(100vh - 220px)" type="auto" offsetScrollbars>
      <Stack gap="xs">
        <Text size="sm" fw={700}>
          Command Center
        </Text>

        <Group grow mt="xs">
          <Button
            size="xs"
            variant="light"
            color="green"
            leftSection={<IconPower size={16} />}
            onClick={p.onPowerOn}
            disabled={!alive || powerInfo?.trackVoltageOn === true}
          >
            Power ON
          </Button>

          <Button
            size="xs"
            variant="light"
            color="orange"
            leftSection={<IconPower size={16} />}
            onClick={p.onPowerOff}
            disabled={!alive || powerInfo?.trackVoltageOff === true}
          >
            Power OFF
          </Button>
        </Group>

        <Button
          size="xs"
          color={powerInfo?.emergencyStop ? "red" : "gray"}
          className={powerInfo?.emergencyStop ? "blinkBadge" : ""}
          variant="filled"
          leftSection={<IconAlertTriangle size={16} />}
          onClick={() => {
            if (powerInfo?.emergencyStop) {
              p.onPowerOn?.();
            } else {
              p.onEmergencyStop?.();
            }
          }}
          disabled={!alive}
        >
          EMERGENCY STOP
        </Button>

        <Group justify="space-between" align="center">
          <Box>
            <Text size="sm" fw={700}>
              Command Center
            </Text>
          </Box>

          <Badge color={alive ? "green" : "red"} variant="light">
            {alive ? "ONLINE" : "OFFLINE"}
          </Badge>
        </Group>

        <Divider />

        <InfoSection title="Connection">
          <InfoRow label="Type" value={type ?? "-"} />
          {type === "z21" && (
            <>
              <InfoRow label="IP" value={ip ?? "-"} />
              <InfoRow label="Port" value={port ?? "-"} />
            </>
          )}
        </InfoSection>

        <InfoSection title="Lock">
          <InfoRow
            label="State"
            value={locked ? "LOCKED" : "FREE"}
            valueColor={locked ? "orange" : "green"}
          />
          <InfoRow label="Owner" value={lockOwner ?? "-"} />
          <InfoRow
            label="This client"
            value={wsApi.clientUuid}
            valueColor={lockOwner === wsApi.clientUuid ? "lime" : undefined}
          />
          <InfoRow label="Reason" value={reason ?? "-"} />
        </InfoSection>

        <InfoSection title="Power">
          <InfoRow
            label="Track power"
            value={powerInfo ? (powerInfo.trackVoltageOn ? "ON" : "OFF") : "-"}
            valueColor={
              powerInfo
                ? powerInfo.trackVoltageOn
                  ? "green"
                  : "red"
                : undefined
            }
          />

          <InfoRow
            label="Emergency stop"
            value={powerInfo ? yesNo(powerInfo.emergencyStop) : "-"}
            valueColor={powerInfo?.emergencyStop ? "red" : undefined}
          />

          <InfoRow
            label="Short circuit"
            value={powerInfo ? yesNo(powerInfo.shortCircuit) : "-"}
            valueColor={powerInfo?.shortCircuit ? "red" : undefined}
          />

          <InfoRow
            label="Programming"
            value={powerInfo ? yesNo(powerInfo.programmingModeActive) : "-"}
            valueColor={powerInfo?.programmingModeActive ? "orange" : undefined}
          />
        </InfoSection>

        {type === "z21" && (
          <>
            <InfoSection title="Z21 System">
              <InfoRow
                label="Main current"
                value={
                  z21SystemState ? `${z21SystemState.mainCurrentMa} mA` : "-"
                }
              />

              <InfoRow
                label="Prog current"
                value={
                  z21SystemState ? `${z21SystemState.progCurrentMa} mA` : "-"
                }
              />

              <InfoRow
                label="Filtered current"
                value={
                  z21SystemState
                    ? `${z21SystemState.filteredMainCurrentMa} mA`
                    : "-"
                }
              />

              <InfoRow
                label="Temperature"
                value={
                  z21SystemState ? `${z21SystemState.temperatureC} °C` : "-"
                }
                valueColor={
                  z21SystemState?.flags.highTemperature ? "red" : undefined
                }
              />

              <InfoRow
                label="Supply voltage"
                value={
                  z21SystemState
                    ? `${z21SystemState.supplyVoltageMv} mV`
                    : "-"
                }
              />

              <InfoRow
                label="VCC voltage"
                value={
                  z21SystemState ? `${z21SystemState.vccVoltageMv} mV` : "-"
                }
              />

              <InfoRow
                label="Central state"
                value={
                  z21SystemState
                    ? toHex8(z21SystemState.centralState)
                    : "-"
                }
              />

              <InfoRow
                label="Central state EX"
                value={
                  z21SystemState
                    ? toHex8(z21SystemState.centralStateEx)
                    : "-"
                }
              />

              <InfoRow
                label="Capabilities"
                value={
                  z21SystemState
                    ? toHex8(z21SystemState.capabilities)
                    : "-"
                }
              />
            </InfoSection>

            <InfoSection title="Z21 Flags">
              <FlagRow
                label="High temp"
                value={z21SystemState?.flags.highTemperature}
              />
              <FlagRow
                label="Power lost"
                value={z21SystemState?.flags.powerLost}
              />
              <FlagRow
                label="Short external"
                value={z21SystemState?.flags.shortCircuitExternal}
              />
              <FlagRow
                label="Short internal"
                value={z21SystemState?.flags.shortCircuitInternal}
              />
              <FlagRow label="RCN-213" value={z21SystemState?.flags.rcn213} />
            </InfoSection>

            <InfoSection title="Capabilities">
              <FlagRow label="DCC" value={z21SystemState?.flags.capDcc} />
              <FlagRow label="MM" value={z21SystemState?.flags.capMm} />
              <FlagRow
                label="RailCom"
                value={z21SystemState?.flags.capRailCom}
              />
              <FlagRow
                label="Loco cmds"
                value={z21SystemState?.flags.capLocoCmds}
              />
              <FlagRow
                label="Accessory cmds"
                value={z21SystemState?.flags.capAccessoryCmds}
              />
              <FlagRow
                label="Detector cmds"
                value={z21SystemState?.flags.capDetectorCmds}
              />
              <FlagRow
                label="Needs unlock"
                value={z21SystemState?.flags.capNeedsUnlockCode}
              />
            </InfoSection>
          </>
        )}
      </Stack>
    </ScrollArea.Autosize>
  );
}

function ControllerTab() {
  return (
    <ScrollArea.Autosize mah="calc(100vh - 220px)" type="auto" offsetScrollbars>
      <Stack gap="xs">
        <Text size="sm" fw={700}>
          Controller
        </Text>
      </Stack>
    </ScrollArea.Autosize>
  );
}

type RoutesTabProps = {
  routes?: string | undefined;
  onRunRouteProcess: (() => Graph | null);
  //onRunRouteProcess?: (() => Graph) | undefined;
  layout: Layout,

};

function RoutesTab(p: RoutesTabProps) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const { settings, updateSettings } = useEditorSettings();
  const [graphDialogOpened, setGraphDialogOpened] = useState(false);

  const handleRunRouteProcess = () => {
    try {
      const g = p.onRunRouteProcess?.();

      if (!g) return;

      setGraph(g);
      //setGraphDialogOpened(true);
    } catch (error) {
      showErrorMessage("ERROR",
        error instanceof Error
          ? error.message
          : "Could not generate route graph."
      );
    }
  };

  const applyTurnoutStates = async (
  turnoutStates: TurnoutStateRequirement[]
) => {
  const elems = p.layout.getAllElements();

  for (const turnoutState of turnoutStates) {
    const turnout = elems.find(
      (el) =>
        "turnoutAddress" in el &&
        "turnoutClosedValue" in el &&
        el.turnoutAddress === turnoutState.address
    ) as TrackTurnoutElement | undefined;

    if (!turnout) {
      throw new Error(
        `Turnout not found for address: ${turnoutState.address}`
      );
    }

    await wsApi.setTurnout(
      turnoutState.address,
      turnoutState.closed === turnout.turnoutClosedValue
    );
  }
};

const handleTestRoute = async (solution: RouteSolution) => {
  try {
    await applyTurnoutStates(solution.turnoutStates);

    const routeText = solution.nodes
      .map((node) => node.name)
      .join(" → ");

    showOkMessage(
      "SUCCESSFUL",
      `Route test sent: ${routeText}`
    );
  } catch (error) {
    showErrorMessage(
      "ERROR",
      error instanceof Error
        ? error.message
        : "Could not test route."
    );
  }
};
const handleTestConnection = async (edge: Edge) => {
  try {
    await applyTurnoutStates(edge.turnoutStates);

    showOkMessage(
      "SUCCESSFUL",
      `Route test sent: ${edge.from.name} → ${edge.to.name}`
    );
  } catch (error) {
    showErrorMessage(
      "ERROR",
      error instanceof Error
        ? error.message
        : "Could not test route connection."
    );
  }
};
  return (
    <>
      <Stack gap="md">
        <Group justify="space-between">

          <Group w="100%">
            <Checkbox
              mb={4}
              label="Show segments"
              checked={settings.showSegments}
              onChange={(e) =>
                updateSettings({ showSegments: e.currentTarget.checked })
              }
            />
            <Button
              size="xs"
              variant="light"
              onClick={() => setGraphDialogOpened(true)}
              disabled={!graph}
            >
              Show Graph
            </Button>

          </Group>

          <Text fw={600}>Route graph</Text>

          <Button
            leftSection={<IconRoute size={16} />}
            onClick={handleRunRouteProcess}
          >
            Generate graph
          </Button>
        </Group>

        {!graph && (
          <Text size="sm" c="dimmed">
            Generate the graph to display segment connections.
          </Text>
        )}

        {graph && (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600}>Segment connections</Text>

              <Badge variant="light">
                {graph.edges.length} connection{graph.edges.length === 1 ? "" : "s"}
              </Badge>
            </Group>

            <ScrollArea h={360}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>From</Table.Th>
                    <Table.Th>To</Table.Th>
                    <Table.Th>Required</Table.Th>
                    <Table.Th style={{ width: 110 }}>Test</Table.Th>
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody>
                  {graph.edges.map((edge, index) => (
                    <Table.Tr
                      key={`${edge.from.name}-${edge.to.name}-${index}`}
                    >
                      <Table.Td>{edge.from.name}</Table.Td>

                      <Table.Td>{edge.to.name}</Table.Td>

                      <Table.Td>
                        {edge.turnoutStates.length === 0 ? (
                          <Text size="sm" c="dimmed">
                            No turnout required
                          </Text>
                        ) : (
                          <Group gap={6}>
                            {edge.turnoutStates.map((turnoutState, i) => (
                              <Badge
                                radius={4}
                                key={`${turnoutState.address}-${i}`}
                                variant="filled"
                                color={turnoutState.closed ? "green" : "orange"}
                              >
                                {turnoutState.address}:
                                {turnoutState.closed ? "C" : "T"}
                              </Badge>
                            ))}
                          </Group>
                        )}
                      </Table.Td>

                      <Table.Td>
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconPlayerPlay size={14} />}
                          onClick={() => handleTestConnection(edge)}
                          disabled={edge.turnoutStates.length === 0}
                        >
                          Test
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Stack>
        )}
      </Stack>

      {graph && (
        <GraphDialog
          opened={graphDialogOpened}
          onClose={() => setGraphDialogOpened(false)}
          graph={graph}
          onTestRoute={handleTestRoute}
        />
      )}
    </>
  );
};

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap={4}>
      <Text size="xs" fw={700} c="dimmed">
        {title}
      </Text>

      <Stack gap={2}>{children}</Stack>
    </Stack>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string | number;
  valueColor?: string | undefined;
}) {
  return (
    <Group justify="space-between" gap="xs" wrap="nowrap">
      <Text size="xs" c="dimmed">
        {label}
      </Text>

      <Text
        size="xs"
        fw={600}
        ta="right"
        {...(valueColor !== undefined ? { c: valueColor } : {})}
      >
        {value}
      </Text>
    </Group>
  );
}

function FlagRow({
  label,
  value,
}: {
  label: string;
  value: boolean | undefined;
}) {
  return (
    <Group justify="space-between" gap="xs" wrap="nowrap">
      <Text size="xs" c="dimmed">
        {label}
      </Text>

      <Badge size="xs" variant="light" color={value ? "green" : "gray"}>
        {value === undefined ? "-" : value ? "YES" : "NO"}
      </Badge>
    </Group>
  );
}

function yesNo(value: boolean): string {
  return value ? "YES" : "NO";
}

function toHex8(value: number): string {
  return `0x${value.toString(16).padStart(2, "0")}`;
}