import { TrackDirectionElement } from "../elements/TrackDirectionElement";
import { TrackTurnoutElement } from "../elements/TrackTurnoutElement";
import { BaseElement, TravelDirection } from "./BaseElement";

import { Layout } from "./Layout";
import { Point } from "./Rect";

type TurnoutSide = "entry" | "straight" | "div";

type TurnoutPropagationState = {
    turnout: TrackTurnoutElement;
    enteredSide: TurnoutSide;

    /**
     * Az adott turnout-oldalon a "forward" irány
     * a váltó belseje felé mutat-e.
     */
    forwardIntoTurnout: boolean;
};

export class TrackTravelDirectionResolver {
    constructor(private readonly layout: Layout) { }

    resolve(): void {
        this.resetTravelDirections();

        const networks = this.collectTrackNetworks();

        if (networks.length === 0) {
            return;
        }

        networks.forEach((network, index) => {
            const markers = network.filter(
                elem => elem instanceof TrackDirectionElement
            ) as TrackDirectionElement[];

            if (markers.length === 0) {
                throw new Error(
                    `A ${index + 1}. különálló pályarészen nincs irányjelölő elem.`
                );
            }

            if (markers.length > 1) {
                throw new Error(
                    `A ${index + 1}. különálló pályarészen több irányjelölő elem található. Egy pályarészen pontosan egy lehet.`
                );
            }

            //this.propagateFromMarker(markers[0]!);
            const marker = markers[0]!;
            const trackName = marker.name?.trim() || "Unnamed track";

            this.assignTrackNameToNetwork(network, trackName);
            this.propagateFromMarker(marker);
        });
    }

    // ============================================================
    // 1. UTAZÁSI IRÁNYOK RESET
    // ============================================================

    private resetTravelDirections(): void {
        const elems = this.layout.getAllElements();

        for (const elem of elems) {
            elem.travelDirection = "unknown";
            elem.trackName = "";
        }
    }

    private assignTrackNameToNetwork(
        network: BaseElement[],
        trackName: string
    ): void {
        for (const elem of network) {
            elem.trackName = trackName;
        }
    }
    // ============================================================
    // 2. KÜLÖNÁLLÓ PÁLYARÉSZEK FELTÁRÁSA
    // ============================================================

    /**
     * Összegyűjti az összefüggő sín-hálózatokat.
     *
     * Kiindulási pontok:
     * - minden TrackDirectionElement
     * - minden TrackTurnoutElement
     *
     * Ez elég a route graph szempontjából releváns hálózatokhoz.
     */
    private collectTrackNetworks(): BaseElement[][] {
        const elems = this.layout.getAllElements();

        const seeds = elems.filter(
            elem =>
                elem instanceof TrackDirectionElement ||
                elem instanceof TrackTurnoutElement
        );

        const visited = new Set<string>();
        const networks: BaseElement[][] = [];

        for (const seed of seeds) {
            if (visited.has(seed.id)) {
                continue;
            }

            const network = this.walkConnectedNetwork(seed, visited);

            if (network.length > 0) {
                networks.push(network);
            }
        }

        return networks;
    }

    private walkConnectedNetwork(
        start: BaseElement,
        visited: Set<string>
    ): BaseElement[] {
        const result: BaseElement[] = [];
        const queue: BaseElement[] = [start];

        while (queue.length > 0) {
            const current = queue.shift()!;

            if (visited.has(current.id)) {
                continue;
            }

            visited.add(current.id);
            result.push(current);

            const neighbors = this.getConnectedNeighbors(current);

            for (const neighbor of neighbors) {
                if (!visited.has(neighbor.id)) {
                    queue.push(neighbor);
                }
            }
        }

        return result;
    }

    /**
     * Megadja egy pályaelem közvetlenül kapcsolódó szomszédait.
     */
    private getConnectedNeighbors(elem: BaseElement): BaseElement[] {
        if (elem instanceof TrackTurnoutElement) {
            return this.getTurnoutNeighbors(elem);
        }

        return this.getTrackNeighbors(elem);
    }

    private getTrackNeighbors(elem: BaseElement): BaseElement[] {
        const result: BaseElement[] = [];

        const nextPos = elem.getNextItemXy();
        const prevPos = elem.getPrevItemXy();

        this.tryAddTrackNeighbor(elem, nextPos, result);
        this.tryAddTrackNeighbor(elem, prevPos, result);

        return result;
    }

