import { Badge, Box, Group, Modal, Text, Title } from "@mantine/core";
import { IconCpu } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import AutomationFlowEditor from "./AutomationFlowEditor";

type AutomationFlowDialogProps = {
  opened: boolean;
  onClose: () => void;
};

export default function AutomationFlowDialog({ opened, onClose }: AutomationFlowDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="calc(100vw - 32px)"
      radius="md"
      padding="md"
      title={
        <Group gap="sm" align="flex-start">
          <IconCpu size={28} />

          <Box>
            <Group gap="xs" align="center">
              <Title order={4}>{t("automation.dialog.title")}</Title>
              <Badge color="orange" variant="light">
                {t("automation.dialog.badge")}
              </Badge>
            </Group>

            <Text size="xs" c="dimmed">
              {t("automation.dialog.description")}
            </Text>
          </Box>
        </Group>
      }
      styles={{
        content: {
          height: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
        header: {
          flex: "0 0 auto",
          borderBottom: "1px solid var(--mantine-color-default-border)",
          paddingBottom: 12,
          marginBottom: 12,
        },
        body: {
          flex: 1,
          minHeight: 0,
          display: "flex",
          paddingTop: 0,
          overflow: "hidden",
        },
      }}
    >
      <Box style={{ flex: 1, minHeight: 0, height: "100%", display: "flex" }}>
        <AutomationFlowEditor />
      </Box>
    </Modal>
  );
}
