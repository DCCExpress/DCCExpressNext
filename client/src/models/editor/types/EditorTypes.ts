import type {
  BlockType,
  ElementType,
} from "../../../../../common/src/layout/elementTypes";
import type { Loco } from "../../../../../common/src/types";
import type {
  AudioButtonElementDto,
  AudioListButtonElementDto,
  BaseElementDto,
  BlockElementDto,
  ButtonElementDto,
  ButtonScriptElementDto,
  ClockElementDto,
  ExtendedRouteButtonElementDto,
  LabelElementDto,
  LayoutElementDto,
  RouteButtonElementDto,
  RotationStepDto,
  TrackCornerElementDto,
  TrackCrossingElementDto,
  TrackCurveElementDto,
  TrackDirectionElementDto,
  TrackElementDto,
  TrackEndElementDto,
  TrackSensorElementDto,
  TrackSignalElementDto,
  TrackStraightElementDto,
  TrackTurnoutDoubleElementDto,
  TrackTurnoutLeftElementDto,
  TrackTurnoutRightElementDto,
  TrackTurnoutThreeWayElementDto,
  TrackTurnoutTwoWayElementDto,
  TreeElementDto,
} from "../../../../../common/src/layout/layoutDto";

export type EditorTool =
  | { mode: "cursor"; elementType: ElementType }
  | { mode: "draw"; elementType: ElementType }
  | { mode: "delete"; elementType: ElementType };

export type RotationStep = RotationStepDto;

export interface DrawOptions {
  showOccupancySensorAddress: boolean;
  showSensorAddress: boolean;
  showSignalAddress: boolean;
  showTurnoutAddress: boolean;
  showSection?: boolean;
  showBlockNames?: boolean;
  selected?: boolean;
  hovered?: boolean;
  ghost?: boolean;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  overrideX?: number;
  overrideY?: number;
  showHandles?: boolean;
  gridSize?: number;
  darkMode?: boolean;
  locos: Loco[];
}

/**
 * Kompatibilitási aliasok.
 *
 * A kliensoldali editorban sok elem még ITrack... neveken importál.
 * Ezek a nevek most már NEM külön DTO definíciók,
 * hanem a közös common/src/layout/layoutDto.ts típusaira mutatnak.
 *
 * Később, ha akarjuk, szépen át lehet nevezni a használatokat
 * BaseElementDto / TrackSensorElementDto stb. nevekre,
 * de ehhez most nem kellett végigverni az egész editort.
 */
export type IBaseElement = BaseElementDto;
export type ITrackElement = TrackElementDto;

export type ITrackStraightElement = TrackStraightElementDto;
export type ITrackDirectionElement = TrackDirectionElementDto;
export type ITrackEndElement = TrackEndElementDto;
export type ITrackCornerElement = TrackCornerElementDto;
export type ITrackCurveElement = TrackCurveElementDto;
export type ITrackCrossingElement = TrackCrossingElementDto;

export type ITrackTurnoutLeftElement = TrackTurnoutLeftElementDto;
export type ITrackTurnoutRightElement = TrackTurnoutRightElementDto;
export type ITrackTurnoutTwoWayElement = TrackTurnoutTwoWayElementDto;
export type ITrackTurnoutDoubleElement = TrackTurnoutDoubleElementDto;
export type ITrackTurnoutThreeWayElement = TrackTurnoutThreeWayElementDto;

export type ITrackSensorElement = TrackSensorElementDto;

export type IButtonElement = ButtonElementDto;
export type IButtonScriptElement = ButtonScriptElementDto;
export type IAudioButtonElement = AudioButtonElementDto;
export type IAudioListButtonElement = AudioListButtonElementDto;
export type IRouteButtonElement = RouteButtonElementDto;
export type IExtendedRouteButtonElement = ExtendedRouteButtonElementDto;
export type IClockElement = ClockElementDto;
export type IBlockElement = BlockElementDto;
export type ITreeElement = TreeElementDto;
export type ILabelElement = LabelElementDto;
export type ITrackSignalElement = TrackSignalElementDto;

export type EditorElementData = LayoutElementDto;

export interface IEditorSettings {
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  backgroundColor: string;
  defaultRotationStep: RotationStep;
}

export interface ILayer {
  name: string;
  elements: EditorElementData[];
}

export interface IEditorLayers {
  track: ILayer;
  buildings: ILayer;
}

/**
 * Régi layout-file helper típus.
 * Jelenleg a futó LayoutView.fromJSON() már a réteges, tömbös layout formát használja,
 * ezért ezt direkt nem piszkáljuk tovább ebben a patchben.
 */
export interface ITrackLayoutFile {
  version: number;
  name: string;
  description?: string;
  settings: IEditorSettings;
  layers: IEditorLayers;
}