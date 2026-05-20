import { Button, Center, Loader, Overlay, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { wsApi } from "../services/wsApi";
import { useTranslation } from "react-i18next";

type FullscreenLoaderProps = {
  visible: boolean;
  text?: string;
};

export default function FullscreenLoader({
  visible,
  text,
}: FullscreenLoaderProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  const handleEmergencyStop = () => {
    wsApi.emergencyStop();
  };

  return (
    <Overlay
      fixed
      zIndex={9999}
      blur={1}
      backgroundOpacity={0.1}
    >
      <Center h="100vh">
        <Stack align="center" gap="sm" bg="#00000080" p={40}>
          <Loader size="xl" />

          <Text size="md" c="dimmed">
            {text ?? t("common.loading")}
          </Text>

          <Button
            size="md"
            color="red"
            variant="filled"
            leftSection={<IconAlertTriangle size={18} />}
            onClick={handleEmergencyStop}
          >
            {t("commandCenter.emergencyStop")}
          </Button>
        </Stack>
      </Center>
    </Overlay>
  );
}
