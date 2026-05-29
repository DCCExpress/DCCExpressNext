import { BaseElement } from "../core/BaseElement";
import type { ElementJSON } from "../core/types";

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
    return {
      ...this.baseToJSON(),
      layerId: "track",
      sectionId: this.sectionId,
    };
  }

  abstract getConnectionPoints(): TrackConnectionPoint[];
}
