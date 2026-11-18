"use client";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { LC } from "@/content/pages/lc";
import { ButtonLink } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";

/** 404 (14-errors-offline__v1 E1): giant yellow 404, tilted pill, service search, home / all services. */
export function NotFoundView() {
  const { locale } = useI18n();
  const c = LC[locale].errors;
  return (
    <section className="grid min-h-[80dvh] place-items-center overflow-hidden px-gutter py-16 text-center">
      <div className="grid w-full max-w-xl justify-items-center gap-6">
        <div className="relative">
          <p aria-hidden className="font-display text-[clamp(8rem,5rem+20vw,18rem)] leading-[0.85] tracking-[-0.06em] text-navy-700">404</p>
          <h1 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold-200 px-6 py-2 text-h3 text-fg-heading whitespace-nowrap shadow-sm">{c.notFoundPill}</h1>
        </div>
        <p className="max-w-sm text-lead">{c.notFoundBody}</p>
        <form role="search" action={localHref(locale, "/services")} className="relative w-full">
          <label htmlFor="nf-q" className="sr-only">{c.search}</label>
          <input id="nf-q" name="q" type="search" placeholder={c.search} className="h-14 w-full border border-border-strong bg-white pr-14 pl-6 text-body focus:border-navy-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-focus" />
          <button type="submit" aria-label={c.search} className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center text-navy-700 hover:bg-navy-50"><Icon name="search" /></button>
        </form>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href={localHref(locale, "/")} dots size="lg">{c.home}</ButtonLink>
          <ButtonLink href={localHref(locale, "/services")} variant="outline" size="lg">{c.services}</ButtonLink>
        </div>
      </div>
    </section>
  );
}
