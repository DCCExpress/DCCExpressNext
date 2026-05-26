import { useEffect, useState } from "react";

import { Button, Card, Stack, Text } from "@mantine/core";

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
import BlockActionsDialog from "../../components/block-actions/BlockActionsDialog";
import type { BlockElementView } from "../../models/editor/elements/BlockElementView";

type BlockActions = Partial<Record<BlockActionHook, BlockAction[]>>;

type BlockActionsPanelProps = {
  selectedElement: BlockElementView;
};

function cloneBlockActions(actions: BlockActions | undefined): BlockActions {
  return structuredClone(actions ?? {});
}

export default function BlockActionsPanel({
  selectedElement,
}: BlockActionsPanelProps) {
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState<BlockAutomationDocumentDto>(
    createEmptyBlockAutomationDocument()
  );
  const [draftActions, setDraftActions] = useState<BlockActions>({});
  const [errorText, setErrorText] = useState<string | null>(null);

  const currentActions = document.blocks[selectedElement.id] ?? {};
  const enterCount = currentActions.onTrainEnter?.length ?? 0;
  const leaveCount = currentActions.onTrainLeave?.length ?? 0;

  useEffect(() => {
    let cancelled = false;

    const loadAutomation = async (): Promise<void> => {
      setLoading(true);
      setErrorText(null);

      try {
        const loadedDocument = await loadBlockAutomationWs();

        if (cancelled) return;

        setDocument(loadedDocument);
      } catch (error) {
        if (cancelled) return;

        setDocument(createEmptyBlockAutomationDocument());
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
  }, [selectedElement.id]);

  const openDialog = (): void => {
    setDraftActions(cloneBlockActions(document.blocks[selectedElement.id]));
    setOpened(true);
  };

  const saveActions = async (actions: BlockActions): Promise<void> => {
    const nextDocument: BlockAutomationDocumentDto = {
      version: 1,
      blocks: {
        ...document.blocks,
        [selectedElement.id]: cloneBlockActions(actions),
      },
    };

    const savedDocument = await saveBlockAutomationWs(nextDocument);
    setDocument(savedDocument);
  };

  return (
    <>
      <Card withBorder p="xs" mr={16} mb={12}>
        <Stack gap="xs">
          <Text size="sm" fw={600}>Block actions</Text>
          <Text size="xs" c="dimmed">
            Enter: {enterCount}, Leave: {leaveCount}
          </Text>
          {errorText && (
            <Text size="xs" c="red">
              {errorText}
            </Text>
          )}
          <Button
            size="xs"
            variant="light"
            loading={loading}
            onClick={openDialog}
          >
            Edit block actions
          </Button>
        </Stack>
      </Card>

      <BlockActionsDialog
        opened={opened}
        blockId={selectedElement.id}
        blockName={selectedElement.name}
        actions={draftActions}
        onChange={setDraftActions}
        onSave={async () => {
          await saveActions(draftActions);
          setOpened(false);
        }}
        onClose={() => setOpened(false)}
      />
    </>
  );
}
