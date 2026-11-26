"use client";
import { LC } from "@/content/pages/lc";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";

/** Offline (14-errors-offline__v1 E2): trilingual on purpose — no locale lookup needed. */
export function OfflineView() {
  return (
    <section className="grid min-h-[80dvh] place-items-center px-gutter py-16 text-center">
      <div className="grid max-w-2xl justify-items-center gap-6">
        <svg aria-hidden viewBox="0 0 240 160" className="w-80 max-w-full">
          <path d="M40 120a30 30 0 0 1 8-58 42 42 0 0 1 80-14 34 34 0 0 1 64 22 26 26 0 0 1 8 50Z" className="fill-sky-100" />
          <rect x="88" y="20" width="64" height="112" rx="12" className="fill-white stroke-navy-700" strokeWidth="6" />
          <path d="M100 70a28 28 0 0 1 40 0M108 82a16 16 0 0 1 24 0" className="fill-none stroke-navy-700" strokeWidth="6" strokeLinecap="round" />
          <circle cx="120" cy="94" r="5" className="fill-navy-700" />
          <path d="M102 104 138 58" className="stroke-danger" strokeWidth="6" strokeLinecap="round" />
          <path d="M166 26 176 10M176 40l16-10" className="stroke-gold-400" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <h1 className="text-h2 text-balance text-fg-heading">{LC.rw.errors.offlineBanner.split(", ")[0]} · {LC.en.errors.offlineBanner.split(", ")[0]} · {LC.fr.errors.offlineBanner.split(", ")[0]}</h1>
        <div className="grid gap-1 text-fg-muted">
          <p lang="rw">{LC.rw.errors.offlineBody}</p>
          <p lang="en">{LC.en.errors.offlineBody}</p>
          <p lang="fr">{LC.fr.errors.offlineBody}</p>
        </div>
        <Button size="lg" dots onClick={() => location.reload()}>Ongera · Retry · Réessayer</Button>
      </div>
    </section>
  );
}

/** "Saved on this phone" banner for forms (exported pattern; forms own the draft storage). */
export function OfflineBanner({ locale, saved }: { locale: keyof typeof LC; saved?: boolean }) {
  const c = LC[locale].errors;
  return (
    <div role="status" className="grid gap-2">
      <p className="flex items-center gap-2 border-l-[3px] border-gold-500 bg-warning-bg px-4 py-3 text-small font-medium text-warning"><span aria-hidden>⚠</span>{c.offlineBanner}</p>
      {saved && <p className="flex items-center justify-center gap-2 bg-success-bg px-4 py-2 text-small font-medium text-success">{c.saved}<Icon name="check" size={16} /></p>}
    </div>
  );
}
