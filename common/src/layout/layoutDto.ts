// common/src/layout/layoutDto.ts

import type {
  BlockType,
  ElementType,
} from "./elementTypes.js";

/**
 * A szerkesztőben használt forgatási lépcső.
 * A kliensoldali editorban eddig RotationStep néven élt.
 */
export type RotationStepDto = 0 | 45 | 90;

/**
 * A régi RouteButton routeTurnouts mezőjének közös DTO-ja.
 */
export type RouteTurnoutItemDto = {
  turnoutId: string;
  closed: boolean;
};

export type AudioListButtonItemDto = {
  id: string;
  name: string;
  fileName: string;
};

/**
 * A szenzor kind mezője jelenleg kliensoldali numerikus enumként él:
 *   0 = circle
 *   1 = rect
 *
 * A mentett JSON-ban ez numerikus értékként jelenik meg,
 * ezért a közös DTO-ban most tudatosan number marad.
 */
export type SensorKindDto = number;

/**
 * Nyers, toleráns layout elem alak.
 *
 * Ezt használja a common/szerver oldali topológia beolvasáskor,
 * mert ott a mentett JSON-t robusztusan, default értékekkel dolgozzuk fel.
 *
 * A konkrét editor DTO-k lentebb ebből készülnek,
 * de ott már a fontos mezők kötelezők.
 */
export type SerializedLayoutElementDto = {
  id?: string;
  type?: ElementType | string;
  name?: string;
  layerName?: string;

  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
  rotationStep?: RotationStepDto;

  bg?: string;
  fg?: string;

  /**
   * Régi / kísérleti mező, a topology réteg továbbra is ismeri.
   */
  trackName?: string;

  /**
   * Track/sensor/accessory address.
   *
   * Fontos: a sima track elem address mezője tudatosan megmarad,
   * mert később ez lesz a sín elem occupancy szenzor címe.
   */
  address?: number;

  /**
   * Általános pályaelem hossz / későbbi modellezési adat.
   */
  length?: number;

  turnoutAddress?: number;
  turnoutClosedValue?: boolean;

  turnout1Address?: number;
  turnout2Address?: number;

  kind?: SensorKindDto;
  colorOn?: string;
  colorOff?: string;
  radius?: number;

  textOn?: string;
  textOff?: string;

  fileName?: string;
  label?: string;
  script?: string;
  audioItems?: AudioListButtonItemDto[];

  routeTurnouts?: RouteTurnoutItemDto[];

  fromBlockId?: string;
  toBlockId?: string;

  locoAddress?: number;
  sensorAddress?: number;
  blockType?: BlockType | string;

  text?: string;
  fontSize?: number;
  color?: string;
  alignment?: "left" | "center" | "right";
  offsetY?: number;
  offsetX?: number;

  aspect?: number;
  addressLength?: number;
  dispalyAsSingleLamp?: boolean;
  valueGreen?: number;
  valueRed?: number;
  valueYellow?: number;
  valueWhite?: number;

  [key: string]: unknown;
};

export type SerializedLayoutLayerDto = {
  id?: string;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  elements?: SerializedLayoutElementDto[];
};

export type SerializedLayoutDto = {
  gridSize?: number;
  _activeLayerId?: string;
  layers?: SerializedLayoutLayerDto[];
  [key: string]: unknown;
};

/**
 * Szigorúbb, kliensoldali mentési DTO-k.
 * Ezeket használja:
 *   - BaseElement.toJSON()
 *   - az egyes Element.fromJSON(...)
 *   - ElementFactory.create(...)
 */
export interface BaseElementDto {
  id: string;
  type: ElementType;
  name: string;
  layerName: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  rotationStep: RotationStepDto;
  bg: string;
  fg: string;
}

export interface TrackElementDto extends BaseElementDto {
  /**
   * Tudatosan marad a sima track DTO-n is:
   * ebből lesz később a track occupancy szenzor címe.
   */
  address: number;
  length: number;
}

export interface TrackStraightElementDto extends TrackElementDto {
  type: "trackstraight";
}

export interface TrackDirectionElementDto extends TrackElementDto {
  type: "trackdirection";
}

