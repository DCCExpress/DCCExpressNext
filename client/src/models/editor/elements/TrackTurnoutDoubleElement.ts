/**
 * Kompatibilitási export.
 *
 * A régi klienskód továbbra is importálhatja defaultként:
 *   TrackTurnoutDoubleElement
 *
 * A tényleges editor/UI implementáció:
 *   TrackTurnoutDoubleElementView
 */
export { default } from "./TrackTurnoutDoubleElementView";
export { default as TrackTurnoutDoubleElement } from "./TrackTurnoutDoubleElementView";
export { default as TrackTurnoutDoubleElementView } from "./TrackTurnoutDoubleElementView";
