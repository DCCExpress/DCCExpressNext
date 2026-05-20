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
 * Ez még a mixinmentesítés előtti átmeneti view gyökér.
 * A következő nagy körben a View mixinek helyére
 * direkt View helper modulok kerülnek.
 */
export abstract class BaseElementView
  extends BaseElementViewMixin(CommonBaseElement)
  implements IBaseElement {
  constructor(x: number, y: number) {
    super(x, y);
  }

  abstract clone(): BaseElementView;
}
