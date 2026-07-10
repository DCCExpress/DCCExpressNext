import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

type PageActionDialog = "create" | "rename" | "delete" | null;

type PageDomElements = {
  pageNameInput: HTMLInputElement | null;
  addButton: HTMLButtonElement | null;
  deleteButton: HTMLButtonElement | null;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function findButtonByText(root: HTMLElement, label: string): HTMLButtonElement | null {
  const wanted = normalizeText(label);

  return Array.from(root.querySelectorAll("button"))
    .find(button => normalizeText(button.textContent) === wanted) ?? null;
}

function findInputByLabel(root: HTMLElement, label: string): HTMLInputElement | null {
  const wanted = normalizeText(label);
  const labels = Array.from(root.querySelectorAll("label"));
  const fieldLabel = labels.find(item => normalizeText(item.textContent) === wanted);

  if (!fieldLabel) {
    return null;
  }

  const inputId = fieldLabel.getAttribute("for");
  if (inputId) {
    const input = root.querySelector<HTMLInputElement>(`#${CSS.escape(inputId)}`);
    if (input) {
      return input;
    }
  }

  return fieldLabel.parentElement?.querySelector("input") ?? null;
}

function findFieldRoot(input: HTMLInputElement | null): HTMLElement | null {
  let current = input?.parentElement ?? null;

  for (let depth = 0; current && depth < 7; depth += 1) {
    if (current.querySelector("label") && current.querySelector("input")) {
      return current;
    }

    current = current.parentElement;
  }

  return input?.parentElement ?? null;
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

function usePageActionBridgeDom() {
  const { t } = useTranslation();
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  const [deleteDisabled, setDeleteDisabled] = useState(false);
  const elementsRef = useRef<PageDomElements>({
    pageNameInput: null,
    addButton: null,
    deleteButton: null,
  });
  const restoreDisplayRef = useRef(new Map<HTMLElement, string>());

  const labels = useMemo(() => ({
    pageName: t("automation.panel.pageName"),
    addPage: t("automation.panel.addPage"),
    deletePage: t("automation.panel.deletePage"),
  }), [t]);

  useEffect(() => {
    const dialogRoot = document.querySelector<HTMLElement>(".automation-flow-dialog-body");
    if (!dialogRoot) {
      return;
    }

    const root = dialogRoot;

    function hideElement(element: HTMLElement | null): void {
      if (!element) {
        return;
      }

      if (!restoreDisplayRef.current.has(element)) {
        restoreDisplayRef.current.set(element, element.style.display);
      }

      element.style.display = "none";
    }

    function syncDom(): void {
      const pageNameInput = findInputByLabel(root, labels.pageName);
      const addButton = findButtonByText(root, labels.addPage);
      const deleteButton = findButtonByText(root, labels.deletePage);
      const pageNameRoot = findFieldRoot(pageNameInput);
      const addDeleteGroup = addButton && deleteButton && addButton.parentElement === deleteButton.parentElement
        ? addButton.parentElement
        : null;

      elementsRef.current = {
        pageNameInput,
        addButton,
        deleteButton,
      };
      setDeleteDisabled(deleteButton?.disabled === true);

      hideElement(pageNameRoot);
      hideElement(addDeleteGroup);

      if (!pageNameRoot?.parentElement) {
        return;
      }

      let mountElement = root.querySelector<HTMLElement>("[data-automation-page-action-bridge]");
      if (!mountElement) {
        mountElement = document.createElement("div");
        mountElement.dataset.automationPageActionBridge = "true";
      }

      if (mountElement.parentElement !== pageNameRoot.parentElement) {
        pageNameRoot.parentElement.insertBefore(mountElement, pageNameRoot.nextSibling);
      }

      setPortalElement(mountElement);
    }

    syncDom();

    const observer = new MutationObserver(syncDom);
    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    const intervalId = window.setInterval(syncDom, 500);

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);

      restoreDisplayRef.current.forEach((display, element) => {
        element.style.display = display;
      });
      restoreDisplayRef.current.clear();

      const mountElement = root.querySelector<HTMLElement>("[data-automation-page-action-bridge]");
      mountElement?.remove();
    };
  }, [labels]);

  return {
    portalElement,
    elementsRef,
    deleteDisabled,
  };
}

export default function AutomationPageActionsBridge() {
  const { t } = useTranslation();
  const {
    portalElement,
    elementsRef,
    deleteDisabled,
  } = usePageActionBridgeDom();
  const [dialog, setDialog] = useState<PageActionDialog>(null);
  const [draftName, setDraftName] = useState("");

  const text = {
    actions: t("automation.panel.pageActions", { defaultValue: "Lap műveletek" }),
    create: t("automation.panel.createPageDialogTitle", { defaultValue: "Új automatika lap" }),
    createAction: t("automation.panel.createPageAction", { defaultValue: "Új lap" }),
    rename: t("automation.panel.renamePageDialogTitle", { defaultValue: "Lap átnevezése" }),
    renameAction: t("automation.panel.renamePageAction", { defaultValue: "Átnevezés" }),
    delete: t("automation.panel.deletePageDialogTitle", { defaultValue: "Lap törlése" }),
    deleteAction: t("automation.panel.deletePageAction", { defaultValue: "Törlés" }),
    cancel: t("common.cancel", { defaultValue: "Mégse" }),
    name: t("automation.panel.pageName", { defaultValue: "Lap neve" }),
    deleteConfirm: t("automation.panel.deletePageConfirm", {
      defaultValue: "Biztosan törlöd az aktív automatika lapot? A rajta lévő node-ok és élek is törlődnek.",
    }),
  };

  function getCurrentPageName(): string {
    return elementsRef.current.pageNameInput?.value ?? "";
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
    if (name.length === 0) {
      return;
    }

    elementsRef.current.addButton?.click();
    window.setTimeout(() => applyPageName(name), 0);
    window.setTimeout(() => applyPageName(name), 80);
    setDialog(null);
  }

  function confirmRename(): void {
    applyPageName(draftName);
    setDialog(null);
  }

  function confirmDelete(): void {
    elementsRef.current.deleteButton?.click();
    setDialog(null);
  }

  const actionButtons = (
    <Group gap="xs" mt="xs" wrap="nowrap">
      <Tooltip label={text.createAction}>
        <ActionIcon variant="light" aria-label={text.createAction} onClick={openCreateDialog}>
          <IconPlus size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={text.renameAction}>
        <ActionIcon variant="light" aria-label={text.renameAction} onClick={openRenameDialog}>
          <IconPencil size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={text.deleteAction}>
        <ActionIcon
          color="red"
          variant="light"
          aria-label={text.deleteAction}
          disabled={deleteDisabled}
          onClick={() => setDialog("delete")}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Tooltip>
      <Text size="xs" c="dimmed" fw={700}>
        {text.actions}
      </Text>
    </Group>
  );

  return (
    <>
      {portalElement ? createPortal(actionButtons, portalElement) : null}

      <Modal opened={dialog === "create"} onClose={() => setDialog(null)} title={text.create} centered>
        <Stack gap="sm">
          <TextInput
            label={text.name}
            value={draftName}
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
            <Button onClick={confirmCreate} disabled={draftName.trim().length === 0}>{text.createAction}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={dialog === "rename"} onClose={() => setDialog(null)} title={text.rename} centered>
        <Stack gap="sm">
          <TextInput
            label={text.name}
            value={draftName}
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
            <Button onClick={confirmRename} disabled={draftName.trim().length === 0}>{text.renameAction}</Button>
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
    </>
  );
}
