// client/src/automationDialogRuntimeControlGuard.ts

const AUTOMATION_EDITOR_TITLES = [
  "Signal logic",
  "Signal Logic",
  "SignalLogic",
  "Signal control",
  "Jelzőlogika",
  "Jelző logika",
  "Jelzővezérlés",
  "Jelző vezérlés",
  "Signallogik",
  "Signalsteuerung",
  "Sorompólogika",
  "Sorompó logika",
  "Level crossing logic",
  "Bahnübergang-Logik",
];

const SIGNAL_LOGIC_EDITOR_MARKERS = [
  "Rules",
  "Preview",
  "Script",
  "Szabályok",
  "Előnézet",
  "Kód",
  "Regeln",
  "Vorschau",
];

const LEVEL_CROSSING_EDITOR_MARKERS = [
  "Close triggers",
  "Additional open conditions",
  "Actions",
  "Zárási feltételek",
  "További nyitási feltételek",
  "Műveletek",
  "Schließauslöser",
  "Zusätzliche Öffnungsbedingungen",
  "Aktionen",
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

const NOTICE_CLASS = "dcc-automation-editor-runtime-notice";

function getText(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

function containsAllMarkers(text: string, markers: string[]): boolean {
  return markers.every(marker => text.includes(marker));
}

function containsAnyMarker(text: string, markers: string[]): boolean {
  return markers.some(marker => text.includes(marker));
}

function isAutomationEditorDialog(dialog: Element): boolean {
  const text = getText(dialog);

  if (containsAnyMarker(text, AUTOMATION_EDITOR_TITLES)) {
    return true;
  }

  if (containsAllMarkers(text, SIGNAL_LOGIC_EDITOR_MARKERS)) {
    return true;
  }

  return containsAllMarkers(text, LEVEL_CROSSING_EDITOR_MARKERS);
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

function createNotice(): HTMLElement {
  const notice = document.createElement("div");
  notice.className = NOTICE_CLASS;
  notice.textContent = "Runtime control is available in the StatusBar Automation dashboard. This dialog only edits automation rules.";
  notice.style.margin = "0 0 8px 0";
  notice.style.padding = "8px 10px";
  notice.style.borderRadius = "8px";
  notice.style.border = "1px solid #228be6";
  notice.style.background = "rgba(34, 139, 230, 0.15)";
  notice.style.color = "inherit";
  notice.style.fontSize = "12px";
  notice.style.lineHeight = "1.35";
  return notice;
}

function insertRuntimeNotice(dialog: Element): void {
  if (dialog.querySelector(`.${NOTICE_CLASS}`)) {
    return;
  }

  const body = dialog.querySelector(".mantine-Modal-body")
    ?? dialog.querySelector("[class*=Modal-body]")
    ?? dialog;

  body.insertBefore(
    createNotice(),
    body.firstChild
  );
}

function applyAutomationDialogRuntimeControlGuard(): void {
  document.querySelectorAll('[role="dialog"], .mantine-Modal-content').forEach(dialog => {
    if (!isAutomationEditorDialog(dialog)) {
      return;
    }

    hideRuntimeButtons(dialog);
    hideAutostartCheckboxes(dialog);
    insertRuntimeNotice(dialog);
  });
}

export function installAutomationDialogRuntimeControlGuard(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  applyAutomationDialogRuntimeControlGuard();

  const observer = new MutationObserver(() => {
    applyAutomationDialogRuntimeControlGuard();
  });

  const intervalId = window.setInterval(() => {
    applyAutomationDialogRuntimeControlGuard();
  }, 500);

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => {
    window.clearInterval(intervalId);
    observer.disconnect();
  };
}
