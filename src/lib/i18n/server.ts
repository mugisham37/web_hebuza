import "server-only";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/shared/i18n/config";
import { createTranslator, type Dictionary } from "./translate";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  rw: () => import("@/shared/i18n/dictionaries/rw.json").then((m) => m.default),
  en: () => import("@/shared/i18n/dictionaries/en.json").then((m) => m.default),
  fr: () => import("@/shared/i18n/dictionaries/fr.json").then((m) => m.default),
};

export const getDictionary = (locale: Locale) => dictionaries[locale]();

/** Resolve the [locale] param (404 on unknown) and return a translator for server components. */
export async function getI18n(params: Promise<{ locale: string }>) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return { locale, dict, t: createTranslator(dict, locale) };
}
