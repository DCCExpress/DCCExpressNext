import {
  BaseElement as CommonBaseElement,
} from "../../../../../common/src/layout/model/BaseElement";
import {
  beginElementDraw,
  degreesToRadians,
  drawElementBounds,
  drawElementIconPath,
  drawElementMarked,
  drawElementNeighbors,
  drawElementOccupied,
  drawElementSelection,
  endElementDraw,
  getBaseEditableProperties,
  getBaseHelp,
  getCenterX,
  getCenterY,
  getGridSizeX,
  getGridSizeY,
  getHeight,
  getPosBottom,
  getPosLeft,
  getPosRight,
  getPosTop,
  getPositionX,
  getPositionY,
  getWidth,
  noopDraw,
  noopFromJSON,
  noopMouseHandler,
} from "./view/support/BaseElementViewSupport";
import type {
  DrawOptions,
  IBaseElement,
} from "../types/EditorTypes";
import type {
  IEditableProperty,
} from "../elements/PropertyDescriptor";

/**
 * Kliensoldali editor/UI alap elem mixinek nélkül.
 *
 * A domain logika a common BaseElementben él,
 * a közös view/editor viselkedés pedig support helper függvényekre delegál.
 */
export abstract class BaseElementView
  extends CommonBaseElement
  implements IBaseElement {
  selected: boolean = false;
  marked: boolean = false;
  enabled: boolean = true;
  alpha: number = 0.5;
  debug: boolean = false;

  constructor(x: number, y: number) {
    super(x, y);
  }

  get GridSizeX(): number {
    return getGridSizeX();
  }

  get GridSizeY(): number {
    return getGridSizeY();
  }

  get PositionX(): number {
    return getPositionX(this);
  }

  get PositionY(): number {
    return getPositionY(this);
  }

  get posLeft(): number {
    return getPosLeft(this);
  }

  get posRight(): number {
    return getPosRight(this);
  }

  get posTop(): number {
    return getPosTop(this);
  }

  get posBottom(): number {
    return getPosBottom(this);
  }

  get centerX(): number {
    return getCenterX(this);
  }

  get centerY(): number {
    return getCenterY(this);
  }

  get width(): number {
    return getWidth(this);
  }

  get height(): number {
    return getHeight(this);
  }

  get TrackWidth7(): number {
    return 7;
  }

  get TrackWidth3(): number {
    return 3;
  }

  get TrackPrimaryColor(): string {
    return "black";
  }

  beginDraw(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    beginElementDraw(this, ctx, options);
  }

  endDraw(ctx: CanvasRenderingContext2D): void {
    endElementDraw(this, ctx);
  }

  drawIconPath(
    ctx: CanvasRenderingContext2D,
    path: string,
    x: number,
    y: number,
    size: number,
    color = "black",
    strokeWidth = 2
  ): void {
    drawElementIconPath(
      ctx,
      path,
      x,
      y,
      size,
      color,
      strokeWidth
    );
  }

  drawMarked(ctx: CanvasRenderingContext2D): void {
    drawElementMarked(this, ctx);
  }

  drawOccupied(ctx: CanvasRenderingContext2D): void {
    drawElementOccupied(this, ctx);
  }

  drawSelection(ctx: CanvasRenderingContext2D): void {
    drawElementSelection(this, ctx);
  }

  drawEnabled(_ctx: CanvasRenderingContext2D): void {
    return;
  }

  mouseDown(ev: MouseEvent): void {
    noopMouseHandler(ev);
  }

  mouseUp(ev: MouseEvent): void {
    noopMouseHandler(ev);
  }

  fromJSON(data: IBaseElement): void {
    noopFromJSON(data);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    noopDraw(ctx, options);
  }

  degreesToRadians(degrees: number): number {
    return degreesToRadians(degrees);
  }

  drawBounds(ctx: CanvasRenderingContext2D): void {
    drawElementBounds(this, ctx);
  }

  drawNeighbors(ctx: CanvasRenderingContext2D): void {
    drawElementNeighbors(this, ctx);
  }

  getEditableProperties(): IEditableProperty[] {
    return getBaseEditableProperties();
  }

  getHelp(): string {
    return getBaseHelp();
  }

  abstract clone(): BaseElementView;
}
