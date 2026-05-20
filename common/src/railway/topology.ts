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
 * A korábbi topology adapterosztály-neveket kompatibilitásból
 * megtartjuk export aliasokként.
 *
 * A topology réteg most már közvetlenül a valódi common domain
 * modelleket használja; nincs külön Topology... leszármazott osztály.
 */
export {
  TrackStraightElement as TopologyStraightElement,
  TrackDirectionElement as TopologyDirectionElement,
  TrackEndElement as TopologyEndElement,
  TrackCornerElement as TopologyCornerElement,
  TrackCurveElement as TopologyCurveElement,
  TrackCrossingElement as TopologyCrossingElement,
  TrackTurnoutLeftElement as TopologyTurnoutLeftElement,
  TrackTurnoutRightElement as TopologyTurnoutRightElement,
  BlockElement as TopologyBlockElement,
  TrackSensorElement as TopologySensorElement,
  TrackSignalElement as TopologySignalElement,
};

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

function createStraightElement(
  data: SerializedLayoutElementDto
): TrackStraightElement {
  return applyTrackData(
    new TrackStraightElement(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    ),
    data
  );
}

function createDirectionElement(
  data: SerializedLayoutElementDto
): TrackDirectionElement {
  return applyTrackData(
    new TrackDirectionElement(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    ),
    data
  );
}

function createEndElement(
  data: SerializedLayoutElementDto
): TrackEndElement {
  return applyTrackData(
    new TrackEndElement(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    ),
    data
  );
}

function createCornerElement(
  data: SerializedLayoutElementDto
): TrackCornerElement {
  return applyTrackData(
    new TrackCornerElement(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    ),
    data
  );
}

function createCurveElement(
  data: SerializedLayoutElementDto
): TrackCurveElement {
  return applyTrackData(
    new TrackCurveElement(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    ),
    data
  );
}

function createCrossingElement(
  data: SerializedLayoutElementDto
): TrackCrossingElement {
  return applyTrackData(
    new TrackCrossingElement(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    ),
    data
  );
}

function createTurnoutLeftElement(
  data: SerializedLayoutElementDto
): TrackTurnoutLeftElement {
  const element = applyTrackData(
    new TrackTurnoutLeftElement(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    ),
    data
  );

  element.turnoutAddress = numberValue(
    data.turnoutAddress,
    element.turnoutAddress
  );

  element.turnoutClosedValue = boolValue(
    data.turnoutClosedValue,
    element.turnoutClosedValue
  );

  return element;
}

function createTurnoutRightElement(
  data: SerializedLayoutElementDto
): TrackTurnoutRightElement {
  const element = applyTrackData(
    new TrackTurnoutRightElement(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    ),
    data
  );

  element.turnoutAddress = numberValue(
    data.turnoutAddress,
    element.turnoutAddress
  );

  element.turnoutClosedValue = boolValue(
    data.turnoutClosedValue,
    element.turnoutClosedValue
  );

  return element;
}

function createBlockElement(
  data: SerializedLayoutElementDto
): BlockElement {
  const element = applyTrackData(
    new BlockElement(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    ),
    data
  );

  element.sensorAddress = numberValue(
    data.sensorAddress,
    element.sensorAddress
  );

  element.locoAddress = numberValue(
    data.locoAddress,
    element.locoAddress
  );

  element.blockType = stringValue(
    data.blockType,
    element.blockType
  ) as typeof element.blockType;

  return element;
}

function createSensorElement(
  data: SerializedLayoutElementDto
): TrackSensorElement {
  const element = applyTrackData(
    new TrackSensorElement(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    ),
    data
  );

  element.radius = numberValue(data.radius, element.radius);
  element.colorOn = stringValue(data.colorOn, element.colorOn);
  element.colorOff = stringValue(data.colorOff, element.colorOff);
  element.kind = numberValue(data.kind, element.kind) as typeof element.kind;

  return element;
}

