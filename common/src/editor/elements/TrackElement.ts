import { BaseElement } from "../core/BaseElement.js";
import type { ElementJSON } from "../core/types.js";

export type TrackElementJSON = ElementJSON & {
  layerId: "track";
  section: number;
};

export type TrackConnectionPoint = {
  side: string;
  x: number;
  y: number;
};

export abstract class TrackElement<TJSON extends TrackElementJSON = TrackElementJSON> extends BaseElement<TJSON> {
  section: number;

  protected constructor(json: TJSON) {
    super(json);
    this.section = json.section ?? 0;
  }

  override updateFromJSON(patch: Partial<TJSON>): void {
    super.updateFromJSON(patch);

    if (patch.section !== undefined) {
      this.section = patch.section;
    }
  }

  protected trackToJSON(): TrackElementJSON {
    const json = this.baseToJSON();
    return {
      ...json,
      layerId: "track",
      section: this.section,
    };
  }

  abstract getConnectionPoints(): TrackConnectionPoint[];
}
