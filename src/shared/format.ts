// Mirror of server/src/domain/format.ts — UI display only; the server enforces.
import { intlLocale, type Locale } from "@/shared/i18n/config";

export const TIME_ZONE = "Africa/Kigali";

/** Money is stored as integer amount + ISO currency (spec/00 Money). RWF has no subunit. */
export function formatMoney(amount: number, currency = "RWF", locale: Locale = "rw"): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: currency === "RWF" ? 0 : 2,
  }).format(amount);
}

export function formatNumber(n: number, locale: Locale = "rw"): string {
  return new Intl.NumberFormat(intlLocale[locale]).format(n);
}

export function formatDate(
  value: string | number | Date,
  locale: Locale = "rw",
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(intlLocale[locale], { timeZone: TIME_ZONE, ...opts }).format(new Date(value));
}

export const formatDateTime = (v: string | number | Date, locale: Locale = "rw") =>
  formatDate(v, locale, { dateStyle: "medium", timeStyle: "short" });

export function formatRelative(value: string | number | Date, locale: Locale = "rw", now = Date.now()): string {
  const diff = (new Date(value).getTime() - now) / 1000;
  if (!Number.isFinite(diff)) return ""; // missing/invalid timestamp: RelativeTimeFormat throws on NaN
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  const rtf = new Intl.RelativeTimeFormat(intlLocale[locale], { numeric: "auto" });
  for (const [unit, secs] of units) if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  return rtf.format(Math.round(diff), "second");
}

/** Mask sensitive identifiers in lists: "•••• 4821" (spec/02 §4.1). */
export function mask(value: string | null | undefined, visible = 4): string {
  if (!value) return "";
  const clean = value.replace(/\s/g, "");
  return clean.length <= visible ? clean : `•••• ${clean.slice(-visible)}`;
}

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
