import { Badge, Box, Group, Modal, Text, Title } from "@mantine/core";
import { IconCpu } from "@tabler/icons-react";
import AutomationFlowEditor from "./AutomationFlowEditor";

type AutomationFlowDialogProps = {
  opened: boolean;
  onClose: () => void;
};

export default function AutomationFlowDialog({ opened, onClose }: AutomationFlowDialogProps) {
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
              <Title order={4}>Vasútmodell automatizálás</Title>
              <Badge color="orange" variant="light">
                React Flow MVP
              </Badge>
            </Group>

            <Text size="xs" c="dimmed">
              Node-RED jellegű grafikus logikai szerkesztő vasútmodell automatizáláshoz.
            </Text>
          </Box>
        </Group>
      }
      styles={{
        content: {
          height: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
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
        },
      }}
    >
      <Box style={{ flex: 1, minHeight: 0 }}>
        <AutomationFlowEditor />
      </Box>
    </Modal>
  );
}
