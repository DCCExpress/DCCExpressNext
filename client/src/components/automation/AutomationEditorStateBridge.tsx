import { useEffect, useLayoutEffect } from "react";
import { useReactFlow } from "@xyflow/react";

import {
  loadAutomationFlowWs,
  saveAutomationFlowWs,
} from "../../api/automationFlowWsApi";

const STORAGE_KEY = "dccexpress.automation.editorState.v4";
const DEFAULT_VIEWPORT: PageViewport = { x: 0, y: 0, zoom: 1 };
const VIEWPORT_EPSILON = 0.001;

type AutomationEditorStateBridgeProps = {
  opened: boolean;
};

type PageViewport = {
  x: number;
  y: number;
  zoom: number;
};

type StoredEditorState = {
  activePageId?: string;
  pageViewports?: Record<string, PageViewport>;
  selectedNodeByPage?: Record<string, string>;
};

type AutomationSnapshot = {
  activePageId?: string;
  pageIds: Set<string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPageViewport(value: unknown): value is PageViewport {
  return isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.zoom) &&
    value.zoom > 0;
}

function readStoredState(): StoredEditorState {
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

    const selectedNodeByPage: Record<string, string> = {};
    if (isRecord(parsed.selectedNodeByPage)) {
      for (const [pageId, nodeId] of Object.entries(parsed.selectedNodeByPage)) {
        if (typeof nodeId === "string" && nodeId.trim().length > 0) {
          selectedNodeByPage[pageId] = nodeId;
        }
      }
    }

    return {
      ...(typeof parsed.activePageId === "string" ? { activePageId: parsed.activePageId } : {}),
      ...(Object.keys(pageViewports).length > 0 ? { pageViewports } : {}),
      ...(Object.keys(selectedNodeByPage).length > 0 ? { selectedNodeByPage } : {}),
    };
  } catch {
    return {};
  }
}

function writeStoredState(state: StoredEditorState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Local storage may be disabled. Server persistence still runs when the dialog closes.
  }
}

function getEditorRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".automation-flow-editor-body");
}

function getFlowRoot(): HTMLElement | null {
  return getEditorRoot()?.querySelector<HTMLElement>(".react-flow") ?? null;
}

function setCanvasHidden(hidden: boolean): void {
  const flowRoot = getFlowRoot();
  if (!flowRoot) {
    return;
  }

  flowRoot.style.visibility = hidden ? "hidden" : "";
  flowRoot.style.pointerEvents = hidden ? "none" : "";
}

function readAutomationSnapshot(): AutomationSnapshot {
  const root = getEditorRoot();
  if (!root) {
    return { pageIds: new Set<string>() };
  }

  for (const textarea of Array.from(root.querySelectorAll<HTMLTextAreaElement>("textarea"))) {
    try {
      const parsed: unknown = JSON.parse(textarea.value);
      if (!isRecord(parsed) || !Array.isArray(parsed.pages)) {
        continue;
      }

      const pageIds = new Set<string>();
      for (const page of parsed.pages) {
        if (isRecord(page) && typeof page.id === "string") {
          pageIds.add(page.id);
        }
      }

      if (pageIds.size === 0) {
        continue;
      }

      return {
        ...(typeof parsed.activePageId === "string" ? { activePageId: parsed.activePageId } : {}),
        pageIds,
      };
    } catch {
      // Not the automation JSON preview.
    }
  }

  return { pageIds: new Set<string>() };
}

function getSelectedNodeId(): string | undefined {
  const node = getEditorRoot()?.querySelector<HTMLElement>(".react-flow__node.selected");
  const nodeId = node?.getAttribute("data-id");
  return nodeId && nodeId.trim().length > 0 ? nodeId : undefined;
}

function restoreSelectedNode(nodeId: string | undefined): void {
  if (!nodeId) {
    return;
  }

  const node = Array.from(getEditorRoot()?.querySelectorAll<HTMLElement>(".react-flow__node") ?? [])
    .find(item => item.getAttribute("data-id") === nodeId);

  node?.dispatchEvent(new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    view: window,
  }));
}

