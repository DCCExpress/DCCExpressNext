// client/src/components/track-canvas/trackCanvasDoubleTurnoutStandalonePopup.ts

import TrackTurnoutDoubleElementView from "../../models/editor/elements/TrackTurnoutDoubleElementView";
import {
  ElementPreviewRenderer,
} from "../../models/editor/rendering/ElementPreviewRenderer";
import {
  wsApi,
} from "../../services/wsApi";

type DoubleTurnoutPosition = {
  label: string;
  firstClosed: boolean;
  secondClosed: boolean;
};

const DOUBLE_TURNOUT_POSITIONS: DoubleTurnoutPosition[] = [
  {
    label: "O-O",
    firstClosed: false,
    secondClosed: false,
  },
  {
    label: "O-C",
    firstClosed: false,
    secondClosed: true,
  },
  {
    label: "C-O",
    firstClosed: true,
    secondClosed: false,
  },
  {
    label: "C-C",
    firstClosed: true,
    secondClosed: true,
  },
];

let activePopup: HTMLDivElement | null = null;
let activeOutsideHandler: ((event: MouseEvent | PointerEvent) => void) | null = null;
let activeKeyHandler: ((event: KeyboardEvent) => void) | null = null;

function getPhysicalValueForLogicalState(
  closedValue: boolean,
  logicalClosed: boolean
): boolean {
  return logicalClosed
    ? closedValue
    : !closedValue;
}

function createDoubleTurnoutPreview(
  selectedElement: TrackTurnoutDoubleElementView,
  firstClosed: boolean,
  secondClosed: boolean
): TrackTurnoutDoubleElementView {
  const turnout = new TrackTurnoutDoubleElementView(0, 0);

  turnout.rotation = selectedElement.rotation;
  turnout.turnout1Address = selectedElement.turnout1Address;
  turnout.turnout2Address = selectedElement.turnout2Address;
  turnout.turnout1ClosedValue = selectedElement.turnout1ClosedValue;
  turnout.turnout2ClosedValue = selectedElement.turnout2ClosedValue;

  turnout.turnout1Closed = getPhysicalValueForLogicalState(
    turnout.turnout1ClosedValue,
    firstClosed
  );

  turnout.turnout2Closed = getPhysicalValueForLogicalState(
    turnout.turnout2ClosedValue,
    secondClosed
  );

  return turnout;
}

function setDoubleTurnoutPosition(
  turnout: TrackTurnoutDoubleElementView,
  position: DoubleTurnoutPosition
): void {
  wsApi.setTurnout(
    turnout.turnout1Address,
    getPhysicalValueForLogicalState(
      turnout.turnout1ClosedValue,
      position.firstClosed
    )
  );

  wsApi.setTurnout(
    turnout.turnout2Address,
    getPhysicalValueForLogicalState(
      turnout.turnout2ClosedValue,
      position.secondClosed
    )
  );
}

export function closeStandaloneDoubleTurnoutPopover(): void {
  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }

  if (activeOutsideHandler) {
    window.removeEventListener("pointerdown", activeOutsideHandler, true);
    activeOutsideHandler = null;
  }

  if (activeKeyHandler) {
    window.removeEventListener("keydown", activeKeyHandler, true);
    activeKeyHandler = null;
  }
}

export function openStandaloneDoubleTurnoutPopover(
  turnout: TrackTurnoutDoubleElementView,
  clientX: number,
  clientY: number
): void {
  closeStandaloneDoubleTurnoutPopover();

  const popup = document.createElement("div");

  popup.className = "track-canvas-double-turnout-popup";
  popup.style.position = "fixed";
  popup.style.left = `${clientX + 12}px`;
  popup.style.top = `${clientY + 12}px`;
  popup.style.zIndex = "10000";
  popup.style.display = "flex";
  popup.style.gap = "4px";
  popup.style.padding = "4px";
  popup.style.background = "var(--mantine-color-body, #fff)";
  popup.style.border = "1px solid #444";
  popup.style.borderRadius = "6px";
  popup.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";

  popup.addEventListener("pointerdown", event => {
    event.stopPropagation();
  });

  popup.addEventListener("mousedown", event => {
    event.stopPropagation();
  });

  popup.addEventListener("click", event => {
    event.stopPropagation();
  });

  for (const position of DOUBLE_TURNOUT_POSITIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.style.width = "76px";
    button.style.height = "76px";
    button.style.border = "1px solid #444";
    button.style.borderRadius = "4px";
    button.style.background = "#e5e7eb";
    button.style.cursor = "pointer";
    button.style.padding = "0";
    button.style.display = "flex";
    button.style.flexDirection = "column";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.gap = "0";

    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 40;
    canvas.style.width = "40px";
    canvas.style.height = "40px";
    canvas.style.display = "block";

    const label = document.createElement("div");
    label.textContent = position.label;
    label.style.fontSize = "11px";
    label.style.lineHeight = "14px";
    label.style.color = "#111";
    label.style.userSelect = "none";

    button.appendChild(canvas);
    button.appendChild(label);

    ElementPreviewRenderer.renderToCanvas(
      canvas,
      createDoubleTurnoutPreview(
        turnout,
        position.firstClosed,
        position.secondClosed
      ),
      {
        showOccupancySensorAddress: false,
        showSensorAddress: false,
        showSignalAddress: false,
        showTurnoutAddress: false,
        locos: [],
      }
    );

    button.addEventListener("click", event => {
      event.stopPropagation();
      setDoubleTurnoutPosition(turnout, position);
      closeStandaloneDoubleTurnoutPopover();
    });

    popup.appendChild(button);
  }

  document.body.appendChild(popup);
  activePopup = popup;

  activeOutsideHandler = event => {
    if (activePopup?.contains(event.target as Node)) {
      return;
    }

    closeStandaloneDoubleTurnoutPopover();
  };

  activeKeyHandler = event => {
    if (event.key === "Escape") {
      closeStandaloneDoubleTurnoutPopover();
    }
  };

  window.setTimeout(() => {
    if (activeOutsideHandler) {
      window.addEventListener("pointerdown", activeOutsideHandler, true);
    }

    if (activeKeyHandler) {
      window.addEventListener("keydown", activeKeyHandler, true);
    }
  }, 0);
}
