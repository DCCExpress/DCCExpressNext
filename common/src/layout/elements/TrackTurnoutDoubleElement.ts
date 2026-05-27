import {
  getDirectionXy,
} from "../../helpers.js";
import {
  Point,
} from "../../Rect.js";
import {
  ELEMENT_TYPES,
} from "../elementTypes.js";
import type {
  TrackTurnoutDoubleElementDto,
  RotationStepDto,
} from "../layoutDto.js";
import type {
  NeighborPointPair,
} from "../model/BaseElement.js";
import {
  TrackElement,
} from "../model/TrackElement.js";

export type DoubleTurnoutSide =
  | "aStraight"
  | "aDiv"
  | "bStraight"
  | "bDiv";

export type DoubleTurnoutConnections = Record<DoubleTurnoutSide, Point>;

export type DoubleTurnoutRoute = {
  from: DoubleTurnoutSide;
  to: DoubleTurnoutSide;
  turnoutStates: [
    {
      address: number;
      closed: boolean;
    },
    {
      address: number;
      closed: boolean;
    },
  ];
};

export default class TrackTurnoutDoubleElement extends TrackElement {
  override type: typeof ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE =
    ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE;

  name: string = ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE;
  rotationStep: RotationStepDto = 45;

  turnout1Address: number = 0;
  turnout2Address: number = 0;
  turnout1ClosedValue: boolean = true;
  turnout2ClosedValue: boolean = true;

  /**
   * Runtime physical feedback values from the command center.
   */
  turnout1Closed: boolean = false;
  turnout2Closed: boolean = false;

  /**
   * Backward-compatible alias for legacy code paths that still treat a
   * turnout as a single accessory. The first motor is exposed here; route
   * graph edges still use both turnout1Address and turnout2Address.
   */
  get turnoutAddress(): number {
    return this.turnout1Address;
  }

  set turnoutAddress(value: number) {
    this.turnout1Address = value;
  }

  get turnoutClosedValue(): boolean {
    return this.turnout1ClosedValue;
  }

  set turnoutClosedValue(value: boolean) {
    this.turnout1ClosedValue = value;
  }

  get turnoutClosed(): boolean {
    return this.turnout1Closed;
  }

  set turnoutClosed(value: boolean) {
    this.turnout1Closed = value;
  }

  get firstLogicalClosed(): boolean {
    return this.turnout1Closed === this.turnout1ClosedValue;
  }

  get secondLogicalClosed(): boolean {
    return this.turnout2Closed === this.turnout2ClosedValue;
  }

  /**
   * Publikus konstruktor kell, hogy a kliensoldali
   * TrackElementViewMixin(CommonTrackTurnoutDoubleElement)
   * használni tudja ezt a common domain osztályt.
   */
  constructor(x: number, y: number) {
    super(x, y);
  }

  getConnections(): DoubleTurnoutConnections {
    return {
      aStraight: getDirectionXy(this.pos, this.rotation + 180),
      aDiv: getDirectionXy(this.pos, this.rotation + 225),
      bStraight: getDirectionXy(this.pos, this.rotation),
      bDiv: getDirectionXy(this.pos, this.rotation + 45),
    };
  }

  override getNeighborPointPairs(): NeighborPointPair[] {
    const connections = this.getConnections();

    return [
      [
        connections.aStraight,
        connections.bStraight,
      ],
      [
        connections.aDiv,
        connections.bDiv,
      ],
    ];
  }

  override getNeigbordsXy(): Point[] {
    const connections = this.getConnections();

    return [
      connections.aStraight,
      connections.aDiv,
      connections.bStraight,
      connections.bDiv,
    ];
  }

  getAllowedRoutes(): DoubleTurnoutRoute[] {
    return [
      {
        from: "aStraight",
        to: "bStraight",
        turnoutStates: [
          {
            address: this.turnout1Address,
            closed: !this.turnout1ClosedValue,
          },
          {
            address: this.turnout2Address,
            closed: !this.turnout2ClosedValue,
          },
        ],
      },
      {
        from: "aStraight",
        to: "bDiv",
        turnoutStates: [
          {
            address: this.turnout1Address,
            closed: !this.turnout1ClosedValue,
          },
          {
            address: this.turnout2Address,
            closed: this.turnout2ClosedValue,
          },
        ],
      },
      {
        from: "aDiv",
        to: "bStraight",
        turnoutStates: [
          {
            address: this.turnout1Address,
            closed: this.turnout1ClosedValue,
          },
          {
            address: this.turnout2Address,
            closed: !this.turnout2ClosedValue,
          },
        ],
      },
      {
        from: "aDiv",
        to: "bDiv",
        turnoutStates: [
          {
            address: this.turnout1Address,
            closed: this.turnout1ClosedValue,
          },
          {
            address: this.turnout2Address,
            closed: this.turnout2ClosedValue,
          },
        ],
      },
    ];
  }

  getSideConnectedToPoint(
    point: Point
  ): DoubleTurnoutSide | undefined {
    const connections = this.getConnections();

    for (const [side, connectionPoint] of Object.entries(connections)) {
      if (connectionPoint.isEqual(point)) {
        return side as DoubleTurnoutSide;
      }
    }

    return undefined;
  }

  getOppositeRoutesFromSide(
    side: DoubleTurnoutSide
  ): DoubleTurnoutRoute[] {
    return this.getAllowedRoutes().filter(
      route => route.from === side || route.to === side
    );
  }

  getRouteExitSide(
    route: DoubleTurnoutRoute,
    enteredSide: DoubleTurnoutSide
  ): DoubleTurnoutSide | undefined {
    if (route.from === enteredSide) {
      return route.to;
    }

    if (route.to === enteredSide) {
      return route.from;
    }

    return undefined;
  }

  static fromJSON(
    data: TrackTurnoutDoubleElementDto
  ): TrackTurnoutDoubleElement {
    const element = new TrackTurnoutDoubleElement(data.x, data.y);
    element.id = data.id;
    element.name = data.name;
    element.layerName = data.layerName;
    element.rotation = data.rotation;
    element.rotationStep = data.rotationStep;
    element.address = data.address;
    element.length = data.length;
    element.bg = data.bg;
    element.fg = data.fg;
    element.turnout1Address = data.turnout1Address;
    element.turnout2Address = data.turnout2Address;
    element.turnout1ClosedValue = data.turnout1ClosedValue ?? element.turnout1ClosedValue;
    element.turnout2ClosedValue = data.turnout2ClosedValue ?? element.turnout2ClosedValue;
    return element;
  }

  override toJSON(): TrackTurnoutDoubleElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE,
      turnout1Address: this.turnout1Address,
      turnout2Address: this.turnout2Address,
      turnout1ClosedValue: this.turnout1ClosedValue,
      turnout2ClosedValue: this.turnout2ClosedValue,
    };
  }
}