function viewportsEqual(left: PageViewport, right: PageViewport): boolean {
  return Math.abs(left.x - right.x) < VIEWPORT_EPSILON &&
    Math.abs(left.y - right.y) < VIEWPORT_EPSILON &&
    Math.abs(left.zoom - right.zoom) < VIEWPORT_EPSILON;
}

function mergeServerViewports(
  stored: StoredEditorState,
  serverViewports: Map<string, PageViewport>
): StoredEditorState {
  const pageViewports = { ...stored.pageViewports };

  for (const [pageId, viewport] of serverViewports) {
    if (!pageViewports[pageId]) {
      pageViewports[pageId] = viewport;
    }
  }

  return {
    ...stored,
    ...(Object.keys(pageViewports).length > 0 ? { pageViewports } : {}),
  };
}

async function loadServerViewports(): Promise<{
  activePageId?: string;
  pageViewports: Map<string, PageViewport>;
}> {
  const document = await loadAutomationFlowWs();
  const pageViewports = new Map<string, PageViewport>();

  for (const page of document.pages) {
    if (
      isFiniteNumber(page.viewportX) &&
      isFiniteNumber(page.viewportY) &&
      isFiniteNumber(page.viewportZoom) &&
      page.viewportZoom > 0
    ) {
      pageViewports.set(page.id, {
        x: page.viewportX,
        y: page.viewportY,
        zoom: page.viewportZoom,
      });
    }
  }

  return {
    ...(typeof document.activePageId === "string" ? { activePageId: document.activePageId } : {}),
    pageViewports,
  };
}

