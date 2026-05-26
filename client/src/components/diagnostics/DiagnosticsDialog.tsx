import { Alert, Badge, Button, Card, Group, NumberInput, ScrollArea, SegmentedControl, Stack, Table, Tabs, Text, Title } from "@mantine/core";
import { IconRefresh, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import type {
  BlockAutomationIntegrityReportDto,
} from "../../../../common/src/blockAutomation";
import type {
  SignalLogicIntegrityReportDto,
} from "../../../../common/src/signalLogic";
import {
  checkBlockAutomationIntegrityWs,
  deleteBlockAutomationOrphansWs,
} from "../../api/blockAutomationWsApi";
import {
  checkSignalLogicIntegrityWs,
  deleteSignalLogicOrphansWs,
} from "../../api/signalLogicWsApi";
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

function IntegrityTab() {
  const [blockReport, setBlockReport] = useState<BlockAutomationIntegrityReportDto | null>(null);
  const [signalReport, setSignalReport] = useState<SignalLogicIntegrityReportDto | null>(null);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);
  const [deletingSignalAddress, setDeletingSignalAddress] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const orphanBlocks = blockReport?.orphanBlocks ?? [];
  const orphanSignals = signalReport?.orphanSignals ?? [];

  const runBlockCheck = async (): Promise<void> => {
    setLoadingBlocks(true);
    setErrorText(null);
    setStatusText(null);

    try {
      const nextReport = await checkBlockAutomationIntegrityWs();
      setBlockReport(nextReport);
      setStatusText(
        nextReport.orphanBlocks.length === 0
          ? "Block automation integrity check completed. No orphan block action entries found."
          : `Block automation integrity check completed. Found ${nextReport.orphanBlocks.length} orphan block action entr${nextReport.orphanBlocks.length === 1 ? "y" : "ies"}.`
      );
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingBlocks(false);
    }
  };

  const runSignalCheck = async (): Promise<void> => {
    setLoadingSignals(true);
    setErrorText(null);
    setStatusText(null);

    try {
      const nextReport = await checkSignalLogicIntegrityWs();
      setSignalReport(nextReport);
      setStatusText(
        nextReport.orphanSignals.length === 0
          ? "Signal logic integrity check completed. No orphan signal rule groups found."
          : `Signal logic integrity check completed. Found ${nextReport.orphanSignals.length} orphan signal rule group${nextReport.orphanSignals.length === 1 ? "" : "s"}.`
      );
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingSignals(false);
    }
  };

  const deleteBlockOrphans = async (blockIds: string[]): Promise<void> => {
    if (blockIds.length === 0) return;

    const deleteStateId = blockIds.length === 1
      ? blockIds[0] ?? null
      : "__all__";

    setDeletingBlockId(deleteStateId);
    setErrorText(null);
    setStatusText(null);

    try {
      const result = await deleteBlockAutomationOrphansWs(blockIds);
      setBlockReport(result.integrity);
      setStatusText(
        `Deleted ${result.deletedBlockIds.length} orphan block action entr${result.deletedBlockIds.length === 1 ? "y" : "ies"}.`
      );
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setDeletingBlockId(null);
    }
  };

  const deleteSignalOrphans = async (signalAddresses: number[]): Promise<void> => {
    if (signalAddresses.length === 0) return;

    const deleteStateId = signalAddresses.length === 1
      ? String(signalAddresses[0] ?? "")
      : "__all__";

    setDeletingSignalAddress(deleteStateId);
    setErrorText(null);
    setStatusText(null);

    try {
      const result = await deleteSignalLogicOrphansWs(signalAddresses);
      setSignalReport(result.integrity);
      setStatusText(
        `Deleted ${result.deletedSignalAddresses.length} orphan signal rule group${result.deletedSignalAddresses.length === 1 ? "" : "s"}.`
      );
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setDeletingSignalAddress(null);
    }
  };

  return (
    <Stack gap="md" h="100%">
      <Alert color="blue" variant="light" title="Layout integrity checks">
        These checks compare saved automation/rule files with the saved layout. Orphan entries reference blocks or signals that no longer exist in the layout.
      </Alert>

      {errorText && (
        <Alert color="red" variant="light">
          {errorText}
        </Alert>
      )}

      {statusText && !errorText && (
        <Alert color="green" variant="light">
          {statusText}
        </Alert>
      )}

      <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto" offsetScrollbars>
        <Stack gap="md" pb="sm">
          <Card withBorder p="md">
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Stack gap={2}>
                  <Title order={5}>Block automation</Title>
                  <Text size="sm" c="dimmed">
                    Compares layout block IDs with block-automation.json entries.
                  </Text>
                </Stack>

                <Group gap="xs">
                  <Button
                    size="xs"
                    leftSection={<IconRefresh size={14} />}
                    loading={loadingBlocks}
                    onClick={() => void runBlockCheck()}
                  >
                    Check blocks
                  </Button>

                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    leftSection={<IconTrash size={14} />}
                    disabled={orphanBlocks.length === 0}
                    loading={deletingBlockId === "__all__"}
                    onClick={() => void deleteBlockOrphans(orphanBlocks.map(block => block.blockId))}
                  >
                    Delete all block orphans
                  </Button>
                </Group>
              </Group>

              {blockReport && (
                <Group gap="xs">
                  <Badge variant="light">Layout blocks: {blockReport.layoutBlockCount}</Badge>
                  <Badge variant="light">Automation blocks: {blockReport.automationBlockCount}</Badge>
                  <Badge color={orphanBlocks.length === 0 ? "green" : "yellow"} variant="light">
                    Orphans: {orphanBlocks.length}
                  </Badge>
                </Group>
              )}

              {!blockReport && (
                <Text size="sm" c="dimmed">
                  Run the block check to find block action entries that no longer have a matching block in the layout.
                </Text>
              )}

              {blockReport && orphanBlocks.length === 0 && (
                <Text size="sm" c="green" fw={600}>
                  No orphan block action entries found.
                </Text>
              )}

              {orphanBlocks.length > 0 && (
                <Stack gap="sm">
                  {orphanBlocks.map(block => (
                    <Card key={block.blockId} withBorder p="sm">
                      <Group justify="space-between" align="center">
                        <Stack gap={2}>
                          <Text fw={700}>{block.blockId}</Text>
                          <Group gap="xs">
                            <Badge variant="light">Actions: {block.actionCount}</Badge>
                            <Badge variant="light">Enter: {block.onTrainEnterCount}</Badge>
                            <Badge variant="light">Leave: {block.onTrainLeaveCount}</Badge>
                          </Group>
                        </Stack>

                        <Button
                          size="xs"
                          color="red"
                          variant="light"
                          leftSection={<IconTrash size={14} />}
                          loading={deletingBlockId === block.blockId}
                          disabled={deletingBlockId !== null && deletingBlockId !== block.blockId}
                          onClick={() => void deleteBlockOrphans([block.blockId])}
                        >
                          Delete
                        </Button>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </Card>

          <Card withBorder p="md">
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Stack gap={2}>
                  <Title order={5}>Signal logic</Title>
                  <Text size="sm" c="dimmed">
                    Compares layout signal addresses with signal-rules.json rule groups.
                  </Text>
                </Stack>

                <Group gap="xs">
                  <Button
                    size="xs"
                    leftSection={<IconRefresh size={14} />}
                    loading={loadingSignals}
                    onClick={() => void runSignalCheck()}
                  >
                    Check signals
                  </Button>

                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    leftSection={<IconTrash size={14} />}
                    disabled={orphanSignals.length === 0}
                    loading={deletingSignalAddress === "__all__"}
                    onClick={() => void deleteSignalOrphans(orphanSignals.map(signal => signal.signalAddress))}
                  >
                    Delete all signal orphans
                  </Button>
                </Group>
              </Group>

              {signalReport && (
                <Group gap="xs">
                  <Badge variant="light">Layout signals: {signalReport.layoutSignalCount}</Badge>
                  <Badge variant="light">Rule groups: {signalReport.ruleGroupCount}</Badge>
                  <Badge color={orphanSignals.length === 0 ? "green" : "yellow"} variant="light">
                    Orphans: {orphanSignals.length}
                  </Badge>
                </Group>
              )}

              {!signalReport && (
                <Text size="sm" c="dimmed">
                  Run the signal check to find signal rule groups whose signal address no longer exists in the layout.
                </Text>
              )}

              {signalReport && orphanSignals.length === 0 && (
                <Text size="sm" c="green" fw={600}>
                  No orphan signal rule groups found.
                </Text>
              )}

              {orphanSignals.length > 0 && (
                <Stack gap="sm">
                  {orphanSignals.map(signal => (
                    <Card key={`${signal.groupId}-${signal.signalAddress}`} withBorder p="sm">
                      <Group justify="space-between" align="center">
                        <Stack gap={2}>
                          <Text fw={700}>Signal #{signal.signalAddress}</Text>
                          <Text size="xs" c="dimmed">Group: {signal.groupId}</Text>
                          <Group gap="xs">
                            <Badge variant="light">Rules: {signal.ruleCount}</Badge>
                            <Badge variant="light">Conditions: {signal.conditionCount}</Badge>
                          </Group>
                        </Stack>

                        <Button
                          size="xs"
                          color="red"
                          variant="light"
                          leftSection={<IconTrash size={14} />}
                          loading={deletingSignalAddress === String(signal.signalAddress)}
                          disabled={deletingSignalAddress !== null && deletingSignalAddress !== String(signal.signalAddress)}
                          onClick={() => void deleteSignalOrphans([signal.signalAddress])}
                        >
                          Delete
                        </Button>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </Card>
        </Stack>
      </ScrollArea>
    </Stack>
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
          If a basic accessory row shows shared address, more than one layout element uses the same physical accessory address. One command may control multiple devices, which is normally not recommended.
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
            <Tabs.Tab value="integrity"><TabLabel label="Integrity" /></Tabs.Tab>
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

          <Tabs.Panel value="integrity" pt="md" style={diagnosticsPanelStyle}>
            <IntegrityTab />
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
