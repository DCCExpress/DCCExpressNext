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
import {
  checkBlockAutomationIntegrityWs,
  deleteBlockAutomationOrphansWs,
} from "../../api/blockAutomationWsApi";
import AppModal from "../common/AppModal";

type IntegrityCheckDialogProps = {
  opened: boolean;
  onClose: () => void;
};

const ALL_BLOCKS = "__all_blocks__";

export default function IntegrityCheckDialog({
  opened,
  onClose,
}: IntegrityCheckDialogProps) {
  const [blockReport, setBlockReport] = useState<BlockAutomationIntegrityReportDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [pendingBlockDeletes, setPendingBlockDeletes] = useState<string[]>([]);

  const orphanBlocks = blockReport?.orphanBlocks ?? [];

  const pendingBlockDeleteSet = useMemo(
    () => new Set(pendingBlockDeletes),
    [pendingBlockDeletes]
  );

  const hasPendingChanges = pendingBlockDeletes.length > 0;

  const runChecks = useCallback(async (): Promise<void> => {
    setLoading(true);
    setErrorText(null);
    setStatusText(null);
    setPendingBlockDeletes([]);

    try {
      const nextBlockReport = await checkBlockAutomationIntegrityWs();

      setBlockReport(nextBlockReport);
      setStatusText(
        `Integrity check completed. Block orphans: ${nextBlockReport.orphanBlocks.length}.`
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

  const toggleAllBlockDeletes = (): void => {
    const allBlockIds = orphanBlocks.map(block => block.blockId);
    const allSelected = allBlockIds.length > 0 && allBlockIds.every(blockId => pendingBlockDeleteSet.has(blockId));

    setPendingBlockDeletes(allSelected ? [] : allBlockIds);
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
      const blockResult = await deleteBlockAutomationOrphansWs(pendingBlockDeletes);

      setBlockReport(blockResult.integrity);
      setStatusText(
        `Saved integrity changes. Deleted block entries: ${blockResult.deletedBlockIds.length}.`
      );
      setPendingBlockDeletes([]);
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
                      variant="light"
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      disabled={orphanBlocks.length === 0 || saving}
                      onClick={toggleAllBlockDeletes}
                    >
                      {orphanBlocks.length > 0 && orphanBlocks.every(block => pendingBlockDeleteSet.has(block.blockId))
                        ? "Unselect all"
                        : "Select all"}
                    </Button>
                  </Group>
                </Group>

                {orphanBlocks.length === 0 ? (
                  <Text size="sm" c="dimmed">No orphan block automation entries.</Text>
                ) : (
                  <Stack gap="xs">
                    {orphanBlocks.map(block => {
                      const selected = pendingBlockDeleteSet.has(block.blockId);

                      return (
                        <Card
                          key={block.blockId}
                          withBorder
                          p="sm"
                          {...(selected ? { bg: "red.0" } : {})}
                        >
                          <Group justify="space-between" align="center">
                            <Stack gap={2}>
                              <Text fw={700}>{block.blockId === ALL_BLOCKS ? "All orphan blocks" : block.blockId}</Text>
                              <Text size="xs" c="dimmed">
                                Actions: {block.actionCount}
                              </Text>
                            </Stack>

                            <Button
                              size="xs"
                              variant={selected ? "filled" : "light"}
                              color={selected ? "red" : "gray"}
                              leftSection={selected ? <IconX size={14} /> : <IconTrash size={14} />}
                              onClick={() => toggleBlockDelete(block.blockId)}
                            >
                              {selected ? "Keep" : "Delete"}
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

        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            color="red"
            loading={saving}
            disabled={!hasPendingChanges || loading}
            onClick={() => void saveChanges()}
          >
            Save deletes
          </Button>
        </Group>
      </Stack>
    </AppModal>
  );
}