async function persistEditorStateToServer(state: StoredEditorState): Promise<void> {
  const pageViewports = state.pageViewports ?? {};

  try {
    const document = await loadAutomationFlowWs();
    const validPageIds = new Set(document.pages.map(page => page.id));
    const activePageId = state.activePageId && validPageIds.has(state.activePageId)
      ? state.activePageId
      : document.activePageId;

    const nextDocument = {
      ...document,
      ...(activePageId ? { activePageId } : {}),
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
    console.warn("[AutomationEditorStateBridge] Editor state save failed:", error);
  }
}

export default function AutomationEditorStateBridge({ opened }: AutomationEditorStateBridgeProps) {
  const {
    flowToScreenPosition,
    getNodes,
    getViewport,
    setCenter,
    setViewport,
  } = useReactFlow();

  useLayoutEffect(() => {
    if (opened) {
      setCanvasHidden(true);
    } else {
      setCanvasHidden(false);
    }

    return () => setCanvasHidden(false);
  }, [opened]);

  useEffect(() => {
    if (!opened) {
      return;
    }

    let disposed = false;
    let ready = false;
    let activePageId: string | undefined;
    let lastViewport = getViewport();
    let knownNodeIds = new Set<string>();
    let suppressNewNodeHandlingUntil = Date.now() + 1000;
    let stored = readStoredState();
    const timers: number[] = [];

    setCanvasHidden(true);

    function savePageViewport(pageId: string | undefined): void {
      if (!pageId) {
        return;
      }

      const viewport = getViewport();
      stored = {
        ...stored,
        activePageId: pageId,
        pageViewports: {
          ...stored.pageViewports,
          [pageId]: viewport,
        },
      };
      lastViewport = viewport;
      writeStoredState(stored);
    }

    function saveSelectedNode(pageId: string | undefined): void {
      if (!pageId) {
        return;
      }

      const selectedNodeId = getSelectedNodeId();
      const selectedNodeByPage = { ...stored.selectedNodeByPage };

      if (selectedNodeId) {
        selectedNodeByPage[pageId] = selectedNodeId;
      } else {
        delete selectedNodeByPage[pageId];
      }

      stored = {
        ...stored,
        ...(Object.keys(selectedNodeByPage).length > 0 ? { selectedNodeByPage } : {}),
      };
      writeStoredState(stored);
    }

    function restorePageViewport(pageId: string): void {
      const viewport = stored.pageViewports?.[pageId] ?? DEFAULT_VIEWPORT;
      void setViewport(viewport, { duration: 0 });
      lastViewport = viewport;
    }

    function restorePageSelection(pageId: string): void {
      const nodeId = stored.selectedNodeByPage?.[pageId];
      timers.push(window.setTimeout(() => restoreSelectedNode(nodeId), 80));
    }

    function resetKnownNodes(): void {
      knownNodeIds = new Set(getNodes().map(node => node.id));
      suppressNewNodeHandlingUntil = Date.now() + 500;
    }

    function keepNewNodeVisible(): void {
      if (!ready || Date.now() < suppressNewNodeHandlingUntil) {
        return;
      }

      const nodes = getNodes();
      const newNode = nodes.find(node => !knownNodeIds.has(node.id));
      knownNodeIds = new Set(nodes.map(node => node.id));

      if (!newNode) {
        return;
      }

      const editorRect = getFlowRoot()?.getBoundingClientRect();
      const screenPosition = flowToScreenPosition(newNode.position);
      const width = newNode.measured?.width ?? newNode.width ?? 226;
      const height = newNode.measured?.height ?? newNode.height ?? 100;
      const margin = 48;

      const visible = editorRect &&
        screenPosition.x >= editorRect.left + margin &&
        screenPosition.y >= editorRect.top + margin &&
        screenPosition.x + width <= editorRect.right - margin &&
        screenPosition.y + height <= editorRect.bottom - margin;

      if (!visible) {
        const viewport = getViewport();
        void setCenter(
          newNode.position.x + width / 2,
          newNode.position.y + height / 2,
          { zoom: viewport.zoom, duration: 0 }
        );
      }
    }

    function handlePage(pageId: string): void {
      if (activePageId === pageId) {
        return;
      }

      if (activePageId) {
        savePageViewport(activePageId);
        saveSelectedNode(activePageId);
      }

      activePageId = pageId;
      stored = { ...stored, activePageId: pageId };
      writeStoredState(stored);
      restorePageViewport(pageId);
      restorePageSelection(pageId);
      resetKnownNodes();
    }

    function tick(): void {
      if (disposed) {
        return;
      }

      const snapshot = readAutomationSnapshot();
      if (snapshot.activePageId && snapshot.pageIds.has(snapshot.activePageId)) {
        handlePage(snapshot.activePageId);
      }

      if (!ready || !activePageId) {
        return;
      }

      const viewport = getViewport();
      if (!viewportsEqual(viewport, lastViewport)) {
        savePageViewport(activePageId);
      }

      saveSelectedNode(activePageId);
      keepNewNodeVisible();
    }

    void loadServerViewports()
      .then(serverState => {
        if (disposed) {
          return;
        }

        stored = mergeServerViewports(stored, serverState.pageViewports);
        if (!stored.activePageId && serverState.activePageId) {
          stored = { ...stored, activePageId: serverState.activePageId };
        }
        writeStoredState(stored);

        if (activePageId) {
          restorePageViewport(activePageId);
          timers.push(window.setTimeout(() => restorePageViewport(activePageId as string), 100));
        }
      })
      .catch(error => {
        console.warn("[AutomationEditorStateBridge] Editor state load failed:", error);
      });

    const restoreDelays = [0, 40, 100, 220, 420, 700];
    for (const delay of restoreDelays) {
      timers.push(window.setTimeout(() => {
        const snapshot = readAutomationSnapshot();
        if (snapshot.activePageId) {
          handlePage(snapshot.activePageId);
          restorePageViewport(snapshot.activePageId);
        }
      }, delay));
    }

    timers.push(window.setTimeout(() => {
      ready = true;
      resetKnownNodes();
      if (activePageId) {
        restorePageViewport(activePageId);
      }
      setCanvasHidden(false);
    }, 750));

    const intervalId = window.setInterval(tick, 150);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      timers.forEach(timerId => window.clearTimeout(timerId));

      if (activePageId) {
        savePageViewport(activePageId);
        saveSelectedNode(activePageId);
      }

      setCanvasHidden(false);
      void persistEditorStateToServer(stored);
    };
  }, [flowToScreenPosition, getNodes, getViewport, opened, setCenter, setViewport]);

  return null;
}
