import { TrackTurnoutElement } from "../elements/TrackTurnoutElement";
import { BaseElement, TravelDirection } from "./BaseElement";
import {
    Edge,
    Graph,
    GraphNode,
    
    TurnoutStateRequirement
} from "./Graph";
import { isTurnoutElement, Layout } from "./Layout";
import { Point } from "./Rect";
import { TrackTravelDirectionResolver } from "./TrackTravelDirectionResolver";

type TurnoutSide = "entry" | "straight" | "div";

type TurnoutExit = {
    exitSide: TurnoutSide;
    turnoutState: TurnoutStateRequirement;
};

export class RouteGraphBuilder {
    private readonly graph = new Graph();

    /**
     * section szám -> GraphNode
     */
    private readonly sectionNodes = new Map<number, GraphNode>();

    /**
     * Duplikált edge-ek ellen.
     */
    private readonly createdEdgeKeys = new Set<string>();

    /**
     * A feldolgozott váltók cache-elve.
     */
    private turnouts: TrackTurnoutElement[] = [];

    private nextSectionNumber = 1;

    constructor(private readonly layout: Layout) {}

    build(): Graph {
        this.layout.resetRoutes();

        /**
         * Legelőször a teljes pályára beállítjuk a travelDirection értékeket
         * az egyetlen TrackDirectionElement alapján.
         */
        new TrackTravelDirectionResolver(this.layout).resolve();

        this.turnouts = this.collectTurnouts();

        this.markTurnoutsVisited();
        this.discoverPhysicalSections();
        this.createRouteEdges();

        console.log("GENERATED SECTION GRAPH:", this.graph);

        return this.graph;
    }

    // ============================================================
    // 1. FÁZIS: VÁLTÓK ÖSSZEGYŰJTÉSE
    // ============================================================

    private collectTurnouts(): TrackTurnoutElement[] {
        const elems = this.layout.getAllElements();

        return elems.filter(
            (elem: BaseElement) => isTurnoutElement(elem)
        ) as TrackTurnoutElement[];
    }

    /**
     * A váltók ne kerüljenek bele fizikai szakaszba.
     */
    private markTurnoutsVisited(): void {
        for (const turnout of this.turnouts) {
            turnout.isVisited = true;
//            turnout.isRoute = true;
        }
    }

    // ============================================================
    // 2. FÁZIS: VALÓDI FIZIKAI SZAKASZOK FELTÁRÁSA
    // ============================================================

    private discoverPhysicalSections(): void {
        for (const turnout of this.turnouts) {
            const connections = turnout.getConnections();

            const connectionPositions = [
                connections.entry,
                connections.straight,
                connections.div,
            ];

            for (const pos of connectionPositions) {
                const firstElem = this.layout.getObjectXy(pos);

                if (!firstElem) {
                    continue;
                }

                /**
                 * Ha közvetlenül másik váltó van mellette,
                 * abból NEM csinálunk külön virtuális szakaszt.
                 * Majd az edge-építés átmegy rajta.
                 */
                if (firstElem instanceof TrackTurnoutElement) {
                    continue;
                }

                /**
                 * Ezt a fizikai szakaszt már megtaláltuk.
                 */
                if (firstElem.isVisited) {
                    continue;
                }

                this.createPhysicalSection(firstElem);
            }
        }
    }

    private createPhysicalSection(firstElem: BaseElement): void {
        const sectionNumber = this.nextSectionNumber++;
        const sectionElements: BaseElement[] = [];

        this.walkTrackSection(
            firstElem,
            sectionNumber,
            sectionElements
        );

        const node = this.createSectionGraphNode(
            sectionNumber,
            sectionElements
        );

        this.graph.addNode(node);
        this.sectionNodes.set(sectionNumber, node);
    }

