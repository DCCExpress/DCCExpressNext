import { Button, Card, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { TrackLevelCrossingElementView } from "../../models/editor/elements/TrackLevelCrossingElementView";

type LevelCrossingAutomationPanelProps = {
  selectedElement: TrackLevelCrossingElementView;
  onOpenLevelCrossingLogicForElement: (elementId: string) => void;
};

export default function LevelCrossingAutomationPanel({
  selectedElement,
  onOpenLevelCrossingLogicForElement,
}: LevelCrossingAutomationPanelProps) {
  const { t } = useTranslation();

  return (
    <Card withBorder p="xs" mr={16} mb={12}>
      <Stack gap="xs">
        <Text size="sm" fw={600}>
          {t("levelCrossingLogic.panelTitle")}
        </Text>

        <Text size="xs" c="dimmed">
          {t("levelCrossingLogic.panelDescription")}
        </Text>

        <Button
          size="xs"
          variant="light"
          onClick={() => onOpenLevelCrossingLogicForElement(selectedElement.id)}
        >
          {t("levelCrossingLogic.edit")}
        </Button>
      </Stack>
    </Card>
  );
}
