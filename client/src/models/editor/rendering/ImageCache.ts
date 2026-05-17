const imageCache = new Map<string, HTMLImageElement>();

type ImageCacheListener = () => void;

const imageCacheListeners =
  new Set<ImageCacheListener>();

function notifyImageCacheListeners(): void {
  for (const listener of imageCacheListeners) {
    listener();
  }
}

export function subscribeCanvasImageCache(
  listener: ImageCacheListener
): () => void {
  imageCacheListeners.add(listener);

  return () => {
    imageCacheListeners.delete(listener);
  };
}

export function getCanvasImage(
  imageSrc: string
): HTMLImageElement {
  let img = imageCache.get(imageSrc);

  if (!img) {
    img = new Image();

    img.onload = () => {
      notifyImageCacheListeners();
    };

    img.onerror = () => {
      notifyImageCacheListeners();
    };

    img.src = imageSrc;

    imageCache.set(imageSrc, img);
  }

  return img;
}