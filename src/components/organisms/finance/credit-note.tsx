"use client";
// U12 Credit note record (board 09 RF4): header, lines, totals, outcome, links to invoice + refund, print/PDF, history.
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { formatDateTime } from "@/shared/format";
import { localHref } from "@/shared/i18n/config";
import { useCreditNote } from "@/lib/finance/d";
import { Amount, DocNumber, EbmBadge, FinStatus } from "@/components/atoms/finance";
import { HistoryTab, NoAccess, TotalsPanel } from "@/components/molecules/finance/finance";
import { EmptyPanel, Panel, PanelError } from "@/components/molecules/ops/ops";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { fill, isForbidden, isNotFound, useRF } from "@/components/molecules/finance/refunds";

export function CreditNoteView({ no }: { no: string }) {
  const c = useRF();
  const { locale } = useI18n();
  const q = useCreditNote(no);
  const L = (s: string) => localHref(locale, s);
  const back = <Link href={`${L("/finance/refunds")}?tab=credit_notes`} className="mb-2 inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg print:hidden"><Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{c.cn.back}</Link>;

  if (q.isPending) return <div className="grid gap-4">{back}<div className="h-10 w-64 m-shimmer" /><SkeletonRows n={4} /></div>;
  if (q.isError) {
    if (isForbidden(q.error)) return <NoAccess />;
    if (isNotFound(q.error)) return <div className="grid gap-4">{back}<EmptyPanel title={c.cn.notFound[0]} body={c.cn.notFound[1]} /></div>;
    return <div className="grid gap-4">{back}<PanelError what={c.cn.loadWhat} onRetry={() => q.refetch()} /></div>;
  }
  const n = q.data;
  const label = (x: string | Partial<Record<string, string>>) => (typeof x === "string" ? x : x[locale] ?? x.en ?? "");
  return (
    <div className="grid gap-6">
      <PageHead back={back}
        title={<span className="flex flex-wrap items-center gap-3"><DocNumber no={n.no} className="text-h3" /><EbmBadge no={n.ebmRef} /></span>}
        sub={fill(c.cn.issued, { who: n.issuedBy.name, when: formatDateTime(n.issuedAt, locale) })}
        actions={<Button variant="outline" onClick={() => window.print()} className="m-press print:hidden"><Icon name="file" size={16} aria-hidden />{c.cn.print}</Button>} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] m-stagger">
        <div className="grid min-w-0 gap-6">
          <Panel title={c.cn.lines} padded={false}>
            <div role="region" aria-label={c.cn.lines} tabIndex={0} className="overflow-x-auto px-4 pb-4 sm:px-5">
              <table className="w-full min-w-[28rem] text-small">
                <thead><tr className="border-b border-border text-eyebrow text-fg-subtle"><th className="py-2 text-left font-normal">{c.cn.lines}</th><th className="py-2 text-right font-normal">{c.cn.amount}</th></tr></thead>
                <tbody>{n.lines.map((l, i) => <tr key={i} className="border-b border-border last:border-0"><td className="py-2.5">{label(l.label)}</td><td className="py-2.5 text-right"><Amount value={l.unit} size="sm" /></td></tr>)}</tbody>
              </table>
            </div>
          </Panel>
          <Panel title={c.history} className="print:hidden"><HistoryTab resourceType="credit_note" resourceId={n.no} /></Panel>
        </div>
        <aside className="grid gap-4">
          <TotalsPanel totals={n.totals} />
          <Panel>
            <dl className="grid gap-3 text-small">
              <div><dt className="text-eyebrow text-fg-subtle">{c.cn.client}</dt><dd className="font-medium">{n.clientName}</dd></div>
              <div><dt className="text-eyebrow text-fg-subtle">{c.cn.invoice}</dt><dd className="flex items-center gap-2"><DocNumber no={n.invoiceNo} href={L(`/finance/invoices/${n.invoiceNo}`)} /><Amount value={n.invoiceTotal} size="sm" className="text-fg-muted" /></dd></div>
              {n.refund && <div><dt className="text-eyebrow text-fg-subtle">{c.cn.refund}</dt><dd className="flex items-center gap-2"><DocNumber no={n.refund.no} href={L(`/finance/refunds/${n.refund.no}`)} /><FinStatus status={n.refund.status} kind="refund" /></dd></div>}
            </dl>
            <p className="mt-4 flex items-center gap-2 bg-bg-tint px-3 py-2 text-small text-navy-800"><Icon name="layers" size={14} aria-hidden />{c.cn.outcome[n.outcome]}</p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
