import { useEffect } from "react";

const PAGE_SELECT_SELECTOR = "[data-automation-toolbar-page-select='true']";
const ENABLED_SWITCH_SELECTOR = "[data-automation-toolbar-enabled-switch='true']";

function placePageEnabledControl(): void {
  const dialogRoot = document.querySelector<HTMLElement>(".automation-flow-dialog-body");
  if (!dialogRoot) {
    return;
  }

  const pageSelectRoot = dialogRoot.querySelector<HTMLElement>(PAGE_SELECT_SELECTOR);
  const enabledSwitchRoot = dialogRoot.querySelector<HTMLElement>(ENABLED_SWITCH_SELECTOR);
  const pageSelectSlot = pageSelectRoot?.parentElement;
  const enabledSlot = enabledSwitchRoot?.parentElement;
  const toolbarGroup = pageSelectSlot?.parentElement;

  if (!pageSelectSlot || !enabledSlot || !toolbarGroup) {
    return;
  }

  if (enabledSlot.parentElement !== toolbarGroup) {
    return;
  }

  enabledSlot.dataset.automationToolbarEnabledSlot = "true";
  enabledSlot.style.display = "flex";
  enabledSlot.style.alignItems = "center";
  enabledSlot.style.flexShrink = "0";

  if (pageSelectSlot.nextElementSibling !== enabledSlot) {
    toolbarGroup.insertBefore(enabledSlot, pageSelectSlot.nextSibling);
  }
}

export default function AutomationPageEnabledToolbarPlacement() {
  useEffect(() => {
    placePageEnabledControl();

    const dialogRoot = document.querySelector<HTMLElement>(".automation-flow-dialog-body");
    if (!dialogRoot) {
      return;
    }

    const observer = new MutationObserver(placePageEnabledControl);
    observer.observe(dialogRoot, {
      childList: true,
      subtree: true,
    });

    const intervalId = window.setInterval(placePageEnabledControl, 250);

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
