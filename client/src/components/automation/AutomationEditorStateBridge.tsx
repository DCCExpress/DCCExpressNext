import { useEffect, useLayoutEffect } from "react";

import {
  loadAutomationFlowWs,
  saveAutomationFlowWs,
} from "../../api/automationFlowWsApi";

const STORAGE_KEY = "dccexpress.automation.editorState.v3";
const RESTORING_DATASET_KEY = "automationViewportRestoring";

type PageViewport = {
  x: number;
  y: number;
  zoom: number;
};

type AutomationEditorState = {
  pageId?: string;
  selectedNodeId?: string;
  pageViewports?: Record<string, PageViewport>;
};

type AutomationEditorStateBridgeProps = {
  opened: boolean;
};

type EditorDocumentSnapshot = {
  activePageId?: string;
  pageNameById: Map<string, string>;
};

let serverPageViewports = new Map<string, PageViewport>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPageViewport(value: unknown): value is PageViewport {
  return isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.zoom);
}

function readStoredState(): AutomationEditorState {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!isRecord(parsed)) {
      return {};
    }

    const pageViewports: Record<string, PageViewport> = {};
    if (isRecord(parsed.pageViewports)) {
      for (const [pageId, viewport] of Object.entries(parsed.pageViewports)) {
        if (isPageViewport(viewport)) {
          pageViewports[pageId] = viewport;
        }
      }
    }

    return {
      ...(typeof parsed.pageId === "string" ? { pageId: parsed.pageId } : {}),
      ...(typeof parsed.selectedNodeId === "string" ? { selectedNodeId: parsed.selectedNodeId } : {}),
      ...(Object.keys(pageViewports).length > 0 ? { pageViewports } : {}),
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

function getToolbarPageRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    ".automation-flow-dialog-body [data-automation-toolbar-page-select='true']"
  );
}

