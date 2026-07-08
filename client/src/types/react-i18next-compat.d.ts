import type { i18n as I18n } from "i18next";

import "react-i18next";

type DccExpressTranslationFunction = (...args: unknown[]) => string;

type DccExpressUseTranslationResponse = [
  t: DccExpressTranslationFunction,
  i18n: I18n,
  ready: boolean,
] & {
  t: DccExpressTranslationFunction;
  i18n: I18n;
  ready: boolean;
};

declare module "react-i18next" {
  function useTranslation(): DccExpressUseTranslationResponse;
}
