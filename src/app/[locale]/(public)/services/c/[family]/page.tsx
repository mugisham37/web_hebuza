import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { locales, localHref } from "@/shared/i18n/config";
import { getFamily } from "@/lib/catalogue";
import { FAMILIES, FACES } from "@/content/families";
import { getCopy } from "@/content/marketing";
import { images } from "@/lib/assets";
import { ButtonLink } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { Tag } from "@/components/atoms/tag";
import { laCopy } from "@/content/pages/la";
import { FaceCluster, Faces, GridLines, HighlightWord } from "@/components/atoms/brand";
import { HeroIntro, Reveal } from "@/components/atoms/motion";
import { CardFan, GuideCard, ServiceCard, cardTones, SectionHead } from "@/components/molecules/site/site";
import { Breadcrumb, CTACard, FAQBlock } from "@/components/organisms/site/sections";

export function generateStaticParams() {
  return locales.flatMap((locale) => FAMILIES.map((f) => ({ locale, family: f.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/services/c/[family]">): Promise<Metadata> {
  const { family } = await params;
  const { locale } = await getI18n(params);
  const f = await getFamily(family, locale);
  if (!f) return {};
  return pageMeta(locale, `/services/c/${f.slug}`, { title: f.name, description: f.blurb });
}

// /services/c/[family] (F-CAT-09) — photos/To_build/04-service-family-tax__v1, "who it's for" band from v2.
export default async function FamilyPage({ params }: PageProps<"/[locale]/services/c/[family]">) {
  const { family } = await params;
  const { locale } = await getI18n(params);
  const f = await getFamily(family, locale);
  if (!f) notFound();
  const m = getCopy(locale);
  const L = (p: string) => localHref(locale, p);
  const la = laCopy(locale);
  const words = f.promise.split(" ");
  const last = words.pop();
  const groups = f.subAreas.length ? f.subAreas.map((s) => ({ ...s, items: f.services.filter((x) => x.subArea?.slug === s.slug) })) : [{ slug: "all", name: m.family.all, count: f.count, items: f.services }];
  return (
    <>
      <section className="relative overflow-hidden px-gutter pt-[var(--spacing-hero-top)] pb-14">
        <GridLines />
        <HeroIntro className="container-page relative">
          <Breadcrumb items={[{ label: m.common.home, href: L("/") }, { label: m.common.services, href: L("/services") }, { label: f.name }]} />
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <span data-hero="eyebrow" className="flex size-14 items-center justify-center rounded-full bg-navy-700 text-gold-400"><Icon name={f.icon} size={26} /></span>
              <h1 className="mt-6 text-[clamp(2.5rem,1.5rem+4.2vw,5.25rem)] leading-[1] tracking-[-0.05em]">
                <span data-hero="line" className="block">{words.join(" ")} <Faces srcs={FACES.slice(0, 3)} inline /> <HighlightWord>{last}</HighlightWord></span>
              </h1>
              <p data-hero="copy" className="mt-6 max-w-xl text-lead text-fg-muted">{f.blurb}</p>
              <div data-hero="actions" className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="#services" size="lg" dots>{m.family.see.replace("{n}", String(f.count))}</ButtonLink>
                <ButtonLink href={L("/book")} size="lg" variant="primary" dots>{m.hero.secondary}</ButtonLink>
              </div>
            </div>
            <CardFan back1={images.servicesVisualIdentity} back2={images.workNorthline} front={f.photo} alt={f.name} caption={f.services[0]?.name ?? f.name} meta={f.services[0]?.tiers[0]?.eta ?? ""} tag={m.hero.cardTag} badge={m.hero.badge} priority />
          </div>
        </HeroIntro>
      </section>

      <section id="services" className="scroll-mt-24 px-gutter py-[var(--spacing-section-sm)]">
        <div className="container-page">
          {f.subAreas.length > 1 && (
            <nav aria-label={m.family.all} className="no-scrollbar mb-10 flex gap-2 overflow-x-auto">
              <a href="#services" className="inline-flex h-10 shrink-0 items-center gap-2 bg-secondary px-4 text-button text-on-secondary">{m.family.all}<span className="bg-white/15 px-1.5 text-eyebrow">{f.count}</span></a>
              {f.subAreas.map((s) => <a key={s.slug} href={`#sub-${s.slug}`} className="inline-flex h-10 shrink-0 items-center gap-2 border border-border-strong bg-white px-4 text-button text-ink-900 hover:border-navy-300 hover:bg-navy-50">{s.name}<span className="bg-ink-100 px-1.5 text-eyebrow">{s.count}</span></a>)}
            </nav>
          )}
          <div className="grid gap-14">
            {groups.map((g) => (
              <Reveal key={g.slug} id={`sub-${g.slug}`} className="scroll-mt-28">
                {groups.length > 1 && <h2 data-reveal className="mb-5 flex items-center gap-3 text-h3">{g.name}<span className="text-body text-fg-subtle">{g.items.length}</span></h2>}
                <Reveal preset="rise-lg" each className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                  {cardTones(g.items.map((s) => s.slug)).map((t, i) => <ServiceCard key={g.items[i].slug} s={g.items[i]} locale={locale} familyName={f.name} tone={t} />)}
                </Reveal>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <Reveal className="container-page grid gap-8 overflow-hidden border-t-[3px] border-rule bg-sky-50 p-6 text-navy-800 sm:p-8 md:grid-cols-[1fr_auto_1.2fr] md:items-center md:p-10">
          <div className="flex flex-wrap items-center gap-6">
            <FaceCluster srcs={FACES} tag={la.band.tag} className="shrink-0" />
            <p data-reveal className="flex flex-col">
              <span className="font-display text-[clamp(4rem,3rem+3vw,6rem)] leading-none tracking-[-0.05em] tabular">{f.count}</span>
              <span className="mt-2 text-body">{la.band.people} {la.band.across}<br />{Math.max(f.subAreas.length, 1)} {la.band.areas}</span>
            </p>
          </div>
          <span aria-hidden className="hidden h-32 w-px bg-navy-200 md:block" />
          <div className="relative">
            <Tag variant="neutral" className="normal-case">{m.family.who}</Tag>
            <h2 data-reveal className="mt-4 text-h2 text-fg-heading">{la.band.title}</h2>
            <p data-reveal className="mt-3 max-w-lg text-body">{la.band.body}</p>
            <ul className="mt-5 flex flex-wrap gap-2">{m.family.whoList.map((w) => <li key={w} data-reveal className="flex items-center gap-1.5 bg-white/70 px-3 py-1.5 text-small"><Icon name="check" size={12} strokeWidth={3} />{w}</li>)}</ul>
          </div>
        </Reveal>
      </section>

      <FAQBlock locale={locale} title={m.family.faqTitle} items={m.faq.items.slice(0, 4)} />

      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <Reveal className="container-page">
          <SectionHead tag={m.guides.tag} title={m.guides.title} aside={<ButtonLink href={L("/knowledge")} variant="secondary" dots>{m.guides.cta}</ButtonLink>} />
          <Reveal tabIndex={0} preset="rise-lg" each className="no-scrollbar -mx-gutter mt-10 flex snap-x gap-4 overflow-x-auto px-gutter md:mx-0 md:grid md:grid-cols-3 md:px-0">
            {m.guides.items.map((it) => <GuideCard key={it.title} img={(images as Record<string, string>)[it.img]} tag={it.tag} date={it.date} read={it.read} title={it.title} excerpt={it.excerpt} href={L("/knowledge")} />)}
          </Reveal>
        </Reveal>
      </section>
      <CTACard locale={locale} title={m.family.cta} />
    </>
  );
}
