import {
  BaseElement as CommonBaseElement,
} from "../../../../../common/src/layout/model/BaseElement";
import type {
  IBaseElement,
} from "../types/EditorTypes";
import {
  BaseElementViewMixin,
} from "./view/BaseElementViewMixin";

/**
 * Kliensoldali editor/UI alap elem.
 *
 * A közös editoros canvas/API réteg már a BaseElementViewMixinben él,
 * így ugyanazt használja:
 * - a nem-track kliens elemvilág ezen a BaseElementen keresztül,
 * - és a common domain track elemekből származó ...View osztályok.
 *
 * Ettől megszűnik a BaseElement.ts és a BaseElementViewMixin.ts
 * közötti nagy UI-metódus duplikáció.
 */
export abstract class BaseElement
  extends BaseElementViewMixin(CommonBaseElement)
  implements IBaseElement {
  constructor(x: number, y: number) {
    super(x, y);
  }

  abstract clone(): BaseElement;
}
