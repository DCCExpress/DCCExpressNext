import { useEffect, useMemo, useState } from "react";

import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { IconDeviceFloppy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { BlockAction, BlockActionHook } from "../../../../common/src/types";
import type { LayoutView } from "../../models/editor/core/LayoutView";
import { BlockElementView } from "../../models/editor/elements/BlockElementView";
import AppModal from "../common/AppModal";
import { BlockActionsEditor } from "./BlockActionsDialog";

type BlockActionsManagerDialogProps = {
  opened: boolean;
  onClose: () => void;
  layout: LayoutView;
  onBlockUpdated: (block: BlockElementView) => void;
  onSaveLayout: () => Promise<void>;
};

function getBlockLabel(block: BlockElementView): string {
  const name = block.name.trim();
  if (name.length > 0) return name;
  if (block.address > 0) return `Block #${block.address}`;
  return block.id;
}

function getActionCount(block: BlockElementView): number {
  return (
    (block.actions?.onTrainEnter?.length ?? 0) +
    (block.actions?.onTrainLeave?.length ?? 0)
  );
}

export default function BlockActionsManagerDialog({
  opened,
  onClose,
  layout,
  onBlockUpdated,
  onSaveLayout,
}: BlockActionsManagerDialogProps) {
  const { t } = useTranslation();
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (!opened) return;

    setSelectedBlockId(previous => {
      if (previous && blocks.some(block => block.id === previous)) {
        return previous;
      }

      return blocks[0]?.id ?? null;
    });
  }, [opened, blocks]);

  const updateSelectedBlockActions = (
    actions: Partial<Record<BlockActionHook, BlockAction[]>>
  ): void => {
    if (!selectedBlock) return;

    selectedBlock.actions = actions;
    onBlockUpdated(selectedBlock);
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      await onSaveLayout();
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
        <Group justify="flex-end">
          <Button
            size="xs"
            leftSection={<IconDeviceFloppy size={14} />}
            loading={saving}
            onClick={handleSave}
          >
            {t("common.save")}
          </Button>
        </Group>

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
                  const actionCount = getActionCount(block);
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
                        count: getActionCount(selectedBlock),
                      })}
                    </Badge>
                  </Group>
                </Card>

                <Box style={{ flex: 1, minHeight: 0 }}>
                  <BlockActionsEditor
                    blockId={selectedBlock.id}
                    blockName={selectedBlock.name}
                    actions={selectedBlock.actions ?? {}}
                    onChange={updateSelectedBlockActions}
                  />
                </Box>
              </Stack>
            )}
          </Box>
        </Group>
      </Stack>
    </AppModal>
  );
}
