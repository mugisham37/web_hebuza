import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { locales, localHref } from "@/shared/i18n/config";
import { getFamily, getService, getServices, PRERENDER_TOP } from "@/lib/catalogue";
import { getServiceFaqs } from "@/lib/marketing/cms/read";
import { getCopy, waLink } from "@/content/marketing";
import { FAMILIES } from "@/content/families";
import { formatMoney } from "@/shared/format";
import { SITE_URL } from "@/lib/site";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { Icon, WhatsAppGlyph } from "@/components/atoms/icon";
import { GridLines, HighlightWord, Star } from "@/components/atoms/brand";
import { HeroIntro, Reveal } from "@/components/atoms/motion";
import { HebuzaVsInstitution, PhotoFrame, ServiceCard, cardTones, StepCard } from "@/components/molecules/site/site";
import { Breadcrumb, CTACard, FAQBlock } from "@/components/organisms/site/sections";
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
  const price = s.priceMode === "quote" || s.fromFee == null ? "" : ` — ${formatMoney(s.fromFee, "RWF", locale)}`;
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
  const faqs = await getServiceFaqs(s.slug, locale);
  // F-CAT-08: consultation services book a call instead of opening an application.
  const cta = s.consultation ? { href: L(`/book?service=${s.slug}`), label: d.book } : { href: L(`/apply/${s.slug}`), label: m.card.apply };
  const tier = s.tiers[0];
  const time = s.turnaround.min != null && s.turnaround.max != null ? d.facts.days.replace("{min}", String(s.turnaround.min)).replace("{max}", String(s.turnaround.max)) : tier?.eta ?? "—";
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

  const priceCard = (
    <div className="border-2 border-navy-700 bg-surface p-6 shadow-md">
      <div className="flex items-center justify-between"><p className="text-card-title">{d.priceTitle}</p><Tag variant={paused ? "neutral" : "navy"} className="h-7 text-eyebrow">{paused ? la.price.pausedTag : bands ? la.price.bandsTag : quote ? d.quoteTitle : d.fixed}</Tag></div>
      <div className="mt-5">
        {paused ? (
          <div className="grid gap-4" data-testid="price-paused">
            <p className="bg-bg-subtle p-4 text-body text-fg-muted">{la.price.pausedBody}</p>
            <button type="button" disabled className="inline-flex h-14 cursor-not-allowed items-center justify-center bg-ink-200 text-button text-fg-disabled">{la.price.pausedApply}</button>
          </div>
        ) : bands ? (
          <div className="grid gap-4">
            <BandCalculator bands={bands} />
            <ButtonLink href={cta.href} size="lg" variant="primary" dots className="justify-center">{cta.label}</ButtonLink>
          </div>
        ) : quote ? (
          <div className="grid gap-4">
            <p className="bg-info-bg p-4 text-body text-navy-800">{d.quoteBody}</p>
            <ButtonLink href={cta.href} size="lg" variant="primary" dots className="justify-center">{cta.label}</ButtonLink>
          </div>
        ) : s.consultation ? (
          <ButtonLink href={cta.href} size="lg" variant="primary" dots className="justify-center">{cta.label}</ButtonLink>
        ) : (
          <FeeBreakdown tiers={s.tiers} slug={s.slug} copy={m.pricing} />
        )}
      </div>
      <div className="mt-4 grid gap-2">
        <a href={waLink(`${s.name} — HEBUZA`)} target="_blank" rel="noopener" className="inline-flex h-12 items-center justify-center gap-2 border border-border-strong text-button text-fg hover:bg-bg-subtle"><WhatsAppGlyph size={18} />{paused ? la.price.pausedWa : d.ask}</a>
        <Link href={L(`/book?service=${s.slug}`)} className="text-center text-small text-link underline-offset-4 hover:text-link-hover hover:underline">{d.consult} →</Link>
      </div>
      {s.feeExplainer && <p className="mt-4 text-small text-fg-muted">{s.feeExplainer}</p>}
      <p className={`mt-4 px-4 py-2 text-center text-small ${s.planCovered ? "bg-gold-100 text-gold-800" : "bg-bg-subtle text-fg-subtle"}`}>{s.planCovered ? d.covered : d.notCovered}</p>
    </div>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lds).replace(/</g, "\\u003c") }} />
      <section className="relative overflow-hidden px-gutter pt-[var(--spacing-hero-top)] pb-12">
        <GridLines />
        <HeroIntro className="container-page relative grid gap-12 lg:grid-cols-[1fr_24rem]">
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
            </div>
            <dl data-hero="copy" className="mt-8 grid max-w-2xl grid-cols-3 divide-x divide-border border-y border-border">
              {[[d.facts.fee, bands ? la.price.bandsTag : quote ? m.card.quote : formatMoney(s.fromFee!, "RWF", locale)], [d.facts.time, time], [d.facts.where, where]].map(([k, v]) => (
                <div key={k} className="px-4 py-4 first:pl-0"><dt className="text-eyebrow text-fg-subtle uppercase">{k}</dt><dd className="mt-1 tabular text-label">{v}</dd></div>
              ))}
            </dl>
            {meta && <div data-hero="visual" className="mt-10 max-w-md"><PhotoFrame src={meta.photo} alt="" rotate={-2} ratio="aspect-[5/3]" badge={m.hero.badge} /></div>}
          </div>
          <aside className="hidden lg:block"><div data-hero="visual" className="sticky top-24">{priceCard}</div></aside>
        </HeroIntro>
      </section>

      <div className="px-gutter"><ul className="container-page flex flex-wrap justify-center gap-x-8 gap-y-3 border border-border bg-white px-6 py-4 text-small">
        {d.trust.map((t, i) => <li key={t} className="flex items-center gap-2">{i ? <Star className="size-3 text-gold-600" /> : null}{t}</li>)}
      </ul></div>

      <section className="px-gutter py-[var(--spacing-section-sm)]">
        <div className="container-page grid gap-6 lg:grid-cols-[1fr_24rem]">
          <div className="grid gap-6">
            <Reveal className="grid gap-8 border border-border bg-white p-6 md:grid-cols-2 md:p-8">
              <div data-reveal>
                <Tag variant="navy" className="normal-case">{la.about.tag}</Tag>
                <p className="mt-4 text-body whitespace-pre-line">{s.description?.trim().split("\n\n")[0] || s.summary || s.name}</p>
                <ul className="mt-4 grid gap-2">{la.about.points.map((p) => <li key={p} className="flex items-center gap-2.5 text-body"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold-400 text-on-gold"><Icon name="check" size={12} strokeWidth={3} /></span>{p}</li>)}</ul>
              </div>
              <div data-reveal className="md:border-l md:border-border md:pl-8">
                <h2 className="text-card-title">{la.about.who}</h2>
                <p className="mt-2 text-body text-fg-muted">{la.about.whoBody}</p>
                <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {m.family.whoList.slice(0, 4).map((w, i) => (
                    <li key={w} className="flex flex-col items-center gap-2 text-center text-small">
                      <span className="flex size-14 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Icon name={WHO_ICONS[i]} size={22} /></span>{w}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal className="border border-border bg-white p-6 md:p-8">
              <h2 data-reveal className="text-h3">{d.docs}</h2>
              {docs.length ? (
                <ul className="mt-5 divide-y divide-border">
                  {docs.map((doc) => (
                    <li key={doc} data-reveal className="flex items-center gap-4 py-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center bg-ink-100 text-navy-700"><Icon name="file" size={18} /></span>
                      <span className="flex-1 text-body">{doc}</span>
                      <span className="text-eyebrow text-fg-subtle">PDF / photo</span>
                    </li>
                  ))}
                </ul>
              ) : <p data-reveal className="mt-3 text-body text-fg-muted">{d.docsFallback}</p>}
            </Reveal>
            {(s.eligibility.length > 0 || s.deliverables.length > 0) && (
              <Reveal className="grid gap-6 border border-border bg-white p-6 md:grid-cols-2 md:p-8">
                {([[d.eligibility, s.eligibility], [d.deliverables, s.deliverables]] as const).filter(([, xs]) => xs.length).map(([h, xs]) => (
                  <div key={h} data-reveal>
                    <h2 className="text-h3">{h}</h2>
                    <ul className="mt-4 grid gap-2">{xs.map((x) => <li key={x} className="flex items-start gap-2.5 text-body"><Icon name="check" size={16} className="mt-1 shrink-0 text-success" />{x}</li>)}</ul>
                  </div>
                ))}
              </Reveal>
            )}
            {s.deliverables.length === 0 && <Reveal className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {d.receiveItems.map((r, i) => (
                <div key={r} data-reveal className={["bg-navy-700 p-5 text-white", "bg-gold-200 p-5 text-ink-900", "bg-sky-50 p-5 text-navy-800"][i]}>
                  <span className="font-display text-3xl">{String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-6 text-label">{r}</p>
                </div>
              ))}
            </Reveal>}
          </div>
          <div className="lg:hidden">{priceCard}</div>
        </div>
      </section>

      <section className="bg-grid px-gutter pb-[var(--spacing-section-sm)]">
        <div className="container-page">
          <Reveal><h2 data-reveal className="text-h2">{d.steps}</h2></Reveal>
          <Reveal tabIndex={0} preset="rise-lg" each className="no-scrollbar -mx-gutter mt-8 flex snap-x gap-3 overflow-x-auto px-gutter md:mx-0 md:grid md:grid-cols-4 md:px-0">
            {d.stepItems.map((t, i) => <StepCard key={t} tag={`0${i + 1}`} text={t} kind={(["dots", "bars", "photo", "doc"] as const)[i]} photo={meta?.photo} tagVariant={(["navy", "new", "glass", "selected"] as const)[i]} />)}
          </Reveal>
          <div className="theme-dark mt-8 bg-bg p-6 md:p-8">
            <HebuzaVsInstitution dark hebuza={d.hebuza} institution={d.institution} done={m.howPage.done} outcome={m.howPage.rdb} caption={d.split} />
          </div>
        </div>
      </section>

      <FAQBlock locale={locale} title={faqs.length ? d.serviceFaq : m.faq.title} items={faqs.length ? faqs : m.faq.items} />

      {related.length > 0 && (
        <section className="px-gutter pb-[var(--spacing-section-sm)]">
          <Reveal className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4"><h2 data-reveal className="text-h2">{d.related}</h2><ButtonLink href={L("/services")} variant="secondary" dots>{m.services.all}</ButtonLink></div>
            <Reveal preset="rise-lg" each className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {cardTones(related.map((r) => r.slug)).map((t, i) => <ServiceCard key={related[i].slug} s={related[i]} locale={locale} familyName={fam?.name} tone={t} />)}
            </Reveal>
          </Reveal>
        </section>
      )}
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
