import { ELEMENT_TYPES } from "../../../../../common/src/layout/elementTypes";
import type { RouteTurnoutItemDto } from "../../../../../common/src/layout/layoutDto";
import { drawPolarLine, getPolarXy } from "../../../graphics";
import { generateId } from "../../../helpers";
import { ClickableBaseElementView } from "../core/ClickableBaseElementView";
import { DrawOptions, IRouteButtonElement } from "../types/EditorTypes";
import { IEditableProperty } from "./PropertyDescriptor";

export type RouteTurnoutItem = RouteTurnoutItemDto;

export class RouteButtonElementView extends ClickableBaseElementView implements IRouteButtonElement {
    override type: typeof ELEMENT_TYPES.BUTTON_ROUTE = ELEMENT_TYPES.BUTTON_ROUTE;
    label: string = "Route";
    colorOn: string = "lime";
    active: boolean = false;

    /**
     * Legacy route button turnout states.
     *
     * Important: item.closed is the physical command-center turnout state.
     * It is captured from TrackTurnout*.turnoutClosed and is sent back to
     * wsApi.setTurnout(address, closed) unchanged.
     *
     * Do not interpret this field as the logical graph/script state.
     * Logical turnout closed state is:
     *
     *   physicalClosed === turnout.turnoutClosedValue
     */
    routeTurnouts: RouteTurnoutItem[] = [];


    constructor(x: number, y: number) {
        super(x, y);
        this.type = ELEMENT_TYPES.BUTTON_ROUTE;
        this.rotationStep = 45;
        this.layerName = "buildings"
        //this.addOrUpdateTurnout("c6bc4282-a7fd-4c70-817a-6b2fe6a2a765", true)
        //this.addOrUpdateTurnout("T2", false)
    }

 addOrUpdateTurnout(turnoutId: string, closed: boolean) {
    const existing = this.routeTurnouts.find((x) => x.turnoutId === turnoutId);

    if (existing) {
      existing.closed = closed;
      return;
    }

    this.routeTurnouts.push({
      turnoutId,
      closed,
    });
  }

