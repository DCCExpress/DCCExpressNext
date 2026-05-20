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
  TrackElementViewMixin,
} from "../core/view/TrackElementViewMixin";
import {
  DrawOptions,
  IBlockElement,
} from "../types/EditorTypes";
import {
  IEditableProperty,
} from "./PropertyDescriptor";
import i18n from "../../../i18n";

export class BlockElementView
  extends TrackElementViewMixin(CommonBlockElement)
  implements IBlockElement {
  override type: typeof ELEMENT_TYPES.TRACK_BLOCK =
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

  override draw(
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

  override get posLeft(): number {
    return (this.x - 1) * this.GridSizeX;
  }

  override get posRight(): number {
    return (this.x - 1) * this.GridSizeX + this.w * this.GridSizeX;
  }

  override get posTop(): number {
    return this.y * this.GridSizeY;
  }

  override get posBottom(): number {
    return this.y * this.GridSizeY + this.h * this.GridSizeY;
  }

  override get centerX(): number {
    return this.x * this.GridSizeX + this.GridSizeX / 2;
  }

  override get centerY(): number {
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

  override toJSON(): IBlockElement {
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

  override getEditableProperties(): IEditableProperty[] {
    return [
      ...super.getEditableProperties(),
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

  override getHelp(): string {
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
