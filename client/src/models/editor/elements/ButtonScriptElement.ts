import { generateId } from "../../../helpers";
import { BaseElement } from "../core/BaseElement";
import { DrawOptions, ELEMENT_TYPES, ElementType, IButtonElement, IButtonScriptElement, ITrackSensorElement } from "../types/EditorTypes";
import { ButtonElement } from "./ButtonElement";
import { IEditableProperty } from "./PropertyDescriptor";


export class ButtonScriptElement extends BaseElement implements IButtonScriptElement {
    type = ELEMENT_TYPES.BUTTON_SCRIPT;
    address: number = 0;
    on: boolean = true;
    colorOn: string = "lime";
    colorOff: string = "green";
    textOn: string = "ON";
    textOff: string = "OFF";
    script: string = "";
    

    draw(ctx: CanvasRenderingContext2D, options?: DrawOptions): void {
        if (!this.visible) return;

        this.beginDraw(ctx, options);

         var w = this.GridSizeX - 10

        ctx.fillStyle = this.on ? this.colorOn : "gray"
        ctx.strokeStyle = "black";


        ctx.beginPath();
        ctx.roundRect(this.centerX - w / 2, this.centerY - w / 2, w, w, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "white";
        ctx.fillStyle = this.on ? "black" : "white";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        this.textOn = "JS";
        this.textOff = "JS";
        ctx.fillText(this.on ? this.textOn : this.textOff, this.centerX, this.centerY + 1);

        // const p = "M15,20A1,1 0 0,0 16,19V4H8A1,1 0 0,0 7,5V16H5V5A3,3 0 0,1 8,2H19A3,3 0 0,1 22,5V6H20V5A1,1 0 0,0 19,4A1,1 0 0,0 18,5V9L18,19A3,3 0 0,1 15,22H5A3,3 0 0,1 2,19V18H13A2,2 0 0,0 15,20M9,6H14V8H9V6M9,10H14V12H9V10M9,14H14V16H9V14Z";
        // this.drawIconPath(ctx, p, 10, 10,24, "black", 1);

        this.endDraw(ctx);
        super.drawSelection(ctx)

    }

    override toJSON(): IButtonScriptElement {
        return {
            ...super.toJSON(),
            type: ELEMENT_TYPES.BUTTON_SCRIPT,
            colorOn: this.colorOn,
            colorOff: this.colorOff,
            textOn: this.textOn,
            textOff: this.textOff,
            script: this.script,
        };
    }

    override clone(): ButtonScriptElement {
        const copy = new ButtonScriptElement(this.x, this.y);
        copy.id = generateId();
        copy.rotation = this.rotation;
        copy.rotationStep = this.rotationStep;
        copy.selected = this.selected;
        copy.address = this.address;
        copy.colorOn = this.colorOn;
        copy.colorOff = this.colorOff;
        copy.textOn = this.textOn;
        copy.textOff = this.textOff;
        copy.script = this.script;
        return copy;
    }

    override getEditableProperties(): IEditableProperty[] {
        return [
            // { label: "Név", key: "name", type: "string" },
            // { label: "Forgatás", key: "rotation", type: "number" },
            ...super.getEditableProperties(),
            { label: "Szín", key: "colorOn", type: "colorpicker", readonly: false },
        ];
    }

}