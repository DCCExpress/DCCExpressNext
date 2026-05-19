// common/src/railway/topology.ts

import { ELEMENT_TYPES } from "../layout/elementTypes.js"
import type {
  SerializedLayoutDto,
  SerializedLayoutElementDto,
} from "../layout/layoutDto.js";

export type {
  SerializedLayoutDto,
  SerializedLayoutElementDto,
  SerializedLayoutLayerDto,
} from "../layout/layoutDto.js";
export type TravelDirection =
  | "unknown"
  | "forward"
  | "reverse";

export class TopologyPoint {
  constructor(
    public x: number,
    public y: number
  ) { }

  isEqual(other: TopologyPoint): boolean {
    return this.x === other.x && this.y === other.y;
  }

  key(): string {
    return `${this.x}:${this.y}`;
  }
}

type Direction = {
  x: number;
  y: number;
};

const directions: Direction[] = [
  { x: 1, y: 0 },   // 0°
  { x: 1, y: 1 },   // 45°
  { x: 0, y: 1 },   // 90°
  { x: -1, y: 1 },  // 135°
  { x: -1, y: 0 },  // 180°
  { x: -1, y: -1 }, // 225°
  { x: 0, y: -1 },  // 270°
  { x: 1, y: -1 },  // 315°
];

export function getDirection(angle: number): Direction {
  const a = ((angle % 360) + 360) % 360;
  const index = Math.round(a / 45) % directions.length;

  return directions[index]!;
}

export function getDirectionPoint(
  point: TopologyPoint,
  angle: number
): TopologyPoint {
  const d = getDirection(angle);

  return new TopologyPoint(
    point.x + d.x,
    point.y + d.y
  );
}

export abstract class TopologyBaseElement {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly layerName: string;

  readonly x: number;
  readonly y: number;
  readonly rotation: number;

  trackName: string;

  protected constructor(data: SerializedLayoutElementDto) {
    this.id =
      typeof data.id === "string"
        ? data.id
        : "";

    this.type =
      typeof data.type === "string"
        ? data.type
        : "";

    this.name =
      typeof data.name === "string"
        ? data.name
        : "element";

    this.layerName =
      typeof data.layerName === "string"
        ? data.layerName
        : "";

    this.x =
      typeof data.x === "number"
        ? data.x
        : 0;

    this.y =
      typeof data.y === "number"
        ? data.y
        : 0;

    this.rotation =
      typeof data.rotation === "number"
        ? data.rotation
        : 0;

    this.trackName =
      typeof data.trackName === "string"
        ? data.trackName
        : "";
  }

  get pos(): TopologyPoint {
    return new TopologyPoint(this.x, this.y);
  }
}

export class TopologyTrackElement extends TopologyBaseElement {
  readonly address: number;

  section = 0;
  isVisited = false;
  isRoute = false;
  travelDirection: TravelDirection = "unknown";

  constructor(data: SerializedLayoutElementDto) {
    super(data);

    this.address =
      typeof data.address === "number"
        ? data.address
        : 0;
  }

  getNextItemPoint(): TopologyPoint {
    switch (this.type) {
      case ELEMENT_TYPES.TRACK_CORNER:
        return getDirectionPoint(this.pos, this.rotation + 90);

      case ELEMENT_TYPES.TRACK_CURVE:
        return getDirectionPoint(this.pos, this.rotation);

      default:
        return getDirectionPoint(this.pos, this.rotation);
    }
  }

  getPrevItemPoint(): TopologyPoint {
    switch (this.type) {
      case ELEMENT_TYPES.TRACK_CORNER:
        return getDirectionPoint(this.pos, this.rotation - 180);

      case ELEMENT_TYPES.TRACK_CURVE:
        return getDirectionPoint(this.pos, this.rotation + 225);

      default:
        return getDirectionPoint(this.pos, this.rotation + 180);
    }
  }
}

