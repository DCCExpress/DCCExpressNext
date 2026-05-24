// client/src/components/app-settings/SystemSettingsTab.tsx

import { Badge, Button, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import type { ICommandCenter } from "../../../../common/src/types";
import CollapsiblePanelCard from "../common/CollapsiblePanelCard";
import { useBrowserStats } from "../../hooks/useBrowserStats";
import { useServerRuntimeStats } from "../../hooks/useServerRuntimeStats";
import CommandCenterSettingsTab from "./CommandCenterSettingsTab";

type SystemSettingsTabProps = {
  commandCenter: ICommandCenter;
  onCommandCenterChange: (commandCenter: ICommandCenter) => void;
};

type InfoRowProps = {
  label: string;
  value: string | number | null | undefined;
  suffix?: string;
  color?: string;
};

function formatValue(value: string | number | null | undefined, suffix = ""): string {
  return value === null || value === undefined || value === "" ? "-" : `${value}${suffix}`;
}

function InfoRow({ label, value, suffix, color = "gray" }: InfoRowProps) {
  return (
    <Group justify="space-between" gap="sm" wrap="nowrap">
      <Text size="sm" c="dimmed">{label}</Text>
      <Badge size="sm" variant="light" color={color}>{formatValue(value, suffix)}</Badge>
    </Group>
  );
}

function getMemoryColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return "gray";
  if (value > 1000) return "red";
  if (value > 500) return "orange";
  return "green";
}

function getPercentColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return "gray";
  if (value > 85) return "red";
  if (value > 65) return "orange";
  return "green";
}

function getFpsColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return "gray";
  if (value < 20) return "red";
  if (value < 45) return "orange";
  return "green";
}

export default function SystemSettingsTab({ commandCenter, onCommandCenterChange }: SystemSettingsTabProps) {
  const browserStats = useBrowserStats(1000);
  const serverStats = useServerRuntimeStats();

  return (
    <Stack gap="md">
      <CollapsiblePanelCard title="Command center" collapsedStorageKey="dcc-express.app-settings.system.command-center.collapsed" expandTooltip="Expand" collapseTooltip="Collapse">
        <CommandCenterSettingsTab commandCenter={commandCenter} onChange={onCommandCenterChange} />
      </CollapsiblePanelCard>

      <CollapsiblePanelCard title="System" collapsedStorageKey="dcc-express.app-settings.system.stats.collapsed" expandTooltip="Expand" collapseTooltip="Collapse">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Stack gap="xs">
            <Text size="sm" fw={700}>Client</Text>
            <InfoRow label="JS memory" value={browserStats.memoryUsedMb} suffix=" MB" color={getMemoryColor(browserStats.memoryUsedMb)} />
            <InfoRow label="FPS" value={browserStats.fps} color={getFpsColor(browserStats.fps)} />
            <InfoRow label="CPU threads" value={browserStats.cpuThreads} color="blue" />
          </Stack>

          <Stack gap="xs">
            <Text size="sm" fw={700}>Server</Text>
            <InfoRow label="RSS memory" value={serverStats?.memoryRssMb} suffix=" MB" color={getMemoryColor(serverStats?.memoryRssMb)} />
            <InfoRow label="Heap used" value={serverStats?.memoryHeapUsedMb} suffix=" MB" color={getMemoryColor(serverStats?.memoryHeapUsedMb)} />
            <InfoRow label="CPU load" value={serverStats?.systemLoadPercent} suffix="%" color={getPercentColor(serverStats?.systemLoadPercent)} />
            <InfoRow label="Process CPU" value={serverStats?.processCpuPercent} suffix="%" color={getPercentColor(serverStats?.processCpuPercent)} />
          </Stack>
        </SimpleGrid>
      </CollapsiblePanelCard>

      <CollapsiblePanelCard title="Railway info" collapsedStorageKey="dcc-express.app-settings.system.railway-info.collapsed" expandTooltip="Expand" collapseTooltip="Collapse">
        <Group gap="sm">
          <Button variant="light" disabled>Railway info...</Button>
          <Button variant="light" disabled>Diagnostics...</Button>
        </Group>
        <Text size="sm" c="dimmed">This card is prepared for buttons that will open app dialogs later.</Text>
      </CollapsiblePanelCard>
    </Stack>
  );
}
