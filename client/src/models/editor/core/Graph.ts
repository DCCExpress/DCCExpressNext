import { TravelDirection } from "./BaseElement";

export type TurnoutStateRequirement = {
    address: number;
    closed: boolean;
};

export type SectionDetector = {
    id: string;
    address: number;
    label: string;
};

export type SectionSignal = {
    id: string;
    address: number;
    label: string;
};

export type SectionBlock = {
    id: string;
    name: string;
    label: string;
};

export type RouteSolution = {
    nodes: GraphNode[];
    edges: Edge[];
    turnoutStates: TurnoutStateRequirement[];
    locoDirection: TravelDirection;
};

export type BlockRoutePathItem =
    | {
        type: "block";
        block: SectionBlock;
        node: GraphNode;
    }
    | {
        type: "segment";
        node: GraphNode;
    };

export type BlockRouteSolution = RouteSolution & {
    fromBlock: SectionBlock;
    toBlock: SectionBlock;
    path: BlockRoutePathItem[];
};

export class GraphNode {
    name: string = "";
    x: number = 0;
    y: number = 0;
    isVirtual: boolean = false;
    detectors: SectionDetector[] = [];
    signals: SectionSignal[] = [];
    blocks: SectionBlock[] = [];

    static readonly RADIUS = 10;

    constructor(
        name: string,
        x: number,
        y: number,
        detectors: SectionDetector[] = [],
        signals: SectionSignal[] = [],
        blocks: SectionBlock[] = []
    ) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.detectors = detectors;
        this.signals = signals;
        this.blocks = blocks;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();

        // Node kör
        ctx.beginPath();
        ctx.arc(this.x, this.y, GraphNode.RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.strokeStyle = "#111111";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Felirat
        ctx.fillStyle = "#111111";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.name, this.x, this.y);

        ctx.restore();
    }
}

export class Edge {
    constructor(
        public from: GraphNode,
        public to: GraphNode,
        //public turnoutState?: TurnoutStateRequirement
        public turnoutStates: TurnoutStateRequirement[] = [],
        public locoDirection: TravelDirection = "unknown"
    ) { }

    draw(ctx: CanvasRenderingContext2D, curveOffset: number = 0) {
        ctx.save();

        const dx = this.to.x - this.from.x;
        const dy = this.to.y - this.from.y;
        const length = Math.hypot(dx, dy);

        if (length === 0) {
            ctx.restore();
            return;
        }

        const ux = dx / length;
        const uy = dy / length;

        const startX = this.from.x + ux * GraphNode.RADIUS;
        const startY = this.from.y + uy * GraphNode.RADIUS;

        const endX = this.to.x - ux * GraphNode.RADIUS;
        const endY = this.to.y - uy * GraphNode.RADIUS;

        // Merőleges irány
        const normalX = -uy;
        const normalY = ux;

        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        // Quadratic curve vezérlőpontja
        const controlX = midX + normalX * curveOffset;
        const controlY = midY + normalY * curveOffset;

        // Edge rajzolása
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(controlX, controlY, endX, endY);

        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.stroke();

        // A nyíl iránya a görbe végének érintőjéből
        const arrowAngle = Math.atan2(
            endY - controlY,
            endX - controlX
        );

        this.drawArrowHead(ctx, endX, endY, arrowAngle);

        // Felirat a görbe közepére
        if (this.turnoutStates) {
            const point = this.getQuadraticPoint(
                startX,
                startY,
                controlX,
                controlY,
                endX,
                endY,
                0.5
            );

            // Ha egyenes edge, tegyük kicsit oldalra a labelt
            const labelOffset = curveOffset === 0 ? 14 : 0;

            const labelX = point.x + normalX * labelOffset;
            const labelY = point.y + normalY * labelOffset;

            //const label = `${this.turnoutState.address}:${this.turnoutState.closed ? "C" : "T"}`;
            const label = this.turnoutStates
                .map(ts => `${ts.address}:${ts.closed ? "C" : "T"}`)
                .join(", ");

            ctx.font = "11px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const textWidth = ctx.measureText(label).width;
            const paddingX = 5;
            const boxWidth = textWidth + paddingX * 2;
            const boxHeight = 16;

            ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
            ctx.fillRect(
                labelX - boxWidth / 2,
                labelY - boxHeight / 2,
                boxWidth,
                boxHeight
            );

            ctx.strokeStyle = "#2563eb";
            ctx.lineWidth = 1;
            ctx.strokeRect(
                labelX - boxWidth / 2,
                labelY - boxHeight / 2,
                boxWidth,
                boxHeight
            );

            ctx.fillStyle = "#111111";
            ctx.fillText(label, labelX, labelY);
        }

        ctx.restore();
    }

