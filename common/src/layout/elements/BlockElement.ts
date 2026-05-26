import {
  BLOCK_TYPES,
  type BlockType,
  ELEMENT_TYPES,
} from "../elementTypes.js";
import type {
  BlockElementDto,
} from "../layoutDto.js";
import type {
  IRect,
} from "../../Rect.js";
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

  /**
   * A blokk vizuálisan 3x1 overlay, de az x/y továbbra is
   * a blokkhoz tartozó középső fizikai síncella.
   */
  override getBounds(): IRect {
    if (this.rotation === 0 || this.rotation === 180) {
      return {
        x: this.x - 1,
        y: this.y,
        width: this.w,
        height: this.h,
      };
    }

    return {
      x: this.x,
      y: this.y - 1,
      width: this.h,
      height: this.w,
    };
  }

  /**
   * Ütközéshez nem a teljes vizuális overlayt foglaljuk,
   * hanem csak a blokk középső síncelláját.
   *
   * Így a blokk kattintható/kijelölhető a teljes rajzolt méretén,
   * de a szerkesztőben nem tiltja túl agresszíven a szomszédos elemeket.
   */
  override getCollisionBounds(): IRect {
    return {
      x: this.x,
      y: this.y,
      width: 1,
      height: 1,
    };
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