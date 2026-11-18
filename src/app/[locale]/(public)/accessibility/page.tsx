import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { formatDate } from "@/shared/format";
import { A11Y } from "@/content/pages/accessibility";
import { CONTACT, waLink } from "@/content/marketing";
import { MKT_POLICY } from "@/shared/policy";
import { HighlightWord } from "@/components/atoms/brand";
import { Tag } from "@/components/atoms/tag";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return pageMeta(locale, `/accessibility`, { title: A11Y[locale].title, description: A11Y[locale].intro });
}

// /accessibility — statement required by spec/06 accessibility §2 (known limitations + contact).
export default async function AccessibilityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await getI18n(params);
  const c = A11Y[locale];
  const [first, ...rest] = c.title.split(" ");
  const list = (items: string[]) => <ul className="mt-4 grid list-disc gap-2 pl-5 text-body text-fg-muted marker:text-navy-700">{items.map((t) => <li key={t}>{t}</li>)}</ul>;
  return (
    <section className="px-gutter pt-[var(--spacing-hero-top)] pb-[var(--spacing-section)]">
      <div className="container-page max-w-3xl">
        <Tag variant="navy">{c.eyebrow}</Tag>
        <h1 className="mt-5 text-display break-words">{first} <HighlightWord>{rest.join(" ")}</HighlightWord></h1>
        <p className="mt-6 text-body">{c.intro}</p>
        <div className="mt-12 grid gap-10">
          <section aria-labelledby="a11y-do"><h2 id="a11y-do" className="text-h3">{c.doTitle}</h2>{list(c.do)}</section>
          <section aria-labelledby="a11y-limits"><h2 id="a11y-limits" className="text-h3">{c.limitsTitle}</h2>{list(c.limits)}</section>
          <section aria-labelledby="a11y-test"><h2 id="a11y-test" className="text-h3">{c.testTitle}</h2><p className="mt-4 text-body text-fg-muted">{c.test}</p></section>
          <section aria-labelledby="a11y-contact" className="border-l-[3px] border-rule bg-info-bg p-6">
            <h2 id="a11y-contact" className="text-card-title">{c.contactTitle}</h2>
            <p className="mt-2">{c.contact.replace("{days}", String(MKT_POLICY.a11yResponseDays))}</p>
            <dl className="mt-4 grid gap-2 text-small sm:grid-cols-[auto_1fr] sm:gap-x-6">
              <dt className="font-medium">{c.email}</dt><dd className="break-all"><a href={`mailto:${CONTACT.email}`} className="underline underline-offset-4">{CONTACT.email}</a></dd>
              <dt className="font-medium">{c.phone}</dt><dd><a href={CONTACT.phoneHref} className="underline underline-offset-4">{CONTACT.phone}</a></dd>
              <dt className="font-medium">{c.whatsapp}</dt><dd><a href={waLink(c.contactTitle)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{CONTACT.phone}</a></dd>
            </dl>
          </section>
          <p className="text-small text-fg-muted">{c.updated.replace("{date}", formatDate(MKT_POLICY.a11yReviewed, locale))}</p>
        </div>
      </div>
    </section>
  );
}
