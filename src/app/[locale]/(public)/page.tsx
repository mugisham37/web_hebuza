import { type ReactNode } from "react";
import { SectionStack, type Tone } from "@/components/molecules/site/section-stack";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { getFamilies, getPlans, getServices } from "@/lib/catalogue";
import { CONTACT } from "@/content/marketing";
import { SITE_URL } from "@/lib/site";
import { CTACard } from "@/components/organisms/site/sections";
import { getHomeSections } from "@/lib/marketing/cms/read";
import { Guides, HomeHero, HowItWorksBand, Institutions, PricingTeaser, ServicesShowcase, TrackerAndRibbon } from "@/components/organisms/site/home";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale, t } = await getI18n(params);
  return pageMeta(locale, ``, { title: { absolute: t("meta.title") }, description: t("meta.description") });
}

// Edge colours of each home section (SectionStack blends unequal neighbours); tracker hugs the hero, no band.
const TONES: Record<string, { top: Tone; bottom: Tone; divider?: boolean }> = {
  hero: { top: "white", bottom: "white" }, tracker: { top: "white", bottom: "white", divider: false },
  institutions: { top: "sky-200", bottom: "sky-200" }, services: { top: "ink-950", bottom: "ink-950" },
  how: { top: "white", bottom: "white" }, pricing: { top: "navy-900", bottom: "navy-900" },
  guides: { top: "sky-200", bottom: "sky-200" }, cta: { top: "white", bottom: "white" },
};

// Home (F-CMS-01): sections in the order of photos/To_build/01-home__v1 (+ v2 for statement/CTA).
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await getI18n(params);
  const [families, services, plans, order] = await Promise.all([getFamilies(locale), getServices(locale), getPlans(), getHomeSections()]);
  const total = families.reduce((n, f) => n + f.count, 0);
  const search = services.map((s) => ({ slug: s.slug, path: s.slugs[locale], name: s.name, family: families.find((f) => f.slug === s.family)?.name ?? "" }));
  const org = {
    "@context": "https://schema.org", "@type": "ProfessionalService", name: "HEBUZA BUSINESS GROUP LTD", url: `${SITE_URL}/${locale}`,
    telephone: CONTACT.phoneHref.slice(4), email: CONTACT.email, areaServed: "RW", address: { "@type": "PostalAddress", addressLocality: "Kigali", addressCountry: "RW" },
    // PLACEHOLDER(HOURS): opening hours unconfirmed.
    openingHours: "Mo-Fr 08:00-17:00",
  };
  // Order and visibility from the CMS home entry (F-CMS-01); copy and facts stay in the section components / catalogue.
  const SECTIONS: Record<string, ReactNode> = {
    hero: <HomeHero locale={locale} search={search} />,
    tracker: <TrackerAndRibbon locale={locale} />,
    institutions: <Institutions locale={locale} />,
    services: <ServicesShowcase locale={locale} families={families} total={total} />,
    how: <HowItWorksBand locale={locale} />,
    pricing: <PricingTeaser locale={locale} services={services} families={families} plans={plans} />,
    guides: <Guides locale={locale} />,
    cta: <CTACard locale={locale} />,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      <SectionStack sections={order.filter((k) => SECTIONS[k]).map((k) => ({ key: k, node: SECTIONS[k], ...(TONES[k] ?? { top: "white", bottom: "white" }) }))} />
    </>
  );
}
