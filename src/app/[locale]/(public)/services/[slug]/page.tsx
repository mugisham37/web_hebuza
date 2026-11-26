import type { Metadata } from "next";
import { guidesForService } from "@/content/guides";
import { guidesCopy } from "@/content/guides/copy";
import { cx } from "@/shared/format";
import { pageMeta } from "@/lib/seo";
import { notFound, permanentRedirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { locales, localHref } from "@/shared/i18n/config";
import { getFamily, getService, getServices, PRERENDER_TOP } from "@/lib/catalogue";
import { getCopy, waLink } from "@/content/marketing";
import { FAMILIES } from "@/content/families";
import { formatMoney } from "@/shared/format";
import { SITE_URL } from "@/lib/site";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { Icon, WhatsAppGlyph } from "@/components/atoms/icon";
import { ZigzagBand, HighlightWord, Star } from "@/components/atoms/brand";
import { HeroIntro, Reveal } from "@/components/atoms/motion";
import { ServiceCard, cardTones, StepCard } from "@/components/molecules/site/site";
import { Breadcrumb, CTACard } from "@/components/organisms/site/sections";
import { FeeBreakdown } from "@/components/organisms/site/interactive";
import { BandCalculator, EligibilityGate, PrintButton, type PriceBand } from "@/components/organisms/site/service-tools";
import { laCopy } from "@/content/pages/la";

const WHO_ICONS = ["user", "sparkle", "building", "users"] as const;

export async function generateStaticParams() {
  const services = (await getServices("en")).slice(0, PRERENDER_TOP); // sorted by 30-day volume
  // Cache Components needs ≥1 param; with the API down at build, one sentinel renders notFound() and real slugs render on request.
  return locales.flatMap((locale) => (services.length ? services.map((s) => s.slugs[locale]) : ["_"]).map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getI18n(params);
  const s = await getService(slug, locale);
  if (!s) return {};
  const price = s.priceMode === "quote" || s.fromFee == null ? "" : `, ${formatMoney(s.fromFee, "RWF", locale)}`;
  const meta = pageMeta(locale, `/services/${s.slugs[locale]}`, { title: s.seo.title || s.name, description: s.seo.description || `${s.summary || s.name}${price}` });
  // F-CAT-07 hreflang: each locale points at its own slug.
  meta.alternates = { ...meta.alternates, languages: { ...Object.fromEntries(locales.map((l) => [l, `/${l}/services/${s.slugs[l]}`])), "x-default": `/rw/services/${s.slugs.rw}` } };
  return s.seo.og_image ? { ...meta, openGraph: { ...meta.openGraph, images: [s.seo.og_image] } } : meta;
}

// /services/[slug] (F-CAT-03..08, 12, 13) — photos/To_build/05-service-detail-company-registration__v1.
export default async function ServicePage({ params }: PageProps<"/[locale]/services/[slug]">) {
  const { slug } = await params;
  const { locale } = await getI18n(params);
  const s = await getService(slug, locale);
  if (!s) notFound();
  // Old/other-locale slugs (internal links already use the locale slug) 308 to this locale's slug.
  if (slug !== s.slugs[locale]) permanentRedirect(localHref(locale, `/services/${s.slugs[locale]}`));
  const m = getCopy(locale);
  const d = m.detail;
  const L = (p: string) => localHref(locale, p);
  const fam = await getFamily(s.family, locale);
  const meta = FAMILIES.find((f) => f.slug === s.family);
  // F-CAT-09: manual links first, then the rest of the family.
  const all = await getServices(locale);
  const related = [...s.related.flatMap((r) => all.filter((x) => x.slug === r)), ...(fam?.services ?? [])]
    .filter((x, i, xs) => x.slug !== s.slug && xs.findIndex((y) => y.slug === x.slug) === i).slice(0, 3);
  // F-CAT-08: consultation services book a call instead of opening an application.
  const cta = s.consultation ? { href: L(`/book?service=${s.slug}`), label: d.book } : { href: L(`/apply/${s.slug}`), label: m.card.apply };
  const tier = s.tiers[0];
  const time = s.turnaround.min != null && s.turnaround.max != null ? d.facts.days.replace("{min}", String(s.turnaround.min)).replace("{max}", String(s.turnaround.max)) : tier?.eta ?? "";
  const markets = s.markets.length > 1 || s.markets[0] !== "RW" ? ` · ${s.markets.join(", ")}` : "";
  const mode = s.deliveryMode ? d.facts.modes[s.deliveryMode as keyof typeof d.facts.modes] : undefined;
  const where = `${mode ?? d.facts.nationwide}${markets}`;
  const la = laCopy(locale);
  const paused = s.paused;
  const bands: PriceBand[] | null = s.bands.length ? s.bands : null;
  const quote = !bands && (s.priceMode === "quote" || s.fromFee == null);
  const words = s.name.split(" ");
  const head = words.length > 1 ? words.slice(0, -1).join(" ") : "";
  const last = words[words.length - 1];
  const docs = s.requirements;
  const ld = {
    "@context": "https://schema.org", "@type": "Service", name: s.name, description: s.summary, areaServed: s.markets, url: `${SITE_URL}/${locale}/services/${s.slugs[locale]}`,
    provider: { "@type": "ProfessionalService", name: "HEBUZA BUSINESS GROUP LTD" },
    ...(quote ? {} : { offers: { "@type": "Offer", price: s.fromFee, priceCurrency: "RWF" } }),
  };

  const crumbs = [{ name: m.common.services, url: `${SITE_URL}/${locale}/services` }, ...(fam ? [{ name: fam.name, url: `${SITE_URL}/${locale}/services/c/${fam.slug}` }] : []), { name: s.name, url: ld.url }];
  const lds = [ld,
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })) },
  ];

  const wa = <a href={waLink(`${s.name}, HEBUZA`)} target="_blank" rel="noopener" className="inline-flex h-12 items-center justify-center gap-2 border border-border-strong text-button text-fg hover:bg-bg-subtle"><WhatsAppGlyph size={18} />{paused ? la.price.pausedWa : d.ask}</a>;
  const priceCard = (
    <div className="border-2 border-navy-700 bg-surface p-5 shadow-md">
      <div className="mb-4 flex items-center justify-between gap-3"><p className="text-card-title">{d.priceTitle}</p><Tag variant={paused ? "neutral" : "navy"} className="h-7 text-eyebrow">{paused ? la.price.pausedTag : bands ? la.price.bandsTag : quote ? d.quoteTitle : d.fixed}</Tag></div>
      {paused ? (
        <div className="grid gap-3" data-testid="price-paused">
          <p className="bg-bg-subtle p-3 text-small text-fg-muted">{la.price.pausedBody}</p>
          <div className="grid gap-2 sm:grid-cols-2"><button type="button" disabled className="inline-flex h-12 cursor-not-allowed items-center justify-center bg-ink-200 text-button text-fg-disabled">{la.price.pausedApply}</button>{wa}</div>
        </div>
      ) : bands ? (
        <div className="grid gap-3">
          <BandCalculator bands={bands} />
          <div className="grid gap-2 sm:grid-cols-2"><ButtonLink href={cta.href} variant="primary" dots className="h-12 justify-center">{cta.label}</ButtonLink>{wa}</div>
        </div>
      ) : quote ? (
        <div className="grid gap-3">
          <p className="bg-info-bg p-3 text-small text-navy-800">{d.quoteBody}</p>
          <div className="grid gap-2 sm:grid-cols-2"><ButtonLink href={cta.href} variant="primary" dots className="h-12 justify-center">{cta.label}</ButtonLink>{wa}</div>
        </div>
      ) : s.consultation ? (
        <div className="grid gap-2 sm:grid-cols-2"><ButtonLink href={cta.href} variant="primary" dots className="h-12 justify-center">{cta.label}</ButtonLink>{wa}</div>
      ) : (
        <FeeBreakdown tiers={s.tiers} slug={s.slug} copy={m.pricing} side={wa} />
      )}
    </div>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lds).replace(/</g, "\\u003c") }} />
      <section className="theme-dark relative overflow-hidden bg-hero px-gutter pt-[calc(var(--header-h)+3.5rem)] pb-14 text-fg lg:pt-[calc(var(--header-h)+5rem)] lg:pb-20">{/* same blue as the home hero */}
        <HeroIntro className="container-page relative grid items-center gap-12 lg:grid-cols-[1fr_32rem]">
          <div>
            <Breadcrumb items={[{ label: m.common.services, href: L("/services") }, ...(fam ? [{ label: fam.name, href: L(`/services/c/${fam.slug}`) }] : []), { label: s.name }]} />
            <div data-hero="eyebrow" className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 items-center gap-2 bg-success-bg px-3 text-small text-success"><span className="size-1.5 rounded-full bg-success" />{m.card.available}</span>
              {s.subArea && <Tag variant="neutral" className="text-small">{s.subArea.name}</Tag>}
              {s.popular > 0 && <Tag variant="new" className="text-small">{m.hero.cardTag}</Tag>}
            </div>
            <h1 className="mt-5 text-[clamp(2.5rem,1.6rem+3.8vw,4.75rem)] leading-[1.02] tracking-[-0.05em]">
              <span data-hero="line" className="block">{head} <HighlightWord>{last}</HighlightWord></span>
            </h1>
            {s.summary && s.summary !== s.name && <p data-hero="copy" className="mt-5 max-w-2xl text-lead text-fg-muted">{s.summary}</p>}
            <div data-hero="actions" className="mt-6 flex flex-wrap gap-3 print:hidden">
              {!paused && <EligibilityGate slug={s.slug} family={s.family} service={s.name} />}
              <PrintButton />
              {guidesForService(s.slug)[0] && <ButtonLink href={L(`/guides/${guidesForService(s.slug)[0].slug}`)} variant="outline-dark" dots>{guidesCopy(locale).serviceGuide}</ButtonLink>}
            </div>
            <dl data-hero="copy" className="mt-8 grid max-w-2xl grid-cols-3 divide-x divide-border border-y border-border">
              {[[d.facts.fee, bands ? la.price.bandsTag : quote ? m.card.quote : formatMoney(s.fromFee!, "RWF", locale)], [d.facts.time, time], [d.facts.where, where]].map(([k, v]) => (
                <div key={k} className="px-4 py-4 first:pl-0"><dt className="text-eyebrow text-fg-subtle uppercase">{k}</dt><dd className="mt-1 tabular text-label">{v}</dd></div>
              ))}
            </dl>
          </div>
          <aside className="hidden lg:block"><div data-hero="visual">{priceCard}</div></aside>
        </HeroIntro>
      </section>
      <ZigzagBand from="var(--color-hero)" to="var(--color-white)" />

      {/* One block between the two zigzags: a single 64px (48px phone) rhythm, top, bottom and between every part. */}
      <div className="flex flex-col gap-12 px-gutter py-12 lg:gap-16 lg:py-16">
        <ul className="container-page flex w-full flex-wrap items-center justify-center gap-x-8 gap-y-2 border border-border bg-white px-6 py-3.5 text-small">
          {d.trust.map((t, i) => <li key={t} className="flex items-center gap-2">{i ? <Star className="size-3 text-gold-600" /> : null}{t}</li>)}
        </ul>

        <div className="container-page grid w-full gap-6">
          {/* Four columns: 32px padding, 32px either side of each divider, same title style so tops line up. */}
          <Reveal className={cx("grid gap-6 border border-border bg-white p-6 md:grid-cols-2 md:gap-8 md:p-8 xl:gap-0", s.deliverables.length ? "xl:grid-cols-3" : "xl:grid-cols-4")}>
            <div data-reveal className="flex flex-col gap-4 xl:pr-8">
              <h2 className="text-card-title">{la.about.tag}</h2>
              <p className="text-body whitespace-pre-line text-fg-muted">{s.description?.trim().split("\n\n")[0] || s.summary || s.name}</p>
              <ul className="grid gap-2">{la.about.points.map((p) => <li key={p} className="flex items-center gap-2.5 text-body"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold-400 text-on-gold"><Icon name="check" size={12} strokeWidth={3} /></span>{p}</li>)}</ul>
            </div>
            <div data-reveal className="flex flex-col gap-4 md:border-l md:border-border md:pl-8 xl:px-8">
              <h2 className="text-card-title">{la.about.who}</h2>
              <p className="text-body text-fg-muted">{la.about.whoBody}</p>
              <ul className="grid grid-cols-4 gap-3 xl:grid-cols-2">
                {m.family.whoList.slice(0, 4).map((w, i) => (
                  <li key={w} className="flex flex-col items-center gap-1.5 text-center text-small">
                    <span className="flex size-12 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Icon name={WHO_ICONS[i]} size={20} /></span>{w}
                  </li>
                ))}
              </ul>
            </div>
            <div data-reveal className="flex flex-col gap-4 md:border-t md:border-border md:pt-8 xl:border-t-0 xl:border-l xl:px-8 xl:pt-0">
              <h2 className="text-card-title">{d.docs}</h2>
              {docs.length ? (
                <ul className="divide-y divide-border">
                  {docs.map((doc) => (
                    <li key={doc} className="flex items-center gap-3 py-2.5 text-body first:pt-0">
                      <span className="flex size-8 shrink-0 items-center justify-center bg-ink-100 text-navy-700"><Icon name="file" size={16} /></span>{doc}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-body text-fg-muted">{d.docsFallback}</p>}
            </div>
            {s.deliverables.length === 0 && (
              <div data-reveal className="flex flex-col gap-4 md:border-t md:border-l md:border-border md:pt-8 md:pl-8 xl:border-t-0 xl:pt-0 xl:pr-0">
                <h2 className="text-card-title">{d.receive}</h2>
                <ol className="grid gap-2">
                  {d.receiveItems.map((r, i) => (
                    <li key={r} className={cx("flex items-start gap-3 p-3 text-small", ["bg-navy-700 text-white", "bg-gold-200 text-ink-900", "bg-sky-50 text-navy-800"][i])}>
                      <span className="font-display text-label-lg leading-none">{String(i + 1).padStart(2, "0")}</span>{r}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Reveal>
          {(s.eligibility.length > 0 || s.deliverables.length > 0) && (
            <Reveal className="grid gap-6 border border-border bg-white p-6 md:grid-cols-2 md:gap-8 md:p-8">
              {([[d.eligibility, s.eligibility], [d.deliverables, s.deliverables]] as const).filter(([, xs]) => xs.length).map(([h, xs]) => (
                <div key={h} data-reveal className="flex flex-col gap-4">
                  <h2 className="text-card-title">{h}</h2>
                  <ul className="grid gap-2">{xs.map((x) => <li key={x} className="flex items-start gap-2.5 text-body"><Icon name="check" size={16} className="mt-1 shrink-0 text-success" />{x}</li>)}</ul>
                </div>
              ))}
            </Reveal>
          )}
          <div className="lg:hidden">{priceCard}</div>
        </div>

        <div className="container-page w-full">
          <Reveal><h2 data-reveal className="text-h3">{d.steps}</h2></Reveal>
          <Reveal tabIndex={0} preset="rise-lg" each className="no-scrollbar -mx-gutter mt-6 flex snap-x gap-3 overflow-x-auto px-gutter md:mx-0 md:grid md:grid-cols-4 md:px-0">
            {d.stepItems.map((t, i) => <StepCard key={t} tag={`0${i + 1}`} text={t} kind={(["dots", "bars", "photo", "doc"] as const)[i]} photo={meta?.photo} tagVariant={(["navy", "new", "glass", "selected"] as const)[i]} short />)}
          </Reveal>
        </div>
      </div>

      {related.length > 0 && (<>
        <ZigzagBand from="var(--color-white)" to="var(--color-sky-100)" />
        <section className="bg-sky-100 px-gutter py-[var(--spacing-section-sm)]">{/* same light blue as "Our services" on home */}
          <Reveal className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4"><h2 data-reveal className="text-h2">{d.related}</h2><ButtonLink href={L("/services")} variant="secondary" dots>{m.services.all}</ButtonLink></div>
            <Reveal preset="rise-lg" each className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {cardTones(related.map((r) => r.slug)).map((t, i) => <ServiceCard key={related[i].slug} s={related[i]} locale={locale} familyName={fam?.name} tone={t} />)}
            </Reveal>
          </Reveal>
        </section>
        <ZigzagBand from="var(--color-sky-100)" to="var(--color-white)" />
      </>)}
      <CTACard locale={locale} title={d.ctaTitle} body={d.ctaBody} />

      {/* Phone: sticky price bar */}
      <div data-bottom-bar className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 px-gutter pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 pr-16">
          <div className="min-w-0">
            <p className="truncate tabular text-label">{quote ? m.card.quote : formatMoney(s.fromFee!, "RWF", locale)}</p>
            <p className="truncate text-small text-fg-subtle">{time}</p>
          </div>
          {paused ? <span className="inline-flex h-11 items-center bg-ink-200 px-4 text-button text-fg-disabled" aria-disabled="true">{la.price.pausedApply}</span>
            : <ButtonLink href={cta.href} variant="primary" dots>{cta.label}</ButtonLink>}
        </div>
      </div>

      {/* Print-only checklist; the scoped stylesheet below hides everything else when printing. */}
      <style>{`@media print{body *{visibility:hidden!important}[data-la-print],[data-la-print] *{visibility:visible!important}[data-la-print]{position:absolute;inset:0 auto auto 0;width:100%}}`}</style>
      <section data-la-print aria-hidden className="hidden bg-white p-8 text-ink-900 print:block">
        <p className="text-small">HEBUZA</p>
        <h2 className="mt-2 text-h2">{s.name}</h2>
        <p className="mt-1 text-body">{la.check.title} · {la.check.note}</p>
        <h3 className="mt-6 text-card-title">{la.check.docs}</h3>
        {docs.length ? <ul className="mt-2 grid gap-2">{docs.map((doc) => <li key={doc} className="flex items-center gap-3 text-body"><span className="size-4 shrink-0 border border-ink-900" />{doc}</li>)}</ul> : <p className="mt-2 text-body">{la.check.none}</p>}
        {s.steps.length > 0 && <><h3 className="mt-6 text-card-title">{la.check.steps}</h3><ol className="mt-2 list-decimal pl-5 text-body">{s.steps.map((st) => <li key={st}>{st}</li>)}</ol></>}
        <p className="mt-8 text-small">{la.check.ref} {SITE_URL}/{locale}/services/{s.slug}</p>
      </section>
    </>
  );
}
