import { drawTextWithRoundedBackground } from "../../../graphics";
import { generateId } from "../../../helpers";
import { BaseElement } from "../core/BaseElement";
import { DrawOptions, ELEMENT_TYPES, ILabelElement } from "../types/EditorTypes";
import { IEditableProperty } from "./PropertyDescriptor";



export class LabelElement extends BaseElement implements ILabelElement {
    override type = ELEMENT_TYPES.LABEL;
    layerName = "buildings";
    text: string = "Label";
    fontSize: number = 12;
    color: string = "#000000";
    alignment: "left" | "center" | "right" = "center";
    offsetY: number = 14;
    offsetX: number = 0;

    constructor(x: number, y: number) {
        super(x, y);
        this.rotationStep = 45;
        //this.trackType = data.trackType;
        //this.length = data.length ?? 80;
    }

    draw(ctx: CanvasRenderingContext2D, options?: DrawOptions): void {
        if (!this.visible) return;

        this.beginDraw(ctx, options);

        if (!this.enabled) {
            ctx.globalAlpha = this.alpha;
        }

        ctx.fillStyle = this.color;
        // ctx.font = this.fontStyle + " " + this.fontSize + " " + this.fontName;
        ctx.font = this.fontSize + "px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        var y = this.posTop - 1 + this.offsetY;
        var x = this.posLeft + 1 + this.offsetX;
        // if (this.valign == "center") {
        //     y = this.centerY - 4
        // } else if (this.valign == "bottom") {
        //     y = this.posBottom - 10
        // }
        //ctx.fillText(this.text, x, y);


        drawTextWithRoundedBackground(ctx, x, y,this.text,  this.color, this.bg, 2, 4)


        this.endDraw(ctx);
        super.drawSelection(ctx);
        super.draw(ctx)
    }




    override toJSON(): ILabelElement {
        return {
            ...super.toJSON(),
            type: ELEMENT_TYPES.LABEL,
            text: this.text,
            fontSize: this.fontSize,
            color: this.color,
            alignment: this.alignment,
            offsetY: this.offsetY,
            offsetX: this.offsetX,
        };
    }

    override clone(): LabelElement {
        const copy = new LabelElement(this.x, this.y);
        copy.id = generateId();
        copy.rotation = this.rotation;
        copy.rotationStep = this.rotationStep;
        copy.selected = this.selected;
        copy.text = this.text;
        copy.fontSize = this.fontSize;
        copy.color = this.color;
        copy.alignment = this.alignment;
        copy.offsetY = this.offsetY;
        copy.offsetX = this.offsetX;
        return copy;
    }

    override getEditableProperties(): IEditableProperty[] {
        return [
            // { label: "Név", key: "name", type: "string" },
            // { label: "Forgatás", key: "rotation", type: "number" },
            ...super.getEditableProperties(),
            { label: "Text", key: "text", type: "string", readonly: false },
            { label: "Color", key: "color", type: "colorpicker", readonly: false },
            { label: "Background", key: "bg", type: "colorpicker", readonly: false },
            { label: "Font Size", key: "fontSize", type: "number", readonly: false },
            { label: "Offset Y", key: "offsetY", type: "number", readonly: false },
            { label: "Offset X", key: "offsetX", type: "number", readonly: false },
        ];
    }

    getHelp(): string {
        return `
  `;
    }

}