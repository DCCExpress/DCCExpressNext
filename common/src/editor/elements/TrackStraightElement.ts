import { TrackElement, type TrackConnectionPoint, type TrackElementJSON } from "./TrackElement";
import { createId } from "../utils/createId";

export type TrackStraightElementJSON = TrackElementJSON & {
  type: "track.straight";
};

export class TrackStraightElement extends TrackElement<TrackStraightElementJSON> {
  static readonly TYPE = "track.straight" as const;

  readonly type = TrackStraightElement.TYPE;

  constructor(json: Partial<TrackStraightElementJSON> = {}) {
    super({
      id: json.id ?? createId("track-straight"),
      type: TrackStraightElement.TYPE,
      layerId: "track",
      x: json.x ?? 0,
      y: json.y ?? 0,
      width: json.width ?? 1,
      height: json.height ?? 1,
      rotation: json.rotation ?? 0,
      visible: json.visible ?? true,
      locked: json.locked ?? false,
      name: json.name,
      sectionId: json.sectionId,
    });
  }

  override getConnectionPoints(): TrackConnectionPoint[] {
    const rotation = ((this.rotation % 360) + 360) % 360;

    if (rotation === 90 || rotation === 270) {
      return [
        { side: "prev", x: this.x, y: this.y },
        { side: "next", x: this.x, y: this.y + 1 },
      ];
    }

    return [
      { side: "prev", x: this.x, y: this.y },
      { side: "next", x: this.x + 1, y: this.y },
    ];
  }

  override clone(changes: Partial<TrackStraightElementJSON> = {}): TrackStraightElement {
    return new TrackStraightElement({
      ...this.toJSON(),
      ...changes,
    });
  }

  override toJSON(): TrackStraightElementJSON {
    return {
      ...this.trackToJSON(),
      type: this.type,
    };
  }
}
