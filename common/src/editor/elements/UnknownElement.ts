import { BaseElement } from "../core/BaseElement";
import type { ElementJSON } from "../core/types";

export class UnknownElement extends BaseElement<ElementJSON> {
  readonly type: string;

  private readonly raw: ElementJSON;

  constructor(json: ElementJSON) {
    super(json);
    this.type = json.type;
    this.raw = { ...json };
  }

  override clone(changes: Partial<ElementJSON> = {}): UnknownElement {
    return new UnknownElement({
      ...this.toJSON(),
      ...changes,
    });
  }

  override toJSON(): ElementJSON {
    return {
      ...this.raw,
      ...this.baseToJSON(),
      type: this.type,
    };
  }
}