    private tryAddTrackNeighbor(
        current: BaseElement,
        targetPos: Point,
        result: BaseElement[]
    ): void {
        const neighbor = this.layout.getObjectXy(targetPos);

        if (!neighbor) {
            return;
        }

        /**
         * Track -> turnout kapcsolat.
         * Ha a targetPos-on váltó van, akkor fizikailag kapcsolódunk hozzá.
         */
        if (neighbor instanceof TrackTurnoutElement) {
            result.push(neighbor);
            return;
        }

        /**
         * Track -> track kapcsolat.
         * Csak akkor valódi, ha a másik elem vissza is mutat a jelenlegi elemre.
         */
        const isConnectedBack =
            current.pos.isEqual(neighbor.getNextItemXy()) ||
            current.pos.isEqual(neighbor.getPrevItemXy());

        if (isConnectedBack) {
            result.push(neighbor);
        }
    }

    private getTurnoutNeighbors(turnout: TrackTurnoutElement): BaseElement[] {
        const result: BaseElement[] = [];
        const connections = turnout.getConnections();

        const connectionPositions = [
            connections.entry,
            connections.straight,
            connections.div,
        ];

        for (const pos of connectionPositions) {
            const neighbor = this.layout.getObjectXy(pos);

            if (neighbor) {
                result.push(neighbor);
            }
        }

        return result;
    }

    // ============================================================
    // 3. IRÁNYTERJESZTÉS EGY TRACKDIRECTION MARKERBŐL
    // ============================================================

    private propagateFromMarker(marker: TrackDirectionElement): void {
        marker.travelDirection = "forward";

        const trackQueue: BaseElement[] = [marker];
        const turnoutQueue: TurnoutPropagationState[] = [];

        const processedTrackIds = new Set<string>();
        const processedTurnoutStates = new Set<string>();

        while (trackQueue.length > 0 || turnoutQueue.length > 0) {
            while (trackQueue.length > 0) {
                const track = trackQueue.shift()!;

                if (processedTrackIds.has(track.id)) {
                    continue;
                }

                processedTrackIds.add(track.id);

                this.propagateFromTrack(
                    track,
                    trackQueue,
                    turnoutQueue
                );
            }

            while (turnoutQueue.length > 0) {
                const state = turnoutQueue.shift()!;

                const key =
                    `${state.turnout.id}:${state.enteredSide}:${state.forwardIntoTurnout ? "in" : "out"}`;

                if (processedTurnoutStates.has(key)) {
                    continue;
                }

                processedTurnoutStates.add(key);

                this.propagateFromTurnoutSide(
                    state,
                    trackQueue,
                    turnoutQueue
                );
            }
        }
    }

    // ============================================================
    // 4. TRACK -> TRACK / TURNOUT IRÁNYTERJESZTÉS
    // ============================================================

    private propagateFromTrack(
        track: BaseElement,
        trackQueue: BaseElement[],
        turnoutQueue: TurnoutPropagationState[]
    ): void {
        this.propagateFromTrackSide(
            track,
            "next",
            trackQueue,
            turnoutQueue
        );

        this.propagateFromTrackSide(
            track,
            "prev",
            trackQueue,
            turnoutQueue
        );
    }

    private propagateFromTrackSide(
        track: BaseElement,
        side: "next" | "prev",
        trackQueue: BaseElement[],
        turnoutQueue: TurnoutPropagationState[]
    ): void {
        const targetPos =
            side === "next"
                ? track.getNextItemXy()
                : track.getPrevItemXy();

        const nextElem = this.layout.getObjectXy(targetPos);

        if (!nextElem) {
            return;
        }

        // ------------------------------------------------------------
        // TRACK -> TURNOUT
        // ------------------------------------------------------------
        if (nextElem instanceof TrackTurnoutElement) {
            const enteredSide = this.getTurnoutSideConnectedToElement(
                nextElem,
                track
            );

            if (!enteredSide) {
                return;
            }

            const forwardTowardsTurnout =
                this.isTrackForwardTowardsPosition(
                    track,
                    nextElem.pos
                );

            turnoutQueue.push({
                turnout: nextElem,
                enteredSide,
                forwardIntoTurnout: forwardTowardsTurnout,
            });

            return;
        }

        // ------------------------------------------------------------
        // TRACK -> TRACK
        // ------------------------------------------------------------
        const thisSideIsForward =
            this.isTrackSideForward(track, side);

        const shouldPointAwayFromTrack = thisSideIsForward;

        const expectedDirection =
            this.getExpectedTrackDirectionFromConnection(
                nextElem,
                track.pos,
                shouldPointAwayFromTrack
            );

        if (!expectedDirection) {
            return;
        }

        this.assignTravelDirection(
            nextElem,
            expectedDirection,
            trackQueue
        );
    }

    private isTrackSideForward(
        track: BaseElement,
        side: "next" | "prev"
    ): boolean {
        return (
            (track.travelDirection === "forward" && side === "next") ||
            (track.travelDirection === "reverse" && side === "prev")
        );
    }

