import { generateId } from "../../../helpers";
import { ClickableBaseElement } from "../core/ClickableBaseElement";
import {
    DrawOptions,
    ELEMENT_TYPES,
    IExtendedRouteButtonElement,
} from "../types/EditorTypes";
import { IEditableProperty } from "./PropertyDescriptor";

export class ExtendedRouteButtonElement
    extends ClickableBaseElement
    implements IExtendedRouteButtonElement {
    override type: typeof ELEMENT_TYPES.BUTTON_ROUTE_EXTENDED =
        ELEMENT_TYPES.BUTTON_ROUTE_EXTENDED;

    label: string = "AUTO ROUTE";

    /**
     * Új, blokk-alapú automatikus route konfiguráció.
     */
    fromBlockId: string = "";
    toBlockId: string = "";

    /**
     * Legacy mezők:
     * csak azért maradnak most még bent,
     * hogy a PropertyPanelben lévő régi 22/2 tartalék függvények
     * ne törjék a TypeScript fordítást.
     *
     * Ezeket később nyugodtan kidobjuk.
     */
    fromSection: string = "";
    toSection: string = "";

    /**
     * Később ezzel lehet zölden jelezni,
     * hogy az útvonal aktív / beállított.
     */
    active: boolean = false;

    constructor(x: number, y: number) {
        super(x, y);

        this.type = ELEMENT_TYPES.BUTTON_ROUTE_EXTENDED;
        this.layerName = "buildings";

        this.w = 1;
        this.h = 1;
        this.rotationStep = 0;
    }

    override draw(ctx: CanvasRenderingContext2D, options?: DrawOptions): void {
        if (!this.visible) return;

        this.beginDraw(ctx, options);

        const x = this.posLeft + 2;
        const y = this.posTop + 2;
        const w = this.width - 4;
        const h = this.height - 4;

        const bg = this.active ? "#2f9e44" : "#343a40";
        const border = this.active ? "#69db7c" : "#74c0fc";
        const routeColor = this.active ? "#d3f9d8" : "#e7f5ff";
        const nodeColor = this.active ? "#b2f2bb" : "#94d82d";

        const centerY = this.centerY - 3;
        const leftNodeX = this.centerX - 9;
        const rightNodeX = this.centerX + 9;

        ctx.save();

        // Külső lekerekített gomb
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fillStyle = bg;
        ctx.fill();

        ctx.lineWidth = 1;
        ctx.strokeStyle = border;
        ctx.stroke();

        // Középső összekötő vonal
        ctx.beginPath();
        ctx.moveTo(leftNodeX + 5, centerY);
        ctx.lineTo(rightNodeX - 5, centerY);
        ctx.strokeStyle = routeColor;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.stroke();

        // Bal pötty
        ctx.beginPath();
        ctx.arc(leftNodeX, centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();
        ctx.strokeStyle = "#1a1b1e";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Jobb pötty
        ctx.beginPath();
        ctx.arc(rightNodeX, centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();
        ctx.strokeStyle = "#1a1b1e";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Alsó rövid felirat
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const routeText =
            this.fromBlockId && this.toBlockId
                ? "READY"
                : "AUTO";

        ctx.fillText(routeText, this.centerX, this.centerY + 10);

        ctx.restore();

        this.endDraw(ctx);
        super.drawSelection(ctx);
    }

    override mouseDown(_ev: MouseEvent): void {
        // A valódi gráfos route indítást a TrackCanvas kezeli.
    }

    override toJSON(): IExtendedRouteButtonElement {
        return {
            ...super.toJSON(),
            type: ELEMENT_TYPES.BUTTON_ROUTE_EXTENDED,
            label: this.label,
            fromBlockId: this.fromBlockId,
            toBlockId: this.toBlockId,
        };
    }

    static fromJSON(
        data: IExtendedRouteButtonElement
    ): ExtendedRouteButtonElement {
        const e = new ExtendedRouteButtonElement(data.x, data.y);

        e.id = data.id;
        e.name = data.name;
        e.rotation = data.rotation;
        e.bg = data.bg;
        e.fg = data.fg;

        e.label = data.label ?? "AUTO ROUTE";
        e.fromBlockId = data.fromBlockId ?? "";
        e.toBlockId = data.toBlockId ?? "";

        /**
         * Régi layout JSON-ekből esetleg még jöhetnek section mezők.
         * Ezeket csak eltároljuk legacyként, de az új logika nem használja.
         */
        e.fromSection = (data as any).fromSection ?? "";
        e.toSection = (data as any).toSection ?? "";

        return e;
    }

    override clone(): ExtendedRouteButtonElement {
        const copy = new ExtendedRouteButtonElement(this.x, this.y);

        copy.id = generateId();
        copy.rotation = this.rotation;
        copy.rotationStep = this.rotationStep;
        copy.selected = this.selected;

        copy.label = this.label;
        copy.fromBlockId = this.fromBlockId;
        copy.toBlockId = this.toBlockId;

        // Legacy mezők csak kompatibilitásból
        copy.fromSection = this.fromSection;
        copy.toSection = this.toSection;

        return copy;
    }

    override getEditableProperties(): IEditableProperty[] {
        return [
            ...super.getEditableProperties(),

            {
                label: "Label",
                key: "label",
                type: "string",
                readonly: false,
            },

            {
                label: "From block",
                key: "fromBlockId",
                type: "routeBlockSelect",
                readonly: false,
            },

            {
                label: "To block",
                key: "toBlockId",
                type: "routeBlockSelect",
                readonly: false,
            },
        ];
    }

    override getHelp(): string {
        return `
      <h3 style="margin-top:0;">Extended route button</h3>
      <p>
        This button represents an automatically calculated route
        between two railway blocks.
      </p>
      <ul>
        <li><b>From block</b>: the starting occupancy block</li>
        <li><b>To block</b>: the destination occupancy block</li>
        <li>The required turnout states will be calculated automatically</li>
        <li>Intermediate non-block segments may be part of the route</li>
      </ul>
    `;
    }
}