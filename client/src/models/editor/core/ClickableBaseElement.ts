import { BaseElement } from "./BaseElement";

/**
 * Jelölő ősosztály a kattintható, nem-track UI elemekhez.
 *
 * A mouseDown / mouseUp alap no-op hookokat már a BaseElementViewMixin
 * biztosítja a kliens BaseElementen keresztül, ezért itt nincs szükség
 * ismételt üres metódusokra.
 */
export abstract class ClickableBaseElement extends BaseElement {
}
