import { BlockType, ELEMENT_TYPES, ElementType } from "../../../../../common/src/layout/elementTypes";
import { Loco } from "../../../../../common/src/types";
import { RouteTurnoutItem } from "../elements/RouteButtonElement";
import { SensorTypes } from "../elements/TrackSensorElement";



export type EditorTool =
  | { mode: "cursor", elementType: ElementType }
  | { mode: "draw", elementType: ElementType }
  | { mode: "delete", elementType: ElementType };

export type RotationStep = 0 | 45 | 90;

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

export interface IBaseElement {
  id: string;
  type: ElementType;
  name: string;
  layerName: string;
  x: number;
  y: number;
  rotation: number;
  rotationStep: RotationStep;
  bg: string;
  fg: string;
}

// export interface ITrackBaseElement extends IBaseElement   {
//   //length: number;
// }

export interface ITrackElement extends IBaseElement { 
  address: number,
  length: number,
}


export interface ITrackStraightElement extends ITrackElement {
  type: typeof ELEMENT_TYPES.TRACK_STRAIGHT;
}

export interface ITrackDirectionElement extends ITrackElement {
    type: typeof ELEMENT_TYPES.TRACK_DIRECTION;
}

export interface ITrackEndElement extends ITrackElement {
  type: typeof ELEMENT_TYPES.TRACK_END;
}

export interface ITrackCornerElement extends ITrackElement {
  type: typeof ELEMENT_TYPES.TRACK_CORNER;
}

export interface ITrackCurveElement extends ITrackElement {
  type: typeof ELEMENT_TYPES.TRACK_CURVE;
}

export interface ITrackCrossingElement extends ITrackElement {
  type: typeof ELEMENT_TYPES.TRACK_CROSSING;
}

export interface ITrackTurnoutLeftElement extends ITrackElement {
  type: typeof ELEMENT_TYPES.TRACK_TURNOUT_LEFT;
  turnoutAddress: number;
  turnoutClosedValue: boolean;
}

export interface ITrackTurnoutRightElement extends ITrackElement {
  type: typeof ELEMENT_TYPES.TRACK_TURNOUT_RIGHT;
  turnoutAddress: number;
  turnoutClosedValue: boolean;
}

export interface ITrackTurnoutTwoWayElement extends ITrackElement {
  type: typeof ELEMENT_TYPES.TRACK_TURNOUT_TWO_WAY;
}

export interface ITrackTurnoutDoubleElement extends ITrackElement {
  type: typeof ELEMENT_TYPES.TRACK_TURNOUT_DOUBLE;
  turnout1Address: number;
  turnout2Address: number;
}

export interface ITrackTurnoutThreeWayElement extends ITrackElement {
  type: typeof ELEMENT_TYPES.TRACK_TURNOUT_THREE_WAY;
  turnout1Address: number;
  turnout2Address: number;
}

export interface ITrackSensorElement extends ITrackElement {
  type: typeof ELEMENT_TYPES.TRACK_SENSOR;
  kind: SensorTypes;
  colorOn: string;
  colorOff: string;
  address: number;
  radius: number;
  // textOn: string;
  // textOff: string;
}

export interface IButtonElement extends IBaseElement {
  type: typeof ELEMENT_TYPES.BUTTON;
  colorOn: string;
  colorOff: string;
  textOn: string;
  textOff: string;
  address: number;
}

export interface IButtonScriptElement extends IBaseElement {
  type: typeof ELEMENT_TYPES.BUTTON_SCRIPT;
  colorOn: string;
  colorOff: string;
  textOn: string;
  textOff: string;
  script: string;
}


export interface IAudioButtonElement extends IBaseElement {
  type: typeof ELEMENT_TYPES.BUTTON_AUDIO;
  fileName: string;
  label: string;
}

export interface IRouteButtonElement extends IBaseElement {
  type: typeof ELEMENT_TYPES.BUTTON_ROUTE;
  colorOn: string;
  label: string;
  routeTurnouts: RouteTurnoutItem[] 
}

export interface IExtendedRouteButtonElement extends IBaseElement {
  type: typeof ELEMENT_TYPES.BUTTON_ROUTE_EXTENDED;
  label: string;
  fromBlockId: string;
  toBlockId: string;
}

export interface IClockElement extends IBaseElement {
  type: typeof ELEMENT_TYPES.CLOCK;
}

export interface IBlockElement extends ITrackElement {
  type: typeof ELEMENT_TYPES.TRACK_BLOCK;
  //text: string;
  length: number;
  // textColor: string;
  locoAddress: number;
  sensorAddress: number;
  blockType: BlockType;
}

export interface ITreeElement extends IBaseElement {
  type: typeof ELEMENT_TYPES.TREE;
}

export interface ILabelElement extends IBaseElement {
  type: typeof ELEMENT_TYPES.LABEL;
  text: string;
  fontSize: number;
  color: string;
  alignment: "left" | "center" | "right";
  offsetY: number;
  offsetX: number;
  
}

export interface ITrackSignalElement extends ITrackElement {
  type: typeof ELEMENT_TYPES.TRACK_SIGNAL2;
  aspect: number;
  address: number;
  addressLength: number;
  dispalyAsSingleLamp: boolean;
  valueGreen: number;
  valueRed: number;
  valueYellow: number;
  valueWhite: number;
}
// export interface ITrackSignal3Element extends IBaseElement {
//   type: typeof ELEMENT_TYPES.TRACK_SIGNAL2;
//   aspect: number;
// }

export type EditorElementData =
  | ITrackStraightElement
  | ITrackDirectionElement
  | ITrackEndElement
  | ITrackCornerElement
  | ITrackCurveElement
  | ITrackCrossingElement
  | ITrackTurnoutLeftElement
  | ITrackTurnoutRightElement
  | ITrackTurnoutTwoWayElement
  | ITrackTurnoutDoubleElement
  | ITrackTurnoutThreeWayElement
  | ITrackSensorElement
  | IButtonElement
  | IButtonScriptElement
  | IAudioButtonElement
  | IRouteButtonElement
  | IExtendedRouteButtonElement
  | IClockElement
  | IBlockElement
  | ITreeElement
  | ITrackSignalElement
  | ILabelElement
  
  ;
  // | ITrackSignal3Element
  // | ITrackSignal4Element
  // ;
//
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
export interface ITrackLayoutFile {
  version: number;
  name: string;
  description?: string;
  settings: IEditorSettings;
  //elements: any[];
  layers: IEditorLayers
}