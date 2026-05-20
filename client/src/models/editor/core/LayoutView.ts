import type {
  Loco,
} from "../../../../../common/src/types";
import {
  showWarningMessage,
} from "../../../helpers";
import {
  BlockElementView,
} from "../elements/BlockElementView";
import {
  RouteButtonElementView,
} from "../elements/RouteButtonElementView";
import {
  TrackStraightElementView,
} from "../elements/TrackStraightElementView";
import {
  TrackTurnoutLeftElementView,
} from "../elements/TrackTurnoutLeftElementView";
import {
  TrackTurnoutRightElementView,
} from "../elements/TrackTurnoutRightElementView";
import type {
  DrawOptions,
} from "../types/EditorTypes";
import {
  BaseElementView,
} from "./BaseElementView";
import {
  ElementFactory,
} from "./ElementFactory";
import type {
  Graph,
} from "../../../../../common/src/railway/graph";
import type {
  RouteGraphTrackRuntimeDto,
} from "../../../../../common/src/railway/routeGraphDto";
import {
  Layout as CommonLayout,
} from "../../../../../common/src/layout/model/Layout";
import {
  TrackElement as DomainTrackElement,
} from "../../../../../common/src/layout/model/TrackElement";
import {
  LayerView,
  type LayerId,
} from "./LayerView";

type LayoutTrackElement =
  BaseElementView &
  DomainTrackElement;

export type RouteTurnoutElement =
  | TrackTurnoutLeftElementView
  | TrackTurnoutRightElementView;

export function isTurnoutElement(
  element: BaseElementView | null | undefined
): element is RouteTurnoutElement {
  return (
    element instanceof TrackTurnoutLeftElementView ||
    element instanceof TrackTurnoutRightElementView
  );
}

export type CheckRoutesResult = {
  graph: Graph | null;
  error: string | null;
};

/**
 * Kliensoldali layout-view.
 *
 * A layer/element domain kezelés a common Layoutben él.
 * Itt csak az editor, rajzolás és kliens runtime marad.
 */
