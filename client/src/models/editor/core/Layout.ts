import { measure, showWarningMessage } from "../../../helpers";
import { RouteButtonElement } from "../elements/RouteButtonElement";
import { TrackElement } from "../elements/TrackElement";
import TrackTurnoutDoubleElement from "../elements/TrackTurnoutDoubleElement";
import { TrackTurnoutElement } from "../elements/TrackTurnoutElement";
import { TrackTurnoutLeftElement } from "../elements/TrackTurnoutLeftElement";
import { TrackTurnoutRightElement } from "../elements/TrackTurnoutRightElement";
import { TrackTurnoutTwoWayElement } from "../elements/TrackTurnoutTwoWayElement";
import { DrawOptions } from "../types/EditorTypes";
import { BaseElement } from "./BaseElement";
import { ElementFactory } from "./ElementFactory";
import { Layer, LayerId } from "./Layer";
import { Point } from "./Rect";
import { BlockElement } from "../elements/BlockElement";
import { Loco } from "../../../../../common/src/types";
import { Edge, Graph, GraphNode, RouteSolution, TurnoutStateRequirement } from "./Graph";
import { RouteGraphBuilder } from "./RouteGraphBuilder";
import { ExtendedRouteButtonElement } from "../elements/ExtendedRouteButtonElement";

export function isTurnoutElement(el: BaseElement | null | undefined) {
    return (
        el instanceof TrackTurnoutElement ||
        el instanceof TrackTurnoutLeftElement ||
        el instanceof TrackTurnoutRightElement //||
        //el instanceof TrackTurnoutTwoWayElement ||
        //el instanceof TrackTurnoutDoubleElement
    );
}

type TurnoutSide = "entry" | "straight" | "div";

export class Layout {
    private layers: Layer[] = [];
    private _activeLayerId: LayerId = "track";
    gridSize: number = 40;
    constructor() {
        this.layers = [
            new Layer("buildings", "Épületek"),
            new Layer("blocks", "Blokkok"),
            new Layer("sensors", "Sensors"),
            new Layer("signals", "Signals"),
            new Layer("track", "Pálya"),
        ];

        const track = new TrackElement(10, 10)
        track.id = "track1";
        this.track.elements.push(track);

    }

    //   public get layers(): Layer[] {
    //     return this.layers;
    //   }

    public get activeLayerId(): LayerId {
        return this._activeLayerId;
    }

    public set activeLayerId(value: LayerId) {
        const exists = this.layers.some(l => l.id === value);
        if (exists) {
            this._activeLayerId = value;
        }
    }

    public get activeLayer(): Layer {
        const layer = this.getLayer(this._activeLayerId);
        if (!layer) {
            throw new Error(`Active layer not found: ${this._activeLayerId}`);
        }
        return layer;
    }

    public get track(): Layer {
        return this.requireLayer("track");
    }

    public get blocks(): Layer {
        return this.requireLayer("blocks");
    }

    public get sensors(): Layer {
        return this.requireLayer("sensors");
    }

    public get signals(): Layer {
        return this.requireLayer("signals");
    }

    public get buildings(): Layer {
        return this.requireLayer("buildings");
    }

    public addLayer(id: LayerId, name: string): Layer {
        const existing = this.getLayer(id);
        if (existing) {
            return existing;
        }

        const layer = new Layer(id, name);
        this.layers.push(layer);
        return layer;
    }

    public getLayer(id: LayerId): Layer | undefined {
        return this.layers.find(l => l.id === id);
    }

    public requireLayer(id: LayerId): Layer {
        const layer = this.getLayer(id);
        if (!layer) {
            throw new Error(`Layer not found: ${id}`);
        }
        return layer;
    }

    public addElement(element: BaseElement, layerId?: LayerId): void {
        const layer = layerId ? this.requireLayer(layerId) : this.activeLayer;

        if (layer.locked) {
            return;
        }

        layer.add(element);
    }

