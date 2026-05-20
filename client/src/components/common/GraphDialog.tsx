import {
    Alert,
    Badge,
    Button,
    Divider,
    Group,
    ScrollArea,
    Select,
    Stack,
    Table,
    Tabs,
    Text,
} from "@mantine/core";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import CanvasElement from "../common/CanvasElement";
import type {
    BlockRouteSolution,
    Graph,
    GraphNode,
    RouteSolution,
} from "../../../../common/src/railway/graph";

import GraphRenderer from "../../models/editor/rendering/GraphRenderer";
import { getGraphBlockSelectData } from "../../services/routeGraphUi";
import AppModal from "./AppModal";
import { useTranslation } from "react-i18next";

type GraphDialogProps = {
    graph: Graph | null;
    opened: boolean;
    onClose: () => void;
    onTestRoute?: (solution: RouteSolution) => void | Promise<void>;
};

export default function GraphDialog({
    graph,
    opened,
    onClose,
    onTestRoute,
}: GraphDialogProps) {
    const { t } = useTranslation();
    const [fromBlockId, setFromBlockId] = useState<string | null>(null);
    const [toBlockId, setToBlockId] = useState<string | null>(null);
    const [routeSolution, setRouteSolution] =
        useState<BlockRouteSolution | null>(null);
    const [routeSearched, setRouteSearched] = useState(false);
    const graphRendererRef = useRef(new GraphRenderer());


    useEffect(() => {
        setFromBlockId(null);
        setToBlockId(null);
        setRouteSolution(null);
        setRouteSearched(false);
    }, [graph]);

    const blockSelectData = useMemo(() => {
        return getGraphBlockSelectData(graph);
    }, [graph]);

    const handleSolveRoute = () => {
        if (!graph || !fromBlockId || !toBlockId) {
            return;
        }

        const solution = graph.findRouteBetweenBlocks(
            fromBlockId,
            toBlockId
        );

        setRouteSolution(solution);
        setRouteSearched(true);
    };

    const drawGraph = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            _canvas: HTMLCanvasElement,
            width: number,
            height: number
        ) => {
            if (!graph) {
                return;
            }

            graphRendererRef.current.draw(
                ctx,
                graph,
                width,
                height
            );
        },
        [graph]
    );

    const renderNodeItems = (
        nodeName: string,
        title: string,
        color: string,
        items: { id: string; label: string }[]
    ) => {
        if (items.length === 0) {
            return null;
        }

        return (
            <Group gap={6} wrap="wrap">
                <Badge size="sm" variant="outline" color="blue">
                    {nodeName}
                </Badge>

                <Badge size="sm" variant="outline" color={color}>
                    {title}
                </Badge>

                {items.map(item => (
                    <Badge
                        key={`${nodeName}-${title}-${item.id}`}
                        color={color}
                        variant="light"
                    >
                        {item.label}
                    </Badge>
                ))}
            </Group>
        );
    };

    const edgeRows =
        graph?.edges.map((edge, index) => (
            <Table.Tr key={index}>
                <Table.Td>{index + 1}</Table.Td>

                <Table.Td>
                    <Badge variant="light">{edge.from.name}</Badge>
                </Table.Td>

                <Table.Td>→</Table.Td>

                <Table.Td>
                    <Badge variant="light">{edge.to.name}</Badge>
                </Table.Td>

                <Table.Td>
                    {edge.from.detectors.length === 0 &&
                        edge.to.detectors.length === 0 &&
                        edge.from.signals.length === 0 &&
                        edge.to.signals.length === 0 &&
                        edge.from.blocks.length === 0 &&
                        edge.to.blocks.length === 0 ? (
                        <Text size="sm" c="dimmed">
                            —
                        </Text>
                    ) : (
                        <Stack gap={6}>
                            {renderNodeItems(
                                edge.from.name,
                                t("graph.items.detectors"),
                                "cyan",
                                edge.from.detectors
                            )}

                            {renderNodeItems(
                                edge.from.name,
                                t("graph.items.signals"),
                                "yellow",
                                edge.from.signals
                            )}

                            {renderNodeItems(
                                edge.from.name,
                                t("graph.items.blocks"),
                                "violet",
                                edge.from.blocks
                            )}

                            {renderNodeItems(
                                edge.to.name,
                                t("graph.items.detectors"),
                                "cyan",
                                edge.to.detectors
                            )}

                            {renderNodeItems(
                                edge.to.name,
                                t("graph.items.signals"),
                                "yellow",
                                edge.to.signals
                            )}

                            {renderNodeItems(
                                edge.to.name,
                                t("graph.items.blocks"),
                                "violet",
                                edge.to.blocks
                            )}
                        </Stack>
                    )}
                </Table.Td>

                <Table.Td>
                    {renderTurnoutRequirementBadges(edge.turnoutStates)}
                </Table.Td>
            </Table.Tr>
        )) ?? [];


    //=====================
    // HELPERS
    //=====================
    function renderTurnoutRequirementBadges(
        turnoutStates: { address: number; closed: boolean }[]
    ) {
        if (turnoutStates.length === 0) {
            return (
                <Text size="sm" c="dimmed">
                    —
                </Text>
            );
        }

        return (
            <Group gap="xs" wrap="wrap">
                {turnoutStates.map((turnoutState, index) => (
                    <Badge
                        key={`turnout-${turnoutState.address}-${turnoutState.closed}-${index}`}

                        variant="light"
                        styles={{
                            label: {
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                            },
                        }}
                    >
                        <span>{t("graph.items.turnout")} {turnoutState.address}</span>

                        <Badge
                            size="xs"
                            color={turnoutState.closed ? "green" : "orange"}
                            variant="filled"
                            radius="xs"

                        >
                            {turnoutState.closed ? "C" : "T"}
                        </Badge>
                    </Badge>
                ))}
            </Group>
        );
    }

    //=============================
    // Block Tab
    // ========================
    function isBlockNode(node: GraphNode): boolean {
        return node.blocks.length > 0;
    }

    function buildBlockConnectionPaths(graph: Graph): GraphNode[][] {
        const adjacency = new Map<string, GraphNode[]>();

        for (const node of graph.nodes) {
            adjacency.set(node.name, []);
        }

        // A block-kapcsolati nézethez kétirányú kapcsolatként járjuk be a gráfot
        for (const edge of graph.edges) {
            adjacency.get(edge.from.name)?.push(edge.to);
            adjacency.get(edge.to.name)?.push(edge.from);
        }

        const paths: GraphNode[][] = [];
        const createdPathKeys = new Set<string>();

        const blockNodes = graph.nodes.filter(isBlockNode);

        for (const startNode of blockNodes) {
            const stack: {
                currentNode: GraphNode;
                path: GraphNode[];
                visitedNodeNames: Set<string>;
            }[] = [
                    {
                        currentNode: startNode,
                        path: [startNode],
                        visitedNodeNames: new Set([startNode.name]),
                    },
                ];

            while (stack.length > 0) {
                const state = stack.pop()!;
                const neighbors = adjacency.get(state.currentNode.name) ?? [];

                for (const nextNode of neighbors) {
                    if (state.visitedNodeNames.has(nextNode.name)) {
                        continue;
                    }

                    const nextPath = [...state.path, nextNode];

                    // Ha újabb blokkos node-hoz értünk:
                    // ez egy érvényes block connection, és ITT megállunk.
                    if (isBlockNode(nextNode)) {
                        const forwardKey = nextPath
                            .map(node => node.name)
                            .join(">");

                        const reverseKey = [...nextPath]
                            .reverse()
                            .map(node => node.name)
                            .join(">");

                        const pathKey =
                            forwardKey < reverseKey ? forwardKey : reverseKey;

                        if (!createdPathKeys.has(pathKey)) {
                            createdPathKeys.add(pathKey);
                            paths.push(nextPath);
                        }

                        continue;
                    }

                    // Ha nem blokkos node, mehetünk tovább rajta keresztül
                    const nextVisitedNodeNames = new Set(state.visitedNodeNames);
                    nextVisitedNodeNames.add(nextNode.name);

                    stack.push({
                        currentNode: nextNode,
                        path: nextPath,
                        visitedNodeNames: nextVisitedNodeNames,
                    });
                }
            }
        }

        return paths;
    }

    function renderBlockConnectionPath(path: GraphNode[]) {
        const items: React.ReactNode[] = [];

        path.forEach((node) => {

            if (node.blocks.length > 0) {
                node.blocks.forEach(block => {
                    items.push(
                        <Badge
                            key={`block-${node.name}-${block.id}`}
                            variant="filled"
                            color="blue"
                            size="sm"
                        >
                            {block.label || block.name || node.name}
                        </Badge>
                    );
                });
            } else {
                items.push(
                    <Badge
                        key={`section-${node.name}`}
                        variant="light"
                        color="gray"
                        size="sm"
                    >
                        {node.name}
                    </Badge>
                );
            }
        });

        return (
            <Group gap="xs" wrap="wrap">
                {items}
            </Group>
        );
    }

    const blockConnectionPaths = useMemo(() => {
        if (!graph) {
            return [];
        }

        return buildBlockConnectionPaths(graph);
    }, [graph]);

    const blockConnectionRows = blockConnectionPaths.map((path, index) => {
        const sectionChainLabel = path
            .map(node => node.name)
            .join(" = ");

        return (
            <Table.Tr key={`block-connection-${index}`}>
                <Table.Td>{index + 1}</Table.Td>

                <Table.Td>
                    {renderBlockConnectionPath(path)}
                </Table.Td>

                <Table.Td>
                    <Text size="sm" c="dimmed">
                        {sectionChainLabel}
                    </Text>
                </Table.Td>
            </Table.Tr>
        );
    });

    const runnableBlockRoutes = useMemo(() => {
        return graph?.getRunnableBlockRoutes() ?? [];
    }, [graph]);


    function renderBlockRoutePath(
        solution: BlockRouteSolution,
        badgeSize: "sm" | "md" | "lg" = "sm"
    ) {
        const firstItem = solution.path[0];
        const lastItem = solution.path[solution.path.length - 1];

        const segmentItems = solution.path.filter(
            item => item.type === "segment"
        );

        const firstSegment = segmentItems[0];
        const lastSegment = segmentItems[segmentItems.length - 1];

        if (
            !firstItem ||
            firstItem.type !== "block" ||
            !lastItem ||
            lastItem.type !== "block" ||
            !firstSegment ||
            !lastSegment
        ) {
            return null;
        }

        const middleSegments = segmentItems.slice(1, -1);

        const items: React.ReactNode[] = [];

        // Induló blokk + saját szegmense
        items.push(
            // <Badge
            //     key={`from-block-${firstItem.block.id}-${firstSegment.node.name}`}
            //     size={badgeSize}
            //     color="violet"
            //     variant="filled"
            // >
            //     {firstItem.block.name} - {firstSegment.node.name}
            // </Badge>
            <Badge
                key={`from-block-${firstItem.block.id}-${firstSegment.node.name}`}
                size={badgeSize}
                color="violet"
                variant="filled"
                styles={{
                    label: {
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                    },
                }}
            >
                <span>{firstItem.block.name}</span>

                <Badge
                    size="xs"
                    color="black"
                    variant="filled"
                    radius="xs"
                >
                    {firstSegment.node.name}
                </Badge>
            </Badge>
        );

        // Köztes szegmensek
        for (const segment of middleSegments) {
            items.push(
                <Badge
                    key={`middle-segment-${segment.node.name}`}
                    size={badgeSize}
                    color="gray"
                    variant="light"
                >
                    {segment.node.name}
                </Badge>
            );
        }

        // Cél blokk + saját szegmense
        items.push(
            // <Badge
            //     key={`to-block-${lastItem.block.id}-${lastSegment.node.name}`}
            //     size={badgeSize}
            //     color="violet"
            //     variant="filled"
            // >
            //     {lastItem.block.name} - {lastSegment.node.name}
            // </Badge>
            <Badge
                key={`to-block-${lastItem.block.id}-${lastSegment.node.name}`}
                size={badgeSize}
                color="violet"
                variant="filled"
                styles={{
                    label: {
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                    },
                }}
            >
                <span>{lastItem.block.name}</span>

                <Badge
                    size="xs"
                    color="black"
                    variant="filled"
                    radius="xs"
                >
                    {lastSegment.node.name}
                </Badge>
            </Badge>
        );

        return (
            <Group gap="xs" wrap="wrap">
                {items.map((item, index) => (
                    <Group key={`route-path-item-${index}`} gap="xs">
                        {item}

                        {index < items.length - 1 && (
                            <Text fw={700}>→</Text>
                        )}
                    </Group>
                ))}
            </Group>
        );
    }

    const runnableBlockRouteRows = runnableBlockRoutes.map((route, index) => {
        const solution = route.solution;

        return (
            <Table.Tr key={`runnable-block-route-${index}`}>
                <Table.Td>{index + 1}</Table.Td>

                <Table.Td>
                    <Badge color="violet" variant="light">
                        {route.fromBlock.label}
                    </Badge>
                </Table.Td>

                <Table.Td>→</Table.Td>

                <Table.Td>
                    <Badge color="violet" variant="light">
                        {route.toBlock.label}
                    </Badge>
                </Table.Td>

                <Table.Td>
                    {renderBlockRoutePath(solution)}
                </Table.Td>

                <Table.Td>
                    <Badge
                        color={
                            solution.locoDirection === "forward"
                                ? "green"
                                : solution.locoDirection === "reverse"
                                    ? "orange"
                                    : "gray"
                        }
                        variant="light"
                    >
                        {solution.locoDirection.toUpperCase()}
                    </Badge>
                </Table.Td>

                <Table.Td>
                    {renderTurnoutRequirementBadges(solution.turnoutStates)}
                </Table.Td>
            </Table.Tr>
        );
    });

    return (
        <AppModal
            opened={opened}
            onClose={onClose}
            title={t("graph.title")}
            size="calc(80vw - 64px)"
            centered
            draggable
        >
            <Stack gap="md">
                <Tabs defaultValue="graph">
                    <Tabs.List>
                        <Tabs.Tab value="graph">{t("graph.tabs.graph")}</Tabs.Tab>

                        <Tabs.Tab value="connections">
                            {t("graph.tabs.connections")}
                            {graph && (
                                <Badge ml="xs" size="xs" variant="light">
                                    {graph.edges.length}
                                </Badge>
                            )}
                        </Tabs.Tab>

                        <Tabs.Tab value="blocks">{t("graph.tabs.blocks")}</Tabs.Tab>

                        <Tabs.Tab value="runnableBlocks">
                            {t("graph.tabs.runnableBlocks")}
                            {graph && (
                                <Badge ml="xs" size="xs" variant="light">
                                    {runnableBlockRoutes.length}
                                </Badge>
                            )}
                        </Tabs.Tab>


                        <Tabs.Tab value="solver">
                            {t("graph.tabs.solver")}
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="graph" pt="md">
                        {graph ? (
                            <CanvasElement
                                height="calc(100vh - 280px)"
                                draw={drawGraph}
                            />
                        ) : (
                            <Text c="dimmed">{t("graph.emptyGraph")}</Text>
                        )}
                    </Tabs.Panel>

                    <Tabs.Panel value="connections" pt="md">
                        {graph && graph.edges.length > 0 ? (
                            <ScrollArea h="calc(100vh - 280px)">
                                <Table
                                    striped
                                    highlightOnHover
                                    withTableBorder
                                    withColumnBorders
                                >
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>#</Table.Th>
                                            <Table.Th>{t("graph.headers.from")}</Table.Th>
                                            <Table.Th></Table.Th>
                                            <Table.Th>{t("graph.headers.to")}</Table.Th>
                                            <Table.Th>{t("graph.headers.sectionObjects")}</Table.Th>
                                            <Table.Th>{t("graph.headers.turnoutRequirement")}</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>

                                    <Table.Tbody>{edgeRows}</Table.Tbody>
                                </Table>
                            </ScrollArea>
                        ) : (
                            <Text c="dimmed">{t("graph.emptyConnections")}</Text>
                        )}
                    </Tabs.Panel>

                    <Tabs.Panel value="blocks" pt="md">
                        {blockConnectionRows.length > 0 ? (
                            <ScrollArea h="calc(100vh - 280px)">
                                <Table
                                    striped
                                    highlightOnHover
                                    withTableBorder
                                    withColumnBorders
                                >
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>#</Table.Th>
                                            <Table.Th>{t("graph.headers.blockConnection")}</Table.Th>
                                            <Table.Th>{t("graph.headers.sectionChain")}</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>

                                    <Table.Tbody>{blockConnectionRows}</Table.Tbody>
                                </Table>
                            </ScrollArea>
                        ) : (
                            <Text c="dimmed">
                                {t("graph.emptyBlockConnections")}
                            </Text>
                        )}
                    </Tabs.Panel>

                    <Tabs.Panel value="runnableBlocks" pt="md">
                        {runnableBlockRouteRows.length > 0 ? (
                            <ScrollArea h="calc(100vh - 280px)">
                                <Table
                                    striped
                                    highlightOnHover
                                    withTableBorder
                                    withColumnBorders
                                >
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>#</Table.Th>
                                            <Table.Th>{t("graph.headers.fromBlock")}</Table.Th>
                                            <Table.Th></Table.Th>
                                            <Table.Th>{t("graph.headers.toBlock")}</Table.Th>
                                            <Table.Th>{t("graph.headers.runnablePath")}</Table.Th>
                                            <Table.Th>{t("graph.headers.locoDirection")}</Table.Th>
                                            <Table.Th>{t("graph.headers.turnoutRequirement")}</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>

                                    <Table.Tbody>
                                        {runnableBlockRouteRows}
                                    </Table.Tbody>
                                </Table>
                            </ScrollArea>
                        ) : (
                            <Text c="dimmed">
                                {t("graph.emptyRunnableBlocks")}
                            </Text>
                        )}
                    </Tabs.Panel>

                    <Tabs.Panel value="solver" pt="md">
                        {graph && graph.nodes.length > 0 ? (
                            <ScrollArea h="calc(100vh - 280px)" type="auto">
                                <Stack gap="md">
                                    <Group grow align="end">
                                        <Select
                                            label={t("graph.headers.fromBlock")}
                                            placeholder={t("graph.solver.fromPlaceholder")}
                                            data={blockSelectData}
                                            value={fromBlockId}
                                            onChange={setFromBlockId}
                                            searchable
                                            clearable
                                        />

                                        <Select
                                            label={t("graph.headers.toBlock")}
                                            placeholder={t("graph.solver.toPlaceholder")}
                                            data={blockSelectData}
                                            value={toBlockId}
                                            onChange={setToBlockId}
                                            searchable
                                            clearable
                                        />

                                        <Button
                                            onClick={handleSolveRoute}
                                            disabled={!fromBlockId || !toBlockId}
                                        >
                                            {t("graph.solver.search")}
                                        </Button>
                                    </Group>

                                    <Divider />

                                    {!routeSearched && (
                                        <Text c="dimmed" size="sm">
                                            {t("graph.solver.intro")}
                                        </Text>
                                    )}

                                    {routeSearched && !routeSolution && (
                                        <Alert color="red" title={t("graph.solver.notFoundTitle")}>
                                            {t("graph.solver.notFound")}
                                        </Alert>
                                    )}

                                    {routeSolution && (
                                        <Stack gap="md">
                                            <Alert color="green" title={t("graph.solver.foundTitle")}>
                                                {t("graph.solver.found")}
                                            </Alert>

                                            <Group justify="flex-end">
                                                <Button
                                                    color="lime"
                                                    variant="light"
                                                    onClick={() => {
                                                        void onTestRoute?.(routeSolution);
                                                    }}
                                                >
                                                    {t("graph.solver.testRoute")}
                                                </Button>
                                            </Group>

                                            <Stack gap="xs">
                                                <Text fw={600}>{t("graph.solver.directionTitle")}</Text>

                                                <Group gap="xs">
                                                    <Badge
                                                        size="lg"
                                                        color={
                                                            routeSolution.locoDirection === "forward"
                                                                ? "green"
                                                                : routeSolution.locoDirection === "reverse"
                                                                    ? "orange"
                                                                    : "gray"
                                                        }
                                                        variant="light"
                                                    >
                                                        {routeSolution.locoDirection.toUpperCase()}
                                                    </Badge>

                                                    {routeSolution.locoDirection === "forward" && (
                                                        <Text size="sm" c="dimmed">
                                                            {t("graph.solver.directionForward")}
                                                        </Text>
                                                    )}

                                                    {routeSolution.locoDirection === "reverse" && (
                                                        <Text size="sm" c="dimmed">
                                                            {t("graph.solver.directionReverse")}
                                                        </Text>
                                                    )}

                                                    {routeSolution.locoDirection === "unknown" && (
                                                        <Text size="sm" c="dimmed">
                                                            {t("graph.solver.directionUnknown")}
                                                        </Text>
                                                    )}
                                                </Group>
                                            </Stack>

                                            <Stack gap="xs">
                                                <Text fw={600}>
                                                    {t("graph.solver.blockPathTitle")}
                                                </Text>

                                                <Group gap="xs" wrap="wrap">
                                                    {routeSolution.path.map((item, index) => (
                                                        <Group
                                                            key={
                                                                item.type === "block"
                                                                    ? `block-${item.block.id}-${index}`
                                                                    : `segment-${item.node.name}-${index}`
                                                            }
                                                            gap="xs"
                                                        >
                                                            {item.type === "block" ? (
                                                                <Badge
                                                                    size="lg"
                                                                    color="violet"
                                                                    variant="light"
                                                                >
                                                                    {item.block.label}
                                                                </Badge>
                                                            ) : (
                                                                <Badge
                                                                    size="lg"
                                                                    color="blue"
                                                                    variant="light"
                                                                >
                                                                    {item.node.name}
                                                                </Badge>
                                                            )}

                                                            {index < routeSolution.path.length - 1 && (
                                                                <Text fw={700}>→</Text>
                                                            )}
                                                        </Group>
                                                    ))}
                                                </Group>
                                            </Stack>

                                            <Stack gap="xs">
                                                <Text fw={600}>{t("graph.solver.turnoutsTitle")}</Text>

                                                {routeSolution.turnoutStates.length > 0 ? (
                                                    renderTurnoutRequirementBadges(routeSolution.turnoutStates)
                                                ) : (
                                                    <Text c="dimmed" size="sm">
                                                        {t("graph.solver.noTurnouts")}
                                                    </Text>
                                                )}
                                            </Stack>
                                            <Stack gap="xs">
                                                <Text fw={600}>{t("graph.solver.edgesTitle")}</Text>

                                                <Table
                                                    striped
                                                    highlightOnHover
                                                    withTableBorder
                                                    withColumnBorders
                                                >
                                                    <Table.Thead>
                                                        <Table.Tr>
                                                            <Table.Th>#</Table.Th>
                                                            <Table.Th>{t("graph.headers.from")}</Table.Th>
                                                            <Table.Th>{t("graph.headers.to")}</Table.Th>
                                                            <Table.Th>{t("graph.headers.sectionObjects")}</Table.Th>
                                                            <Table.Th>{t("graph.headers.turnoutRequirement")}</Table.Th>
                                                        </Table.Tr>
                                                    </Table.Thead>

                                                    <Table.Tbody>
                                                        {routeSolution.edges.map((edge, index) => (
                                                            <Table.Tr key={index}>
                                                                <Table.Td>{index + 1}</Table.Td>
                                                                <Table.Td>{edge.from.name}</Table.Td>
                                                                <Table.Td>{edge.to.name}</Table.Td>

                                                                <Table.Td>
                                                                    {edge.from.detectors.length === 0 &&
                                                                        edge.to.detectors.length === 0 &&
                                                                        edge.from.signals.length === 0 &&
                                                                        edge.to.signals.length === 0 &&
                                                                        edge.from.blocks.length === 0 &&
                                                                        edge.to.blocks.length === 0 ? (
                                                                        <Text size="sm" c="dimmed">
                                                                            —
                                                                        </Text>
                                                                    ) : (
                                                                        <Stack gap={6}>
                                                                            {renderNodeItems(
                                                                                edge.from.name,
                                                                                t("graph.items.detectors"),
                                                                                "cyan",
                                                                                edge.from.detectors
                                                                            )}

                                                                            {renderNodeItems(
                                                                                edge.from.name,
                                                                                t("graph.items.signals"),
                                                                                "yellow",
                                                                                edge.from.signals
                                                                            )}

                                                                            {renderNodeItems(
                                                                                edge.from.name,
                                                                                t("graph.items.blocks"),
                                                                                "violet",
                                                                                edge.from.blocks
                                                                            )}

                                                                            {renderNodeItems(
                                                                                edge.to.name,
                                                                                t("graph.items.detectors"),
                                                                                "cyan",
                                                                                edge.to.detectors
                                                                            )}

                                                                            {renderNodeItems(
                                                                                edge.to.name,
                                                                                t("graph.items.signals"),
                                                                                "yellow",
                                                                                edge.to.signals
                                                                            )}

                                                                            {renderNodeItems(
                                                                                edge.to.name,
                                                                                t("graph.items.blocks"),
                                                                                "violet",
                                                                                edge.to.blocks
                                                                            )}
                                                                        </Stack>
                                                                    )}
                                                                </Table.Td>

                                                                <Table.Td>
                                                                    {edge.turnoutStates.length > 0 ? (
                                                                        <Group gap="xs">
                                                                            {edge.turnoutStates.map(
                                                                                (turnoutState, tsIndex) => (
                                                                                    <Group
                                                                                        key={`${turnoutState.address}-${tsIndex}`}
                                                                                        gap={4}
                                                                                    >
                                                                                        <Badge
                                                                                            color="orange"
                                                                                            variant="light"
                                                                                        >
                                                                                            {turnoutState.address}
                                                                                        </Badge>

                                                                                        <Badge
                                                                                            color={
                                                                                                turnoutState.closed
                                                                                                    ? "green"
                                                                                                    : "red"
                                                                                            }
                                                                                            variant="light"
                                                                                        >
                                                                                            {turnoutState.closed
                                                                                                ? "C"
                                                                                                : "T"}
                                                                                        </Badge>
                                                                                    </Group>
                                                                                )
                                                                            )}
                                                                        </Group>
                                                                    ) : (
                                                                        <Text size="sm" c="dimmed">
                                                                            —
                                                                        </Text>
                                                                    )}
                                                                </Table.Td>
                                                            </Table.Tr>
                                                        ))}
                                                    </Table.Tbody>
                                                </Table>
                                            </Stack>
                                        </Stack>
                                    )}
                                </Stack>
                            </ScrollArea>
                        ) : (
                            <Text c="dimmed">
                                {t("graph.noSearchableGraph")}
                            </Text>
                        )}
                    </Tabs.Panel>
                </Tabs>
            </Stack>
        </AppModal>
    );
}
