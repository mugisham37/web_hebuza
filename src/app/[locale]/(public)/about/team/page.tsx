import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";
import { getLB, TEAM } from "@/content/pages/lb";
import { getCopy } from "@/content/marketing";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { GridLines } from "@/components/atoms/brand";
import { HeroIntro } from "@/components/atoms/motion";
import { Breadcrumb, CTACard } from "@/components/organisms/site/sections";
import { TeamGrid } from "@/components/molecules/site/site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const t = getLB(locale).about.teamPage;
  // No consented profiles yet: keep the empty page out of the index.
  return pageMeta(locale, `/about/team`, {
    title: t.title,
    description: t.sub,
    
    robots: TEAM.some((m) => m.consented) ? undefined : { index: false } });
}

// /about/team — full team grid (08 v2 framing). Only consented profiles (F-WRK-04); empty state until then.
export default async function TeamPage({ params }: Props) {
  const { locale } = await getI18n(params);
  const a = getLB(locale).about;
  const L = (x: string) => localHref(locale, x);
  const has = TEAM.some((m) => m.consented);
  return (
    <>
      <section className="relative overflow-hidden px-gutter pt-[var(--spacing-hero-top)] pb-10">
        <GridLines />
        <HeroIntro className="container-page relative">
          <Breadcrumb
              items={[
                { label: getCopy(locale).common.home, href: L("/") },
                { label: a.teamPage.back, href: L("/about") },
                { label: a.teamPage.title },
              ]}
            />
          <span data-hero="eyebrow" className="block">
            <Tag variant="navy">{a.teamTag}</Tag>
          </span>
          <h1 data-hero="line" className="mt-4 text-display">
            {a.teamTitle}
          </h1>
          <p data-hero="copy" className="mt-4 max-w-xl text-lead text-fg-muted">
            {a.teamSub}
          </p>
        </HeroIntro>
      </section>
      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <div className="container-page">
          {has ? (
            <TeamGrid locale={locale} />
          ) : (
            <div
              role="status"
              className="grid justify-items-start gap-3 border border-dashed border-border-strong bg-white p-8 md:p-12"
            >
              <p className="text-h3">{a.teamEmpty}</p>
              <p className="max-w-lg text-body text-fg-muted">
                {a.teamEmptyBody}
              </p>
              <ButtonLink href={L("/about")} variant="outline" dots>
                {a.teamPage.back}
              </ButtonLink>
            </div>
          )}
        </div>
      </section>
      <CTACard locale={locale} />
    </>
  );
}
