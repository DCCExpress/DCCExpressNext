import { useEffect, useLayoutEffect } from "react";

const STORAGE_KEY = "dccexpress.automation.editorState.v2";
const RESTORING_DATASET_KEY = "automationViewportRestoring";

type AutomationEditorState = {
  pageText?: string;
  selectedNodeId?: string;
  viewportTransform?: string;
};

type AutomationEditorStateBridgeProps = {
  opened: boolean;
};

type ParsedViewportTransform = {
  x: number;
  y: number;
  zoom: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function readStoredState(): AutomationEditorState {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!isRecord(parsed)) {
      return {};
    }

    return {
      ...(typeof parsed.pageText === "string" ? { pageText: parsed.pageText } : {}),
      ...(typeof parsed.selectedNodeId === "string" ? { selectedNodeId: parsed.selectedNodeId } : {}),
      ...(typeof parsed.viewportTransform === "string" ? { viewportTransform: parsed.viewportTransform } : {}),
    };
  } catch {
    return {};
  }
}

function writeStoredState(state: AutomationEditorState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Local storage may be disabled. The editor still works; only restore is skipped.
  }
}

function isRestoring(): boolean {
  return document.body.dataset[RESTORING_DATASET_KEY] === "true";
}

function setRestoring(restoring: boolean): void {
  if (restoring) {
    document.body.dataset[RESTORING_DATASET_KEY] = "true";
    return;
  }

  delete document.body.dataset[RESTORING_DATASET_KEY];
}

function getEditorRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".automation-flow-editor-body");
}

function getFlowRoot(root: HTMLElement | null = getEditorRoot()): HTMLElement | null {
  return root?.querySelector<HTMLElement>(".react-flow") ?? null;
}

function getViewport(root: HTMLElement | null = getEditorRoot()): HTMLElement | null {
  return root?.querySelector<HTMLElement>(".react-flow__viewport") ?? null;
}

function getPane(root: HTMLElement | null = getEditorRoot()): HTMLElement | null {
  return root?.querySelector<HTMLElement>(".react-flow__pane") ?? root?.querySelector<HTMLElement>(".react-flow__renderer") ?? null;
}

function setCanvasHidden(hidden: boolean): void {
  setRestoring(hidden);

  const flowRoot = getFlowRoot();
  if (!flowRoot) {
    return;
  }

  flowRoot.style.visibility = hidden ? "hidden" : "";
  flowRoot.style.pointerEvents = hidden ? "none" : "";
}

function getToolbarPageInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>(
    ".automation-flow-dialog-body [data-automation-toolbar-page-select='true'] input"
  );
}

function getToolbarPageRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    ".automation-flow-dialog-body [data-automation-toolbar-page-select='true']"
  );
}

function getCurrentPageText(): string | undefined {
  const text = normalizeText(getToolbarPageInput()?.value);
  return text.length > 0 ? text : undefined;
}

function getSelectedNodeId(root: HTMLElement): string | undefined {
  const node = root.querySelector<HTMLElement>(".react-flow__node.selected");
  const id = node?.getAttribute("data-id");
  return id && id.trim().length > 0 ? id : undefined;
}

function getViewportTransform(root: HTMLElement): string | undefined {
  const transform = getViewport(root)?.style.transform;
  return transform && transform.trim().length > 0 ? transform : undefined;
}

function dispatchMouseSequence(element: HTMLElement): void {
  for (const type of ["pointerdown", "mousedown", "mouseup", "click"]) {
    element.dispatchEvent(new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
    }));
  }
}

function openPageSelect(): void {
  const root = getToolbarPageRoot();
  const input = getToolbarPageInput();

  if (root) {
    dispatchMouseSequence(root);
  }

  if (input) {
    dispatchMouseSequence(input);
  }
}

function choosePageByText(pageText: string | undefined): void {
  const wanted = normalizeText(pageText);
  if (wanted.length === 0) {
    return;
  }

  const options = Array.from(document.querySelectorAll<HTMLElement>("[data-combobox-option], [role='option']"));
  const option = options.find(item => normalizeText(item.textContent) === wanted) ??
    options.find(item => normalizeText(item.textContent).startsWith(wanted)) ??
    options.find(item => normalizeText(item.textContent).includes(wanted));

  if (option) {
    dispatchMouseSequence(option);
  }
}

function restorePage(pageText: string | undefined): void {
  const wanted = normalizeText(pageText);
  if (wanted.length === 0 || normalizeText(getToolbarPageInput()?.value) === wanted) {
    return;
  }

  openPageSelect();
  for (const delay of [0, 40, 90, 180, 360, 720]) {
    window.setTimeout(() => choosePageByText(pageText), delay);
  }
}

function restoreViewport(transform: string | undefined): void {
  if (!transform) {
    return;
  }

  const viewport = getViewport();
  if (viewport) {
    viewport.style.transform = transform;
  }
}

function restoreSelectedNode(root: HTMLElement, nodeId: string | undefined): void {
  if (!nodeId) {
    return;
  }

  const node = Array.from(root.querySelectorAll<HTMLElement>(".react-flow__node"))
    .find(item => item.getAttribute("data-id") === nodeId);

  if (node) {
    dispatchMouseSequence(node);
  }
}