    public removeElement(element: BaseElement): void {
        const elems = this.getAllElements();
        for (const el of elems) {
            if (el instanceof RouteButtonElement) {
                console.log("CHECKING ROUTE BUTTON: ", el, element);
                const rb = el as RouteButtonElement;
                for (const t of rb.routeTurnouts) {
                    console.log("CHECKING TURNOUT: ", t, element);
                    if (t.turnoutId === element.id) {
                        console.log("REMOVING ROUTE BUTTON: ", el);
                        rb.removeTurnout(element.id);
                        showWarningMessage(rb.name, " A váltó törlésre került, ezért a hozzá tartozó útvonal gombból is eltávolításra került.");
                        break
                    }
                }
            }
        }
        for (const layer of this.layers) {
            const index = layer.elements.indexOf(element);
            if (index >= 0) {
                layer.elements.splice(index, 1);
                return;
            }
        }
    }

    public clearAll(): void {
        for (const layer of this.layers) {
            layer.clear();
        }
    }

    public getAllVisibleElements(): BaseElement[] {
        return this.layers
            .filter(layer => layer.visible)
            .flatMap(layer => layer.elements);
    }

    // public getAllElements(): BaseElement[] {
    //     return this.layers.flatMap(layer => layer.elements);
    // }

    public getAllElements(): BaseElement[] {
        return [
            ...this.track.elements,
            ...this.blocks.elements,
            ...this.signals.elements,
            ...this.sensors.elements,
            ...this.buildings.elements,
        ];
    }

    public getElementAtGrid(x: number, y: number): BaseElement | null {
        const all = this.getAllElements();

        for (let i = all.length - 1; i >= 0; i--) {
            const el = all[i]!;
            if (el.x === x && el.y === y) {
                return el;
            }
        }

        return null;
    }

    public isOccupied(x: number, y: number): boolean {
        return this.getElementAtGrid(x, y) !== null;
    }

    public findLayerOfElement(element: BaseElement): Layer | undefined {
        return this.layers.find(layer => layer.elements.includes(element));
    }

    getElement(x: number, y: number): BaseElement | null {
        for (const l of this.layers) {
            for (const e of l.elements) {
                if (e.hitTest(x, y)) {
                    return e;
                }
            }
        }
        return null;
    }

    getLayeredElement(be: BaseElement, x: number, y: number): BaseElement | null {
        for (const l of this.layers) {
            for (const e of l.elements) {
                // if(e.hitTest(x,y)) {
                //     return e;
                // }
                if (e.hitTest(x, y) && e.layerName == be.layerName) {
                    return e;
                }
            }
        }
        return null;
    }


    public checkElementCollision(e1: BaseElement, e2: BaseElement) {
        const l1 = this.findLayerOfElement(e1);
        const l2 = this.findLayerOfElement(e2);
        console.log("COLLISION: ", l1, l2)
        return l1?.name == l2?.name;
    }

    public getElement22(x: number, y: number): BaseElement | null {
        const layers = [this.track, this.blocks, this.buildings];

        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i]!;

