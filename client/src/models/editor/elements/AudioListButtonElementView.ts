import type {
  AudioListButtonItemDto,
} from "../../../../../common/src/layout/layoutDto";
import { ELEMENT_TYPES } from "../../../../../common/src/layout/elementTypes";
import {
  errorToString,
  generateId,
  showErrorMessage,
  showWarningMessage,
} from "../../../helpers";
import i18n from "../../../i18n";
import { audioManager } from "../../../services/audioManager";
import { BaseElementView } from "../core/BaseElementView";
import type {
  DrawOptions,
  IAudioListButtonElement,
} from "../types/EditorTypes";
import type { IEditableProperty } from "./PropertyDescriptor";

export type AudioListButtonItem = AudioListButtonItemDto;

export class AudioListButtonElementView
  extends BaseElementView
  implements IAudioListButtonElement {
  override type: typeof ELEMENT_TYPES.BUTTON_AUDIO_LIST =
    ELEMENT_TYPES.BUTTON_AUDIO_LIST;

  label = "Audio list";
  audioItems: AudioListButtonItem[] = [];

  private activeItemId: string | null = null;

  constructor(x: number, y: number) {
    super(x, y);

    this.type = ELEMENT_TYPES.BUTTON_AUDIO_LIST;
    this.rotationStep = 45;
    this.layerName = "buildings";
    this.bg = "#f8f9fa";
    this.fg = "#212529";
  }

  playItem(item: AudioListButtonItem, onChanged?: () => void): void {
    if (!item.fileName) {
      showWarningMessage(
        i18n.t("common.warning"),
        i18n.t("audio.messages.fileNameMissing")
      );
      return;
    }

    this.activeItemId = item.id;
    onChanged?.();

    audioManager.play(item.fileName, {
      onEnded: () => {
        if (this.activeItemId === item.id) {
          this.activeItemId = null;
        }
        onChanged?.();
      },
      onError: (error) => {
        if (this.activeItemId === item.id) {
          this.activeItemId = null;
        }
        showErrorMessage(
          i18n.t("common.error"),
          errorToString(error)
        );
        onChanged?.();
      },
    });
  }

  isItemActive(item: AudioListButtonItem): boolean {
    return this.activeItemId === item.id;
  }

  draw(ctx: CanvasRenderingContext2D, options?: DrawOptions): void {
    if (!this.visible) return;

    this.beginDraw(ctx, options);

    if (!this.enabled) {
      ctx.globalAlpha = this.alpha;
    }

    const w = this.GridSizeX - 10;

    ctx.fillStyle = this.bg;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(this.centerX - w / 2, this.centerY - w / 2, w, w, 5);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(this.posLeft + 8, this.posTop + 7);
    ctx.scale((Math.min(this.width, this.height) - 16) / 24, (Math.min(this.width, this.height) - 16) / 24);

    ctx.strokeStyle = this.fg;
    ctx.fillStyle = this.fg;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(5, 8);
    ctx.lineTo(5, 16);
    ctx.lineTo(9, 16);
    ctx.lineTo(14, 20);
    ctx.lineTo(14, 4);
    ctx.lineTo(9, 8);
    ctx.closePath();
    ctx.fill();

    for (let i = 0; i < 3; i++) {
      const y = 7 + i * 5;
      ctx.beginPath();
      ctx.moveTo(17, y);
      ctx.lineTo(22, y);
      ctx.stroke();
    }

    ctx.restore();

    if (this.label) {
      ctx.save();
      ctx.fillStyle = this.fg;
      ctx.font = "6px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(
        this.label,
        this.posLeft + this.width / 2,
        this.posBottom - 5
      );
      ctx.restore();
    }

    this.endDraw(ctx);
    super.drawSelection(ctx);
  }

  override toJSON(): IAudioListButtonElement {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.BUTTON_AUDIO_LIST,
      label: this.label,
      audioItems: this.audioItems.map(item => ({
        id: item.id,
        name: item.name,
        fileName: item.fileName,
      })),
    };
  }

  static fromJSON(data: IAudioListButtonElement): AudioListButtonElementView {
    const e = new AudioListButtonElementView(data.x, data.y);

    e.id = data.id;
    e.name = data.name;
    e.rotation = data.rotation;
    e.rotationStep = data.rotationStep;
    e.bg = data.bg;
    e.fg = data.fg;
    e.label = data.label ?? "Audio list";
    e.audioItems = Array.isArray(data.audioItems)
      ? data.audioItems
        .filter((item: any) => item && typeof item === "object")
        .map((item: any) => ({
          id: typeof item.id === "string" && item.id
            ? item.id
            : generateId(),
          name: typeof item.name === "string"
            ? item.name
            : "Audio",
          fileName: typeof item.fileName === "string"
            ? item.fileName
            : "",
        }))
      : [];

    return e;
  }

  override clone(): AudioListButtonElementView {
    const copy = new AudioListButtonElementView(this.x, this.y);

    copy.id = generateId();
    copy.rotation = this.rotation;
    copy.rotationStep = this.rotationStep;
    copy.selected = this.selected;
    copy.label = this.label;
    copy.bg = this.bg;
    copy.fg = this.fg;
    copy.audioItems = this.audioItems.map(item => ({
      id: generateId(),
      name: item.name,
      fileName: item.fileName,
    }));

    return copy;
  }

  override getEditableProperties(): IEditableProperty[] {
    return [
      ...super.getEditableProperties(),
      { key: "label", label: "Label", type: "string" },
      { key: "audioItems", label: "Audio list", type: "audioList" },
      { key: "bg", label: "Background", type: "colorpicker" },
      { key: "fg", label: "Foreground", type: "colorpicker" },
    ];
  }

  override getHelp(): string {
    return `
      <h3 style="margin-top:0;">Audio list button</h3>
      <p>Shows a popup list of configured audio items in runtime mode.</p>
      <ul>
        <li>Use the Audio list editor to add rows.</li>
        <li>Each row has a display name and an audio file name.</li>
        <li>Click the button in runtime mode, then press play next to the desired sound.</li>
      </ul>
    `;
  }
}
