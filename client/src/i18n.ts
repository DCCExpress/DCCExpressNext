import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import hu from "./i18n/hu.json";
import en from "./i18n/en.json";
import signalLogicHu from "./i18n/signalLogic.hu.json";
import signalLogicEn from "./i18n/signalLogic.en.json";

const savedLang = localStorage.getItem("lang") || "en";

const enTranslation = {
  ...en,
  ...signalLogicEn,
};

const huTranslation = {
  ...hu,
  ...signalLogicHu,
};

i18n.use(initReactI18next).init({
  resources: {
    hu: { translation: huTranslation },
    en: { translation: enTranslation },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;