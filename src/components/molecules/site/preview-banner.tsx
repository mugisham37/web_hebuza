import { draftMode } from "next/headers";
import { PreviewExit } from "./preview-exit";

const COPY = {
  en: { t: "Draft preview, not public", exit: "Exit preview" },
  fr: { t: "Aperçu du brouillon, non public", exit: "Quitter l'aperçu" },
  rw: { t: "Umushinga, ntiwatangajwe", exit: "Va mu kureba" },
} as const;

/** Sticky high-contrast band while Draft Mode is on (plan 10 §2.6). Exit posts to /preview/exit with the current path. */
export async function PreviewBanner({ locale }: { locale: keyof typeof COPY }) {
  if (!(await draftMode()).isEnabled) return null;
  const c = COPY[locale] ?? COPY.en;
  return (
    <div role="status" className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 theme-dark bg-ink-950 px-4 py-2 text-small text-fg m-rise">
      <span className="size-2 rounded-full bg-gold-400" data-round aria-hidden />
      <strong className="font-medium">{c.t}</strong>
      <PreviewExit label={c.exit} />
    </div>
  );
}
