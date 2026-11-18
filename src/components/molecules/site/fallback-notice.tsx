import { Icon } from "@/components/atoms/icon";
import type { Locale } from "@/shared/marketing/types";

const NAME: Record<Locale, Record<Locale, string>> = {
  en: { rw: "Kinyarwanda", en: "English", fr: "French" },
  fr: { rw: "kinyarwanda", en: "anglais", fr: "français" },
  rw: { rw: "Kinyarwanda", en: "Icyongereza", fr: "Igifaransa" },
};
const T: Record<Locale, (want: string, got: string) => string> = {
  en: (w, g) => `This page is not yet available in ${w}, so it is shown in ${g}.`,
  fr: (w, g) => `Cette page n'est pas encore disponible en ${w} : elle est affichée en ${g}.`,
  rw: (w, g) => `Iyi paji ntiraboneka mu ${w}, turayikwereka mu ${g}.`,
};

/** Shown when a CMS page renders another language's variant (plan 10 §2.6). */
export function FallbackNotice({ locale, served }: { locale: Locale; served?: Locale }) {
  if (!served || served === locale) return null;
  return (
    <p role="note" className="mb-6 flex items-start gap-2 border-l-4 border-info bg-info-bg px-4 py-3 text-small text-fg m-rise">
      <Icon name="globe" size={16} className="mt-0.5 shrink-0 text-info" aria-hidden />
      {T[locale](NAME[locale][locale], NAME[locale][served])}
    </p>
  );
}

/** "Under review" band on stale regulatory content (F-CMS-07). */
export function StaleNotice({ locale }: { locale: Locale }) {
  const t = { en: "This update is under review and may be out of date.", fr: "Cette actualité est en cours de révision et peut être obsolète.", rw: "Iri vugurura rirasuzumwa, rishobora kuba ritakigezweho." }[locale];
  return <p role="note" className="mb-6 flex items-center gap-2 border-l-4 border-warning bg-warning-bg px-4 py-3 text-small text-warning"><Icon name="refresh" size={16} aria-hidden />{t}</p>;
}
