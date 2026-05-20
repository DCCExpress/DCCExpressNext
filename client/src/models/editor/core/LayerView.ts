import type {
  DrawOptions,
} from "../types/EditorTypes";
import {
  Layer as CommonLayer,
  type LayerId,
  type LayerOptions,
} from "../../../../../common/src/layout/model/Layer";
import {
  BaseElementView,
} from "./BaseElementView";

export type {
  LayerId,
  LayerOptions,
};

/**
 * Kliensoldali réteg-view.
 *
 * A domain rétegkezelés a common Layerben él,
 * ez csak a rajzolási felületet adja hozzá.
 */
export class LayerView
  extends CommonLayer<BaseElementView> {
  constructor(
    id: LayerId,
    name: string,
    options?: LayerOptions
  ) {
    super(id, name, options);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    options: DrawOptions
  ): void {
    this.elements.forEach(
      element => element.draw(ctx, options)
    );
  }

  drawMarked(ctx: CanvasRenderingContext2D): void {
    this.elements.forEach(
      element => element.drawMarked(ctx)
    );
  }
}
