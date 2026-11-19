import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";
import {
  getFamilies,
  getPlans,
  getServices,
  type PlanVM,
} from "@/lib/catalogue";
import { images } from "@/lib/assets";
import { cx, formatMoney } from "@/shared/format";
import { waLink } from "@/content/marketing";
import { FACES } from "@/content/families";
import { fill, getLB, LB_FLAGS, planMatrix } from "@/content/pages/lb";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { Icon, WhatsAppGlyph } from "@/components/atoms/icon";
import { Faces, GridLines, HighlightWord } from "@/components/atoms/brand";
import { HeroIntro, Reveal } from "@/components/atoms/motion";
import { FeeTable, PayToggle, type FeeRow } from "@/components/organisms/site/pricing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const p = getLB(locale).pricing;
  return pageMeta(locale, `/pricing`, {
    title: p.tag,
    description: p.meta });
}

const TONES = [
  "border border-border bg-surface text-fg",
  "border border-border bg-bg-subtle text-fg",
  "theme-dark bg-grad-navy-depth text-fg shadow-lg",
  "border border-sky-100 bg-sky-50 text-fg",
];
const isPopular = (pl: PlanVM) => /popular/i.test(pl.badge ?? "");
const Tick = () => (
  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold-400 text-on-gold">
    <Icon name="check" size={12} strokeWidth={3} />
  </span>
);

