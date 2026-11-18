import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { getServices } from "@/lib/catalogue";
import { images } from "@/lib/assets";
import { INSTITUTIONS, getLd, type Affects } from "@/content/pages/ld";
import { getUpdates } from "@/lib/marketing/cms/read";
import { Tag } from "@/components/atoms/tag";
import { GridLines, HighlightWord } from "@/components/atoms/brand";
import { HeroIntro } from "@/components/atoms/motion";
import { PhotoFrame } from "@/components/molecules/site/site";
import { UpdatesBrowser } from "@/components/organisms/site/browsers";
import { UpdateCard } from "@/components/organisms/site/update-parts";
import { SubscribeForm } from "@/components/molecules/site/library";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const u = getLd(locale).updates;
  return pageMeta(locale, `/updates`, { title: u.tag, description: u.meta });
}

// /updates — photos/To_build/landing/18-updates v2 cards + v1 filter rows and "Never miss a deadline" band.
export default async function UpdatesPage({ params }: Props) {
  const { locale } = await getI18n(params);
  const c = getLd(locale);
  const u = c.updates;
  const services = await getServices(locale);
  const list = [...(await getUpdates())].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <section className="relative overflow-hidden px-gutter pt-[var(--spacing-hero-top)] pb-10">
        <GridLines />
        <div className="container-page relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <HeroIntro>
            <span data-hero="eyebrow"><Tag variant="navy">{u.tag}</Tag></span>
            <h1 className="mt-6 text-display">
              <span data-hero="line" className="block">{u.l1}</span>
              <span data-hero="line" className="block"><HighlightWord>{u.hl}</HighlightWord></span>
            </h1>
            <p data-hero="copy" className="mt-6 max-w-xl text-lead text-fg-muted">{u.sub}</p>
          </HeroIntro>
          <PhotoFrame src={images.workLumenHealth} alt="" rotate={-1.5} ratio="aspect-[16/10]" priority sizes="(min-width: 1024px) 45vw, 90vw" className="max-lg:hidden" />
        </div>
      </section>

      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <div className="container-page">
          <UpdatesBrowser
            copy={u}
            insts={INSTITUTIONS}
            affects={(Object.keys(u.aff) as Affects[]).map((v) => ({ v, label: u.aff[v] }))}
            items={list.map((x) => ({ inst: x.inst, affects: x.affects }))}
            cards={list.map((x) => <UpdateCard key={x.slug} u={x} c={u} locale={locale} example={c.example} svc={services.find((s) => s.slug === x.service)} />)}
          />
          <p className="mt-6 text-small text-fg-subtle">{c.exampleNote}</p>
        </div>
      </section>

      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <div className="container-page grid gap-5 theme-dark bg-grad-navy-depth p-7 text-fg md:grid-cols-[auto_1fr_minmax(0,1.3fr)] md:items-center md:p-10">
          <h2 className="text-h3 md:border-r md:border-white/25 md:pr-8">{u.bandT}</h2>
          <p className="text-body text-fg-muted">{u.bandB}</p>
          <div className="grid gap-2">
            <SubscribeForm label={u.bandT} placeholder={c.knowledge.newsPh} done={c.knowledge.newsDone} error={c.knowledge.newsErr} lang={{ label: u.lang, value: locale }} />
            <p className="pl-5 text-small text-fg-muted">{u.bandNote}</p>
          </div>
        </div>
      </section>
    </>
  );
}
