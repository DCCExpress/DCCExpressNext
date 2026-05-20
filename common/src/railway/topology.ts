// common/src/railway/topology.ts

import {
  getDirection,
  getDirectionXy,
} from "../helpers.js";
import {
  Point,
} from "../Rect.js";
import {
  ELEMENT_TYPES,
} from "../layout/elementTypes.js";
import type {
  RotationStepDto,
  SerializedLayoutDto,
  SerializedLayoutElementDto,
} from "../layout/layoutDto.js";

import {
  BaseElement,
} from "../layout/model/BaseElement.js";
import {
  TrackElement,
  type TravelDirection,
} from "../layout/model/TrackElement.js";

import {
  TrackStraightElement,
} from "../layout/elements/TrackStraightElement.js";
import {
  TrackDirectionElement,
} from "../layout/elements/TrackDirectionElement.js";
import {
  TrackEndElement,
} from "../layout/elements/TrackEndElement.js";
import {
  TrackCornerElement,
} from "../layout/elements/TrackCornerElement.js";
import {
  TrackCurveElement,
} from "../layout/elements/TrackCurveElement.js";
import {
  TrackCrossingElement,
} from "../layout/elements/TrackCrossingElement.js";
import {
  TrackTurnoutLeftElement,
} from "../layout/elements/TrackTurnoutLeftElement.js";
import {
  TrackTurnoutRightElement,
} from "../layout/elements/TrackTurnoutRightElement.js";
import {
  BlockElement,
} from "../layout/elements/BlockElement.js";
import {
  TrackSensorElement,
} from "../layout/elements/TrackSensorElement.js";
import {
  TrackSignalElement,
} from "../layout/elements/TrackSignalElement.js";

export type {
  SerializedLayoutDto,
  SerializedLayoutElementDto,
  SerializedLayoutLayerDto,
} from "../layout/layoutDto.js";

export type {
  TravelDirection,
} from "../layout/model/TrackElement.js";

/**
 * A régi topology kód TopologyPoint néven használta.
 * A common domain modell Point osztálya ugyanazt a feladatot tudja,
 * ezért itt kompatibilitási típusnévként megtartjuk.
 */
export type TopologyPoint = Point;

/**
 * Régi export kompatibilitás.
 */
export { getDirection };

export function getDirectionPoint(
  point: Point,
  angle: number
): Point {
  return getDirectionXy(point, angle);
}

function numberValue(
  value: unknown,
  fallback: number
): number {
  return typeof value === "number"
    ? value
    : fallback;
}

function stringValue(
  value: unknown,
  fallback: string
): string {
  return typeof value === "string"
    ? value
    : fallback;
}

function rotationStepValue(
  value: unknown,
  fallback: RotationStepDto
): RotationStepDto {
  return value === 0 || value === 45 || value === 90
    ? value
    : fallback;
}

