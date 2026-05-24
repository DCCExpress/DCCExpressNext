import { Alert, Badge, Button, Group, NumberInput, ScrollArea, SegmentedControl, Stack, Table, Tabs, Text } from "@mantine/core";
import { useState } from "react";

import AppModal from "../common/AppModal";
import { useRailwayDiagnostics, type DiagnosticAccessoryItem } from "../../hooks/useRailwayDiagnostics";
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
  onSet: (item: T, active: boolean) => void;
};

type CommandKind = "basicAccessory" | "sensor" | "turnout";

const diagnosticsPanelStyle = {
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
} as const;

function TabLabel({ label, count }: { label: string; count?: number }) {
  return (
    <Group gap={6} wrap="nowrap">
      <Text size="sm">{label}</Text>
      {count !== undefined && (
        <Badge size="xs" variant="light">
          {count}
        </Badge>
      )}
    </Group>
  );
}

function RuntimeTable<T extends RuntimeItem>({
  items,
  emptyText,
  stateLabel,
  getStateText,
  getStateColor,
  onSet,
}: RuntimeTableProps<T>) {
  if (items.length === 0) {
    return <Text size="sm" c="dimmed">{emptyText}</Text>;
  }

  return (
    <ScrollArea h="100%" type="auto" offsetScrollbars>
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
                <Group gap="xs" wrap="nowrap">
                  <Button size="compact-xs" variant="light" color="green" onClick={() => onSet(item, true)}>
                    ON
                  </Button>
                  <Button size="compact-xs" variant="light" color="gray" onClick={() => onSet(item, false)}>
                    OFF
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

function BasicAccessoryTable({
  items,
}: {
  items: DiagnosticAccessoryItem[];
}) {
  if (items.length === 0) {
    return <Text size="sm" c="dimmed">No basic accessory runtime data yet.</Text>;
  }

  return (
    <ScrollArea h="100%" type="auto" offsetScrollbars>
      <Table striped highlightOnHover withTableBorder withColumnBorders stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Address</Table.Th>
            <Table.Th>Physical state</Table.Th>
            <Table.Th>Warning</Table.Th>
            <Table.Th>Element type</Table.Th>
            <Table.Th>Element name</Table.Th>
            <Table.Th>Test</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map(item => (
            <Table.Tr key={item.address} style={item.hasConflict ? { backgroundColor: "var(--mantine-color-yellow-light)" } : undefined}>
              <Table.Td>{item.address}</Table.Td>
              <Table.Td>
                <Badge size="sm" variant="light" color={item.active ? "green" : "gray"}>
                  {item.active ? "ON" : "OFF"}
                </Badge>
              </Table.Td>
              <Table.Td>
                {item.hasConflict ? (
                  <Badge size="sm" color="yellow" variant="filled">
                    shared address
                  </Badge>
                ) : (
                  <Text size="sm" c="dimmed">-</Text>
                )}
              </Table.Td>
              <Table.Td>
                <Stack gap={3}>
                  {item.sources.length === 0 ? (
                    <Text size="sm" c="dimmed">runtime only</Text>
                  ) : item.sources.map(source => (
                    <Badge key={`${item.address}-${source.elementId}-${source.elementType}`} size="sm" variant="light">
                      {source.elementType}
                    </Badge>
                  ))}
                </Stack>
              </Table.Td>
              <Table.Td>
                <Stack gap={3}>
                  {item.sources.length === 0 ? (
                    <Text size="sm" c="dimmed">-</Text>
                  ) : item.sources.map(source => (
                    <Text key={`${item.address}-${source.elementId}-${source.elementName}`} size="sm">
                      {source.elementName}
                    </Text>
                  ))}
                </Stack>
              </Table.Td>
              <Table.Td>
                <Group gap="xs" wrap="nowrap">
                  <Button size="compact-xs" variant="light" color="green" onClick={() => wsApi.setBasicAccessory(item.address, true)}>
                    ON
                  </Button>
                  <Button size="compact-xs" variant="light" color="gray" onClick={() => wsApi.setBasicAccessory(item.address, false)}>
                    OFF
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

function CommandTab() {
  const [kind, setKind] = useState<CommandKind>("basicAccessory");
  const [address, setAddress] = useState<number | string>(1);

  const numericAddress = typeof address === "number" ? address : Number(address);
  const validAddress = Number.isFinite(numericAddress) && numericAddress > 0;

  const send = (active: boolean): void => {
    if (!validAddress) return;

    if (kind === "basicAccessory") {
      wsApi.setBasicAccessory(numericAddress, active);
      return;
    }

    if (kind === "sensor") {
      wsApi.setSensor(numericAddress, active);
      return;
    }

    wsApi.setTurnout(numericAddress, active);
  };

  return (
    <Stack gap="md" maw={520}>
      <Alert color="blue" variant="light">
        Basic accessory sends a raw physical accessory ON/OFF command. A turnout can also be tested as a basic accessory address if needed.
      </Alert>

      <SegmentedControl
        value={kind}
        onChange={value => setKind(value as CommandKind)}
        data={[
          { label: "Basic accessory", value: "basicAccessory" },
          { label: "Sensor", value: "sensor" },
          { label: "Turnout", value: "turnout" },
        ]}
      />

      <NumberInput
        label="Address"
        value={address}
        min={1}
        allowDecimal={false}
        onChange={setAddress}
      />

      <Group gap="sm">
        <Button color="green" disabled={!validAddress} onClick={() => send(true)}>
          ON
        </Button>
        <Button color="gray" variant="light" disabled={!validAddress} onClick={() => send(false)}>
          OFF
        </Button>
      </Group>
    </Stack>
  );
}

function InfoHelpTab() {
  return (
    <ScrollArea h="100%" type="auto" offsetScrollbars>
      <Stack gap="md" maw={820}>
        <Alert color="blue" variant="light" title="Diagnostics value model">
          This dialog shows physical command-center values. These values are useful for low-level testing, but they are not always the same as the logical layout state.
        </Alert>

        <Stack gap={4}>
          <Text fw={700}>Basic accessory / signal / raw accessory</Text>
          <Text size="sm">
            OFF means deactivate / value 0. ON means activate / value 1.
          </Text>
          <Text size="sm">
            Signals are handled as basic accessory address ranges. A signal with start address A and length L uses addresses A through A + L - 1.
          </Text>
        </Stack>

        <Stack gap={4}>
          <Text fw={700}>Sensors</Text>
          <Text size="sm">
            Sensor ON/OFF values changed from this dialog are simulated/test values. They are not real physical DCC sensor commands.
          </Text>
        </Stack>

        <Stack gap={4}>
          <Text fw={700}>Turnouts</Text>
          <Text size="sm">
            Turnout values are physical command-center values. In many systems, physical 0/false means closed and physical 1/true means thrown.
          </Text>
          <Text size="sm">
            DCCExpress also has a logical turnout setting named turnoutClosedValue. Logical CLOSED means physical value equals turnoutClosedValue; logical THROWN means it does not.
          </Text>
        </Stack>

        <Stack gap={4}>
          <Text fw={700}>DCC-EX and Z21 summary</Text>
          <Text size="sm">
            DCC-EX basic accessory: 0 = deactivate/OFF, 1 = activate/ON.
          </Text>
          <Text size="sm">
            DCC-EX turnout command convention: 0 = unthrown, 1 = thrown.
          </Text>
          <Text size="sm">
            Z21 turnout handling is best treated as turnout state, not as raw ON/OFF. In practice, false is commonly closed and true is commonly thrown.
          </Text>
        </Stack>

        <Alert color="yellow" variant="light" title="Shared address warning">
          If a basic accessory row shows shared address, more than one layout element uses the same physical accessory address. That usually means one command may control multiple devices, which is normally not recommended.
        </Alert>
      </Stack>
    </ScrollArea>
  );
}

export default function DiagnosticsDialog({ opened, onClose }: DiagnosticsDialogProps) {
  const { sensors, turnouts, accessories } = useRailwayDiagnostics();

  return (
    <AppModal opened={opened} onClose={onClose} title="Diagnostics" size="min(1120px, 96vw)" centered draggable>
      <Stack gap="md" h="min(760px, calc(100vh - 100px))" style={{ overflow: "hidden" }}>
        <Alert color="yellow" variant="light">
          Values shown here are physical command-center values, not logical layout values. Sensor values are simulated/test values when changed from this dialog.
        </Alert>

        <Tabs
          defaultValue="sensors"
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Tabs.List>
            <Tabs.Tab value="sensors"><TabLabel label="Sensors" count={sensors.length} /></Tabs.Tab>
            <Tabs.Tab value="turnouts"><TabLabel label="Turnouts" count={turnouts.length} /></Tabs.Tab>
            <Tabs.Tab value="accessories"><TabLabel label="Basic accessories" count={accessories.length} /></Tabs.Tab>
            <Tabs.Tab value="command"><TabLabel label="Command" /></Tabs.Tab>
            <Tabs.Tab value="info"><TabLabel label="Info / Help" /></Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="sensors" pt="md" style={diagnosticsPanelStyle}>
            <RuntimeTable
              items={sensors}
              emptyText="No configured sensors found in the current layout."
              stateLabel="State"
              getStateText={item => item.on ? "ON" : "OFF"}
              getStateColor={item => item.on ? "green" : "gray"}
              onSet={(item, active) => wsApi.setSensor(item.address, active)}
            />
          </Tabs.Panel>

          <Tabs.Panel value="turnouts" pt="md" style={diagnosticsPanelStyle}>
            <RuntimeTable
              items={turnouts}
              emptyText="No configured turnouts found in the current layout."
              stateLabel="Physical state"
              getStateText={item => item.closed ? "ON / CLOSED" : "OFF / THROWN"}
              getStateColor={item => item.closed ? "green" : "orange"}
              onSet={(item, active) => wsApi.setTurnout(item.address, active)}
            />
          </Tabs.Panel>

          <Tabs.Panel value="accessories" pt="md" style={diagnosticsPanelStyle}>
            <BasicAccessoryTable items={accessories} />
          </Tabs.Panel>

          <Tabs.Panel value="command" pt="md" style={diagnosticsPanelStyle}>
            <CommandTab />
          </Tabs.Panel>

          <Tabs.Panel value="info" pt="md" style={diagnosticsPanelStyle}>
            <InfoHelpTab />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </AppModal>
  );
}
