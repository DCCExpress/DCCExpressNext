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
            closed: false,
          },
          {
            address: this.turnout2Address,
            closed: false,
          },
        ],
      },
      {
        from: "aStraight",
        to: "bDiv",
        turnoutStates: [
          {
            address: this.turnout1Address,
            closed: false,
          },
          {
            address: this.turnout2Address,
            closed: true,
          },
        ],
      },
      {
        from: "aDiv",
        to: "bStraight",
        turnoutStates: [
          {
            address: this.turnout1Address,
            closed: true,
          },
          {
            address: this.turnout2Address,
            closed: false,
          },
        ],
      },
      {
        from: "aDiv",
        to: "bDiv",
        turnoutStates: [
          {
            address: this.turnout1Address,
            closed: true,
          },
          {
            address: this.turnout2Address,
            closed: true,
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
    return element;
  }

  override toJSON(): TrackTurnoutDoubleElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE,
      turnout1Address: this.turnout1Address,
      turnout2Address: this.turnout2Address,
    };
  }
}