    private drawArrowHead(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        angle: number
    ) {
        const arrowLength = 10;
        const arrowAngle = Math.PI / 6;

        ctx.beginPath();
        ctx.moveTo(x, y);

        ctx.lineTo(
            x - arrowLength * Math.cos(angle - arrowAngle),
            y - arrowLength * Math.sin(angle - arrowAngle)
        );

        ctx.moveTo(x, y);

        ctx.lineTo(
            x - arrowLength * Math.cos(angle + arrowAngle),
            y - arrowLength * Math.sin(angle + arrowAngle)
        );

        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    private getQuadraticPoint(
        x1: number,
        y1: number,
        cx: number,
        cy: number,
        x2: number,
        y2: number,
        t: number
    ) {
        const mt = 1 - t;

        return {
            x: mt * mt * x1 + 2 * mt * t * cx + t * t * x2,
            y: mt * mt * y1 + 2 * mt * t * cy + t * t * y2,
        };
    }
}


export class Graph {
    nodes: GraphNode[] = [];
    edges: Edge[] = [];

    private layoutInitialized = false;

    addNode(node: GraphNode): GraphNode {
        this.nodes.push(node);
        return node;
    }

    addEdge(edge: Edge): Edge {
        this.edges.push(edge);
        return edge;
    }

    private mergeLocoDirection(
        current: TravelDirection,
        next: TravelDirection
    ): TravelDirection | null {
        if (current === "unknown") {
            return next;
        }

        if (next === "unknown") {
            return current;
        }

        if (current === next) {
            return current;
        }

        // Egy route közben nem fordítjuk meg a mozdonyt.
        return null;
    }


