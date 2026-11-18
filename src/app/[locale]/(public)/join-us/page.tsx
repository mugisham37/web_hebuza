import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";
import { images } from "@/lib/assets";
import { cx } from "@/shared/format";
import { FACES } from "@/content/families";
import { getLd } from "@/content/pages/ld";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { Icon } from "@/components/atoms/icon";
import { Faces, GridLines, HighlightWord } from "@/components/atoms/brand";
import { HeroIntro, Reveal } from "@/components/atoms/motion";
import { PhotoFrame } from "@/components/molecules/site/site";

export async function generateMetadata({
  params,
}: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const j = getLd(locale).join;
  return pageMeta(locale, `/join-us`, {
    title: j.tag,
    description: j.meta });
}

const WHO_TONE = [
  "bg-navy-700 text-white",
  "border border-border bg-white text-ink-900",
  "bg-navy-900 text-white",
  "bg-gold-200 text-ink-900",
];
const BARS = [52, 48, 70, 44, 76, 100]; // illustration only

// /join-us — photos/To_build/landing/16-join v2 hero/earnings/FAQ + v1 "who we look for" tones and arrow row.
// (/join is the auth application route, which "Apply now" links to.)
export default async function JoinPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await getI18n(params);
  const j = getLd(locale).join;
  const apply = localHref(locale, "/join");
  return (
    <>
      <section className="relative overflow-hidden px-gutter pt-[var(--spacing-hero-top)] pb-[var(--spacing-section-sm)]">
        <GridLines />
        <div className="container-page relative grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <HeroIntro>
            <span data-hero="eyebrow">
              <Tag variant="navy">{j.tag}</Tag>
            </span>
            <h1 className="mt-6 text-display">
              <span data-hero="line" className="block">
                {j.l1}{" "}
                <Faces
                  srcs={FACES.slice(0, 3)}
                  inline
                  size={52}
                  className="inline-flex align-middle max-sm:hidden"
                />
              </span>
              <span data-hero="line" className="block">
                {j.l2} <HighlightWord>{j.hl}</HighlightWord>
              </span>
            </h1>
            <p
              data-hero="copy"
              className="mt-6 max-w-xl text-lead text-fg-muted"
            >
              {j.sub}
            </p>
            <div data-hero="copy" className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={apply} variant="primary" dots>
                {j.apply}
              </ButtonLink>
              <ButtonLink href="#how" variant="outline" dots>
                {j.how}
              </ButtonLink>
            </div>
          </HeroIntro>
          <PhotoFrame
            src={images.studioPortraitOrange}
            alt=""
            rotate={2}
            ratio="aspect-[5/4]"
            priority
            sizes="(min-width: 1024px) 45vw, 90vw"
          />
        </div>
      </section>

      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <Reveal className="container-page bg-sky-50 p-5 md:p-8">
          <h2 data-reveal className="text-h2">
            {j.whoT}
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {j.who.map((w, i) => (
              <li
                key={w}
                data-reveal
                className={cx(
                  "flex min-h-40 flex-col gap-3  p-6",
                  WHO_TONE[i],
                )}
              >
                <span className="font-display text-[2.75rem] leading-none tracking-[-0.04em]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-lead">{w}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      <section
        id="how"
        className="scroll-mt-24 px-gutter pb-[var(--spacing-section-sm)]"
      >
        <Reveal className="container-page">
          <h2 data-reveal className="text-h2">
            {j.howT}
          </h2>
          <ol className="mt-6 grid gap-3 md:grid-cols-5">
            {j.steps.map((s, i) => (
              <li
                key={s}
                data-reveal
                className="relative flex items-start gap-3 border border-border bg-white p-5 md:flex-col"
              >
                <span className="font-display text-h3 text-fg-heading">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-body">{s}</span>
                {i < j.steps.length - 1 && (
                  <Icon
                    name="arrowRight"
                    size={18}
                    aria-hidden
                    className="absolute top-1/2 -right-3 z-10 hidden -translate-y-1/2 bg-bg text-fg-subtle md:block"
                  />
                )}
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <Reveal className="container-page theme-dark grid gap-8 bg-grad-navy-depth p-7 text-fg md:p-10 lg:grid-cols-[1fr_1.1fr_0.9fr] lg:items-center">
          <div data-reveal>
            <h2 className="text-h2">{j.earnT}</h2>
            <p className="mt-4 text-body text-fg-muted">{j.earnB}</p>
          </div>
          <figure
            data-reveal
            className="bg-white p-5 text-ink-900 shadow-lg"
          >
            <figcaption>
              <p className="text-label-lg">{j.stmt}</p>
              <p className="text-small text-fg-subtle">{j.stmtSub}</p>
            </figcaption>
            <div aria-hidden className="mt-5 flex h-28 items-end gap-3">
              {BARS.map((h, i) => (
                <span
                  key={i}
                  className={cx(
                    "flex-1 ",
                    i === BARS.length - 1 ? "bg-gold-400" : "bg-navy-200",
                  )}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </figure>
          <div data-reveal className="lg:border-l lg:border-gold-400/40 lg:pl-8">
            <h3 className="text-label-lg text-primary">{j.needT}</h3>
            <ul className="mt-4 grid gap-3">
              {j.need.map((n) => (
                <li key={n} className="flex items-center gap-3 text-body">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold-400 text-on-gold">
                    <Icon name="check" size={14} strokeWidth={3} />
                  </span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      <section className="px-gutter pb-[var(--spacing-section)]">
        <Reveal className="container-page grid gap-6 lg:grid-cols-2">
          <div data-reveal>
            <h2 className="text-h2">{j.faqT}</h2>
            <div className="mt-6 grid gap-3">
              {j.faq.map((f, i) => (
                <details
                  key={f.q}
                  open={i === 0}
                  className="group border border-border bg-white px-5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-label-lg [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <Icon
                      name="plus"
                      size={18}
                      className="shrink-0 transition-transform group-open:rotate-45"
                    />
                  </summary>
                  <p className="pb-5 text-body text-fg-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <div
            data-reveal
            className="relative flex min-h-80 overflow-hidden border-t-[3px] border-rule bg-sky-50 text-navy-800"
          >
            <div className="relative z-10 flex flex-col justify-center gap-5 p-8 md:max-w-[60%]">
              <h2 className="text-h2">{j.readyT}</h2>
              <p className="text-body">{j.readyB}</p>
              <ButtonLink href={apply} variant="secondary" dots className="self-start">
                {j.apply}
              </ButtonLink>
            </div>
            <Image
              src={images.studioPortraitTeal}
              alt=""
              fill
              sizes="(min-width: 1024px) 20vw, 40vw"
              className="!left-auto !w-[40%] object-cover max-md:hidden"
            />
          </div>
        </Reveal>
      </section>
    </>
  );
}
