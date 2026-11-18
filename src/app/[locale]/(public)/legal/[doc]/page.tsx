import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";
import { cx } from "@/shared/format";
import { COOKIES, LC, LEGAL_DOCS, legalSections, type LegalDoc } from "@/content/pages/lc";
import { HighlightWord } from "@/components/atoms/brand";
import { Tag } from "@/components/atoms/tag";
import { ButtonLink } from "@/components/atoms/button";
import { CookieSettingsButton } from "@/components/organisms/site/cookie-consent";
import { LegalContents } from "@/components/organisms/site/legal-contents";

export const generateStaticParams = () => LEGAL_DOCS.map((doc) => ({ doc }));

const isDoc = (d: string): d is LegalDoc => (LEGAL_DOCS as string[]).includes(d);

export async function generateMetadata({ params }: { params: Promise<{ locale: string; doc: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const { doc } = await params;
  if (!isDoc(doc)) return {};
  return pageMeta(locale, `/legal/${doc}`, { title: LC[locale].legal.titles[doc] });
}

// /legal/{terms,privacy,cookies,disclaimers} — 12-legal v2 layout (rail + tabs + version) with v1 highlighted title.
export default async function LegalPage({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { locale } = await getI18n(params);
  const { doc } = await params;
  if (!isDoc(doc)) notFound();
  const c = LC[locale].legal;
  const sections = legalSections(doc, locale);
  const [first, ...rest] = c.titles[doc].split(" ");
  return (
    <section className="px-gutter pt-[var(--spacing-hero-top)] pb-[var(--spacing-section)]">
      <div className="container-page">
        <Tag variant="navy">{c.eyebrow}</Tag>
        <h1 className="mt-5 text-display">{rest.length ? <>{first} <HighlightWord>{rest.join(" ")}</HighlightWord></> : <HighlightWord>{first}</HighlightWord>}</h1>
        <p className="mt-4 text-small text-fg-muted">{c.version}</p>
        <p role="note" className="mt-4 border border-warning bg-warning-bg px-4 py-3 text-small font-medium">{c.review}</p>

        <nav aria-label={c.eyebrow} className="-mx-gutter mt-8 overflow-x-auto px-gutter">
          <ul className="flex w-max gap-2 border-b border-border pb-3">
            {LEGAL_DOCS.map((d) => (
              <li key={d}>
                <Link href={localHref(locale, `/legal/${d}`)} aria-current={d === doc ? "page" : undefined}
                className={cx("inline-flex h-10 items-center px-4 text-small font-medium", d === doc ? "bg-secondary text-on-secondary" : "text-fg hover:bg-navy-50")}>{c.tabs[d]}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 grid gap-10 pb-16 lg:grid-cols-[16rem_minmax(0,44rem)] lg:pb-0">
          <LegalContents items={sections.map(({ id, title }) => ({ id, title }))} label={c.contents} />
          <article className="grid gap-10">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28">
                <h2 id={`${s.id}-h`} className="text-h3"><span className="mr-3 text-navy-600 tabular-nums">{String(i + 1).padStart(2, "0")}</span>{s.title}</h2>
                <p className="mt-3 text-body text-fg-muted">{s.body}</p>
                {doc === "cookies" && i === 1 && (
                  <div tabIndex={0} role="region" aria-label="Cookies" className="mt-5 overflow-x-auto border border-border">
                    <table className="w-full min-w-[32rem] text-left text-small">
                      <thead className="bg-ink-100 text-ink-700"><tr>{c.cookieCols.map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
                      <tbody>{COOKIES.map((k) => <tr key={k.name} className="border-t border-border"><td className="px-4 py-3 font-mono">{k.name}</td><td className="px-4 py-3">{k.purpose}</td><td className="px-4 py-3">{k.category}</td><td className="px-4 py-3">{k.lasts}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
                {doc === "cookies" && i === 2 && (
                  <span className="mt-4 inline-flex h-11 items-center bg-secondary px-5 text-on-secondary hover:bg-secondary-hover"><CookieSettingsButton>{c.cookieSettings}</CookieSettingsButton></span>
                )}
              </section>
            ))}
            {doc === "privacy" && (
              <aside className="border-l-[3px] border-rule bg-info-bg p-6">
                <h2 className="text-card-title">{c.rightsTitle}</h2>
                <p className="mt-2">{c.rightsBody}</p>
                <ButtonLink href={localHref(locale, "/settings/privacy")} className="mt-4" dots>{c.rightsCta}</ButtonLink>
              </aside>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
