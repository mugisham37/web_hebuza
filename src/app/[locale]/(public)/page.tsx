import { type ReactNode } from "react";
import { homePaint, SectionStack } from "@/components/molecules/site/section-stack";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { getFamilies } from "@/lib/catalogue";
import { CONTACT } from "@/content/marketing";
import { SITE_URL } from "@/lib/site";
import { CTACard } from "@/components/organisms/site/sections";
import { getHomeSections } from "@/lib/marketing/cms/read";
import { getPublicPartners } from "@/lib/partners-public";
import { HomeHero, HowItWorksBand, Institutions, ServicesShowcase, TrackerAndRibbon, LatestUpdates } from "@/components/organisms/site/home";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale, t } = await getI18n(params);
  return pageMeta(locale, ``, { title: { absolute: t("meta.title") }, description: t("meta.description") });
}

// Home (F-CMS-01): sections in the order of photos/To_build/01-home__v1 (+ v2 for statement/CTA).
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await getI18n(params);
  const [families, order, partners] = await Promise.all([getFamilies(locale), getHomeSections(), getPublicPartners()]);
  const total = families.reduce((n, f) => n + f.count, 0);
  const org = {
    "@context": "https://schema.org", "@type": "ProfessionalService", name: "HEBUZA BUSINESS GROUP LTD", url: `${SITE_URL}/${locale}`,
    telephone: CONTACT.phoneHref.slice(4), email: CONTACT.email, areaServed: "RW", address: { "@type": "PostalAddress", addressLocality: "Kigali", addressCountry: "RW" },
    // PLACEHOLDER(HOURS): opening hours unconfirmed.
    openingHours: "Mo-Fr 08:00-17:00",
  };
  // Order and visibility from the CMS home entry (F-CMS-01); copy and facts stay in the section components / catalogue.
  const SECTIONS: Record<string, ReactNode> = {
    hero: <HomeHero locale={locale} families={families} />,
    tracker: <TrackerAndRibbon locale={locale} />,
    institutions: <Institutions locale={locale} partners={partners} />,
    services: <ServicesShowcase locale={locale} families={families} total={total} />,
    how: <HowItWorksBand locale={locale} />,
    guides: <LatestUpdates locale={locale} />, // CMS key stays "guides" (section order is stored by key)
    cta: <CTACard locale={locale} pad="py-[calc(var(--spacing-home)*0.6)]" />
  };
  const keys = order.filter((k) => SECTIONS[k]);
  const paint = homePaint(keys);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      <SectionStack sections={keys.map((k) => ({ key: k, node: SECTIONS[k], paint: paint[k] }))} />
    </>
  );
}
