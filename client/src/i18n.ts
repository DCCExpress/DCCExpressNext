import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import hu from "./i18n/hu.json";
import en from "./i18n/en.json";
import de from "./i18n/de.json";
import signalLogicHu from "./i18n/signalLogic.hu.json";
import signalLogicEn from "./i18n/signalLogic.en.json";
import signalLogicDe from "./i18n/signalLogic.de.json";

type SupportedLanguage = "en" | "hu" | "de";

const supportedLanguages: SupportedLanguage[] = ["en", "hu", "de"];

function normalizeLanguage(language: string | null | undefined): SupportedLanguage | null {
  const shortCode = language?.split("-")[0]?.toLowerCase();

  if (supportedLanguages.includes(shortCode as SupportedLanguage)) {
    return shortCode as SupportedLanguage;
  }

  return null;
}

function readInitialLanguage(): SupportedLanguage {
  const urlLanguage = normalizeLanguage(
    new URLSearchParams(window.location.search).get("lang")
  );

  if (urlLanguage) {
    localStorage.setItem("lang", urlLanguage);
    return urlLanguage;
  }

  return normalizeLanguage(localStorage.getItem("lang")) ?? "en";
}

const savedLang = readInitialLanguage();

const enTranslation = {
  ...en,
  home: {
    ...en.home,
    thanksDescription:
      "DCCExpress stands on the shoulders of excellent open-source tools, modern web technologies, and a good dose of AI-assisted brainstorming.",
  },
  locodialog: {
    ...en.locodialog,
    tabs: {
      general: "General",
      functions: "Functions",
      actions: "Actions",
    },
    train_type: "Train type",
    occupancy_detection_position: "Occupancy detection position",
    last_run_at: "Last run / stopped at",
    last_run_at_empty: "Not recorded yet",
    trainTypes: {
      passenger: "Passenger",
      freight: "Freight",
      mixed: "Mixed",
      maintenance: "Maintenance",
      other: "Other",
    },
    occupancyDetectionPositions: {
      forward: "Forward end",
      reverse: "Reverse end",
      both: "Both ends",
    },
  },
  blockActions: {
    menu: "Blocks",
    managerTitle: "Block actions",
    blocks: "Blocks",
    emptyBlocks: "No blocks found on the layout.",
    selectBlock: "Select a block from the list or add blocks to the layout first.",
    blockDetails: "ID: {{id}} | Address: {{address}} | Sensor: {{sensor}}",
    totalActions: "{{count}} actions",
  },
  settings: {
    ...en.settings,
    languages: {
      en: "English",
      hu: "Magyar",
      de: "Deutsch",
    },
  },
  ...signalLogicEn,
};

const huTranslation = {
  ...hu,
  home: {
    ...hu.home,
    thanksDescription:
      "A DCCExpress kiváló nyílt forráskódú eszközökre, modern webes technológiákra és egy jó adag AI-segített ötletelésre épül.",
  },
  locodialog: {
    ...hu.locodialog,
    tabs: {
      general: "Általános",
      functions: "Funkciók",
      actions: "Műveletek",
    },
    train_type: "Vonat típusa",
    occupancy_detection_position: "Foglaltság érzékelése",
    last_run_at: "Utolsó futás / megállás ideje",
    last_run_at_empty: "Még nincs rögzítve",
    trainTypes: {
      passenger: "Személy",
      freight: "Teher",
      mixed: "Vegyes",
      maintenance: "Üzemi / karbantartó",
      other: "Egyéb",
    },
    occupancyDetectionPositions: {
      forward: "Elöl (forward)",
      reverse: "Hátul (reverse)",
      both: "Mindkét végén",
    },
  },
  blockActions: {
    menu: "Blocks",
    managerTitle: "Block actionök",
    blocks: "Blokkok",
    emptyBlocks: "Nincs blokk a layouton.",
    selectBlock: "Válassz egy blokkot a listából, vagy előbb tegyél blokkokat a layoutra.",
    blockDetails: "ID: {{id}} | Cím: {{address}} | Szenzor: {{sensor}}",
    totalActions: "{{count}} action",
  },
  settings: {
    ...hu.settings,
    languages: {
      en: "English",
      hu: "Magyar",
      de: "Deutsch",
    },
  },
  ...signalLogicHu,
};

const deTranslation = {
  ...de,
  home: {
    ...de.home,
    thanksDescription:
      "DCCExpress baut auf hervorragenden Open-Source-Werkzeugen, modernen Webtechnologien und einer guten Portion KI-gestütztem Brainstorming auf.",
  },
  locodialog: {
    ...de.locodialog,
    tabs: {
      general: "Allgemein",
      functions: "Funktionen",
      actions: "Aktionen",
    },
    train_type: "Zugtyp",
    occupancy_detection_position: "Belegterkennung",
    last_run_at: "Letzte Fahrt / Halt um",
    last_run_at_empty: "Noch nicht erfasst",
    trainTypes: {
      passenger: "Personenzug",
      freight: "Güterzug",
      mixed: "Gemischt",
      maintenance: "Dienst-/Wartungszug",
      other: "Sonstiges",
    },
    occupancyDetectionPositions: {
      forward: "Vorne (forward)",
      reverse: "Hinten (reverse)",
      both: "An beiden Enden",
    },
  },
  blockActions: {
    menu: "Blöcke",
    managerTitle: "Blockaktionen",
    blocks: "Blöcke",
    emptyBlocks: "Keine Blöcke im Layout gefunden.",
    selectBlock: "Wähle einen Block aus der Liste aus oder füge zuerst Blöcke zum Layout hinzu.",
    blockDetails: "ID: {{id}} | Adresse: {{address}} | Sensor: {{sensor}}",
    totalActions: "{{count}} Aktionen",
  },
  settings: {
    ...de.settings,
    languages: {
      en: "English",
      hu: "Magyar",
      de: "Deutsch",
    },
  },
  ...signalLogicDe,
};

i18n.use(initReactI18next).init({
  resources: {
    hu: { translation: huTranslation },
    en: { translation: enTranslation },
    de: { translation: deTranslation },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;