function getToolbarPageInput(): HTMLInputElement | null {
  return getToolbarPageRoot()?.querySelector<HTMLInputElement>("input") ?? null;
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

function choosePageById(pageId: string | undefined, pageName: string | undefined): void {
  if (!pageId) {
    return;
  }

  const normalizedName = normalizeText(pageName);
  const options = Array.from(document.querySelectorAll<HTMLElement>("[data-combobox-option], [role='option']"));
  const option = options.find(item => item.getAttribute("value") === pageId) ??
    options.find(item => item.dataset.value === pageId) ??
    options.find(item => normalizedName.length > 0 && normalizeText(item.textContent) === normalizedName) ??
    options.find(item => normalizedName.length > 0 && normalizeText(item.textContent).startsWith(normalizedName));

  if (option) {
    dispatchMouseSequence(option);
  }
}

function readEditorDocumentSnapshot(root: HTMLElement): EditorDocumentSnapshot {
  for (const textarea of Array.from(root.querySelectorAll<HTMLTextAreaElement>("textarea"))) {
    try {
      const parsed: unknown = JSON.parse(textarea.value);
      if (!isRecord(parsed)) {
        continue;
      }

      const pageNameById = new Map<string, string>();
      if (Array.isArray(parsed.pages)) {
        for (const page of parsed.pages) {
          if (!isRecord(page) || typeof page.id !== "string") {
            continue;
          }

          pageNameById.set(page.id, typeof page.name === "string" ? page.name : page.id);
        }
      }

      return {
        ...(typeof parsed.activePageId === "string" ? { activePageId: parsed.activePageId } : {}),
        pageNameById,
      };
    } catch {
      // Not the JSON preview textarea.
    }
  }

  return { pageNameById: new Map<string, string>() };
}

function getCurrentPageId(root: HTMLElement): string | undefined {
  return readEditorDocumentSnapshot(root).activePageId;
}

function getSelectedNodeId(root: HTMLElement): string | undefined {
  const node = root.querySelector<HTMLElement>(".react-flow__node.selected");
  const id = node?.getAttribute("data-id");
  return id && id.trim().length > 0 ? id : undefined;
}

function parseViewportTransform(transform: string | undefined): PageViewport {
  const translateMatch = transform?.match(/translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/u);
  const scaleMatch = transform?.match(/scale\((-?\d+(?:\.\d+)?)\)/u);

  return {
    x: translateMatch?.[1] ? Number(translateMatch[1]) : 0,
    y: translateMatch?.[2] ? Number(translateMatch[2]) : 0,
    zoom: scaleMatch?.[1] ? Number(scaleMatch[1]) : 1,
  };
}

function getCurrentViewport(root: HTMLElement): PageViewport | undefined {
  const transform = getViewport(root)?.style.transform;
  if (!transform || transform.trim().length === 0) {
    return undefined;
  }

  return parseViewportTransform(transform);
}

function applyViewport(viewport: PageViewport | undefined): void {
  if (!viewport) {
    return;
  }

  const target = getViewport();
  if (!target) {
    return;
  }

  target.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
}

function getStoredViewport(pageId: string | undefined): PageViewport | undefined {
  if (!pageId) {
    return undefined;
  }

  return readStoredState().pageViewports?.[pageId] ?? serverPageViewports.get(pageId);
}

function storePageViewport(pageId: string | undefined, viewport: PageViewport | undefined): void {
  if (!pageId || !viewport || isRestoring()) {
    return;
  }

  const previous = readStoredState();
  writeStoredState({
    ...previous,
    pageId,
    pageViewports: {
      ...(previous.pageViewports ?? {}),
      [pageId]: viewport,
    },
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

  const pageId = getCurrentPageId(root);
  const viewport = getCurrentViewport(root);
  const selectedNodeId = getSelectedNodeId(root);
  const previous = readStoredState();

  const nextState: AutomationEditorState = {
    ...previous,
    ...(pageId ? { pageId } : {}),
    pageViewports: {
      ...(previous.pageViewports ?? {}),
      ...(pageId && viewport ? { [pageId]: viewport } : {}),
    },
  };

  if (selectedNodeId) {
    nextState.selectedNodeId = selectedNodeId;
  } else {
    delete nextState.selectedNodeId;
  }

  writeStoredState(nextState);
}

function restorePage(pageId: string | undefined): void {
  if (!pageId) {
    return;
  }

  const root = getEditorRoot();
  if (!root) {
    return;
  }

  const snapshot = readEditorDocumentSnapshot(root);
  if (snapshot.activePageId === pageId) {
    return;
  }

  openPageSelect();
  const pageName = snapshot.pageNameById.get(pageId);
  for (const delay of [0, 40, 90, 180, 360, 720]) {
    window.setTimeout(() => choosePageById(pageId, pageName), delay);
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

function restoreCurrentPageViewport(): void {
  const root = getEditorRoot();
  if (!root) {
    return;
  }

  applyViewport(getStoredViewport(getCurrentPageId(root)));
}

function restoreCurrentState(): void {
  const root = getEditorRoot();
  const stored = readStoredState();
  if (!root) {
    return;
  }

  restorePage(stored.pageId);
  window.setTimeout(restoreCurrentPageViewport, 0);
  window.setTimeout(restoreCurrentPageViewport, 80);
  window.setTimeout(restoreCurrentPageViewport, 180);
  restoreSelectedNode(root, stored.selectedNodeId);
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
  applyViewport({
    ...current,
    x: current.x + (paneRect.left + margin - nodeRect.left),
    y: current.y + (paneRect.top + margin - nodeRect.top),
  });
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
    const pageId = getCurrentPageId(root);
    storePageViewport(pageId, getCurrentViewport(root));
  }
}

async function refreshServerPageViewports(): Promise<void> {
  try {
    const document = await loadAutomationFlowWs();
    serverPageViewports = new Map(
      document.pages.flatMap(page => (
        isFiniteNumber(page.viewportX) && isFiniteNumber(page.viewportY) && isFiniteNumber(page.viewportZoom)
          ? [[page.id, { x: page.viewportX, y: page.viewportY, zoom: page.viewportZoom } satisfies PageViewport]]
          : []
      ))
    );
  } catch (error) {
    console.warn("[AutomationEditorStateBridge] Page viewport load failed:", error);
  }
}

async function persistPageViewportsToServer(): Promise<void> {
  const stored = readStoredState();
  const pageViewports = stored.pageViewports ?? {};
  if (Object.keys(pageViewports).length === 0) {
    return;
  }

  try {
    const document = await loadAutomationFlowWs();
    const nextDocument = {
      ...document,
      pages: document.pages.map(page => {
        const viewport = pageViewports[page.id];
        return viewport
          ? {
              ...page,
              viewportX: viewport.x,
              viewportY: viewport.y,
              viewportZoom: viewport.zoom,
            }
          : page;
      }),
    };

    await saveAutomationFlowWs(nextDocument);
  } catch (error) {
    console.warn("[AutomationEditorStateBridge] Page viewport save failed:", error);
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
      void persistPageViewportsToServer();
      setCanvasHidden(false);
      return;
    }

    let canSave = false;
    let currentPageId: string | undefined;
    const knownNodeIds = new Set<string>();
    const root = getEditorRoot();

    if (root) {
      currentPageId = getCurrentPageId(root);
      for (const node of Array.from(root.querySelectorAll<HTMLElement>(".react-flow__node"))) {
        const id = node.getAttribute("data-id");
        if (id) {
          knownNodeIds.add(id);
        }
      }
    }

    setCanvasHidden(true);
    void refreshServerPageViewports().then(() => restoreCurrentState());

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

    function tick(): void {
      const currentRoot = getEditorRoot();
      if (!currentRoot) {
        return;
      }

      const nextPageId = getCurrentPageId(currentRoot);
      if (nextPageId && currentPageId && nextPageId !== currentPageId) {
        storePageViewport(currentPageId, getCurrentViewport(currentRoot));
        currentPageId = nextPageId;
        setRestoring(true);
        for (const delay of [0, 40, 100, 220]) {
          window.setTimeout(() => applyViewport(getStoredViewport(nextPageId)), delay);
        }
        window.setTimeout(() => setRestoring(false), 260);
        return;
      }

      if (nextPageId && !currentPageId) {
        currentPageId = nextPageId;
      }

      keepNewNodesVisible(currentRoot, knownNodeIds);

      if (canSave) {
        saveCurrentState();
      } else {
        restoreCurrentPageViewport();
      }
    }

    const observer = new MutationObserver(tick);
    const observedRoot = getEditorRoot();
    if (observedRoot) {
      observer.observe(observedRoot, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "data-id", "checked", "value"],
      });
    }

    const intervalId = window.setInterval(tick, 350);
    const persistIntervalId = window.setInterval(() => {
      if (canSave) {
        void persistPageViewportsToServer();
      }
    }, 5000);

    return () => {
      restoreTimeouts.forEach(timeoutId => window.clearTimeout(timeoutId));
      window.clearTimeout(revealTimeout);
      window.clearTimeout(saveEnableTimeout);
      observer.disconnect();
      window.clearInterval(intervalId);
      window.clearInterval(persistIntervalId);
      setCanvasHidden(false);
      saveCurrentState(true);
      void persistPageViewportsToServer();
    };
  }, [opened]);

  return null;
}