export interface TrackEndElementDto extends TrackElementDto {
  type: "trackend";
}

export interface TrackCornerElementDto extends TrackElementDto {
  type: "trackcorner";
}

export interface TrackCurveElementDto extends TrackElementDto {
  type: "trackcurve";
}

export interface TrackCrossingElementDto extends TrackElementDto {
  type: "trackcrossing";
}

export interface TrackTurnoutLeftElementDto extends TrackElementDto {
  type: "trackturnoutleft";
  turnoutAddress: number;
  turnoutClosedValue: boolean;
}

export interface TrackTurnoutRightElementDto extends TrackElementDto {
  type: "trackturnoutright";
  turnoutAddress: number;
  turnoutClosedValue: boolean;
}

export interface TrackTurnoutTwoWayElementDto extends TrackElementDto {
  type: "trackturnouttwoway";
}

export interface TrackTurnoutDoubleElementDto extends TrackElementDto {
  type: "trackturnoutdouble";
  turnout1Address: number;
  turnout2Address: number;
}

export interface TrackTurnoutThreeWayElementDto extends TrackElementDto {
  type: "trackturnouttreeway";
  turnout1Address: number;
  turnout2Address: number;
}

export interface TrackSensorElementDto extends TrackElementDto {
  type: "tracksensor";
  kind: SensorKindDto;
  colorOn: string;
  colorOff: string;
  address: number;
  radius: number;
}

export interface ButtonElementDto extends BaseElementDto {
  type: "button";
  colorOn: string;
  colorOff: string;
  textOn: string;
  textOff: string;
  address: number;
}

export interface ButtonScriptElementDto extends BaseElementDto {
  type: "buttonscript";
  colorOn: string;
  colorOff: string;
  textOn: string;
  textOff: string;
  script: string;
}

export interface AudioButtonElementDto extends BaseElementDto {
  type: "audiobutton";
  fileName: string;
  label: string;
}

export interface AudioListButtonElementDto extends BaseElementDto {
  type: "audiolistbutton";
  label: string;
  audioItems: AudioListButtonItemDto[];
}

export interface RouteButtonElementDto extends BaseElementDto {
  type: "routebutton";
  colorOn: string;
  label: string;
  routeTurnouts: RouteTurnoutItemDto[];
}

export interface ExtendedRouteButtonElementDto extends BaseElementDto {
  type: "extendedroutebutton";
  label: string;
  fromBlockId: string;
  toBlockId: string;
}

export interface ClockElementDto extends BaseElementDto {
  type: "clcok";
}

export interface BlockElementDto extends TrackElementDto {
  type: "trackblock";
  length: number;
  locoAddress: number;
  sensorAddress: number;
  blockType: BlockType;
}

export interface TreeElementDto extends BaseElementDto {
  type: "tree";
}

export interface LabelElementDto extends BaseElementDto {
  type: "label";
  text: string;
  fontSize: number;
  color: string;
  alignment: "left" | "center" | "right";
  offsetY: number;
  offsetX: number;
}

export interface TrackSignalElementDto extends TrackElementDto {
  type: "tracksignal2";
  aspect: number;
  address: number;
  addressLength: number;
  dispalyAsSingleLamp: boolean;
  valueGreen: number;
  valueRed: number;
  valueYellow: number;
  valueWhite: number;
}

export type LayoutElementDto =
  | TrackStraightElementDto
  | TrackDirectionElementDto
  | TrackEndElementDto
  | TrackCornerElementDto
  | TrackCurveElementDto
  | TrackCrossingElementDto
  | TrackTurnoutLeftElementDto
  | TrackTurnoutRightElementDto
  | TrackTurnoutTwoWayElementDto
  | TrackTurnoutDoubleElementDto
  | TrackTurnoutThreeWayElementDto
  | TrackSensorElementDto
  | ButtonElementDto
  | ButtonScriptElementDto
  | AudioButtonElementDto
  | AudioListButtonElementDto
  | RouteButtonElementDto
  | ExtendedRouteButtonElementDto
  | ClockElementDto
  | BlockElementDto
  | TreeElementDto
  | TrackSignalElementDto
  | LabelElementDto;