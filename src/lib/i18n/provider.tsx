"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "@/shared/i18n/config";
import { createTranslator, type Dictionary, type Translator } from "./translate";

const Ctx = createContext<{ locale: Locale; t: Translator } | null>(null);

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: createTranslator(dict, locale) }), [locale, dict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export { localHref } from "@/shared/i18n/config";
