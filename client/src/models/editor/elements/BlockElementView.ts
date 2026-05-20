import {
  beginElementDraw,
  degreesToRadians,
  drawElementBounds,
  drawElementIconPath,
  drawElementMarked,
  drawElementNeighbors,
  drawElementOccupied,
  drawElementSelection,
  endElementDraw,
  getBaseEditableProperties,
  getBaseHelp,
  getCenterX,
  getCenterY,
  getGridSizeX,
  getGridSizeY,
  getHeight,
  getPosBottom,
  getPosLeft,
  getPosRight,
  getPosTop,
  getPositionX,
  getPositionY,
  getWidth,
  noopFromJSON,
  noopMouseHandler,
} from "../core/view/support/BaseElementViewSupport";
import {
  drawTrackSectionInfo,
  getTrackStateColor,
  getTrackTravelDirectionArrow,
} from "../core/view/support/TrackElementViewSupport";
import {
  BlockElement as CommonBlockElement,
} from "../../../../../common/src/layout/elements/BlockElement";
import {
  BLOCK_TYPES,
  type BlockType,
  ELEMENT_TYPES,
} from "../../../../../common/src/layout/elementTypes";
import {
  generateId,
} from "../../../helpers";
import {
  getCanvasImage,
} from "../rendering/ImageCache";
import {
  DrawOptions,
  IBlockElement,
} from "../types/EditorTypes";
import {
  IEditableProperty,
} from "./PropertyDescriptor";
import i18n from "../../../i18n";

