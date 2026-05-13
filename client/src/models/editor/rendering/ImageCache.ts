
const imageCache = new Map<string, HTMLImageElement>();

export function getCanvasImage(imageSrc: string): HTMLImageElement {
    let img = imageCache.get(imageSrc);

    if (!img) {
        img = new Image();
        img.src = imageSrc;
        imageCache.set(imageSrc, img);
    }

    return img;
}