    autoLayout(width: number, height: number) {
        if (this.nodes.length === 0) return;

        const padding = 70;
        const centerX = width / 2;
        const centerY = height / 2;

        // Első alkalommal szórjuk szét kör alakban,
        // hogy ne a pálya valódi koordinátáiból induljon a gráfnézet.
        if (!this.layoutInitialized) {
            const radius = Math.min(width, height) * 0.32;

            this.nodes.forEach((node, i) => {
                const angle = (Math.PI * 2 * i) / this.nodes.length;

                node.x = centerX + Math.cos(angle) * radius;
                node.y = centerY + Math.sin(angle) * radius;
            });

            this.layoutInitialized = true;
        }

        const iterations = 280;
        const idealEdgeLength = 180;
        const repulsionStrength = 36000;
        const springStrength = 0.018;
        const centerStrength = 0.003;

        const nodeIndex = new Map<GraphNode, number>();
        this.nodes.forEach((node, index) => nodeIndex.set(node, index));

        // Irányított gráfunk van, de layout szempontból
        // T21->T22 és T22->T21 ugyanaz a kapcsolat.
        const uniqueConnections = new Set<string>();

        const layoutEdges = this.edges.filter(edge => {
            const a = nodeIndex.get(edge.from);
            const b = nodeIndex.get(edge.to);

            if (a === undefined || b === undefined) return false;

            const key = a < b ? `${a}:${b}` : `${b}:${a}`;

            if (uniqueConnections.has(key)) {
                return false;
            }

            uniqueConnections.add(key);
            return true;
        });

        for (let iteration = 0; iteration < iterations; iteration++) {
            const moveX = new Array(this.nodes.length).fill(0);
            const moveY = new Array(this.nodes.length).fill(0);

            // 1. Node-node taszítás
            for (let i = 0; i < this.nodes.length; i++) {
                const a = this.nodes[i]!;

                for (let j = i + 1; j < this.nodes.length; j++) {
                    const b = this.nodes[j]!;

                    let dx = b.x - a.x;
                    let dy = b.y - a.y;
                    let distSq = dx * dx + dy * dy;

                    // Ha teljesen fedésben lennének, kapjanak kis eltérést
                    if (distSq < 0.01) {
                        dx = 0.1 + i * 0.01;
                        dy = 0.1 + j * 0.01;
                        distSq = dx * dx + dy * dy;
                    }

                    const dist = Math.sqrt(distSq);
                    const force = repulsionStrength / distSq;

                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;

                    moveX[i] -= fx;
                    moveY[i] -= fy;

                    moveX[j] += fx;
                    moveY[j] += fy;
                }
            }

            // 2. Edge-ek rugóereje
            for (const edge of layoutEdges) {
                const fromIndex = nodeIndex.get(edge.from)!;
                const toIndex = nodeIndex.get(edge.to)!;

                const from = edge.from;
                const to = edge.to;

                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const distance = Math.max(1, Math.hypot(dx, dy));

                const stretch = distance - idealEdgeLength;
                const force = stretch * springStrength;

                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;

                moveX[fromIndex] += fx;
                moveY[fromIndex] += fy;

                moveX[toIndex] -= fx;
                moveY[toIndex] -= fy;
            }

            // 3. Enyhe középre húzás, hogy ne másszon ki a vászonról
            for (let i = 0; i < this.nodes.length; i++) {
                const node = this.nodes[i]!;

                moveX[i] += (centerX - node.x) * centerStrength;
                moveY[i] += (centerY - node.y) * centerStrength;
            }

            // 4. Mozgatás, fokozatosan csökkenő lépéssel
            const cooling = 1 - iteration / iterations;
            const maxStep = 12 * cooling + 1;

            for (let i = 0; i < this.nodes.length; i++) {
                const node = this.nodes[i]!;

                const dx = Math.max(-maxStep, Math.min(maxStep, moveX[i]!));
                const dy = Math.max(-maxStep, Math.min(maxStep, moveY[i]!));

                node.x = Math.max(
                    padding,
                    Math.min(width - padding, node.x + dx)
                );

                node.y = Math.max(
                    padding,
                    Math.min(height - padding, node.y + dy)
                );
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();

        // Edge-ek először
        for (const edge of this.edges) {
            const curveOffset = this.getCurveOffset(edge);
            edge.draw(ctx, curveOffset);
        }

        // Node-ok utána, hogy felül legyenek
        for (const node of this.nodes) {
            node.draw(ctx);
        }

        ctx.restore();
    }

    private getCurveOffset(edge: Edge): number {
        const hasReverseEdge = this.edges.some(other =>
            other.from === edge.to &&
            other.to === edge.from
        );

        if (!hasReverseEdge) {
            return 0;
        }

        const fromIndex = this.nodes.indexOf(edge.from);
        const toIndex = this.nodes.indexOf(edge.to);

        return fromIndex < toIndex ? 22 : -22;
    }

    private mergeTurnoutRequirements(
        current: Map<number, boolean>,
        edgeRequirements: TurnoutStateRequirement[]
    ): Map<number, boolean> | null {
        const merged = new Map(current);

        for (const requirement of edgeRequirements) {
            const existing = merged.get(requirement.address);

            if (existing !== undefined && existing !== requirement.closed) {
                return null;
            }

            merged.set(requirement.address, requirement.closed);
        }

        return merged;
    }

    private turnoutRequirementMapToArray(
        requirements: Map<number, boolean>
    ): TurnoutStateRequirement[] {
        return [...requirements.entries()]
            .sort(([addressA], [addressB]) => addressA - addressB)
            .map(([address, closed]) => ({
                address,
                closed,
            }));
    }

    private createRouteVisitedKey(
        node: GraphNode,
        requirements: Map<number, boolean>,
        locoDirection: TravelDirection
    ): string {
        const turnoutKey = [...requirements.entries()]
            .sort(([addressA], [addressB]) => addressA - addressB)
            .map(([address, closed]) => `${address}:${closed ? "C" : "T"}`)
            .join("|");

        return `${node.name}__${turnoutKey}__${locoDirection}`;
    }

    findRoute(
        fromNodeName: string,
        toNodeName: string
    ): RouteSolution | null {
        const routeFindStart = performance.now();

        const fromNode = this.nodes.find(node => node.name === fromNodeName);
        const toNode = this.nodes.find(node => node.name === toNodeName);

        if (!fromNode || !toNode) {
            console.log(
                `⏱️ Route find ${fromNodeName} → ${toNodeName}: ${(performance.now() - routeFindStart).toFixed(2)} ms - missing node`
            );
            return null;
        }

        if (fromNode === toNode) {
            const result: RouteSolution = {
                nodes: [fromNode],
                edges: [],
                turnoutStates: [],
                locoDirection: "unknown",
            };

            console.log(
                `⏱️ Route find ${fromNodeName} → ${toNodeName}: ${(performance.now() - routeFindStart).toFixed(2)} ms`,
                {
                    nodes: result.nodes.length,
                    edges: result.edges.length,
                    turnouts: result.turnoutStates.length,
                }
            );

            return result;
        }

        type SearchState = {
            node: GraphNode;
            nodes: GraphNode[];
            edges: Edge[];
            requirements: Map<number, boolean>;
            locoDirection: TravelDirection;
        };

        const queue: SearchState[] = [
            {
                node: fromNode,
                nodes: [fromNode],
                edges: [],
                requirements: new Map<number, boolean>(),
                locoDirection: "unknown",
            },
        ];

        /**
         * Ugyanabba a node-ba akár különböző váltóállás-kombinációval
         * is érdemes lehet eljutni, ezért a visited kulcs:
         *
         * node + eddigi turnout requirements
         */
        const visited = new Set<string>();

        while (queue.length > 0) {
            const current = queue.shift()!;

            const currentKey = this.createRouteVisitedKey(
                current.node,
                current.requirements,
                current.locoDirection
            );

            if (visited.has(currentKey)) {
                continue;
            }

            visited.add(currentKey);

            const outgoingEdges = this.edges.filter(
                edge => edge.from === current.node
            );

            for (const edge of outgoingEdges) {
                const mergedRequirements = this.mergeTurnoutRequirements(
                    current.requirements,
                    edge.turnoutStates
                );

                const mergedLocoDirection = this.mergeLocoDirection(
                    current.locoDirection,
                    edge.locoDirection
                );

                if (!mergedLocoDirection) {
                    continue;
                }
                /**
                 * Ha ugyanaz a váltó egyszer closed, egyszer thrown lenne,
                 * akkor ez az út fizikailag nem megoldható.
                 */
                if (!mergedRequirements) {
                    continue;
                }

                const nextNodes = [...current.nodes, edge.to];
                const nextEdges = [...current.edges, edge];

                if (edge.to === toNode) {
                    const result: RouteSolution = {
                        nodes: nextNodes,
                        edges: nextEdges,
                        turnoutStates: this.turnoutRequirementMapToArray(
                            mergedRequirements
                        ),
                        locoDirection: mergedLocoDirection,
                    };

                    console.log(
                        `⏱️ Route find ${fromNodeName} → ${toNodeName}: ${(performance.now() - routeFindStart).toFixed(2)} ms`,
                        {
                            nodes: result.nodes.length,
                            edges: result.edges.length,
                            turnouts: result.turnoutStates.length,
                        }
                    );

                    return result;
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

        console.log(
            `⏱️ Route find ${fromNodeName} → ${toNodeName}: ${(performance.now() - routeFindStart).toFixed(2)} ms - no route`
        );

        return null;
    }

  /// BLOCKS

    findNodeContainingBlock(blockId: string): GraphNode | null {
        return (
            this.nodes.find(node =>
                node.blocks.some(block => block.id === blockId)
            ) ?? null
        );
    }

    findBlockById(blockId: string): SectionBlock | null {
        for (const node of this.nodes) {
            const block = node.blocks.find(block => block.id === blockId);

            if (block) {
                return block;
            }
        }

        return null;
    }

    getBlockSelectData(): { value: string; label: string }[] {
        return this.nodes
            .flatMap(node =>
                node.blocks.map(block => ({
                    value: block.id,
                    label: block.label,
                }))
            )
            .sort((a, b) => a.label.localeCompare(b.label));
    }

    findRouteBetweenBlocks(
        fromBlockId: string,
        toBlockId: string
    ): BlockRouteSolution | null {
        const fromNode = this.findNodeContainingBlock(fromBlockId);
        const toNode = this.findNodeContainingBlock(toBlockId);

        const fromBlock = this.findBlockById(fromBlockId);
        const toBlock = this.findBlockById(toBlockId);

        if (!fromNode || !toNode || !fromBlock || !toBlock) {
            console.warn("[BlockRoute] Missing block or containing segment node.", {
                fromBlockId,
                toBlockId,
                fromNode,
                toNode,
                fromBlock,
                toBlock,
            });

            return null;
        }

        const segmentRoute = this.findRoute(
            fromNode.name,
            toNode.name
        );

        if (!segmentRoute) {
            return null;
        }

        const path: BlockRoutePathItem[] = [
            {
                type: "block",
                block: fromBlock,
                node: fromNode,
            },

            ...segmentRoute.nodes.map(node => ({
                type: "segment" as const,
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
}