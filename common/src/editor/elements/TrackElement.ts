import { BaseElement } from "../core/BaseElement.js";
import type { ElementJSON } from "../core/types.js";

export type TrackElementJSON = ElementJSON & {
  layerId: "track";
  sectionId?: string;
};

export type TrackConnectionPoint = {
  side: string;
  x: number;
  y: number;
};

export abstract class TrackElement<TJSON extends TrackElementJSON = TrackElementJSON> extends BaseElement<TJSON> {
  sectionId?: string;

  protected constructor(json: TJSON) {
    super(json);
    this.sectionId = json.sectionId;
  }

  override updateFromJSON(patch: Partial<TJSON>): void {
    super.updateFromJSON(patch);

    if (patch.sectionId !== undefined) {
      this.sectionId = patch.sectionId;
    }
  }

  protected trackToJSON(): TrackElementJSON {
    const json = this.baseToJSON();
    return {
      ...json,
      layerId: "track",
      sectionId: this.sectionId,
    };
  }

  abstract getConnectionPoints(): TrackConnectionPoint[];
}
