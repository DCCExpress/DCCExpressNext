import { Button, Card, Stack, Text } from "@mantine/core";

import type { TrackSignalElementView } from "../../models/editor/elements/TrackSignalElementView";

type SignalLogicPanelProps = {
  selectedElement: TrackSignalElementView;
  onOpenSignalLogicForSignal: (signalAddress: number) => void;
};

export default function SignalLogicPanel({
  selectedElement,
  onOpenSignalLogicForSignal,
}: SignalLogicPanelProps) {
  return (
    <Card withBorder p="xs" mr={16} mb={12}>
      <Stack gap="xs">
        <Text size="sm" fw={600}>Signal logic</Text>
        <Text size="xs" c="dimmed">
          Address: {selectedElement.address}, aspects: {selectedElement.aspect}
        </Text>
        <Button
          size="xs"
          variant="light"
          onClick={() => onOpenSignalLogicForSignal(selectedElement.address)}
        >
          Edit signal logic
        </Button>
      </Stack>
    </Card>
  );
}
