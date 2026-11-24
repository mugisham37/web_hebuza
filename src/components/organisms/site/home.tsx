import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import { localHref } from "@/shared/i18n/config";
import { images } from "@/lib/assets";
import type { FamilyVM, PlanVM, ServiceVM } from "@/lib/catalogue";
import { FACES } from "@/content/families";
import { getCopy, INSTITUTIONS } from "@/content/marketing";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { Icon } from "@/components/atoms/icon";
import { BigNumber, FaceCluster, GridLines, } from "@/components/atoms/brand";
import { HeroIntro, Reveal } from "@/components/atoms/motion";
import { FamilyCard, GuideCard, SectionHead, StepCard } from "@/components/molecules/site/site";
import { HeroMosaic } from "@/components/molecules/site/hero-mosaic";
import { ServiceSearch, TrackForm } from "@/components/organisms/site/interactive";
import { PricingExplorer } from "@/components/organisms/site/pricing-explorer";

const GUIDE_IMG: Record<string, string> = images as unknown as Record<string, string>;

export function HomeHero({ locale, search }: { locale: Locale; search: { slug: string; path: string; name: string; family: string }[] }) {
  const h = getCopy(locale).hero;
  const L = (p: string) => localHref(locale, p);
  return (
    <section className="relative overflow-hidden px-gutter pt-[var(--spacing-hero-top)] pb-14 md:pb-20">
      <GridLines />
      <HeroIntro className="container-page relative">
        <div className="grid items-center gap-14 lg:grid-cols-[1.25fr_1fr] lg:gap-8">
          <div>
            <p data-hero="eyebrow" className="flex items-center gap-3 text-eyebrow font-semibold tracking-[0.14em] text-fg-subtle uppercase">
              <span aria-hidden className="h-px w-10 bg-fg-subtle" />{h.eyebrow}
            </p>
            <h1 className="mt-5 max-w-[16ch] text-[clamp(2.1rem,1.45rem+2.4vw,3.6rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-fg">
              <span data-hero="line" className="block">{h.title} <span className="whitespace-nowrap text-navy-600">{h.acronym}</span></span>
            </h1>
            <p data-hero="copy" className="mt-6 max-w-[34rem] text-lead text-fg-muted">{h.lead}</p>
            <ul data-hero="copy" className="mt-6 grid max-w-[34rem] gap-x-6 gap-y-3 sm:grid-cols-2">
              {h.points.map((pt) => (
                <li key={pt} className="flex items-start gap-2.5 text-small text-fg">
                  <span data-round aria-hidden className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-navy-100 text-navy-700"><Icon name="check" size={12} strokeWidth={3} /></span>{pt}
                </li>
              ))}
            </ul>
            <div data-hero="actions" className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={L("/services")} size="lg" variant="secondary" dots>{h.start}</ButtonLink>
              <ButtonLink href={L("/how-it-works")} size="lg" variant="outline">{h.how}</ButtonLink>
            </div>
            <div data-hero="actions" className="mt-6 max-w-xl"><div><ServiceSearch items={search} placeholder={h.search} /></div></div>
          </div>
          <HeroMosaic tiles={h.mosaic.map((t) => ({ src: t.src, alt: t.alt, caption: t.caption, href: L(`/services/${t.slug}`) }))} />
        </div>
      </HeroIntro>
    </section>
  );
}

export function TrackerAndRibbon({ locale }: { locale: Locale }) {
  const m = getCopy(locale);
  return (
    <section className="px-gutter pb-6">
      <Reveal preset="rise-md" className="container-page"><TrackForm copy={m.tracker} /></Reveal>
    </section>
  );
}