export class LayoutView
  extends CommonLayout<BaseElementView, LayerView> {
  constructor() {
    super(
      (id, name, options) =>
        new LayerView(id, name, options)
    );

    const track =
      new TrackStraightElementView(10, 10);

    track.id = "track1";
    this.track.elements.push(track);
  }

  override removeElement(
    element: BaseElementView
  ): void {
    const elements = this.getAllElements();

    for (const current of elements) {
      if (!(current instanceof RouteButtonElementView)) {
        continue;
      }

      for (const turnout of current.routeTurnouts) {
        if (turnout.turnoutId !== element.id) {
          continue;
        }

        current.removeTurnout(element.id);

        showWarningMessage(
          current.name,
          " A váltó törlésre került, ezért a hozzá tartozó útvonal gombból is eltávolításra került."
        );

        break;
      }
    }

    super.removeElement(element);
  }

  public getTrackElements(): LayoutTrackElement[] {
    return [
      ...this.track.elements as LayoutTrackElement[],
      ...this.blocks.elements as LayoutTrackElement[],
      ...this.signals.elements as LayoutTrackElement[],
      ...this.sensors.elements as LayoutTrackElement[],
    ];
  }

  getSelected(): BaseElementView | null {
    for (const layer of [
      this.track,
      this.blocks,
      this.signals,
      this.sensors,
      this.buildings,
    ]) {
      for (const element of layer.elements) {
        if (element.selected) {
          return element;
        }
      }
    }

    return null;
  }

  setSelected(element: BaseElementView): void {
    this.unselectAll();

    for (const layer of [
      this.track,
      this.blocks,
      this.signals,
      this.sensors,
      this.buildings,
    ]) {
      for (const current of layer.elements) {
        if (current.id === element.id) {
          current.selected = true;
        }
      }
    }
  }

  unselectAll(): void {
    for (const layer of [
      this.track,
      this.blocks,
      this.signals,
      this.sensors,
      this.buildings,
    ]) {
      for (const element of layer.elements) {
        element.selected = false;
      }
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    options: DrawOptions
  ): void {
    this.track.draw(ctx, options);
    this.sensors.draw(ctx, options);
    this.signals.draw(ctx, options);
    this.blocks.draw(ctx, options);
    this.buildings.draw(ctx, options);

    this.getAllElements().forEach(
      element => element.drawMarked(ctx)
    );
  }

  setBlockLocoAddress(
    selectedBlock: BlockElementView,
    loco: Loco
  ): void {
    const elements = this.getAllElements();

    for (const element of elements) {
      if (!(element instanceof BlockElementView)) {
        continue;
      }

      if (element.locoAddress === loco.address) {
        element.locoAddress = 0;
      }
    }

    selectedBlock.locoAddress = loco.address;
  }

  static fromJSON(data: any): LayoutView {
    const layout = new LayoutView();

    layout.gridSize =
      data.gridSize ?? 40;

    if (data._activeLayerId) {
      layout.activeLayerId =
        data._activeLayerId;
    }

    if (!Array.isArray(data.layers)) {
      return layout;
    }

    for (const layerData of data.layers) {
      const layer =
        layout.getLayer(layerData.id as LayerId);

      if (!layer) {
        continue;
      }

      layer.name =
        layerData.name ?? layer.name;

      layer.visible =
        layerData.visible ?? true;

      layer.locked =
        layerData.locked ?? false;

      layer.elements =
        ElementFactory.createMany(
          layerData.elements ?? []
        );
    }

    return layout;
  }

  resetRoutes(): void {
    const elements =
      this.getTrackElements();

    elements.forEach(
      (element: LayoutTrackElement) => {
        element.isVisited = false;
        element.isRoute = false;
        element.section = 0;
      }
    );
  }

  checkRoutes(
    existingGraph?: Graph | null
  ): CheckRoutesResult {
    const elements =
      this.getTrackElements();

    const graph: Graph | null =
      existingGraph ?? null;

    const routeGraphError: string | null =
      null;

    elements.forEach(
      (element: LayoutTrackElement) => {
        element.isVisited = false;
        element.isRoute = false;
      }
    );

    const routeButtons =
      this.getAllElements().filter(
        (element: BaseElementView) =>
          element instanceof RouteButtonElementView
      ) as RouteButtonElementView[];

    routeButtons.forEach(routeButton => {
      let active = true;

      routeButton.routeTurnouts.forEach(turnoutRef => {
        const turnout =
          this.getElementById(turnoutRef.turnoutId);

        if (
          isTurnoutElement(turnout) &&
          turnout.turnoutClosed === turnoutRef.closed
        ) {
          return;
        }

        active = false;
      });

      routeButton.active = active;

      if (
        active &&
        routeButton.routeTurnouts.length > 0
      ) {
        const turnout = this.getElementById(
          routeButton.routeTurnouts[0]!.turnoutId
        );

        if (isTurnoutElement(turnout)) {
          this.startWalk(turnout);
        }
      }
    });

    return {
      graph,
      error: routeGraphError,
    };
  }

  startWalk(obj: LayoutTrackElement): void {
    obj.isVisited = true;
    obj.isRoute = true;

    const nextPosition =
      obj.getNextItemXy();

    const prevPosition =
      obj.getPrevItemXy();

    const next =
      this.getObjectXy(nextPosition) as LayoutTrackElement;

    if (
      next &&
      !next.isVisited &&
      (
        obj.pos.isEqual(next.getNextItemXy()) ||
        obj.pos.isEqual(next.getPrevItemXy())
      )
    ) {
      next.isRoute = true;
      this.startWalk(next);
    }

    const prev =
      this.getObjectXy(prevPosition) as LayoutTrackElement;

    if (
      prev &&
      !prev.isVisited &&
      (
        obj.pos.isEqual(prev.getNextItemXy()) ||
        obj.pos.isEqual(prev.getPrevItemXy())
      )
    ) {
      prev.isRoute = true;
      this.startWalk(prev);
    }
  }

  walkTrack(
    obj: LayoutTrackElement,
    section: number
  ): void {
    obj.isVisited = true;
    obj.isRoute = true;
    obj.section = section;

    const nextPosition =
      obj.getNextItemXy();

    const prevPosition =
      obj.getPrevItemXy();

    const next =
      this.getObjectXy(nextPosition) as LayoutTrackElement;

    if (
      next &&
      !isTurnoutElement(next) &&
      !next.isVisited &&
      (
        obj.pos.isEqual(next.getNextItemXy()) ||
        obj.pos.isEqual(next.getPrevItemXy())
      )
    ) {
      next.isRoute = true;
      this.walkTrack(next, section);
    }

    const prev =
      this.getObjectXy(prevPosition) as LayoutTrackElement;

    if (
      prev &&
      !isTurnoutElement(prev) &&
      !prev.isVisited &&
      (
        obj.pos.isEqual(prev.getNextItemXy()) ||
        obj.pos.isEqual(prev.getPrevItemXy())
      )
    ) {
      prev.isRoute = true;
      this.walkTrack(prev, section);
    }
  }

  applyRouteGraphRuntime(
    trackRuntime:
      RouteGraphTrackRuntimeDto[] |
      null |
      undefined
  ): void {
    const trackElements =
      this.getTrackElements();

    for (const element of trackElements) {
      element.section = 0;
      element.travelDirection = "unknown";
    }

    if (!trackRuntime) {
      return;
    }

    const elementsById = new Map(
      trackElements.map(element => [
        element.id,
        element,
      ])
    );

    for (const runtime of trackRuntime) {
      const element =
        elementsById.get(runtime.id);

      if (!element) {
        continue;
      }

      element.section =
        runtime.section;

      element.travelDirection =
        runtime.travelDirection;
    }

    const physicalTrackElements =
      this.track.elements.filter(
        (element): element is LayoutTrackElement =>
          element instanceof DomainTrackElement
      );

    const normalizeRotation = (
      angle: number
    ): number => {
      const result = angle % 360;
      return result < 0 ? result + 360 : result;
    };

    for (const element of trackElements) {
      if (!(element instanceof BlockElementView)) {
        continue;
      }

      const centerTrack =
        physicalTrackElements.find(track =>
          track.x === element.x &&
          track.y === element.y
        );

      if (
        !centerTrack ||
        centerTrack.travelDirection === "unknown"
      ) {
        element.runtimeForwardRotation = null;
        continue;
      }

      element.runtimeForwardRotation =
        normalizeRotation(
          centerTrack.travelDirection === "forward"
            ? centerTrack.rotation
            : centerTrack.rotation + 180
        );
    }
  }
}
