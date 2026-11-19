import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";
import { formatDate } from "@/shared/format";
import { images } from "@/lib/assets";
import { getLd, type GuideCat } from "@/content/pages/ld";
import { getGuides } from "@/lib/marketing/cms/read";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { GridLines, HighlightWord, Star } from "@/components/atoms/brand";
import { HeroIntro, Reveal } from "@/components/atoms/motion";
import { GuideCard, PhotoFrame } from "@/components/molecules/site/site";
import { KnowledgeBrowser } from "@/components/organisms/site/browsers";
import { SubscribeForm } from "@/components/molecules/site/library";

export async function generateMetadata({
  params,
}: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const k = getLd(locale).knowledge;
  return pageMeta(locale, `/knowledge`, {
    title: k.tag,
    description: k.meta });
}

// /knowledge — photos/To_build/landing/17-knowledge__v1.
export default async function KnowledgePage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await getI18n(params);
  const c = getLd(locale);
  const k = c.knowledge;
  const L = (p: string) => localHref(locale, p);
  const GUIDES = await getGuides();
  const feat = GUIDES.find((g) => g.featured) ?? GUIDES[0];
  const ft = feat?.t[locale];
  const rest = GUIDES.filter((g) => g !== feat);
  return (
    <>
      <section className="relative overflow-hidden px-gutter pt-[var(--spacing-hero-top)] pb-10">
        <GridLines />
        <div className="container-page relative grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
          <HeroIntro>
            <span data-hero="eyebrow">
              <Tag variant="navy">{k.tag}</Tag>
            </span>
            <h1 className="mt-6 text-display">
              <span data-hero="line" className="block">
                {k.l1} <HighlightWord>{k.hl}</HighlightWord>
              </span>
              <span data-hero="line" className="block">
                {k.l2}
              </span>
            </h1>
          </HeroIntro>
          <PhotoFrame
            src={images.studioPortraitOrange}
            alt=""
            rotate={2}
            ratio="aspect-[4/3]"
            priority
            sizes="(min-width: 1024px) 40vw, 90vw"
            className="max-lg:hidden"
          />
        </div>
      </section>

      {feat && ft ? (
        <>
        <section className="px-gutter pb-10">
          <Reveal
            preset="card-in"
            className="container-page grid overflow-hidden border-2 border-navy-700 bg-surface md:grid-cols-[1fr_1.2fr]"
          >
            <div className="relative min-h-56">
              <Image
                src={feat.img}
                alt=""
                fill
                sizes="(min-width: 768px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col gap-4 p-6 md:p-10">
              <p className="flex flex-wrap items-center gap-3 text-small">
                <Tag variant="navy">{k.cats[feat.cat]}</Tag>
                <Tag variant="neutral">{k.featured}</Tag>
                {formatDate(feat.date, locale)}
                <Star className="size-2.5 text-gold-600" />
                {k.minRead.replace("{n}", String(feat.read))}
              </p>
              <h2 className="text-h2">{ft.title}</h2>
              <p className="text-body text-fg-muted">{ft.excerpt}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-4">
                <p className="text-small text-fg-subtle">{k.by}</p>
                <ButtonLink href={L(`/knowledge/${feat.slug}`)} dots>
                  {k.read}
                  <span className="sr-only">: {ft.title}</span>
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </section>
  
        <section className="px-gutter pb-[var(--spacing-section-sm)]">
          <div className="container-page">
            <KnowledgeBrowser
              copy={k}
              cats={(Object.keys(k.cats) as GuideCat[]).map((v) => ({
                v,
                label: k.cats[v],
              }))}
              items={rest.map((g) => ({
                cat: g.cat,
                haystack:
                  `${g.t[locale].title} ${g.t[locale].excerpt} ${g.t[locale].overview} ${k.cats[g.cat]}`.toLowerCase(),
              }))}
              cards={rest.map((g) => (
                <GuideCard
                  key={g.slug}
                  img={g.img}
                  tag={k.cats[g.cat]}
                  date={formatDate(g.date, locale)}
                  read={k.minRead.replace("{n}", String(g.read))}
                  title={g.t[locale].title}
                  excerpt={g.t[locale].excerpt}
                  href={L(`/knowledge/${g.slug}`)}
                />
              ))}
            />
            <p className="mt-8 text-small text-fg-subtle">{c.exampleNote}</p>
          </div>
        </section>
        </>
      ) : (
        <section className="px-gutter pb-[var(--spacing-section-sm)]">
          <div className="container-page border-2 border-navy-700 bg-surface p-8">
            <p className="text-h4">{k.noneT}</p>
            <p className="mt-2 text-muted">{k.noneB}</p>
          </div>
        </section>
      )}

      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <div className="container-page grid gap-6 theme-dark bg-grad-navy-depth p-7 text-fg md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <h2 className="text-h3">{k.newsT}</h2>
          <SubscribeForm
            label={k.newsT}
            placeholder={k.newsPh}
            done={k.newsDone}
            error={k.newsErr}
          />
        </div>
      </section>
    </>
  );
}