function createSignalElement(
  data: SerializedLayoutElementDto
): TrackSignalElement {
  const element = applyTrackData(
    new TrackSignalElement(
      numberValue(data.x, 0),
      numberValue(data.y, 0)
    ),
    data
  );

  element.aspect = numberValue(data.aspect, element.aspect);
  element.addressLength = numberValue(
    data.addressLength,
    element.addressLength
  );

  element.dispalyAsSingleLamp = boolValue(
    data.dispalyAsSingleLamp,
    element.dispalyAsSingleLamp
  );

  element.valueGreen = numberValue(data.valueGreen, element.valueGreen);
  element.valueRed = numberValue(data.valueRed, element.valueRed);
  element.valueYellow = numberValue(data.valueYellow, element.valueYellow);
  element.valueWhite = numberValue(data.valueWhite, element.valueWhite);

  return element;
}

export type TopologyTurnoutElement =
  | TrackTurnoutLeftElement
  | TrackTurnoutRightElement;

export type TopologyTrackElement =
  | TrackStraightElement
  | TrackDirectionElement
  | TrackEndElement
  | TrackCornerElement
  | TrackCurveElement
  | TrackCrossingElement
  | TopologyTurnoutElement;

export type RailwayTopologyElement =
  | TopologyTrackElement
  | BlockElement
  | TrackSensorElement
  | TrackSignalElement;

export function isTopologyTurnoutElement(
  element: RailwayTopologyElement | undefined | null
): element is TopologyTurnoutElement {
  return (
    element instanceof TrackTurnoutLeftElement ||
    element instanceof TrackTurnoutRightElement
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
        element instanceof TrackStraightElement ||
        element instanceof TrackDirectionElement ||
        element instanceof TrackEndElement ||
        element instanceof TrackCornerElement ||
        element instanceof TrackCurveElement ||
        element instanceof TrackCrossingElement ||
        isTopologyTurnoutElement(element)
    );
  }

  getTurnouts(): TopologyTurnoutElement[] {
    return this.elements.filter(isTopologyTurnoutElement);
  }

  getBlocks(): BlockElement[] {
    return this.elements.filter(
      (element): element is BlockElement =>
        element instanceof BlockElement
    );
  }

  getSensors(): TrackSensorElement[] {
    return this.elements.filter(
      (element): element is TrackSensorElement =>
        element instanceof TrackSensorElement
    );
  }

  getSignals(): TrackSignalElement[] {
    return this.elements.filter(
      (element): element is TrackSignalElement =>
        element instanceof TrackSignalElement
    );
  }

  getDirectionElements(): TrackDirectionElement[] {
    return this.elements.filter(
      (element): element is TrackDirectionElement =>
        element instanceof TrackDirectionElement
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
      return createStraightElement(data);

    case ELEMENT_TYPES.TRACK_DIRECTION:
      return createDirectionElement(data);

    case ELEMENT_TYPES.TRACK_END:
      return createEndElement(data);

    case ELEMENT_TYPES.TRACK_CORNER:
      return createCornerElement(data);

    case ELEMENT_TYPES.TRACK_CURVE:
      return createCurveElement(data);

    case ELEMENT_TYPES.TRACK_CROSSING:
      return createCrossingElement(data);

    case ELEMENT_TYPES.TRACK_TURNOUT_LEFT:
      return createTurnoutLeftElement(data);

    case ELEMENT_TYPES.TRACK_TURNOUT_RIGHT:
      return createTurnoutRightElement(data);

    case ELEMENT_TYPES.TRACK_BLOCK:
      return createBlockElement(data);

    case ELEMENT_TYPES.TRACK_SENSOR:
      return createSensorElement(data);

    case ELEMENT_TYPES.TRACK_SIGNAL2:
    case ELEMENT_TYPES.TRACK_SIGNAL3:
    case ELEMENT_TYPES.TRACK_SIGNAL4:
      return createSignalElement(data);

    default:
      return null;
  }
}
