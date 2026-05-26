import { useEffect, useState } from "react";

import { Button, Card, Stack, Text } from "@mantine/core";

import type {
  BlockAutomationDocumentDto,
} from "../../../../common/src/types";
import {
  createEmptyBlockAutomationDocument,
} from "../../../../common/src/blockAutomation";
import {
  loadBlockAutomationWs,
} from "../../api/blockAutomationWsApi";
import type { BlockElementView } from "../../models/editor/elements/BlockElementView";

type BlockActionsPanelProps = {
  selectedElement: BlockElementView;
  onOpenBlockActionsForBlock: (blockId: string) => void;
};

export default function BlockActionsPanel({
  selectedElement,
  onOpenBlockActionsForBlock,
}: BlockActionsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState<BlockAutomationDocumentDto>(
    createEmptyBlockAutomationDocument()
  );
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

  return (
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
          onClick={() => onOpenBlockActionsForBlock(selectedElement.id)}
        >
          Edit block actions
        </Button>
      </Stack>
    </Card>
  );
}
