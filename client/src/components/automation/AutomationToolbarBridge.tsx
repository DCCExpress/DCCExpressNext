import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";

type PageActionDialog = "create" | "rename" | "delete" | null;

type AutomationPageSnapshot = {
  id: string;
  name: string;
  enabled?: boolean;
};

type AutomationSnapshot = {
  activePageId: string | null;
  pages: AutomationPageSnapshot[];
  nodes: { data?: { pageId?: string } }[];
  edges: unknown[];
};

type OriginalDomElements = {
  pageNameInput: HTMLInputElement | null;
  addButton: HTMLButtonElement | null;
  deleteButton: HTMLButtonElement | null;
  saveButton: HTMLButtonElement | null;
  loadButton: HTMLButtonElement | null;
};

type MovedElement = {
  element: HTMLElement;
  parent: HTMLElement;
  nextSibling: ChildNode | null;
  style: {
    display: string;
    margin: string;
    minWidth: string;
    maxWidth: string;
    flex: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizePageName(value: string | null | undefined): string {
  return normalizeText(value).toLocaleLowerCase();
}

function escapeCssId(value: string): string {
  return value.replace(/(["\\#.;:[\],>+~*^$|=!])/g, "\\$1");
}

function findButtonByText(root: HTMLElement, label: string): HTMLButtonElement | null {
  const wanted = normalizeText(label);
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button"))
    .find(button => normalizeText(button.textContent) === wanted) ?? null;
}

function findIconButton(root: HTMLElement, iconClassName: string): HTMLButtonElement | null {
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button"))
    .find(button => button.querySelector(`svg.${iconClassName}`)) ?? null;
}

function findInputByLabel(root: HTMLElement, label: string): HTMLInputElement | null {
  const wanted = normalizeText(label);
  const fieldLabel = Array.from(root.querySelectorAll<HTMLLabelElement>("label"))
    .find(item => normalizeText(item.textContent) === wanted);

  if (!fieldLabel) {
    return null;
  }

  const inputId = fieldLabel.getAttribute("for");
  if (inputId) {
    const input = root.querySelector<HTMLInputElement>(`#${escapeCssId(inputId)}`);
    if (input) {
      return input;
    }
  }

  return fieldLabel.parentElement?.querySelector<HTMLInputElement>("input") ?? null;
}

function findElementByText(root: HTMLElement, label: string): HTMLElement | null {
  const wanted = normalizeText(label);
  if (wanted.length === 0) {
    return null;
  }

  return Array.from(root.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6,p,span"))
    .find(element => normalizeText(element.textContent) === wanted) ?? null;
}

function findFieldRoot(input: HTMLInputElement | null): HTMLElement | null {
  let current = input?.parentElement ?? null;

  for (let depth = 0; current && depth < 8; depth += 1) {
    if (current.querySelector("label") && current.querySelector("input")) {
      return current;
    }

    current = current.parentElement;
  }

  return input?.parentElement ?? null;
}

function findParentWithClass(element: HTMLElement | null, className: string): HTMLElement | null {
  let current = element?.parentElement ?? null;

  for (let depth = 0; current && depth < 8; depth += 1) {
    if (current.classList.contains(className)) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function findButtonGroup(firstButton: HTMLButtonElement | null, secondButton: HTMLButtonElement | null): HTMLElement | null {
  if (!firstButton || !secondButton || firstButton.parentElement !== secondButton.parentElement) {
    return null;
  }

  return firstButton.parentElement;
}

function setNativeInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;

  if (setter) {
    setter.call(input, value);
  } else {
    input.value = value;
  }

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function readAutomationSnapshot(root: HTMLElement): AutomationSnapshot {
  for (const textarea of Array.from(root.querySelectorAll<HTMLTextAreaElement>("textarea"))) {
    try {
      const parsed: unknown = JSON.parse(textarea.value);

      if (!isRecord(parsed) || !Array.isArray(parsed.pages)) {
        continue;
      }

      const pages: AutomationPageSnapshot[] = [];
      for (const page of parsed.pages) {
        if (!isRecord(page) || typeof page.id !== "string" || typeof page.name !== "string") {
          continue;
        }

        pages.push({
          id: page.id,
          name: page.name,
          ...(typeof page.enabled === "boolean" ? { enabled: page.enabled } : {}),
        });
      }

      if (pages.length === 0) {
        continue;
      }

      return {
        activePageId: typeof parsed.activePageId === "string" ? parsed.activePageId : null,
        pages,
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes as AutomationSnapshot["nodes"] : [],
        edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      };
    } catch {
      // Not the JSON preview textarea.
    }
  }

  return {
    activePageId: null,
    pages: [],
    nodes: [],
    edges: [],
  };
}

function compactMovedField(element: HTMLElement): void {
  element.style.margin = "0";
  element.style.minWidth = "auto";
  element.style.maxWidth = "none";

  const label = element.querySelector<HTMLElement>("label");
  if (label) {
    label.style.whiteSpace = "nowrap";
  }

  const description = element.querySelector<HTMLElement>(".mantine-InputWrapper-description, .mantine-Switch-description");
  if (description) {
    description.style.display = "none";
  }
}

function rememberMovedElement(element: HTMLElement): MovedElement {
  return {
    element,
    parent: element.parentElement as HTMLElement,
    nextSibling: element.nextSibling,
    style: {
      display: element.style.display,
      margin: element.style.margin,
      minWidth: element.style.minWidth,
      maxWidth: element.style.maxWidth,
      flex: element.style.flex,
    },
  };
}

function moveElementToSlot(
  element: HTMLElement | null,
  slot: HTMLElement,
  movedRef: { current: MovedElement | null }
): HTMLElement | null {
  const target = movedRef.current?.element ?? element;
  if (!target) {
    return null;
  }

  if (!movedRef.current && target.parentElement) {
    movedRef.current = rememberMovedElement(target);
  }

  if (target.parentElement !== slot) {
    slot.appendChild(target);
  }

  return target;
}

function restoreMovedElement(moved: MovedElement | null): void {
  if (!moved?.element.isConnected) {
    return;
  }

  delete moved.element.dataset.automationToolbarPageSelect;
  delete moved.element.dataset.automationToolbarEnabledSwitch;
  moved.element.style.display = moved.style.display;
  moved.element.style.margin = moved.style.margin;
  moved.element.style.minWidth = moved.style.minWidth;
  moved.element.style.maxWidth = moved.style.maxWidth;
  moved.element.style.flex = moved.style.flex;
  moved.parent.insertBefore(moved.element, moved.nextSibling);
}

function useAutomationToolbarDom(
  pageSelectSlotRef: RefObject<HTMLDivElement | null>,
  enabledSlotRef: RefObject<HTMLDivElement | null>
) {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<AutomationSnapshot>({ activePageId: null, pages: [], nodes: [], edges: [] });
  const [deleteDisabled, setDeleteDisabled] = useState(false);
  const elementsRef = useRef<OriginalDomElements>({
    pageNameInput: null,
    addButton: null,
    deleteButton: null,
    saveButton: null,
    loadButton: null,
  });
  const hiddenElementsRef = useRef(new Map<HTMLElement, string>());
  const movedPageSelectRef = useRef<MovedElement | null>(null);
  const movedEnabledSwitchRef = useRef<MovedElement | null>(null);

  const labels = useMemo(() => ({
    automationPage: t("automation.panel.automationPage"),
    pageName: t("automation.panel.pageName"),
    pageEnabled: t("automation.panel.pageEnabledLabel"),
    addPage: t("automation.panel.addPage"),
    deletePage: t("automation.panel.deletePage"),
    nodePalette: t("automation.panel.nodePalette"),
    properties: t("automation.panel.properties"),
    activeOutputs: t("automation.panel.activeOutputs"),
    jsonPreview: t("automation.panel.jsonPreview"),
  }), [t]);

  useEffect(() => {
    const editorRoot = document.querySelector<HTMLElement>(".automation-flow-editor-body");
    const dialogRoot = document.querySelector<HTMLElement>(".automation-flow-dialog-body");
    const pageSelectSlot = pageSelectSlotRef.current;
    const enabledSlot = enabledSlotRef.current;

    if (!editorRoot || !dialogRoot || !pageSelectSlot || !enabledSlot) {
      return;
    }

    const root = editorRoot;
    const dialog = dialogRoot;
    const pageSlot = pageSelectSlot;
    const switchSlot = enabledSlot;

    function hideElement(element: HTMLElement | null): void {
      if (!element) {
        return;
      }

      if (!hiddenElementsRef.current.has(element)) {
        hiddenElementsRef.current.set(element, element.style.display);
      }

      element.style.display = "none";
    }

    function hideAdjacentDividers(element: HTMLElement | null): void {
      const previous = element?.previousElementSibling;
      const next = element?.nextElementSibling;

      if (previous instanceof HTMLElement && previous.classList.contains("mantine-Divider-root")) {
        hideElement(previous);
      }

      if (next instanceof HTMLElement && next.classList.contains("mantine-Divider-root")) {
        hideElement(next);
      }
    }

    function syncDom(): void {
      const pageSelectInput = movedPageSelectRef.current?.element.querySelector<HTMLInputElement>("input") ??
        findInputByLabel(dialog, labels.automationPage) ??
        findInputByLabel(root, labels.automationPage);
      const enabledInput = movedEnabledSwitchRef.current?.element.querySelector<HTMLInputElement>("input") ??
        findInputByLabel(dialog, labels.pageEnabled) ??
        findInputByLabel(root, labels.pageEnabled);
      const pageNameInput = findInputByLabel(root, labels.pageName) ?? findInputByLabel(dialog, labels.pageName);
      const addButton = findButtonByText(root, labels.addPage) ?? findButtonByText(dialog, labels.addPage);
      const deleteButton = findButtonByText(root, labels.deletePage) ?? findButtonByText(dialog, labels.deletePage);
      const saveButton = findIconButton(root, "tabler-icon-device-floppy") ?? findIconButton(dialog, "tabler-icon-device-floppy");
      const loadButton = findIconButton(root, "tabler-icon-refresh") ?? findIconButton(dialog, "tabler-icon-refresh");
      const pageSelectRoot = moveElementToSlot(
        movedPageSelectRef.current?.element ?? findFieldRoot(pageSelectInput),
        pageSlot,
        movedPageSelectRef
      );
      const enabledRoot = moveElementToSlot(
        movedEnabledSwitchRef.current?.element ?? findFieldRoot(enabledInput),
        switchSlot,
        movedEnabledSwitchRef
      );
      const pageNameRoot = findFieldRoot(pageNameInput);
      const addDeleteGroup = findButtonGroup(addButton, deleteButton);
      const saveLoadGroup = findButtonGroup(saveButton, loadButton) ?? findButtonGroup(loadButton, saveButton);
      const pageSelectLabel = pageSelectRoot?.querySelector<HTMLElement>("label") ?? null;
      const nodePaletteTitle = findElementByText(root, labels.nodePalette);
      const nodePaletteGroup = findParentWithClass(nodePaletteTitle, "mantine-Group-root");
      const nodeCountBadge = nodePaletteGroup?.querySelector<HTMLElement>(".mantine-Badge-root") ?? null;
      const activeOutputsTitle = findElementByText(root, labels.activeOutputs);
      const jsonPreviewTitle = findElementByText(root, labels.jsonPreview);
      const activeOutputsRoot = findParentWithClass(activeOutputsTitle, "mantine-Stack-root");
      const jsonPreviewRoot = findParentWithClass(jsonPreviewTitle, "mantine-Stack-root");
      const propertiesTitle = findElementByText(root, labels.properties);
      const propertiesStack = findParentWithClass(propertiesTitle, "mantine-Stack-root");

      if (pageSelectInput) {
        pageSelectInput.readOnly = true;
        pageSelectInput.style.cursor = "pointer";
      }

      if (pageSelectRoot) {
        pageSelectRoot.dataset.automationToolbarPageSelect = "true";
        pageSelectRoot.style.minWidth = "260px";
        pageSelectRoot.style.maxWidth = "340px";
        pageSelectRoot.style.flex = "0 1 320px";
        compactMovedField(pageSelectRoot);
      }

      if (enabledRoot) {
        enabledRoot.dataset.automationToolbarEnabledSwitch = "true";
        enabledRoot.style.minWidth = "auto";
        enabledRoot.style.maxWidth = "none";
        compactMovedField(enabledRoot);
      }

      elementsRef.current = {
        pageNameInput,
        addButton,
        deleteButton,
        saveButton,
        loadButton,
      };

      setDeleteDisabled(deleteButton?.disabled === true);
      setSnapshot(readAutomationSnapshot(root));
      hideElement(pageSelectLabel);
      hideElement(pageNameRoot);
      hideElement(addDeleteGroup);
      hideElement(saveLoadGroup);
      hideElement(nodeCountBadge);
      hideElement(activeOutputsRoot);
      hideAdjacentDividers(activeOutputsRoot);
      hideElement(jsonPreviewRoot);
      hideAdjacentDividers(jsonPreviewRoot);

      if (propertiesStack) {
        Array.from(propertiesStack.children).forEach(child => {
          if (!(child instanceof HTMLElement)) {
            return;
          }

          if (child.classList.contains("mantine-Badge-root") || child.classList.contains("mantine-Divider-root")) {
            hideElement(child);
          }
        });
      }
    }

    syncDom();

    const observer = new MutationObserver(syncDom);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "value", "checked"],
    });

    const intervalId = window.setInterval(syncDom, 600);

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);
      restoreMovedElement(movedPageSelectRef.current);
      restoreMovedElement(movedEnabledSwitchRef.current);
      movedPageSelectRef.current = null;
      movedEnabledSwitchRef.current = null;
      hiddenElementsRef.current.forEach((display, element) => {
        element.style.display = display;
      });
      hiddenElementsRef.current.clear();
    };
  }, [labels, pageSelectSlotRef, enabledSlotRef]);

  return {
    deleteDisabled,
    elementsRef,
    snapshot,
  };
}

export default function AutomationToolbarBridge() {
  const { t } = useTranslation();
  const pageSelectSlotRef = useRef<HTMLDivElement | null>(null);
  const enabledSlotRef = useRef<HTMLDivElement | null>(null);
  const {
    deleteDisabled,
    elementsRef,
    snapshot,
  } = useAutomationToolbarDom(pageSelectSlotRef, enabledSlotRef);
  const [dialog, setDialog] = useState<PageActionDialog>(null);
  const [draftName, setDraftName] = useState("");

  const activePage = snapshot.pages.find(page => page.id === snapshot.activePageId) ?? snapshot.pages[0];
  const visibleNodeCount = activePage
    ? snapshot.nodes.filter(node => node.data?.pageId === activePage.id || (!node.data?.pageId && activePage.id === "main")).length
    : 0;

  const text = {
    create: t("automation.panel.createPageDialogTitle", { defaultValue: "Új automatika lap" }),
    createAction: t("automation.panel.createPageAction", { defaultValue: "Új lap" }),
    rename: t("automation.panel.renamePageDialogTitle", { defaultValue: "Lap átnevezése" }),
    renameAction: t("automation.panel.renamePageAction", { defaultValue: "Átnevezés" }),
    delete: t("automation.panel.deletePageDialogTitle", { defaultValue: "Lap törlése" }),
    deleteAction: t("automation.panel.deletePageAction", { defaultValue: "Törlés" }),
    cancel: t("common.cancel", { defaultValue: "Mégse" }),
    name: t("automation.panel.pageName", { defaultValue: "Lap neve" }),
    duplicateName: t("automation.panel.duplicatePageName", { defaultValue: "Már van ilyen nevű automatika lap." }),
    deleteConfirm: t("automation.panel.deletePageConfirm", {
      defaultValue: "Biztosan törlöd az aktív automatika lapot? A rajta lévő node-ok és élek is törlődnek.",
    }),
    load: t("automation.panel.loadFromServer"),
    save: t("automation.panel.saveToServer"),
    page: t("automation.panel.page", { defaultValue: "Page" }),
    pages: t("automation.panel.pages", { defaultValue: "Lapok" }),
    nodes: t("automation.panel.nodeCount", { visible: visibleNodeCount, total: snapshot.nodes.length }),
    edges: t("automation.panel.edges", { count: snapshot.edges.length }),
  };

  function hasDuplicatePageName(name: string, mode: "create" | "rename"): boolean {
    const normalizedName = normalizePageName(name);
    if (normalizedName.length === 0) {
      return false;
    }

    return snapshot.pages.some(page => {
      if (mode === "rename" && snapshot.activePageId && page.id === snapshot.activePageId) {
        return false;
      }

      return normalizePageName(page.name) === normalizedName;
    });
  }

  function getCurrentPageName(): string {
    return elementsRef.current.pageNameInput?.value ?? activePage?.name ?? "";
  }

  function applyPageName(name: string): void {
    const trimmed = name.trim();
    const input = elementsRef.current.pageNameInput;

    if (!input || trimmed.length === 0) {
      return;
    }

    setNativeInputValue(input, trimmed);
  }

  function openCreateDialog(): void {
    setDraftName("");
    setDialog("create");
  }

  function openRenameDialog(): void {
    setDraftName(getCurrentPageName());
    setDialog("rename");
  }

  function confirmCreate(): void {
    const name = draftName.trim();
    if (name.length === 0 || hasDuplicatePageName(name, "create")) {
      return;
    }

    elementsRef.current.addButton?.click();
    window.setTimeout(() => applyPageName(name), 0);
    window.setTimeout(() => applyPageName(name), 100);
    setDialog(null);
  }

  function confirmRename(): void {
    const name = draftName.trim();
    if (name.length === 0 || hasDuplicatePageName(name, "rename")) {
      return;
    }

    applyPageName(name);
    setDialog(null);
  }

  function confirmDelete(): void {
    elementsRef.current.deleteButton?.click();
    setDialog(null);
  }

  const createDuplicate = dialog === "create" && hasDuplicatePageName(draftName, "create");
  const renameDuplicate = dialog === "rename" && hasDuplicatePageName(draftName, "rename");
  const createDisabled = draftName.trim().length === 0 || createDuplicate;
  const renameDisabled = draftName.trim().length === 0 || renameDuplicate;

  return (
    <Box style={{ flex: "0 0 auto", marginTop: 6, marginBottom: 8 }}>
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Tooltip label={text.load}>
            <ActionIcon variant="light" aria-label={text.load} onClick={() => elementsRef.current.loadButton?.click()}>
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={text.save}>
            <ActionIcon variant="light" aria-label={text.save} onClick={() => elementsRef.current.saveButton?.click()}>
              <IconDeviceFloppy size={16} />
            </ActionIcon>
          </Tooltip>

          <Divider orientation="vertical" />

          <Text size="sm" fw={700} c="dimmed" style={{ whiteSpace: "nowrap" }}>
            {text.page}:
          </Text>
          <Box ref={pageSelectSlotRef} style={{ minWidth: 260, maxWidth: 340, flex: "0 1 320px" }} />

          <Tooltip label={text.createAction}>
            <ActionIcon variant="light" aria-label={text.createAction} onClick={openCreateDialog}>
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={text.renameAction}>
            <ActionIcon variant="light" aria-label={text.renameAction} onClick={openRenameDialog} disabled={!activePage}>
              <IconPencil size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={text.deleteAction}>
            <ActionIcon
              color="red"
              variant="light"
              aria-label={text.deleteAction}
              disabled={deleteDisabled || !activePage}
              onClick={() => setDialog("delete")}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>

          <Box ref={enabledSlotRef} style={{ display: "flex", alignItems: "center", flexShrink: 0 }} />
        </Group>

        <Group gap="xs" wrap="nowrap">
          {activePage && activePage.enabled === false && (
            <Badge color="red" variant="filled">
              {t("automation.panel.pageDisabledWarning")}
            </Badge>
          )}
          <Badge variant="light" color="blue">{text.pages}: {snapshot.pages.length}</Badge>
          <Badge variant="light" color="gray">{text.nodes}</Badge>
          <Badge variant="light" color="gray">{text.edges}</Badge>
        </Group>
      </Group>

      <Modal opened={dialog === "create"} onClose={() => setDialog(null)} title={text.create} centered>
        <Stack gap="sm">
          <TextInput
            label={text.name}
            value={draftName}
            error={createDuplicate ? text.duplicateName : undefined}
            onChange={(event) => setDraftName(event.currentTarget.value)}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                confirmCreate();
              }
            }}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDialog(null)}>{text.cancel}</Button>
            <Button onClick={confirmCreate} disabled={createDisabled}>{text.createAction}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={dialog === "rename"} onClose={() => setDialog(null)} title={text.rename} centered>
        <Stack gap="sm">
          <TextInput
            label={text.name}
            value={draftName}
            error={renameDuplicate ? text.duplicateName : undefined}
            onChange={(event) => setDraftName(event.currentTarget.value)}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                confirmRename();
              }
            }}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDialog(null)}>{text.cancel}</Button>
            <Button onClick={confirmRename} disabled={renameDisabled}>{text.renameAction}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={dialog === "delete"} onClose={() => setDialog(null)} title={text.delete} centered>
        <Stack gap="sm">
          <Text size="sm">{text.deleteConfirm}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDialog(null)}>{text.cancel}</Button>
            <Button color="red" onClick={confirmDelete}>{text.deleteAction}</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
