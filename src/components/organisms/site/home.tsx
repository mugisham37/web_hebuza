import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import { localHref } from "@/shared/i18n/config";
import { images } from "@/lib/assets";
import type { FamilyVM } from "@/lib/catalogue";
import { FACES } from "@/content/families";
import { getCopy, INSTITUTION_ROWS } from "@/content/marketing";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { Icon } from "@/components/atoms/icon";
import { BigNumber, FaceCluster, GridLines, } from "@/components/atoms/brand";
import { HeroIntro, Reveal } from "@/components/atoms/motion";
import { FamilyCard, GuideCard, SectionHead, StepCard } from "@/components/molecules/site/site";
import type { ShowCat } from "@/components/molecules/site/showcase";
import { InstitutionsBrowser } from "@/components/organisms/site/institutions";
import { HeroShowcase } from "@/components/organisms/site/hero-showcase";
import { TrackForm } from "@/components/organisms/site/interactive";

const GUIDE_IMG: Record<string, string> = images as unknown as Record<string, string>;

/** Hero slides per category: its top services (featured, then most requested), each with a photo (the service's own, else
 *  the category's, else an unused one from the pool so a category never repeats a photo). */
const SLIDES_PER_CAT = 4;
function showcaseCats(locale: Locale, families: FamilyVM[]): ShowCat[] {
  const h = getCopy(locale).hero;
  const bySlug = new Map(h.photos.map((p) => [p.slug, p]));
  const pool = [...new Map(h.photos.map((p) => [p.src, p])).values()];
  return families.filter((f) => f.services.length).map((f) => {
    const top = [...f.services].filter((s) => !s.paused).sort((a, b) => Number(b.featured) - Number(a.featured) || b.popular - a.popular).slice(0, SLIDES_PER_CAT);
    const used = new Set<string>();
    const photoFor = (slug: string) => {
      const own = bySlug.get(slug);
      if (own && !used.has(own.src)) return own;
      if (!used.has(f.photo)) return { src: f.photo, alt: f.name };
      return pool.find((p) => !used.has(p.src)) ?? { src: f.photo, alt: f.name };
    };
    return {
      slug: f.slug, name: f.name, short: f.short, href: localHref(locale, `/services/c/${f.slug}`),
      slides: top.map((s) => {
        const ph = photoFor(s.slug);
        used.add(ph.src);
        return { key: s.slug, img: ph.src, alt: ph.alt, family: f.name, title: s.name, summary: s.summary.trim().toLowerCase() === s.name.trim().toLowerCase() ? "" : s.summary, href: localHref(locale, `/services/${s.slugs[locale]}`) };
      }),
    };
  });
}

export function HomeHero({ locale, families }: { locale: Locale; families: FamilyVM[] }) {
  const h = getCopy(locale).hero;
  return (
    <section className="relative overflow-hidden px-gutter pt-(--spacing-home-hero-top) pb-(--spacing-home-hero-bottom)">
      <GridLines />
      {/* The page title stays for search engines and screen readers; the poster carries the visible headlines. */}
      <h1 className="sr-only">{h.title} {h.acronym}</h1>
      <HeroIntro className="container-page relative">
        <div data-hero="visual"><HeroShowcase cats={showcaseCats(locale, families)} allHref={localHref(locale, "/services")} startHref={localHref(locale, "/services")} copy={h.showcase} intro={{ ...h.intro, title: `${h.title} ${h.acronym}` }} /></div>
      </HeroIntro>
    </section>
  );
}

export function TrackerAndRibbon({ locale }: { locale: Locale }) {
  const m = getCopy(locale);
  return (
    <section className="px-gutter pb-(--spacing-home)">
      <Reveal preset="rise-md" className="container-page"><TrackForm copy={m.tracker} /></Reveal>
    </section>
  );
}

export function Institutions({ locale, partners = [] }: { locale: Locale; partners?: { id: string; name: string; logoUrl: string | null; website: string | null }[] }) {
  const c = getCopy(locale).institutions;
  // PRT-13: partners the team flagged "shown on website" join the last row.
  const rows = INSTITUTION_ROWS.map((r, i) => (i === INSTITUTION_ROWS.length - 1 ? [...r, ...partners.map((p) => ({ short: p.name, name: p.name, logo: p.logoUrl ?? undefined }))] : r));
  return (
    // Three tall logo rows: the padding here is 50% of the other sections' (see --spacing-home) to keep the section compact.
    <section className="px-gutter py-[calc(var(--spacing-home)*0.5)]">
      <Reveal className="container-page">
        <InstitutionsBrowser rows={rows} copy={c} />
      </Reveal>
    </section>
  );
}

export function ServicesShowcase({ locale, families, total }: { locale: Locale; families: FamilyVM[]; total: number }) {
  const m = getCopy(locale);
  const c = m.services;
  // Row 1: families with ≥2 services (biggest = dark card), all stretched to the tallest. Row 2: one-service families as minis.
  const maxCount = Math.max(...families.map((f) => f.count));
  const largeSlug = families.find((f) => f.count === maxCount)?.slug;
  const card = (f: FamilyVM, size: "large" | "standard" | "mini") => {
    const take = f.services.slice(0, size === "mini" ? 1 : 8);
    const top = Math.max(0, ...f.services.map((s) => s.popular));
    return (
      <FamilyCard key={f.slug} size={size} n={families.indexOf(f) + 1} title={f.name} href={localHref(locale, `/services/c/${f.slug}`)} photo={f.photo} popularLabel={c.popular}
        viewAll={c.viewAll.replace("{n}", String(f.count))}
        rows={take.map((s) => ({ name: s.name, href: localHref(locale, `/services/${s.slugs[locale]}`), popular: top > 0 && s.popular === top }))} />
    );
  };
  const minis = families.filter((f) => f.count === 1);
  return (
    <section className="px-gutter py-(--spacing-home)">
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
        <Reveal preset="fly-tilt-r" each stagger={0.08} className="mt-6 grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
          {families.filter((f) => f.count > 1).map((f) => card(f, f.slug === largeSlug ? "large" : "standard"))}
          {minis.length > 0 && (
            <div tabIndex={0} className="no-scrollbar -mx-gutter flex snap-x gap-3.5 overflow-x-auto px-gutter md:col-span-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 lg:col-span-3 md:overflow-visible md:px-0">
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
    <section className="relative px-gutter py-[calc(var(--spacing-home)*0.6)]">
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

export function Guides({ locale }: { locale: Locale }) {
  const g = getCopy(locale).guides;
  const L = (p: string) => localHref(locale, p);
  return (
    <section className="px-gutter py-(--spacing-home)">
      <Reveal className="container-page">
        <SectionHead tag={g.tag} title={g.title} aside={<ButtonLink href={L("/knowledge")} variant="secondary" dots>{g.cta}</ButtonLink>} />
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
