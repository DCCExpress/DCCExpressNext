import { useEffect, useState } from "react";
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
  Select,
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
  IconTrash,
} from "@tabler/icons-react";

import { useCommandCenter } from "../context/CommandCenterContext";
import { wsApi } from "../services/wsApi";
import CodeMirror from "@uiw/react-codemirror";
import { keymap } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import prettier from "prettier/standalone";
import babelPlugin from "prettier/plugins/babel";
import estreePlugin from "prettier/plugins/estree";

import {
  scriptEngine,
  ScriptSession,
  ScriptState,
} from "../services/scriptEngine";
import { getScript, saveScript } from "../api/http";
import { useScriptStatus } from "../hooks/useScriptStatus";

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
  const [script, setScript] = useState(
    `for(var i = 0; i < 10; i++) {
  setTurnout(10, true);
  await sleep(1000);
  setTurnout(10, false);
  await sleep(1000);
}`
  );


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

async function formatScriptBody(script: string): Promise<string> {
  const wrapped = `async function __script__() { \n${script} \n }`;

  const formattedWrapped = await prettier.format(wrapped, {
    parser: "babel",
    plugins: [babelPlugin, estreePlugin],
    semi: true,
    singleQuote: false,
  });

  return formattedWrapped
    .replace(/^async function __script__\(\) {\n/, "")
    .replace(/\n}\s*$/, "");
}

function ScriptsTab(p: ScriptsTabProps) {
  const [maximized, setMaximized] = useState(false);
  const { colorScheme } = useMantineColorScheme();

  const { scriptSession, scriptState, stopScript } = useScriptStatus();

  const [loadingScript, setLoadingScript] = useState(false);
  const [savingScript, setSavingScript] = useState(false);

  const [scriptErrorOpened, setScriptErrorOpened] = useState(false);
  const [shownError, setShownError] = useState<string | null>(null);

  const monoFont =
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

  const cmTheme = colorScheme === "dark" ? "dark" : "light";

  const handleFormatScript = async () => {
    try {
      const formatted = await formatScriptBody(String(p.script ?? ""));
      p.onScriptChange(formatted);
    } catch (error) {
      console.error("Script format error:", error);
    }
  };

  const handleLoadScript = async () => {
    try {
      setLoadingScript(true);

      const scriptFile = await getScript();
      p.onScriptChange(scriptFile.content ?? "");
    } catch (error) {
      console.error("Failed to load script:", error);
    } finally {
      setLoadingScript(false);
    }
  };

  const handleSaveScript = async () => {
    try {
      setSavingScript(true);

      await saveScript(String(p.script ?? ""));
    } catch (error) {
      console.error("Failed to save script:", error);
    } finally {
      setSavingScript(false);
    }
  };

  const formatKeymap = keymap.of([
    {
      key: "Shift-Alt-f",
      run: () => {
        void handleFormatScript();
        return true;
      },
    },
    {
      key: "Mod-s",
      run: () => {
        void handleSaveScript();
        return true;
      },
    },
  ]);

  const handleStartScript = () => {
    const script = String(p.script ?? "");

    scriptEngine.run(script, {
      source: "property-panel",
    });
  };

  const handleStopScript = () => {
    stopScript();
  };

  const scriptStatus = scriptState?.status ?? "idle";
  useEffect(() => {
    if (scriptState?.status !== "error") return;
    if (!scriptState.error) return;

    setShownError(scriptState.error);
    setScriptErrorOpened(true);
  }, [scriptState?.status, scriptState?.error]);


  const scriptIsRunning =
    scriptStatus === "running" || scriptStatus === "stopping";

  return (

    <>
      <Modal
        opened={scriptErrorOpened}
        onClose={() => setScriptErrorOpened(false)}
        title="Script error"
        centered
        size="lg"
        zIndex={10000}
      >
        <Stack gap="sm">
          <Text size="sm" c="red" fw={700}>
            The script stopped because of an error.
          </Text>

          <Text
            size="sm"
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: monoFont,
            }}
          >
            {shownError}
          </Text>

          <Group justify="flex-end">
            <Button
              variant="light"
              onClick={() => setScriptErrorOpened(false)}
            >
              Close
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={700}>
            Script
          </Text>

          <Group gap={4}>
            <Button
              size="xs"
              variant="subtle"
              onClick={handleLoadScript}
              loading={loadingScript}
            >
              Load
            </Button>

            <Button
              size="xs"
              variant="subtle"
              onClick={handleSaveScript}
              loading={savingScript}
            >
              Save
            </Button>

            <Button
              size="xs"
              variant="subtle"
              onClick={handleFormatScript}
            >
              Format
            </Button>

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

        <Group>
          <Button disabled={scriptIsRunning} onClick={handleStartScript}>
            Start
          </Button>

          <Button
            color="red"
            disabled={scriptStatus !== "running"}
            onClick={handleStopScript}
          >
            Stop
          </Button>

          <Text size="xs" c="dimmed">
            {scriptStatus}
          </Text>
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
              extensions={[
                javascript({
                  jsx: false,
                  typescript: false,
                }),
                formatKeymap,
              ]}
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
                fontSize: 14,
              }}
            />
          </div>

          <Group justify="space-between" style={{ flexShrink: 0 }}>
            <Text size="xs" c="dimmed">
              Script status: {scriptStatus}
            </Text>

            <Group>
              <Button
                variant="subtle"
                size="xs"
                onClick={handleLoadScript}
                loading={loadingScript}
              >
                Load
              </Button>

              <Button
                variant="subtle"
                size="xs"
                onClick={handleSaveScript}
                loading={savingScript}
              >
                Save
              </Button>

              <Button
                variant="subtle"
                size="xs"
                onClick={handleFormatScript}
              >
                Format
              </Button>

              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconX size={16} />}
                onClick={() => setMaximized(false)}
              >
                Close
              </Button>

              <Button disabled={scriptIsRunning} onClick={handleStartScript}>
                Start
              </Button>

              <Button
                color="red"
                disabled={scriptStatus !== "running"}
                onClick={handleStopScript}
              >
                Stop
              </Button>
            </Group>
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