// /pricing — photos/To_build/landing/07-pricing__v1.
export default async function PricingPage({ params }: Props) {
  const { locale } = await getI18n(params);
  const p = getLB(locale).pricing;
  const L = (x: string) => localHref(locale, x);
  const [plans, services, families] = await Promise.all([
    getPlans(),
    getServices(locale),
    getFamilies(locale),
  ]);
  const famName = new Map(families.map((f) => [f.slug, f.short || f.name]));
  const rows: FeeRow[] = services.map((s) => {
    const std = s.tiers.find((t) => t.key === "standard") ?? s.tiers[0];
    const urg = s.tiers.find((t) => t.key === "urgent");
    return {
      slug: s.slug,
      path: s.slugs[locale],
      name: s.name,
      family: s.family,
      area: famName.get(s.family) ?? s.family,
      standard: std?.fee ?? s.fromFee,
      urgent: urg?.fee ?? null,
      quote: s.priceMode === "quote",
    };
  });
  const price = (pl: PlanVM) =>
    LB_FLAGS.unconfirmedPlanPrices.includes(pl.id) || pl.amount <= 0
      ? null
      : formatMoney(pl.amount, "RWF", locale);
  const apps = (pl: PlanVM) => (pl.maxApps ? String(pl.maxApps) : p.unlimited);
  const cta = (pl: PlanVM) =>
    /agent|retainer/i.test(`${pl.badge} ${pl.name}`)
      ? { label: p.talk, href: L(`/contact?plan=${pl.id}`) }
      : { label: p.trial, href: L(`/signup?plan=${pl.id}`) };
  const cell = (v: boolean | "upgrade" | undefined) =>
    v === true ? (
      <>
        <Tick />
        <span className="sr-only">{p.included}</span>
      </>
    ) : v === "upgrade" ? (
      <span className="text-small font-medium">{p.upgrade}</span>
    ) : (
      <span aria-label={p.notIncluded}>—</span>
    );

  return (
    <>
      <section className="relative overflow-hidden px-gutter pt-[var(--spacing-hero-top)] pb-12">
        <GridLines />
        <HeroIntro className="container-page relative grid items-center gap-10 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <span data-hero="eyebrow">
              <Tag variant="navy" className="uppercase">
                {p.tag}
              </Tag>
            </span>
            <h1 className="mt-5 text-display">
              <span data-hero="line" className="block">
                {p.l1}
              </span>
              <span data-hero="line" className="block">
                <HighlightWord>{p.hl}</HighlightWord>
              </span>
            </h1>
            <p
              data-hero="copy"
              className="mt-6 max-w-md text-lead text-fg-muted"
            >
              {p.sub}
            </p>
          </div>
          <div
            data-hero="visual"
            className="relative grid overflow-hidden theme-dark bg-bg text-fg shadow-lg sm:grid-cols-[1.2fr_1fr]"
          >
            <div className="grid content-center gap-6 p-6 md:p-8">
              <PayToggle copy={p.toggle} />
              <ul className="grid gap-3">
                {p.ticks.map((t) => (
                  <li key={t} className="flex items-center gap-3 text-body">
                    <Tick />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative min-h-56 max-sm:hidden">
              <Image
                src={images.studioPortraitOrange}
                alt={p.photoAlt}
                fill
                priority
                sizes="(min-width: 1024px) 22vw, 40vw"
                className="object-cover"
              />
            </div>
          </div>
        </HeroIntro>
      </section>

      <section
        id="plans"
        className="scroll-mt-24 px-gutter pb-[var(--spacing-section-sm)]"
      >
        <Reveal className="container-page">
          <h2 data-reveal className="text-h2">
            {p.plansTitle}
          </h2>
          <p data-reveal className="mt-2 text-lead text-fg-muted">
            {p.plansSub}
          </p>
          {plans.length === 0 ? (
            <div
              data-reveal
              role="status"
              className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-dashed border-border-strong bg-white p-6"
            >
              <p className="max-w-xl text-body">{p.noPlans}</p>
              <a
                href={waLink("Muraho HEBUZA")}
                target="_blank"
                rel="noopener"
                className="inline-flex h-11 items-center gap-2 bg-secondary px-5 text-button text-on-secondary hover:bg-secondary-hover"
              >
                <WhatsAppGlyph size={18} />
                {p.whatsapp}
              </a>
            </div>
          ) : (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {plans.map((pl, i) => {
                const dark = isPopular(pl)
                  ? true
                  : TONES[i % 4].includes("theme-dark");
                const tone = isPopular(pl)
                  ? TONES[2]
                  : TONES[i % 4] === TONES[2]
                    ? TONES[1]
                    : TONES[i % 4];
                const pr = price(pl);
                const c = cta(pl);
                return (
                  <li
                    key={pl.id}
                    data-reveal
                    className={cx(
                      "relative flex flex-col gap-5 p-6",
                      tone,
                    )}
                  >
                    {isPopular(pl) && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Tag variant="new" className="h-7 text-eyebrow">
                          {p.popular}
                        </Tag>
                      </span>
                    )}
                    <div>
                      {pl.badge && !isPopular(pl) && (
                        <Tag
                          variant={dark ? "outline-dark" : "navy"}
                          className="mb-3 h-7 text-eyebrow"
                        >
                          {pl.badge}
                        </Tag>
                      )}
                      <h3 className="text-h3">{pl.name}</h3>
                      <p
                        className={cx(
                          "mt-1 text-small",
                          "text-fg-muted",
                        )}
                      >
                        {pl.description}
                      </p>
                    </div>
                    <div>
                      <p className="tabular text-h3">{pr ?? "RWF —"}</p>
                      <p
                        className={cx(
                          "text-small",
                          "text-fg-muted",
                        )}
                      >
                        {pr ? p.perMonth : p.setBy}
                      </p>
                      <p className="mt-2 text-small font-medium">
                        {pl.maxApps
                          ? fill(p.upTo, { n: pl.maxApps })
                          : p.unlimited}
                      </p>
                    </div>
                    {pl.features.length > 0 && (
                      <ul className="grid gap-2 text-small">
                        {pl.features.map((f) => (
                          <li key={f} className="flex gap-2">
                            <Tick />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-auto grid gap-2 pt-2">
                      <ButtonLink
                        href={c.href}
                        variant={dark ? "primary" : "secondary"}
                        dots
                        className="justify-center"
                      >
                        {c.label}
                        <span className="sr-only">: {pl.name}</span>
                      </ButtonLink>
                      {pl.maxApps === 1 && (
                        <a
                          href={L(`/contact?plan=${pl.id}`)}
                          className="text-center text-small text-link underline hover:text-link-hover"
                        >
                          {p.negotiate} ↗
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Reveal>
      </section>

      {plans.length > 0 && (
        <section
          aria-labelledby="compare"
          className="px-gutter pb-[var(--spacing-section-sm)]"
        >
          <div className="container-page">
            <h2 id="compare" className="text-h2">
              {p.compareTitle}
            </h2>
            {/* Desktop/tablet: one table with a sticky header. */}
            <div
              className="mt-6 max-h-[40rem] overflow-auto border border-border bg-white max-md:hidden"
              tabIndex={0}
              role="region"
              aria-labelledby="compare"
            >
              <table className="w-full text-small">
                <thead className="sticky top-0 z-10 bg-ink-100 text-label text-ink-700">
                  <tr>
                    <th scope="col" className="px-5 py-4 text-left">
                      {p.feature}
                    </th>
                    {plans.map((pl) => (
                      <th
                        key={pl.id}
                        scope="col"
                        className={cx(
                          "px-4 py-4 text-center",
                          isPopular(pl) && "bg-gold-100",
                        )}
                      >
                        {pl.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {p.rows.map((r) => (
                    <tr key={r.key}>
                      <th
                        scope="row"
                        className="px-5 py-3 text-left font-normal"
                      >
                        {r.label}
                      </th>
                      {plans.map((pl) => (
                        <td
                          key={pl.id}
                          className={cx(
                            "px-4 py-3 text-center",
                            isPopular(pl) && "bg-gold-50",
                          )}
                        >
                          <span className="inline-flex justify-center">
                            {r.key === "apps"
                              ? apps(pl)
                              : cell(planMatrix(pl.id)[r.key])}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td />
                    {plans.map((pl) => (
                      <td
                        key={pl.id}
                        className={cx(
                          "px-4 py-4 text-center",
                          isPopular(pl) && "bg-gold-50",
                        )}
                      >
                        <ButtonLink href={cta(pl).href} size="sm" dots>
                          {p.choose}
                          <span className="sr-only">: {pl.name}</span>
                        </ButtonLink>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Phones: one accordion per plan. */}
            <div className="mt-6 grid gap-3 md:hidden">
              {plans.map((pl, i) => (
                <details
                  key={pl.id}
                  open={i === 0}
                  className="group border border-border bg-white"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-label-lg [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      {pl.name}
                      {isPopular(pl) && (
                        <Tag variant="navy" className="h-6 text-eyebrow">
                          {p.popular}
                        </Tag>
                      )}
                    </span>
                    <Icon
                      name="chevronDown"
                      size={20}
                      className="transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <dl className="divide-y divide-border px-5 pb-4 text-small">
                    {p.rows.map((r) => (
                      <div
                        key={r.key}
                        className="flex items-center justify-between gap-4 py-2.5"
                      >
                        <dt>{r.label}</dt>
                        <dd className="flex">
                          {r.key === "apps"
                            ? apps(pl)
                            : cell(planMatrix(pl.id)[r.key])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="px-5 pb-5">
                    <ButtonLink
                      href={cta(pl).href}
                      dots
                      className="w-full justify-center"
                    >
                      {p.choose}
                      <span className="sr-only">: {pl.name}</span>
                    </ButtonLink>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <div className="container-page grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div id="fees" className="min-w-0 scroll-mt-24">
            <h2 className="text-h2">{p.feesTitle}</h2>
            <p className="mt-2 mb-6 text-body text-fg-muted">{p.feesSub}</p>
            <FeeTable
              rows={rows}
              areas={families.map((f) => ({
                slug: f.slug,
                name: f.short || f.name,
              }))}
              copy={p}
            />
          </div>
          <div className="grid content-start gap-6">
            <div>
              <h2 className="text-h2">{p.faqTitle}</h2>
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    mainEntity: p.faq.map((f) => ({
                      "@type": "Question",
                      name: f.q,
                      acceptedAnswer: { "@type": "Answer", text: f.a },
                    })),
                  }),
                }}
              />
              <div className="mt-6 divide-y divide-border border border-border bg-white">
                {p.faq.map((f, i) => (
                  <details key={f.q} open={i === 0} className="group px-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-label [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-3">
                        <Icon
                          name="check"
                          size={16}
                          className="shrink-0 text-navy-700"
                        />
                        {f.q}
                      </span>
                      <Icon
                        name="plus"
                        size={16}
                        className="shrink-0 transition-transform group-open:rotate-45"
                      />
                    </summary>
                    <p className="pb-4 pl-7 text-small text-fg-muted">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
            <div className="grid gap-5 border-t-[3px] border-rule bg-sky-50 p-7 text-navy-800">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-h3">{p.unsureTitle}</h2>
                <Faces
                  srcs={FACES.slice(0, 3)}
                  size={40}
                  className="max-sm:hidden"
                />
              </div>
              <p className="text-body">{p.unsureBody}</p>
              <div className="flex flex-wrap gap-2.5">
                <ButtonLink href={L("/book")} dots>
                  {p.consult}
                </ButtonLink>
                <a
                  href={waLink("Muraho HEBUZA")}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex h-11 items-center gap-2.5 border border-border bg-white px-5 text-button text-ink-900 hover:bg-ink-50"
                >
                  <WhatsAppGlyph size={18} />
                  {p.whatsapp}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
