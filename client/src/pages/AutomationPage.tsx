import {
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconCpu } from "@tabler/icons-react";
import AutomationFlowEditor from "../components/automation/AutomationFlowEditor";

type AutomationPageProps = {
  onGoHome?: () => void;
};

export default function AutomationPage({ onGoHome }: AutomationPageProps) {
  return (
    <Stack p="md" gap="md">
      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm" align="flex-start">
            <IconCpu size={30} />

            <Box>
              <Group gap="xs" align="center">
                <Title order={3}>Vasútmodell automatizálás</Title>
                <Badge color="orange" variant="light">
                  React Flow MVP
                </Badge>
              </Group>

              <Text size="sm" c="dimmed">
                Node-RED jellegű grafikus logikai szerkesztő vasútmodell automatizáláshoz.
                Ez még csak kliens oldali szerkesztő és szimulátor; a C# runtime bekötése lesz a következő kör.
              </Text>
            </Box>
          </Group>

          <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={onGoHome}>
            Home
          </Button>
        </Group>
      </Paper>

      <AutomationFlowEditor />
    </Stack>
  );
}
