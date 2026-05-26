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
import { ClickableBaseElementView } from "../core/ClickableBaseElementView";
import type {
  DrawOptions,
  IAudioListButtonElement,
} from "../types/EditorTypes";
import type { IEditableProperty } from "./PropertyDescriptor";

export type AudioListButtonItem = AudioListButtonItemDto;

const AUDIO_LIST_POPUP_ID = "dcc-audio-list-button-popup";
const AUDIO_LIST_PLAY_BUTTON_SELECTOR = "[data-audio-list-play-id]";

let removeAudioListPopupListeners: (() => void) | null = null;

export class AudioListButtonElementView
  extends ClickableBaseElementView
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

  override mouseDown(ev: MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.showRuntimePopup(ev.clientX, ev.clientY);
  }

  private closeRuntimePopup(): void {
    removeAudioListPopupListeners?.();
    removeAudioListPopupListeners = null;
    document.getElementById(AUDIO_LIST_POPUP_ID)?.remove();
  }

  private stylePlayButton(
    play: HTMLButtonElement,
    active: boolean
  ): void {
    play.style.background = active
      ? "var(--mantine-primary-color-filled, #228be6)"
      : "var(--mantine-color-default, #f1f3f5)";
    play.style.color = active
      ? "white"
      : "inherit";
  }

  private updateRuntimePopupActiveStates(): void {
    const popup = document.getElementById(AUDIO_LIST_POPUP_ID);

    if (!popup) {
      return;
    }

    const buttons = popup.querySelectorAll<HTMLButtonElement>(
      AUDIO_LIST_PLAY_BUTTON_SELECTOR
    );

    buttons.forEach(button => {
      this.stylePlayButton(
        button,
        button.dataset.audioListPlayId === this.activeItemId
      );
    });
  }

  private showRuntimePopup(clientX: number, clientY: number): void {
    void clientX;
    this.closeRuntimePopup();

    const popup = document.createElement("div");
    popup.id = AUDIO_LIST_POPUP_ID;
    popup.style.position = "fixed";
    popup.style.left = "50%";
    popup.style.transform = "translateX(-50%)";
    popup.style.top = `${clientY + 12}px`;
    popup.style.minWidth = "280px";
    popup.style.maxWidth = "380px";
    popup.style.zIndex = "10000";
    popup.style.padding = "10px";
    popup.style.borderRadius = "8px";
    popup.style.border = "1px solid rgba(128,128,128,0.35)";
    popup.style.background = "var(--mantine-color-body, white)";
    popup.style.color = "var(--mantine-color-text, #222)";
    popup.style.boxShadow = "0 12px 30px rgba(0,0,0,0.25)";
    popup.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    popup.style.fontSize = "13px";

    popup.addEventListener("mousedown", event => {
      event.stopPropagation();
    });

    popup.addEventListener("pointerdown", event => {
      event.stopPropagation();
    });

    const header = document.createElement("div");
    header.style.display = "grid";
    header.style.gridTemplateColumns = "1fr auto";
    header.style.alignItems = "center";
    header.style.gap = "8px";
    header.style.marginBottom = "8px";

    const title = document.createElement("div");
    title.textContent = this.label || "Audio list";
    title.style.fontWeight = "700";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";
    title.style.whiteSpace = "nowrap";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.title = "Close";
    closeButton.style.width = "28px";
    closeButton.style.height = "28px";
    closeButton.style.borderRadius = "8px";
    closeButton.style.border = "1px solid rgba(128,128,128,0.35)";
    closeButton.style.cursor = "pointer";
    closeButton.style.background = "var(--mantine-color-default, #f1f3f5)";
    closeButton.style.color = "inherit";
    closeButton.style.fontSize = "18px";
    closeButton.style.lineHeight = "18px";

    closeButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      this.closeRuntimePopup();
    });

    header.appendChild(title);
    header.appendChild(closeButton);
    popup.appendChild(header);

    if (this.audioItems.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No audio rows configured.";
      empty.style.opacity = "0.65";
      popup.appendChild(empty);
    } else {
      for (const item of this.audioItems) {
        const row = document.createElement("div");
        row.style.display = "grid";
        row.style.gridTemplateColumns = "1fr auto";
        row.style.gap = "10px";
        row.style.alignItems = "center";
        row.style.padding = "6px 0";
        row.style.borderTop = "1px solid rgba(128,128,128,0.22)";

        const text = document.createElement("div");
        text.style.minWidth = "0";

        const name = document.createElement("div");
        name.textContent = item.name || "Audio";
        name.style.fontWeight = "600";
        name.style.overflow = "hidden";
        name.style.textOverflow = "ellipsis";
        name.style.whiteSpace = "nowrap";

        const fileName = document.createElement("div");
        fileName.textContent = item.fileName || "No file selected";
        fileName.style.opacity = "0.65";
        fileName.style.fontSize = "12px";
        fileName.style.overflow = "hidden";
        fileName.style.textOverflow = "ellipsis";
        fileName.style.whiteSpace = "nowrap";

        text.appendChild(name);
        text.appendChild(fileName);

        const play = document.createElement("button");
        play.type = "button";
        play.dataset.audioListPlayId = item.id;
        play.textContent = "▶";
        play.title = "Play audio";
        play.style.width = "32px";
        play.style.height = "32px";
        play.style.borderRadius = "8px";
        play.style.border = "1px solid rgba(128,128,128,0.35)";
        play.style.cursor = "pointer";
        this.stylePlayButton(play, this.isItemActive(item));

        play.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          this.playItem(item, () => {
            this.updateRuntimePopupActiveStates();
          });
        });

        row.appendChild(text);
        row.appendChild(play);
        popup.appendChild(row);
      }
    }

    const closeOnOutside = (event: MouseEvent | PointerEvent) => {
      if (!popup.contains(event.target as Node)) {
        this.closeRuntimePopup();
      }
    };

    window.setTimeout(() => {
      document.addEventListener("mousedown", closeOnOutside, true);
      document.addEventListener("pointerdown", closeOnOutside, true);

      removeAudioListPopupListeners = () => {
        document.removeEventListener("mousedown", closeOnOutside, true);
        document.removeEventListener("pointerdown", closeOnOutside, true);
      };
    }, 0);

    document.body.appendChild(popup);
    this.updateRuntimePopupActiveStates();
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
