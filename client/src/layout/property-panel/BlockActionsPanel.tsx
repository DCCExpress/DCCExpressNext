import { useState } from "react";

import { Button, Card, Stack, Text } from "@mantine/core";

import BlockActionsDialog from "../../components/block-actions/BlockActionsDialog";
import type { BlockElementView } from "../../models/editor/elements/BlockElementView";

type BlockActionsPanelProps = {
  selectedElement: BlockElementView;
  onUpdateSelectedElement: (element: BlockElementView) => void;
};

export default function BlockActionsPanel({
  selectedElement,
  onUpdateSelectedElement,
}: BlockActionsPanelProps) {
  const [opened, setOpened] = useState(false);
  const enterCount = selectedElement.actions?.onTrainEnter?.length ?? 0;
  const leaveCount = selectedElement.actions?.onTrainLeave?.length ?? 0;

  return (
    <>
      <Card withBorder p="xs" mr={16} mb={12}>
        <Stack gap="xs">
          <Text size="sm" fw={600}>Block actions</Text>
          <Text size="xs" c="dimmed">
            Enter: {enterCount}, Leave: {leaveCount}
          </Text>
          <Button size="xs" variant="light" onClick={() => setOpened(true)}>
            Edit block actions
          </Button>
        </Stack>
      </Card>

      <BlockActionsDialog
        opened={opened}
        blockId={selectedElement.id}
        blockName={selectedElement.name}
        actions={selectedElement.actions ?? {}}
        onChange={actions => {
          selectedElement.actions = actions;
          onUpdateSelectedElement(selectedElement);
        }}
        onClose={() => setOpened(false)}
      />
    </>
  );
}
