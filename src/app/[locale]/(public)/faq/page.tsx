import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";
import { images } from "@/lib/assets";
import { FAQ_CATEGORIES, getLB, slugify } from "@/content/pages/lb";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { GridLines, HighlightWord, Star } from "@/components/atoms/brand";
import { HeroIntro, Reveal } from "@/components/atoms/motion";
import { PhotoFrame } from "@/components/molecules/site/site";
import { FaqBrowser, type FaqCat } from "@/components/organisms/site/faq-browser";
import { getFaqs } from "@/lib/marketing/cms/read";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const f = getLB(locale).faq;
  return pageMeta(locale, `/faq`, {
    title: f.tag,
    description: f.meta });
}

// /faq — photos/To_build/landing/09-faq__v1 (tiles, rail) + v2 ("Still stuck" card). Phone layout: tiles become a swipeable chip row.
export default async function FaqPage({ params }: Props) {
  const { locale } = await getI18n(params);
  const f = getLB(locale).faq;
  // CMS-fed (F-CMS-03): published FAQs per category; category labels stay in the page copy.
  const cms = await getFaqs(locale);
  const cats: FaqCat[] = FAQ_CATEGORIES.map((key) => ({
    key,
    label: f.cats[key],
    body: f.catBody[key],
    items: (cms[key] ?? []).map((i) => ({ q: i.q, a: i.a, id: `q-${slugify(i.q)}` })),
  }));
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cats
      .flatMap((c) => c.items)
      .map((i) => ({
        "@type": "Question",
        name: i.q,
        acceptedAnswer: { "@type": "Answer", text: i.a },
      })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <section className="relative overflow-hidden px-gutter pt-[var(--spacing-hero-top)] pb-10">
        <GridLines />
        <HeroIntro className="container-page relative flex flex-col items-center text-center">
          <span data-hero="eyebrow">
            <Tag variant="neutral" className="gap-2">
              <Star className="size-3" />
              {f.tag}
            </Tag>
          </span>
          <h1 className="mt-6 text-display">
            <span data-hero="line" className="block">
              {f.l1}
            </span>
            <span data-hero="line" className="block">
              {f.l2} <HighlightWord>{f.hl}</HighlightWord>
            </span>
          </h1>
        </HeroIntro>
      </section>
      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <div className="container-page">
          <FaqBrowser cats={cats} copy={f} />
        </div>
      </section>
      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <Reveal
          preset="card-in"
          className="container-page grid items-center gap-8 border-t-[3px] border-rule bg-sky-50 p-7 text-navy-800 md:grid-cols-[1.2fr_1fr] md:p-12"
        >
          <div className="grid justify-items-start gap-4">
            <Tag variant="navy">
              {f.stuckTag}
            </Tag>
            <h2 className="text-h2">{f.stuckTitle}</h2>
            <p className="max-w-md text-lead">{f.stuckBody}</p>
            <ButtonLink href={localHref(locale, "/contact")} dots>
              {f.contact}
            </ButtonLink>
          </div>
          <PhotoFrame
            src={images.studioPortraitTeal}
            alt={f.photoAlt}
            rotate={3}
            ratio="aspect-[4/3]"
            sizes="(min-width: 768px) 40vw, 90vw"
          />
        </Reveal>
      </section>
    </>
  );
}
