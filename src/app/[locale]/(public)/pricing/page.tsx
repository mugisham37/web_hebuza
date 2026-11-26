import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";
import {
  getFamilies,
  getPlans,
  getServices,
  type PlanVM,
} from "@/lib/catalogue";
import { cx, formatMoney } from "@/shared/format";
import { waLink } from "@/content/marketing";
import { FACES } from "@/content/families";
import { fill, getLB, LB_FLAGS, planMatrix } from "@/content/pages/lb";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { Icon, WhatsAppGlyph } from "@/components/atoms/icon";
import { Faces, HighlightWord, Star, ZigzagBand } from "@/components/atoms/brand";
import { Reveal } from "@/components/atoms/motion";
import { FeeTable, type FeeRow } from "@/components/organisms/site/pricing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const p = getLB(locale).pricing;
  return pageMeta(locale, `/pricing`, {
    title: p.tag,
    description: p.meta });
}

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
  const cta = (pl: PlanVM) =>
    /agent|retainer/i.test(`${pl.badge} ${pl.name}`)
      ? { label: p.talk, href: L(`/contact?plan=${pl.id}`) }
      : { label: p.trial, href: L(`/signup?plan=${pl.id}`) };

  return (
    <>
      <section
        id="plans"
        className="scroll-mt-24 px-gutter pt-[var(--spacing-hero-top)] pb-12"
      >
        <Reveal className="container-page">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_26rem]">
            <div>
              {/* The page covers both monthly plans and pay-per-service fees, so the title is about pricing as a whole. */}
              <span data-reveal><Tag variant="navy" className="uppercase">{p.tag}</Tag></span>
              <h1 data-reveal className="mt-5 text-[clamp(2.5rem,1.6rem+3.6vw,4.5rem)] leading-[1.02] tracking-[-0.05em]">{p.l1} <HighlightWord>{p.hl}</HighlightWord></h1>
              <p data-reveal className="mt-5 max-w-xl text-lead text-fg-muted">{p.sub}</p>
            </div>
            {/* Same adviser card as /services. */}
            <div data-reveal className="theme-dark bg-navy-700 p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-label"><Star className="size-5 text-primary" />{p.unsureTitle}</p>
                  <p className="mt-1 text-small text-white/75">{p.unsureBody}</p>
                </div>
                <Faces srcs={FACES.slice(0, 3)} size={32} className="shrink-0 [&_[data-round]]:ring-navy-700" />
              </div>
              <div className="mt-5 grid gap-2">
                <ButtonLink href={L("/book")} variant="primary" dots className="w-full justify-center">{p.consult}</ButtonLink>
                <a href={waLink("Muraho HEBUZA")} target="_blank" rel="noopener" className="inline-flex h-11 w-full items-center justify-center gap-2 border border-white/40 text-button text-white hover:bg-white/10"><WhatsAppGlyph size={18} />{p.whatsapp}</a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
      <ZigzagBand from="var(--color-white)" to="var(--color-sky-100)" />
      {/* Plan cards on the same light blue as "Our services" on home. */}
      <section className="bg-sky-100 px-gutter py-[var(--spacing-section-sm)]">
        <Reveal className="container-page">
          <h2 data-reveal className="text-h2">{p.plansTitle}</h2>
          <p data-reveal className="mt-2 mb-12 text-lead text-fg-muted">{p.plansSub}</p>
          {plans.length === 0 ? (
            <div
              data-reveal
              role="status"
              className="flex flex-wrap items-center justify-between gap-4 border border-dashed border-border-strong bg-white p-6"
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
            // Every card shares the same 4 rows (name · price · button · features), so they line up across the grid.
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
              {plans.map((pl) => {
                const pop = isPopular(pl);
                const pr = price(pl);
                const c = cta(pl);
                return (
                  <li
                    key={pl.id}
                    data-reveal
                    className={cx(
                      "relative row-span-4 grid grid-rows-subgrid gap-5 p-6 lg:p-7",
                      pop ? "theme-dark bg-navy-700 text-white shadow-lg" : "border border-border bg-white text-fg",
                    )}
                  >
                    {pop && (
                      <span className="absolute -top-3 left-6">
                        <Tag variant="new" className="h-7 text-eyebrow">{p.popular}</Tag>
                      </span>
                    )}
                    <div>
                      <h2 className="text-h3">{pl.name}</h2>
                      <p className={cx("mt-1.5 text-small", pop ? "text-white/75" : "text-fg-muted")}>{pl.description}</p>
                    </div>
                    <div className={cx("border-t pt-5", pop ? "border-white/20" : "border-border")}>
                      {pr ? (
                        <p className="flex flex-wrap items-baseline gap-x-1.5"><span className="tabular text-h3">{pr}</span><span className={cx("text-small whitespace-nowrap", pop ? "text-white/75" : "text-fg-muted")}>{p.perMonth}</span></p>
                      ) : (
                        <p className="text-label-lg">{p.setBy}</p>
                      )}
                      <p className={cx("mt-1 text-small", pop ? "text-white/75" : "text-fg-muted")}>{pl.maxApps ? fill(p.upTo, { n: pl.maxApps }) : p.unlimited}</p>
                    </div>
                    <ButtonLink href={c.href} variant={pop ? "primary" : "secondary"} dots className="h-12 justify-center self-start w-full">
                      {c.label}
                      <span className="sr-only">: {pl.name}</span>
                    </ButtonLink>
                    <ul className="grid content-start gap-2.5 text-small">
                      {(pl.features.length ? pl.features : p.rows.filter((r) => r.key !== "apps" && planMatrix(pl.id)[r.key] === true).map((r) => r.label)).map((f) => (
                        <li key={f} className="flex gap-2.5"><Tick />{f}</li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </Reveal>
      </section>
      <ZigzagBand from="var(--color-sky-100)" to="var(--color-white)" />


      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <div className="container-page">
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
        </div>
      </section>
    </>
  );
}
