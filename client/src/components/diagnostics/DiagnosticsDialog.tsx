import { ActionIcon, Badge, Group, ScrollArea, Stack, Table, Tabs, Text } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

import AppModal from "../common/AppModal";
import { useRailwayDiagnostics } from "../../hooks/useRailwayDiagnostics";
import { wsApi } from "../../services/wsApi";

type DiagnosticsDialogProps = {
  opened: boolean;
  onClose: () => void;
};

type RuntimeItem = {
  address: number;
};

type RuntimeTableProps<T extends RuntimeItem> = {
  items: T[];
  emptyText: string;
  stateLabel: string;
  getStateText: (item: T) => string;
  getStateColor: (item: T) => string;
  onToggle: (item: T) => void;
};

function TabLabel({ label, count }: { label: string; count: number }) {
  return (
    <Group gap={6} wrap="nowrap">
      <Text size="sm">{label}</Text>
      <Badge size="xs" variant="light">{count}</Badge>
    </Group>
  );
}

function RuntimeTable<T extends RuntimeItem>({
  items,
  emptyText,
  stateLabel,
  getStateText,
  getStateColor,
  onToggle,
}: RuntimeTableProps<T>) {
  if (items.length === 0) {
    return <Text size="sm" c="dimmed">{emptyText}</Text>;
  }

  return (
    <ScrollArea h={500} type="auto" offsetScrollbars>
      <Table striped highlightOnHover withTableBorder withColumnBorders stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Address</Table.Th>
            <Table.Th>{stateLabel}</Table.Th>
            <Table.Th>Test</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map(item => (
            <Table.Tr key={item.address}>
              <Table.Td>{item.address}</Table.Td>
              <Table.Td>
                <Badge size="sm" variant="light" color={getStateColor(item)}>
                  {getStateText(item)}
                </Badge>
              </Table.Td>
              <Table.Td>
                <ActionIcon size="sm" variant="light" color="blue" title="Toggle test" onClick={() => onToggle(item)}>
                  <IconRefresh size={14} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

export default function DiagnosticsDialog({ opened, onClose }: DiagnosticsDialogProps) {
  const { sensors, turnouts, accessories } = useRailwayDiagnostics();

  return (
    <AppModal opened={opened} onClose={onClose} title="Diagnostics" size="min(900px, 95vw)" centered draggable>
      <Stack gap="md" h="min(640px, calc(100vh - 130px))">
        <Tabs defaultValue="sensors" style={{ flex: 1, minHeight: 0 }}>
          <Tabs.List>
            <Tabs.Tab value="sensors"><TabLabel label="Sensors" count={sensors.length} /></Tabs.Tab>
            <Tabs.Tab value="turnouts"><TabLabel label="Turnouts" count={turnouts.length} /></Tabs.Tab>
            <Tabs.Tab value="accessories"><TabLabel label="Basic accessories" count={accessories.length} /></Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="sensors" pt="md">
            <RuntimeTable
              items={sensors}
              emptyText="No configured sensors found in the current layout."
              stateLabel="State"
              getStateText={item => item.on ? "ON" : "OFF"}
              getStateColor={item => item.on ? "green" : "gray"}
              onToggle={item => wsApi.setSensor(item.address, !item.on)}
            />
          </Tabs.Panel>

          <Tabs.Panel value="turnouts" pt="md">
            <RuntimeTable
              items={turnouts}
              emptyText="No configured turnouts found in the current layout."
              stateLabel="State"
              getStateText={item => item.closed ? "CLOSED" : "THROWN"}
              getStateColor={item => item.closed ? "green" : "orange"}
              onToggle={item => wsApi.setTurnout(item.address, !item.closed)}
            />
          </Tabs.Panel>

          <Tabs.Panel value="accessories" pt="md">
            <RuntimeTable
              items={accessories}
              emptyText="No basic accessory runtime data yet."
              stateLabel="State"
              getStateText={item => item.active ? "ACTIVE" : "INACTIVE"}
              getStateColor={item => item.active ? "green" : "gray"}
              onToggle={item => wsApi.setBasicAccessory(item.address, !item.active)}
            />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </AppModal>
  );
}