  removeTurnout(turnoutId: string) {
    this.routeTurnouts = this.routeTurnouts.filter(
      (x) => x.turnoutId !== turnoutId
    );
  }
    drawArrowsSplit2(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number = 24
    ) {
        ctx.save();

        // pozicionálás + méretezés
        ctx.translate(x, y);
        const scale = size / 24;
        ctx.scale(scale, scale);

        ctx.strokeStyle = ctx.strokeStyle || "black";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // ---- első ág (alsó)
        ctx.beginPath();
        ctx.moveTo(21, 17);
        ctx.lineTo(15.6, 17); // közelítés (bezier helyett egyszerűsítve)

        ctx.moveTo(15.6, 17);
        ctx.bezierCurveTo(14, 17, 13, 16.5, 12, 15.5);
        ctx.bezierCurveTo(11.5, 15, 11.2, 14.5, 11, 14);

        ctx.moveTo(11, 14);
        ctx.bezierCurveTo(10, 12.5, 9, 12, 7, 12);
        ctx.lineTo(3, 12);

        ctx.stroke();

        // ---- felső ág
        ctx.beginPath();
        ctx.moveTo(21, 7);
        ctx.lineTo(15.6, 7);

        ctx.moveTo(15.6, 7);
        ctx.bezierCurveTo(14, 7, 13, 7.5, 12, 8.5);
        ctx.bezierCurveTo(11.5, 9, 11.2, 9.5, 11, 10);

        ctx.moveTo(11, 10);
        ctx.bezierCurveTo(10, 11.5, 9, 12, 7, 12);
        ctx.lineTo(3, 12);

        ctx.stroke();

        // ---- felső nyíl
        ctx.beginPath();
        ctx.moveTo(18, 10);
        ctx.lineTo(21, 7);
        ctx.lineTo(18, 4);
        ctx.stroke();

        // ---- alsó nyíl
        ctx.beginPath();
        ctx.moveTo(18, 20);
        ctx.lineTo(21, 17);
        ctx.lineTo(18, 14);
        ctx.stroke();

        ctx.restore();
    }
    draw(ctx: CanvasRenderingContext2D, options?: DrawOptions): void {
        if (!this.visible) return;

        this.beginDraw(ctx, options);
        // ctx.translate(this.PositionX, this.PositionY)
        // ctx.rotate(-90);
        // ctx.translate(-this.PositionX, -this.PositionY)
        // this.drawArrowsSplit2(ctx, this.PositionX, this.PositionY, 24) ;
        // this.endDraw(ctx);
        // return;
        {
            var fg = this.active ? "yellow" : "white"
            var bg = this.active ? "lime" : "#404040"
            const r = Math.min(this.width, this.height) / 2 - 2
            ctx.save()

            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = "black";
            ctx.fillStyle = bg;
            ctx.arc(this.centerX, this.centerY, r - 1, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();

            drawPolarLine(ctx, this.centerX, this.centerY, r - 6, 225, "white", 5)

            ctx.beginPath()
            ctx.lineWidth = 5
            ctx.strokeStyle = fg
            var p1 = getPolarXy(this.centerX, this.centerY, r - 6, 315)
            var p2 = getPolarXy(this.centerX, this.centerY, r - 6, 90)
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(this.centerX, this.centerY)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
        }

        this.endDraw(ctx);
        super.drawSelection(ctx);
        //super.draw(ctx)
    }

    override mouseDown(ev: MouseEvent) {
      //alert("Down")
    }

    override toJSON(): IRouteButtonElement {
        return {
            ...super.toJSON(),
            type: ELEMENT_TYPES.BUTTON_ROUTE,
            label: this.label,
            colorOn: this.colorOn,
            routeTurnouts: this.routeTurnouts ?? [],
        };
    }

    static fromJSON(data: IRouteButtonElement) : RouteButtonElementView{
       const e = new RouteButtonElementView(data.x, data.y);
        e.id = data.id;
        e.name = data.name;
        e.rotation = data.rotation;
        e.bg = data.bg;
        e.fg = data.fg;
        e.colorOn = data.colorOn;
        e.label = data.label;
        e.routeTurnouts = Array.isArray(data.routeTurnouts)
          ? data.routeTurnouts
            .filter((x: any) => typeof x?.turnoutId === "string")
            .map((x: any) => ({
              turnoutId: x.turnoutId,
              closed: Boolean(x.closed),
            }))
          : [];

        return e;      
    }

    override clone(): RouteButtonElementView {
        const copy = new RouteButtonElementView(this.x, this.y);
        copy.id = generateId();
        copy.rotation = this.rotation;
        copy.rotationStep = this.rotationStep;
        copy.selected = this.selected;
        copy.label = this.label;
        copy.colorOn = this.colorOn;
        copy.routeTurnouts = this.routeTurnouts.map(item => ({
            turnoutId: item.turnoutId,
            closed: item.closed,
        }));
        return copy;
    }

    override getEditableProperties(): IEditableProperty[] {
        return [
            ...super.getEditableProperties(),
            { label: "Turnouts", key: "routeTurnouts", type: "turnoutSelection", readonly: false, validate: (v) => { return true } },

        ]
    }

    getHelp(): string {
        return `
    <h3 style="margin-top:0;">Route button</h3>
    <p>
      This legacy route button sets a predefined list of turnouts when it is clicked in control mode.
    </p>

    <h4>Add turnouts</h4>
    <ul>
      <li>Click <b>Add turnouts</b> to enter turnout selection mode.</li>
      <li>While selection mode is active, click turnouts on the layout to add them to this route button.</li>
      <li>Click <b>Finish selection</b> when the turnout list is complete.</li>
    </ul>

    <h4>Editing turnout states</h4>
    <ul>
      <li>The turnout list shows every turnout assigned to this route button.</li>
      <li>Click a turnout preview in the list to switch the stored route state for that turnout.</li>
      <li>This only changes the route button configuration. It does not move the real turnout on the layout.</li>
      <li><b>Route state: C</b> means the route wants the turnout in its logical closed state.</li>
      <li><b>Route state: T</b> means the route wants the turnout in its logical thrown/diverging state.</li>
    </ul>

    <h4>Important turnout state note</h4>
    <p>
      Internally this legacy route button stores the physical command-center turnout state.
      The displayed C/T route state is calculated from the turnout's <code>turnoutClosedValue</code> setting.
      This is why the displayed state can be different from the raw physical boolean value.
    </p>
  `;
    }

}