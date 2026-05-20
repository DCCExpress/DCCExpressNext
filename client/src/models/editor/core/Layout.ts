import { Loco } from "../../../../../common/src/types";
import { showWarningMessage } from "../../../helpers";
import { BlockElementView } from "../elements/BlockElementView";
import { RouteButtonElementView } from "../elements/RouteButtonElementView";
import { TrackStraightElementView } from "../elements/TrackStraightElementView";
import { TrackTurnoutLeftElementView } from "../elements/TrackTurnoutLeftElementView";
import { TrackTurnoutRightElementView } from "../elements/TrackTurnoutRightElementView";
import { DrawOptions } from "../types/EditorTypes";
import { BaseElement } from "./BaseElement";
import { ElementFactory } from "./ElementFactory";
import type {
    Graph,
} from "../../../../../common/src/railway/graph";

import type {
    RouteGraphTrackRuntimeDto,
} from "../../../../../common/src/railway/routeGraphDto";

import { Layer, LayerId } from "./Layer";
import { Point } from "./Rect";
import {
    TrackElement as DomainTrackElement,
} from "../../../../../common/src/layout/model/TrackElement";

type LayoutTrackElement =
    BaseElement &
    DomainTrackElement;

export type RouteTurnoutElement =
    | TrackTurnoutLeftElementView
    | TrackTurnoutRightElementView;

export function isTurnoutElement(
    el: BaseElement | null | undefined
): el is RouteTurnoutElement {
    return (
        el instanceof TrackTurnoutLeftElementView ||
        el instanceof TrackTurnoutRightElementView
    );
}

