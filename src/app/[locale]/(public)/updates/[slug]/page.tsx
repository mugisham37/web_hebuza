import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { localHref, locales } from "@/shared/i18n/config";
import { getServices } from "@/lib/catalogue";
import { formatDate } from "@/shared/format";
import { UPDATES, getLd } from "@/content/pages/ld";
import { getUpdate, getUpdates } from "@/lib/marketing/cms/read";
import { FallbackNotice, StaleNotice } from "@/components/molecules/site/fallback-notice";
import { ButtonLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { Icon } from "@/components/atoms/icon";
import { Breadcrumb } from "@/components/organisms/site/sections";
import { DeadlineBlock, HelpPanel } from "@/components/organisms/site/update-parts";
import { ShareBar } from "@/components/molecules/site/library";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) => UPDATES.map((u) => ({ locale, slug: u.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getI18n(params);
  const u = await getUpdate(slug);
  if (!u) return {};
  return pageMeta(locale, `/updates/${slug}`, { title: `${u.inst}: ${u.t[locale].title}`, description: u.t[locale].changed });
}

// /updates/[slug] — lower half of photos/To_build/landing/18-updates__v2.
export default async function UpdatePage({ params }: Props) {
  const { slug } = await params;
  const { locale } = await getI18n(params);
  const u = await getUpdate(slug);
  if (!u) notFound();
  const c = getLd(locale);
  const up = c.updates;
  const t = u.t[locale];
  const L = (p: string) => localHref(locale, p);
  const svc = (await getServices(locale)).find((s) => s.slug === u.service);
  const related = (await getUpdates()).filter((x) => x.slug !== u.slug).slice(0, 3);
  const toc = [["changed", up.changed], ["who", up.who], ["todo", up.todo], ...(u.deadline ? [["deadline", up.deadline]] : [])] as [string, string][];

  return (
    <article className="px-gutter pt-[var(--spacing-hero-top)] pb-[var(--spacing-section-sm)]">
      <div className="container-page">
        <FallbackNotice locale={locale} served={u.fallback?.[locale]} />
        {u.stale && <StaleNotice locale={locale} />}
        <Breadcrumb items={[{ label: up.crumb, href: L("/updates") }, { label: u.inst }]} />
        <header className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-end">
          <div className="grid gap-4">
            <p className="flex gap-2"><Tag variant="navy">{u.inst}</Tag><Tag variant="neutral">{c.example}</Tag></p>
            <h1 className="text-h2 md:text-[clamp(2.5rem,1.6rem+2.4vw,3.75rem)] md:leading-[1.05]">{t.title}</h1>
            <p className="text-small text-fg-subtle">{c.knowledge.by} · {up.published.replace("{d}", formatDate(u.date, locale))}</p>
            <ShareBar title={t.title} copy={c.knowledge} />
          </div>
          <div className="relative aspect-[16/9] overflow-hidden"><Image src={u.img} alt="" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" /></div>
        </header>

        <div className="mt-12 grid gap-8 lg:grid-cols-[13rem_1fr_18rem]">
          <nav aria-label={up.contents} className="lg:sticky lg:top-28 lg:self-start">
            <details open className="group border border-border bg-white p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-label-lg [&::-webkit-details-marker]:hidden">{up.contents}<Icon name="chevronDown" size={18} className="transition-transform group-open:rotate-180 lg:hidden" /></summary>
              <ol className="mt-3 grid gap-2 text-small">{toc.map(([id, label], i) => <li key={id}><a href={`#${id}`} className="text-fg-muted hover:text-link-hover">{i + 1}. {label}</a></li>)}</ol>
            </details>
          </nav>
          <div className="grid max-w-2xl content-start gap-8">
            <section id="changed" className="scroll-mt-28"><h2 className="text-h3">{up.changed}</h2><p className="mt-2 text-body text-fg-muted">{t.changed} {t.body}</p></section>
            <section id="who" className="scroll-mt-28"><h2 className="text-h3">{up.who}</h2><p className="mt-2 text-body text-fg-muted">{t.who}</p></section>
            <section id="todo" className="scroll-mt-28"><h2 className="text-h3">{up.todo}</h2><ol className="mt-2 grid list-decimal gap-1 pl-5 text-body">{t.todo.map((x) => <li key={x}>{x}</li>)}</ol></section>
            {u.deadline && <section id="deadline" className="scroll-mt-28"><DeadlineBlock u={u} c={up} locale={locale} /></section>}
          </div>
          <aside className="grid content-start gap-8">
            <HelpPanel svc={svc} c={up} locale={locale} />
            <section aria-labelledby="rel-u">
              <h2 id="rel-u" className="text-label-lg">{up.relatedT}</h2>
              <ul className="mt-3 grid gap-3">
                {related.map((r) => (
                  <li key={r.slug}><Link href={L(`/updates/${r.slug}`)} className="flex items-center gap-3 p-1 hover:bg-navy-50">
                    <span className="relative size-14 shrink-0 overflow-hidden"><Image src={r.img} alt="" fill sizes="56px" className="object-cover" /></span>
                    <span className="text-small"><span className="block text-eyebrow text-fg-subtle">{r.inst}</span>{r.t[locale].title}</span>
                  </Link></li>
                ))}
              </ul>
            </section>
          </aside>
        </div>

        <section className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t-[3px] border-rule bg-sky-50 p-7 md:p-10">
          <h2 className="text-h2">{up.ctaT}</h2>
          <ButtonLink href={L(svc ? `/services/${svc.slug}` : "/services")} variant="primary" dots>{up.ctaB}</ButtonLink>
        </section>
        <p className="mt-6 text-small text-fg-subtle">{c.exampleNote}</p>
      </div>
    </article>
  );
}