export type TurnoutConnections = {
  entry: TopologyPoint;
  straight: TopologyPoint;
  div: TopologyPoint;
};

export class TopologyTurnoutElement extends TopologyTrackElement {
  readonly turnoutAddress: number;
  readonly turnoutClosedValue: boolean;

  constructor(data: SerializedLayoutElementDto) {
    super(data);

    this.turnoutAddress =
      typeof data.turnoutAddress === "number"
        ? data.turnoutAddress
        : 0;

    this.turnoutClosedValue =
      typeof data.turnoutClosedValue === "boolean"
        ? data.turnoutClosedValue
        : false;
  }

  getConnections(): TurnoutConnections {
    if (this.type === ELEMENT_TYPES.TRACK_TURNOUT_LEFT) {
      return {
        straight: getDirectionPoint(this.pos, -this.rotation),
        entry: getDirectionPoint(this.pos, -this.rotation + 180),
        div: getDirectionPoint(this.pos, -this.rotation - 45),
      };
    }

    return {
      straight: getDirectionPoint(this.pos, this.rotation),
      entry: getDirectionPoint(this.pos, this.rotation + 180),
      div: getDirectionPoint(this.pos, this.rotation + 45),
    };
  }
}

export class TopologyBlockElement extends TopologyTrackElement {
  readonly length: number;
  readonly sensorAddress: number;
  readonly blockType: string;

  constructor(data: SerializedLayoutElementDto) {
    super(data);

    this.length =
      typeof data.length === "number"
        ? data.length
        : 1;

    this.sensorAddress =
      typeof data.sensorAddress === "number"
        ? data.sensorAddress
        : 0;

    this.blockType =
      typeof data.blockType === "string"
        ? data.blockType
        : "normal";
  }

  /**
   * Ugyanaz a logika, mint a kliens BlockElement.getBounds()-ában:
   * a blokk középpontja a sín cellája, vízszintesen 3x1,
   * függőlegesen 1x3 mezőt fed.
   */
  getBounds(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const w = 3;
    const h = 1;

    if (this.rotation === 0 || this.rotation === 180) {
      return {
        x: this.x - 1,
        y: this.y,
        width: w,
        height: h,
      };
    }

    return {
      x: this.x,
      y: this.y - 1,
      width: h,
      height: w,
    };
  }
}

export class TopologySensorElement extends TopologyTrackElement {
  constructor(data: SerializedLayoutElementDto) {
    super(data);
  }
}

export class TopologySignalElement extends TopologyTrackElement {
  readonly aspect: number;
  readonly addressLength: number;

  readonly valueGreen: number;
  readonly valueRed: number;
  readonly valueYellow: number;
  readonly valueWhite: number;

  constructor(data: SerializedLayoutElementDto) {
    super(data);

    this.aspect =
      typeof data.aspect === "number"
        ? data.aspect
        : 2;

    this.addressLength =
      typeof data.addressLength === "number"
        ? data.addressLength
        : 1;

    this.valueGreen =
      typeof data.valueGreen === "number"
        ? data.valueGreen
        : 0;

    this.valueRed =
      typeof data.valueRed === "number"
        ? data.valueRed
        : 0;

    this.valueYellow =
      typeof data.valueYellow === "number"
        ? data.valueYellow
        : 0;

    this.valueWhite =
      typeof data.valueWhite === "number"
        ? data.valueWhite
        : 0;
  }
}

export class TopologyDirectionElement extends TopologyTrackElement {
  constructor(data: SerializedLayoutElementDto) {
    super(data);
  }
}

export type RailwayTopologyElement =
  | TopologyTrackElement
  | TopologyTurnoutElement
  | TopologyBlockElement
  | TopologySensorElement
  | TopologySignalElement
  | TopologyDirectionElement;

export class RailwayTopologyLayout {
  constructor(
    private readonly elements: RailwayTopologyElement[]
  ) { }

  getAllElements(): RailwayTopologyElement[] {
    return this.elements;
  }