    /**
     * Egy valódi fizikai pályaszakaszt jár be.
     *
     * Addig megy, amíg:
     * - nincs tovább sín
     * - vagy váltóhoz ér
     *
     * Az összes bejárt elem ugyanazt a section számot kapja.
     */
    private walkTrackSection(
        obj: BaseElement,
        section: number,
        sectionElements: BaseElement[]
    ): void {
        obj.isVisited = true;
        //obj.isRoute = true;
        obj.section = section;

        sectionElements.push(obj);

        const nextPos = obj.getNextItemXy();
        const prevPos = obj.getPrevItemXy();

        this.walkTrackSectionDirection(
            obj,
            nextPos,
            section,
            sectionElements
        );

        this.walkTrackSectionDirection(
            obj,
            prevPos,
            section,
            sectionElements
        );
    }

    private walkTrackSectionDirection(
        current: BaseElement,
        targetPos: Point,
        section: number,
        sectionElements: BaseElement[]
    ): void {
        const next = this.layout.getObjectXy(targetPos);

        if (!next) {
            return;
        }

        /**
         * Váltónál megáll a szakasz.
         */
        if (next instanceof TrackTurnoutElement) {
            return;
        }

        const isConnectedBack =
            current.pos.isEqual(next.getNextItemXy()) ||
            current.pos.isEqual(next.getPrevItemXy());

        if (!isConnectedBack) {
            return;
        }

        if (next.isVisited) {
            return;
        }

        this.walkTrackSection(
            next,
            section,
            sectionElements
        );
    }

    private createSectionGraphNode(
        section: number,
        sectionElements: BaseElement[]
    ): GraphNode {
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

        return new GraphNode(`S${section}`, x, y);
    }

    // ============================================================
    // 3. FÁZIS: EDGE-EK FELÉPÍTÉSE
    // ============================================================

    private createRouteEdges(): void {
        for (const turnout of this.turnouts) {
            const connections = turnout.getConnections();

            const sides: TurnoutSide[] = [
                "entry",
                "straight",
                "div",
            ];

            for (const side of sides) {
                const connectedElem = this.layout.getObjectXy(
                    connections[side]
                );

                /**
                 * Edge-et csak valódi fizikai szakaszból indítunk.
                 * Ha közvetlenül másik váltó van ott, abból nem indul edge,
                 * azon majd áthaladunk egy másik szakaszból érkezve.
                 */
                if (!connectedElem) {
                    continue;
                }

                if (connectedElem instanceof TrackTurnoutElement) {
                    continue;
                }

                if (!connectedElem.section) {
                    continue;
                }

                const fromNode = this.sectionNodes.get(
                    connectedElem.section
                );

                if (!fromNode) {
                    continue;
                }

                /**
                 * Megnézzük, hogy ebből a szakaszból az adott váltó felé
                 * haladva a mozdony forward vagy reverse irányban menne-e.
                 */
                const locoDirection = this.getLocoDirectionForDeparture(
                    connectedElem,
                    turnout
                );

                this.walkTurnoutChainToSections(
                    fromNode,
                    turnout,
                    side,
                    [],
                    new Set<string>(),
                    locoDirection
                );
            }
        }
    }

    /**
     * Egy valódi szakaszból belépünk egy váltóba,
     * majd váltókon át haladunk addig,
     * amíg másik valódi szakaszt nem találunk.
     *
     * Közben gyűjtjük az összes szükséges váltóállást.
     */
    private walkTurnoutChainToSections(
        fromNode: GraphNode,
        turnout: TrackTurnoutElement,
        enteredSide: TurnoutSide,
        turnoutStates: TurnoutStateRequirement[],
        visitedTurnoutSides: Set<string>,
        locoDirection: TravelDirection
    ): void {
        const visitKey = `${turnout.id}:${enteredSide}`;

        if (visitedTurnoutSides.has(visitKey)) {
            return;
        }

        const nextVisited = new Set(visitedTurnoutSides);
        nextVisited.add(visitKey);

        const exits = this.getAllowedTurnoutExits(
            turnout,
            enteredSide
        );

        for (const exit of exits) {
            const nextTurnoutStates = [
                ...turnoutStates,
                exit.turnoutState,
            ];

            const connections = turnout.getConnections();
            const exitPos = connections[exit.exitSide];

            const nextElem = this.layout.getObjectXy(exitPos);

            if (!nextElem) {
                continue;
            }

            /**
             * 1. Valódi szakaszhoz értünk.
             */
            if (!(nextElem instanceof TrackTurnoutElement)) {
                this.finishRouteEdge(
                    fromNode,
                    nextElem,
                    nextTurnoutStates,
                    locoDirection
                );

                continue;
            }

            /**
             * 2. Közvetlenül egy másik váltóhoz értünk.
             *    Megnézzük, annak melyik oldalán érkeztünk be,
             *    és megyünk tovább.
             */
            const nextTurnout = nextElem;

            const nextEnteredSide =
                this.getTurnoutSideConnectedToElement(
                    nextTurnout,
                    turnout
                );

            if (!nextEnteredSide) {
                continue;
            }

            this.walkTurnoutChainToSections(
                fromNode,
                nextTurnout,
                nextEnteredSide,
                nextTurnoutStates,
                nextVisited,
                locoDirection
            );
        }
    }

