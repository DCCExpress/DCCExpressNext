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

import type { Layout } from "../../models/editor/core/Layout";
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
import { TrackTurnoutElementView } from "../../models/editor/elements/TrackTurnoutElementView";
type RoutesTabProps = {
  routes?: string | undefined;
  layout: Layout,

};

export default function RoutesTab(p: RoutesTabProps) {
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
          "Route graph",
          "A szerveren még nincs aktív route gráf."
        );
        return;
      }

      showOkMessage(
        "Route graph",
        `Szerveroldali gráf frissítve: ${loadedGraph.nodes.length} node, ${loadedGraph.edges.length} edge.`
      );
    } catch (error) {
      showErrorMessage(
        "ERROR",
        error instanceof Error
          ? error.message
          : "Could not reload server route graph."
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
      ) as TrackTurnoutElementView | undefined;

      if (!turnout) {
        throw new Error(
          `Turnout not found for address: ${turnoutState.address}`
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
        .join(" → ");

      showOkMessage(
        "SUCCESSFUL",
        `Route test sent: ${routeText}`
      );
    } catch (error) {
      showErrorMessage(
        "ERROR",
        error instanceof Error
          ? error.message
          : "Could not test route."
      );
    }
  };
  const handleTestConnection = async (edge: Edge) => {
    try {
      await applyTurnoutStates(edge.turnoutStates);

      showOkMessage(
        "SUCCESSFUL",
        `Route test sent: ${edge.from.name} → ${edge.to.name}`
      );
    } catch (error) {
      showErrorMessage(
        "ERROR",
        error instanceof Error
          ? error.message
          : "Could not test route connection."
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
            Generate
          </Button>
          <Button
            size="sm"
            onClick={() => setGraphDialogOpened(true)}
            disabled={!graph}
          >
            Open Graph
          </Button>

        </Group>

        {!graph && (
          <Text size="sm" c="dimmed">
            Generate the graph to display segment connections.
          </Text>
        )}

        {graph && (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600}>Segment connections</Text>

              <Badge variant="light">
                {graph.edges.length} connection{graph.edges.length === 1 ? "" : "s"}
              </Badge>
            </Group>

            <ScrollArea h={360}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>From</Table.Th>
                    <Table.Th>To</Table.Th>
                    <Table.Th>Required</Table.Th>
                    <Table.Th style={{ width: 110 }}>Test</Table.Th>
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
                            No turnout required
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
                          Test
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
