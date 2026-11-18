import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";
import { getPlans, getServices } from "@/lib/catalogue";
import { images } from "@/lib/assets";
import { cx } from "@/shared/format";
import { CONTACT, waLink } from "@/content/marketing";
import { getLB, LB_FLAGS } from "@/content/pages/lb";
import { Tag } from "@/components/atoms/tag";
import { Icon, WhatsAppGlyph, type IconName } from "@/components/atoms/icon";
import { GridLines, HighlightWord, Star } from "@/components/atoms/brand";
import { HeroIntro, Reveal } from "@/components/atoms/motion";
import { ContactForm, CopyPill } from "@/components/organisms/site/contact";
import { DIRECTIONS_URL, MapArt } from "@/components/molecules/site/site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const c = getLB(locale).contact;
  return pageMeta(locale, `/contact`, {
    title: c.tag,
    description: c.meta });
}

const OTHER_ICON: IconName[] = ["mapPin", "calendar", "message"];
const pill =
  "inline-flex h-8 items-center gap-1.5 border border-navy-100 bg-navy-50 px-3 text-small font-medium text-navy-700 hover:bg-navy-100";

// /contact — 10-contact v2 hero (photo) + v1 channel card, form states, map and "Other ways".
export default async function ContactPage({ params }: Props) {
  const { locale } = await getI18n(params);
  const c = getLB(locale).contact;
  const L = (x: string) => localHref(locale, x);
  const [plans, services] = await Promise.all([
    getPlans(),
    getServices(locale),
  ]);
  const address = LB_FLAGS.addressConfirmed ? "Kigali" : c.addressTbc;
  const rows: {
    icon: IconName;
    label: string;
    value: string;
    action: React.ReactNode;
  }[] = [
    {
      icon: "phone",
      label: c.phone,
      value: CONTACT.phone,
      action: (
        <a href={CONTACT.phoneHref} className={pill}>
          {c.call}
          <Icon name="phone" size={14} />
        </a>
      ),
    },
    {
      icon: "mail",
      label: c.email,
      value: CONTACT.email,
      action: <CopyPill value={CONTACT.email} label={c.copy} done={c.copied} />,
    },
    {
      icon: "mapPin",
      label: c.office,
      value: address,
      action: (
        <a
          href={DIRECTIONS_URL}
          target="_blank"
          rel="noopener"
          className={pill}
        >
          {c.map}
          <Icon name="arrowUpRight" size={14} />
        </a>
      ),
    },
    { icon: "clock", label: c.hours, value: c.hoursValue, action: null },
  ];
  return (
    <>
      <section className="relative overflow-hidden px-gutter pt-[var(--spacing-hero-top)] pb-12">
        <GridLines />
        <HeroIntro className="container-page relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <span data-hero="eyebrow">
              <Tag variant="neutral" className="gap-2">
                <Star className="size-3" />
                {c.tag}
              </Tag>
            </span>
            <h1 data-hero="line" className="mt-5 text-display">
              {c.l1} <HighlightWord>{c.hl}</HighlightWord>
            </h1>
            <p
              data-hero="copy"
              className="mt-6 max-w-lg text-lead text-fg-muted"
            >
              {c.sub}
            </p>
          </div>
          <div
            data-hero="visual"
            className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden border-[6px] border-navy-700 rotate-2 shadow-lg max-lg:hidden"
          >
            <Image
              src={images.studioPortraitTeal}
              alt={c.photoAlt}
              fill
              priority
              sizes="28rem"
              className="object-cover"
            />
          </div>
        </HeroIntro>
      </section>

      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <div className="container-page grid items-start gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="overflow-hidden border-2 border-navy-700 bg-surface">
            <div className="grid gap-4 bg-success p-6 text-white sm:grid-cols-[auto_1fr] md:p-8">
              <WhatsAppGlyph size={64} />
              <div className="grid justify-items-start gap-3">
                <h2 className="text-h3">{c.waTitle}</h2>
                <p className="text-body text-white/85">{c.waBody}</p>
                <a
                  href={waLink("Muraho HEBUZA")}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex h-11 items-center gap-2.5 bg-white px-5 text-button text-ink-900 hover:bg-ink-50"
                >
                  {c.waOpen}
                  <Icon name="arrowUpRight" size={16} />
                </a>
              </div>
            </div>
            <dl className="divide-y divide-border px-6 md:px-8">
              {rows.map((r) => (
                <div
                  key={r.label}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 py-4"
                >
                  <dt className="flex items-center gap-3 text-label">
                    <Icon name={r.icon} size={18} />
                    {r.label}
                  </dt>
                  <dd className="min-w-0 text-body break-words max-sm:col-span-3 max-sm:row-start-2">
                    {r.value}
                  </dd>
                  <dd className="justify-self-end max-sm:col-start-3 max-sm:row-start-1">
                    {r.action}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="border border-border bg-white p-6 md:p-8">
            <h2 className="text-h3">{c.formTitle}</h2>
            <p className="mt-1 mb-6 text-body text-fg-muted">{c.formSub}</p>
            <ContactForm
              copy={c}
              plans={plans.map((p) => ({ id: p.id, name: p.name }))}
              services={services.map((s) => ({ slug: s.slug, name: s.name }))}
            />
          </div>
        </div>
      </section>

      <section className="px-gutter pb-[var(--spacing-section-sm)]">
        <Reveal className="container-page grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <MapArt className="min-h-72">
            <div className="absolute top-5 left-5 right-5 max-w-sm theme-dark bg-bg p-5 text-fg shadow-lg">
              <p className="text-label">
                {c.mapTitle} — {address}
              </p>
              <p className="text-small text-fg-muted">{c.hoursValue}</p>
              <a
                href={DIRECTIONS_URL}
                target="_blank"
                rel="noopener"
                className="mt-3 inline-flex h-9 items-center gap-2 bg-primary px-4 text-small font-medium text-on-gold hover:bg-primary-hover"
              >
                {c.directions}
                <Icon name="arrowUpRight" size={14} />
              </a>
            </div>
          </MapArt>
          <div>
            <h2 data-reveal className="text-h2">
              {c.otherTitle}
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {c.other.map((o, i) => (
                <li key={o.href} data-reveal>
                  <Link
                    href={L(o.href)}
                    className={cx(
                      "group flex h-full min-h-40 flex-col gap-3 p-5",
                      i === 1
                        ? "bg-navy-700 text-white hover:bg-navy-600"
                        : "border border-border bg-white text-fg hover:border-navy-300 hover:shadow-md",
                    )}
                  >
                    <Icon name={OTHER_ICON[i]} size={26} />
                    <span className="text-label-lg">{o.t}</span>
                    <span className="text-small opacity-75">{o.b}</span>
                    <Icon
                      name="arrowRight"
                      size={18}
                      className="mt-auto self-end transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>
    </>
  );
}
