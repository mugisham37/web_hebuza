"use client";
// U7 Invoices list `/finance/invoices?view=&state=&series=&client=&due=&ebm=&overdue=&q=&page=` (board 05 IN1) + U15 renewals view.
// Saved views map to filters; totals row is computed server-side for the whole filter (not the page). Numbers are 5-digit (D6).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { formatDate } from "@/shared/format";
import { useShortcut } from "@/lib/ops/shortcuts";
import { useInvoices, type InvoiceRow } from "@/lib/finance/b";
import { financeInvoices } from "@/content/pages/finance-invoices";
import { fill } from "@/content/pages/finance-common";
import { ButtonLink } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { Select } from "@/components/atoms/field";
import { Pagination } from "@/components/atoms/data-table";
import { FilterBar, SavedViewTabs, EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { Amount, DocNumber, EbmBadge, FinStatus, SeriesTag, useF } from "@/components/atoms/finance";
import { ArtNoOverdue, ArtNothingWaiting } from "@/components/atoms/finance-art";

const VIEWS: Record<string, Record<string, string>> = {
  all: {}, overdue: { overdue: "1" }, missing_ebm: { ebm: "missing" }, renewals: { series: "plan" }, deposits: { series: "deposit" }, drafts: { state: "draft" },
};
const STATES = ["draft", "issued", "partially_paid", "paid", "void", "credited", "paid_by_plan"];
const FILTERS = ["state", "series", "client", "due", "ebm", "overdue", "q"] as const;

export function InvoicesView() {
  const { locale } = useI18n();
  const c = financeInvoices(locale);
  const f = useF();
  const router = useRouter();
  const online = useOnline();
  const p = useUrlParams();
  const view = p.get("view") ?? "all";
  const pg = Number(p.get("page") ?? 1) || 1;
  const own = Object.fromEntries(FILTERS.map((k) => [k, p.get(k)]).filter(([, v]) => v)) as Record<string, string>;
  const qs = new URLSearchParams({ ...VIEWS[view], ...own, page: String(pg) }).toString();
  const q = useInvoices(qs);
  const [focused, setFocused] = useState<string | null>(null);
  const open = (r: InvoiceRow) => router.push(localHref(locale, `/finance/invoices/${r.key}`));
  useShortcut("n i", c.newInvoice, () => router.push(localHref(locale, "/finance/invoices/new")), "list");
  const setF = (k: string, v: string | null) => setUrlParams({ [k]: v, page: null });

  const cols: OpsColumn<InvoiceRow>[] = [
    { key: "no", label: c.cols.no, cell: (r) => <span className="grid gap-1"><DocNumber no={r.no} void={r.status === "void"} />{r.series !== "standard" && <SeriesTag series={r.series} />}</span>, sort: (r) => r.no ?? "~" },
    { key: "client", label: c.cols.client, cell: (r) => <span className="font-medium">{r.clientName}</span>, wrap: true, sort: (r) => r.clientName },
    { key: "case", label: c.cols.case, cell: (r) => <span className="tabular text-fg-muted">{r.caseRef ?? ""}</span>, card: false },
    { key: "issued", label: c.cols.issued, cell: (r) => (r.issuedAt ? <span className="tabular">{formatDate(r.issuedAt, locale)}</span> : ""), sort: (r) => r.issuedAt ?? "", card: false },
    { key: "due", label: c.cols.due, cell: (r) => <span className="grid gap-1"><span className="tabular">{r.dueAt ? formatDate(r.dueAt, locale) : ""}</span>{r.overdue && <FinStatus status="overdue" kind="invoice" />}</span>, sort: (r) => r.dueAt ?? "" },
    { key: "total", label: c.cols.total, align: "right", cell: (r) => <Amount value={r.totals.total} strike={r.status === "void"} />, sort: (r) => r.totals.total },
    { key: "paid", label: c.cols.paid, align: "right", cell: (r) => <Amount value={r.amountPaid} />, card: false },
    { key: "balance", label: c.cols.balance, align: "right", cell: (r) => <Amount value={r.balanceDue} className={r.overdue ? "font-medium text-danger" : undefined} />, sort: (r) => r.balanceDue },
    { key: "ebm", label: c.cols.ebm, cell: (r) => (r.ebmRequired || r.ebmReceiptNo ? <EbmBadge no={r.ebmReceiptNo} required={r.ebmRequired} /> : ""), card: false },
    { key: "state", label: c.cols.state, cell: (r) => <FinStatus status={r.status} kind="invoice" /> },
  ];

  const clients = q.data?.meta.clients ?? [];
  const chips = [
    own.state && { key: "state", label: `${c.filters.state}: ${f.status[own.state] ?? own.state}`, onRemove: () => setF("state", null) },
    own.client && { key: "client", label: `${c.filters.client}: ${clients.find((x) => x.id === own.client)?.name ?? own.client}`, onRemove: () => setF("client", null) },
    own.due && { key: "due", label: own.due === "week" ? c.filters.dueWeek : c.filters.dueMonth, onRemove: () => setF("due", null) },
    own.ebm && { key: "ebm", label: `${c.filters.ebm}: ${own.ebm === "missing" ? c.filters.ebmMissing : c.filters.ebmPresent}`, onRemove: () => setF("ebm", null) },
    own.q && { key: "q", label: `“${own.q}”`, onRemove: () => setF("q", null) },
  ].filter((x): x is { key: string; label: string; onRemove: () => void } => !!x);
  const sel = "h-10 w-auto min-w-0 pr-8 text-small";
  const filtered = chips.length > 0 || view !== "all";

  return (
    <div className="grid gap-5">
      <PageHead title={c.title} sub={c.sub} actions={
        <ButtonLink href={localHref(locale, "/finance/invoices/new")} dots aria-disabled={!online} className="m-press"><Icon name="plus" size={16} aria-hidden />{c.newInvoice}</ButtonLink>
      } />
      <SavedViewTabs active={view} onChange={(k) => setUrlParams({ view: k === "all" ? null : k, page: null })}
        views={Object.keys(VIEWS).map((k) => ({ key: k, label: c.views[k] }))} />
      <FilterBar search={own.q ?? ""} onSearch={(v) => setF("q", v || null)} placeholder={c.search} chips={chips}
        addFilter={
          <div className="flex flex-wrap gap-2">
            <Select aria-label={c.filters.state} value={own.state ?? ""} onChange={(e) => setF("state", e.target.value || null)} className={sel}>
              <option value="">{c.filters.state}</option>{STATES.map((s) => <option key={s} value={s}>{f.status[s]}</option>)}
            </Select>
            <Select aria-label={c.filters.client} value={own.client ?? ""} onChange={(e) => setF("client", e.target.value || null)} className={sel}>
              <option value="">{c.filters.client}</option>{clients.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
            <Select aria-label={c.filters.due} value={own.due ?? ""} onChange={(e) => setF("due", e.target.value || null)} className={sel}>
              <option value="">{c.filters.due}</option><option value="week">{c.filters.dueWeek}</option><option value="month">{c.filters.dueMonth}</option>
            </Select>
            <Select aria-label={c.filters.ebm} value={own.ebm ?? ""} onChange={(e) => setF("ebm", e.target.value || null)} className={sel}>
              <option value="">{c.filters.ebm}</option><option value="missing">{c.filters.ebmMissing}</option><option value="present">{c.filters.ebmPresent}</option>
            </Select>
          </div>
        } />
      {q.isError && !q.data ? (
        <PanelError what={c.tableLabel} onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <SkeletonRows n={6} />
      ) : (
        <div className="grid gap-3 m-rise">
          <OpsTable label={c.tableLabel} rows={q.data.items} columns={cols} rowKey={(r) => r.key} rowLabel={(r) => `${r.no ?? r.key} ${r.clientName}`}
            focused={focused} onFocus={setFocused} onOpen={open} shortcuts
            rowTone={(r) => (r.overdue ? "danger" : r.status === "void" ? "muted" : null)}
            empty={
              <EmptyPanel title={c.empty.title} body={view === "renewals" ? c.empty.renewals : filtered ? c.empty.filtered : c.empty.body}
                action={<div className="grid place-items-center gap-3">{view === "overdue" ? <ArtNoOverdue /> : <ArtNothingWaiting />}
                  {filtered && <button type="button" onClick={() => setUrlParams({ view: null, ...Object.fromEntries(FILTERS.map((k) => [k, null])) })} className="text-small underline underline-offset-4">{c.filters.clear}</button>}</div>} />
            } />
          {q.data.meta.total > 0 && (
            <dl aria-label={fill(c.totalsRow, { n: q.data.meta.total })} className="grid grid-cols-2 gap-3 theme-dark bg-navy-900 p-4 text-fg sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-1"><dt className="text-small text-fg-muted">{fill(c.totalsRow, { n: q.data.meta.total })}</dt></div>
              {([[c.cols.total, q.data.meta.totals.total], [c.cols.paid, q.data.meta.totals.paid], [c.cols.balance, q.data.meta.totals.balance]] as const).map(([k, v]) => (
                <div key={k}><dt className="text-eyebrow text-fg-muted">{k}</dt><dd key={v} className="m-rise"><Amount value={v} size="lg" /></dd></div>
              ))}
            </dl>
          )}
          {q.data.meta.pages > 1 && <Pagination page={pg} pageCount={q.data.meta.pages} onPage={(n) => setUrlParams({ page: String(n) })} />}
        </div>
      )}
    </div>
  );
}