export type CheckRoutesResult = {
    graph: Graph | null;
    error: string | null;
};

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

        const track = new TrackStraightElementView(10, 10)
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
            if (el instanceof RouteButtonElementView) {
                const rb = el as RouteButtonElementView;
                for (const t of rb.routeTurnouts) {
                    if (t.turnoutId === element.id) {
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

    public getTrackElements(): LayoutTrackElement[] {
        return [
            ...this.track.elements as LayoutTrackElement[],
            ...this.blocks.elements as LayoutTrackElement[],
            ...this.signals.elements as LayoutTrackElement[],
            ...this.sensors.elements as LayoutTrackElement[],
        ];
    }


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
        return l1?.name == l2?.name;
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

    setBlockLocoAddress(selectedBlock: BlockElementView, loco: Loco) {
        const elems = this.getAllElements();
        elems.forEach((elem: BaseElement) => {
            if (elem instanceof BlockElementView) {
                const block = elem as BlockElementView;
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
        const elems = this.getTrackElements();
        elems.forEach((elem: LayoutTrackElement) => {
            elem.isVisited = false;
            elem.isRoute = false;
            elem.section = 0;
        })
    }
    checkRoutes(existingGraph?: Graph | null): CheckRoutesResult {

        const elems = this.getTrackElements();

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

        const graph: Graph | null = existingGraph ?? null;
        const routeGraphError: string | null = null;


        // --------------------------------------------------
        // FONTOS:
        // A gráfépítés után lenullázzuk a bejárási/színezési állapotot,
        // mert a RouteGraphBuilder összekoszolja az isVisited mezőket.
        // Innentől a régi RouteButton startWalk() tiszta lappal indul.
        // --------------------------------------------------
        elems.forEach((elem: LayoutTrackElement) => {
            elem.isVisited = false;
            elem.isRoute = false;
        });

        // --------------------------------------------------
        // 2. Régi, kézzel felépített RouteButtonök ellenőrzése
        // --------------------------------------------------
        const belems = this.getAllElements();
        const routeButtons = belems.filter(
            (elem: BaseElement) => elem instanceof RouteButtonElementView
        ) as RouteButtonElementView[];

        routeButtons.forEach(rb => {
            let active = true;

            rb.routeTurnouts.forEach(t => {
                const turnout = this.getElementById(t.turnoutId);

                if (
                    isTurnoutElement(turnout) &&
                    turnout.turnoutClosed === t.closed
                ) {
                    // oké
                } else {
                    active = false;
                }
            });

            rb.active = active;

            if (active && rb.routeTurnouts.length > 0) {
                const turnout = this.getElementById(
                    rb.routeTurnouts[0]!.turnoutId
                );

                if (isTurnoutElement(turnout)) {
                    this.startWalk(turnout);
                }
            }
        });

        // --------------------------------------------------
        // 3. ExtendedRouteButtonök
        // --------------------------------------------------
        //
        // FONTOS:
        // Az ExtendedRouteButton aktív állapota NEM attól függ,
        // hogy a route-hoz tartozó váltók éppen megfelelő állásban vannak-e.
        //
        // Az aktív állapotot kizárólag a szerveroldali
        // route reservation események kezelik:
        //   - routeReservationChanged { busy: true }
        //   - routeReservationChanged { busy: false }
        //
        // Emiatt itt szándékosan nem állítunk:
        //   - rb.active értéket
        //   - elem.isRoute értéket
        //

        // extendedRouteButtons.forEach(rb => {
        //     rb.active = false;

        //     if (!graph) {
        //         return;
        //     }

        //     if (!rb.fromBlockId || !rb.toBlockId) {
        //         return;
        //     }

        //     const solution = graph.findRouteBetweenBlocks(
        //         rb.fromBlockId,
        //         rb.toBlockId
        //     );
        //     if (!solution) {
        //         return;
        //     }

        //     const active = this.isExtendedRouteSolutionActive(solution);

        //     rb.active = active;

        //     if (active) {
        //         this.markExtendedRouteSolution(solution);
        //     }
        // });
        return {
            graph,
            error: routeGraphError,
        };
    }


    startWalk(obj: LayoutTrackElement) {
        // Lehet meg kellene vizsgálni, hogy a következő elem az
        // a route váltóiban szerepel e?
        // vagy váltótól váltói kellene vizsgálódni??
        obj.isVisited = true;
        obj.isRoute = true

        var p1 = obj.getNextItemXy()
        var p2 = obj.getPrevItemXy()

        var next = this.getObjectXy(p1) as LayoutTrackElement
        if (next) {
            if (!next.isVisited && (obj.pos.isEqual(next.getNextItemXy()) || obj.pos.isEqual(next.getPrevItemXy()))) {
                next.isRoute = true
                this.startWalk(next)
            }
        }

        var prev = this.getObjectXy(p2) as LayoutTrackElement
        if (prev) {
            if (!prev.isVisited && (obj.pos.isEqual(prev.getNextItemXy()) || obj.pos.isEqual(prev.getPrevItemXy()))) {
                prev.isRoute = true
                this.startWalk(prev)
            }
        }
    }


    walkTrack(obj: LayoutTrackElement, section: number) {
        // Lehet meg kellene vizsgálni, hogy a következő elem az
        // a route váltóiban szerepel e?
        // vagy váltótól váltói kellene vizsgálódni??
        obj.isVisited = true;
        obj.isRoute = true
        obj.section = section;
        var p1 = obj.getNextItemXy()
        var p2 = obj.getPrevItemXy()

        var next = this.getObjectXy(p1) as LayoutTrackElement;
        if (next && !isTurnoutElement(next)) {
            if (!next.isVisited && (obj.pos.isEqual(next.getNextItemXy()) || obj.pos.isEqual(next.getPrevItemXy()))) {
                next.isRoute = true
                this.walkTrack(next, section)
            }
        }

        var prev = this.getObjectXy(p2) as LayoutTrackElement;
        if (prev && !isTurnoutElement(prev)) {
            if (!prev.isVisited && (obj.pos.isEqual(prev.getNextItemXy()) || obj.pos.isEqual(prev.getPrevItemXy()))) {
                prev.isRoute = true
                this.walkTrack(prev, section)
            }
        }
    }

    applyRouteGraphRuntime(
        trackRuntime: RouteGraphTrackRuntimeDto[] | null | undefined
    ): void {
        const trackElements =
            this.getTrackElements();

        for (const elem of trackElements) {
            elem.section = 0;
            elem.travelDirection = "unknown";
        }

        if (!trackRuntime) {
            return;
        }

        const elementsById = new Map(
            trackElements.map(elem => [elem.id, elem])
        );

        for (const runtime of trackRuntime) {
            const elem =
                elementsById.get(runtime.id);

            if (!elem) {
                continue;
            }

            elem.section =
                runtime.section;

            elem.travelDirection =
                runtime.travelDirection;
        }

        /**
         * A blokk irányjelzője ne a blokk saját rotation értékéből
         * próbáljon következtetni, hanem a blokk közepén fekvő
         * valódi sín elem világkoordinátás forward irányából.
         */
        const physicalTrackElements =
            this.track.elements.filter(
                (elem): elem is LayoutTrackElement =>
                    elem instanceof DomainTrackElement
            );

        const normalizeRotation = (angle: number): number => {
            const result = angle % 360;
            return result < 0 ? result + 360 : result;
        };

        for (const elem of trackElements) {
            if (!(elem instanceof BlockElementView)) {
                continue;
            }

            const centerTrack =
                physicalTrackElements.find(track =>
                    track.x === elem.x &&
                    track.y === elem.y
                );

            if (
                !centerTrack ||
                centerTrack.travelDirection === "unknown"
            ) {
                elem.runtimeForwardRotation = null;
                continue;
            }

            elem.runtimeForwardRotation =
                normalizeRotation(
                    centerTrack.travelDirection === "forward"
                        ? centerTrack.rotation
                        : centerTrack.rotation + 180
                );
        }
    }

}