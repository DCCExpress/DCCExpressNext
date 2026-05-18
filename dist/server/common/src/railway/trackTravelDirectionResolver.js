// common/src/railway/trackTravelDirectionResolver.ts
import { TopologyDirectionElement, TopologyTurnoutElement, } from "./topology.js";
export class TrackTravelDirectionResolver {
    topology;
    constructor(topology) {
        this.topology = topology;
    }
    resolve() {
        const physicalTracks = this.topology.getPhysicalTrackElements();
        this.resetRuntimeState(physicalTracks);
        const networks = this.findConnectedTrackNetworks(physicalTracks);
        for (const network of networks) {
            const directionElements = network.filter((elem) => elem instanceof TopologyDirectionElement);
            if (directionElements.length === 0) {
                throw new Error("A connected track network has no TrackDirection element.");
            }
            if (directionElements.length > 1) {
                throw new Error("A connected track network has more than one TrackDirection element.");
            }
            const directionElement = directionElements[0];
            this.assignTrackNameToNetwork(network, directionElement.name.trim());
            this.propagateTravelDirection(directionElement, network);
        }
    }
    resetRuntimeState(elements) {
        for (const elem of elements) {
            elem.travelDirection = "unknown";
            elem.trackName = "";
        }
    }
    findConnectedTrackNetworks(elements) {
        const result = [];
        const visited = new Set();
        for (const elem of elements) {
            if (visited.has(elem.id)) {
                continue;
            }
            const network = [];
            const stack = [elem];
            while (stack.length > 0) {
                const current = stack.pop();
                if (visited.has(current.id)) {
                    continue;
                }
                visited.add(current.id);
                network.push(current);
                const neighbors = this.getConnectedNeighbors(current);
                for (const neighbor of neighbors) {
                    if (!visited.has(neighbor.id)) {
                        stack.push(neighbor);
                    }
                }
            }
            result.push(network);
        }
        return result;
    }
    assignTrackNameToNetwork(network, trackName) {
        for (const elem of network) {
            elem.trackName = trackName;
        }
    }
    propagateTravelDirection(directionElement, network) {
        const networkIds = new Set(network.map(elem => elem.id));
        directionElement.travelDirection = "forward";
        const queue = [
            directionElement,
        ];
        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = this.getConnectedNeighbors(current);
            for (const neighbor of neighbors) {
                if (!networkIds.has(neighbor.id)) {
                    continue;
                }
                const currentSide = this.getSideTowards(current, neighbor);
                const neighborSide = this.getSideTowards(neighbor, current);
                if (!currentSide || !neighborSide) {
                    continue;
                }
                const currentFlowSide = this.getFlowSideForConnection(current, currentSide);
                if (!currentFlowSide) {
                    continue;
                }
                const desiredNeighborFlowSide = currentFlowSide === "forward"
                    ? "backward"
                    : "forward";
                const proposedNeighborDirection = this.getTravelDirectionForFlowSide(neighbor, neighborSide, desiredNeighborFlowSide);
                if (neighbor.travelDirection === "unknown") {
                    neighbor.travelDirection =
                        proposedNeighborDirection;
                    queue.push(neighbor);
                    continue;
                }
                if (neighbor.travelDirection !==
                    proposedNeighborDirection) {
                    throw new Error("Track travel direction conflict detected. Check TrackDirection placement and track topology.");
                }
            }
        }
    }
    getConnectedNeighbors(element) {
        const result = [];
        for (const connection of this.getConnectionPoints(element)) {
            const candidate = this.topology.getPhysicalTrackAt(connection.point);
            if (!candidate) {
                continue;
            }
            if (candidate.id === element.id) {
                continue;
            }
            const candidateSide = this.getSideTowards(candidate, element);
            if (!candidateSide) {
                continue;
            }
            result.push(candidate);
        }
        return result;
    }
    getConnectionPoints(element) {
        if (element instanceof TopologyTurnoutElement) {
            const connections = element.getConnections();
            return [
                {
                    side: "entry",
                    point: connections.entry,
                },
                {
                    side: "straight",
                    point: connections.straight,
                },
                {
                    side: "div",
                    point: connections.div,
                },
            ];
        }
        return [
            {
                side: "next",
                point: element.getNextItemPoint(),
            },
            {
                side: "prev",
                point: element.getPrevItemPoint(),
            },
        ];
    }
    getSideTowards(element, other) {
        for (const connection of this.getConnectionPoints(element)) {
            if (connection.point.isEqual(other.pos)) {
                return connection.side;
            }
        }
        return undefined;
    }
    getFlowSideForConnection(element, side) {
        const direction = element.travelDirection;
        if (direction === "unknown") {
            return null;
        }
        if (element instanceof TopologyTurnoutElement) {
            if (direction === "forward") {
                return side === "entry"
                    ? "backward"
                    : "forward";
            }
            return side === "entry"
                ? "forward"
                : "backward";
        }
        if (direction === "forward") {
            return side === "next"
                ? "forward"
                : "backward";
        }
        return side === "next"
            ? "backward"
            : "forward";
    }
    getTravelDirectionForFlowSide(element, side, desiredFlowSide) {
        if (element instanceof TopologyTurnoutElement) {
            if (desiredFlowSide === "forward") {
                return side === "entry"
                    ? "reverse"
                    : "forward";
            }
            return side === "entry"
                ? "forward"
                : "reverse";
        }
        if (desiredFlowSide === "forward") {
            return side === "next"
                ? "forward"
                : "reverse";
        }
        return side === "next"
            ? "reverse"
            : "forward";
    }
}
