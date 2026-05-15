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
     * Az adott turnout-oldalon a pálya "forward" iránya
     * a váltó belseje felé mutat-e?
     */
    forwardIntoTurnout: boolean;
};

export class TrackTravelDirectionResolver {
    constructor(private readonly layout: Layout) {}

    resolve(): void {
        this.resetTravelDirections();

        const marker = this.findDirectionMarker();

        if (!marker) {
            console.warn("[TravelDirection] No TrackDirectionElement found.");
            return;
        }

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
    // MARKER
    // ============================================================

    private resetTravelDirections(): void {
        const elems = this.layout.getAllElements();

        for (const elem of elems) {
            elem.travelDirection = "unknown";
        }
    }

    private findDirectionMarker(): TrackDirectionElement | undefined {
        const elems = this.layout.getAllElements();

        const markers = elems.filter(
            elem => elem instanceof TrackDirectionElement
        ) as TrackDirectionElement[];

        if (markers.length === 0) {
            return undefined;
        }

        if (markers.length > 1) {
            console.warn(
                `[TravelDirection] Multiple TrackDirectionElements found (${markers.length}). Using the first one.`
            );
        }

        return markers[0];
    }

    // ============================================================
    // TRACK -> TRACK / TURNOUT
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

        /**
         * Ha a jelenlegi track ezen oldalán van a forward,
         * akkor a következő elem forward iránya a jelenlegi elemtől EL mutasson.
         *
         * Ha ez a jelenlegi track backward oldala,
         * akkor a szomszéd forward iránya a jelenlegi elem FELÉ mutasson.
         */
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
    // TURNOUT PROPAGATION
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
                     * Ha az aktuális turnout oldalán a forward
                     * befelé mutat, akkor a szomszéd turnout oldalán
                     * kifelé fog mutatni, és fordítva.
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

                    /**
                     * Ha a turnout adott oldalán a forward
                     * befelé mutat, akkor a track oldaláról nézve
                     * a forward a turnout FELÉ mutat.
                     *
                     * Ezért "away" = !targetForwardIntoTurnout
                     */
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