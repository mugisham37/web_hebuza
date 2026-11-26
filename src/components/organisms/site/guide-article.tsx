import type { Locale } from "@/shared/i18n/config";
import { localHref } from "@/shared/i18n/config";
import { formatDate } from "@/shared/format";
import { waLink } from "@/content/marketing";
import { guidesCopy, fill } from "@/content/guides/copy";
import { guideShots, guideText } from "@/content/guides";
import type { Guide } from "@/content/guides/types";
import { Icon } from "@/components/atoms/icon";
import { ButtonLink } from "@/components/atoms/button";
import { Callout } from "@/components/atoms/guide";
import { Breadcrumb } from "@/components/organisms/site/sections";
import {
  FactsBox,
  GuideResult,
  GuideStep,
  Helpful,
  OnThisPage,
} from "@/components/molecules/site/guide";
import { GuideWalkthrough } from "@/components/organisms/site/guide-walkthrough";

/** One guide: breadcrumb, title + meta, facts box, numbered steps with annotated screenshots, tips, questions, feedback, related, help. */
export function GuideArticle({
  guide,
  locale,
  related,
  base,
}: {
  guide: Guide;
  locale: Locale;
  related: Guide[];
  base: "/guides" | "/guides/team";
}) {
  const c = guidesCopy(locale);
  const t = guideText(guide, locale);
  const shots = guideShots(locale);
  const L = (p: string) => localHref(locale, p);
  const toc = t.sections.map((s) => ({ id: s.id, title: s.title }));
  // running step numbers across sections
  const first = Object.fromEntries(t.sections.map((s, i) => [s.id, t.sections.slice(0, i).reduce((a, x) => a + (x.steps?.length ?? 0), 0)]));
  const walk = t.sections.flatMap((s) =>
    (s.steps ?? []).map((st) => ({ ...st, section: s.title })),
  );
  return (
    <article className="px-gutter pt-[calc(var(--header-h)+2rem)] pb-[var(--spacing-section-sm)]">
      <div className="container-page grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[13rem_minmax(0,48rem)_1fr]">
        <aside className="max-lg:hidden">
          <div className="sticky top-28">
            <OnThisPage title={c.onThisPage} items={toc} />
          </div>
        </aside>
        <div className="grid min-w-0 content-start gap-8">
          <header className="grid gap-4 border-b border-border pb-8">
            <Breadcrumb
              items={[
                { label: c.tag, href: L("/guides") },
                ...(base === "/guides/team"
                  ? [{ label: c.teamTitle, href: L("/guides/team") }]
                  : []),
                { label: c.cats[guide.cat] },
              ]}
            />
            <h1 className="text-[clamp(2rem,1.5rem+2vw,3rem)] leading-[1.08] tracking-[-0.035em] text-fg-heading">
              {t.title}
            </h1>
            <p className="max-w-2xl text-lead text-fg-muted">{t.summary}</p>
            <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-small text-fg-subtle">
              <span className="flex items-center gap-1.5">
                <Icon name="calendar" size={15} />
                {fill(c.updated, { d: formatDate(guide.updated, locale) })}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="clock" size={15} />
                {fill(c.read, { n: guide.minutes })}
              </span>
            </p>
            {walk.length > 1 && (
              <div className="pt-2">
                <GuideWalkthrough
                  title={t.title}
                  steps={walk}
                  shots={shots}
                  copy={{
                    walk: c.walk,
                    walkStep: c.walkStep,
                    close: c.close,
                    prev: c.prev,
                    next: c.next,
                    zoom: c.zoom,
                  }}
                />
              </div>
            )}
          </header>

          {t.facts && <FactsBox facts={t.facts} labels={c.facts} />}

          {t.sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-h`}
              className="grid scroll-mt-32 gap-5"
            >
              <h2 id={`${s.id}-h`} className="text-h3 text-fg-heading">
                {s.title}
              </h2>
              {s.intro && <p className="text-body text-ink-800">{s.intro}</p>}
              {s.steps && (
                <ol className="grid gap-8">
                  {s.steps.map((st, k) => {
                    const n = first[s.id] + k + 1;
                    return (
                      <GuideStep
                        key={n}
                        n={n}
                        step={st}
                        shots={shots}
                        copy={{ zoom: c.zoom, close: c.close }}
                        priority={n === 1}
                      />
                    );
                  })}
                </ol>
              )}
              {s.tips && s.tips.length > 0 && (
                <Callout kind="tip" title={c.tip}>
                  <ul className="grid gap-1.5">
                    {s.tips.map((x) => (
                      <li key={x} className="flex gap-2">
                        <Icon
                          name="check"
                          size={16}
                          className="mt-1 shrink-0 text-navy-700"
                        />
                        {x}
                      </li>
                    ))}
                  </ul>
                </Callout>
              )}
              {s.warn && (
                <Callout kind="warn" title={c.warn}>
                  {s.warn}
                </Callout>
              )}
              {s.faq && s.faq.length > 0 && (
                <div className="divide-y divide-border border border-border bg-white">
                  {s.faq.map((f) => (
                    <details key={f.q} className="group px-5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-label [&::-webkit-details-marker]:hidden">
                        {f.q}
                        <Icon
                          name="plus"
                          size={16}
                          className="shrink-0 transition-transform group-open:rotate-45"
                        />
                      </summary>
                      <p className="pb-4 text-body text-fg-muted">{f.a}</p>
                    </details>
                  ))}
                </div>
              )}
            </section>
          ))}

          <Helpful id={`${locale}:${guide.slug}`} copy={c} />

          {related.length > 0 && (
            <section aria-labelledby="related-h" className="grid gap-4">
              <h2 id="related-h" className="text-h3">
                {c.related}
              </h2>
              <ul className="grid gap-3">
                {related.map((r) => {
                  const rt = guideText(r, locale);
                  return (
                    <li key={r.slug}>
                      <GuideResult
                        href={L(`${base}/${r.slug}`)}
                        cat={c.cats[r.cat]}
                        title={rt.title}
                        ranges={[]}
                        summary={rt.summary}
                        minutes={fill(c.read, { n: r.minutes })}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="grid justify-items-center gap-4 border border-border bg-sky-100 px-6 py-10 text-center">
            <span className="flex size-12 items-center justify-center bg-white text-navy-700">
              <Icon name="message" size={22} />
            </span>
            <h2 className="text-h3 text-navy-900">{c.stillTitle}</h2>
            <p className="max-w-md text-body text-navy-800">{c.stillBody}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink href={L("/book")} variant="secondary" dots>
                {c.book}
              </ButtonLink>
              <a
                href={waLink(`HEBUZA: ${t.title}`)}
                target="_blank"
                rel="noopener"
                className="inline-flex h-11 items-center gap-2 border border-border-strong bg-white px-5 text-button text-ink-900 hover:bg-sky-50"
              >
                {c.whatsapp}
              </a>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}
