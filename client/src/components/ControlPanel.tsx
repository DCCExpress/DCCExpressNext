import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Tabs,
  Text,
  Textarea,
  Tooltip,
  useMantineColorScheme,

} from "@mantine/core";
import {
  IconBolt,
  IconCode,
  IconPlayerPlay,
  IconPlugConnected,
  IconPlugConnectedX,
  IconRefresh,
  IconPower,
  IconAlertTriangle,
  IconDeviceGamepad2,
  IconX,
  IconArrowsMaximize,
} from "@tabler/icons-react";

import { useCommandCenter } from "../context/CommandCenterContext";
import { wsApi } from "../services/wsApi";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";

type ControlPanelProps = {
  onConnectCommandCenter?: () => void;
  onDisconnectCommandCenter?: () => void;
  onRefreshCommandCenter?: () => void;

  onPowerOn?: () => void;
  onPowerOff?: () => void;
  onEmergencyStop?: () => void;

  onRunScript?: (script: string) => void;
};

export default function ControlPanel(p: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<string | null>("command-center");

  const [script, setScript] = useState(`powerOn();

setTurnout(12, true);

setLoco({
  address: 3,
  speed: 40,
  direction: "forward"
});`);

  return (
    <Card withBorder radius="md" p="xs">
      <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
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

          <Tabs.Tab value="scripts" leftSection={<IconCode size={16} />}>
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
          <ScriptsTab
            script={script}
            onScriptChange={setScript}
            onRun={() => p.onRunScript?.(script)}
          />
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
    name,
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
          onClick={(ev) => {
            if (powerInfo?.emergencyStop) {
              if (p.onPowerOn) {
                p.onPowerOn();
              }
            } else {
              if (p.onEmergencyStop) {
                p.onEmergencyStop()
              }

            }

          }


          }
          disabled={!alive}
        >
          EMERGENCY STOP
        </Button>


        <Group justify="space-between" align="center">
          <Box>
            <Text size="sm" fw={700}>
              Command Center
            </Text>

            {/* <Text size="xs" c="dimmed">
              Z21 állapota
            </Text> */}
          </Box>

          <Badge color={alive ? "green" : "red"} variant="light">
            {alive ? "ONLINE" : "OFFLINE"}
          </Badge>
        </Group>

        <Divider />

        <InfoSection title="Connection">
          {/* <InfoRow label="Name" value={name ?? "-"} /> */}
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
            value={
              powerInfo
                ? powerInfo.trackVoltageOn
                  ? "ON"
                  : "OFF"
                : "-"
            }
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
                  z21SystemState
                    ? `${z21SystemState.mainCurrentMa} mA`
                    : "-"
                }
              />

              <InfoRow
                label="Prog current"
                value={
                  z21SystemState
                    ? `${z21SystemState.progCurrentMa} mA`
                    : "-"
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
                  z21SystemState
                    ? `${z21SystemState.temperatureC} °C`
                    : "-"
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
                  z21SystemState
                    ? `${z21SystemState.vccVoltageMv} mV`
                    : "-"
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
              <FlagRow label="High temp" value={z21SystemState?.flags.highTemperature} />
              <FlagRow label="Power lost" value={z21SystemState?.flags.powerLost} />
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
              <FlagRow label="RailCom" value={z21SystemState?.flags.capRailCom} />
              <FlagRow label="Loco cmds" value={z21SystemState?.flags.capLocoCmds} />
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
        {/* <Group grow mt="xs">
          <Button
            size="xs"
            variant="light"
            leftSection={<IconPlugConnected size={16} />}
            onClick={p.onConnect}
            disabled={alive}
          >
            Connect
          </Button>

          <Button
            size="xs"
            variant="light"
            color="red"
            leftSection={<IconPlugConnectedX size={16} />}
            onClick={p.onDisconnect}
            disabled={!alive}
          >
            Disconnect
          </Button>
        </Group> */}

        {/* <Group justify="flex-end">
          <Tooltip label="Állapot frissítése">
            <ActionIcon variant="subtle" onClick={p.onRefresh}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group> */}
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

type ScriptsTabProps = {
  script: string;
  onScriptChange: (value: string) => void;
  onRun: () => void;
};

function ScriptsTab2(p: ScriptsTabProps) {
  return (
    <Stack gap="xs">
      <Text size="sm" fw={700}>
        Script
      </Text>
      <Textarea
        value={p.script}
        onChange={(e) => p.onScriptChange(e.currentTarget.value)}
        autosize
        minRows={8}
        maxRows={16}
        styles={{
          input: {
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 12,
          },
        }}
      />

      <Group justify="flex-end">
        <Button
          disabled
          size="xs"
          leftSection={<IconPlayerPlay size={16} />}
          onClick={p.onRun}
        >
          Run script
        </Button>
      </Group>
    </Stack>
  );
}

function ScriptsTab(p: ScriptsTabProps) {
  const [maximized, setMaximized] = useState(false);
  const { colorScheme } = useMantineColorScheme();

  const monoFont =
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

  const cmTheme = colorScheme === "dark" ? "dark" : "light";

  return (
    <>
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={700}>
            Script
          </Text>

          <Tooltip label="Maximize editor">
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => setMaximized(true)}
              aria-label="Maximize script editor"
            >
              <IconArrowsMaximize size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Textarea
          value={p.script}
          onChange={(e) => p.onScriptChange(e.currentTarget.value)}
          autosize
          minRows={8}
          maxRows={16}
          styles={{
            input: {
              fontFamily: monoFont,
              fontSize: 12,
            },
          }}
        />

        <Group justify="flex-end">
          <Button
            disabled
            size="xs"
            leftSection={<IconPlayerPlay size={16} />}
            onClick={p.onRun}
          >
            Run script
          </Button>
        </Group>
      </Stack>

      <Modal
        opened={maximized}
        onClose={() => setMaximized(false)}
        title="Script editor"
        size="90vw"
        centered
        closeOnEscape
        styles={{
          content: {
            height: "90vh",
            display: "flex",
            flexDirection: "column",
          },
          body: {
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Stack
          gap="xs"
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: 4,
            }}
          >
            <CodeMirror
              value={p.script}
              height="100%"
              theme={cmTheme}
              extensions={[javascript()]}
              onChange={(value) => p.onScriptChange(value)}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: true,
                bracketMatching: true,
                autocompletion: true,
              }}
              style={{
                height: "100%",
                fontSize: 13,
              }}
            />
          </div>

          <Group justify="space-between" style={{ flexShrink: 0 }}>
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconX size={16} />}
              onClick={() => setMaximized(false)}
            >
              Close
            </Button>

            <Button
              disabled
              size="xs"
              leftSection={<IconPlayerPlay size={16} />}
              onClick={p.onRun}
            >
              Run script
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

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

      <Badge
        size="xs"
        variant="light"
        color={value ? "green" : "gray"}
      >
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