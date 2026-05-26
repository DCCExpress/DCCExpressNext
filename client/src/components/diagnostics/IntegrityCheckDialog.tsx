import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconDeviceFloppy, IconRefresh, IconTrash, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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

type IntegrityCheckDialogProps = {
  opened: boolean;
  onClose: () => void;
};

const ALL_BLOCKS = "__all_blocks__";
const ALL_SIGNALS = "__all_signals__";

export default function IntegrityCheckDialog({
  opened,
  onClose,
}: IntegrityCheckDialogProps) {
  const [blockReport, setBlockReport] = useState<BlockAutomationIntegrityReportDto | null>(null);
  const [signalReport, setSignalReport] = useState<SignalLogicIntegrityReportDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [pendingBlockDeletes, setPendingBlockDeletes] = useState<string[]>([]);
  const [pendingSignalDeletes, setPendingSignalDeletes] = useState<number[]>([]);

  const orphanBlocks = blockReport?.orphanBlocks ?? [];
  const orphanSignals = signalReport?.orphanSignals ?? [];

  const pendingBlockDeleteSet = useMemo(
    () => new Set(pendingBlockDeletes),
    [pendingBlockDeletes]
  );

  const pendingSignalDeleteSet = useMemo(
    () => new Set(pendingSignalDeletes),
    [pendingSignalDeletes]
  );

  const hasPendingChanges = pendingBlockDeletes.length > 0 || pendingSignalDeletes.length > 0;

  const runChecks = useCallback(async (): Promise<void> => {
    setLoading(true);
    setErrorText(null);
    setStatusText(null);
    setPendingBlockDeletes([]);
    setPendingSignalDeletes([]);

    try {
      const [nextBlockReport, nextSignalReport] = await Promise.all([
        checkBlockAutomationIntegrityWs(),
        checkSignalLogicIntegrityWs(),
      ]);

      setBlockReport(nextBlockReport);
      setSignalReport(nextSignalReport);
      setStatusText(
        `Integrity check completed. Block orphans: ${nextBlockReport.orphanBlocks.length}, signal orphans: ${nextSignalReport.orphanSignals.length}.`
      );
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!opened) {
      return;
    }

    void runChecks();
  }, [opened, runChecks]);

  const toggleBlockDelete = (blockId: string): void => {
    setPendingBlockDeletes(previous => (
      previous.includes(blockId)
        ? previous.filter(current => current !== blockId)
        : [...previous, blockId]
    ));
  };

  const toggleSignalDelete = (signalAddress: number): void => {
    setPendingSignalDeletes(previous => (
      previous.includes(signalAddress)
        ? previous.filter(current => current !== signalAddress)
        : [...previous, signalAddress]
    ));
  };

  const toggleAllBlockDeletes = (): void => {
    const allBlockIds = orphanBlocks.map(block => block.blockId);
    const allSelected = allBlockIds.length > 0 && allBlockIds.every(blockId => pendingBlockDeleteSet.has(blockId));

    setPendingBlockDeletes(allSelected ? [] : allBlockIds);
  };

  const toggleAllSignalDeletes = (): void => {
    const allSignalAddresses = orphanSignals.map(signal => signal.signalAddress);
    const allSelected = allSignalAddresses.length > 0 && allSignalAddresses.every(address => pendingSignalDeleteSet.has(address));

    setPendingSignalDeletes(allSelected ? [] : allSignalAddresses);
  };

  const saveChanges = async (): Promise<void> => {
    if (!hasPendingChanges) {
      setStatusText("No pending integrity changes to save.");
      return;
    }

    setSaving(true);
    setErrorText(null);
    setStatusText(null);

    try {
      const [blockResult, signalResult] = await Promise.all([
        pendingBlockDeletes.length > 0
          ? deleteBlockAutomationOrphansWs(pendingBlockDeletes)
          : Promise.resolve(null),
        pendingSignalDeletes.length > 0
          ? deleteSignalLogicOrphansWs(pendingSignalDeletes)
          : Promise.resolve(null),
      ]);

      setBlockReport(blockResult?.integrity ?? await checkBlockAutomationIntegrityWs());
      setSignalReport(signalResult?.integrity ?? await checkSignalLogicIntegrityWs());
      setStatusText(
        `Saved integrity changes. Deleted block entries: ${blockResult?.deletedBlockIds.length ?? 0}, signal rule groups: ${signalResult?.deletedSignalAddresses.length ?? 0}.`
      );
      setPendingBlockDeletes([]);
      setPendingSignalDeletes([]);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Integrity check"
      size="min(1120px, 96vw)"
      centered
      draggable
      styles={{
        content: {
          height: "min(820px, calc(100vh - 48px))",
          maxHeight: "min(820px, calc(100vh - 48px))",
          display: "flex",
          flexDirection: "column",
        },
        body: {
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Stack h="100%" gap="md">
        <Alert color="yellow" variant="light" title="Saved layout check">
          This check compares automation files with the saved layout on the server. If the editor is currently in edit mode or the layout has unsaved changes, the result may not match the visible canvas. It is recommended to save the layout and also run this check in run mode.
        </Alert>

        {loading && (
          <Group gap="xs">
            <Loader size="xs" />
            <Text size="sm" c="dimmed">Checking layout integrity...</Text>
          </Group>
        )}

        {errorText && (
          <Alert color="red" variant="light">
            {errorText}
          </Alert>
        )}

        {statusText && !errorText && (
          <Alert color={hasPendingChanges ? "yellow" : "green"} variant="light">
            {statusText}
          </Alert>
        )}

        <Group gap="xs" justify="space-between">
          <Group gap="xs">
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="light"
              loading={loading}
              disabled={saving}
              onClick={() => void runChecks()}
            >
              Recheck
            </Button>
          </Group>

          <Group gap="xs">
            <Badge color={pendingBlockDeletes.length > 0 ? "yellow" : "gray"} variant="light">
              Pending block deletes: {pendingBlockDeletes.length}
            </Badge>
            <Badge color={pendingSignalDeletes.length > 0 ? "yellow" : "gray"} variant="light">
              Pending signal deletes: {pendingSignalDeletes.length}
            </Badge>
          </Group>
        </Group>

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
                    {blockReport && (
                      <>
                        <Badge variant="light">Layout blocks: {blockReport.layoutBlockCount}</Badge>
                        <Badge variant="light">Automation blocks: {blockReport.automationBlockCount}</Badge>
                        <Badge color={orphanBlocks.length === 0 ? "green" : "yellow"} variant="light">
                          Orphans: {orphanBlocks.length}
                        </Badge>
                      </>
                    )}

                    <Button
                      size="xs"
                      color="red"
                      variant="light"
                      leftSection={pendingBlockDeletes.length === orphanBlocks.length && orphanBlocks.length > 0 ? <IconX size={14} /> : <IconTrash size={14} />}
                      disabled={orphanBlocks.length === 0 || loading || saving}
                      onClick={toggleAllBlockDeletes}
                    >
                      {pendingBlockDeletes.length === orphanBlocks.length && orphanBlocks.length > 0
                        ? "Unmark all blocks"
                        : "Mark all block orphans"}
                    </Button>
                  </Group>
                </Group>

                {!blockReport && !loading && (
                  <Text size="sm" c="dimmed">
                    The block integrity check will run automatically when this dialog opens.
                  </Text>
                )}

                {blockReport && orphanBlocks.length === 0 && (
                  <Text size="sm" c="green" fw={600}>
                    No orphan block action entries found.
                  </Text>
                )}

                {orphanBlocks.length > 0 && (
                  <Stack gap="sm">
                    {orphanBlocks.map(block => {
                      const marked = pendingBlockDeleteSet.has(block.blockId);

                      return (
                        <Card
                          key={block.blockId}
                          withBorder
                          p="sm"
                          style={marked ? { borderColor: "var(--mantine-color-red-5)" } : undefined}
                        >
                          <Group justify="space-between" align="center">
                            <Stack gap={2}>
                              <Text fw={700}>{block.blockId}</Text>
                              <Group gap="xs">
                                <Badge variant="light">Actions: {block.actionCount}</Badge>
                                <Badge variant="light">Enter: {block.onTrainEnterCount}</Badge>
                                <Badge variant="light">Leave: {block.onTrainLeaveCount}</Badge>
                                {marked && <Badge color="red" variant="light">marked for delete</Badge>}
                              </Group>
                            </Stack>

                            <Button
                              size="xs"
                              color={marked ? "gray" : "red"}
                              variant="light"
                              leftSection={marked ? <IconX size={14} /> : <IconTrash size={14} />}
                              disabled={saving}
                              onClick={() => toggleBlockDelete(block.blockId)}
                            >
                              {marked ? "Undo" : "Delete"}
                            </Button>
                          </Group>
                        </Card>
                      );
                    })}
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
                    {signalReport && (
                      <>
                        <Badge variant="light">Layout signals: {signalReport.layoutSignalCount}</Badge>
                        <Badge variant="light">Rule groups: {signalReport.ruleGroupCount}</Badge>
                        <Badge color={orphanSignals.length === 0 ? "green" : "yellow"} variant="light">
                          Orphans: {orphanSignals.length}
                        </Badge>
                      </>
                    )}

                    <Button
                      size="xs"
                      color="red"
                      variant="light"
                      leftSection={pendingSignalDeletes.length === orphanSignals.length && orphanSignals.length > 0 ? <IconX size={14} /> : <IconTrash size={14} />}
                      disabled={orphanSignals.length === 0 || loading || saving}
                      onClick={toggleAllSignalDeletes}
                    >
                      {pendingSignalDeletes.length === orphanSignals.length && orphanSignals.length > 0
                        ? "Unmark all signals"
                        : "Mark all signal orphans"}
                    </Button>
                  </Group>
                </Group>

                {!signalReport && !loading && (
                  <Text size="sm" c="dimmed">
                    The signal integrity check will run automatically when this dialog opens.
                  </Text>
                )}

                {signalReport && orphanSignals.length === 0 && (
                  <Text size="sm" c="green" fw={600}>
                    No orphan signal rule groups found.
                  </Text>
                )}

                {orphanSignals.length > 0 && (
                  <Stack gap="sm">
                    {orphanSignals.map(signal => {
                      const marked = pendingSignalDeleteSet.has(signal.signalAddress);

                      return (
                        <Card
                          key={`${signal.groupId}-${signal.signalAddress}`}
                          withBorder
                          p="sm"
                          style={marked ? { borderColor: "var(--mantine-color-red-5)" } : undefined}
                        >
                          <Group justify="space-between" align="center">
                            <Stack gap={2}>
                              <Text fw={700}>Signal #{signal.signalAddress}</Text>
                              <Text size="xs" c="dimmed">Group: {signal.groupId}</Text>
                              <Group gap="xs">
                                <Badge variant="light">Rules: {signal.ruleCount}</Badge>
                                <Badge variant="light">Conditions: {signal.conditionCount}</Badge>
                                {marked && <Badge color="red" variant="light">marked for delete</Badge>}
                              </Group>
                            </Stack>

                            <Button
                              size="xs"
                              color={marked ? "gray" : "red"}
                              variant="light"
                              leftSection={marked ? <IconX size={14} /> : <IconTrash size={14} />}
                              disabled={saving}
                              onClick={() => toggleSignalDelete(signal.signalAddress)}
                            >
                              {marked ? "Undo" : "Delete"}
                            </Button>
                          </Group>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            </Card>
          </Stack>
        </ScrollArea>

        <Group justify="flex-end">
          <Button variant="light" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={saving}
            disabled={loading || !hasPendingChanges}
            onClick={() => void saveChanges()}
          >
            Save changes
          </Button>
        </Group>
      </Stack>
    </AppModal>
  );
}
