import { SectionStack } from "@/components/molecules/site/section-stack";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";
import { getCopy } from "@/content/marketing";
import { images } from "@/lib/assets";
import { cx } from "@/shared/format";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { Icon, type IconName } from "@/components/atoms/icon";
import { GridLines, HighlightWord, Rule, Star } from "@/components/atoms/brand";
import { HeroIntro, Reveal } from "@/components/atoms/motion";
import { HebuzaVsInstitution, IconTile } from "@/components/molecules/site/site";
import { CTACard } from "@/components/organisms/site/sections";

export async function generateMetadata({ params }: PageProps<"/[locale]/how-it-works">): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const h = getCopy(locale).howPage;
  return pageMeta(locale, `/how-it-works`, { title: getCopy(locale).common.howItWorks, description: h.sub });
}

const GOOD_TONE = ["bg-ink-100 text-ink-900", "bg-navy-700 text-white", "bg-sky-50 text-navy-800", "bg-gold-200 text-ink-900", "bg-white text-ink-900 border border-border"];
const GOOD_IMG = [images.facesFace02, null, images.workMorrowCoffee, images.studioPortraitTeal, images.servicesVisualIdentity];
const PROMISE_ICON: IconName[] = ["shield", "zap", "lock", "refresh"];

// /how-it-works — photos/To_build/06-how-it-works__v1.
export default async function HowItWorksPage({ params }: PageProps<"/[locale]/how-it-works">) {
  const { locale } = await getI18n(params);
  const m = getCopy(locale);
  const h = m.howPage;
  const L = (p: string) => localHref(locale, p);
  const howTo = { "@context": "https://schema.org", "@type": "HowTo", name: m.common.howItWorks, step: h.rows.map((r, i) => ({ "@type": "HowToStep", position: i + 1, name: r.t, text: r.b })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }} />
      <SectionStack sections={[
        { key: "hero", top: "white", bottom: "white", node: (
      <section className="relative overflow-hidden px-gutter pt-[var(--spacing-hero-top)] pb-10">
        <GridLines />
        <HeroIntro className="container-page relative flex flex-col items-center text-center">
          <span data-hero="eyebrow"><Tag variant="navy" className="gap-2 text-small"><Star className="size-3 text-gold-600" />{m.common.howItWorks}</Tag></span>
          <h1 className="mt-6 text-display">
            <span data-hero="line" className="block">{h.l1}</span>
            <span data-hero="line" className="block">{h.l2} <HighlightWord>{h.l2hl}</HighlightWord></span>
          </h1>
          <p data-hero="copy" className="mt-6 max-w-xl text-lead text-fg-muted">{h.sub}</p>
        </HeroIntro>
      </section>
        ) },
        { key: "rules", top: "white", bottom: "white", node: (
      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <ol className="container-page">
          {h.rows.map((r, i) => (
            <Reveal as="li" key={r.t} className="grid items-center gap-6 border-b border-border py-8 md:grid-cols-[8rem_1fr_minmax(0,24rem)] md:gap-10">
              <span data-reveal className="font-display text-[clamp(3.5rem,2.5rem+3vw,5.5rem)] leading-none tracking-[-0.04em] text-fg-heading">{String(i + 1).padStart(2, "0")}</span>
              <div data-reveal className="md:border-l md:border-border md:pl-10">
                <h2 className="text-h3">{r.t}</h2>
                <p className="mt-2 max-w-lg text-body text-fg-muted">{r.b}</p>
              </div>
              <div data-reveal className={cx("flex min-h-28 items-stretch overflow-hidden ", GOOD_TONE[i])}>
                <div className="flex-1 p-5">
                  <p className="flex items-center gap-2 text-eyebrow font-medium"><span className="size-1.5 rounded-full bg-current" />{h.good}</p>
                  <p className="mt-2 text-small font-medium">{r.g}</p>
                </div>
                {GOOD_IMG[i] ? <div className="relative w-28 shrink-0"><Image src={GOOD_IMG[i]!} alt="" fill sizes="112px" className="object-cover" /></div>
                  : <div className="relative flex w-24 shrink-0 items-center justify-center"><Icon name="file" size={44} strokeWidth={1.4} /><span className="absolute right-4 bottom-6 flex size-6 items-center justify-center rounded-full bg-gold-400 text-on-gold"><Icon name="check" size={13} strokeWidth={3} /></span></div>}
              </div>
            </Reveal>
          ))}
        </ol>
      </section>
        ) },
        { key: "detail", top: "ink-950", bottom: "ink-950", node: (
      <section className="theme-dark bg-bg px-gutter py-[var(--spacing-section-sm)] text-fg">
        <Reveal className="container-page">
          <h2 data-reveal className="text-center text-h2">{h.seeTitle}</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-5">
            {h.phases.map((p, i) => (
              <li key={p.t} data-reveal className="relative flex flex-col items-center text-center">
                {i < h.phases.length - 1 && <span aria-hidden data-rule className="absolute top-5 left-1/2 hidden h-px w-full bg-white/25 md:block" />}
                <span className={cx("relative flex h-10 items-center gap-2 px-4 text-label", i === 2 ? "bg-primary text-on-gold shadow-[0_0_0_6px_rgb(248_183_24/0.25)]" : "bg-surface-raised")}>
                  <span className={cx("flex size-6 items-center justify-center rounded-full", i < 2 ? "bg-navy-700 text-white" : i === 2 ? "border-2 border-navy-950" : "bg-white/15")}>{i < 2 && <Icon name="check" size={14} strokeWidth={3} />}</span>{p.t}
                </span>
                <p className="mt-3 max-w-[12rem] text-small text-fg-muted">{p.d}</p>
              </li>
            ))}
          </ol>
          <Rule tone="dark" className="my-12" />
          <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr_1.3fr]">
            <div data-reveal className="mx-auto w-60 animate-float border-[6px] border-ink-950 bg-white p-4 text-ink-900 shadow-lg">
              <span aria-hidden className="mx-auto mb-3 block h-1.5 w-16 bg-ink-950" />
              <p className="flex items-center justify-between text-label font-bold">HEBUZA<span className="text-gold-600">✦</span></p>
              <ul className="mt-4 grid gap-3 text-small">
                {h.phases.map((p, i) => (
                  <li key={p.t} className={cx("flex items-center gap-2 px-2 py-1.5", i === 2 && "bg-sky-50 text-navy-700")}>
                    <span className={cx("flex size-4 items-center justify-center rounded-full", i < 2 ? "bg-success text-white" : i === 2 ? "border-2 border-navy-700" : "border border-ink-300")}>{i < 2 && <Icon name="check" size={10} strokeWidth={3} />}</span>{p.t}
                  </li>
                ))}
              </ul>
            </div>
            <p data-reveal className="mx-auto max-w-xs bg-ink-100 p-4 text-body text-ink-900">{h.sms}<span className="mt-2 block text-eyebrow text-fg-subtle">11:30</span></p>
            <HebuzaVsInstitution dark hebuza={m.detail.hebuza} institution={m.detail.institution} done={h.done} outcome={h.rdb} caption={h.both} />
          </div>
        </Reveal>
      </section>
        ) },
        { key: "next", top: "white", bottom: "white", node: (
      <section className="px-gutter py-[var(--spacing-section-sm)]">
        <Reveal className="container-page grid gap-8 lg:grid-cols-[1fr_1fr_0.8fr]">
          <div>
            <h2 data-reveal className="text-h3">{h.payTitle}</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {h.pays.map((p, i) => (
                <div key={p} data-reveal className={cx("min-h-28 p-4", ["bg-navy-700 text-white", "bg-gold-200 text-ink-900", "bg-sky-100 text-navy-800", "bg-ink-100 text-ink-900"][i])}>
                  <span className="text-label">0{i + 1}</span><p className="mt-3 text-small font-medium">{p}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 data-reveal className="text-h3">{h.promisesTitle}</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">{h.promises.map((p, i) => <IconTile key={p} icon={PROMISE_ICON[i]} text={p} />)}</div>
          </div>
          <div data-reveal className="flex flex-col justify-between gap-6 border-t-[3px] border-rule bg-sky-50 p-7 text-navy-800">
            <p className="text-h3">{h.ready}</p>
            <div className="grid gap-2">
              <ButtonLink href={L("/services")} variant="primary" dots className="justify-between">{h.start}</ButtonLink>
              <ButtonLink href={L("/pricing")} variant="outline" dots className="justify-between">{h.pricing}</ButtonLink>
            </div>
          </div>
        </Reveal>
      </section>
        ) },
        { key: "cta", top: "white", bottom: "white", node: <CTACard locale={locale} /> },
      ]} />
    </>
  );
}