            for (let j = layer.elements.length - 1; j >= 0; j--) {
                const el = layer.elements[j]!;

                if (el.x === x && el.y === y) {
                    return el;
                }
            }
        }

        return null;
    }

    getElements(x: number, y: number): BaseElement[] {
        const list: BaseElement[] = [];
        for (const l of this.layers) {
            for (const e of l.elements) {
                if (e.hitTest(x, y)) {
                    list.push(e);
                }
            }
        }
        return list;
    }

    getElementById(id: string): BaseElement | undefined {
        const elements = this.getAllElements();
        return elements.find((x) => x.id == id);
    }
    getElementByName(name: string): BaseElement | undefined {
        const elements = this.getAllElements();
        return elements.find((x) => x.name == name);
    }

    isExists(x: number, y: number): boolean {
        return this.getElements(x, y).length > 0 ? true : false;
    }


    getSelected(): BaseElement | null {
        for (const l of this.layers) {
            for (const e of l.elements) {
                if (e.selected) {
                    return e;
                }
            }
        }
        return null;
    }

    setSelected(be: BaseElement) {
        this.unselectAll();
        for (const l of this.layers) {
            for (const e of l.elements) {
                if (e.id === be.id) {
                    e.selected = true;
                }
            }
        }
    }

    unselectAll() {
        for (const l of this.layers) {
            for (const e of l.elements) {
                e.selected = false;
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D, options: DrawOptions) {
        this.track.draw(ctx, options);

        this.sensors.draw(ctx, options);
        this.signals.draw(ctx, options);
        this.blocks.draw(ctx, options);
        this.buildings.draw(ctx, options);

        this.getAllElements().forEach(e => e.drawMarked(ctx));
    }

    getLayoutBounds() {
        const elements = this.getAllElements();

        if (elements.length === 0) {
            return null;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const el of elements) {
            minX = Math.min(minX, el.x);
            minY = Math.min(minY, el.y);
            maxX = Math.max(maxX, el.x);
            maxY = Math.max(maxY, el.y);
        }

        return { minX, minY, maxX, maxY };
    }

    setBlockLocoAddress(selectedBlock: BlockElement, loco: Loco) {
        const elems = this.getAllElements();
        elems.forEach((elem: BaseElement) => {
            if (elem instanceof BlockElement) {
                const block = elem as BlockElement;
                if (block.locoAddress === loco.address) {
                    block.locoAddress = 0;
                }
            }
        });

        selectedBlock.locoAddress = loco.address;
    }
    static fromJSON(data: any): Layout {
        const layout = new Layout();

        layout.gridSize = data.gridSize ?? 40;

        if (data._activeLayerId) {
            layout.activeLayerId = data._activeLayerId;
        }

        if (!Array.isArray(data.layers)) {
            return layout;
        }

        for (const layerData of data.layers) {
            const layer = layout.getLayer(layerData.id);
            if (!layer) {
                continue;
            }

            layer.name = layerData.name ?? layer.name;
            layer.visible = layerData.visible ?? true;
            layer.locked = layerData.locked ?? false;
            layer.elements = ElementFactory.createMany(layerData.elements ?? []);
        }

        return layout;
    }

    getObjectXy(point: Point) {
        var elem = this.getAllElements().find((elem: BaseElement) => {
            return elem.x == point.x && elem.y == point.y
        })
        return elem
    }


    resetRoutes() {
        const elems = this.getAllElements();
        elems.forEach((elem: BaseElement) => {
            elem.isVisited = false;
            elem.isRoute = false;
            //elem.section = 0;
        })
    }
    checkRoutes2() {
        const elems = this.getAllElements();
        elems.forEach((elem: BaseElement) => {
            elem.isVisited = false;
            elem.isRoute = false;
        })
        //this.resetRoutes();

        const routeButtons = this.getAllElements().filter((elem: BaseElement) => elem instanceof RouteButtonElement) as RouteButtonElement[];
        routeButtons.forEach(rb => {
            let active = true;
            rb.routeTurnouts.forEach(t => {
                const turnout = this.getElementById(t.turnoutId) as TrackTurnoutElement;
                if (turnout && turnout.turnoutClosed === t.closed) {

                } else {
                    active = false;
                }
            });
            rb.active = active;
            if (active && rb.routeTurnouts.length > 0) {
                const turnout = this.getElementById(rb.routeTurnouts[0]!.turnoutId) as TrackTurnoutElement;
                this.startWalk(turnout);
            }
        });

    }

    private isExtendedRouteSolutionActive(solution: RouteSolution): boolean {
        const elems = this.getAllElements();

        for (const turnoutState of solution.turnoutStates) {
            const turnout = elems.find(
                (elem): elem is TrackTurnoutElement =>
                    isTurnoutElement(elem) &&
                    elem.turnoutAddress === turnoutState.address
            );

            if (!turnout) {
                return false;
            }

            /**
             * turnoutState.closed:
             *   logikai gráfállapot
             *   true  = C
             *   false = T
             *
             * turnout.isClosed:
             *   szintén logikai állapot,
             *   már figyelembe veszi a turnoutClosedValue-t.
             */
            if (turnout.isClosed !== turnoutState.closed) {
                return false;
            }
        }

        return true;
    }

    private markExtendedRouteSolution(solution: RouteSolution): void {
        const elems = this.getAllElements();

        /**
         * A graph node nevek most S1, S2, S3...
         * A pályaelemek section mezője pedig 1, 2, 3...
         */
        const routeSections = new Set<number>(
            solution.nodes
                .map(node => {
                    const match = /^S(\d+)$/.exec(node.name);
                    return match ? Number(match[1]) : NaN;
                })
                .filter(section => Number.isFinite(section))
        );

        /**
         * Az útvonalon szereplő váltók címei.
         */
        const routeTurnoutAddresses = new Set<number>(
            solution.turnoutStates.map(state => state.address)
        );

        for (const elem of elems) {
            // A route-hoz tartozó fizikai szakaszok kiszínezése
            if (routeSections.has(elem.section)) {
                elem.isRoute = true;
            }

            // A route-hoz tartozó váltók kiszínezése
            if (
                isTurnoutElement(elem) &&
                routeTurnoutAddresses.has(elem.turnoutAddress)
            ) {
                elem.isRoute = true;
            }
        }
    }

    checkRoutes22() {
        const elems = this.getAllElements();

        // --------------------------------------------------
        // Minden korábbi route-színezés törlése
        // --------------------------------------------------
        elems.forEach((elem: BaseElement) => {
            elem.isVisited = false;
            elem.isRoute = false;
        });

        // --------------------------------------------------
        // 1. Gráf felépítése az ExtendedRouteButtonök miatt
        // --------------------------------------------------
        let graph: Graph | null = null;

        try {
            graph = this.processRoutes();
        } catch (error) {
            /**
             * Például nincs direction marker, vagy hibás a pálya.
             * Ettől a régi route gombok még működjenek tovább,
             * csak az extended route-ok nem tudnak aktívvá válni.
             */
            console.warn("[RouteGraph] Could not check extended routes:", error);
            graph = null;
        }

        // --------------------------------------------------
        // 2. Régi, kézzel felépített RouteButtonök ellenőrzése
        // --------------------------------------------------
        const routeButtons = elems.filter(
            (elem: BaseElement) => elem instanceof RouteButtonElement
        ) as RouteButtonElement[];

        routeButtons.forEach(rb => {
            let active = true;

            rb.routeTurnouts.forEach(t => {
                const turnout = this.getElementById(t.turnoutId) as TrackTurnoutElement;

                if (turnout && turnout.turnoutClosed === t.closed) {
                    // oké
                } else {
                    active = false;
                }
            });

            rb.active = active;

            if (active && rb.routeTurnouts.length > 0) {
                const turnout = this.getElementById(
                    rb.routeTurnouts[0]!.turnoutId
                ) as TrackTurnoutElement;

                this.startWalk(turnout);
            }
        });

        // --------------------------------------------------
        // 3. Új, gráfos ExtendedRouteButtonök ellenőrzése
        // --------------------------------------------------
        const extendedRouteButtons = elems.filter(
            (elem: BaseElement) => elem instanceof ExtendedRouteButtonElement
        ) as ExtendedRouteButtonElement[];

        extendedRouteButtons.forEach(rb => {
            rb.active = false;

            if (!graph) {
                return;
            }

            if (!rb.fromSection || !rb.toSection) {
                return;
            }

            const solution = graph.findRoute(
                rb.fromSection,
                rb.toSection
            );

            if (!solution) {
                return;
            }

            const active = this.isExtendedRouteSolutionActive(solution);

            rb.active = active;

            if (active) {
                this.markExtendedRouteSolution(solution);
            }
        });
    }

    // checkRoutes33() {
    checkRoutes(existingGraph?: Graph | null): Graph | null {

        const checkRoutesStart = performance.now();

        const elems = this.getAllElements();

        // --------------------------------------------------
        // 1. Gráf felépítése az ExtendedRouteButtonök miatt
        //    A graph builder közben használja az isVisited mezőt!
        // --------------------------------------------------
        // let graph: Graph | null = null;

        // try {
        //     graph = this.processRoutes();
        // } catch (error) {
        //     console.warn("[RouteGraph] Could not check extended routes:", error);
        //     graph = null;
        // }
        let graph: Graph | null = existingGraph ?? null;

        try {
            if (!graph) {
                graph = this.processRoutes();
            }
        } catch (error) {
            console.warn("[RouteGraph] Could not check extended routes:", error);
            graph = null;
        }

        // --------------------------------------------------
        // FONTOS:
        // A gráfépítés után lenullázzuk a bejárási/színezési állapotot,
        // mert a RouteGraphBuilder összekoszolja az isVisited mezőket.
        // Innentől a régi RouteButton startWalk() tiszta lappal indul.
        // --------------------------------------------------
        elems.forEach((elem: BaseElement) => {
            elem.isVisited = false;
            elem.isRoute = false;
        });

        // --------------------------------------------------
        // 2. Régi, kézzel felépített RouteButtonök ellenőrzése
        // --------------------------------------------------
        const routeButtons = elems.filter(
            (elem: BaseElement) => elem instanceof RouteButtonElement
        ) as RouteButtonElement[];

        routeButtons.forEach(rb => {
            let active = true;

            rb.routeTurnouts.forEach(t => {
                const turnout = this.getElementById(t.turnoutId) as TrackTurnoutElement;

                if (turnout && turnout.turnoutClosed === t.closed) {
                    // oké
                } else {
                    active = false;
                }
            });

            rb.active = active;

            if (active && rb.routeTurnouts.length > 0) {
                const turnout = this.getElementById(
                    rb.routeTurnouts[0]!.turnoutId
                ) as TrackTurnoutElement;

                this.startWalk(turnout);
            }
        });

        // --------------------------------------------------
        // 3. Új, gráfos ExtendedRouteButtonök ellenőrzése
        // --------------------------------------------------
        const extendedRouteButtons = elems.filter(
            (elem: BaseElement) => elem instanceof ExtendedRouteButtonElement
        ) as ExtendedRouteButtonElement[];

        extendedRouteButtons.forEach(rb => {
            rb.active = false;

            if (!graph) {
                return;
            }

            if (!rb.fromSection || !rb.toSection) {
                return;
            }

            const solution = graph.findRoute(
                rb.fromSection,
                rb.toSection
            );

            if (!solution) {
                return;
            }

            const active = this.isExtendedRouteSolutionActive(solution);

            rb.active = active;

            if (active) {
                this.markExtendedRouteSolution(solution);
            }
        });
        console.log(
            `⏱️ checkRoutes total: ${(performance.now() - checkRoutesStart).toFixed(2)} ms`
        );
        return graph
    }


    startWalk(obj: BaseElement) {
        // Lehet meg kellene vizsgálni, hogy a következő elem az
        // a route váltóiban szerepel e?
        // vagy váltótól váltói kellene vizsgálódni??
        obj.isVisited = true;
        obj.isRoute = true

        var p1 = obj.getNextItemXy()
        var p2 = obj.getPrevItemXy()

        var next = this.getObjectXy(p1)
        if (next) {
            if (!next.isVisited && (obj.pos.isEqual(next.getNextItemXy()) || obj.pos.isEqual(next.getPrevItemXy()))) {
                next.isRoute = true
                this.startWalk(next)
            }
        }

        var prev = this.getObjectXy(p2)
        if (prev) {
            if (!prev.isVisited && (obj.pos.isEqual(prev.getNextItemXy()) || obj.pos.isEqual(prev.getPrevItemXy()))) {
                prev.isRoute = true
                this.startWalk(prev)
            }
        }
    }


    walkTrack(obj: BaseElement, section: number) {
        // Lehet meg kellene vizsgálni, hogy a következő elem az
        // a route váltóiban szerepel e?
        // vagy váltótól váltói kellene vizsgálódni??
        obj.isVisited = true;
        obj.isRoute = true
        obj.section = section;
        var p1 = obj.getNextItemXy()
        var p2 = obj.getPrevItemXy()

        var next = this.getObjectXy(p1)
        if (next && !(next instanceof TrackTurnoutElement)) {
            if (!next.isVisited && (obj.pos.isEqual(next.getNextItemXy()) || obj.pos.isEqual(next.getPrevItemXy()))) {
                next.isRoute = true
                this.walkTrack(next, section)
            }
        }

        var prev = this.getObjectXy(p2)
        if (prev && !(prev instanceof TrackTurnoutElement)) {
            if (!prev.isVisited && (obj.pos.isEqual(prev.getNextItemXy()) || obj.pos.isEqual(prev.getPrevItemXy()))) {
                prev.isRoute = true
                this.walkTrack(prev, section)
            }
        }
    }

    test() {
        let section = 1;
        this.resetRoutes();
        let t1 = this.getElementByName("T21") as TrackTurnoutElement;
        t1.isVisited = true;
        t1.isRoute = true;
        const entry = this.getObjectXy(t1.getConnections().div);
        if (entry) {
            this.walkTrack(entry, section)
        }

    }
    processRoutes2() {
        //this.test();

        let section = 1;
        const elems = this.getAllElements();
        const turnouts = elems.filter((elem: BaseElement) => isTurnoutElement(elem)) as TrackTurnoutElement[];
        turnouts.forEach(t => {
            this.resetRoutes();
            t.isVisited = true;
            t.isRoute = true;
            var connections = t.getConnections();

            const entry = this.getObjectXy(connections.entry);
            if (entry) {
                this.walkTrack(entry, section++)
            }

            const staright = this.getObjectXy(connections.straight);
            if (staright) {
                this.walkTrack(staright, section++)
            }

            const div = this.getObjectXy(connections.div);
            if (div) {
                this.walkTrack(div, section++)
            }

            //return;
            console.log("CONNECTIONS: ", connections)
        });

    }


    // ==================================================
    // GRAPH
    // ==================================================
    createRouteGraph(): Graph {
        //return new RouteGraphBuilder(this).build();
        return measure("Route graph build", () => {
            return new RouteGraphBuilder(this).build();
        });
    }
    processRoutes(): Graph {
        return this.createRouteGraph();
    }
    //     private addRouteEdgeIfMissing(
    //         graph: Graph,
    //         createdEdgeKeys: Set<string>,
    //         from: GraphNode,
    //         to: GraphNode,
    //         turnoutStates: TurnoutStateRequirement[]
    //     ) {
    //         const turnoutKey = turnoutStates
    //             .map(state => `${state.address}:${state.closed ? "C" : "T"}`)
    //             .join("|");

    //         const key = `${from.name}->${to.name}:${turnoutKey}`;

    //         if (createdEdgeKeys.has(key)) {
    //             return;
    //         }

    //         createdEdgeKeys.add(key);

    //         graph.addEdge(
    //             new Edge(from, to, turnoutStates)
    //         );
    //     }

    //     /**
    //      * Megmondja, hogy a turnout melyik csatlakozási oldala néz
    //      * a másik elemre.
    //      *
    //      * Itt most turnout -> turnout kapcsolatra használjuk.
    //      */
    //     private getTurnoutSideConnectedToElement(
    //         turnout: TrackTurnoutElement,
    //         other: BaseElement
    //     ): TurnoutSide | undefined {
    //         const connections = turnout.getConnections();

    //         if (connections.entry.isEqual(other.pos)) {
    //             return "entry";
    //         }

    //         if (connections.straight.isEqual(other.pos)) {
    //             return "straight";
    //         }

    //         if (connections.div.isEqual(other.pos)) {
    //             return "div";
    //         }

    //         return undefined;
    //     }


    //     /**
    //  * Megmondja, hogy egy váltó adott oldaláról belépve
    //  * mely oldalakra lehet kijutni, és milyen váltóállás kell hozzá.
    //  */
    //     private getAllowedTurnoutExits(
    //         turnout: TrackTurnoutElement,
    //         enteredSide: TurnoutSide
    //     ): {
    //         exitSide: TurnoutSide;
    //         turnoutState: TurnoutStateRequirement;
    //     }[] {
    //         const straightState: TurnoutStateRequirement = {
    //             address: turnout.turnoutAddress,
    //             closed: turnout.turnoutClosedValue,
    //         };

    //         const divState: TurnoutStateRequirement = {
    //             address: turnout.turnoutAddress,
    //             closed: !turnout.turnoutClosedValue,
    //         };

    //         switch (enteredSide) {
    //             case "entry":
    //                 return [
    //                     {
    //                         exitSide: "straight",
    //                         turnoutState: straightState,
    //                     },
    //                     {
    //                         exitSide: "div",
    //                         turnoutState: divState,
    //                     },
    //                 ];

    //             case "straight":
    //                 return [
    //                     {
    //                         exitSide: "entry",
    //                         turnoutState: straightState,
    //                     },
    //                 ];

    //             case "div":
    //                 return [
    //                     {
    //                         exitSide: "entry",
    //                         turnoutState: divState,
    //                     },
    //                 ];
    //         }
    //     }

    //     /**
    //      * Egy váltó egyik oldaláról belépve megkeresi,
    //      * mely valódi szakaszok érhetők el a váltón / váltóláncon keresztül.
    //      *
    //      * Példák:
    //      *
    //      * S1 -- T12 -- S2
    //      *   => S1 -> S2 [T12]
    //      *
    //      * S1 -- T12 -- T13 -- S2
    //      *   => S1 -> S2 [T12, T13]
    //      */
    //     private walkTurnoutChainToSections(
    //         graph: Graph,
    //         sectionNodes: Map<number, GraphNode>,
    //         createdEdgeKeys: Set<string>,

    //         fromNode: GraphNode,

    //         turnout: TrackTurnoutElement,
    //         enteredSide: TurnoutSide,

    //         turnoutStates: TurnoutStateRequirement[],
    //         visitedTurnoutSides: Set<string>
    //     ) {
    //         const visitKey = `${turnout.id}:${enteredSide}`;

    //         // Védelem végtelen váltó-lánc / kör ellen
    //         if (visitedTurnoutSides.has(visitKey)) {
    //             return;
    //         }

    //         const nextVisited = new Set(visitedTurnoutSides);
    //         nextVisited.add(visitKey);

    //         const exits = this.getAllowedTurnoutExits(turnout, enteredSide);

    //         for (const exit of exits) {
    //             const nextStates = [
    //                 ...turnoutStates,
    //                 exit.turnoutState,
    //             ];

    //             const connections = turnout.getConnections();
    //             const exitPos = connections[exit.exitSide];

    //             const nextElem = this.getObjectXy(exitPos);

    //             if (!nextElem) {
    //                 continue;
    //             }

    //             // ============================================================
    //             // 1. Valódi szakaszhoz értünk
    //             // ============================================================
    //             if (!(nextElem instanceof TrackTurnoutElement)) {
    //                 if (!nextElem.section) {
    //                     continue;
    //                 }

    //                 const toNode = sectionNodes.get(nextElem.section);

    //                 if (!toNode) {
    //                     continue;
    //                 }

    //                 if (toNode === fromNode) {
    //                     continue;
    //                 }

    //                 this.addRouteEdgeIfMissing(
    //                     graph,
    //                     createdEdgeKeys,
    //                     fromNode,
    //                     toNode,
    //                     nextStates
    //                 );

    //                 continue;
    //             }

    //             // ============================================================
    //             // 2. Közvetlenül másik váltóhoz értünk
    //             //    -> megkeressük, annak melyik oldalán léptünk be
    //             //    -> rekurzívan megyünk tovább
    //             // ============================================================
    //             const nextTurnout = nextElem;

    //             const nextEnteredSide = this.getTurnoutSideConnectedToElement(
    //                 nextTurnout,
    //                 turnout
    //             );

    //             if (!nextEnteredSide) {
    //                 continue;
    //             }

    //             this.walkTurnoutChainToSections(
    //                 graph,
    //                 sectionNodes,
    //                 createdEdgeKeys,
    //                 fromNode,
    //                 nextTurnout,
    //                 nextEnteredSide,
    //                 nextStates,
    //                 nextVisited
    //             );
    //         }
    //     }

    //     processRoutes22(): Graph {
    //         const graph = new Graph();

    //         // section szám -> GraphNode
    //         const sectionNodes = new Map<number, GraphNode>();

    //         // Duplikált edge-ek ellen
    //         const createdEdgeKeys = new Set<string>();

    //         this.resetRoutes();

    //         let section = 1;

    //         const elems = this.getAllElements();

    //         const turnouts = elems.filter(
    //             (elem: BaseElement) => isTurnoutElement(elem)
    //         ) as TrackTurnoutElement[];

    //         // ============================================================
    //         // 1. LÉPÉS:
    //         // Valódi fizikai szakaszok feltárása.
    //         //
    //         // Ezek lesznek a gráf node-jai:
    //         // S1, S2, S3...
    //         // ============================================================
    //         for (const turnout of turnouts) {
    //             turnout.isVisited = true;
    //             turnout.isRoute = true;

    //             const connections = turnout.getConnections();

    //             const connectionPositions = [
    //                 connections.entry,
    //                 connections.straight,
    //                 connections.div,
    //             ];

    //             for (const pos of connectionPositions) {
    //                 const firstElem = this.getObjectXy(pos);

    //                 if (!firstElem) {
    //                     continue;
    //                 }

    //                 // Ha közvetlenül másik váltó van ott,
    //                 // abból NEM készítünk szakaszt.
    //                 // Majd edge-generáláskor átmegyünk rajta.
    //                 if (firstElem instanceof TrackTurnoutElement) {
    //                     continue;
    //                 }

    //                 // Ezt a szakaszt már feltártuk
    //                 if (firstElem.isVisited) {
    //                     continue;
    //                 }

    //                 const sectionElements: BaseElement[] = [];

    //                 this.walkTrackSection(
    //                     firstElem,
    //                     section,
    //                     sectionElements
    //                 );

    //                 const node = this.createSectionGraphNode(
    //                     section,
    //                     sectionElements
    //                 );

    //                 graph.addNode(node);
    //                 sectionNodes.set(section, node);

    //                 section++;
    //             }
    //         }

    //         // ============================================================
    //         // 2. LÉPÉS:
    //         // Minden valódi szakasztól elindulunk a mellette lévő váltóba,
    //         // majd a váltókon keresztül addig megyünk,
    //         // amíg egy másik valódi szakaszhoz nem érünk.
    //         //
    //         // Így:
    //         //
    //         // S1 -- T12 -- S2
    //         //   => S1 -> S2 [T12]
    //         //
    //         // S1 -- T12 -- T13 -- S2
    //         //   => S1 -> S2 [T12, T13]
    //         // ============================================================
    //         for (const turnout of turnouts) {
    //             const connections = turnout.getConnections();

    //             const turnoutSides: TurnoutSide[] = [
    //                 "entry",
    //                 "straight",
    //                 "div",
    //             ];

    //             for (const side of turnoutSides) {
    //                 const pos = connections[side];
    //                 const elem = this.getObjectXy(pos);

    //                 // Edge-et csak VALÓDI szakaszból indítunk
    //                 if (!elem || elem instanceof TrackTurnoutElement) {
    //                     continue;
    //                 }

    //                 if (!elem.section) {
    //                     continue;
    //                 }

    //                 const fromNode = sectionNodes.get(elem.section);

    //                 if (!fromNode) {
    //                     continue;
    //                 }

    //                 // Innen elindulunk a turnout belsején át
    //                 // és megkeressük, milyen szakaszok érhetők el.
    //                 this.walkTurnoutChainToSections(
    //                     graph,
    //                     sectionNodes,
    //                     createdEdgeKeys,
    //                     fromNode,
    //                     turnout,
    //                     side,
    //                     [],
    //                     new Set<string>()
    //                 );
    //             }
    //         }

    //         console.log("GENERATED SECTION GRAPH:", graph);

    //         return graph;
    //     }


    //     /**
    //      * Egy valódi fizikai pályaszakaszt jár be.
    //      *
    //      * Addig megy, amíg:
    //      * - nincs tovább sín
    //      * - vagy váltóhoz ér
    //      *
    //      * Az összes bejárt elem ugyanazt a section számot kapja.
    //      */
    //     private walkTrackSection(
    //         obj: BaseElement,
    //         section: number,
    //         sectionElements: BaseElement[]
    //     ) {
    //         obj.isVisited = true;
    //         obj.isRoute = true;
    //         obj.section = section;

    //         sectionElements.push(obj);

    //         const p1 = obj.getNextItemXy();
    //         const p2 = obj.getPrevItemXy();

    //         const next = this.getObjectXy(p1);

    //         if (next && !(next instanceof TrackTurnoutElement)) {
    //             const isConnectedBack =
    //                 obj.pos.isEqual(next.getNextItemXy()) ||
    //                 obj.pos.isEqual(next.getPrevItemXy());

    //             if (!next.isVisited && isConnectedBack) {
    //                 this.walkTrackSection(next, section, sectionElements);
    //             }
    //         }

    //         const prev = this.getObjectXy(p2);

    //         if (prev && !(prev instanceof TrackTurnoutElement)) {
    //             const isConnectedBack =
    //                 obj.pos.isEqual(prev.getNextItemXy()) ||
    //                 obj.pos.isEqual(prev.getPrevItemXy());

    //             if (!prev.isVisited && isConnectedBack) {
    //                 this.walkTrackSection(prev, section, sectionElements);
    //             }
    //         }
    //     }


    //     /**
    //      * Egy valódi szakaszból készít gráf node-ot.
    //      */
    //     private createSectionGraphNode(
    //         section: number,
    //         sectionElements: BaseElement[]
    //     ): GraphNode {
    //         let x = 0;
    //         let y = 0;

    //         for (const elem of sectionElements) {
    //             x += elem.pos.x;
    //             y += elem.pos.y;
    //         }

    //         if (sectionElements.length > 0) {
    //             x /= sectionElements.length;
    //             y /= sectionElements.length;
    //         }

    //         return new GraphNode(`S${section}`, x, y);
    //     }

}