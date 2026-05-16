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
import { useCallback, useEffect, useMemo, useState } from "react";
import CanvasElement from "../common/CanvasElement";
import {
    BlockRouteSolution,
    Graph,
    GraphNode,
    RouteSolution,
} from "../../models/editor/core/Graph";
import AppModal from "./AppModal";

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
    const [fromBlockId, setFromBlockId] = useState<string | null>(null);
    const [toBlockId, setToBlockId] = useState<string | null>(null);
    const [routeSolution, setRouteSolution] =
        useState<BlockRouteSolution | null>(null);
    const [routeSearched, setRouteSearched] = useState(false);

    useEffect(() => {
        setFromBlockId(null);
        setToBlockId(null);
        setRouteSolution(null);
        setRouteSearched(false);
    }, [graph]);

    const blockSelectData = useMemo(() => {
        return graph?.getBlockSelectData() ?? [];
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
            if (!graph) return;

            graph.autoLayout(width, height);
            graph.draw(ctx);
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
                                "Detectors",
                                "cyan",
                                edge.from.detectors
                            )}

                            {renderNodeItems(
                                edge.from.name,
                                "Signals",
                                "yellow",
                                edge.from.signals
                            )}

                            {renderNodeItems(
                                edge.from.name,
                                "Blocks",
                                "violet",
                                edge.from.blocks
                            )}

                            {renderNodeItems(
                                edge.to.name,
                                "Detectors",
                                "cyan",
                                edge.to.detectors
                            )}

                            {renderNodeItems(
                                edge.to.name,
                                "Signals",
                                "yellow",
                                edge.to.signals
                            )}

                            {renderNodeItems(
                                edge.to.name,
                                "Blocks",
                                "violet",
                                edge.to.blocks
                            )}
                        </Stack>
                    )}
                </Table.Td>

                <Table.Td>
                    {edge.turnoutStates.length > 0 ? (
                        <Group gap="xs">
                            {edge.turnoutStates.map((turnoutState, tsIndex) => (
                                <Group
                                    key={`${turnoutState.address}-${tsIndex}`}
                                    gap={4}
                                >
                                    <Badge color="orange" variant="light">
                                        Turnout {turnoutState.address}
                                    </Badge>

                                    <Badge
                                        color={turnoutState.closed ? "green" : "red"}
                                        variant="light"
                                    >
                                        {turnoutState.closed ? "closed" : "thrown"}
                                    </Badge>
                                </Group>
                            ))}
                        </Group>
                    ) : (
                        <Text size="sm" c="dimmed">
                            —
                        </Text>
                    )}
                </Table.Td>
            </Table.Tr>
        )) ?? [];

    function hasBlocks(node: GraphNode): boolean {
        return node.blocks.length > 0;
    }

    function getNodeBlockOrSectionLabels(node: GraphNode): string[] {
        if (node.blocks.length > 0) {
            return node.blocks.map(block => block.label || block.name || node.name);
        }

        return [node.name];
    }

    function trimChainToBlockBounds(chain: GraphNode[]): GraphNode[] | null {
        let firstBlockIndex = -1;
        let lastBlockIndex = -1;

        for (let i = 0; i < chain.length; i++) {
            if (hasBlocks(chain[i]!)) {
                firstBlockIndex = i;
                break;
            }
        }

        for (let i = chain.length - 1; i >= 0; i--) {
            if (hasBlocks(chain[i]!)) {
                lastBlockIndex = i;
                break;
            }
        }

        // Nincs legalább két külön blokk-végpont
        if (
            firstBlockIndex === -1 ||
            lastBlockIndex === -1 ||
            firstBlockIndex === lastBlockIndex
        ) {
            return null;
        }

        return chain.slice(firstBlockIndex, lastBlockIndex + 1);
    }

    function buildBlockConnectionChains(graph: Graph): GraphNode[][] {
        const nodeByName = new Map<string, GraphNode>();
        const adjacency = new Map<string, Set<string>>();

        for (const node of graph.nodes) {
            nodeByName.set(node.name, node);
            adjacency.set(node.name, new Set<string>());
        }

        // A gráfot itt nézethez kétirányú kapcsolatként kezeljük
        for (const edge of graph.edges) {
            adjacency.get(edge.from.name)?.add(edge.to.name);
            adjacency.get(edge.to.name)?.add(edge.from.name);
        }

        const visitedEdges = new Set<string>();
        const chains: GraphNode[][] = [];

        const makeEdgeKey = (a: string, b: string): string =>
            a < b ? `${a}|${b}` : `${b}|${a}`;

        // Láncok kezdőpontjai:
        // ahol nem pontosan 2 szomszéd van, ott "vége" vagy "elágazás" van
        const chainStartNodes = graph.nodes.filter(node => {
            const degree = adjacency.get(node.name)?.size ?? 0;
            return degree !== 2;
        });

        for (const startNode of chainStartNodes) {
            const neighbors = adjacency.get(startNode.name);

            if (!neighbors) continue;

            for (const firstNextName of neighbors) {
                const firstEdgeKey = makeEdgeKey(startNode.name, firstNextName);

                if (visitedEdges.has(firstEdgeKey)) {
                    continue;
                }

                visitedEdges.add(firstEdgeKey);

                const chain: GraphNode[] = [startNode];

                let previousName = startNode.name;
                let currentName = firstNextName;

                while (true) {
                    const currentNode = nodeByName.get(currentName);

                    if (!currentNode) {
                        break;
                    }

                    chain.push(currentNode);

                    const currentNeighbors = adjacency.get(currentName) ?? new Set<string>();
                    const degree = currentNeighbors.size;

                    // Ha nem egyszerű átmenő csomópont, a lánc véget ér
                    if (degree !== 2) {
                        break;
                    }

                    const nextName = [...currentNeighbors].find(name => name !== previousName);

                    if (!nextName) {
                        break;
                    }

                    const nextEdgeKey = makeEdgeKey(currentName, nextName);

                    if (visitedEdges.has(nextEdgeKey)) {
                        break;
                    }

                    visitedEdges.add(nextEdgeKey);

                    previousName = currentName;
                    currentName = nextName;
                }

                const trimmedChain = trimChainToBlockBounds(chain);

                if (trimmedChain) {
                    chains.push(trimmedChain);
                }
            }
        }

        return chains;
    }

    const blockConnectionChains = graph
        ? buildBlockConnectionChains(graph)
        : [];

    const blockConnectionRows = blockConnectionChains.map((chain, index) => {
        const labels = chain.flatMap(node =>
            getNodeBlockOrSectionLabels(node)
        );

        const sectionNames = chain.map(node => node.name);

        return (
            <Table.Tr key={`block-connection-${index}`}>
                <Table.Td>{index + 1}</Table.Td>

                <Table.Td>
                    <Text fw={600}>
                        {labels.join(" = ")}
                    </Text>
                </Table.Td>

                <Table.Td>
                    <Text size="sm" c="dimmed">
                        {sectionNames.join(" = ")}
                    </Text>
                </Table.Td>
            </Table.Tr>
        );
    });


    return (
        <AppModal
            opened={opened}
            onClose={onClose}
            title="Graph"
            size="calc(80vw - 64px)"
            centered
            draggable
        >
            <Stack gap="md">
                <Tabs defaultValue="graph">
                    <Tabs.List>
                        <Tabs.Tab value="graph">Graph</Tabs.Tab>

                        <Tabs.Tab value="connections">
                            Connections
                            {graph && (
                                <Badge ml="xs" size="xs" variant="light">
                                    {graph.edges.length}
                                </Badge>
                            )}
                        </Tabs.Tab>

                        <Tabs.Tab value="blocks">Blocks</Tabs.Tab>

                        <Tabs.Tab value="solver">
                            Útvonal keresés
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="graph" pt="md">
                        {graph ? (
                            <CanvasElement
                                height="calc(100vh - 280px)"
                                draw={drawGraph}
                            />
                        ) : (
                            <Text c="dimmed">Még nincs legenerált gráf.</Text>
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
                                            <Table.Th>From</Table.Th>
                                            <Table.Th></Table.Th>
                                            <Table.Th>To</Table.Th>
                                            <Table.Th>Section objects</Table.Th>
                                            <Table.Th>Turnout requirement</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>

                                    <Table.Tbody>{edgeRows}</Table.Tbody>
                                </Table>
                            </ScrollArea>
                        ) : (
                            <Text c="dimmed">Nincs megjeleníthető kapcsolat.</Text>
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
                                            <Table.Th>Block connection</Table.Th>
                                            <Table.Th>Section chain</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>

                                    <Table.Tbody>{blockConnectionRows}</Table.Tbody>
                                </Table>
                            </ScrollArea>
                        ) : (
                            <Text c="dimmed">
                                Nincs megjeleníthető blokk kapcsolat.
                            </Text>
                        )}
                    </Tabs.Panel>

                    <Tabs.Panel value="solver" pt="md">
                        {graph && graph.nodes.length > 0 ? (
                            <ScrollArea h="calc(100vh - 280px)" type="auto">
                                <Stack gap="md">
                                    <Group grow align="end">
                                        <Select
                                            label="From block"
                                            placeholder="Válassz induló blokkot"
                                            data={blockSelectData}
                                            value={fromBlockId}
                                            onChange={setFromBlockId}
                                            searchable
                                            clearable
                                        />

                                        <Select
                                            label="To block"
                                            placeholder="Válassz cél blokkot"
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
                                            Útvonal keresése
                                        </Button>
                                    </Group>

                                    <Divider />

                                    {!routeSearched && (
                                        <Text c="dimmed" size="sm">
                                            Válassz ki egy induló és egy cél blokkot,
                                            majd indítsd el a keresést.
                                        </Text>
                                    )}

                                    {routeSearched && !routeSolution && (
                                        <Alert color="red" title="Nincs megoldható útvonal">
                                            A kiválasztott blokkok között nem találtam
                                            olyan útvonalat, amely konzisztens
                                            váltóállásokkal bejárható.
                                        </Alert>
                                    )}

                                    {routeSolution && (
                                        <Stack gap="md">
                                            <Alert color="green" title="Találtam útvonalat">
                                                A kiválasztott blokkok között van
                                                megoldható útvonal.
                                            </Alert>

                                            <Group justify="flex-end">
                                                <Button
                                                    color="lime"
                                                    variant="light"
                                                    onClick={() => {
                                                        void onTestRoute?.(routeSolution);
                                                    }}
                                                >
                                                    Test route
                                                </Button>
                                            </Group>

                                            <Stack gap="xs">
                                                <Text fw={600}>Mozdony menetiránya</Text>

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
                                                            A mozdony előremenetben járja be az útvonalat.
                                                        </Text>
                                                    )}

                                                    {routeSolution.locoDirection === "reverse" && (
                                                        <Text size="sm" c="dimmed">
                                                            A mozdony hátramenetben járja be az útvonalat.
                                                        </Text>
                                                    )}

                                                    {routeSolution.locoDirection === "unknown" && (
                                                        <Text size="sm" c="dimmed">
                                                            A menetirány nem állapítható meg a pályán kijelölt
                                                            travel direction alapján.
                                                        </Text>
                                                    )}
                                                </Group>
                                            </Stack>

                                            <Stack gap="xs">
                                                <Text fw={600}>
                                                    Blokk útvonal szegmenslánccal
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
                                                <Text fw={600}>Szükséges váltóállások</Text>

                                                {routeSolution.turnoutStates.length > 0 ? (
                                                    <Group gap="xs">
                                                        {routeSolution.turnoutStates.map(turnoutState => (
                                                            <Group
                                                                key={`${turnoutState.address}-${turnoutState.closed}`}
                                                                gap={4}
                                                            >
                                                                <Badge color="orange" variant="light">
                                                                    Turnout {turnoutState.address}
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
                                                                        ? "closed"
                                                                        : "thrown"}
                                                                </Badge>
                                                            </Group>
                                                        ))}
                                                    </Group>
                                                ) : (
                                                    <Text c="dimmed" size="sm">
                                                        Ehhez az útvonalhoz nincs szükség
                                                        váltóállításra.
                                                    </Text>
                                                )}
                                            </Stack>

                                            <Stack gap="xs">
                                                <Text fw={600}>Élek részletesen</Text>

                                                <Table
                                                    striped
                                                    highlightOnHover
                                                    withTableBorder
                                                    withColumnBorders
                                                >
                                                    <Table.Thead>
                                                        <Table.Tr>
                                                            <Table.Th>#</Table.Th>
                                                            <Table.Th>From</Table.Th>
                                                            <Table.Th>To</Table.Th>
                                                            <Table.Th>Szakasz objektumok</Table.Th>
                                                            <Table.Th>Váltófeltételek</Table.Th>
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
                                                                                "Detectors",
                                                                                "cyan",
                                                                                edge.from.detectors
                                                                            )}

                                                                            {renderNodeItems(
                                                                                edge.from.name,
                                                                                "Signals",
                                                                                "yellow",
                                                                                edge.from.signals
                                                                            )}

                                                                            {renderNodeItems(
                                                                                edge.from.name,
                                                                                "Blocks",
                                                                                "violet",
                                                                                edge.from.blocks
                                                                            )}

                                                                            {renderNodeItems(
                                                                                edge.to.name,
                                                                                "Detectors",
                                                                                "cyan",
                                                                                edge.to.detectors
                                                                            )}

                                                                            {renderNodeItems(
                                                                                edge.to.name,
                                                                                "Signals",
                                                                                "yellow",
                                                                                edge.to.signals
                                                                            )}

                                                                            {renderNodeItems(
                                                                                edge.to.name,
                                                                                "Blocks",
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
                                Nincs gráf, amelyen útvonalat lehetne keresni.
                            </Text>
                        )}
                    </Tabs.Panel>
                </Tabs>
            </Stack>
        </AppModal>
    );
}