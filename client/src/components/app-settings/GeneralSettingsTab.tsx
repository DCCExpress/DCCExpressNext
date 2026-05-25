import {
  Stack,
  Text,
} from "@mantine/core";

import type {
  GeneralSettings,
} from "../../../../common/src/appSettings";

type GeneralSettingsTabProps = {
  settings: GeneralSettings;
  onChange: (settings: GeneralSettings) => void;
};

export default function GeneralSettingsTab(_: GeneralSettingsTabProps) {
  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        General application preferences can be changed from the toolbar.
      </Text>
    </Stack>
  );
}
