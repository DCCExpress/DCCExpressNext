import {
  BLOCK_TYPES,
  type BlockType,
  ELEMENT_TYPES,
} from "../elementTypes.js";
import type {
  BlockElementDto,
} from "../layoutDto.js";
import {
  TrackElement,
} from "../model/TrackElement.js";

export class BlockElement extends TrackElement {
  override type: typeof ELEMENT_TYPES.TRACK_BLOCK =
    ELEMENT_TYPES.TRACK_BLOCK;

  text: string = "HELLO";
  textColor: string = "black";
  locoAddress: number = 0;
  length: number = 1;
  sensorAddress: number = 0;
  blockType: BlockType = BLOCK_TYPES.NORMAL;

  constructor(x: number, y: number) {
    super(x, y);
    this.layerName = "blocks";
    this.rotationStep = 90;
    this.w = 3;
    this.h = 1;
  }

  static fromJSON(data: BlockElementDto): BlockElement {
    const element = new BlockElement(data.x, data.y);
    element.id = data.id;
    element.name = data.name;
    element.layerName = data.layerName;
    element.rotation = data.rotation;
    element.rotationStep = data.rotationStep;
    element.bg = data.bg;
    element.fg = data.fg;
    element.length = data.length ?? 100;
    element.sensorAddress = data.sensorAddress ?? 0;
    element.locoAddress = data.locoAddress ?? 0;
    element.blockType = data.blockType ?? BLOCK_TYPES.NORMAL;
    return element;
  }

  override toJSON(): BlockElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_BLOCK,
      locoAddress: this.locoAddress,
      length: this.length,
      sensorAddress: this.sensorAddress,
      blockType: this.blockType,
    };
  }
}
