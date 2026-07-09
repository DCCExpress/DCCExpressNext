import { ELEMENT_TYPES } from "../../../../../common/src/layout/elementTypes";
import { generateId } from "../../../helpers";
import { wsApi } from "../../../services/wsApi";
import { ClickableBaseElementView } from "../core/ClickableBaseElementView";
import { DrawOptions, IButtonElement } from "../types/EditorTypes";
import { IEditableProperty } from "./PropertyDescriptor";

export class ButtonElementView extends ClickableBaseElementView implements IButtonElement {
    override type = ELEMENT_TYPES.BUTTON;
    address: number = 0;
    on: boolean = false;
    colorOn: string = "lime";
    colorOff: string = "green";
    textOn: string = "ON";
    textOff: string = "OFF";

    constructor(x: number, y: number) {
        super(x, y);
        this.name = "Button";
        this.layerName = "buildings";
    }

    private sendBasicAccessoryCommand(): void {
        if (this.address <= 0) {
            console.warn("[ButtonElementView] Basic accessory address is missing");
            return;
        }

        wsApi.setBasicAccessory(this.address, !this.on);
    }

    override mouseDown(_ev: MouseEvent): void {
        this.sendBasicAccessoryCommand();
    }

    draw(ctx: CanvasRenderingContext2D, options?: DrawOptions): void {
        if (!this.visible) return;

        this.beginDraw(ctx, options);

        if (!this.enabled) {
            ctx.globalAlpha = this.alpha;
        }

        const w = this.GridSizeX - 10;

        ctx.fillStyle = this.on ? this.colorOn : this.colorOff;
        ctx.strokeStyle = "black";

        ctx.beginPath();
        ctx.roundRect(this.centerX - w / 2, this.centerY - w / 2, w, w, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = this.on ? "black" : "white";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.on ? this.textOn : this.textOff, this.centerX, this.centerY + 1);

        if (this.name) {
            ctx.font = "6px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillStyle = "black";
            ctx.fillText(this.name, this.posLeft + this.width / 2, this.posBottom - 5);
        }

        this.endDraw(ctx);
        super.drawSelection(ctx);
    }

    override toJSON(): IButtonElement {
        return {
            ...super.toJSON(),
            type: ELEMENT_TYPES.BUTTON,
            address: this.address,
            colorOn: this.colorOn,
            colorOff: this.colorOff,
            textOn: this.textOn,
            textOff: this.textOff,
        };
    }

    static fromJSON(data: IButtonElement): ButtonElementView {
        const e = new ButtonElementView(data.x, data.y);
        e.id = data.id;
        e.name = data.name;
        e.layerName = data.layerName;
        e.rotation = data.rotation;
        e.rotationStep = data.rotationStep;
        e.bg = data.bg;
        e.fg = data.fg;
        e.address = data.address ?? 0;
        e.colorOn = data.colorOn ?? "lime";
        e.colorOff = data.colorOff ?? "green";
        e.textOn = data.textOn ?? "ON";
        e.textOff = data.textOff ?? "OFF";
        return e;
    }

    override clone(): ButtonElementView {
        const copy = new ButtonElementView(this.x, this.y);
        copy.id = generateId();
        copy.name = this.name;
        copy.layerName = this.layerName;
        copy.rotation = this.rotation;
        copy.rotationStep = this.rotationStep;
        copy.selected = this.selected;
        copy.address = this.address;
        copy.on = this.on;
        copy.colorOn = this.colorOn;
        copy.colorOff = this.colorOff;
        copy.textOn = this.textOn;
        copy.textOff = this.textOff;
        return copy;
    }

    override getEditableProperties(): IEditableProperty[] {
        return [
            ...super.getEditableProperties(),
            {
                label: "Basic accessory address",
                key: "address",
                type: "number",
                readonly: false,
                validate: () => true,
            },
            {
                label: "Text ON",
                key: "textOn",
                type: "string",
                readonly: false,
            },
            {
                label: "Text OFF",
                key: "textOff",
                type: "string",
                readonly: false,
            },
            {
                label: "Color ON",
                key: "colorOn",
                type: "colorpicker",
                readonly: false,
            },
            {
                label: "Color OFF",
                key: "colorOff",
                type: "colorpicker",
                readonly: false,
            },
        ];
    }

    override getHelp(): string {
        return `
      <h3 style="margin-top:0;">Basic accessory button</h3>
      <p>Runtime módban kattintásra DCC basic accessory parancsot küld.</p>
      <ul>
        <li><b>Basic accessory address</b>: a DCC accessory címe.</li>
        <li>Kattintáskor az aktuális állapot ellenkezőjét küldi ki.</li>
        <li>Az ON/OFF szöveg és szín a gomb aktuális runtime állapotát mutatja.</li>
      </ul>
    `;
    }
}
