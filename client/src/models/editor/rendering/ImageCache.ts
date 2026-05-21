const imageCache = new Map<string, HTMLImageElement>();

type ImageCacheListener = () => void;

const imageCacheListeners =
  new Set<ImageCacheListener>();

const MAX_IMAGES = 50;

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

export function getCanvasImage2(
  imageSrc: string
): HTMLImageElement {
  let img = imageCache.get(imageSrc);

  if (img) {
    imageCache.delete(imageSrc);
    imageCache.set(imageSrc, img);
    return img;
  }

  img = new Image();

  img.onload = () => {
    notifyImageCacheListeners();
  };

  img.onerror = () => {
    notifyImageCacheListeners();
  };

  img.src = imageSrc;

  imageCache.set(imageSrc, img);

  while (imageCache.size > MAX_IMAGES) {
    const oldestKey = imageCache.keys().next().value;
    if (!oldestKey) break;
    imageCache.delete(oldestKey);
  }

  return img;
}

export function getCanvasImage(imageSrc: string): HTMLImageElement {
  let img = imageCache.get(imageSrc);

  if (img) {
    imageCache.delete(imageSrc);
    imageCache.set(imageSrc, img);
    return img;
  }

  img = new Image();

  img.onload = () => notifyImageCacheListeners();
  img.onerror = () => notifyImageCacheListeners();
  img.src = imageSrc;

  imageCache.set(imageSrc, img);

  while (imageCache.size > MAX_IMAGES) {
    const oldestKey = imageCache.keys().next().value;
    if (!oldestKey) break;
    imageCache.delete(oldestKey);
  }

  return img;
}
export function clearCanvasImageCache(): void {
  imageCache.clear();
}