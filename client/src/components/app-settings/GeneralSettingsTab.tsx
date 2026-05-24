// client/src/components/app-settings/GeneralSettingsTab.tsx

import {
  Select,
  Stack,
  Text,
} from "@mantine/core";

import { useTranslation } from "react-i18next";

import type {
  AppLanguage,
  GeneralSettings,
} from "../../../../common/src/appSettings";

type GeneralSettingsTabProps = {
  settings: GeneralSettings;
  onChange: (settings: GeneralSettings) => void;
};

export default function GeneralSettingsTab({
  settings,
  onChange,
}: GeneralSettingsTabProps) {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        General application preferences.
      </Text>

      <Select
        label={t("settings.language")}
        placeholder={t("settings.languagePlaceholder")}
        value={settings.language}
        onChange={value => {
          if (!value) {
            return;
          }

          onChange({
            ...settings,
            language: value as AppLanguage,
          });
        }}
        data={[
          { value: "en", label: t("settings.languages.en") },
          { value: "hu", label: t("settings.languages.hu") },
        ]}
        allowDeselect={false}
      />
    </Stack>
  );
}
