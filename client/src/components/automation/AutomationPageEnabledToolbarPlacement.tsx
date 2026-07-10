import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const PAGE_SELECT_SELECTOR = "[data-automation-toolbar-page-select='true']";
const ENABLED_SWITCH_SELECTOR = "[data-automation-toolbar-enabled-switch='true']";

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function findOriginalPageEnabledSwitch(
  dialogRoot: HTMLElement,
  pageEnabledLabel: string
): HTMLElement | null {
  const alreadyMoved = dialogRoot.querySelector<HTMLElement>(ENABLED_SWITCH_SELECTOR);
  if (alreadyMoved) {
    return alreadyMoved;
  }

  const editorRoot = dialogRoot.querySelector<HTMLElement>(".automation-flow-editor-body");
  if (!editorRoot) {
    return null;
  }

  const wanted = normalizeText(pageEnabledLabel);
  const switches = Array.from(editorRoot.querySelectorAll<HTMLElement>(".mantine-Switch-root"));

  return switches.find(switchRoot => {
    const label = switchRoot.querySelector<HTMLElement>(
      ".mantine-Switch-label, label"
    );
    return normalizeText(label?.textContent) === wanted;
  }) ?? null;
}

function findToolbarEnabledSlot(
  toolbarGroup: HTMLElement,
  pageSelectSlot: HTMLElement
): HTMLElement | null {
  const existing = toolbarGroup.querySelector<HTMLElement>(
    ":scope > [data-automation-toolbar-enabled-slot='true']"
  );
  if (existing) {
    return existing;
  }

  const candidates = Array.from(toolbarGroup.children)
    .filter((element): element is HTMLElement => element instanceof HTMLElement)
    .filter(element => element !== pageSelectSlot)
    .filter(element => element.tagName !== "BUTTON")
    .filter(element => !element.classList.contains("mantine-Divider-root"))
    .filter(element => !element.classList.contains("mantine-Text-root"));

  const emptyCandidate = [...candidates].reverse().find(element => (
    element.childElementCount === 0 &&
    element.textContent?.trim().length === 0
  ));

  return emptyCandidate ?? null;
}

function placePageEnabledControl(pageEnabledLabel: string): void {
  const dialogRoot = document.querySelector<HTMLElement>(".automation-flow-dialog-body");
  if (!dialogRoot) {
    return;
  }

  const pageSelectRoot = dialogRoot.querySelector<HTMLElement>(PAGE_SELECT_SELECTOR);
  const pageSelectSlot = pageSelectRoot?.parentElement;
  const toolbarGroup = pageSelectSlot?.parentElement;

  if (!pageSelectSlot || !toolbarGroup) {
    return;
  }

  const enabledSwitchRoot = findOriginalPageEnabledSwitch(dialogRoot, pageEnabledLabel);
  const enabledSlot = enabledSwitchRoot?.parentElement?.dataset.automationToolbarEnabledSlot === "true"
    ? enabledSwitchRoot.parentElement
    : findToolbarEnabledSlot(toolbarGroup, pageSelectSlot);

  if (!enabledSwitchRoot || !enabledSlot) {
    return;
  }

  enabledSwitchRoot.dataset.automationToolbarEnabledSwitch = "true";
  enabledSwitchRoot.style.margin = "0";
  enabledSwitchRoot.style.minWidth = "auto";
  enabledSwitchRoot.style.maxWidth = "none";

  const description = enabledSwitchRoot.querySelector<HTMLElement>(
    ".mantine-Switch-description, .mantine-InputWrapper-description"
  );
  if (description) {
    description.style.display = "none";
  }

  const label = enabledSwitchRoot.querySelector<HTMLElement>(
    ".mantine-Switch-label, label"
  );
  if (label) {
    label.style.whiteSpace = "nowrap";
  }

  enabledSlot.dataset.automationToolbarEnabledSlot = "true";
  enabledSlot.style.display = "flex";
  enabledSlot.style.alignItems = "center";
  enabledSlot.style.flexShrink = "0";
  enabledSlot.style.paddingRight = "12px";
  enabledSlot.style.marginRight = "4px";
  enabledSlot.style.borderRight = "1px solid var(--mantine-color-default-border)";

  if (enabledSwitchRoot.parentElement !== enabledSlot) {
    enabledSlot.appendChild(enabledSwitchRoot);
  }

  if (pageSelectSlot.nextElementSibling !== enabledSlot) {
    toolbarGroup.insertBefore(enabledSlot, pageSelectSlot.nextSibling);
  }
}

export default function AutomationPageEnabledToolbarPlacement() {
  const { t } = useTranslation();
  const pageEnabledLabel = t("automation.panel.pageEnabledLabel");

  useEffect(() => {
    const place = () => placePageEnabledControl(pageEnabledLabel);

    place();

    const dialogRoot = document.querySelector<HTMLElement>(".automation-flow-dialog-body");
    if (!dialogRoot) {
      return;
    }

    const observer = new MutationObserver(place);
    observer.observe(dialogRoot, {
      childList: true,
      subtree: true,
    });

    const intervalId = window.setInterval(place, 100);

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);
    };
  }, [pageEnabledLabel]);

  return null;
}
