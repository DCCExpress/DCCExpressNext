import { useEffect } from "react";

const STORAGE_KEY = "dccexpress.automation.editorState.v1";

type AutomationEditorState = {
  pageId?: string;
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

function readStoredState(): AutomationEditorState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return {};
    }

    return {
      ...(typeof parsed.pageId === "string" ? { pageId: parsed.pageId } : {}),
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
    // Local storage may be disabled. In that case the editor still works, only restore is skipped.
  }
}

function getEditorRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".automation-flow-editor-body");
}

function readAutomationSnapshot(root: HTMLElement): { activePageId?: string; pageNameById: Map<string, string> } {
  for (const textarea of Array.from(root.querySelectorAll("textarea"))) {
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

function getSelectedNodeId(root: HTMLElement): string | undefined {
  const selectedNode = root.querySelector<HTMLElement>(".react-flow__node.selected");
  const id = selectedNode?.getAttribute("data-id");
  return id && id.trim().length > 0 ? id : undefined;
}

function getViewportTransform(root: HTMLElement): string | undefined {
  const viewport = root.querySelector<HTMLElement>(".react-flow__viewport");
  const transform = viewport?.style.transform;
  return transform && transform.trim().length > 0 ? transform : undefined;
}

function findNodeById(root: HTMLElement, nodeId: string): HTMLElement | null {
  return Array.from(root.querySelectorAll<HTMLElement>(".react-flow__node"))
    .find(node => node.getAttribute("data-id") === nodeId) ?? null;
}

function restoreViewport(root: HTMLElement, transform: string | undefined): void {
  if (!transform) {
    return;
  }

  const viewport = root.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewport) {
    return;
  }

  viewport.style.transform = transform;
}

function restoreSelectedNode(root: HTMLElement, nodeId: string | undefined): void {
  if (!nodeId) {
    return;
  }

  const node = findNodeById(root, nodeId);
  if (!node) {
    return;
  }

  node.dispatchEvent(new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    view: window,
  }));
}

function getToolbarPageInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>(
    ".automation-flow-dialog-body [data-automation-toolbar-page-select='true'] input"
  );
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function choosePageOption(pageId: string, pageName: string | undefined): void {
  const options = Array.from(document.querySelectorAll<HTMLElement>(
    "[data-combobox-option], [role='option']"
  ));

  const normalizedName = normalizeText(pageName);
  const option = options.find(item => item.getAttribute("value") === pageId) ??
    options.find(item => item.dataset.value === pageId) ??
    options.find(item => normalizedName.length > 0 && normalizeText(item.textContent) === normalizedName);

  option?.dispatchEvent(new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    view: window,
  }));
}

function restorePage(root: HTMLElement, pageId: string | undefined): void {
  if (!pageId) {
    return;
  }

  const snapshot = readAutomationSnapshot(root);
  if (snapshot.activePageId === pageId) {
    return;
  }

  const input = getToolbarPageInput();
  if (!input) {
    return;
  }

  input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  input.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));

  const pageName = snapshot.pageNameById.get(pageId);
  window.setTimeout(() => choosePageOption(pageId, pageName), 0);
  window.setTimeout(() => choosePageOption(pageId, pageName), 80);
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

function setViewportTransform(root: HTMLElement, nextTransform: ParsedViewportTransform): void {
  const viewport = root.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewport) {
    return;
  }

  viewport.style.transform = `translate(${nextTransform.x}px, ${nextTransform.y}px) scale(${nextTransform.zoom})`;
  writeStoredState({
    ...readStoredState(),
    viewportTransform: viewport.style.transform,
  });
}

function moveViewportToShowNode(root: HTMLElement, node: HTMLElement): void {
  const viewport = root.querySelector<HTMLElement>(".react-flow__viewport");
  const pane = root.querySelector<HTMLElement>(".react-flow__pane") ?? root.querySelector<HTMLElement>(".react-flow__renderer");
  if (!viewport || !pane) {
    return;
  }

  const paneRect = pane.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  const margin = 48;

  const isVisible = nodeRect.left >= paneRect.left + margin &&
    nodeRect.top >= paneRect.top + margin &&
    nodeRect.right <= paneRect.right - margin &&
    nodeRect.bottom <= paneRect.bottom - margin;

  if (isVisible) {
    return;
  }

  const current = parseViewportTransform(viewport.style.transform);
  setViewportTransform(root, {
    ...current,
    x: current.x + (paneRect.left + margin - nodeRect.left),
    y: current.y + (paneRect.top + margin - nodeRect.top),
  });
}

function saveCurrentState(): void {
  const root = getEditorRoot();
  if (!root) {
    return;
  }

  const previous = readStoredState();
  const snapshot = readAutomationSnapshot(root);
  const selectedNodeId = getSelectedNodeId(root);
  const viewportTransform = getViewportTransform(root);

  writeStoredState({
    ...previous,
    ...(snapshot.activePageId ? { pageId: snapshot.activePageId } : {}),
    ...(selectedNodeId ? { selectedNodeId } : {}),
    ...(viewportTransform ? { viewportTransform } : {}),
  });
}

function restoreCurrentState(): void {
  const root = getEditorRoot();
  if (!root) {
    return;
  }

  const stored = readStoredState();
  restorePage(root, stored.pageId);
  restoreViewport(root, stored.viewportTransform);
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

  if (newNodes.length === 0) {
    return;
  }

  const newestNode = newNodes[newNodes.length - 1];
  if (newestNode) {
    moveViewportToShowNode(root, newestNode);
  }
}

export default function AutomationEditorStateBridge({ opened }: AutomationEditorStateBridgeProps) {
  useEffect(() => {
    if (!opened) {
      saveCurrentState();
      return;
    }

    const restoreTimeouts = [0, 80, 200, 500, 900].map(delay => window.setTimeout(restoreCurrentState, delay));
    const knownNodeIds = new Set<string>();

    const root = getEditorRoot();
    if (root) {
      Array.from(root.querySelectorAll<HTMLElement>(".react-flow__node")).forEach(node => {
        const id = node.getAttribute("data-id");
        if (id) {
          knownNodeIds.add(id);
        }
      });
    }

    const observer = new MutationObserver(() => {
      const currentRoot = getEditorRoot();
      if (!currentRoot) {
        return;
      }

      keepNewNodesVisible(currentRoot, knownNodeIds);
      saveCurrentState();
    });

    const observedRoot = getEditorRoot();
    if (observedRoot) {
      observer.observe(observedRoot, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "data-id"],
      });
    }

    const intervalId = window.setInterval(saveCurrentState, 600);

    return () => {
      restoreTimeouts.forEach(timeoutId => window.clearTimeout(timeoutId));
      observer.disconnect();
      window.clearInterval(intervalId);
      saveCurrentState();
    };
  }, [opened]);

  return null;
}