function boolValue(
  value: unknown,
  fallback: boolean
): boolean {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function applyBaseData<T extends BaseElement>(
  element: T,
  data: SerializedLayoutElementDto
): T {
  element.id = stringValue(data.id, "");
  element.name = stringValue(data.name, "element");
  element.layerName = stringValue(data.layerName, element.layerName);
  element.rotation = numberValue(data.rotation, element.rotation);
  element.rotationStep = rotationStepValue(
    data.rotationStep,
    element.rotationStep
  );
  element.bg = stringValue(data.bg, element.bg);
  element.fg = stringValue(data.fg, element.fg);
  element.trackName = stringValue(data.trackName, "");
  return element;
}

function applyTrackData<T extends TrackElement>(
  element: T,
  data: SerializedLayoutElementDto
): T {
  applyBaseData(element, data);
  element.address = numberValue(data.address, element.address);
  element.length = numberValue(data.length, element.length);
  return element;
}

/**
 * A topology réteg most már a grafikamentes common domain elemekből származik.
 * Ezek az adapterek csak:
 * - toleráns SerializedLayoutElementDto beolvasást,
 * - és a korábbi topology API kompatibilis metódusneveit
 * adják hozzá.
 */

export class TopologyStraightElement extends TrackStraightElement {
  constructor(data: SerializedLayoutElementDto) {
    super(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    );
    applyTrackData(this, data);
  }

  getNextItemPoint(): Point {
    return this.getNextItemXy();
  }

  getPrevItemPoint(): Point {
    return this.getPrevItemXy();
  }
}

export class TopologyDirectionElement extends TrackDirectionElement {
  constructor(data: SerializedLayoutElementDto) {
    super(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    );
    applyTrackData(this, data);
  }

  getNextItemPoint(): Point {
    return this.getNextItemXy();
  }

  getPrevItemPoint(): Point {
    return this.getPrevItemXy();
  }
}

export class TopologyEndElement extends TrackEndElement {
  constructor(data: SerializedLayoutElementDto) {
    super(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    );
    applyTrackData(this, data);
  }

  getNextItemPoint(): Point {
    return this.getNextItemXy();
  }

  getPrevItemPoint(): Point {
    return this.getPrevItemXy();
  }
}

export class TopologyCornerElement extends TrackCornerElement {
  constructor(data: SerializedLayoutElementDto) {
    super(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    );
    applyTrackData(this, data);
  }

  getNextItemPoint(): Point {
    return this.getNextItemXy();
  }

  getPrevItemPoint(): Point {
    return this.getPrevItemXy();
  }
}

export class TopologyCurveElement extends TrackCurveElement {
  constructor(data: SerializedLayoutElementDto) {
    super(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    );
    applyTrackData(this, data);
  }

  getNextItemPoint(): Point {
    return this.getNextItemXy();
  }

  getPrevItemPoint(): Point {
    return this.getPrevItemXy();
  }
}

export class TopologyCrossingElement extends TrackCrossingElement {
  constructor(data: SerializedLayoutElementDto) {
    super(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    );
    applyTrackData(this, data);
  }

  getNextItemPoint(): Point {
    return this.getNextItemXy();
  }

  getPrevItemPoint(): Point {
    return this.getPrevItemXy();
  }
}

export class TopologyTurnoutLeftElement extends TrackTurnoutLeftElement {
  constructor(data: SerializedLayoutElementDto) {
    super(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    );
    applyTrackData(this, data);
    this.turnoutAddress = numberValue(
      data.turnoutAddress,
      this.turnoutAddress
    );
    this.turnoutClosedValue = boolValue(
      data.turnoutClosedValue,
      this.turnoutClosedValue
    );
  }

  getNextItemPoint(): Point {
    return this.getNextItemXy();
  }

  getPrevItemPoint(): Point {
    return this.getPrevItemXy();
  }
}

export class TopologyTurnoutRightElement extends TrackTurnoutRightElement {
  constructor(data: SerializedLayoutElementDto) {
    super(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    );
    applyTrackData(this, data);
    this.turnoutAddress = numberValue(
      data.turnoutAddress,
      this.turnoutAddress
    );
    this.turnoutClosedValue = boolValue(
      data.turnoutClosedValue,
      this.turnoutClosedValue
    );
  }

  getNextItemPoint(): Point {
    return this.getNextItemXy();
  }

  getPrevItemPoint(): Point {
    return this.getPrevItemXy();
  }
}

export class TopologyBlockElement extends BlockElement {
  constructor(data: SerializedLayoutElementDto) {
    super(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    );
    applyTrackData(this, data);
    this.sensorAddress = numberValue(
      data.sensorAddress,
      this.sensorAddress
    );
    this.locoAddress = numberValue(
      data.locoAddress,
      this.locoAddress
    );
    this.blockType = stringValue(
      data.blockType,
      this.blockType
    ) as typeof this.blockType;
  }
}

export class TopologySensorElement extends TrackSensorElement {
  constructor(data: SerializedLayoutElementDto) {
    super(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    );
    applyTrackData(this, data);
    this.radius = numberValue(data.radius, this.radius);
    this.colorOn = stringValue(data.colorOn, this.colorOn);
    this.colorOff = stringValue(data.colorOff, this.colorOff);
    this.kind = numberValue(data.kind, this.kind) as typeof this.kind;
  }
}

export class TopologySignalElement extends TrackSignalElement {
  constructor(data: SerializedLayoutElementDto) {
    super(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    );
    applyTrackData(this, data);
    this.aspect = numberValue(data.aspect, this.aspect);
    this.addressLength = numberValue(
      data.addressLength,
      this.addressLength
    );
    this.dispalyAsSingleLamp = boolValue(
      data.dispalyAsSingleLamp,
      this.dispalyAsSingleLamp
    );
    this.valueGreen = numberValue(data.valueGreen, this.valueGreen);
    this.valueRed = numberValue(data.valueRed, this.valueRed);
    this.valueYellow = numberValue(data.valueYellow, this.valueYellow);
    this.valueWhite = numberValue(data.valueWhite, this.valueWhite);
  }
}

export type TopologyTurnoutElement =
  | TopologyTurnoutLeftElement
  | TopologyTurnoutRightElement;

export type TopologyTrackElement =
  | TopologyStraightElement
  | TopologyDirectionElement
  | TopologyEndElement
  | TopologyCornerElement
  | TopologyCurveElement
  | TopologyCrossingElement
  | TopologyTurnoutElement;

export type RailwayTopologyElement =
  | TopologyTrackElement
  | TopologyBlockElement
  | TopologySensorElement
  | TopologySignalElement;

export function isTopologyTurnoutElement(
  element: RailwayTopologyElement | undefined | null
): element is TopologyTurnoutElement {
  return (
    element instanceof TopologyTurnoutLeftElement ||
    element instanceof TopologyTurnoutRightElement
  );
}

export class RailwayTopologyLayout {
  constructor(
    private readonly elements: RailwayTopologyElement[]
  ) {}

  getAllElements(): RailwayTopologyElement[] {
    return this.elements;
  }

  getPhysicalTrackElements(): TopologyTrackElement[] {
    return this.elements.filter(
      (element): element is TopologyTrackElement =>
        element instanceof TopologyStraightElement ||
        element instanceof TopologyDirectionElement ||
        element instanceof TopologyEndElement ||
        element instanceof TopologyCornerElement ||
        element instanceof TopologyCurveElement ||
        element instanceof TopologyCrossingElement ||
        isTopologyTurnoutElement(element)
    );
  }

  getTurnouts(): TopologyTurnoutElement[] {
    return this.elements.filter(isTopologyTurnoutElement);
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
    point: Point
  ): TopologyTrackElement | undefined {
    return this.getPhysicalTrackElements().find(
      element =>
        element.x === point.x &&
        element.y === point.y
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
      return new TopologyStraightElement(data);

    case ELEMENT_TYPES.TRACK_DIRECTION:
      return new TopologyDirectionElement(data);

    case ELEMENT_TYPES.TRACK_END:
      return new TopologyEndElement(data);

    case ELEMENT_TYPES.TRACK_CORNER:
      return new TopologyCornerElement(data);

    case ELEMENT_TYPES.TRACK_CURVE:
      return new TopologyCurveElement(data);

    case ELEMENT_TYPES.TRACK_CROSSING:
      return new TopologyCrossingElement(data);

    case ELEMENT_TYPES.TRACK_TURNOUT_LEFT:
      return new TopologyTurnoutLeftElement(data);

    case ELEMENT_TYPES.TRACK_TURNOUT_RIGHT:
      return new TopologyTurnoutRightElement(data);

    case ELEMENT_TYPES.TRACK_BLOCK:
      return new TopologyBlockElement(data);

    case ELEMENT_TYPES.TRACK_SENSOR:
      return new TopologySensorElement(data);

    case ELEMENT_TYPES.TRACK_SIGNAL2:
    case ELEMENT_TYPES.TRACK_SIGNAL3:
    case ELEMENT_TYPES.TRACK_SIGNAL4:
      return new TopologySignalElement(data);

    default:
      return null;
  }
}
