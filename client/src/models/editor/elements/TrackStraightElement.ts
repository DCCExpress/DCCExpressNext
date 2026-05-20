/**
 * Kompatibilitási export.
 *
 * A régi klienskód továbbra is innen importál:
 *   ../elements/TrackStraightElement
 *
 * Belül viszont már a név szerint is UI-s
 * TrackStraightElementView implementációt használjuk.
 */
export {
  TrackStraightElementView as TrackStraightElement,
} from "./TrackStraightElementView";
