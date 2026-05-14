
import { SetTurnoutMessage } from "../../../../../common/src/types";
import Api from "../../../api/Api";
import { drawTextWithRoundedBackground } from "../../../graphics";
import { generateId } from "../../../helpers";
import { wsApi } from "../../../services/wsApi";
import { AddressedElement } from "../core/AddressedElement";
import { BaseElement } from "../core/BaseElement";
import { ClickableBaseElement } from "../core/ClickableBaseElement";
import { getDirectionXy } from "../core/helpers";
import { Point } from "../core/Rect";
import { DrawOptions, ELEMENT_TYPES, ElementType, ITrackCornerElement, ITrackTurnoutLeftElement } from "../types/EditorTypes";
import { IEditableProperty } from "./PropertyDescriptor";
import { TrackTurnoutRightElement } from "./TrackTurnoutRightElement";

export abstract class TrackTurnoutElement extends ClickableBaseElement {
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