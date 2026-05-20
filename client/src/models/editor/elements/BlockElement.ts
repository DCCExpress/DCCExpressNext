/**
 * Kompatibilitási export.
 *
 * A régi klienskód továbbra is innen importál:
 *   BlockElement
 *
 * A tényleges editor/UI implementáció:
 *   BlockElementView
 */
export {
  BlockElementView as BlockElement,
  BlockElementView,
} from "./BlockElementView";
