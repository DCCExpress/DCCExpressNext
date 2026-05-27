// client/src/automationDialogRuntimeControlGuard.ts

const AUTOMATION_EDITOR_TITLES = [
  "Signal logic",
  "Jelzőlogika",
  "Signallogik",
  "Sorompólogika",
  "Level crossing logic",
  "Bahnübergang-Logik",
];

const RUNTIME_BUTTON_LABELS = new Set([
  "Start",
  "Stop",
  "Indítás",
  "Leállítás",
  "Starten",
  "Stoppen",
]);

const AUTOSTART_LABELS = new Set([
  "Autostart",
  "Automatikus indítás",
]);

function getText(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

function isAutomationEditorDialog(dialog: Element): boolean {
  const text = getText(dialog);
  return AUTOMATION_EDITOR_TITLES.some(title => text.includes(title));
}

function hideElement(element: HTMLElement): void {
  element.style.display = "none";
  element.setAttribute("aria-hidden", "true");
}

function hideRuntimeButtons(dialog: Element): void {
  dialog.querySelectorAll("button").forEach(button => {
    const label = getText(button);

    if (RUNTIME_BUTTON_LABELS.has(label)) {
      hideElement(button);
    }
  });
}

function hideAutostartCheckboxes(dialog: Element): void {
  dialog.querySelectorAll("label").forEach(label => {
    const text = getText(label);

    if (!AUTOSTART_LABELS.has(text)) {
      return;
    }

    const wrapper = label.closest("div") ?? label;

    if (wrapper instanceof HTMLElement) {
      hideElement(wrapper);
    }
  });
}

function applyAutomationDialogRuntimeControlGuard(): void {
  document.querySelectorAll('[role="dialog"], .mantine-Modal-content').forEach(dialog => {
    if (!isAutomationEditorDialog(dialog)) {
      return;
    }

    hideRuntimeButtons(dialog);
    hideAutostartCheckboxes(dialog);
  });
}

export function installAutomationDialogRuntimeControlGuard(): void {
  if (typeof window === "undefined") {
    return;
  }

  applyAutomationDialogRuntimeControlGuard();

  const observer = new MutationObserver(() => {
    applyAutomationDialogRuntimeControlGuard();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