  getPhysicalTrackElements(): TopologyTrackElement[] {
    return this.elements.filter((element): element is TopologyTrackElement => {
      return (
        element.type === ELEMENT_TYPES.TRACK_DIRECTION ||
        element.type === ELEMENT_TYPES.TRACK_STRAIGHT ||
        element.type === ELEMENT_TYPES.TRACK_END ||
        element.type === ELEMENT_TYPES.TRACK_CORNER ||
        element.type === ELEMENT_TYPES.TRACK_CURVE ||
        element.type === ELEMENT_TYPES.TRACK_CROSSING ||
        element.type === ELEMENT_TYPES.TRACK_TURNOUT_LEFT ||
        element.type === ELEMENT_TYPES.TRACK_TURNOUT_RIGHT
      );
    });
  }

  getTurnouts(): TopologyTurnoutElement[] {
    return this.elements.filter(
      (element): element is TopologyTurnoutElement =>
        element instanceof TopologyTurnoutElement
    );
  }

  getBlocks(): TopologyBlockElement[] {
    return this.elements.filter(
      (element): element is TopologyBlockElement =>
        element instanceof TopologyBlockElement
    );
  }

  getSensors(): TopologySensorElement[] {
    return this.elements.filter(
      (element): element is TopologySensorElement =>
        element instanceof TopologySensorElement
    );
  }

  getSignals(): TopologySignalElement[] {
    return this.elements.filter(
      (element): element is TopologySignalElement =>
        element instanceof TopologySignalElement
    );
  }

  getDirectionElements(): TopologyDirectionElement[] {
    return this.elements.filter(
      (element): element is TopologyDirectionElement =>
        element instanceof TopologyDirectionElement
    );
  }

  getPhysicalTrackAt(
    point: TopologyPoint
  ): TopologyTrackElement | undefined {
    return this.getPhysicalTrackElements().find(
      element => element.x === point.x && element.y === point.y
    );
  }

  getElementById(
    id: string
  ): RailwayTopologyElement | undefined {
    return this.elements.find(element => element.id === id);
  }
}

export function buildRailwayTopologyFromLayout(
  layout: SerializedLayoutDto | null | undefined
): RailwayTopologyLayout {
  if (!layout?.layers || !Array.isArray(layout.layers)) {
    return new RailwayTopologyLayout([]);
  }

  const elements: RailwayTopologyElement[] = [];

  for (const layer of layout.layers) {
    const layerElements = layer.elements ?? [];

    for (const data of layerElements) {
      const element = createTopologyElement(data);

      if (element) {
        elements.push(element);
      }
    }
  }

  return new RailwayTopologyLayout(elements);
}

function createTopologyElement(
  data: SerializedLayoutElementDto
): RailwayTopologyElement | null {
  switch (data.type) {
    case ELEMENT_TYPES.TRACK_STRAIGHT:
    case ELEMENT_TYPES.TRACK_END:
    case ELEMENT_TYPES.TRACK_CORNER:
    case ELEMENT_TYPES.TRACK_CURVE:
    case ELEMENT_TYPES.TRACK_CROSSING:
      return new TopologyTrackElement(data);

    case ELEMENT_TYPES.TRACK_TURNOUT_LEFT:
    case ELEMENT_TYPES.TRACK_TURNOUT_RIGHT:
      return new TopologyTurnoutElement(data);

    case ELEMENT_TYPES.TRACK_BLOCK:
      return new TopologyBlockElement(data);

    case ELEMENT_TYPES.TRACK_SENSOR:
      return new TopologySensorElement(data);

    case ELEMENT_TYPES.TRACK_SIGNAL2:
    case ELEMENT_TYPES.TRACK_SIGNAL3:
    case ELEMENT_TYPES.TRACK_SIGNAL4:
      return new TopologySignalElement(data);

    case ELEMENT_TYPES.TRACK_DIRECTION:
      return new TopologyDirectionElement(data);

    default:
      return null;
  }
}