import { Box, Group, Title } from "@mantine/core";
import { IconCpu } from "@tabler/icons-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import AppModal from "../common/AppModal";
import AutomationFlowEditor from "./AutomationFlowEditor";
import AutomationPageActionsBridge from "./AutomationPageActionsBridge";

type AutomationFlowDialogProps = {
  opened: boolean;
  onClose: () => void;
};

export default function AutomationFlowDialog({ opened, onClose }: AutomationFlowDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!opened) {
      delete document.body.dataset.automationHasSelectedNode;
    }
  }, [opened]);

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      size="calc(100vw - 32px)"
      radius="md"
      padding="md"
      centered
      draggable
      title={
        <Group gap="sm" align="center" c="white">
          <IconCpu size={28} />
          <Box>
            <Title order={4} c="white">{t("automation.dialog.title")}</Title>
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
      <Box className="automation-flow-dialog-body" style={{ flex: 1, minHeight: 0, height: "100%", display: "flex" }}>
        <AutomationFlowEditor />
        <AutomationPageActionsBridge />
      </Box>
    </AppModal>
  );
}
