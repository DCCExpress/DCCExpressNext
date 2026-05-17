import { drawTextWithRoundedBackground } from "../../../graphics";
import { generateId } from "../../../helpers";
import { IEditableProperty } from "../elements/PropertyDescriptor";
import { DrawOptions, ITrackElement as ITrackElement, IBaseElement } from "../types/EditorTypes";
import { BaseElement } from "./BaseElement";

export enum TrackStates {
    free, selected, occupied
}

export type TravelDirection =
    | "unknown"
    | "forward"
    | "reverse";

export const TrackColors = { free: "gray", selected: "yellow", occupied: "red" }


export abstract class TrackElement extends BaseElement implements ITrackElement {
    address: number = 0;
    length: number = 200;

    state: TrackStates = TrackStates.free;
    section: number = 0;
    isRoute: boolean = false; // útvonal => sárgára
    travelDirection: TravelDirection = "unknown";
    isBusy: boolean = false;

    get stateColor(): string {

        if(this.isBusy) {
            return "orange"
        }
        if (this.isRoute) {
            return "yellow";
        }

        switch (this.state) {
            case TrackStates.selected: return TrackColors.selected;
            case TrackStates.occupied: return TrackColors.occupied;
        }
        return TrackColors.free;
    }

    protected drawSectionInfo(
        ctx: CanvasRenderingContext2D,
        options?: DrawOptions
    ): void {
        if (!options?.showSection || this.section <= 0) {
            return;
        }

        ctx.save();

        drawTextWithRoundedBackground(
            ctx,
            this.centerX,
            this.centerY + 12,
            "S" + this.section.toString(),
            "white",
            "black"
        );

        drawTextWithRoundedBackground(
            ctx,
            this.centerX,
            this.centerY - 0,
            this.getTravelDirectionArrow(),
            "white",
            "black",
            2,
            2
        );

        ctx.restore();
    }

    protected getTravelDirectionArrow(): string {
        if (this.travelDirection === "unknown") {
            return "?";
        }

        const target =
            this.travelDirection === "forward"
                ? this.getNextItemXy()
                : this.getPrevItemXy();

        const dx = target.x - this.pos.x;
        const dy = target.y - this.pos.y;

        if (dx > 0 && dy === 0) return "→";
        if (dx > 0 && dy > 0) return "↘";
        if (dx === 0 && dy > 0) return "↓";
        if (dx < 0 && dy > 0) return "↙";
        if (dx < 0 && dy === 0) return "←";
        if (dx < 0 && dy < 0) return "↖";
        if (dx === 0 && dy < 0) return "↑";
        if (dx > 0 && dy < 0) return "↗";

        return "?";
    }


    override toJSON(): ITrackElement {
        return {
            ...super.toJSON(),
            address: this.address,
            length: this.length
        };
    }

    // override clone(): TrackElement {
    //     const copy = new TrackElement(this.x, this.y);
    //     copy.id = generateId();
    //     copy.rotation = this.rotation;
    //     copy.rotationStep = this.rotationStep;
    //     copy.selected = this.selected;
    //     copy.address = this.address;
    //     return copy;
    // }

    // override getEditableProperties(): IEditableProperty[] {

    //     return [
    //         ...super.getEditableProperties(),
    //         { label: "Sensor Address", key: "address", type: "number", readonly: false, validate: (v) => { return v > 10 } },
    //     ];
    // }

    // drawAddress(ctx: CanvasRenderingContext2D) {
    //     this.beginDraw(ctx);
    //         drawTextWithRoundedBackground(ctx, this.posLeft, this.posBottom - 10, "#" + this.address.toString())
    //     this.endDraw(ctx);
    // }
}