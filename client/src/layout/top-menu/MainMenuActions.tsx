import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Menu,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconHome } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

type MainMenuActionsProps = {
  onGoHome: () => void;
  onOpenLocos: () => void;
  onOpenBlocks: () => void;
  onOpenSignalLogic: () => void;
  onOpenDiagnostics: () => void;
  onOpenIntegrityCheck: () => void;
  onSaveLayout: () => void;
  onLoadLayout: () => void;
  onOpenAppSettingsDialog: () => void;
  onOpenHelp: () => void;
};

export default function MainMenuActions({
  onGoHome,
  onOpenLocos,
  onOpenBlocks,
  onOpenSignalLogic,
  onOpenDiagnostics,
  onOpenIntegrityCheck,
  onSaveLayout,
  onLoadLayout,
  onOpenAppSettingsDialog,
  onOpenHelp,
}: MainMenuActionsProps) {
  const { t } = useTranslation();

  const handleSaveLayout = async () => {
    try {
      await Promise.resolve(onSaveLayout());
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <Tooltip label={t("Home")} withArrow position="bottom">
        <ActionIcon
          size="lg"
          radius="sm"
          variant="light"
          onClick={onGoHome}
          onMouseDown={event => event.preventDefault()}
          aria-label={t("Home")}
        >
          <IconHome size={18} />
        </ActionIcon>
      </Tooltip>

      <Text fw={700}>DCCExpress</Text>

      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button variant="subtle" size="xs">
            {t("File")}
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item onClick={onLoadLayout}>{t("Load")}</Menu.Item>

          <Menu.Item onClick={handleSaveLayout}>
            <Group justify="space-between" w="100%">
              <Text>{t("Save")}</Text>
              <Text c="dimmed" size="xs">
                Ctrl + S
              </Text>
            </Group>
          </Menu.Item>

          <Divider />
          <Menu.Item onClick={onGoHome}>{t("Home")}</Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Menu>
        <Menu.Target>
          <Button variant="subtle" size="xs">
            {t("Railway")}
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item onClick={onOpenLocos}>
            {t("Locomotives") + "..."}
          </Menu.Item>
          <Menu.Item onClick={onOpenBlocks}>
            {t("blockActions.menu") + "..."}
          </Menu.Item>
          <Menu.Item disabled>{t("Trains") + "..."}</Menu.Item>
          <Menu.Item disabled>{t("Routes") + "..."}</Menu.Item>
          <Menu.Item onClick={onOpenSignalLogic}>
            {t("signalLogic.menu")}
          </Menu.Item>
          <Divider />
          <Menu.Item onClick={onOpenIntegrityCheck}>
            Integrity check...
          </Menu.Item>
          <Menu.Item onClick={onOpenDiagnostics}>
            Diagnostics...
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Button
        variant="subtle"
        size="xs"
        onClick={onOpenAppSettingsDialog}
      >
        {t("topMenu.settings")}
      </Button>

      <Button variant="subtle" size="xs" onClick={onOpenHelp}>
        {t("topMenu.help")}
      </Button>
    </>
  );
}
