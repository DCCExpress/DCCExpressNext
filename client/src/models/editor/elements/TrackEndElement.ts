/**
 * Kompatibilitási export.
 *
 * A régi klienskód továbbra is innen importál:
 *   TrackEndElement
 *
 * A tényleges editor/UI implementáció:
 *   TrackEndElementView
 */
export {
  TrackEndElementView as TrackEndElement,
  TrackEndElementView,
} from "./TrackEndElementView";
