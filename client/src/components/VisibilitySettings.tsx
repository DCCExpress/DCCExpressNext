import { Card, Checkbox, Group, Stack, Text } from "@mantine/core";
import { useEditorSettings } from "../context/EditorSettingsContext";

type VisibilitySettingsProps = {
  title?: string;
};

export default function VisibilitySettings({
  title = "Visibility",
}: VisibilitySettingsProps) {
  const { settings, updateSettings } = useEditorSettings();

  return (
    <Card withBorder p="xs">
      <Stack gap={6}>
        <Group mb={2}>
          <Text fw={500}>{title}</Text>
        </Group>

        <Checkbox
          mb={4}
          label="Show occupancy address"
          checked={settings.showOccupacySensorAddress}
          onChange={(e) =>
            updateSettings({
              showOccupacySensorAddress: e.currentTarget.checked,
            })
          }
        />

        <Checkbox
          mb={4}
          label="Show sensor address"
          checked={settings.showSensorAddress}
          onChange={(e) =>
            updateSettings({
              showSensorAddress: e.currentTarget.checked,
            })
          }
        />

        <Checkbox
          mb={4}
          label="Show turnout address"
          checked={settings.showTurnoutAddress}
          onChange={(e) =>
            updateSettings({
              showTurnoutAddress: e.currentTarget.checked,
            })
          }
        />

        <Checkbox
          mb={4}
          label="Show signal address"
          checked={settings.showSignalAddress}
          onChange={(e) =>
            updateSettings({
              showSignalAddress: e.currentTarget.checked,
            })
          }
        />

        <Checkbox
          mb={4}
          label="Show segments"
          checked={settings.showSegments}
          onChange={(e) =>
            updateSettings({
              showSegments: e.currentTarget.checked,
            })
          }
        />

        <Checkbox
          mb={4}
          label="Show grid"
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