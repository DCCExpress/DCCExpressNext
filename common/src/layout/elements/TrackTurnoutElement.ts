import {
  Point,
} from "../../Rect.js";
import {
  TrackElement,
} from "../model/TrackElement.js";

export abstract class TrackTurnoutElement extends TrackElement {
  turnoutAddress: number = 0;
  turnoutClosedValue: boolean = false;
  turnoutClosed: boolean = false;

  constructor(x: number, y: number) {
    super(x, y);
    this.rotationStep = 45;
  }

  get isClosed(): boolean {
    return this.turnoutClosed === this.turnoutClosedValue;
  }

  abstract getConnections(): {
    entry: Point;
    straight: Point;
    div: Point;
  };
}
