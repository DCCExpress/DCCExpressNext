import "i18next";

declare module "i18next" {
  interface TFunction<Ns extends Namespace = DefaultNamespace, KPrefix = undefined> {
    (key: string, options?: Record<string, unknown>): string;
  }
}
