import { IPoint } from "./models/editor/core/Rect";

const rad = Math.PI / 180.0

export function drawTextWithBackground(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    textColor: string = 'black',
    rectColor: string = 'lightgray'
) {
    
    const textMetrics = ctx.measureText(text);
    const padding = 2; 
    const textWidth = textMetrics.width;
    const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

    
    const rectWidth = textWidth + 2 * padding;
    const rectHeight = textHeight + 2 * padding;

    
    ctx.fillStyle = rectColor;
    ctx.fillRect(x, y, rectWidth, rectHeight);

    
    ctx.fillStyle = textColor;
    const textX = x + padding;
    const textY = y + padding + textMetrics.actualBoundingBoxAscent;
    ctx.fillText(text, textX, textY);
}

export function drawTextWithRoundedBackground(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    textColor: string = "black",
    rectColor: string = "lightgray",
    borderRadius: number = 2,
    padding: number = 2
) {
    ctx.save();

    const textMetrics = ctx.measureText(text);

    const textWidth = textMetrics.width;
    const textHeight =
        textMetrics.actualBoundingBoxAscent +
        textMetrics.actualBoundingBoxDescent;

    const rectWidth = textWidth + 2 * padding;
    const rectHeight = textHeight + 2 * padding;

    // x, y a doboz KÖZEPE
    const rectX = x - rectWidth / 2;
    const rectY = y - rectHeight / 2;

    const radius = Math.min(
        borderRadius,
        rectWidth / 2,
        rectHeight / 2
    );

    // Háttér
    ctx.fillStyle = rectColor;
    ctx.beginPath();
    ctx.moveTo(rectX + radius, rectY);
    ctx.lineTo(rectX + rectWidth - radius, rectY);
    ctx.quadraticCurveTo(
        rectX + rectWidth,
        rectY,
        rectX + rectWidth,
        rectY + radius
    );
    ctx.lineTo(rectX + rectWidth, rectY + rectHeight - radius);
    ctx.quadraticCurveTo(
        rectX + rectWidth,
        rectY + rectHeight,
        rectX + rectWidth - radius,
        rectY + rectHeight
    );
    ctx.lineTo(rectX + radius, rectY + rectHeight);
    ctx.quadraticCurveTo(
        rectX,
        rectY + rectHeight,
        rectX,
        rectY + rectHeight - radius
    );
    ctx.lineTo(rectX, rectY + radius);
    ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
    ctx.closePath();
    ctx.fill();

    // Szöveg a doboz közepére
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);

    ctx.restore();
}

export function drawRectangle(ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number, h: number,
    borderColor: string = 'black',
    fillColor: string = 'lightgray') {
    ctx.beginPath()
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 1
    ctx.rect(x, y, w, h);
    ctx.stroke()
}

export function getPolarXy(cx: number, cy: number, r: number, theta: number): IPoint {
    return { x: cx + r * Math.cos(theta * rad), y: cy + r * Math.sin(theta * rad) }
}
export function drawPolarLine(
    ctx: CanvasRenderingContext2D,
    centerX: number, centerY: number,
    r: number, theta: number,
    color: string = "black", lineWidth: number = 1
): void {
    
    const x1 = centerX //+ r1 * Math.cos(theta1);
    const y1 = centerY //+ r1 * Math.sin(theta1);
    const x2 = centerX + r * Math.cos(theta * rad);
    const y2 = centerY + r * Math.sin(theta * rad);
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.closePath();
}

export function rotatePoint(x: number, y: number, cx: number, cy: number, a: number) {
  const cos = Math.cos(a);
  const sin = Math.sin(a);

  const dx = x - cx;
  const dy = y - cy;

  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export function getRotatedRectPoints(
  left: number,
  top: number,
  w: number,
  h: number,
  angle: number
) {
  const cx = left + w / 2;
  const cy = top + h / 2;

  return [
    rotatePoint(left, top, cx, cy, angle),
    rotatePoint(left + w, top, cx, cy, angle),
    rotatePoint(left + w, top + h, cx, cy, angle),
    rotatePoint(left, top + h, cx, cy, angle),
  ];
}

