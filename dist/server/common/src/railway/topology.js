// common/src/railway/topology.ts
import { getDirection, getDirectionXy, } from "../helpers.js";
import { ELEMENT_TYPES, } from "../layout/elementTypes.js";
import { TrackStraightElement, } from "../layout/elements/TrackStraightElement.js";
import { TrackDirectionElement, } from "../layout/elements/TrackDirectionElement.js";
import { TrackEndElement, } from "../layout/elements/TrackEndElement.js";
import { TrackCornerElement, } from "../layout/elements/TrackCornerElement.js";
import { TrackCurveElement, } from "../layout/elements/TrackCurveElement.js";
import { TrackCrossingElement, } from "../layout/elements/TrackCrossingElement.js";
import { TrackTurnoutLeftElement, } from "../layout/elements/TrackTurnoutLeftElement.js";
import { TrackTurnoutRightElement, } from "../layout/elements/TrackTurnoutRightElement.js";
import { BlockElement, } from "../layout/elements/BlockElement.js";
import { TrackSensorElement, } from "../layout/elements/TrackSensorElement.js";
import { TrackSignalElement, } from "../layout/elements/TrackSignalElement.js";
/**
 * Régi export kompatibilitás.
 */
export { getDirection };
export function getDirectionPoint(point, angle) {
    return getDirectionXy(point, angle);
}
function numberValue(value, fallback) {
    return typeof value === "number"
        ? value
        : fallback;
}
function stringValue(value, fallback) {
    return typeof value === "string"
        ? value
        : fallback;
}
function rotationStepValue(value, fallback) {
    return value === 0 || value === 45 || value === 90
        ? value
        : fallback;
}
function boolValue(value, fallback) {
    return typeof value === "boolean"
        ? value
        : fallback;
}
function applyBaseData(element, data) {
    element.id = stringValue(data.id, "");
    element.name = stringValue(data.name, "element");
    element.layerName = stringValue(data.layerName, element.layerName);
    element.rotation = numberValue(data.rotation, element.rotation);
    element.rotationStep = rotationStepValue(data.rotationStep, element.rotationStep);
    element.bg = stringValue(data.bg, element.bg);
    element.fg = stringValue(data.fg, element.fg);
    element.trackName = stringValue(data.trackName, "");
    return element;
}
function applyTrackData(element, data) {
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
    constructor(data) {
        super(numberValue(data.x, 0), numberValue(data.y, 0));
        applyTrackData(this, data);
    }
    getNextItemPoint() {
        return this.getNextItemXy();
    }
    getPrevItemPoint() {
        return this.getPrevItemXy();
    }
}
export class TopologyDirectionElement extends TrackDirectionElement {
    constructor(data) {
        super(numberValue(data.x, 0), numberValue(data.y, 0));
        applyTrackData(this, data);
    }
    getNextItemPoint() {
        return this.getNextItemXy();
    }
    getPrevItemPoint() {
        return this.getPrevItemXy();
    }
}
export class TopologyEndElement extends TrackEndElement {
    constructor(data) {
        super(numberValue(data.x, 0), numberValue(data.y, 0));
        applyTrackData(this, data);
    }
    getNextItemPoint() {
        return this.getNextItemXy();
    }
    getPrevItemPoint() {
        return this.getPrevItemXy();
    }
}
export class TopologyCornerElement extends TrackCornerElement {
    constructor(data) {
        super(numberValue(data.x, 0), numberValue(data.y, 0));
        applyTrackData(this, data);
    }
    getNextItemPoint() {
        return this.getNextItemXy();
    }
    getPrevItemPoint() {
        return this.getPrevItemXy();
    }
}
export class TopologyCurveElement extends TrackCurveElement {
    constructor(data) {
        super(numberValue(data.x, 0), numberValue(data.y, 0));
        applyTrackData(this, data);
    }
    getNextItemPoint() {
        return this.getNextItemXy();
    }
    getPrevItemPoint() {
        return this.getPrevItemXy();
    }
}
export class TopologyCrossingElement extends TrackCrossingElement {
    constructor(data) {
        super(numberValue(data.x, 0), numberValue(data.y, 0));
        applyTrackData(this, data);
    }
    getNextItemPoint() {
        return this.getNextItemXy();
    }
    getPrevItemPoint() {
        return this.getPrevItemXy();
    }
}
export class TopologyTurnoutLeftElement extends TrackTurnoutLeftElement {
    constructor(data) {
        super(numberValue(data.x, 0), numberValue(data.y, 0));
        applyTrackData(this, data);
        this.turnoutAddress = numberValue(data.turnoutAddress, this.turnoutAddress);
        this.turnoutClosedValue = boolValue(data.turnoutClosedValue, this.turnoutClosedValue);
    }
    getNextItemPoint() {
        return this.getNextItemXy();
    }
    getPrevItemPoint() {
        return this.getPrevItemXy();
    }
}
export class TopologyTurnoutRightElement extends TrackTurnoutRightElement {
    constructor(data) {
        super(numberValue(data.x, 0), numberValue(data.y, 0));
        applyTrackData(this, data);
        this.turnoutAddress = numberValue(data.turnoutAddress, this.turnoutAddress);
        this.turnoutClosedValue = boolValue(data.turnoutClosedValue, this.turnoutClosedValue);
    }
    getNextItemPoint() {
        return this.getNextItemXy();
    }
    getPrevItemPoint() {
        return this.getPrevItemXy();
    }
}
export class TopologyBlockElement extends BlockElement {
    constructor(data) {
        super(numberValue(data.x, 0), numberValue(data.y, 0));
        applyTrackData(this, data);
        this.sensorAddress = numberValue(data.sensorAddress, this.sensorAddress);
        this.locoAddress = numberValue(data.locoAddress, this.locoAddress);
        this.blockType = stringValue(data.blockType, this.blockType);
    }
}
export class TopologySensorElement extends TrackSensorElement {
    constructor(data) {
        super(numberValue(data.x, 0), numberValue(data.y, 0));
        applyTrackData(this, data);
        this.radius = numberValue(data.radius, this.radius);
        this.colorOn = stringValue(data.colorOn, this.colorOn);
        this.colorOff = stringValue(data.colorOff, this.colorOff);
        this.kind = numberValue(data.kind, this.kind);
    }
}
export class TopologySignalElement extends TrackSignalElement {
    constructor(data) {
        super(numberValue(data.x, 0), numberValue(data.y, 0));
        applyTrackData(this, data);
        this.aspect = numberValue(data.aspect, this.aspect);
        this.addressLength = numberValue(data.addressLength, this.addressLength);
        this.dispalyAsSingleLamp = boolValue(data.dispalyAsSingleLamp, this.dispalyAsSingleLamp);
        this.valueGreen = numberValue(data.valueGreen, this.valueGreen);
        this.valueRed = numberValue(data.valueRed, this.valueRed);
        this.valueYellow = numberValue(data.valueYellow, this.valueYellow);
        this.valueWhite = numberValue(data.valueWhite, this.valueWhite);
    }
}
export function isTopologyTurnoutElement(element) {
    return (element instanceof TopologyTurnoutLeftElement ||
        element instanceof TopologyTurnoutRightElement);
}
export class RailwayTopologyLayout {
    elements;
    constructor(elements) {
        this.elements = elements;
    }
    getAllElements() {
        return this.elements;
    }
    getPhysicalTrackElements() {
        return this.elements.filter((element) => element instanceof TopologyStraightElement ||
            element instanceof TopologyDirectionElement ||
            element instanceof TopologyEndElement ||
            element instanceof TopologyCornerElement ||
            element instanceof TopologyCurveElement ||
            element instanceof TopologyCrossingElement ||
            isTopologyTurnoutElement(element));
    }
    getTurnouts() {
        return this.elements.filter(isTopologyTurnoutElement);
    }
    getBlocks() {
        return this.elements.filter((element) => element instanceof TopologyBlockElement);
    }
    getSensors() {
        return this.elements.filter((element) => element instanceof TopologySensorElement);
    }
    getSignals() {
        return this.elements.filter((element) => element instanceof TopologySignalElement);
    }
    getDirectionElements() {
        return this.elements.filter((element) => element instanceof TopologyDirectionElement);
    }
    getPhysicalTrackAt(point) {
        return this.getPhysicalTrackElements().find(element => element.x === point.x &&
            element.y === point.y);
    }
    getElementById(id) {
        return this.elements.find(element => element.id === id);
    }
}
export function buildRailwayTopologyFromLayout(layout) {
    if (!layout?.layers || !Array.isArray(layout.layers)) {
        return new RailwayTopologyLayout([]);
    }
    const elements = [];
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
function createTopologyElement(data) {
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