function parseViewportTransform(transform: string | undefined): ParsedViewportTransform {
  const translateMatch = transform?.match(/translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/u);
  const scaleMatch = transform?.match(/scale\((-?\d+(?:\.\d+)?)\)/u);

  return {
    x: translateMatch?.[1] ? Number(translateMatch[1]) : 0,
    y: translateMatch?.[2] ? Number(translateMatch[2]) : 0,
    zoom: scaleMatch?.[1] ? Number(scaleMatch[1]) : 1,
  };
}

function setViewportTransform(nextTransform: ParsedViewportTransform): void {
  const viewport = getViewport();
  if (!viewport) {
    return;
  }

  viewport.style.transform = `translate(${nextTransform.x}px, ${nextTransform.y}px) scale(${nextTransform.zoom})`;
}

function moveViewportToShowNode(root: HTMLElement, node: HTMLElement): void {
  const viewport = getViewport(root);
  const pane = getPane(root);
  if (!viewport || !pane) {
    return;
  }

  const paneRect = pane.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  const margin = 56;

  const isVisible = nodeRect.left >= paneRect.left + margin &&
    nodeRect.top >= paneRect.top + margin &&
    nodeRect.right <= paneRect.right - margin &&
    nodeRect.bottom <= paneRect.bottom - margin;

  if (isVisible) {
    return;
  }

  const current = parseViewportTransform(viewport.style.transform);
  setViewportTransform({
    ...current,
    x: current.x + (paneRect.left + margin - nodeRect.left),
    y: current.y + (paneRect.top + margin - nodeRect.top),
  });
}

function saveCurrentState(force = false): void {
  if (!force && isRestoring()) {
    return;
  }

  const root = getEditorRoot();
  if (!root) {
    return;
  }

  const previous = readStoredState();
  const pageText = getCurrentPageText();
  const selectedNodeId = getSelectedNodeId(root);
  const viewportTransform = getViewportTransform(root);
  const nextState: AutomationEditorState = { ...previous };

  if (pageText) {
    nextState.pageText = pageText;
  }

  if (selectedNodeId) {
    nextState.selectedNodeId = selectedNodeId;
  } else {
    delete nextState.selectedNodeId;
  }

  if (viewportTransform) {
    nextState.viewportTransform = viewportTransform;
  }

  writeStoredState(nextState);
}

function restoreCurrentState(): void {
  const root = getEditorRoot();
  const stored = readStoredState();
  if (!root) {
    return;
  }

  restorePage(stored.pageText);
  restoreViewport(stored.viewportTransform);
  restoreSelectedNode(root, stored.selectedNodeId);
}

function keepNewNodesVisible(root: HTMLElement, knownNodeIds: Set<string>): void {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(".react-flow__node"));
  const newNodes = nodes.filter(node => {
    const id = node.getAttribute("data-id");
    return id && !knownNodeIds.has(id);
  });

  for (const node of nodes) {
    const id = node.getAttribute("data-id");
    if (id) {
      knownNodeIds.add(id);
    }
  }

  const newestNode = newNodes[newNodes.length - 1];
  if (newestNode) {
    moveViewportToShowNode(root, newestNode);
  }
}

export default function AutomationEditorStateBridge({ opened }: AutomationEditorStateBridgeProps) {
  useLayoutEffect(() => {
    if (!opened) {
      setCanvasHidden(false);
      return;
    }

    setCanvasHidden(true);

    return () => setCanvasHidden(false);
  }, [opened]);

  useEffect(() => {
    if (!opened) {
      saveCurrentState(true);
      setCanvasHidden(false);
      return;
    }

    let canSave = false;
    const knownNodeIds = new Set<string>();
    const root = getEditorRoot();

    if (root) {
      for (const node of Array.from(root.querySelectorAll<HTMLElement>(".react-flow__node"))) {
        const id = node.getAttribute("data-id");
        if (id) {
          knownNodeIds.add(id);
        }
      }
    }

    setCanvasHidden(true);

    const restoreTimeouts = [0, 40, 80, 160, 320, 640, 1000, 1450, 1900].map(delay => (
      window.setTimeout(restoreCurrentState, delay)
    ));

    const revealTimeout = window.setTimeout(() => {
      restoreCurrentState();
      setCanvasHidden(false);
    }, 1550);

    const saveEnableTimeout = window.setTimeout(() => {
      restoreCurrentState();
      canSave = true;
    }, 2150);

    const observer = new MutationObserver(() => {
      const currentRoot = getEditorRoot();
      if (!currentRoot) {
        return;
      }

      keepNewNodesVisible(currentRoot, knownNodeIds);

      if (canSave) {
        saveCurrentState();
      } else {
        restoreViewport(readStoredState().viewportTransform);
      }
    });

    const observedRoot = getEditorRoot();
    if (observedRoot) {
      observer.observe(observedRoot, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "data-id", "checked", "value"],
      });
    }

    const intervalId = window.setInterval(() => {
      if (canSave) {
        saveCurrentState();
      }
    }, 600);

    return () => {
      restoreTimeouts.forEach(timeoutId => window.clearTimeout(timeoutId));
      window.clearTimeout(revealTimeout);
      window.clearTimeout(saveEnableTimeout);
      observer.disconnect();
      window.clearInterval(intervalId);
      setCanvasHidden(false);
      saveCurrentState(true);
    };
  }, [opened]);

  return null;
}