export class BlockElementView
  extends CommonBlockElement
  implements IBlockElement {
  get stateColor(): string {
    return getTrackStateColor(this);
  }

  drawSectionInfo(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    drawTrackSectionInfo(this, ctx, options);
  }

  getTravelDirectionArrow(): string {
    return getTrackTravelDirectionArrow(this);
  }


  selected: boolean = false;
  marked: boolean = false;
  enabled: boolean = true;
  alpha: number = 0.5;
  debug: boolean = false;

  get GridSizeX(): number {
    return getGridSizeX();
  }

  get GridSizeY(): number {
    return getGridSizeY();
  }

  get PositionX(): number {
    return getPositionX(this);
  }

  get PositionY(): number {
    return getPositionY(this);
  }

  get width(): number {
    return getWidth(this);
  }

  get height(): number {
    return getHeight(this);
  }

  get TrackWidth7(): number {
    return 7;
  }

  get TrackWidth3(): number {
    return 3;
  }

  get TrackPrimaryColor(): string {
    return "black";
  }

  beginDraw(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    beginElementDraw(this, ctx, options);
  }

  endDraw(ctx: CanvasRenderingContext2D): void {
    endElementDraw(this, ctx);
  }

  drawIconPath(
    ctx: CanvasRenderingContext2D,
    path: string,
    x: number,
    y: number,
    size: number,
    color = "black",
    strokeWidth = 2
  ): void {
    drawElementIconPath(
      ctx,
      path,
      x,
      y,
      size,
      color,
      strokeWidth
    );
  }

  drawMarked(ctx: CanvasRenderingContext2D): void {
    drawElementMarked(this, ctx);
  }

  drawOccupied(ctx: CanvasRenderingContext2D): void {
    drawElementOccupied(this, ctx);
  }

  drawSelection(ctx: CanvasRenderingContext2D): void {
    drawElementSelection(this, ctx);
  }

  drawEnabled(_ctx: CanvasRenderingContext2D): void {
    return;
  }

  mouseDown(ev: MouseEvent): void {
    noopMouseHandler(ev);
  }

  mouseUp(ev: MouseEvent): void {
    noopMouseHandler(ev);
  }

  fromJSON(data: any): void {
    noopFromJSON(data);
  }

  degreesToRadians(degrees: number): number {
    return degreesToRadians(degrees);
  }

  drawBounds(ctx: CanvasRenderingContext2D): void {
    drawElementBounds(this, ctx);
  }

  drawNeighbors(ctx: CanvasRenderingContext2D): void {
    drawElementNeighbors(this, ctx);
  }


  type: typeof ELEMENT_TYPES.TRACK_BLOCK =
    ELEMENT_TYPES.TRACK_BLOCK;

  /**
   * Csak kliensoldali, átmeneti overlay:
   * ha a task két blokk között halad,
   * mindkét érintett blokkban ezt a címet mutatjuk.
   */
  runtimeTransitLocoAddress: number = 0;

  /**
   * Csak runtime vizuális adat.
   * A blokk alatt fekvő valódi sín elem abszolút forward irányszöge.
   */
  runtimeForwardRotation: number | null = null;

  constructor(x: number, y: number) {
    super(x, y);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    options?: DrawOptions
  ): void {
    if (!this.visible) return;

    this.beginDraw(ctx, options);

    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.translate(-this.centerX, -this.centerY);

    const blockX = this.posLeft + 5;
    const blockY = this.posTop + 10;
    const blockW = this.width - 10;
    const blockH = this.height - 20;

    const occupied =
      this.locoAddress > 0;

    const inTransit =
      !occupied &&
      this.runtimeTransitLocoAddress > 0;

    const bg = occupied
      ? (options?.darkMode ? "#7f1d1d" : "#ffc9c9")
      : inTransit
        ? (options?.darkMode ? "#8a5a00" : "#ffe8a3")
        : options?.darkMode
          ? "#888888"
          : "#f0f0f0";

    const fg = "black";

    const displayLocoAddress =
      occupied
        ? this.locoAddress
        : this.runtimeTransitLocoAddress;

    const showBlockName =
      options?.showBlockNames === true &&
      this.name.trim().length > 0;

    const blockNameHeight = showBlockName ? 9 : 0;

    ctx.fillStyle = bg;
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1;

    ctx.fillRect(blockX, blockY, blockW, blockH);
    ctx.strokeRect(blockX, blockY, blockW, blockH);

    this.drawForwardDirectionTriangle(
      ctx,
      blockX,
      blockY,
      blockW,
      blockH
    );

    const withReadableOverlayAt180 = (
      drawFn: () => void
    ): void => {
      if (this.rotation === 180) {
        ctx.translate(this.centerX, this.centerY);
        ctx.rotate(Math.PI);
        ctx.translate(-this.centerX, -this.centerY);
      }

      drawFn();

      if (this.rotation === 180) {
        ctx.translate(this.centerX, this.centerY);
        ctx.rotate(-Math.PI);
        ctx.translate(-this.centerX, -this.centerY);
      }
    };

    const drawBlockName = (): void => {
      if (!showBlockName) return;

      ctx.fillStyle = fg;
      ctx.font = "bold 8px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      ctx.fillText(
        this.name.trim(),
        blockX + blockW / 2,
        blockY + 2
      );
    };

    if (displayLocoAddress <= 0) {
      withReadableOverlayAt180(() => {
        drawBlockName();
      });
    }

    if (displayLocoAddress > 0) {
      const loco = options?.locos?.find(
        item => item.address === displayLocoAddress
      );

      if (loco?.image) {
        const img = getCanvasImage(loco.image);

        if (img.naturalWidth > 0) {
          const padding = 2;

          const availableImageHeight =
            blockH - blockNameHeight - padding * 2;

          const maxW = blockW - padding * 2;
          const maxH = Math.max(1, availableImageHeight);

          const scale = Math.min(
            maxW / img.naturalWidth,
            maxH / img.naturalHeight
          );

          const imgW = img.naturalWidth * scale;
          const imgH = img.naturalHeight * scale;

          const contentY = blockY + blockNameHeight;
          const contentH = blockH - blockNameHeight;

          const imgX = blockX + (blockW - imgW) / 2;
          const imgY = contentY + (contentH - imgH) / 2;

          withReadableOverlayAt180(() => {
            drawBlockName();

            ctx.drawImage(
              img,
              imgX,
              imgY,
              imgW,
              imgH
            );

            ctx.fillStyle = fg;
            ctx.font = "8px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.fillText(
              "#" + displayLocoAddress.toString(),
              imgX - 10,
              contentY + contentH / 2
            );
          });
        }
      } else {
        withReadableOverlayAt180(() => {
          drawBlockName();

          ctx.fillStyle = fg;
          ctx.font = "8px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const addressY =
            blockY +
            blockNameHeight +
            (blockH - blockNameHeight) / 2;

          ctx.fillText(
            displayLocoAddress.toString(),
            blockX + blockW / 2,
            addressY
          );
        });
      }
    }

    this.drawSelection(ctx);
    this.endDraw(ctx);
  }

  private drawForwardDirectionTriangle(
    ctx: CanvasRenderingContext2D,
    blockX: number,
    blockY: number,
    blockW: number,
    blockH: number
  ): void {
    if (this.runtimeForwardRotation === null) {
      return;
    }

    const normalizeRotation = (angle: number): number => {
      const result = angle % 360;
      return result < 0 ? result + 360 : result;
    };

    const localForwardRotation =
      normalizeRotation(
        this.runtimeForwardRotation - this.rotation
      );

    const localForwardRad =
      localForwardRotation * Math.PI / 180;

    const pointsRight =
      Math.cos(localForwardRad) >= 0;

    const arrowLength = 4;
    const arrowHalfHeight = 3;
    const centerY = blockY + blockH / 2;
    const edgePadding = 2;

    const points = pointsRight
      ? {
        tipX: blockX + blockW - edgePadding,
        backX: blockX + blockW - edgePadding - arrowLength,
      }
      : {
        tipX: blockX + edgePadding,
        backX: blockX + edgePadding + arrowLength,
      };

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points.tipX, centerY);
    ctx.lineTo(points.backX, centerY - arrowHalfHeight);
    ctx.lineTo(points.backX, centerY + arrowHalfHeight);
    ctx.closePath();

    ctx.fillStyle = "gainsboro";
    ctx.fill();

    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  get posLeft(): number {
    return (this.x - 1) * this.GridSizeX;
  }

  get posRight(): number {
    return (this.x - 1) * this.GridSizeX + this.w * this.GridSizeX;
  }

  get posTop(): number {
    return this.y * this.GridSizeY;
  }

  get posBottom(): number {
    return this.y * this.GridSizeY + this.h * this.GridSizeY;
  }

  get centerX(): number {
    return this.x * this.GridSizeX + this.GridSizeX / 2;
  }

  get centerY(): number {
    return this.y * this.GridSizeY + this.GridSizeY / 2;
  }

  clone(): BlockElementView {
    const copy = new BlockElementView(
      this.x,
      this.y
    );

    copy.id = generateId();
    copy.name = this.name;
    copy.rotation = this.rotation;
    copy.rotationStep = this.rotationStep;
    copy.selected = this.selected;
    copy.bg = this.bg;
    copy.fg = this.fg;
    copy.address = this.address;
    copy.locoAddress = this.locoAddress;
    copy.length = this.length;
    copy.sensorAddress = this.sensorAddress;
    copy.blockType = this.blockType;

    return copy;
  }

  static fromJSON(
    data: IBlockElement
  ): BlockElementView {
    const element = new BlockElementView(
      data.x,
      data.y
    );

    element.id = data.id;
    element.name = data.name;
    element.layerName = data.layerName;
    element.rotation = data.rotation;
    element.rotationStep = data.rotationStep;
    element.bg = data.bg;
    element.fg = data.fg;
    element.address = data.address;
    element.length = data.length ?? 100;
    element.sensorAddress = data.sensorAddress ?? 0;

    /**
     * Futáskor majd runtime kezeli,
     * ezért induláskor nem töltjük vissza.
     */
    element.locoAddress = 0;

    element.blockType =
      data.blockType ?? BLOCK_TYPES.NORMAL;

    return element;
  }

  toJSON(): IBlockElement {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_BLOCK,
      address: this.address,
      length: this.length,
      locoAddress: this.locoAddress,
      sensorAddress: this.sensorAddress,
      blockType: this.blockType as BlockType,
    };
  }

  getEditableProperties(): IEditableProperty[] {
    return [
      ...getBaseEditableProperties(),
      {
        label: "Block type",
        key: "blockType",
        type: "blockTypeSelect",
        readonly: false,
      },
      {
        label: "Length",
        key: "length",
        type: "number",
        readonly: false,
        min: 1,
      },
      {
        label: "Occupancy sensor address",
        key: "sensorAddress",
        type: "number",
        readonly: false,
        min: 0,
      },
      {
        label: "Color ON",
        key: "colorOn",
        type: "colorpicker",
        readonly: false,
      },
    ];
  }

  getHelp(): string {
    return `
      <h3 style="margin-top:0;">
        ${i18n.t("help.block.title")}
      </h3>

      <p>
        ${i18n.t("help.block.description")}
      </p>

      <p>
        ${i18n.t("help.block.occupancyDescription")}
      </p>

      <ul>
        <li>
          <b>${i18n.t("help.block.fields.name.title")}</b>:
          ${i18n.t("help.block.fields.name.description")}
        </li>
        <li>
          <b>${i18n.t("help.block.fields.blockType.title")}</b>:
          ${i18n.t("help.block.fields.blockType.description")}
        </li>
        <li>
          <b>${i18n.t("help.block.fields.length.title")}</b>:
          ${i18n.t("help.block.fields.length.description")}
        </li>
        <li>
          <b>${i18n.t("help.block.fields.sensorAddress.title")}</b>:
          ${i18n.t("help.block.fields.sensorAddress.description")}
        </li>
      </ul>

      <h4>${i18n.t("help.block.types.title")}</h4>

      <ul>
        <li>
          <b>${i18n.t("help.block.types.normal.title")}</b>:
          ${i18n.t("help.block.types.normal.description")}
        </li>
        <li>
          <b>${i18n.t("help.block.types.station.title")}</b>:
          ${i18n.t("help.block.types.station.description")}
        </li>
        <li>
          <b>${i18n.t("help.block.types.terminal.title")}</b>:
          ${i18n.t("help.block.types.terminal.description")}
        </li>
        <li>
          <b>${i18n.t("help.block.types.staging.title")}</b>:
          ${i18n.t("help.block.types.staging.description")}
        </li>
        <li>
          <b>${i18n.t("help.block.types.siding.title")}</b>:
          ${i18n.t("help.block.types.siding.description")}
        </li>
        <li>
          <b>${i18n.t("help.block.types.yard.title")}</b>:
          ${i18n.t("help.block.types.yard.description")}
        </li>
      </ul>
    `;
  }
}
