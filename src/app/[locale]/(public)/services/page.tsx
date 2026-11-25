import type { Metadata } from "next";
import { SectionStack } from "@/components/molecules/site/section-stack";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";
import { getFamilies, getServices } from "@/lib/catalogue";
import { getCopy, waLink } from "@/content/marketing";
import { FACES } from "@/content/families";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { WhatsAppGlyph } from "@/components/atoms/icon";
import { GridLines, HighlightWord, Faces, Star } from "@/components/atoms/brand";
import { HeroIntro } from "@/components/atoms/motion";
import { ServiceCard, cardTones } from "@/components/molecules/site/site";
import { Breadcrumb, CTACard } from "@/components/organisms/site/sections";
import { CatalogueBrowser } from "@/components/organisms/site/catalogue-browser";

export async function generateMetadata({ params }: PageProps<"/[locale]/services">): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const c = getCopy(locale).catalogue;
  return pageMeta(locale, `/services`, { title: c.tag, description: c.unsureBody });
}

// /services (F-CAT-01, F-CAT-02) — photos/To_build/03-services-catalogue__v1 + IMAGE-PROMPTS 03.
export default async function ServicesPage({ params }: PageProps<"/[locale]/services">) {
  const { locale } = await getI18n(params);
  const m = getCopy(locale);
  const c = m.catalogue;
  const [families, services] = await Promise.all([getFamilies(locale), getServices(locale)]);
  const famName = (slug: string) => families.find((f) => f.slug === slug)?.name ?? "";
  // Tones are de-duplicated per area in default order. shortcut: re-sorting/filtering can put equal tones side by side, compute client-side if it shows.
  const tone = new Map(families.flatMap((f) => { const slugs = services.filter((s) => s.family === f.slug).map((s) => s.slug); return cardTones(slugs).map((t, i) => [slugs[i], t] as const); }));
  const cards = services.map((s) => <ServiceCard key={s.slug} s={s} locale={locale} familyName={famName(s.family)} tone={tone.get(s.slug)} />);
  return (
    <SectionStack sections={[
      { key: "hero", top: "white", bottom: "white", node: (
      <section className="relative overflow-hidden px-gutter pt-[var(--spacing-hero-top)] pb-10 lg:pb-12">
        <GridLines />
        <HeroIntro className="container-page relative grid items-center gap-8 lg:grid-cols-[1.3fr_26rem] lg:gap-12">
          <div>
            <Breadcrumb items={[{ label: m.common.home, href: localHref(locale, "/") }, { label: c.crumb }]} />
            <span data-hero="eyebrow"><Tag className="eyebrow normal-case">{c.tag}</Tag></span>
            <h1 data-hero="line" className="mt-4 text-[clamp(2rem,1.5rem+1.6vw,3rem)] leading-[1.05] tracking-[-0.04em]">
              {c.l1} <HighlightWord>{c.l1hl}</HighlightWord> {c.l2}
            </h1>
            <p data-hero="copy" className="mt-4 max-w-xl text-lead text-fg-muted">{c.sub.replace("{count}", String(services.length)).replace("{areas}", String(families.length))}</p>
          </div>
          <div data-hero="actions" className="theme-dark bg-navy-700 p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-label"><Star className="size-5 text-primary" />{c.unsure}</p>
                <p className="mt-1 text-small text-white/75">{c.unsureTalk}</p>
              </div>
              <Faces srcs={FACES.slice(0, 3)} size={32} className="shrink-0 [&_[data-round]]:ring-navy-700" />
            </div>
            <div className="mt-5 grid gap-2">
              <ButtonLink href={localHref(locale, "/book")} variant="primary" dots className="w-full justify-center">{m.hero.secondary}</ButtonLink>
              <a href={waLink("Muraho HEBUZA")} target="_blank" rel="noopener" className="inline-flex h-11 w-full items-center justify-center gap-2 border border-white/40 text-button text-white hover:bg-white/10"><WhatsAppGlyph size={18} />{m.cta.whatsapp}</a>
            </div>
          </div>
        </HeroIntro>
      </section>
      ) },
      { key: "catalogue", top: "ink-950", bottom: "ink-950", node: (
      <section className="theme-dark bg-bg px-gutter py-[var(--spacing-section-sm)] text-fg">
        <div className="container-page">
          <CatalogueBrowser
            families={families.filter((f) => f.count).map((f) => ({ slug: f.slug, name: f.name, short: f.short, count: f.count }))}
            services={services.map((s, i) => ({ slug: s.slug, path: s.slugs[locale], family: s.family, name: s.name, haystack: `${s.name} ${s.summary} ${s.subArea?.name ?? ""} ${famName(s.family)}`.toLowerCase(), price: s.priceMode === "quote" ? null : s.fromFee, days: s.tiers[0]?.days ?? 99, popular: s.popular, planCovered: s.planCovered, html: i }))}
            cards={cards}
            copy={{ ...c, whatsapp: m.cta.whatsapp, consult: m.hero.secondary }}
          />
        </div>
      </section>
      ) },
      { key: "cta", top: "navy-300", bottom: "navy-300", node: <div data-page-end="navy-300" className="bg-navy-300 pt-10 md:pt-12 [&_.text-fg-muted]:text-navy-900 [&_.text-fg-heading]:text-navy-950"><CTACard locale={locale} title={c.ctaTitle} body={c.ctaBody} className="bg-navy-300" /></div> },
    ]} />
  );
}
