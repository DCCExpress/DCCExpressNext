import { Point } from "./Rect.js";
const directions = [
    { x: 1, y: 0 }, // 0° (jobbra)
    { x: 1, y: 1 }, // 45° (jobbra-le)
    { x: 0, y: 1 }, // 90° (le)
    { x: -1, y: 1 }, // 135° (balra-le)
    { x: -1, y: 0 }, // 180° (balra)
    { x: -1, y: -1 }, // 225° (balra-fel)
    { x: 0, y: -1 }, // 270° (fel)
    { x: 1, y: -1 }, // 315° (jobbra-fel)
];
export function getDirection(angle) {
    const a = ((angle % 360) + 360) % 360;
    const index = Math.round(a / 45) % directions.length;
    return directions[index];
}
export function getDirectionXy(point, angle) {
    const d = getDirection(angle);
    var p = new Point(point.x + d.x, point.y + d.y);
    return p;
}
export function getDistance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}
