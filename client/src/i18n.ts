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
