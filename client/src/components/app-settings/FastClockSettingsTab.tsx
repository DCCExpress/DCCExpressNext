// client/src/components/app-settings/FastClockSettingsTab.tsx

import {
  Checkbox,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

import type {
  AppSettings,
} from "../../../../common/src/appSettings";

import {
  dayTimeMsToTimeInputValue,
  timeInputValueToDayTimeMs,
} from "../../../../common/src/appSettings";

type FastClockSettingsTabProps = {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
};

export default function FastClockSettingsTab({
  settings,
  onChange,
}: FastClockSettingsTabProps) {
  const useConfiguredResetTime =
    settings.fastClock.resetSource === "configured";

  const handleUseConfiguredResetTimeChange = (
    checked: boolean
  ): void => {
    onChange({
      ...settings,
      fastClock: {
        ...settings.fastClock,
        resetSource: checked
          ? "configured"
          : "system",
      },
    });
  };

  const handleResetTimeChange = (
    value: string
  ): void => {
    onChange({
      ...settings,
      fastClock: {
        ...settings.fastClock,
        resetTimeMs: timeInputValueToDayTimeMs(value),
      },
    });
  };

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Configure how the fast clock chooses its time after reset.
      </Text>

      <TextInput
        label="Reset time"
        description="This time is used when configured reset time is enabled."
        type="time"
        value={dayTimeMsToTimeInputValue(
          settings.fastClock.resetTimeMs
        )}
        onChange={event =>
          handleResetTimeChange(event.currentTarget.value)
        }
      />

      <Checkbox
        label="Use this configured time on reset"
        description="When disabled, reset uses the current system time."
        checked={useConfiguredResetTime}
        onChange={event =>
          handleUseConfiguredResetTimeChange(
            event.currentTarget.checked
          )
        }
      />
    </Stack>
  );
}
