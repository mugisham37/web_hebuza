"use client";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { LC, fmt } from "@/content/pages/lc";
import { Button, ButtonLink } from "@/components/atoms/button";

/** 500 (14-errors-offline__v1 E1): navy "Oops", reference id, try again / contact support. */
export function ErrorView({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { locale } = useI18n();
  const c = LC[locale].errors;
  const ref = error.digest ?? ("requestId" in error ? String(error.requestId ?? "") : "");
  return (
    <section role="alert" className="grid min-h-[80dvh] place-items-center theme-dark bg-grad-night-fade px-gutter py-16 text-center text-fg">
      <div className="grid max-w-xl justify-items-center gap-6"><span aria-hidden className="h-[3px] w-12 bg-rule" />
        <h1 className="text-fg-heading font-display text-[clamp(6rem,4rem+14vw,14rem)] leading-[0.85] tracking-[-0.05em]">{c.oops}</h1>
        <p className="text-lead">{c.errorBody}</p>
        {ref && <p className="text-small text-fg-muted">{fmt(c.reference, { id: ref })}</p>}
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="primary" dots size="lg" onClick={reset}>{c.retry}</Button>
          <ButtonLink href={localHref(locale, "/contact")} variant="outline-dark" size="lg">{c.support}</ButtonLink>
        </div>
      </div>
    </section>
  );
}