    private finishRouteEdge(
        fromNode: GraphNode,
        targetElem: BaseElement,
        turnoutStates: TurnoutStateRequirement[],
        locoDirection: TravelDirection
    ): void {
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

        this.addRouteEdgeIfMissing(
            fromNode,
            toNode,
            turnoutStates,
            locoDirection
        );
    }

    private addRouteEdgeIfMissing(
        from: GraphNode,
        to: GraphNode,
        turnoutStates: TurnoutStateRequirement[],
        locoDirection: TravelDirection
    ): void {
        const turnoutKey = turnoutStates
            .map(state => `${state.address}:${state.closed ? "C" : "T"}`)
            .join("|");

        const edgeKey =
            `${from.name}->${to.name}:${turnoutKey}:${locoDirection}`;

        if (this.createdEdgeKeys.has(edgeKey)) {
            return;
        }

        this.createdEdgeKeys.add(edgeKey);

        this.graph.addEdge(
            new Edge(from, to, turnoutStates, locoDirection)
        );
    }

    // ============================================================
    // 4. VÁLTÓ-LOGIKA
    // ============================================================

    /**
     * Egy váltó adott oldaláról belépve
     * mely oldalak felé lehet továbbmenni,
     * és ehhez milyen váltóállás szükséges.
     */
    private getAllowedTurnoutExits(
        turnout: TrackTurnoutElement,
        enteredSide: TurnoutSide
    ): TurnoutExit[] {
        const straightState: TurnoutStateRequirement = {
            address: turnout.turnoutAddress,
            closed: turnout.turnoutClosedValue,
        };

        const divState: TurnoutStateRequirement = {
            address: turnout.turnoutAddress,
            closed: !turnout.turnoutClosedValue,
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

    /**
     * Megmondja, hogy a másik váltó melyik oldalával
     * néz az aktuális elemre.
     */
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

    // ============================================================
    // 5. MOZDONY MENETIRÁNY MEGHATÁROZÁSA
    // ============================================================

    /**
     * Megmondja, hogy ebből a szakaszból az adott váltó felé indulva
     * a mozdony parancsa forward vagy reverse legyen-e.
     */
    private getLocoDirectionForDeparture(
        trackElem: BaseElement,
        turnout: TrackTurnoutElement
    ): TravelDirection {
        if (trackElem.travelDirection === "unknown") {
            return "unknown";
        }

        const forwardTowardsTurnout =
            this.isTrackForwardTowardsPosition(
                trackElem,
                turnout.pos
            );

        return forwardTowardsTurnout
            ? "forward"
            : "reverse";
    }

    /**
     * Igaz, ha az adott track elem travelDirection szerinti
     * "előre" iránya a megadott pozíció felé mutat.
     */
    private isTrackForwardTowardsPosition(
        trackElem: BaseElement,
        pos: Point
    ): boolean {
        if (trackElem.travelDirection === "forward") {
            return trackElem.getNextItemXy().isEqual(pos);
        }

        if (trackElem.travelDirection === "reverse") {
            return trackElem.getPrevItemXy().isEqual(pos);
        }

        return false;
    }
}