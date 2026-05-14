import { drawTextWithRoundedBackground } from "../../../graphics";
import { generateId } from "../../../helpers";
import { IEditableProperty } from "../elements/PropertyDescriptor";
import { sampleLayout } from "../sample/sampleLayout";
import { ELEMENT_TYPES, ElementType } from "../types/EditorTypes";
import { DrawOptions, IBaseElement, RotationStep } from "../types/EditorTypes";
import { getDirectionXy } from "./helpers";
import { LayerId } from "./Layer";
import { IRect, Point } from "./Rect";

export enum RailStates {
    free, selected, occupied
}

export const RailColors = { free: "gray", selected: "yellow", occupied: "red" }


export abstract class BaseElement implements IBaseElement {
    id: string = "";
    type: ElementType = ELEMENT_TYPES.GENERAL;
    name: string = "element";
    layerName: LayerId = "track";
    // Ezek grid poziciók és méretek
    x: number;
    y: number;
    w: number = 1;
    h: number = 1;
    rotation: number = 0;
    rotationStep: RotationStep = 0;
    selected: boolean = false;
    marked: boolean = false; // benne van egy kiválaszási listában...
    enabled: boolean = true;
    locked: boolean = false;
    visible: boolean = true;
    isVisited: boolean = false; // 
    isRoute: boolean = false; // útvonal => sárgára
    bg: string = "black";
    fg: string = "white";
    occupied: boolean = false;
    alpha: number = 0.5;
    state: RailStates = RailStates.free;
    section: number = 0;
    debug: boolean = false;
    //length: number = 1;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;

    }

    rotateRight(): void {
        if (this.locked) return;
        this.rotation = this.normalizeRotation(this.rotation + this.rotationStep);
    }

    rotateLeft(): void {
        if (this.locked) return;
        this.rotation = this.normalizeRotation(this.rotation - this.rotationStep);
    }

    setRotation(rotation: number): void {
        if (this.locked) return;
        this.rotation = this.normalizeRotation(rotation);
    }

    moveBy(dx: number, dy: number): void {
        if (this.locked) return;
        this.x += dx;
        this.y += dy;
    }

    setPosition(x: number, y: number): void {
        if (this.locked) return;
        this.x = x;
        this.y = y;
    }

    get GridSizeX(): number { return sampleLayout.settings.gridSize; }
    get GridSizeY(): number { return sampleLayout.settings.gridSize; }

    public get PositionX(): number {
        return this.x * this.GridSizeX
    }

    public get PositionY(): number {
        return this.y * this.GridSizeY
    }

    get posLeft(): number {
        return this.x * this.GridSizeX
    }
    get posRight(): number {
        return this.x * this.GridSizeX + this.w * this.GridSizeX
    }
    get posTop(): number {
        return this.y * this.GridSizeY
    }
    get posBottom(): number {
        return this.y * this.GridSizeY + this.h * this.GridSizeY
    }
    public get centerX(): number {
        return this.x * this.GridSizeX + this.w * this.GridSizeX / 2
    }
    public get centerY(): number {
        return this.y * this.GridSizeY + this.h * this.GridSizeY / 2
    }
    get width(): number {
        return this.posRight - this.posLeft
    }
    get height(): number {
        return this.posBottom - this.posTop
    }

    get TrackWidth7(): number {
        return 7;
    }

    get TrackWidth3(): number {
        return 3;
    }

    get TrackPrimaryColor(): string {
        return "black";
    }

    get stateColor(): string {
        if (this.isRoute) {
            return "yellow";
        }

        switch (this.state) {
            case RailStates.selected: return RailColors.selected;
            case RailStates.occupied: return RailColors.occupied;
        }
        return RailColors.free;
    }

    protected normalizeRotation(value: number): number {
        let result = value % 360;
        if (result < 0) result += 360;
        return result;
    }

    protected beginDraw(ctx: CanvasRenderingContext2D, options?: DrawOptions): void {
        const x = options?.overrideX ?? this.x;
        const y = options?.overrideY ?? this.y;
        const scale = options?.scale ?? 1;
        const offsetX = options?.offsetX ?? 0;
        const offsetY = options?.offsetY ?? 0;

        ctx.save();
        ctx.translate(offsetX, offsetY);
        //ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.scale(scale, scale);

        if (options?.ghost) {
            ctx.globalAlpha = 0.5;
        }
    }

    protected endDraw(ctx: CanvasRenderingContext2D): void {
        ctx.restore();

        // if(this.marked) {
        //     this.drawMarked(ctx);
        // }

        if(this.section > 0) {
            ctx.save();
            drawTextWithRoundedBackground(ctx, this.centerX, this.posTop - 20, "#" + this.section.toString())
            ctx.restore()
        }

        if (this.debug) {
            this.drawNeighbors(ctx);
        }

    }

    drawIconPath(
        ctx: CanvasRenderingContext2D,
        path: string,
        x: number,
        y: number,
        size: number,
        color = "black",
        strokeWidth = 2
    ) {
        ctx.save();

        // Tabler ikonok alap viewBox-a általában 24x24
        const scale = size / 24;

        ctx.translate(x, y);
        ctx.scale(scale, scale);

        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const p = new Path2D(path);
        ctx.stroke(p);

        ctx.restore();
    }

    public drawMarked(ctx: CanvasRenderingContext2D): void {
        if (this.marked) {
            ctx.save();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#f6b83b";
            ctx.fillStyle = "#f6b83b33";
            ctx.strokeRect(this.posLeft, this.posTop, this.width, this.height);
            ctx.fillRect(this.posLeft, this.posTop, this.width, this.height);
            ctx.restore();
        }
    }

    protected drawOccupied(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        //ctx.lineWidth = 1;
        ctx.fillStyle = "#403b82f6";
        //ctx.setLineDash([4, 3]);
        ctx.fillRect(this.posLeft, this.posTop, this.width, this.height);
        ctx.restore();
    }

    drawSelection(ctx: CanvasRenderingContext2D): void {

        this.drawEnabled(ctx);

        if (this.selected) {

            this.beginDraw(ctx);
            // ctx.translate(this.centerX, this.centerY);
            // ctx.rotate(this.degreesToRadians(this.rotation));
            // ctx.rotate(0);
            // ctx.translate(-this.centerX, -this.centerY);
            var w2 = this.GridSizeX / 2.0
            var h2 = this.GridSizeY / 2.0
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = "red";

            ctx.strokeRect(this.posLeft, this.posTop, this.width, this.height);

            this.endDraw(ctx);
        }


    }

    protected drawEnabled(ctx: CanvasRenderingContext2D): void {
        return;
        if (!this.enabled) {
            ctx.save();
            ctx.fillStyle = "#6e6e6e67";
            ctx.fillRect(this.posLeft, this.posTop, this.width, this.height);
            ctx.restore();
        }
    }

    mouseDown(ev: MouseEvent) {
    }

    mouseUp(ev: MouseEvent) {
    }

    toJSON(): IBaseElement {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            layerName: this.layerName,
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            rotationStep: this.rotationStep,
            bg: this.bg,
            fg: this.fg,
        };
    }

    fromJSON(data: IBaseElement) {
        
    }

    draw(ctx: CanvasRenderingContext2D, options?: DrawOptions) {
        // if (this.debug) {
        //     this.drawNeighbors(ctx);
        // }
    }


    // getBounds(): Rect {
    //     return {
    //         x: this.posLeft,
    //         y: this.posTop,
    //         width: 100,
    //         height: 100,
    //     };
    //     // return {
    //     //     x: this.x - this.GridSizeX,
    //     //     y: this.y - this.GridSizeX,
    //     //     width: this.GridSizeX,
    //     //     height: this.GridSizeX,
    //     // };
    // }

    degreesToRadians(degrees: number) {
        return degrees * Math.PI / 180;
    }


    getBounds(): IRect {
        return {
            x: this.x, //this.posLeft,
            y: this.y,
            width: this.w,
            height: this.h
        }
    }

    drawBounds(ctx: CanvasRenderingContext2D) {
        const b = this.getBounds();

        //ctx.save();

        ctx.strokeStyle = "lime";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]); // szaggatott, jól látszik debughoz
        ctx.strokeRect(b.x * this.GridSizeX, b.y * this.GridSizeX, b.width * this.GridSizeX, b.height * this.GridSizeX);

        ctx.strokeStyle = "blue";
        ctx.strokeRect(b.x * this.GridSizeX, b.y * this.GridSizeX, this.GridSizeX, this.GridSizeX);

        //ctx.restore();
    }
    hitTest(px: number, py: number): boolean {
        const r = this.getBounds();
        const x2 = r.x + r.width;
        const y2 = r.y + r.height;
        return px >= r.x && py >= r.y && px < x2 && py < y2;

        return this.x == px && this.y == py;
    }

    abstract clone(): BaseElement;

    get pos(): Point {
        var p = new Point(this.x, this.y)
        return p;
    }

    getNextItemXy(): Point {
        return getDirectionXy(this.pos, this.rotation);
    }

    getPrevItemXy(): Point {
        return getDirectionXy(this.pos, this.rotation + 180);
    }

    getNeigbordsXy(): Point[] {
        var points: Point[] = [];
        points.push(this.getNextItemXy());
        points.push(this.getPrevItemXy());
        return points;
    }

    drawNeighbors(ctx: CanvasRenderingContext2D) {
        ctx.save();

        //var neighbors = this.getNeigbordsXy();

        const neighbors: Point[] = [];
        neighbors.push(this.getNextItemXy());
        neighbors.push(this.getPrevItemXy());

        ctx.fillStyle = "blue";
        neighbors.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x * this.GridSizeX + this.GridSizeX / 2, p.y * this.GridSizeY + this.GridSizeY / 2, 5, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    getEditableProperties(): IEditableProperty[] {
        return [
            { label: "Name", key: "name", type: "string", readonly: false },
            // { label: "Forgatás", key: "rotation", type: "number", readonly: true },
        ];
    }

    getHelp(): string {
        return `
    <h3 style="margin-top:0;">Base element</h3>
      `;
    }
}