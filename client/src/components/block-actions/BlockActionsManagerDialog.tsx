import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { IconAlertTriangle, IconDeviceFloppy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type {
  BlockAction,
  BlockActionHook,
  BlockAutomationDocumentDto,
} from "../../../../common/src/types";
import {
  createEmptyBlockAutomationDocument,
} from "../../../../common/src/blockAutomation";
import {
  loadBlockAutomationWs,
  saveBlockAutomationWs,
} from "../../api/blockAutomationWsApi";
import type { LayoutView } from "../../models/editor/core/LayoutView";
import { BlockElementView } from "../../models/editor/elements/BlockElementView";
import AppModal from "../common/AppModal";
import { BlockActionsEditor } from "./BlockActionsDialog";

type BlockActions = Partial<Record<BlockActionHook, BlockAction[]>>;
type BlockActionsDraft = Record<string, BlockActions>;

type BlockActionsManagerDialogProps = {
  opened: boolean;
  onClose: () => void;
  layout: LayoutView;
};

function getBlockLabel(block: BlockElementView): string {
  const name = block.name.trim();
  if (name.length > 0) return name;
  if (block.address > 0) return `Block #${block.address}`;
  return block.id;
}

function cloneBlockActions(actions: BlockActions | undefined): BlockActions {
  return structuredClone(actions ?? {});
}

function getActionCountFromActions(actions: BlockActions | undefined): number {
  return (
    (actions?.onTrainEnter?.length ?? 0) +
    (actions?.onTrainLeave?.length ?? 0)
  );
}

function createDraft(
  blocks: BlockElementView[],
  document: BlockAutomationDocumentDto
): BlockActionsDraft {
  return Object.fromEntries(
    blocks.map(block => [block.id, cloneBlockActions(document.blocks[block.id])])
  );
}

function createDocumentFromDraft(
  draft: BlockActionsDraft
): BlockAutomationDocumentDto {
  const blocks: BlockAutomationDocumentDto["blocks"] = {};

  for (const [blockId, actions] of Object.entries(draft)) {
    const clonedActions = cloneBlockActions(actions);

    if (getActionCountFromActions(clonedActions) > 0) {
      blocks[blockId] = clonedActions;
    }
  }

  return {
    version: 1,
    blocks,
  };
}

export default function BlockActionsManagerDialog({
  opened,
  onClose,
  layout,
}: BlockActionsManagerDialogProps) {
  const { t } = useTranslation();
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [draftActions, setDraftActions] = useState<BlockActionsDraft>({});

  const blocks = useMemo(() => {
    return layout
      .getAllElements()
      .filter((element): element is BlockElementView => element instanceof BlockElementView)
      .sort((a, b) => getBlockLabel(a).localeCompare(getBlockLabel(b), undefined, {
        numeric: true,
        sensitivity: "base",
      }));
  }, [layout]);

  const selectedBlock = blocks.find(block => block.id === selectedBlockId) ?? blocks[0] ?? null;
  const selectedBlockActions = selectedBlock ? draftActions[selectedBlock.id] ?? {} : {};

  useEffect(() => {
    if (!opened) {
      setDraftActions({});
      setErrorText(null);
      return;
    }

    let cancelled = false;

    const loadAutomation = async (): Promise<void> => {
      setLoading(true);
      setErrorText(null);

      try {
        const document = await loadBlockAutomationWs();

        if (cancelled) return;

        setDraftActions(createDraft(blocks, document));
        setSelectedBlockId(previous => {
          if (previous && blocks.some(block => block.id === previous)) {
            return previous;
          }

          return blocks[0]?.id ?? null;
        });
      } catch (error) {
        if (cancelled) return;

        setDraftActions(createDraft(blocks, createEmptyBlockAutomationDocument()));
        setErrorText(error instanceof Error ? error.message : String(error));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAutomation();

    return () => {
      cancelled = true;
    };
  }, [opened, blocks]);

  const updateSelectedBlockActions = (actions: BlockActions): void => {
    if (!selectedBlock) return;

    setDraftActions(previous => ({
      ...previous,
      [selectedBlock.id]: actions,
    }));
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setErrorText(null);

    try {
      const document = createDocumentFromDraft(draftActions);
      const savedDocument = await saveBlockAutomationWs(document);
      setDraftActions(createDraft(blocks, savedDocument));
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
      title={t("blockActions.managerTitle")}
      size="min(1180px, 96vw)"
      centered
      draggable
      styles={{
        content: {
          height: "min(780px, calc(100vh - 48px))",
          maxHeight: "min(780px, calc(100vh - 48px))",
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
      <Stack h="100%" gap="xs">
        {loading && (
          <Group gap="xs">
            <Loader size="xs" />
            <Text size="sm" c="dimmed">{t("common.loading")}</Text>
          </Group>
        )}

        {errorText && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} py="xs">
            {errorText}
          </Alert>
        )}

        <Group align="stretch" wrap="nowrap" style={{ flex: 1, minHeight: 0 }}>
          <Card withBorder w={280} p="sm" style={{ flex: "0 0 280px" }}>
            <Group justify="space-between" mb="sm">
              <Title order={5}>{t("blockActions.blocks")}</Title>
              <Badge variant="light">{blocks.length}</Badge>
            </Group>

            <ScrollArea h="100%" type="auto" offsetScrollbars>
              <Stack gap="xs">
                {blocks.length === 0 && (
                  <Text size="sm" c="dimmed">
                    {t("blockActions.emptyBlocks")}
                  </Text>
                )}

                {blocks.map(block => {
                  const blockActions = draftActions[block.id];
                  const actionCount = getActionCountFromActions(blockActions);
                  const selected = block.id === selectedBlock?.id;

                  return (
                    <Button
                      key={block.id}
                      variant={selected ? "filled" : "light"}
                      justify="space-between"
                      onClick={() => setSelectedBlockId(block.id)}
                    >
                      <span>{getBlockLabel(block)}</span>
                      <Badge size="xs" bg="cyan" c="white" variant="light" m={5}>
                        {actionCount}
                      </Badge>
                    </Button>
                  );
                })}
              </Stack>
            </ScrollArea>
          </Card>

          <Box flex={1} style={{ minWidth: 0, minHeight: 0 }}>
            {!selectedBlock ? (
              <Card withBorder p="lg">
                <Text c="dimmed">{t("blockActions.selectBlock")}</Text>
              </Card>
            ) : (
              <Stack h="100%" gap="xs">
                <Card withBorder p="sm">
                  <Group justify="space-between" align="center">
                    <Stack gap={2}>
                      <Text fw={700}>{getBlockLabel(selectedBlock)}</Text>
                      <Text size="xs" c="dimmed">
                        {t("blockActions.blockDetails", {
                          id: selectedBlock.id,
                          address: selectedBlock.address,
                          sensor: selectedBlock.sensorAddress,
                        })}
                      </Text>
                    </Stack>

                    <Badge variant="light">
                      {t("blockActions.totalActions", {
                        count: getActionCountFromActions(selectedBlockActions),
                      })}
                    </Badge>
                  </Group>
                </Card>

                <Box style={{ flex: 1, minHeight: 0 }}>
                  <BlockActionsEditor
                    blockId={selectedBlock.id}
                    blockName={selectedBlock.name}
                    actions={selectedBlockActions}
                    onChange={updateSelectedBlockActions}
                  />
                </Box>
              </Stack>
            )}
          </Box>
        </Group>

        <Group justify="flex-end">
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={saving}
            disabled={loading}
            onClick={handleSave}
          >
            {t("common.save")}
          </Button>
        </Group>
      </Stack>
    </AppModal>
  );
}
