import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { localHref, locales } from "@/shared/i18n/config";
import { getService } from "@/lib/catalogue";
import { formatDate, formatMoney } from "@/shared/format";
import { SITE_URL } from "@/lib/site";
import { getLd } from "@/content/pages/ld";
import { getGuide, getGuides, slugParams } from "@/lib/marketing/cms/read";
import { FallbackNotice } from "@/components/molecules/site/fallback-notice";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { Icon } from "@/components/atoms/icon";
import { Star } from "@/components/atoms/brand";
import { Breadcrumb } from "@/components/organisms/site/sections";
import { Helpful, ShareBar } from "@/components/molecules/site/library";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return slugParams("guide", locales);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getI18n(params);
  const g = await getGuide(slug);
  if (!g) return {};
  return pageMeta(locale, `/knowledge/${slug}`, {
    title: g.t[locale].title,
    description: g.t[locale].excerpt,
    
    openGraph: { type: "article", images: [g.img] } });
}

// /knowledge/[slug] — article column of photos/To_build/landing/17-knowledge__v1.
export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const { locale } = await getI18n(params);
  const g = await getGuide(slug);
  if (!g) notFound();
  const all = await getGuides();
  const c = getLd(locale);
  const k = c.knowledge;
  const t = g.t[locale];
  const L = (p: string) => localHref(locale, p);
  const svc = g.service ? await getService(g.service, locale) : null;
  const related = [
    ...all.filter((x) => x.slug !== g.slug && x.cat === g.cat),
    ...all.filter((x) => x.slug !== g.slug && x.cat !== g.cat),
  ].slice(0, 3);
  const toc = [
    ["overview", k.sec.overview],
    ["reqs", k.sec.reqs],
    ["steps", k.sec.steps],
    ...(svc?.tiers.length ? [["fees", k.sec.fees]] : []),
    ["tip", k.sec.tip],
    ...(svc ? [["related", k.sec.related]] : []),
  ] as [string, string][];
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: t.title,
    description: t.excerpt,
    image: `${SITE_URL}${g.img}`,
    inLanguage: locale,
    datePublished: g.date,
    dateModified: g.updated ?? g.date,
    author: { "@type": "Organization", name: "HEBUZA" },
    publisher: { "@type": "Organization", name: "HEBUZA" },
    mainEntityOfPage: `${SITE_URL}/${locale}/knowledge/${g.slug}`,
  };
  const money = (n: number) => formatMoney(n, "RWF", locale);

  return (
    <article className="px-gutter pt-[var(--spacing-hero-top)] pb-[var(--spacing-section-sm)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <div className="container-page">
        <FallbackNotice locale={locale} served={g.fallback?.[locale]} />
        <Breadcrumb
          items={[
            { label: k.crumb, href: L("/knowledge") },
            { label: k.cats[g.cat] },
          ]}
        />
        <header className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <div className="grid gap-5">
            <p className="flex flex-wrap items-center gap-2">
              <Tag variant="navy">{k.cats[g.cat]}</Tag>
              <Tag variant="neutral">{c.example}</Tag>
            </p>
            <h1 className="text-h2 md:text-[clamp(2.5rem,1.6rem+2.4vw,3.75rem)] md:leading-[1.05]">
              {t.title}
            </h1>
            <p className="flex flex-wrap items-center gap-2 text-small text-fg-subtle">
              {k.by}
              <Star className="size-2.5 text-gold-600" />
              {k.published.replace("{d}", formatDate(g.date, locale))}
              {g.updated && (
                <>
                  <Star className="size-2.5 text-gold-600" />
                  {k.updated.replace("{d}", formatDate(g.updated, locale))}
                </>
              )}
              <Star className="size-2.5 text-gold-600" />
              {k.minRead.replace("{n}", String(g.read))}
            </p>
            <ShareBar title={t.title} copy={k} />
          </div>
          <div className="relative aspect-[16/9] overflow-hidden">
            <Image
              src={g.img}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
        </header>

        <div className="mt-12 grid gap-10 lg:grid-cols-[14rem_1fr]">
          <nav
            aria-label={k.contents}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <details
              open
              className="group border border-border bg-white p-5 lg:[&>summary]:pointer-events-none"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-label-lg [&::-webkit-details-marker]:hidden">
                {k.contents}
                <Icon
                  name="chevronDown"
                  size={18}
                  className="transition-transform group-open:rotate-180 lg:hidden"
                />
              </summary>
              <ol className="mt-3 grid gap-2 text-small">
                {toc.map(([id, label], i) => (
                  <li key={id}>
                    <a href={`#${id}`} className="text-fg-muted hover:text-link-hover">
                      {i + 1}. {label}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          </nav>

          <div className="grid max-w-3xl gap-10">
            <section id="overview" className="scroll-mt-28">
              <h2 className="text-h3">1. {k.sec.overview}</h2>
              <p className="mt-3 text-lead text-fg-muted">{t.overview}</p>
            </section>
            <section id="reqs" className="scroll-mt-28">
              <h2 className="text-h3">2. {k.sec.reqs}</h2>
              <ul className="mt-4 grid gap-2">
                {t.reqs.map((r) => (
                  <li key={r} className="flex gap-3 text-body">
                    <Icon
                      name="fileCheck"
                      size={20}
                      className="mt-0.5 shrink-0 text-navy-700"
                    />
                    {r}
                  </li>
                ))}
              </ul>
            </section>
            <section id="steps" className="scroll-mt-28">
              <h2 className="text-h3">3. {k.sec.steps}</h2>
              <ol className="mt-4 grid gap-3">
                {t.steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 text-body">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold-400 text-small font-medium text-on-gold">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </section>
            {svc && svc.tiers.length > 0 && (
              <section id="fees" className="scroll-mt-28">
                <h2 className="text-h3">4. {k.sec.fees}</h2>
                <div tabIndex={0} role="region" aria-label="Fees" className="mt-4 overflow-x-auto border border-border bg-white">
                  <table className="w-full min-w-[30rem] text-left text-body">
                    <caption className="sr-only">
                      {k.sec.fees} — {svc.name}
                    </caption>
                    <thead className="bg-ink-100 text-small text-ink-700">
                      <tr>
                        <th scope="col" className="p-3">
                          {k.feeType}
                        </th>
                        <th scope="col" className="p-3">
                          {k.feeHebuza}
                        </th>
                        <th scope="col" className="p-3">
                          {k.feeGov}
                        </th>
                        <th scope="col" className="p-3">
                          {k.feeTime}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {svc.tiers.map((tr) => (
                        <tr key={tr.key} className="border-t border-border">
                          <th scope="row" className="p-3 font-medium">
                            {tr.label}
                          </th>
                          <td className="p-3">{money(tr.fee)}</td>
                          <td className="p-3">
                            {tr.governmentFee ? money(tr.governmentFee) : "—"}
                          </td>
                          <td className="p-3">{tr.eta}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-small text-fg-subtle">{k.feeNote}</p>
              </section>
            )}
            <section id="tip" className="scroll-mt-28">
              <h2 className="sr-only">{k.sec.tip}</h2>
              <p className="flex gap-3 border-l-[3px] border-gold-400 bg-gold-50 p-5 text-body text-ink-900">
                <Star className="mt-1 size-4 shrink-0 text-gold-600" />
                <span>
                  <strong>{k.sec.tip}:</strong> {t.tip}
                </span>
              </p>
            </section>
            {svc && (
              <section
                id="related"
                aria-labelledby="related-h"
                className="scroll-mt-28"
              >
                <h2 id="related-h" className="text-small text-fg-subtle">
                  {k.sec.related}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-4 bg-bg-subtle p-5">
                  <span className="flex size-12 items-center justify-center rounded-full bg-white">
                    <Icon name="briefcase" size={22} className="text-navy-700" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-label-lg">{svc.name}</p>
                    <p className="text-small text-fg-muted">
                      {[
                        svc.fromFee != null && money(svc.fromFee),
                        svc.tiers[0]?.eta,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <ButtonLink href={L(`/services/${svc.slugs[locale]}`)} size="sm" dots>
                    {k.apply}
                    <span className="sr-only">: {svc.name}</span>
                  </ButtonLink>
                </div>
              </section>
            )}
            <Helpful copy={k} entry={{ type: "guide", key: slug, locale }} />
          </div>
        </div>

        <section aria-labelledby="rel-g" className="mt-16">
          <h2 id="rel-g" className="text-h3">
            {k.relatedT}
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={L(`/knowledge/${r.slug}`)}
                  className="flex h-full flex-col gap-1 border border-border bg-white p-5 hover:border-navy-300 hover:shadow-md"
                >
                  <span className="text-eyebrow text-fg-subtle">
                    {k.cats[r.cat]}
                  </span>
                  <span className="text-label-lg">{r.t[locale].title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t-[3px] border-rule bg-sky-50 p-7 md:p-10">
          <h2 className="text-h2">{k.ctaT}</h2>
          <ButtonLink
            href={L(svc ? `/services/${svc.slugs[locale]}` : "/services")}
            variant="primary"
            dots
          >
            {k.ctaB}
          </ButtonLink>
        </section>
      </div>
    </article>
  );
}
