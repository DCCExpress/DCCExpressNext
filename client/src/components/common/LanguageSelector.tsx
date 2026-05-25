import {
  ActionIcon,
  Group,
  Menu,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconCheck,
  IconLanguage,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", labelKey: "settings.languages.en", shortLabel: "EN" },
  { code: "hu", labelKey: "settings.languages.hu", shortLabel: "HU" },
  { code: "de", labelKey: "settings.languages.de", shortLabel: "DE" },
] as const;

type LanguageCode = typeof LANGUAGES[number]["code"];

type LanguageSelectorProps = {
  variant?: "subtle" | "light" | "filled";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  width?: number;
};

function normalizeLanguage(language: string): LanguageCode {
  const shortCode = language.split("-")[0]?.toLowerCase();
  const found = LANGUAGES.find(item => item.code === shortCode);
  return found?.code ?? "en";
}

export default function LanguageSelector({
  variant = "subtle",
  size = "lg",
  width = 58,
}: LanguageSelectorProps) {
  const { i18n, t } = useTranslation();
  const currentLanguage = normalizeLanguage(i18n.language);
  const currentOption = LANGUAGES.find(item => item.code === currentLanguage) ?? LANGUAGES[0];

  const changeLanguage = (language: LanguageCode): void => {
    localStorage.setItem("lang", language);
    void i18n.changeLanguage(language);
  };

  return (
    <Menu shadow="md" width={190} position="bottom-end" withinPortal>
      <Menu.Target>
        <Tooltip label={t("settings.language")} withArrow position="bottom">
          <ActionIcon
            variant={variant}
            size={size}
            w={width}
            aria-label={t("settings.language")}
          >
            <Group gap={4} wrap="nowrap" justify="center">
              <IconLanguage size={16} />
              <Text size="xs" fw={700} lh={1} tt="uppercase">
                {currentOption.shortLabel}
              </Text>
            </Group>
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>{t("settings.language")}</Menu.Label>
        {LANGUAGES.map(language => {
          const active = language.code === currentLanguage;

          return (
            <Menu.Item
              key={language.code}
              leftSection={active ? <IconCheck size={14} /> : <span style={{ width: 14 }} />}
              rightSection={
                <Text size="xs" c="dimmed" fw={700}>
                  {language.shortLabel}
                </Text>
              }
              onClick={() => changeLanguage(language.code)}
            >
              {t(language.labelKey)}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
