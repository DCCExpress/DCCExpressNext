import { Button, Card, Stack, Text } from "@mantine/core";

import type { ExtendedRouteButtonElementView } from "../../models/editor/elements/ExtendedRouteButtonElementView";
import { useTranslation } from "react-i18next";

type ExtendedRouteActionsProps = {
  selectedElement: ExtendedRouteButtonElementView;
  onRefreshRouteGraph: () => Promise<void>;
  onTestRoute: () => Promise<void>;
};

export default function ExtendedRouteActions({
  selectedElement,
  onRefreshRouteGraph,
  onTestRoute,
}: ExtendedRouteActionsProps) {
  const { t } = useTranslation();

  return (
    <Card withBorder p="xs" mr={16} mb={12}>
      <Stack gap="xs">
        <Text size="sm" fw={600}>
          {t("routesPanel.automaticRouteTest")}
        </Text>

        <Button
          size="xs"
          variant="light"
          onClick={() => {
            void onRefreshRouteGraph();
          }}
        >
          {t("routesPanel.refreshSegments")}
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
          {t("graph.solver.testRoute")}
        </Button>
      </Stack>
    </Card>
  );
}
