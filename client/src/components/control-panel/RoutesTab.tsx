import { useEffect, useState } from "react";

import {
  Badge,
  Button,
  Group,
  ScrollArea,
  Stack,
  Table,
  Text,
} from "@mantine/core";

import {
  IconPlayerPlay,
  IconRoute,
} from "@tabler/icons-react";

import type { LayoutView } from "../../models/editor/core/LayoutView";
import { wsApi } from "../../services/wsApi";
import GraphDialog from "../common/GraphDialog";
import type {
  Edge,
  RouteSolution,
  TurnoutStateRequirement,
} from "../../../../common/src/railway/graph";
import {
  showErrorMessage,
  showOkMessage,
  showWarningMessage,
} from "../../helpers";
import { useRouteGraph } from "../../hooks/useRouteGraph";
import type { RouteTurnoutElement } from "../../models/editor/core/LayoutView";
import { useTranslation } from "react-i18next";
type RoutesTabProps = {
  routes?: string | undefined;
  layout: LayoutView,

};

export default function RoutesTab(p: RoutesTabProps) {
  const { t } = useTranslation();
  //const { graph, setGraph } = useRouteGraph();
  //const { settings, updateSettings } = useEditorSettings();
  const {
    graph,
    ensureLoaded,
    reload,
  } = useRouteGraph();

  useEffect(() => {
    void ensureLoaded().catch(error => {
      console.error(
        "[RouteGraph] Could not load graph from global store:",
        error
      );
    });
  }, []);

  const [graphDialogOpened, setGraphDialogOpened] = useState(false);

  const handleRunRouteProcess = async () => {
    try {
      const loadedGraph = await reload();

      if (!loadedGraph) {
        showWarningMessage(
          t("routesPanel.title"),
          t("routesPanel.noActiveGraph")
        );
        return;
      }

      showOkMessage(
        t("routesPanel.title"),
        t("routesPanel.graphRefreshed", {
          nodes: loadedGraph.nodes.length,
          edges: loadedGraph.edges.length,
        })
      );
    } catch (error) {
      showErrorMessage(
        t("common.error"),
        error instanceof Error
          ? error.message
          : t("routesPanel.reloadFailed")
      );
    }
  };

  const applyTurnoutStates = async (
    turnoutStates: TurnoutStateRequirement[]
  ) => {
    const elems = p.layout.getAllElements();

    for (const turnoutState of turnoutStates) {
      const turnout = elems.find(
        (el) =>
          "turnoutAddress" in el &&
          "turnoutClosedValue" in el &&
          el.turnoutAddress === turnoutState.address
      ) as RouteTurnoutElement | undefined;

      if (!turnout) {
        throw new Error(
          t("routesPanel.turnoutNotFound", { address: turnoutState.address })
        );
      }

      await wsApi.setTurnout(
        turnoutState.address,
        turnoutState.closed === turnout.turnoutClosedValue
      );
    }
  };

  const handleTestRoute = async (solution: RouteSolution) => {
    try {
      await applyTurnoutStates(solution.turnoutStates);

      const routeText = solution.nodes
        .map((node) => node.name)
        .join(" -> ");

      showOkMessage(
        t("common.success"),
        t("routesPanel.routeTestSent", { route: routeText })
      );
    } catch (error) {
      showErrorMessage(
        t("common.error"),
        error instanceof Error
          ? error.message
          : t("routesPanel.routeTestFailed")
      );
    }
  };
  const handleTestConnection = async (edge: Edge) => {
    try {
      await applyTurnoutStates(edge.turnoutStates);

      showOkMessage(
        t("common.success"),
        t("routesPanel.routeTestSent", {
          route: `${edge.from.name} -> ${edge.to.name}`,
        })
      );
    } catch (error) {
      showErrorMessage(
        t("common.error"),
        error instanceof Error
          ? error.message
          : t("routesPanel.routeConnectionTestFailed")
      );
    }
  };

  return (
    <>
      <Stack gap="md">
        <Group justify="center">

          <Button
            leftSection={<IconRoute size={16} />}
            onClick={handleRunRouteProcess}
          >
            {t("routesPanel.generate")}
          </Button>
          <Button
            size="sm"
            onClick={() => setGraphDialogOpened(true)}
            disabled={!graph}
          >
            {t("routesPanel.openGraph")}
          </Button>

        </Group>

        {!graph && (
          <Text size="sm" c="dimmed">
            {t("routesPanel.generateHint")}
          </Text>
        )}

        {graph && (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600}>{t("routesPanel.segmentConnections")}</Text>

              <Badge variant="light">
                {t("routesPanel.connectionCount", { count: graph.edges.length })}
              </Badge>
            </Group>

            <ScrollArea h={360}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t("graph.headers.from")}</Table.Th>
                    <Table.Th>{t("graph.headers.to")}</Table.Th>
                    <Table.Th>{t("routesPanel.required")}</Table.Th>
                    <Table.Th style={{ width: 110 }}>{t("routesPanel.test")}</Table.Th>
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody>
                  {graph.edges.map((edge, index) => (
                    <Table.Tr
                      key={`${edge.from.name}-${edge.to.name}-${index}`}
                    >
                      <Table.Td>{edge.from.name}</Table.Td>

                      <Table.Td>{edge.to.name}</Table.Td>

                      <Table.Td>
                        {edge.turnoutStates.length === 0 ? (
                          <Text size="sm" c="dimmed">
                            {t("routesPanel.noTurnoutRequired")}
                          </Text>
                        ) : (
                          <Group gap={6}>
                            {edge.turnoutStates.map((turnoutState, i) => (
                              <Badge
                                radius={4}
                                key={`${turnoutState.address}-${i}`}
                                variant="filled"
                                color={turnoutState.closed ? "green" : "orange"}
                              >
                                {turnoutState.address}:
                                {turnoutState.closed ? "C" : "T"}
                              </Badge>
                            ))}
                          </Group>
                        )}
                      </Table.Td>

                      <Table.Td>
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconPlayerPlay size={14} />}
                          onClick={() => handleTestConnection(edge)}
                          disabled={edge.turnoutStates.length === 0}
                        >
                          {t("routesPanel.test")}
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Stack>
        )}
      </Stack>

      {graph && (
        <GraphDialog
          opened={graphDialogOpened}
          onClose={() => setGraphDialogOpened(false)}
          graph={graph}
          onTestRoute={handleTestRoute}
        />
      )}
    </>
  );
};
