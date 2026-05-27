import type {
  BaseElement as CommonBaseElement,
} from "../../../../../../../common/src/layout/model/BaseElement";
import type {
  DrawOptions,
  IBaseElement,
} from "../../../types/EditorTypes";
import type {
  IEditableProperty,
} from "../../../elements/PropertyDescriptor";
import {
  sampleLayout,
} from "../../../sample/sampleLayout";

export type BaseElementViewSupportTarget =
  CommonBaseElement & {
    selected: boolean;
    marked: boolean;
    enabled: boolean;
    alpha: number;
    debug: boolean;

    readonly GridSizeX: number;
    readonly GridSizeY: number;
    readonly PositionX: number;
    readonly PositionY: number;
    readonly posLeft: number;
    readonly posRight: number;
    readonly posTop: number;
    readonly posBottom: number;
    readonly centerX: number;
    readonly centerY: number;
    readonly width: number;
    readonly height: number;

    drawEnabled(ctx: CanvasRenderingContext2D): void;
    drawNeighbors(ctx: CanvasRenderingContext2D): void;
    beginDraw(
      ctx: CanvasRenderingContext2D,
      options?: DrawOptions
    ): void;
    endDraw(ctx: CanvasRenderingContext2D): void;
  };

export function getGridSizeX(): number {
  return sampleLayout.settings.gridSize;
}

export function getGridSizeY(): number {
  return sampleLayout.settings.gridSize;
}

export function getPositionX(
  element: CommonBaseElement
): number {
  return element.x * getGridSizeX();
}

export function getPositionY(
  element: CommonBaseElement
): number {
  return element.y * getGridSizeY();
}

export function getPosLeft(
  element: CommonBaseElement
): number {
  return element.x * getGridSizeX();
}

export function getPosRight(
  element: CommonBaseElement
): number {
  return (
    element.x * getGridSizeX() +
    element.w * getGridSizeX()
  );
}

export function getPosTop(
  element: CommonBaseElement
): number {
  return element.y * getGridSizeY();
}

export function getPosBottom(
  element: CommonBaseElement
): number {
  return (
    element.y * getGridSizeY() +
    element.h * getGridSizeY()
  );
}

export function getCenterX(
  element: CommonBaseElement
): number {
  return (
    element.x * getGridSizeX() +
    element.w * getGridSizeX() / 2
  );
}

export function getCenterY(
  element: CommonBaseElement
): number {
  return (
    element.y * getGridSizeY() +
    element.h * getGridSizeY() / 2
  );
}

export function getWidth(
  element: BaseElementViewSupportTarget
): number {
  return element.posRight - element.posLeft;
}

export function getHeight(
  element: BaseElementViewSupportTarget
): number {
  return element.posBottom - element.posTop;
}

export function beginElementDraw(
  element: CommonBaseElement,
  ctx: CanvasRenderingContext2D,
  options?: DrawOptions
): void {
  const scale = options?.scale ?? 1;
  const offsetX = options?.offsetX ?? 0;
  const offsetY = options?.offsetY ?? 0;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  if (options?.ghost) {
    ctx.globalAlpha = 0.5;
  }
}

export function endElementDraw(
  element: BaseElementViewSupportTarget,
  ctx: CanvasRenderingContext2D
): void {
  ctx.restore();

  if (element.debug) {
    element.drawNeighbors(ctx);
  }
}

export function drawElementIconPath(
  ctx: CanvasRenderingContext2D,
  path: string,
  x: number,
  y: number,
  size: number,
  color = "black",
  strokeWidth = 2
): void {
  ctx.save();

  const scale = size / 24;

  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const iconPath = new Path2D(path);
  ctx.stroke(iconPath);

  ctx.restore();
}

export function drawElementMarked(
  element: BaseElementViewSupportTarget,
  ctx: CanvasRenderingContext2D
): void {
  if (!element.marked) {
    return;
  }

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#f6b83b";
  ctx.fillStyle = "#f6b83b33";
  ctx.strokeRect(
    element.posLeft,
    element.posTop,
    element.width,
    element.height
  );
  ctx.fillRect(
    element.posLeft,
    element.posTop,
    element.width,
    element.height
  );
  ctx.restore();
}

export function drawElementOccupied(
  element: BaseElementViewSupportTarget,
  ctx: CanvasRenderingContext2D
): void {
  ctx.save();
  ctx.fillStyle = "#403b82f6";
  ctx.fillRect(
    element.posLeft,
    element.posTop,
    element.width,
    element.height
  );
  ctx.restore();
}

export function drawElementSelection(
  element: BaseElementViewSupportTarget,
  ctx: CanvasRenderingContext2D
): void {
  element.drawEnabled(ctx);

  if (!element.selected) {
    return;
  }

  element.beginDraw(ctx);

  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "red";
  ctx.strokeRect(
    element.posLeft,
    element.posTop,
    element.width,
    element.height
  );

  element.endDraw(ctx);
}

export function drawElementBounds(
  element: BaseElementViewSupportTarget,
  ctx: CanvasRenderingContext2D
): void {
  const bounds = element.getBounds();

  ctx.strokeStyle = "lime";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 2]);
  ctx.strokeRect(
    bounds.x * element.GridSizeX,
    bounds.y * element.GridSizeX,
    bounds.width * element.GridSizeX,
    bounds.height * element.GridSizeX
  );

  ctx.strokeStyle = "blue";
  ctx.strokeRect(
    bounds.x * element.GridSizeX,
    bounds.y * element.GridSizeY,
    element.GridSizeX,
    element.GridSizeY
  );
}

export function drawElementNeighbors(
  element: BaseElementViewSupportTarget,
  ctx: CanvasRenderingContext2D
): void {
  ctx.save();

  const neighbors = element.getNeigbordsXy();

  ctx.fillStyle = "blue";

  neighbors.forEach(point => {
    ctx.beginPath();
    ctx.arc(
      point.x * element.GridSizeX + element.GridSizeX / 2,
      point.y * element.GridSizeY + element.GridSizeY / 2,
      5,
      0,
      Math.PI * 2
    );
    ctx.fill();
  });

  ctx.restore();
}

export function getBaseEditableProperties(): IEditableProperty[] {
  return [
    {
      label: "Name",
      key: "name",
      type: "string",
      readonly: false,
    },
  ];
}

export function getBaseHelp(): string {
  return `
    <h3 style="margin-top:0;">Base element</h3>
      `;
}

export function noopMouseHandler(_ev: MouseEvent): void {
  // Default: no-op.
}

export function noopFromJSON(_data: IBaseElement): void {
  // Default: no-op.
}

export function noopDraw(
  _ctx: CanvasRenderingContext2D,
  _options?: DrawOptions
): void {
  // Default: no-op.
}

export function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}
