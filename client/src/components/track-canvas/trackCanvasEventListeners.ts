// client/src/components/track-canvas/trackCanvasEventListeners.ts

export type TrackCanvasEventHandlers = {
  handleWheel: (event: WheelEvent) => void;
  handleMouseDown: (event: MouseEvent) => void;
  handleMouseLeave: (event: MouseEvent) => void;
  handleContextMenu: (event: MouseEvent) => void;
  handleMouseMove: (event: MouseEvent) => void;
  handleMouseUp: (event: MouseEvent) => void;
  handlePointerDown: (event: PointerEvent) => void;
  handlePointerMove: (event: PointerEvent) => void;
  handlePointerUp: (event: PointerEvent) => void;
  handlePointerCancel: (event: PointerEvent) => void;
};

export function registerTrackCanvasEventListeners(
  canvas: HTMLCanvasElement,
  handlers: TrackCanvasEventHandlers
): () => void {
  canvas.addEventListener(
    "wheel",
    handlers.handleWheel,
    { passive: false }
  );

  canvas.addEventListener(
    "mousedown",
    handlers.handleMouseDown
  );

  canvas.addEventListener(
    "mouseleave",
    handlers.handleMouseLeave
  );

  canvas.addEventListener(
    "contextmenu",
    handlers.handleContextMenu
  );

  canvas.addEventListener(
    "mousemove",
    handlers.handleMouseMove
  );

  canvas.addEventListener(
    "mouseup",
    handlers.handleMouseUp
  );

  canvas.addEventListener(
    "pointerdown",
    handlers.handlePointerDown,
    { passive: false }
  );

  canvas.addEventListener(
    "pointermove",
    handlers.handlePointerMove,
    { passive: false }
  );

  canvas.addEventListener(
    "pointerup",
    handlers.handlePointerUp
  );

  canvas.addEventListener(
    "pointercancel",
    handlers.handlePointerCancel
  );

  return () => {
    canvas.removeEventListener(
      "wheel",
      handlers.handleWheel
    );

    canvas.removeEventListener(
      "mousedown",
      handlers.handleMouseDown
    );

    canvas.removeEventListener(
      "mouseleave",
      handlers.handleMouseLeave
    );

    canvas.removeEventListener(
      "contextmenu",
      handlers.handleContextMenu
    );

    canvas.removeEventListener(
      "mousemove",
      handlers.handleMouseMove
    );

    canvas.removeEventListener(
      "mouseup",
      handlers.handleMouseUp
    );

    canvas.removeEventListener(
      "pointerdown",
      handlers.handlePointerDown
    );

    canvas.removeEventListener(
      "pointermove",
      handlers.handlePointerMove
    );

    canvas.removeEventListener(
      "pointerup",
      handlers.handlePointerUp
    );

    canvas.removeEventListener(
      "pointercancel",
      handlers.handlePointerCancel
    );
  };
}
