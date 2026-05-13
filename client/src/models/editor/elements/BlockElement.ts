import Api from "../../../api/Api";
import { getRotatedRectPoints } from "../../../graphics";
import { generateId } from "../../../helpers";
import { BaseElement } from "../core/BaseElement";
import { IRect } from "../core/Rect";

import { DrawOptions, ELEMENT_TYPES, IBlockElement } from "../types/EditorTypes";
import { IEditableProperty } from "./PropertyDescriptor";
import { getCanvasImage } from "../rendering/ImageCache";

export class BlockElement extends BaseElement implements IBlockElement {
    override type: typeof ELEMENT_TYPES.TRACK_BLOCK = ELEMENT_TYPES.TRACK_BLOCK;
    text: string = 'HELLO';
    textColor: string = 'black';
    locoAddress: number = 0;
    length: number = 1;
    sensorAddress: number = 0;

    constructor(x: number, y: number) {
        super(x, y);
        this.layerName = "blocks";
        this.rotationStep = 90;
        this.w = 3;
        this.h = 1;
    }

    draw(ctx: CanvasRenderingContext2D, options?: DrawOptions): void {
        if (!this.visible) return;

        this.beginDraw(ctx, options);

        ctx.translate(this.centerX, this.centerY);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.translate(-this.centerX, -this.centerY);

        const r = this.getBounds();

        let bg = options?.darkMode ? "#888888" : "#f0f0f0";  // A színe lehet más is
        let fg = "black";

        ctx.fillStyle = bg!;  // A színe lehet más is
        ctx.strokeStyle = fg!;
        ctx.lineWidth = 1
        ctx.strokeStyle = 'black';

        ctx.fillRect(this.posLeft + 5, this.posTop + 10, this.width - 10, this.height - 20);
        ctx.strokeRect(this.posLeft + 5, this.posTop + 10, this.width - 10, this.height - 20);
        //ctx.strokeRect(this.posLeft + 10, this.centerY - h, this.width - 20, 2 * h);

        // if (this.locoAddress > 0) {
        //     ctx.fillStyle = fg;
        //     ctx.font = "8px Arial";
        //     ctx.textAlign = "center";
        //     ctx.textBaseline = "middle";
        //     ctx.fillText(this.locoAddress?.toString(), this.centerX, this.centerY + 1);
        // }

        // --- LOCO IMAGE ---
        if (this.locoAddress > 0) {
            const blockX = this.posLeft + 5;
            const blockY = this.posTop + 10;
            const blockW = this.width - 10;
            const blockH = this.height - 20;

            const loco = options?.locos?.find(
                l => l.address === this.locoAddress
            );

            if (loco?.image) {

                const img = getCanvasImage(loco.image);

                if (img.naturalWidth > 0) {
                    const padding = 3;

                    const maxW = blockW - padding * 2;
                    const maxH = blockH - padding * 2;

                    const scale = Math.min(
                        maxW / img.naturalWidth,
                        maxH / img.naturalHeight
                    );

                    const imgW = img.naturalWidth * scale;
                    const imgH = img.naturalHeight * scale;

                    const imgX = blockX + (blockW - imgW) / 2;
                    const imgY = blockY + (blockH - imgH) / 2;

                    ctx.drawImage(img, imgX, imgY, imgW, imgH);
                    ctx.fillStyle = fg;
                    ctx.font = "8px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("#" +this.locoAddress.toString(), imgX - 10, this.centerY + 1);

                }
            } else {
                // Ha nincs kép, maradhat a cím kiírása
                ctx.fillStyle = fg;
                ctx.font = "8px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(this.locoAddress.toString(), this.centerX, this.centerY + 1);
            }
        }

        this.drawSelection(ctx);
        this.endDraw(ctx);

    }

    override getBounds(): IRect {

        const c = Math.ceil(this.w / 2);
        if (this.rotation == 0 || this.rotation == 180) {
            return {
                x: this.x - 1, //this.posLeft,
                y: this.y,
                width: this.w,
                height: this.h
            }
        }

        return {
            x: this.x, //this.posLeft,
            y: this.y - 1,
            width: this.h,
            height: this.w
        }


        if (this.rotation == 0 || this.rotation == 180) {
            //alert("90")
            return {
                x: this.x, //this.posLeft,
                y: this.y,
                width: this.h,
                height: this.w
            }

        }
        //alert("90")
        return {
            x: this.x, //this.posLeft,
            y: this.y,
            width: this.h,
            height: this.w
        }
    }

    override get posLeft(): number {
        return (this.x - 1) * this.GridSizeX
    }
    override get posRight(): number {
        return (this.x - 1) * this.GridSizeX + this.w * this.GridSizeX
    }
    override get posTop(): number {
        return this.y * this.GridSizeY
    }
    override get posBottom(): number {
        return this.y * this.GridSizeY + this.h * this.GridSizeY
    }

    override get centerX(): number {
        return this.x * this.GridSizeX + this.GridSizeX / 2
    }
    override get centerY(): number {
        return this.y * this.GridSizeY + this.GridSizeY / 2
    }


    override clone(): BlockElement {
        const copy = new BlockElement(this.x, this.y);
        copy.id = generateId();
        copy.rotation = this.rotation;
        copy.rotationStep = this.rotationStep;
        copy.selected = this.selected;
        copy.locoAddress = this.locoAddress;
        return copy;
    }

    static fromJSON(data: IBlockElement): BlockElement {
        const e = new BlockElement(data.x, data.y);
        e.id = data.id;
        e.name = data.name;
        e.rotation = data.rotation;
        e.bg = data.bg;
        e.fg = data.fg;
        //e.length = data.length;
        //e.sensorAddress = data.sensorAddress;
        e.locoAddress = data.locoAddress;
        return e;
    }

    override toJSON(): IBlockElement {
        return {
            ...super.toJSON(),
            type: ELEMENT_TYPES.TRACK_BLOCK,
            locoAddress: this.locoAddress
        }
    }

    override getEditableProperties(): IEditableProperty[] {
        return [
            ...super.getEditableProperties(),
            { label: "Length", key: "length", type: "number", readonly: false },
            { label: "Sensor Address", key: "address", type: "number", readonly: false },
            { label: "Color ON", key: "colorOn", type: "colorpicker", readonly: false },
        ];
    }
}