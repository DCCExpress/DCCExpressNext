import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  IconRefresh,
  IconTrain,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

import type {
  Loco,
} from "../../common/src/types";

import {
  getLocos,
} from "../../client/src/api/domainApi";
import CollapsiblePanelCard from "../../client/src/components/common/CollapsiblePanelCard";
import LocoPanel from "../../client/src/layout/LocoPanel";
import {
  getDefaultWsUrl,
} from "../../client/src/services/defaultWsUrl";
import {
  wsApi,
} from "../../client/src/services/wsApi";
import {
  wsClient,
  type WsConnectionStatus,
} from "../../client/src/services/wsClient";

type LoadState = "idle" | "loading" | "ready" | "error";

function statusColor(status: WsConnectionStatus): string {
  switch (status) {
    case "connected":
      return "green";
    case "connecting":
    case "reconnecting":
      return "yellow";
    case "error":
      return "red";
    case "disconnected":
    default:
      return "gray";
  }
}

function formatStatus(status: WsConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting";
    case "reconnecting":
      return "Reconnecting";
    case "error":
      return "Error";
    case "disconnected":
    default:
      return "Disconnected";
  }
}

export default function App() {
  const [status, setStatus] = useState<WsConnectionStatus>(
    wsClient.getStatus()
  );

  const [locos, setLocos] = useState<Loco[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");

  const loadLocos = useCallback(async () => {
    setLoadState("loading");

    try {
      const loadedLocos = await getLocos();
      setLocos(loadedLocos);
      setLoadState("ready");
    } catch (error) {
      console.error(error);
      setLoadState("error");

      showNotification({
        color: "red",
        title: "Locomotives",
        message: error instanceof Error
          ? error.message
          : "Could not load locomotives.",
      });
    }
  }, []);

  useEffect(() => {
    wsApi.connect(getDefaultWsUrl());

    const unsubscribeStatus = wsClient.subscribeStatus(nextStatus => {
      setStatus(nextStatus);

      if (nextStatus === "connected") {
        void loadLocos();
      }
    });

    return () => {
      unsubscribeStatus();
      wsApi.disconnect();
    };
  }, [loadLocos]);

  const hasLocos = locos.length > 0;
  const isLoading = loadState === "loading";

  return (
    <Box className="mobile-shell">
      <Stack gap="md" h="100%">
        <CollapsiblePanelCard
          title={(
            <Group gap="xs" wrap="nowrap">
              <IconTrain size={24} />
              <div>
                <Title order={4}>DCCExpress Mobile</Title>
                <Text size="xs" c="dimmed">
                  Shared client LocoPanel
                </Text>
              </div>
            </Group>
          )}
          collapsedStorageKey="dcc-express.mobile.header.collapsed"
          expandTooltip="Expand"
          collapseTooltip="Collapse"
          rightSection={(
            <Badge color={statusColor(status)} variant="light">
              {formatStatus(status)}
            </Badge>
          )}
          cardPadding="md"
        >
          <Group justify="space-between" align="center">
            <Text size="xs" c="dimmed">
              Client UUID: {wsApi.clientUuid}
            </Text>

            <Button
              size="xs"
              variant="light"
              leftSection={isLoading ? <Loader size="xs" /> : <IconRefresh size={14} />}
              disabled={status !== "connected" || isLoading}
              onClick={() => void loadLocos()}
            >
              Reload locos
            </Button>
          </Group>
        </CollapsiblePanelCard>

        {isLoading && !hasLocos ? (
          <Card withBorder radius="lg" p="xl">
            <Stack align="center">
              <Loader />
              <Text c="dimmed">Loading locomotives...</Text>
            </Stack>
          </Card>
        ) : (
          <Box className="mobile-loco-panel">
            <LocoPanel locos={locos} />
          </Box>
        )}
      </Stack>
    </Box>
  );
}
