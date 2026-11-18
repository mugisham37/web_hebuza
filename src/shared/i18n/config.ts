// Mirror of server/src/domain/i18n/config.ts — UI display only; the server enforces.
// Pure (edge-safe) locale config — imported by proxy.ts, so no server-only deps here.
export const locales = ["rw", "en", "fr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "rw";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const localeNames: Record<Locale, string> = { rw: "Kinyarwanda", en: "English", fr: "Français" };
/** BCP-47 tags for Intl formatting. */
// Chromium/Safari ship no "rw" Intl data (they fall back to en-US) while Node does, so "rw-RW" made server and
// client format numbers/dates differently (hydration error #418). en-RW is supported by both.
export const intlLocale: Record<Locale, string> = { rw: "en-RW", en: "en-RW", fr: "fr-RW" };

export const hasLocale = (value: string | undefined | null): value is Locale =>
  !!value && (locales as readonly string[]).includes(value);

/** Pick the best supported locale from an Accept-Language header. */
export function matchLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return ranked.find((r) => hasLocale(r.lang))?.lang as Locale ?? defaultLocale;
}

/** Path without its leading locale segment: "/en/ops/cases" → "/ops/cases". */
export function stripLocale(pathname: string): string {
  const [, first, ...rest] = pathname.split("/");
  return hasLocale(first) ? `/${rest.join("/")}` : pathname;
}

/** Locale-prefixed href: localHref("en", "/services") → "/en/services". */
export const localHref = (locale: Locale, path: string) => `/${locale}${path === "/" ? "" : path}`;
