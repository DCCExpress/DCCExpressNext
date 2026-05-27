import { Button, Card, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { TrackLevelCrossingElementView } from "../../models/editor/elements/TrackLevelCrossingElementView";

type LevelCrossingAutomationPanelProps = {
  selectedElement: TrackLevelCrossingElementView;
  onOpenLevelCrossingLogicForElement: (elementId: string) => void;
};

const LABELS = {
  en: {
    panelTitle: "Level crossing automation",
    panelDescription: "Edit server-side automation for this level crossing.",
    edit: "Edit level crossing logic",
  },
  hu: {
    panelTitle: "Sorompó automatika",
    panelDescription: "A kijelölt sorompó szerveroldali automatizálásának szerkesztése.",
    edit: "Sorompólogika szerkesztése",
  },
  de: {
    panelTitle: "Bahnübergang-Automatik",
    panelDescription: "Serverseitige Automatik für diesen Bahnübergang bearbeiten.",
    edit: "Bahnübergang-Logik bearbeiten",
  },
} as const;

function getLabels(language: string) {
  if (language.startsWith("hu")) return LABELS.hu;
  if (language.startsWith("de")) return LABELS.de;
  return LABELS.en;
}

export default function LevelCrossingAutomationPanel({
  selectedElement,
  onOpenLevelCrossingLogicForElement,
}: LevelCrossingAutomationPanelProps) {
  const { i18n } = useTranslation();
  const labels = getLabels(i18n.language);

  return (
    <Card withBorder p="xs" mr={16} mb={12}>
      <Stack gap="xs">
        <Text size="sm" fw={600}>
          {labels.panelTitle}
        </Text>

        <Text size="xs" c="dimmed">
          {labels.panelDescription}
        </Text>

        <Button
          size="xs"
          variant="light"
          onClick={() => onOpenLevelCrossingLogicForElement(selectedElement.id)}
        >
          {labels.edit}
        </Button>
      </Stack>
    </Card>
  );
}
