import { errorToString, generateId, showErrorMessage, showWarningMessage } from "../../../helpers";
import { audioManager } from "../../../services/audioManager";
import { BaseElement } from "../core/BaseElement";
import {
    DrawOptions,
    ELEMENT_TYPES,
    IAudioButtonElement,
} from "../types/EditorTypes";
import { IEditableProperty } from "./PropertyDescriptor";

export class AudioButtonElement
    extends BaseElement
    implements IAudioButtonElement {
    override type: typeof ELEMENT_TYPES.BUTTON_AUDIO = ELEMENT_TYPES.BUTTON_AUDIO;

    fileName: string = "";
    label: string = "Audio";

    private active = false;
    private activeTimer: number | null = null;

    constructor(x: number, y: number) {
        super(x, y);

        this.type = ELEMENT_TYPES.BUTTON_AUDIO;
        this.rotationStep = 45;
        this.layerName = "buildings";
    }

    play() {
        if (!this.fileName) {
            console.warn("[AudioButtonElement] audio fileName does not exist");
            showErrorMessage("Error", "[AudioButtonElement] audio fileName does not exist")
            return;
        }

        audioManager.play(this.fileName);
    }

    press(onChanged?: () => void) {
        if (!this.fileName) {
            console.warn("[AudioButtonElement] audio fileName does not exist");
            showWarningMessage("Warning", "[AudioButtonElement] audio fileName does not exist")
            return;
        }

        this.active = true;
        onChanged?.();

        audioManager.play(this.fileName, {
            onEnded: () => {
                this.active = false;
                onChanged?.();
            },

            onError: (error) => {
                this.active = false;
                showErrorMessage("ERROR", errorToString(error))
                onChanged?.();
            },
        });
    }

    draw(ctx: CanvasRenderingContext2D, options?: DrawOptions): void {
        if (!this.visible) return;

        this.beginDraw(ctx, options);

        if (!this.enabled) {
            ctx.globalAlpha = this.alpha;
        }

        // const p = 5;

        // ctx.lineWidth = 1;
        // ctx.strokeStyle = this.active ? this.colorOn : "gainsboro";
        // ctx.strokeRect(
        //     this.posLeft + p,
        //     this.posTop + p,
        //     this.width - 2 * p,
        //     this.height - 2 * p
        // );


        var w = this.GridSizeX - 10

        ctx.fillStyle = this.bg;
        if (!this.active) {
            ctx.globalAlpha = 0.80;
        }
        ctx.strokeStyle = "black";


        ctx.beginPath();
        ctx.roundRect(this.centerX - w / 2, this.centerY - w / 2, w, w, 5);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1;

        // ctx.fillStyle = "white";
        // ctx.fillStyle = this.active ? "black" : "white";
        // ctx.font = "8px Arial";
        // ctx.textAlign = "center";
        // ctx.textBaseline = "middle";
        // this.textOn = "JS";
        // this.textOff = "JS";
        // ctx.fillText(this.on ? this.textOn : this.textOff, this.centerX, this.centerY + 1);

        const iconSize = Math.min(this.width, this.height) - 14;
        const x = this.posLeft + 7;
        const y = this.posTop + 5;

        ctx.save();

        ctx.translate(x, y);
        ctx.scale(iconSize / 24, iconSize / 24);

        ctx.fillStyle = "black"; // this.active ? this.colorOn : "gray";

        // Speaker body
        ctx.beginPath();
        ctx.moveTo(5, 9);
        ctx.lineTo(5, 15);
        ctx.lineTo(9, 15);
        ctx.lineTo(14, 20);
        ctx.lineTo(14, 4);
        ctx.lineTo(9, 9);
        ctx.closePath();
        ctx.fill();

        // Sound wave
        ctx.beginPath();
        ctx.arc(15, 12, 3, -Math.PI / 2, Math.PI / 2);
        ctx.fill();

        ctx.restore();

        if (this.label) {
            ctx.save();

            ctx.fillStyle = "black"; // this.active ? this.colorOn : "gray"; 
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

    override toJSON(): IAudioButtonElement {
        return {
            ...super.toJSON(),
            type: ELEMENT_TYPES.BUTTON_AUDIO,
            fileName: this.fileName,
            label: this.label,
            bg: this.bg,
        };
    }

    static fromJSON(data: IAudioButtonElement): AudioButtonElement {
        const e = new AudioButtonElement(data.x, data.y);
        e.id = data.id;
        e.name = data.name;
        e.rotation = data.rotation;
        e.bg = data.bg;
        e.fg = data.fg;
        e.fileName = data.fileName;
        e.label = data.label;
        return e;
    }

    override clone(): AudioButtonElement {
        const copy = new AudioButtonElement(this.x, this.y);

        copy.id = generateId();
        copy.rotation = this.rotation;
        copy.rotationStep = this.rotationStep;
        copy.selected = this.selected;

        copy.fileName = this.fileName;
        copy.label = this.label;
        copy.bg = this.bg;

        return copy;
    }

    getEditableProperties(): IEditableProperty[] {
        return [
            ...super.getEditableProperties(),
            { key: "label", label: "Label", type: "string", },
            //{ key: "fileName", label: "Audio file", type: "string", },
            {
                key: "fileName", label: "Audio file", type: "audiofile", callback: () => {
                    this.press()
                }
            },
            { key: "bg", label: "Active color", type: "colorpicker", },
        ];
    }
    getHelp(): string {
        return `
      <h3 style="margin-top:0;">Audio button</h3>
      <p>Plays an audio file from the public/audio folder.</p>
      <ul>
        <li>Set fileName to something like horn.mp3</li>
        <li>Click the button in runtime mode to play it</li>
      </ul>
    `;
    }
}