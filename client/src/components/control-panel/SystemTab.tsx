import { useEffect, useState } from "react";

import { Badge, Box, Button, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconPower } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import CollapsiblePanelCard from "../common/CollapsiblePanelCard";
import DiagnosticsDialog from "../diagnostics/DiagnosticsDialog";
import StatusBadge from "../common/StatusBadge";
import { InfoSection, InfoValueRow } from "../common/InfoRows";
import { useCommandCenter } from "../../context/CommandCenterContext";
import { useBrowserStats } from "../../hooks/useBrowserStats";
import { useServerRuntimeStats } from "../../hooks/useServerRuntimeStats";
import { wsApi } from "../../services/wsApi";

type SystemTabProps = {
  onConnect: (() => void) | undefined;
  onDisconnect: (() => void) | undefined;
  onRefresh: (() => void) | undefined;
  onPowerOn: (() => void) | undefined;
  onPowerOff: (() => void) | undefined;
  onEmergencyStop: (() => void) | undefined;
};

type RowProps = { label: string; value: string | number | null | undefined; suffix?: string; color?: string };

type TrafficSample = {
  timestamp: number;
  rx: number;
  tx: number;
};

const MAX_TRAFFIC_SAMPLES = 60;

function rowValue(value: RowProps["value"], suffix = "") {
  return value === null || value === undefined || value === "" ? "-" : `${value}${suffix}`;
}

function SmallRow({ label, value, suffix, color = "gray" }: RowProps) {
  return (
    <Group justify="space-between" gap="xs" wrap="nowrap">
      <Text size="xs" c="dimmed">{label}</Text>
      <Badge size="xs" variant="light" color={color}>{rowValue(value, suffix)}</Badge>
    </Group>
  );
}

function memColor(value: number | null | undefined) {
  if (value === null || value === undefined) return "gray";
  if (value > 1000) return "red";
  if (value > 500) return "orange";
  return "green";
}

function percentColor(value: number | null | undefined) {
  if (value === null || value === undefined) return "gray";
  if (value > 85) return "red";
  if (value > 65) return "orange";
  return "green";
}

function fpsColor(value: number | null | undefined) {
  if (value === null || value === undefined) return "gray";
  if (value < 20) return "red";
  if (value < 45) return "orange";
  return "green";
}

function trafficColor(value: number | null | undefined) {
  if (value === null || value === undefined) return "gray";
  if (value > 1024) return "orange";
  return "blue";
}

function yesNo(value: boolean, t: (key: string) => string) {
  return value ? t("commandCenter.yes") : t("commandCenter.no");
}

