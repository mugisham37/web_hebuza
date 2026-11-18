import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";
import { images } from "@/lib/assets";
import { cx } from "@/shared/format";
import { FACES } from "@/content/families";
import { getLB, LB_FLAGS, TEAM } from "@/content/pages/lb";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Faces, GridLines, HighlightWord } from "@/components/atoms/brand";
import { HeroIntro, Reveal } from "@/components/atoms/motion";
import { PhotoFrame } from "@/components/molecules/site/site";
import { DIRECTIONS_URL, MapArt, TeamGrid } from "@/components/molecules/site/site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const a = getLB(locale).about;
  return pageMeta(locale, `/about`, {
    title: a.tag,
    description: a.meta });
}

const VALUE_ICON: IconName[] = ["users", "shield", "sparkle", "layers"];
const CRED_ICON: IconName[] = ["building", "lock", "fileCheck"];
const CRED_TONE = [
  "bg-navy-700 text-white",
  "border border-border bg-white text-ink-900",
  "bg-gold-200 text-ink-900",
];

// /about — 08-about v1 (hero, credentials, office) + v3 (principles) + v2 (team) + v4 ("Work with us").
export default async function AboutPage({ params }: Props) {
  const { locale } = await getI18n(params);
  const a = getLB(locale).about;
  const L = (x: string) => localHref(locale, x);
  const hasTeam = TEAM.some((m) => m.consented);
  return (
    <>
      <section className="relative overflow-hidden px-gutter pt-[var(--spacing-hero-top)] pb-[var(--spacing-section-sm)]">
        <GridLines />
        <HeroIntro className="container-page relative grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <span data-hero="eyebrow">
              <Tag variant="navy">{a.tag}</Tag>
            </span>
            <h1 className="mt-5 text-display">
              <span data-hero="line" className="block">
                {a.l1}
              </span>
              <span data-hero="line" className="block">
                {a.l2}
              </span>
              <span data-hero="line" className="block">
                <HighlightWord>{a.hl}</HighlightWord>
                {a.l3 && <> {a.l3}</>}
              </span>
            </h1>
            <div
              data-hero="copy"
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Faces srcs={FACES} size={40} />
              <p className="max-w-md text-lead text-fg-muted">{a.sub}</p>
            </div>
          </div>
          <div data-hero="visual" className="px-4 pb-8">
            <PhotoFrame
              src={images.workAurelHouse}
              alt={a.heroAlt}
              rotate={3}
              ratio="aspect-[4/3]"
              badge={a.badge}
              priority
              sizes="(min-width: 1024px) 45vw, 90vw"
            />
          </div>
        </HeroIntro>
      </section>

      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <Reveal className="container-page grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div data-reveal className="grid content-start gap-4">
            <Tag variant="navy" className="w-fit">
              {a.missionTag}
            </Tag>
            <h2 className="text-h2">{a.mission}</h2>
            <p className="max-w-md text-body text-fg-muted">{a.missionBody}</p>
          </div>
          <div>
            <Tag variant="navy" className="mb-4">
              {a.valuesTag}
            </Tag>
            <ul className="grid gap-3 sm:grid-cols-2">
              {a.values.map((v, i) => (
                <li
                  key={v.t}
                  data-reveal
                  className={cx(
                    "grid gap-3 p-5",
                    i === 1
                      ? "bg-navy-700 text-white"
                      : "border border-border bg-white",
                  )}
                >
                  <span
                    className={cx(
                      "flex size-12 items-center justify-center rounded-full",
                      i === 1
                        ? "bg-gold-400 text-on-gold"
                        : "bg-navy-50 text-navy-700",
                    )}
                  >
                    <Icon name={VALUE_ICON[i]} size={22} />
                  </span>
                  <h3 className="text-card-title">{v.t}</h3>
                  <p
                    className={cx(
                      "text-small",
                      i === 1 ? "text-navy-100" : "text-fg-muted",
                    )}
                  >
                    {v.b}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {hasTeam && (
        <section className="px-gutter pb-[var(--spacing-section-sm)]">
          <div className="container-page">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <Tag variant="navy">{a.teamTag}</Tag>
                <h2 className="mt-3 text-h2">{a.teamTitle}</h2>
                <p className="mt-2 text-body text-fg-muted">{a.teamSub}</p>
              </div>
              <ButtonLink href={L("/about/team")} variant="outline" dots>
                {a.teamAll}
              </ButtonLink>
            </div>
            <TeamGrid locale={locale} />
          </div>
        </section>
      )}

      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <Reveal className="container-page grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="grid content-start gap-4">
            <span data-reveal>
              <Tag variant="navy">{a.credTag}</Tag>
            </span>
            <h2 data-reveal className="text-h2">
              {a.credTitle}
            </h2>
            <p data-reveal className="max-w-md text-body text-fg-muted">
              {a.credBody}
            </p>
            <ul className="mt-2 grid gap-3 sm:grid-cols-3">
              {a.creds.map((c, i) => (
                <li
                  key={c.t}
                  data-reveal
                  className={cx(
                    "grid content-start gap-3  p-5",
                    CRED_TONE[i],
                  )}
                >
                  <Icon name={CRED_ICON[i]} size={24} />
                  <p className="text-label-lg">{c.t}</p>
                  <p className="text-small opacity-75">{c.b}</p>
                </li>
              ))}
            </ul>
            {/* shortcut: client/years stats hidden until HEBUZA confirms them (LB_FLAGS.showStats). */}
          </div>
          <div data-reveal className="grid gap-5 sm:grid-cols-[1.2fr_1fr]">
            <MapArt className="min-h-64" />
            <div className="grid content-center gap-3">
              <Tag variant="navy" className="w-fit">
                {a.officeTag}
              </Tag>
              <h2 className="text-h3">{a.officeTitle}</h2>
              <p className="flex items-center gap-2 text-body">
                <Icon name="mapPin" size={18} />
                {a.city}
              </p>
              {!LB_FLAGS.addressConfirmed && (
                <p className="text-small text-fg-subtle">{a.addressTbc}</p>
              )}
              <p className="text-small text-fg-muted">{a.officeBody}</p>
              <a
                href={DIRECTIONS_URL}
                target="_blank"
                rel="noopener"
                className="inline-flex h-11 w-fit items-center gap-2 bg-secondary px-5 text-button text-on-secondary hover:bg-secondary-hover"
              >
                {a.directions}
                <Icon name="arrowUpRight" size={16} />
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <Reveal
          preset="card-in"
          className="container-page relative grid overflow-hidden theme-dark bg-grad-navy-depth text-fg md:grid-cols-[1.4fr_1fr]"
        >
          <div className="grid content-center justify-items-start gap-4 p-7 md:p-12">
            <h2 className="text-h2">{a.workTitle}</h2>
            <p className="max-w-md text-lead">{a.workBody}</p>
            <ButtonLink href={L("/services")} variant="primary" dots>
              {a.start}
            </ButtonLink>
          </div>
          <div className="relative flex items-end justify-center pt-6 max-md:hidden">
            <span
              aria-hidden
              className="absolute -bottom-24 size-80 bg-gold-400"
            />
            <PhotoFrame
              src={images.studioPortraitOrange}
              alt=""
              rotate={-4}
              className="relative mb-[-1.5rem] w-56"
              ratio="aspect-[3/4]"
              sizes="14rem"
            />
          </div>
        </Reveal>
      </section>
    </>
  );
}
