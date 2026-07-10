import { Box, Group, Title } from "@mantine/core";
import { IconCpu } from "@tabler/icons-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import AppModal from "../common/AppModal";
import AutomationFlowEditor from "./AutomationFlowEditor";
import AutomationToolbarBridge from "./AutomationToolbarBridge";

type AutomationFlowDialogProps = {
  opened: boolean;
  onClose: () => void;
};

function clearAutomationSelectedMarkers(): void {
  delete document.body.dataset.automationHasSelectedNode;
  delete document.body.dataset.automationSelectedNodeKind;
}

function clearReactFlowSelection(): void {
  const pane = document.querySelector<HTMLElement>(".automation-flow-dialog-body .react-flow__pane");
  if (!pane) {
    clearAutomationSelectedMarkers();
    return;
  }

  pane.dispatchEvent(new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    view: window,
  }));
  clearAutomationSelectedMarkers();
}

export default function AutomationFlowDialog({ opened, onClose }: AutomationFlowDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!opened) {
      clearAutomationSelectedMarkers();
      return;
    }

    const timeoutIds = [0, 80, 250, 700].map(delay => window.setTimeout(clearReactFlowSelection, delay));

    return () => {
      timeoutIds.forEach(timeoutId => window.clearTimeout(timeoutId));
    };
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
      <Box
        className="automation-flow-dialog-body"
        style={{
          flex: 1,
          minHeight: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AutomationToolbarBridge />
        <Box className="automation-flow-editor-body" style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <AutomationFlowEditor />
        </Box>
      </Box>
    </AppModal>
  );
}
