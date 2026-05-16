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
import { Graph, RouteSolution } from "../../models/editor/core/Graph";
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

    const [fromNodeName, setFromNodeName] = useState<string | null>(null);
    const [toNodeName, setToNodeName] = useState<string | null>(null);
    const [routeSolution, setRouteSolution] = useState<RouteSolution | null>(null);
    const [routeSearched, setRouteSearched] = useState(false);

    useEffect(() => {
        setFromNodeName(null);
        setToNodeName(null);
        setRouteSolution(null);
        setRouteSearched(false);
    }, [graph]);

    const nodeSelectData = useMemo(() => {
        return (
            graph?.nodes.map(node => ({
                value: node.name,
                label: node.name,
            })) ?? []
        );
    }, [graph]);

    const handleSolveRoute = () => {
        if (!graph || !fromNodeName || !toNodeName) {
            return;
        }

        const solution = graph.findRoute(fromNodeName, toNodeName);

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
                            {edge.turnoutStates.map((turnoutState, index) => (
                                <Group
                                    key={`${turnoutState.address}-${index}`}
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

    return (
        <AppModal
            opened={opened}
            onClose={onClose}
            title="Bejárhatósági gráf"
            size="calc(80vw - 64px)"
            centered
            draggable
        >            <Stack gap="md">
                <Tabs defaultValue="graph">
                    <Tabs.List>
                        <Tabs.Tab value="graph">Graph</Tabs.Tab>
                        <Tabs.Tab value="table">
                            Connections
                            {graph && (
                                <Badge ml="xs" size="xs" variant="light">
                                    {graph.edges.length}
                                </Badge>
                            )}
                        </Tabs.Tab>
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

                    <Tabs.Panel value="table" pt="md">
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

                    <Tabs.Panel value="solver" pt="md">
                        {graph && graph.nodes.length > 0 ? (
                            <ScrollArea h="calc(100vh - 280px)" type="auto">
                            <Stack gap="md">
                                <Group grow align="end">
                                    <Select
                                        label="From"
                                        placeholder="Válassz induló szakaszt"
                                        data={nodeSelectData}
                                        value={fromNodeName}
                                        onChange={setFromNodeName}
                                        searchable
                                        clearable
                                    />

                                    <Select
                                        label="To"
                                        placeholder="Válassz cél szakaszt"
                                        data={nodeSelectData}
                                        value={toNodeName}
                                        onChange={setToNodeName}
                                        searchable
                                        clearable
                                    />

                                    <Button
                                        onClick={handleSolveRoute}
                                        disabled={!fromNodeName || !toNodeName}
                                    >
                                        Útvonal keresése
                                    </Button>
                                </Group>

                                <Divider />

                                {!routeSearched && (
                                    <Text c="dimmed" size="sm">
                                        Válassz ki egy induló és egy cél szakaszt, majd indítsd el a keresést.
                                    </Text>
                                )}

                                {routeSearched && !routeSolution && (
                                    <Alert color="red" title="Nincs megoldható útvonal">
                                        A kiválasztott szakaszok között nem találtam olyan útvonalat,
                                        amely konzisztens váltóállásokkal bejárható.
                                    </Alert>
                                )}

                                {routeSolution && (
                                    <Stack gap="md">
                                        <Alert color="green" title="Találtam útvonalat">
                                            A kiválasztott szakaszok között van megoldható útvonal.
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
                                                        A menetirány nem állapítható meg a pályán kijelölt travel direction alapján.
                                                    </Text>
                                                )}
                                            </Group>
                                        </Stack>
                                        <Stack gap="xs">
                                            <Text fw={600}>Szakaszútvonal</Text>

                                            <Group gap="xs">
                                                {routeSolution.nodes.map((node, index) => (
                                                    <Group key={`${node.name}-${index}`} gap="xs">
                                                        <Badge size="lg" variant="light">
                                                            {node.name}
                                                        </Badge>

                                                        {index < routeSolution.nodes.length - 1 && (
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
                                                                color={turnoutState.closed ? "green" : "red"}
                                                                variant="light"
                                                            >
                                                                {turnoutState.closed ? "closed" : "thrown"}
                                                            </Badge>
                                                        </Group>
                                                    ))}
                                                </Group>
                                            ) : (
                                                <Text c="dimmed" size="sm">
                                                    Ehhez az útvonalhoz nincs szükség váltóállításra.
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
                                                            </Table.Td>                                                            <Table.Td>
                                                                {edge.turnoutStates.length > 0 ? (
                                                                    <Group gap="xs">
                                                                        {edge.turnoutStates.map((turnoutState, tsIndex) => (
                                                                            <Group
                                                                                key={`${turnoutState.address}-${tsIndex}`}
                                                                                gap={4}
                                                                            >
                                                                                <Badge color="orange" variant="light">
                                                                                    {turnoutState.address}
                                                                                </Badge>

                                                                                <Badge
                                                                                    color={
                                                                                        turnoutState.closed ? "green" : "red"
                                                                                    }
                                                                                    variant="light"
                                                                                >
                                                                                    {turnoutState.closed ? "C" : "T"}
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

                {/* <Group justify="flex-end">
                    <Button variant="default" onClick={onClose}>
                        Bezárás
                    </Button>
                </Group> */}
            </Stack>
        </AppModal>
    );
}