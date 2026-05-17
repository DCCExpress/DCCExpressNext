// common/src/railway/graph.ts
export class GraphNode {
    name = "";
    trackName = "";
    x = 0;
    y = 0;
    isVirtual = false;
    /**
     * Ez később a szerveroldali route foglalásnál kell majd.
     */
    busy = false;
    detectors = [];
    signals = [];
    blocks = [];
    elementIds = [];
    constructor(name, trackName, x, y, detectors = [], signals = [], blocks = [], elementIds = []) {
        this.name = name;
        this.trackName = trackName;
        this.x = x;
        this.y = y;
        this.detectors = detectors;
        this.signals = signals;
        this.blocks = blocks;
        this.elementIds = elementIds;
    }
}
export class Edge {
    from;
    to;
    turnoutStates;
    locoDirection;
    constructor(from, to, turnoutStates = [], locoDirection = "unknown") {
        this.from = from;
        this.to = to;
        this.turnoutStates = turnoutStates;
        this.locoDirection = locoDirection;
    }
}
export class Graph {
    nodes = [];
    edges = [];
    addNode(node) {
        this.nodes.push(node);
        return node;
    }
    addEdge(edge) {
        this.edges.push(edge);
        return edge;
    }
    mergeLocoDirection(current, next) {
        if (current === "unknown") {
            return next;
        }
        if (next === "unknown") {
            return current;
        }
        if (current === next) {
            return current;
        }
        /**
         * Egy útvonalon belül nem fordítjuk meg menet közben a mozdonyt.
         */
        return null;
    }
    mergeTurnoutRequirements(current, edgeRequirements) {
        const merged = new Map(current);
        for (const requirement of edgeRequirements) {
            const existing = merged.get(requirement.address);
            if (existing !== undefined &&
                existing !== requirement.closed) {
                return null;
            }
            merged.set(requirement.address, requirement.closed);
        }
        return merged;
    }
    turnoutRequirementMapToArray(requirements) {
        return [...requirements.entries()]
            .sort(([addressA], [addressB]) => addressA - addressB)
            .map(([address, closed]) => ({
            address,
            closed,
        }));
    }
    createRouteVisitedKey(node, requirements, locoDirection) {
        const turnoutKey = [...requirements.entries()]
            .sort(([addressA], [addressB]) => addressA - addressB)
            .map(([address, closed]) => `${address}:${closed ? "C" : "T"}`)
            .join("|");
        return `${node.name}__${turnoutKey}__${locoDirection}`;
    }
    findRoute(fromNodeName, toNodeName) {
        const fromNode = this.nodes.find(node => node.name === fromNodeName);
        const toNode = this.nodes.find(node => node.name === toNodeName);
        if (!fromNode || !toNode) {
            return null;
        }
        if (fromNode === toNode) {
            return {
                nodes: [fromNode],
                edges: [],
                turnoutStates: [],
                locoDirection: "unknown",
            };
        }
        const queue = [
            {
                node: fromNode,
                nodes: [fromNode],
                edges: [],
                requirements: new Map(),
                locoDirection: "unknown",
            },
        ];
        const visited = new Set();
        while (queue.length > 0) {
            const current = queue.shift();
            const currentKey = this.createRouteVisitedKey(current.node, current.requirements, current.locoDirection);
            if (visited.has(currentKey)) {
                continue;
            }
            visited.add(currentKey);
            const outgoingEdges = this.edges.filter(edge => edge.from === current.node);
            for (const edge of outgoingEdges) {
                const mergedRequirements = this.mergeTurnoutRequirements(current.requirements, edge.turnoutStates);
                const mergedLocoDirection = this.mergeLocoDirection(current.locoDirection, edge.locoDirection);
                if (!mergedRequirements || !mergedLocoDirection) {
                    continue;
                }
                const nextNodes = [...current.nodes, edge.to];
                const nextEdges = [...current.edges, edge];
                if (edge.to === toNode) {
                    return {
                        nodes: nextNodes,
                        edges: nextEdges,
                        turnoutStates: this.turnoutRequirementMapToArray(mergedRequirements),
                        locoDirection: mergedLocoDirection,
                    };
                }
                queue.push({
                    node: edge.to,
                    nodes: nextNodes,
                    edges: nextEdges,
                    requirements: mergedRequirements,
                    locoDirection: mergedLocoDirection,
                });
            }
        }
        return null;
    }
    findNodeContainingBlock(blockId) {
        return (this.nodes.find(node => node.blocks.some(block => block.id === blockId)) ?? null);
    }
    findBlockById(blockId) {
        for (const node of this.nodes) {
            const block = node.blocks.find(block => block.id === blockId);
            if (block) {
                return block;
            }
        }
        return null;
    }
    findBlockByName(blockName) {
        const normalized = blockName.trim();
        for (const node of this.nodes) {
            const block = node.blocks.find(block => block.name === normalized);
            if (block) {
                return block;
            }
        }
        return null;
    }
    findRouteBetweenBlocks(fromBlockId, toBlockId) {
        const fromNode = this.findNodeContainingBlock(fromBlockId);
        const toNode = this.findNodeContainingBlock(toBlockId);
        const fromBlock = this.findBlockById(fromBlockId);
        const toBlock = this.findBlockById(toBlockId);
        if (!fromNode || !toNode || !fromBlock || !toBlock) {
            return null;
        }
        const segmentRoute = this.findRoute(fromNode.name, toNode.name);
        if (!segmentRoute) {
            return null;
        }
        const path = [
            {
                type: "block",
                block: fromBlock,
                node: fromNode,
            },
            ...segmentRoute.nodes.map(node => ({
                type: "segment",
                node,
            })),
            {
                type: "block",
                block: toBlock,
                node: toNode,
            },
        ];
        return {
            ...segmentRoute,
            fromBlock,
            toBlock,
            path,
        };
    }
    findRouteBetweenBlockNames(fromBlockName, toBlockName) {
        const fromBlock = this.findBlockByName(fromBlockName);
        const toBlock = this.findBlockByName(toBlockName);
        if (!fromBlock || !toBlock) {
            return null;
        }
        return this.findRouteBetweenBlocks(fromBlock.id, toBlock.id);
    }
    getRunnableBlockRoutes() {
        const result = [];
        const blocks = this.nodes.flatMap(node => node.blocks);
        for (const fromBlock of blocks) {
            for (const toBlock of blocks) {
                if (fromBlock.id === toBlock.id) {
                    continue;
                }
                const solution = this.findRouteBetweenBlocks(fromBlock.id, toBlock.id);
                if (!solution) {
                    continue;
                }
                result.push({
                    fromBlock,
                    toBlock,
                    solution,
                });
            }
        }
        return result;
    }
    getRunnableBlockTransitions() {
        const result = [];
        const routes = this.getRunnableBlockRoutes();
        for (const route of routes) {
            const solution = route.solution;
            if (solution.nodes.length < 2) {
                continue;
            }
            const intermediateNodes = solution.nodes.slice(1, -1);
            const hasIntermediateBlock = intermediateNodes.some(node => node.blocks.length > 0);
            if (hasIntermediateBlock) {
                continue;
            }
            result.push({
                fromBlock: route.fromBlock,
                toBlock: route.toBlock,
                solution,
            });
        }
        return result;
    }
}
