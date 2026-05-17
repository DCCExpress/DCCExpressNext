// common/src/railway/routeGraphBuilder.ts
import { Edge, Graph, GraphNode, } from "./graph.js";
import { TopologyTurnoutElement, } from "./topology.js";
export class RouteGraphBuilder {
    topology;
    graph = new Graph();
    /**
     * section szám -> GraphNode
     */
    sectionNodes = new Map();
    /**
     * Duplikált edge-ek ellen.
     */
    createdEdgeKeys = new Set();
    turnouts = [];
    nextSectionNumber = 1;
    constructor(topology) {
        this.topology = topology;
    }
    build() {
        this.resetRoutes();
        this.turnouts = this.topology.getTurnouts();
        this.markTurnoutsVisited();
        this.discoverPhysicalSections();
        this.createRouteEdges();
        return this.graph;
    }
    resetRoutes() {
        const elems = this.topology.getPhysicalTrackElements();
        for (const elem of elems) {
            elem.isVisited = false;
            elem.isRoute = false;
            elem.section = 0;
            elem.travelDirection = "unknown";
        }
    }
    markTurnoutsVisited() {
        for (const turnout of this.turnouts) {
            turnout.isVisited = true;
        }
    }
    discoverPhysicalSections() {
        for (const turnout of this.turnouts) {
            const connections = turnout.getConnections();
            const connectionPositions = [
                connections.entry,
                connections.straight,
                connections.div,
            ];
            for (const pos of connectionPositions) {
                const firstElem = this.topology.getPhysicalTrackAt(pos);
                if (!firstElem) {
                    continue;
                }
                if (firstElem instanceof TopologyTurnoutElement) {
                    continue;
                }
                if (firstElem.isVisited) {
                    continue;
                }
                this.createPhysicalSection(firstElem);
            }
        }
    }
    createPhysicalSection(firstElem) {
        const sectionNumber = this.nextSectionNumber++;
        const sectionElements = [];
        this.walkTrackSection(firstElem, sectionNumber, sectionElements);
        const node = this.createSectionGraphNode(sectionNumber, sectionElements);
        this.graph.addNode(node);
        this.sectionNodes.set(sectionNumber, node);
        // console.log(
        //   `[ServerRouteGraph] Section S${sectionNumber}:`,
        //   sectionElements.map(elem => ({
        //     id: elem.id,
        //     type: elem.type,
        //     x: elem.x,
        //     y: elem.y,
        //     rotation: elem.rotation,
        //   }))
        // );
        // console.log(
        //   `[ServerRouteGraph] Section S${sectionNumber} blocks:`,
        //   node.blocks.map(block => block.name)
        // );
    }
    walkTrackSection(obj, section, sectionElements) {
        obj.isVisited = true;
        obj.section = section;
        sectionElements.push(obj);
        const nextPos = obj.getNextItemPoint();
        const prevPos = obj.getPrevItemPoint();
        this.walkTrackSectionDirection(obj, nextPos, section, sectionElements);
        this.walkTrackSectionDirection(obj, prevPos, section, sectionElements);
    }
    walkTrackSectionDirection(current, targetPos, section, sectionElements) {
        const next = this.topology.getPhysicalTrackAt(targetPos);
        if (!next) {
            return;
        }
        if (next instanceof TopologyTurnoutElement) {
            return;
        }
        const isConnectedBack = current.pos.isEqual(next.getNextItemPoint()) ||
            current.pos.isEqual(next.getPrevItemPoint());
        if (!isConnectedBack) {
            return;
        }
        if (next.isVisited) {
            return;
        }
        this.walkTrackSection(next, section, sectionElements);
    }
    createSectionGraphNode(section, sectionElements) {
        let x = 0;
        let y = 0;
        for (const elem of sectionElements) {
            x += elem.pos.x;
            y += elem.pos.y;
        }
        if (sectionElements.length > 0) {
            x /= sectionElements.length;
            y /= sectionElements.length;
        }
        const trackName = this.getSectionTrackName(sectionElements);
        const detectors = this.collectSectionDetectors(sectionElements);
        const signals = this.collectSectionSignals(sectionElements);
        const blocks = this.collectSectionBlocks(sectionElements, trackName);
        return new GraphNode(`S${section}`, trackName, x, y, detectors, signals, blocks);
    }
    getSectionTrackName(sectionElements) {
        return (sectionElements.find(elem => elem.trackName.trim().length > 0)?.trackName ?? "Unnamed track");
    }
    collectSectionDetectors(sectionElements) {
        const sectionPositions = new Set(sectionElements.map(elem => `${elem.x}:${elem.y}`));
        return this.topology
            .getSensors()
            .filter(sensor => sectionPositions.has(`${sensor.x}:${sensor.y}`))
            .sort((a, b) => a.address - b.address)
            .map(sensor => ({
            id: sensor.id,
            address: sensor.address,
            label: `D${sensor.address}`,
        }));
    }
    collectSectionSignals(sectionElements) {
        const sectionPositions = new Set(sectionElements.map(elem => `${elem.x}:${elem.y}`));
        return this.topology
            .getSignals()
            .filter(signal => sectionPositions.has(`${signal.x}:${signal.y}`))
            .sort((a, b) => a.address - b.address)
            .map(signal => ({
            id: signal.id,
            address: signal.address,
            label: `L${signal.address}`,
        }));
    }
    collectSectionBlocks(sectionElements, trackName) {
        return this.topology
            .getBlocks()
            .filter(block => sectionElements.some(sectionElem => this.isSectionElementInsideBlock(sectionElem, block)))
            .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
            .map(block => {
            const blockName = block.name?.trim()
                ? block.name.trim()
                : "Block";
            const resolvedTrackName = trackName?.trim()
                ? trackName.trim()
                : "Unnamed track";
            return {
                id: block.id,
                name: blockName,
                trackName: resolvedTrackName,
                label: `${resolvedTrackName}: ${blockName}`,
            };
        });
    }
    isSectionElementInsideBlock(sectionElem, block) {
        const bounds = block.getBounds();
        return (sectionElem.x >= bounds.x &&
            sectionElem.x < bounds.x + bounds.width &&
            sectionElem.y >= bounds.y &&
            sectionElem.y < bounds.y + bounds.height);
    }
    createRouteEdges() {
        for (const turnout of this.turnouts) {
            const connections = turnout.getConnections();
            // console.log(
            //   `[ServerRouteGraph] Turnout ${turnout.turnoutAddress} ${turnout.type} @ ${turnout.x}:${turnout.y}`,
            //   {
            //     entry: connections.entry,
            //     straight: connections.straight,
            //     div: connections.div,
            //   }
            // );
            const sides = [
                "entry",
                "straight",
                "div",
            ];
            for (const side of sides) {
                const connectedElem = this.topology.getPhysicalTrackAt(connections[side]);
                // console.log(
                //   `[ServerRouteGraph]   side=${side}`,
                //   {
                //     at: connections[side],
                //     found: connectedElem
                //       ? {
                //         type: connectedElem.type,
                //         x: connectedElem.x,
                //         y: connectedElem.y,
                //         section: connectedElem.section,
                //         isTurnout:
                //           connectedElem instanceof TopologyTurnoutElement,
                //       }
                //       : null,
                //   }
                // );
                if (!connectedElem) {
                    continue;
                }
                if (connectedElem instanceof TopologyTurnoutElement) {
                    continue;
                }
                if (!connectedElem.section) {
                    continue;
                }
                const fromNode = this.sectionNodes.get(connectedElem.section);
                if (!fromNode) {
                    continue;
                }
                /**
                 * A szerveroldali direction resolver még nincs áthozva,
                 * ezért most unknown.
                 * A következő körben ezt is portoljuk.
                 */
                const locoDirection = "unknown";
                this.walkTurnoutChainToSections(fromNode, turnout, side, [], new Set(), locoDirection);
            }
        }
    }
    walkTurnoutChainToSections(fromNode, turnout, enteredSide, turnoutStates, visitedTurnoutSides, locoDirection) {
        const visitKey = `${turnout.id}:${enteredSide}`;
        if (visitedTurnoutSides.has(visitKey)) {
            return;
        }
        const nextVisited = new Set(visitedTurnoutSides);
        nextVisited.add(visitKey);
        const exits = this.getAllowedTurnoutExits(turnout, enteredSide);
        for (const exit of exits) {
            const nextTurnoutStates = [
                ...turnoutStates,
                exit.turnoutState,
            ];
            const connections = turnout.getConnections();
            const exitPos = connections[exit.exitSide];
            const nextElem = this.topology.getPhysicalTrackAt(exitPos);
            // console.log(
            //   `[ServerRouteGraph]     turnout ${turnout.turnoutAddress} exit=${exit.exitSide}`,
            //   {
            //     exitPos,
            //     found: nextElem
            //       ? {
            //         type: nextElem.type,
            //         x: nextElem.x,
            //         y: nextElem.y,
            //         section: nextElem.section,
            //         isTurnout:
            //           nextElem instanceof TopologyTurnoutElement,
            //       }
            //       : null,
            //   }
            // );
            if (!nextElem) {
                continue;
            }
            if (!(nextElem instanceof TopologyTurnoutElement)) {
                this.finishRouteEdge(fromNode, nextElem, nextTurnoutStates, locoDirection);
                continue;
            }
            const nextTurnout = nextElem;
            const nextEnteredSide = this.getTurnoutSideConnectedToElement(nextTurnout, turnout);
            if (!nextEnteredSide) {
                continue;
            }
            this.walkTurnoutChainToSections(fromNode, nextTurnout, nextEnteredSide, nextTurnoutStates, nextVisited, locoDirection);
        }
    }
    finishRouteEdge(fromNode, targetElem, turnoutStates, locoDirection) {
        if (!targetElem.section) {
            return;
        }
        const toNode = this.sectionNodes.get(targetElem.section);
        if (!toNode) {
            return;
        }
        if (toNode === fromNode) {
            return;
        }
        this.addRouteEdgeIfMissing(fromNode, toNode, turnoutStates, locoDirection);
    }
    addRouteEdgeIfMissing(from, to, turnoutStates, locoDirection) {
        const turnoutKey = turnoutStates
            .map(state => `${state.address}:${state.closed ? "C" : "T"}`)
            .join("|");
        const edgeKey = `${from.name}->${to.name}:${turnoutKey}:${locoDirection}`;
        if (this.createdEdgeKeys.has(edgeKey)) {
            return;
        }
        this.createdEdgeKeys.add(edgeKey);
        this.graph.addEdge(new Edge(from, to, turnoutStates, locoDirection));
    }
    getAllowedTurnoutExits(turnout, enteredSide) {
        /**
         * FONTOS:
         * closed = logikai, képen látható állapot.
         *
         * true  = straight / closed
         * false = diverging / thrown
         */
        const straightState = {
            address: turnout.turnoutAddress,
            closed: true,
        };
        const divState = {
            address: turnout.turnoutAddress,
            closed: false,
        };
        switch (enteredSide) {
            case "entry":
                return [
                    {
                        exitSide: "straight",
                        turnoutState: straightState,
                    },
                    {
                        exitSide: "div",
                        turnoutState: divState,
                    },
                ];
            case "straight":
                return [
                    {
                        exitSide: "entry",
                        turnoutState: straightState,
                    },
                ];
            case "div":
                return [
                    {
                        exitSide: "entry",
                        turnoutState: divState,
                    },
                ];
        }
    }
    getTurnoutSideConnectedToElement(turnout, other) {
        const connections = turnout.getConnections();
        if (connections.entry.isEqual(other.pos)) {
            return "entry";
        }
        if (connections.straight.isEqual(other.pos)) {
            return "straight";
        }
        if (connections.div.isEqual(other.pos)) {
            return "div";
        }
        return undefined;
    }
}
