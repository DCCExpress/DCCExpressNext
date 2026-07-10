import { useEffect, useLayoutEffect } from "react";

const STORAGE_KEY = "dccexpress.automation.editorState.v1";

const VIEWPORT_RESTORING_DATASET_KEY = "automationViewportRestoring";

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

type AutomationSnapshot = {
  activePageId?: string;
  pageNameById: Map<string, string>;
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

function isViewportRestoring(): boolean {
  return document.body.dataset[VIEWPORT_RESTORING_DATASET_KEY] === "true";
}

function setViewportRestoring(restoring: boolean): void {
  if (restoring) {
    document.body.dataset[VIEWPORT_RESTORING_DATASET_KEY] = "true";
    return;
  }

  delete document.body.dataset[VIEWPORT_RESTORING_DATASET_KEY];
}

function getEditorRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".automation-flow-editor-body");
}

function getDialogRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".automation-flow-dialog-body");
}

function getReactFlowRoot(root: HTMLElement | null = getEditorRoot()): HTMLElement | null {
  return root?.querySelector<HTMLElement>(".react-flow") ?? null;
}

function setCanvasRestoring(restoring: boolean): void {
  setViewportRestoring(restoring);

  const flowRoot = getReactFlowRoot();
  if (!flowRoot) {
    return;
  }

  if (restoring) {
    flowRoot.dataset.automationViewportRestoring = "true";
    flowRoot.style.visibility = "hidden";
    flowRoot.style.pointerEvents = "none";
    return;
  }

  delete flowRoot.dataset.automationViewportRestoring;
  flowRoot.style.visibility = "";
  flowRoot.style.pointerEvents = "";
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function readAutomationSnapshot(root: HTMLElement): AutomationSnapshot {
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

function getActivePageIdFromToolbar(snapshot: AutomationSnapshot): string | undefined {
  const inputValue = normalizeText(getToolbarPageInput()?.value);
  if (inputValue.length === 0) {
    return undefined;
  }

  const matchingPages = Array.from(snapshot.pageNameById.entries())
    .filter(([, pageName]) => normalizeText(pageName) === inputValue);

  return matchingPages.length === 1 ? matchingPages[0]?.[0] : undefined;
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
  window.setTimeout(() => choosePageOption(pageId, pageName), 180);
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

function saveCurrentState(force = false): void {
  if (!force && isViewportRestoring()) {
    return;
  }

  const root = getEditorRoot();
  if (!root) {
    return;
  }

  const previous = readStoredState();
  const snapshot = readAutomationSnapshot(root);
  const selectedNodeId = getSelectedNodeId(root);
  const viewportTransform = getViewportTransform(root);
  const activePageId = snapshot.activePageId ?? getActivePageIdFromToolbar(snapshot);
  const nextState: AutomationEditorState = { ...previous };

  if (activePageId) {
    nextState.pageId = activePageId;
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

function findNodePanelEnabledInput(): HTMLInputElement | null {
  const root = getEditorRoot();
  const nodePanel = root?.querySelector<HTMLElement>(".mantine-Group-root > .mantine-Card-root:first-child");
  return nodePanel?.querySelector<HTMLInputElement>(".mantine-Switch-root input[type='checkbox']") ?? null;
}

function setNativeCheckboxChecked(input: HTMLInputElement, checked: boolean): void {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked")?.set;

  if (setter) {
    setter.call(input, checked);
  } else {
    input.checked = checked;
  }

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function installToolbarEnabledSwitchRepair(): () => void {
  const dialogRoot = getDialogRoot();
  if (!dialogRoot) {
    return () => undefined;
  }

  const toolbarSwitch = Array.from(dialogRoot.querySelectorAll<HTMLElement>(".mantine-Switch-root"))
    .find(item => !item.closest(".automation-flow-editor-body"));

  if (!toolbarSwitch) {
    return () => undefined;
  }

  const handleClick = (event: Event): void => {
    const input = findNodePanelEnabledInput();
    if (!input) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setNativeCheckboxChecked(input, !input.checked);
    window.setTimeout(() => saveCurrentState(true), 0);
  };

  toolbarSwitch.addEventListener("click", handleClick, true);
  return () => toolbarSwitch.removeEventListener("click", handleClick, true);
}

export default function AutomationEditorStateBridge({ opened }: AutomationEditorStateBridgeProps) {
  useLayoutEffect(() => {
    if (!opened) {
      setCanvasRestoring(false);
      return;
    }

    setCanvasRestoring(true);

    return () => {
      setCanvasRestoring(false);
    };
  }, [opened]);

  useEffect(() => {
    if (!opened) {
      saveCurrentState(true);
      setCanvasRestoring(false);
      return;
    }

    setCanvasRestoring(true);

    const restoreTimeouts = [0, 40, 80, 160, 320, 640, 1000].map(delay => window.setTimeout(restoreCurrentState, delay));
    const revealTimeout = window.setTimeout(() => {
      restoreCurrentState();
      setCanvasRestoring(false);
      saveCurrentState(true);
    }, 1150);
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
        attributeFilter: ["class", "style", "data-id", "checked", "value"],
      });
    }

    const uninstallEnabledRepair = window.setTimeout(installToolbarEnabledSwitchRepair, 0);
    const repairIntervalId = window.setInterval(installToolbarEnabledSwitchRepair, 1000);
    const intervalId = window.setInterval(() => saveCurrentState(), 600);

    return () => {
      restoreTimeouts.forEach(timeoutId => window.clearTimeout(timeoutId));
      window.clearTimeout(revealTimeout);
      window.clearTimeout(uninstallEnabledRepair);
      window.clearInterval(repairIntervalId);
      observer.disconnect();
      window.clearInterval(intervalId);
      setCanvasRestoring(false);
      saveCurrentState(true);
    };
  }, [opened]);

  return null;
}
