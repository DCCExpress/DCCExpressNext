export type ElementId = string;
export type LayerId = string;
export type ElementType = string;

export type LayerKind =
  | "track"
  | "signal"
  | "sensor"
  | "block"
  | "building"
  | "control"
  | "custom";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ElementJSON = {
  id: ElementId;
  type: ElementType;
  layerId: LayerId;

  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;

  visible?: boolean;
  locked?: boolean;
  name?: string;

  [key: string]: unknown;
};

export type LayerJSON = {
  id: LayerId;
  name: string;
  kind: LayerKind;
  order: number;
  visible: boolean;
  locked: boolean;
  elements: ElementJSON[];
};

export type LayoutJSON = {
  version: number;
  name: string;
  gridSize: number;
  layers: LayerJSON[];
};
