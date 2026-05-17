// common/src/railway/topology.ts
export class TopologyPoint {
    x;
    y;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    isEqual(other) {
        return this.x === other.x && this.y === other.y;
    }
    key() {
        return `${this.x}:${this.y}`;
    }
}
const directions = [
    { x: 1, y: 0 }, // 0°
    { x: 1, y: 1 }, // 45°
    { x: 0, y: 1 }, // 90°
    { x: -1, y: 1 }, // 135°
    { x: -1, y: 0 }, // 180°
    { x: -1, y: -1 }, // 225°
    { x: 0, y: -1 }, // 270°
    { x: 1, y: -1 }, // 315°
];
export function getDirection(angle) {
    const a = ((angle % 360) + 360) % 360;
    const index = Math.round(a / 45) % directions.length;
    return directions[index];
}
export function getDirectionPoint(point, angle) {
    const d = getDirection(angle);
    return new TopologyPoint(point.x + d.x, point.y + d.y);
}
export const TOPOLOGY_ELEMENT_TYPES = {
    TRACK_STRAIGHT: "trackstraight",
    TRACK_DIRECTION: "trackdirection",
    TRACK_END: "trackend",
    TRACK_CORNER: "trackcorner",
    TRACK_CURVE: "trackcurve",
    TRACK_CROSSING: "trackcrossing",
    TRACK_TURNOUT_LEFT: "trackturnoutleft",
    TRACK_TURNOUT_RIGHT: "trackturnoutright",
    TRACK_SENSOR: "tracksensor",
    TRACK_SIGNAL2: "tracksignal2",
    TRACK_SIGNAL3: "tracksignal3",
    TRACK_SIGNAL4: "tracksignal4",
    TRACK_BLOCK: "trackblock",
};
export class TopologyBaseElement {
    id;
    type;
    name;
    layerName;
    x;
    y;
    rotation;
    trackName;
    constructor(data) {
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
    get pos() {
        return new TopologyPoint(this.x, this.y);
    }
}
export class TopologyTrackElement extends TopologyBaseElement {
    address;
    section = 0;
    isVisited = false;
    isRoute = false;
    travelDirection = "unknown";
    constructor(data) {
        super(data);
        this.address =
            typeof data.address === "number"
                ? data.address
                : 0;
    }
    getNextItemPoint() {
        switch (this.type) {
            case TOPOLOGY_ELEMENT_TYPES.TRACK_CORNER:
                return getDirectionPoint(this.pos, this.rotation + 90);
            case TOPOLOGY_ELEMENT_TYPES.TRACK_CURVE:
                return getDirectionPoint(this.pos, this.rotation);
            default:
                return getDirectionPoint(this.pos, this.rotation);
        }
    }
    getPrevItemPoint() {
        switch (this.type) {
            case TOPOLOGY_ELEMENT_TYPES.TRACK_CORNER:
                return getDirectionPoint(this.pos, this.rotation - 180);
            case TOPOLOGY_ELEMENT_TYPES.TRACK_CURVE:
                return getDirectionPoint(this.pos, this.rotation + 225);
            default:
                return getDirectionPoint(this.pos, this.rotation + 180);
        }
    }
}
export class TopologyTurnoutElement extends TopologyTrackElement {
    turnoutAddress;
    turnoutClosedValue;
    constructor(data) {
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
    getConnections() {
        if (this.type === TOPOLOGY_ELEMENT_TYPES.TRACK_TURNOUT_LEFT) {
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
    length;
    sensorAddress;
    blockType;
    constructor(data) {
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
    getBounds() {
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
    constructor(data) {
        super(data);
    }
}
export class TopologySignalElement extends TopologyTrackElement {
    aspect;
    addressLength;
    constructor(data) {
        super(data);
        this.aspect =
            typeof data.aspect === "number"
                ? data.aspect
                : 2;
        this.addressLength =
            typeof data.addressLength === "number"
                ? data.addressLength
                : 1;
    }
}
export class TopologyDirectionElement extends TopologyTrackElement {
    constructor(data) {
        super(data);
    }
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
        return this.elements.filter((element) => {
            return (element.type === TOPOLOGY_ELEMENT_TYPES.TRACK_DIRECTION ||
                element.type === TOPOLOGY_ELEMENT_TYPES.TRACK_STRAIGHT ||
                element.type === TOPOLOGY_ELEMENT_TYPES.TRACK_END ||
                element.type === TOPOLOGY_ELEMENT_TYPES.TRACK_CORNER ||
                element.type === TOPOLOGY_ELEMENT_TYPES.TRACK_CURVE ||
                element.type === TOPOLOGY_ELEMENT_TYPES.TRACK_CROSSING ||
                element.type === TOPOLOGY_ELEMENT_TYPES.TRACK_TURNOUT_LEFT ||
                element.type === TOPOLOGY_ELEMENT_TYPES.TRACK_TURNOUT_RIGHT);
        });
    }
    getTurnouts() {
        return this.elements.filter((element) => element instanceof TopologyTurnoutElement);
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
        return this.getPhysicalTrackElements().find(element => element.x === point.x && element.y === point.y);
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
        case TOPOLOGY_ELEMENT_TYPES.TRACK_STRAIGHT:
        case TOPOLOGY_ELEMENT_TYPES.TRACK_END:
        case TOPOLOGY_ELEMENT_TYPES.TRACK_CORNER:
        case TOPOLOGY_ELEMENT_TYPES.TRACK_CURVE:
        case TOPOLOGY_ELEMENT_TYPES.TRACK_CROSSING:
            return new TopologyTrackElement(data);
        case TOPOLOGY_ELEMENT_TYPES.TRACK_TURNOUT_LEFT:
        case TOPOLOGY_ELEMENT_TYPES.TRACK_TURNOUT_RIGHT:
            return new TopologyTurnoutElement(data);
        case TOPOLOGY_ELEMENT_TYPES.TRACK_BLOCK:
            return new TopologyBlockElement(data);
        case TOPOLOGY_ELEMENT_TYPES.TRACK_SENSOR:
            return new TopologySensorElement(data);
        case TOPOLOGY_ELEMENT_TYPES.TRACK_SIGNAL2:
        case TOPOLOGY_ELEMENT_TYPES.TRACK_SIGNAL3:
        case TOPOLOGY_ELEMENT_TYPES.TRACK_SIGNAL4:
            return new TopologySignalElement(data);
        case TOPOLOGY_ELEMENT_TYPES.TRACK_DIRECTION:
            return new TopologyDirectionElement(data);
        default:
            return null;
    }
}
