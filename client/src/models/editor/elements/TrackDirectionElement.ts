import { generateId } from "../../../helpers";
import { TrackElement } from "./TrackElement";
import {
    DrawOptions,
    ELEMENT_TYPES,
    ITrackDirectionElement,
} from "../types/EditorTypes";
import { AddressedElement } from "../core/AddressedElement";
import { Point } from "../core/Rect";
import { drawTextWithRoundedBackground } from "../../../graphics";

export class TrackDirectionElement
    extends AddressedElement
    implements ITrackDirectionElement {

     type: typeof ELEMENT_TYPES.TRACK_DIRECTION =
        ELEMENT_TYPES.TRACK_DIRECTION;

    constructor(x: number, y: number) {
        super(x, y);

        this.type = ELEMENT_TYPES.TRACK_DIRECTION;
        this.rotationStep = 45;
        this.length = 200;
    }

   draw(ctx: CanvasRenderingContext2D, options?: DrawOptions): void {
        if (!this.visible) return;

        this.beginDraw(ctx, options);

        {
            
            //ctx.lineWidth = Globals.TrackWidth7;
            //ctx.strokeStyle = Colors.TrackPrimaryColor
            if(!this.enabled) {
                ctx.globalAlpha = this.alpha;
            }

            ctx.lineWidth = 7;
            ctx.strokeStyle = "black"

            if (this.rotation == 0 || this.rotation == 180) {
                ctx.beginPath();
                ctx.moveTo(this.posLeft, this.centerY);
                ctx.lineTo(this.posLeft + this.GridSizeX, this.centerY);
                ctx.stroke();
            }
            else if (this.rotation == 45 || this.rotation == 225) {
                ctx.beginPath();
                ctx.moveTo(this.PositionX, this.PositionY);
                ctx.lineTo(this.PositionX + this.GridSizeX, this.PositionY + this.GridSizeY);
                ctx.stroke();
            }
            else if (this.rotation == 90 || this.rotation == 270) {
                ctx.beginPath();
                ctx.moveTo(this.centerX, this.PositionY);
                ctx.lineTo(this.centerX, this.PositionY + this.GridSizeY);
                ctx.stroke();
            }
            else if (this.rotation == 135 || this.rotation == 315) {
                ctx.beginPath();
                ctx.moveTo(this.PositionX + this.GridSizeX, this.PositionY);
                ctx.lineTo(this.PositionX, this.PositionY + this.GridSizeY);
                ctx.stroke();
            }

            ctx.lineWidth = this.TrackWidth3;
            ctx.strokeStyle = this.stateColor

            var w4 = this.GridSizeX / 4

            if (this.rotation == 0 || this.rotation == 180) {
                ctx.beginPath();
                ctx.moveTo(this.posLeft + w4, this.centerY);
                ctx.lineTo(this.posRight - w4, this.centerY);
                ctx.stroke();
            }
            else if (this.rotation == 45 || this.rotation == 225) {
                ctx.beginPath();
                ctx.moveTo(this.posLeft + w4, this.posTop + w4);
                ctx.lineTo(this.posRight - w4, this.posBottom - w4);
                ctx.stroke();
            }
            else if (this.rotation == 90 || this.rotation == 270) {
                ctx.beginPath();
                ctx.moveTo(this.centerX, this.posTop + w4);
                ctx.lineTo(this.centerX, this.posBottom - w4);
                ctx.stroke();
            }
            else if (this.rotation == 135 || this.rotation == 315) {
                ctx.beginPath();
                ctx.moveTo(this.posRight - w4, this.posTop + w4);
                ctx.lineTo(this.posLeft + w4, this.posBottom - w4);
                ctx.stroke();
            }
        }

        this.drawDirectionArrow(ctx);
        
        if (options?.showOccupancySensorAddress) {
            drawTextWithRoundedBackground(ctx, this.posLeft, this.posBottom - 10, "#" + this.address.toString())
        }

        this.endDraw(ctx);
        
        

        super.drawSelection(ctx);
        //super.drawEnabled(ctx);
        super.draw(ctx)
    }
    /**
     * Lime színű háromszög az elem közepén.
     *
     * rotation = 0   -> jobbra
     * rotation = 45  -> jobbra-le
     * rotation = 90  -> le
     * rotation = 180 -> balra
     * stb.
     */
    private drawDirectionArrow(ctx: CanvasRenderingContext2D): void {
        this.beginDraw(ctx);

        const centerX = this.centerX;
        const centerY = this.centerY;

        const angle = this.rotation * Math.PI / 180;

        // Előre mutató egységvektor
        const fx = Math.cos(angle);
        const fy = Math.sin(angle);

        // Erre merőleges egységvektor
        const px = -fy;
        const py = fx;

        const arrowLength = 9;
        const arrowHalfWidth = 9;

        // Háromszög csúcsa előre
        const tipX = centerX + fx * arrowLength;
        const tipY = centerY + fy * arrowLength;

        // Hátsó él közepe
        const backX = centerX - fx * arrowLength * 0.65;
        const backY = centerY - fy * arrowLength * 0.65;

        // Hátsó két sarok
        const leftX = backX + px * arrowHalfWidth;
        const leftY = backY + py * arrowHalfWidth;

        const rightX = backX - px * arrowHalfWidth;
        const rightY = backY - py * arrowHalfWidth;

        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();

        ctx.fillStyle = "lime";
        ctx.fill();

        ctx.strokeStyle = "black";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        this.endDraw(ctx);
    }

    /**
     * A TrackDirectionElement "előre" irányába eső
     * szomszédos rácspont.
     *
     * Fontos:
     * nálad a TrackBaseElement-ben a getNextItemXy()
     * nagy valószínűséggel már rotation-függően működik,
     * ezért ezt használjuk forwardnak.
     */
    getForwardItemXy(): Point {
        return this.getNextItemXy();
    }

    /**
     * A TrackDirectionElement "hátra" irányába eső
     * szomszédos rácspont.
     */
    getBackwardItemXy(): Point {
        return this.getPrevItemXy();
    }

    /**
     * Megmondja, hogy egy adott pozíció
     * a direction element forward oldala-e.
     */
    isForwardTowards(pos: Point): boolean {
        return this.getForwardItemXy().isEqual(pos);
    }

    /**
     * Megmondja, hogy egy adott pozíció
     * a direction element backward oldala-e.
     */
    isBackwardTowards(pos: Point): boolean {
        return this.getBackwardItemXy().isEqual(pos);
    }

    static fromJSON(
        data: ITrackDirectionElement
    ): TrackDirectionElement {
        const track = new TrackDirectionElement(data.x, data.y);

        track.id = data.id;
        track.name = data.name;
        track.rotation = data.rotation;
        track.address = data.address;
        track.bg = data.bg;
        track.fg = data.fg;

        return track;
    }

    override clone(): TrackDirectionElement {
        const copy = new TrackDirectionElement(this.x, this.y);

        copy.id = generateId();
        copy.rotation = this.rotation;
        copy.rotationStep = this.rotationStep;
        copy.selected = this.selected;
        copy.address = this.address;
        copy.length = this.length;

        return copy;
    }

    override getHelp(): string {
    return `
        <h3 style="margin-top:0;">Track direction element</h3>
        <p>
            This element defines the reference forward travel direction
            for an entire connected track network.
        </p>
        <p>
            The direction is propagated automatically through the connected
            tracks and is used to determine whether a locomotive must travel
            forward or in reverse along a calculated route.
        </p>
        <ul>
            <li>You can rotate it with R</li>
            <li>The lime arrow shows the reference forward direction</li>
            <li>Each separate connected track network must contain exactly one direction element</li>
            <li>Missing or multiple direction elements in the same track network will cause route graph generation to fail</li>
        </ul>
    `;
}
}