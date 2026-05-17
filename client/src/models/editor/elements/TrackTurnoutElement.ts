
import { drawTextWithRoundedBackground } from "../../../graphics";
import { wsApi } from "../../../services/wsApi";
import { TrackElement } from "../core/TrackElement";
import { Point } from "../core/Rect";
import { DrawOptions } from "../types/EditorTypes";
import { IEditableProperty } from "./PropertyDescriptor";

export abstract class TrackTurnoutElement extends TrackElement {
    //override type: typeof ELEMENT_TYPES.TRACK_TURNOUT = ELEMENT_TYPES.TRACK_TURNOUT;
    address: number = 0;
    turnoutLockedColor: string | CanvasGradient | CanvasPattern = "red";
    turnoutUnLockedColor: string | CanvasGradient | CanvasPattern = "white";
    turnoutAddress: number = 0;
    turnoutClosedValue: boolean = false;
    turnoutClosed: boolean = false;

    constructor(x: number, y: number) {
        super(x, y);
        this.rotationStep = 45;
    }

    override draw(ctx: CanvasRenderingContext2D, options?: DrawOptions): void {
        if (!this.visible) return;

        this.beginDraw(ctx, options);
        this.drawTurnout(ctx, this.isClosed);
        this.endDraw(ctx);

        this.beginDraw(ctx);
        if (options?.showTurnoutAddress) {
            drawTextWithRoundedBackground(ctx, this.posLeft, this.posBottom - 10, "#" + this.turnoutAddress.toString())
        }

        this.drawSectionInfo(ctx, options);
        this.endDraw(ctx);

        super.drawSelection(ctx);
    }

    abstract drawTurnout(ctx: CanvasRenderingContext2D, t1Closed: boolean): void;

    mouseDown(ev: MouseEvent) {
        //const closed = this.turnoutClosed == this.turnoutClosedValue;
        wsApi.setTurnout(this.turnoutAddress, !this.turnoutClosed);
    }

    toggle() {
        //const closed = this.turnoutClosed == this.turnoutClosedValue;
        wsApi.setTurnout(this.turnoutAddress, !this.turnoutClosed);
    }

    mouseUp(ev: MouseEvent) {
        //alert("UP")
    }


    get isClosed(): boolean {
        return this.turnoutClosed == this.turnoutClosedValue;
    }


    override getEditableProperties(): IEditableProperty[] {
        return [
            ...super.getEditableProperties(),
            { label: "Turnout Address", key: "turnoutAddress", type: "number", readonly: false, validate: (v) => { return true } },
            { label: "Closed Value", key: "turnoutClosedValue", type: "bittoggle", readonly: false, validate: (v) => { return true } },
        ];
    }

    abstract getConnections(): { entry: Point, straight: Point, div: Point } 

}