    private isTrackForwardTowardsPosition(
        track: BaseElement,
        pos: Point
    ): boolean {
        if (track.travelDirection === "forward") {
            return track.getNextItemXy().isEqual(pos);
        }

        if (track.travelDirection === "reverse") {
            return track.getPrevItemXy().isEqual(pos);
        }

        return false;
    }

    /**
     * Egy szomszédos track elem irányát számolja ki.
     *
     * connectionPos:
     *   az a pozíció, amelyhez a szomszéd csatlakozik
     *
     * shouldPointAwayFromConnection:
     *   true  -> a track forward iránya a kapcsolatból kifelé mutasson
     *   false -> a track forward iránya a kapcsolat felé mutasson
     */
    private getExpectedTrackDirectionFromConnection(
        track: BaseElement,
        connectionPos: Point,
        shouldPointAwayFromConnection: boolean
    ): TravelDirection | undefined {
        const nextTouchesConnection =
            track.getNextItemXy().isEqual(connectionPos);

        const prevTouchesConnection =
            track.getPrevItemXy().isEqual(connectionPos);

        if (shouldPointAwayFromConnection) {
            if (prevTouchesConnection) {
                return "forward";
            }

            if (nextTouchesConnection) {
                return "reverse";
            }
        } else {
            if (nextTouchesConnection) {
                return "forward";
            }

            if (prevTouchesConnection) {
                return "reverse";
            }
        }

        return undefined;
    }

    private assignTravelDirection(
        elem: BaseElement,
        direction: TravelDirection,
        trackQueue: BaseElement[]
    ): void {
        if (elem.travelDirection === "unknown") {
            elem.travelDirection = direction;
            trackQueue.push(elem);
            return;
        }

        if (elem.travelDirection !== direction) {
            console.warn(
                `[TravelDirection] Direction conflict on element ${elem.id}. Existing=${elem.travelDirection}, new=${direction}`
            );
        }
    }

    // ============================================================
    // 5. TURNOUT -> TRACK / TURNOUT IRÁNYTERJESZTÉS
    // ============================================================

    private propagateFromTurnoutSide(
        state: TurnoutPropagationState,
        trackQueue: BaseElement[],
        turnoutQueue: TurnoutPropagationState[]
    ): void {
        const { turnout, enteredSide, forwardIntoTurnout } = state;

        const connections = turnout.getConnections();

        const sides: TurnoutSide[] = [
            "entry",
            "straight",
            "div",
        ];

        for (const targetSide of sides) {
            if (targetSide === enteredSide) {
                continue;
            }

            const targetForwardIntoTurnout =
                this.getTurnoutSideForwardIntoTurnout(
                    enteredSide,
                    forwardIntoTurnout,
                    targetSide
                );

            const targetPos = connections[targetSide];
            const targetElem = this.layout.getObjectXy(targetPos);

            if (!targetElem) {
                continue;
            }

            // --------------------------------------------------------
            // TURNOUT -> TURNOUT
            // --------------------------------------------------------
            if (targetElem instanceof TrackTurnoutElement) {
                const targetEnteredSide =
                    this.getTurnoutSideConnectedToElement(
                        targetElem,
                        turnout
                    );

                if (!targetEnteredSide) {
                    continue;
                }

                turnoutQueue.push({
                    turnout: targetElem,
                    enteredSide: targetEnteredSide,

                    /**
                     * A másik váltó oldaláról nézve
                     * a befelé/kifelé viszony megfordul.
                     */
                    forwardIntoTurnout: !targetForwardIntoTurnout,
                });

                continue;
            }

            // --------------------------------------------------------
            // TURNOUT -> TRACK
            // --------------------------------------------------------
            const expectedDirection =
                this.getExpectedTrackDirectionFromConnection(
                    targetElem,
                    turnout.pos,
                    !targetForwardIntoTurnout
                );

            if (!expectedDirection) {
                continue;
            }

            this.assignTravelDirection(
                targetElem,
                expectedDirection,
                trackQueue
            );
        }
    }

    /**
     * Turnout irányviszony:
     *
     * - entry és straight: ellentétes
     * - entry és div:      ellentétes
     * - straight és div:   azonos
     */
    private getTurnoutSideForwardIntoTurnout(
        knownSide: TurnoutSide,
        knownForwardIntoTurnout: boolean,
        targetSide: TurnoutSide
    ): boolean {
        const knownIsEntry = knownSide === "entry";
        const targetIsEntry = targetSide === "entry";

        if (knownIsEntry === targetIsEntry) {
            return knownForwardIntoTurnout;
        }

        return !knownForwardIntoTurnout;
    }

    private getTurnoutSideConnectedToElement(
        turnout: TrackTurnoutElement,
        other: BaseElement
    ): TurnoutSide | undefined {
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