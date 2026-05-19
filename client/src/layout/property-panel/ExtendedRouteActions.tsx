import { Button, Card, Stack, Text } from "@mantine/core";

import type { ExtendedRouteButtonElement } from "../../models/editor/elements/ExtendedRouteButtonElement";

type ExtendedRouteActionsProps = {
  selectedElement: ExtendedRouteButtonElement;
  onRefreshRouteGraph: () => Promise<void>;
  onTestRoute: () => Promise<void>;
};

export default function ExtendedRouteActions({
  selectedElement,
  onRefreshRouteGraph,
  onTestRoute,
}: ExtendedRouteActionsProps) {
  return (
    <Card withBorder p="xs" mr={16} mb={12}>
      <Stack gap="xs">
        <Text size="sm" fw={600}>
          Automatic route test
        </Text>

        <Button
          size="xs"
          variant="light"
          onClick={() => {
            void onRefreshRouteGraph();
          }}
        >
          Refresh segments
        </Button>

        <Button
          size="xs"
          color="lime"
          variant="light"
          onClick={() => {
            void onTestRoute();
          }}
          disabled={!selectedElement.fromBlockId || !selectedElement.toBlockId}
        >
          Test route
        </Button>
      </Stack>
    </Card>
  );
}