export function Institutions({ locale, partners = [] }: { locale: Locale; partners?: { id: string; name: string; logoUrl: string | null; website: string | null }[] }) {
  const m = getCopy(locale);
  const c = m.institutions;
  return (
    <>
    <section className="px-gutter py-10 md:py-12">
      {/* Compact strip: heading left, logos right on desktop (~45% of the old height). */}
      <Reveal className="container-page grid items-center gap-6 lg:grid-cols-[20rem_1fr] lg:gap-12">
        <h2 className="max-w-[10ch] text-h2 text-fg-heading">{c.tag}</h2>
        <div>
        <ul className="grid grid-cols-3 border-t border-l border-sky-400 sm:grid-cols-4 lg:grid-cols-6">
          {INSTITUTIONS.map((i) => (
            <li key={i.short} data-reveal title={i.name}
              className="group flex h-17 items-center justify-center border-r border-b border-sky-400 px-4 py-2.5 transition-colors duration-200 hover:bg-navy-700 motion-reduce:transition-none">
              {i.logo ? (
                <Image src={`/hebuza/institutions/${i.logo}`} alt={i.name} width={152} height={44}
                  className="h-auto max-h-11 w-auto max-w-full object-contain transition-[filter,opacity] duration-200 group-hover:opacity-90 group-hover:brightness-0 group-hover:invert motion-reduce:transition-none" />
              ) : (
                <span className="text-small font-semibold tracking-wide text-navy-700 transition-colors group-hover:text-white motion-reduce:transition-none">{i.short}<span className="sr-only"> — {i.name}</span></span>
              )}
            </li>
          ))}
          {/* PRT-13: partners the team flagged "shown on website". */}
          {partners.map((p) => (
            <li key={p.id} data-reveal title={p.name} className="flex h-17 items-center justify-center border-r border-b border-sky-400 px-4 py-2.5">
              {p.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- partner logos are external URLs set by staff
                <img src={p.logoUrl} alt={p.name} loading="lazy" className="h-auto max-h-11 w-auto max-w-full object-contain" />
              ) : (
                <span className="text-small font-semibold tracking-wide text-navy-700">{p.name}</span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-eyebrow text-fg-muted">{c.caption}</p>
        </div>
      </Reveal>
    </section>
    </>
  );
}

export function ServicesShowcase({ locale, families, total }: { locale: Locale; families: FamilyVM[]; total: number }) {
  const m = getCopy(locale);
  const c = m.services;
  // Bento classes from service counts: biggest family → large, ≥2 → standard, 1 → mini strip.
  const maxCount = Math.max(...families.map((f) => f.count));
  const largeSlug = families.find((f) => f.count === maxCount)?.slug;
  const card = (f: FamilyVM, size: "large" | "standard" | "mini") => {
    const take = f.services.slice(0, size === "large" ? 8 : size === "standard" ? 4 : 1);
    const top = Math.max(0, ...f.services.map((s) => s.popular));
    return (
      <FamilyCard key={f.slug} size={size} n={families.indexOf(f) + 1} title={f.name} href={localHref(locale, `/services/c/${f.slug}`)} photo={f.photo} popularLabel={c.popular}
        viewAll={c.viewAll.replace("{n}", String(f.count))}
        rows={take.map((s) => ({ name: s.name, href: localHref(locale, `/services/${s.slugs[locale]}`), popular: top > 0 && s.popular === top }))} />
    );
  };
  const minis = families.filter((f) => f.count === 1);
  return (
    <section className="px-gutter py-12 md:py-14">
      <Reveal className="container-page">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="grid gap-2.5">
            <span data-reveal><Tag variant="outline" className="eyebrow normal-case">{c.tag}</Tag></span>
            <h2 data-reveal className="text-[clamp(1.4rem,1.15rem+0.8vw,1.85rem)] leading-tight tracking-[-0.02em] text-fg-heading">{c.title}</h2>
          </div>
          <div data-reveal className="flex shrink-0 flex-wrap items-center gap-x-8 gap-y-4">
            <div className="h-24 w-40"><FaceCluster srcs={FACES} tag={c.faces} className="origin-top-left scale-[0.6]" /></div>
            <div>
              <BigNumber value={total} count className="text-secondary text-[clamp(2rem,1.7rem+1vw,2.5rem)]! leading-none" />
              <p className="mt-1 max-w-[14rem] text-small text-fg-muted">{c.countLabel}</p>
            </div>
          </div>
        </div>
        <Reveal preset="fly-tilt-r" each stagger={0.08} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {families.filter((f) => f.count > 1).map((f) => card(f, f.slug === largeSlug ? "large" : "standard"))}
          {minis.length > 0 && (
            <div tabIndex={0} className="no-scrollbar -mx-gutter flex snap-x gap-3.5 overflow-x-auto px-gutter md:col-span-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0">
              {minis.map((f) => card(f, "mini"))}
            </div>
          )}
        </Reveal>
      </Reveal>
    </section>
  );
}

export function HowItWorksBand({ locale }: { locale: Locale }) {
  const m = getCopy(locale);
  const h = m.how;
  const kinds = ["dots", "photo", "bars", "photo", "doc"] as const;
  const photos = [undefined, "/hebuza/photos/step-upload.jpg", undefined, "/hebuza/photos/step-handle.jpg", undefined];
  const tags = ["navy", "glass", "new", "glass", "selected"] as const;
  return (
    <section className="relative px-gutter py-10 md:py-14">
        <Reveal className="container-page">
          <SectionHead tag={h.tag} title={h.title} lead={h.sub} center />
          <Reveal tabIndex={0} preset="rise-lg" each stagger={0.08} className="no-scrollbar -mx-gutter mt-8 flex snap-x gap-3 overflow-x-auto px-gutter md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-5">
            {h.steps.map((s, i) => <StepCard key={s.tag} tag={s.tag} text={s.text} kind={kinds[i]} photo={photos[i]} tagVariant={tags[i]} />)}
          </Reveal>
          <div className="mt-8 flex justify-center"><ButtonLink href={localHref(locale, "/how-it-works")} dots>{h.cta}</ButtonLink></div>
        </Reveal>
    </section>
  );
}

export function PricingTeaser({ locale, services, families, plans }: { locale: Locale; services: ServiceVM[]; families: FamilyVM[]; plans: PlanVM[] }) {
  const p = getCopy(locale).pricing;
  const famName = (slug: string) => families.find((f) => f.slug === slug)?.name ?? "";
  const items = services.map((s) => ({
    path: s.slugs[locale],
    slug: s.slug, name: s.name, family: s.family, area: s.subArea?.name ?? null, priceMode: s.priceMode, fromFee: s.fromFee, tiers: s.tiers, planCovered: s.planCovered,
    haystack: `${s.name} ${famName(s.family)} ${s.subArea?.name ?? ""} ${s.slug.replace(/-/g, " ")}`,
  }));
  return (
    <section className="px-gutter py-[var(--spacing-section-sm)] text-white">
      <Reveal className="container-page">
        <SectionHead tone="dark" tag={p.tag} tagVariant="outline-dark" title={p.title} />
        <PricingExplorer services={items} families={families.map((f) => ({ slug: f.slug, name: f.name }))} plans={plans} copy={p} />
      </Reveal>
    </section>
  );
}

export function Guides({ locale }: { locale: Locale }) {
  const g = getCopy(locale).guides;
  const L = (p: string) => localHref(locale, p);
  return (
    <section className="px-gutter py-12 md:py-14">
      <Reveal className="container-page">
        <SectionHead tone="dark" tagVariant="outline-dark" tag={g.tag} title={g.title} aside={<ButtonLink href={L("/knowledge")} variant="outline-dark" dots>{g.cta}</ButtonLink>} />
        <Reveal tabIndex={0} preset="rise-lg" each className="no-scrollbar -mx-gutter mt-8 flex snap-x gap-3 overflow-x-auto px-gutter md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
          {g.items.map((it) => <GuideCard key={it.title} img={GUIDE_IMG[it.img]} tag={it.tag} date={it.date} read={it.read} title={it.title} excerpt={it.excerpt} href={L("/knowledge")} compact />)}
        </Reveal>
        <Link data-reveal href={L("/updates")} className="mt-3 flex flex-wrap items-center gap-3 border border-sky-300 bg-white px-5 py-2.5 text-body text-navy-700 transition-colors hover:bg-sky-100">
          <Tag variant="selected" className="h-7 text-eyebrow">{g.update}</Tag>{g.updateText}<Icon name="arrowRight" size={16} className="ml-auto" />
        </Link>
      </Reveal>
    </section>
  );
}
