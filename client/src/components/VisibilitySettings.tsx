import { Card, Checkbox, Group, Stack, Text } from "@mantine/core";
import { useEditorSettings } from "../context/EditorSettingsContext";
import { useTranslation } from "react-i18next";

type VisibilitySettingsProps = {
  title?: string;
};

export default function VisibilitySettings({
  title,
}: VisibilitySettingsProps) {
  const { t } = useTranslation();
  const { settings, updateSettings } = useEditorSettings();

  return (
    <Card withBorder p="xs">
      <Stack gap={6}>
        <Group mb={2}>
          <Text fw={500}>{title ?? t("visibility.title")}</Text>
        </Group>

        <Checkbox
          mb={4}
          label={t("visibility.showOccupancyAddress")}
          checked={settings.showOccupacySensorAddress}
          onChange={(e) =>
            updateSettings({
              showOccupacySensorAddress: e.currentTarget.checked,
            })
          }
        />

        <Checkbox
          mb={4}
          label={t("visibility.showSensorAddress")}
          checked={settings.showSensorAddress}
          onChange={(e) =>
            updateSettings({
              showSensorAddress: e.currentTarget.checked,
            })
          }
        />

        <Checkbox
          mb={4}
          label={t("visibility.showTurnoutAddress")}
          checked={settings.showTurnoutAddress}
          onChange={(e) =>
            updateSettings({
              showTurnoutAddress: e.currentTarget.checked,
            })
          }
        />

        <Checkbox
          mb={4}
          label={t("visibility.showSignalAddress")}
          checked={settings.showSignalAddress}
          onChange={(e) =>
            updateSettings({
              showSignalAddress: e.currentTarget.checked,
            })
          }
        />

        <Checkbox
          mb={4}
          label={t("visibility.showSegments")}
          checked={settings.showSegments}
          onChange={(e) =>
            updateSettings({
              showSegments: e.currentTarget.checked,
            })
          }
        />
        <Checkbox
          mb={4}
          label={t("visibility.showBlockNames")}
          checked={settings.showBlockNames}
          onChange={(e) =>
            updateSettings({
              showBlockNames: e.currentTarget.checked,
            })
          }
        />
        <Checkbox
          mb={4}
          label={t("visibility.showGrid")}
          checked={settings.showGrid}
          onChange={(e) =>
            updateSettings({
              showGrid: e.currentTarget.checked,
            })
          }
        />
      </Stack>
    </Card>
  );
}