function createSparklinePoints(
  values: number[],
  width: number,
  height: number
): string {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return `0,${height}`;
  }

  const max = Math.max(1, ...values);
  const stepX = width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - (value / max) * height;

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function TrafficSparkline({ samples }: { samples: TrafficSample[] }) {
  const width = 240;
  const height = 52;
  const rxValues = samples.map(sample => sample.rx);
  const txValues = samples.map(sample => sample.tx);
  const maxTraffic = Math.max(0, ...rxValues, ...txValues);
  const rxPoints = createSparklinePoints(rxValues, width, height);
  const txPoints = createSparklinePoints(txValues, width, height);

  return (
    <Box
      mt={4}
      p={6}
      style={{
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: 8,
      }}
    >
      <Group justify="space-between" mb={4} gap="xs">
        <Text size="xs" c="dimmed">WS traffic</Text>
        <Text size="xs" c="dimmed">max {maxTraffic} kbit/s</Text>
      </Group>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label="WebSocket traffic graph"
        preserveAspectRatio="none"
      >
        <line x1="0" y1={height} x2={width} y2={height} stroke="currentColor" opacity="0.18" />
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" opacity="0.10" />
        {rxPoints && (
          <polyline
            points={rxPoints}
            fill="none"
            stroke="var(--mantine-color-blue-6)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {txPoints && (
          <polyline
            points={txPoints}
            fill="none"
            stroke="var(--mantine-color-orange-6)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      <Group gap="xs" mt={4}>
        <Badge size="xs" variant="light" color="blue">RX</Badge>
        <Badge size="xs" variant="light" color="orange">TX</Badge>
      </Group>
    </Box>
  );
}

export default function SystemTab(p: SystemTabProps) {
  const { t } = useTranslation();
  const browserStats = useBrowserStats(1000);
  const serverStats = useServerRuntimeStats();
  const cc = useCommandCenter();
  const powerInfo = cc.powerInfo;
  const [diagnosticsOpened, setDiagnosticsOpened] = useState(false);
  const [trafficSamples, setTrafficSamples] = useState<TrafficSample[]>([]);

  useEffect(() => {
    if (!serverStats) {
      return;
    }

    setTrafficSamples(prev => [
      ...prev,
      {
        timestamp: serverStats.timestamp,
        rx: serverStats.wsRxKbps,
        tx: serverStats.wsTxKbps,
      },
    ].slice(-MAX_TRAFFIC_SAMPLES));
  }, [serverStats]);

  return (
    <>
      <ScrollArea.Autosize mah="calc(100vh - 220px)" type="auto" offsetScrollbars>
        <Stack gap="xs">
          <CollapsiblePanelCard
            title="Command center"
            collapsedStorageKey="dcc-express.control-panel.system.command-center.collapsed"
            expandTooltip="Expand"
            collapseTooltip="Collapse"
            rightSection={<StatusBadge color={cc.alive ? "green" : "red"} variant="light">{cc.alive ? t("commandCenter.online") : t("commandCenter.offline")}</StatusBadge>}
          >
            <Stack gap="xs">
              <Group grow>
                <Button size="xs" variant="light" color="green" leftSection={<IconPower size={16} />} onClick={p.onPowerOn} disabled={!cc.alive || powerInfo?.trackVoltageOn === true}>{t("commandCenter.powerOn")}</Button>
                <Button size="xs" variant="light" color="orange" leftSection={<IconPower size={16} />} onClick={p.onPowerOff} disabled={!cc.alive || powerInfo?.trackVoltageOff === true}>{t("commandCenter.powerOff")}</Button>
              </Group>

              <Button size="xs" color={powerInfo?.emergencyStop ? "red" : "gray"} variant="filled" leftSection={<IconAlertTriangle size={16} />} onClick={() => powerInfo?.emergencyStop ? p.onPowerOn?.() : p.onEmergencyStop?.()} disabled={!cc.alive}>{t("commandCenter.emergencyStop")}</Button>

              <InfoSection title={t("commandCenter.connection")}>
                <InfoValueRow label={t("commandCenter.type")} value={cc.type ?? "-"} />
                {(cc.type === "z21" || cc.type === "dcc-ex-tcp") && <InfoValueRow label="IP" value={cc.ip ?? "-"} />}
                {(cc.type === "z21" || cc.type === "dcc-ex-tcp") && <InfoValueRow label={t("commandCenter.port")} value={cc.port ?? "-"} />}
                {cc.type === "dcc-ex-serial" && <InfoValueRow label={t("commandCenter.serialPort")} value={cc.serialPort ?? "-"} />}
                {cc.type === "dcc-ex-serial" && <InfoValueRow label={t("commandCenter.baudRate")} value={cc.port ?? "-"} />}
                {cc.connectionString && <InfoValueRow label={t("commandCenter.connectionString")} value={cc.connectionString} />}
              </InfoSection>

              <InfoSection title={t("commandCenter.lock")}>
                <InfoValueRow label={t("commandCenter.state")} value={cc.locked ? t("commandCenter.locked") : t("commandCenter.free")} valueColor={cc.locked ? "orange" : "green"} />
                <InfoValueRow label={t("commandCenter.owner")} value={cc.lockOwner ?? "-"} />
                <InfoValueRow label={t("commandCenter.thisClient")} value={wsApi.clientUuid} valueColor={cc.lockOwner === wsApi.clientUuid ? "lime" : undefined} />
                <InfoValueRow label={t("commandCenter.reason")} value={cc.reason ?? "-"} />
              </InfoSection>

              <InfoSection title={t("commandCenter.power")}>
                <InfoValueRow label={t("commandCenter.trackPower")} value={powerInfo ? powerInfo.trackVoltageOn ? "ON" : "OFF" : "-"} valueColor={powerInfo ? powerInfo.trackVoltageOn ? "green" : "red" : undefined} />
                <InfoValueRow label={t("commandCenter.emergencyStopState")} value={powerInfo ? yesNo(powerInfo.emergencyStop, t) : "-"} valueColor={powerInfo?.emergencyStop ? "red" : undefined} />
                <InfoValueRow label={t("commandCenter.shortCircuit")} value={powerInfo ? yesNo(powerInfo.shortCircuit, t) : "-"} valueColor={powerInfo?.shortCircuit ? "red" : undefined} />
                <InfoValueRow label={t("commandCenter.programming")} value={powerInfo ? yesNo(powerInfo.programmingModeActive, t) : "-"} valueColor={powerInfo?.programmingModeActive ? "orange" : undefined} />
              </InfoSection>
            </Stack>
          </CollapsiblePanelCard>

          <CollapsiblePanelCard title="System" collapsedStorageKey="dcc-express.control-panel.system.stats.collapsed" expandTooltip="Expand" collapseTooltip="Collapse">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <Stack gap="xs">
                <Text size="sm" fw={700}>Client</Text>
                <SmallRow label="JS memory" value={browserStats.memoryUsedMb} suffix=" MB" color={memColor(browserStats.memoryUsedMb)} />
                <SmallRow label="FPS" value={browserStats.fps} color={fpsColor(browserStats.fps)} />
                {/* <SmallRow label="CPU threads" value={browserStats.cpuThreads} color="blue" /> */}
              </Stack>
              <Stack gap="xs">
                <Text size="sm" fw={700}>Server</Text>
                <SmallRow label="RSS memory" value={serverStats?.memoryRssMb} suffix=" MB" color={memColor(serverStats?.memoryRssMb)} />
                <SmallRow label="Heap used" value={serverStats?.memoryHeapUsedMb} suffix=" MB" color={memColor(serverStats?.memoryHeapUsedMb)} />
                <SmallRow label="CPU load" value={serverStats?.systemLoadPercent} suffix="%" color={percentColor(serverStats?.systemLoadPercent)} />
                <SmallRow label="Process CPU" value={serverStats?.processCpuPercent} suffix="%" color={percentColor(serverStats?.processCpuPercent)} />
                <SmallRow label="WS RX" value={serverStats?.wsRxKbps} suffix=" kbit/s" color={trafficColor(serverStats?.wsRxKbps)} />
                <SmallRow label="WS TX" value={serverStats?.wsTxKbps} suffix=" kbit/s" color={trafficColor(serverStats?.wsTxKbps)} />
                <TrafficSparkline samples={trafficSamples} />
              </Stack>
            </SimpleGrid>
          </CollapsiblePanelCard>

          <CollapsiblePanelCard title="Railway info" collapsedStorageKey="dcc-express.control-panel.system.railway-info.collapsed" expandTooltip="Expand" collapseTooltip="Collapse">
            <Group gap="sm">
              <Button variant="light" size="xs" disabled>Railway info...</Button>
              <Button variant="light" size="xs" onClick={() => setDiagnosticsOpened(true)}>Diagnostics...</Button>
            </Group>
            <Text size="sm" c="dimmed">This card is prepared for buttons that will open app dialogs later.</Text>
          </CollapsiblePanelCard>
        </Stack>
      </ScrollArea.Autosize>

      <DiagnosticsDialog
        opened={diagnosticsOpened}
        onClose={() => setDiagnosticsOpened(false)}
      />
    </>
  );
}
