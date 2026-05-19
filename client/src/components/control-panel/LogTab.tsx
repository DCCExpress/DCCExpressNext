import { useEffect, useState } from "react";

import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";

import {
  NotificationLogEntry,
  NotificationLogLevel,
  notificationLogStore,
} from "../../services/notificationLogStore";
export default function LogTab() {
  const [entries, setEntries] = useState<NotificationLogEntry[]>(
    () => notificationLogStore.getEntries()
  );

  useEffect(() => {
    return notificationLogStore.subscribe(setEntries);
  }, []);

  return (
    <ScrollArea.Autosize
      mah="calc(100vh - 220px)"
      type="auto"
      offsetScrollbars
    >
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Text size="sm" fw={700}>
              Application log
            </Text>

            <Badge variant="light">
              {entries.length}
            </Badge>
          </Group>

          <Button
            size="xs"
            variant="light"
            color="gray"
            onClick={() => notificationLogStore.clear()}
            disabled={entries.length === 0}
          >
            Clear
          </Button>
        </Group>

        <Divider />

        {entries.length === 0 ? (
          <Text size="sm" c="dimmed">
            No warning, success or error messages yet.
          </Text>
        ) : (
          <Stack gap="xs">
            {entries.map(entry => (
              <Card
                key={entry.id}
                withBorder
                radius="sm"
                p="xs"
              >
                <Stack gap={6}>
                  <Group justify="space-between" align="flex-start">
                    <Badge
                      size="sm"
                      color={getLogColor(entry.level)}
                      variant="light"
                    >
                      {getLogLabel(entry.level)}
                    </Badge>

                    <Text size="xs" c="dimmed">
                      {formatLogTime(entry.createdAt)}
                    </Text>
                  </Group>

                  <Text size="sm" fw={700}>
                    {entry.title}
                  </Text>

                  <Text size="sm">
                    {entry.message}
                  </Text>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </ScrollArea.Autosize>
  );
}

function getLogColor(level: NotificationLogLevel): string {
  switch (level) {
    case "success":
      return "green";
    case "warning":
      return "yellow";
    case "error":
      return "red";
  }
}

function getLogLabel(level: NotificationLogLevel): string {
  switch (level) {
    case "success":
      return "OK";
    case "warning":
      return "WARNING";
    case "error":
      return "ERROR";
  }
}

function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
