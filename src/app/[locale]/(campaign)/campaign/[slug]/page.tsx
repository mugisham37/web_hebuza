import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { locales } from "@/shared/i18n/config";
import { formatDate, formatMoney } from "@/shared/format";
import { FACES } from "@/content/families";
import { CONTACT, waLink } from "@/content/marketing";
import { CAMPAIGNS, getLd, PROVISIONAL } from "@/content/pages/ld";
import { getCampaign } from "@/lib/marketing/cms/read";
import { Tag } from "@/components/atoms/tag";
import { Icon, type IconName } from "@/components/atoms/icon";
import { ButtonLink } from "@/components/atoms/button";
import { Faces, GridLines, HighlightWord } from "@/components/atoms/brand";
import { HeroIntro, Reveal } from "@/components/atoms/motion";
import { LeadForm } from "@/components/organisms/site/lead-form";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    CAMPAIGNS.map((c) => ({ locale, slug: c.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getI18n(params);
  const c = await getCampaign(slug);
  if (!c) return {};
  const t = c.t[locale];
  // Paid-traffic pages stay out of search unless the campaign opts in.
  return pageMeta(locale, `/campaign/${slug}`, {
    title: `${t.l1} ${t.hl}`,
    description: t.sub,
    robots: { index: !c.noindex, follow: !c.noindex } });
}

const TRUST: IconName[] = ["shield", "mapPin", "lock"];
const GET: IconName[] = ["fileCheck", "card", "chart"];
const HOW: IconName[] = ["laptop", "wallet", "check"];

// /campaign/[slug] (F-CRM-04) — photos/To_build/landing/19-campaign-landing__v1.
export default async function CampaignPage({ params }: Props) {
  const { slug } = await params;
  const { locale } = await getI18n(params);
  const cp = await getCampaign(slug);
  if (!cp) notFound();
  const t = cp.t[locale];
  const c = getLd(locale).campaign;
  const price = `${formatMoney(cp.price, "RWF", locale)} (${PROVISIONAL[locale]})`;
  const wa = waLink(`Muraho HEBUZA — ${t.l1} ${t.hl}`);

  return (
    <div className="pb-24 md:pb-0">
      <section className="relative overflow-hidden px-gutter pt-10 pb-10 md:pt-16">
        <GridLines />
        <div className="container-page relative grid items-start gap-10 lg:grid-cols-[1.3fr_1fr]">
          <HeroIntro>
            <span data-hero="eyebrow" className="flex flex-wrap gap-2">
              <Tag variant="navy">{t.badge}</Tag>
              {cp.endsOn && (
                <Tag variant="neutral">
                  {c.until.replace("{d}", formatDate(cp.endsOn, locale))}
                </Tag>
              )}
            </span>
            <h1 className="mt-6 text-display">
              <span data-hero="line" className="block">
                {t.l1}
              </span>
              <span data-hero="line" className="block">
                <HighlightWord>{t.hl}</HighlightWord>{" "}
                <Faces
                  srcs={FACES.slice(0, 3)}
                  inline
                  size={52}
                  className="inline-flex align-middle max-sm:hidden"
                />
              </span>
            </h1>
            <p
              data-hero="copy"
              className="mt-6 max-w-xl text-lead text-fg-muted"
            >
              {t.sub}
            </p>
            <p
              data-hero="copy"
              className="mt-8 font-display text-[clamp(2.5rem,2rem+2vw,3.5rem)] leading-none tracking-[-0.03em]"
            >
              {price}
            </p>
            <p data-hero="copy" className="mt-2 text-small text-fg-subtle">
              {t.priceNote}
            </p>
          </HeroIntro>
          <div
            id="form"
            className="scroll-mt-24 border-2 border-navy-700 bg-surface p-6 shadow-md md:p-8"
          >
            <LeadForm
              campaign={cp.slug}
              channels={cp.form?.consent}
              service={cp.service}
              copy={c}
              whatsapp={wa}
              cta={t.cta}
            />
          </div>
        </div>
      </section>

      <Reveal className="container-page px-gutter pb-10">
        <ul
          data-reveal
          className="grid gap-3 border border-border bg-white p-4 sm:grid-cols-3"
        >
          {c.trust.map((x, i) => (
            <li
              key={x}
              className="flex items-center justify-center gap-3 text-label"
            >
              <Icon name={TRUST[i]} size={20} />
              {x}
            </li>
          ))}
        </ul>
      </Reveal>

      <section className="px-gutter pb-10">
        <Reveal className="container-page grid gap-8 bg-sky-50 p-5 md:p-8">
          <div>
            <h2 data-reveal className="text-h2">
              {c.getT}
            </h2>
            <ol className="mt-5 grid gap-3 md:grid-cols-3">
              {t.get.map((x, i) => (
                <li
                  key={x}
                  data-reveal
                  className="flex items-center gap-4 bg-white p-5 text-label-lg"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-700 text-small text-white">
                    {i + 1}
                  </span>
                  <span className="flex-1">{x}</span>
                  <Icon name={GET[i]} size={28} className="text-navy-700" />
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 data-reveal className="text-h2">
              {c.howT}
            </h2>
            <ol className="mt-5 grid gap-3 md:grid-cols-3">
              {t.how.map((x, i) => (
                <li
                  key={x}
                  data-reveal
                  className="flex items-center gap-4 bg-white p-5 text-label-lg"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-700 text-small text-white">
                    {i + 1}
                  </span>
                  <span className="flex-1">{x}</span>
                  <Icon name={HOW[i]} size={28} className="text-navy-700" />
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </section>

      <section className="px-gutter pb-10">
        <div className="container-page">
          <h2 className="text-h2">{c.faqT}</h2>
          <div className="mt-5 divide-y divide-border border border-border bg-white">
            {t.faq.map((f) => (
              <details key={f.q} className="group px-5">
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
      </section>

      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 border-t-[3px] border-rule bg-sky-50 p-7 md:p-10">
          <h2 className="text-h2">{t.readyT}</h2>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="#form" variant="primary" dots>
              {t.cta}
            </ButtonLink>
            <a
              href={CONTACT.phoneHref}
              className="inline-flex h-11 items-center gap-2 border border-border-strong bg-white px-5 text-button text-ink-900 hover:bg-ink-50"
            >
              <Icon name="phone" size={16} />
              {CONTACT.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Phone sticky bar; right padding leaves room for the layout's floating WhatsApp button. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 theme-dark bg-bg py-3 pr-24 pl-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-fg md:hidden">
        <p className="flex-1 text-label-lg">{price}</p>
        <a
          href="#form"
          aria-label={t.cta}
          className="flex size-11 items-center justify-center bg-primary text-on-gold"
        >
          <Icon name="arrowRight" size={20} />
        </a>
        <a
          href={CONTACT.phoneHref}
          aria-label={`${c.call} ${CONTACT.phone}`}
          className="flex size-11 items-center justify-center bg-white text-navy-900"
        >
          <Icon name="phone" size={18} />
        </a>
      </div>
    </div>
  );
}
