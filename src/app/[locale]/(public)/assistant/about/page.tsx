import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { localHref } from "@/shared/i18n/config";
import { bkgCopy } from "@/lib/booking/copy";
import { ButtonLink } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { BookShell } from "../../book/_hero";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  const c = bkgCopy(locale).about;
  return pageMeta(locale, "/assistant/about", { title: c.title, description: c.lead });
}

// /assistant/about (F-AIA-15 documented limitations, F-AIA-09/11 data use). Public documentation, indexable.
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await getI18n(params);
  const c = bkgCopy(locale).about;
  return (
    <BookShell title={c.title} lead={c.lead}>
      <div className="grid gap-5 lg:grid-cols-2">
        <Block title={c.can}><List items={c.canItems} ok /></Block>
        <Block title={c.cant}><List items={c.cantItems} ok={false} /></Block>
        <Block title={c.sources}><p className="text-body text-fg-muted">{c.sourcesBody}</p></Block>
        <Block title={c.data}><p className="text-body text-fg-muted">{c.dataBody}</p></Block>
        <Block title={c.human}><p className="text-body text-fg-muted">{c.humanBody}</p></Block>
      </div>
      <ButtonLink href={localHref(locale, "/assistant")} dots className="w-fit">{c.open}</ButtonLink>
    </BookShell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="grid gap-4 border border-border bg-white p-6 sm:p-8 m-rise"><h2 className="text-h4">{title}</h2>{children}</section>;
}

function List({ items, ok }: { items: string[]; ok: boolean }) {
  return (
    <ul className="grid gap-2 m-stagger">{items.map((i) => (
      <li key={i} className="flex gap-3 text-body"><span aria-hidden className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full ${ok ? "bg-success-bg text-success" : "bg-ink-100 text-fg-muted"}`}><Icon name={ok ? "check" : "x"} size={12} /></span>{i}</li>
    ))}</ul>
  );
}
