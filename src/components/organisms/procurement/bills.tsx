"use client";
// B1 Bills inbox (board 07 BL1, fixes: persona footer, match column, saved views) + RecurringBillsPanel + simulate.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { formatDate, formatMoney } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { daysBetween } from "@/shared/procurement/rules";
import { billSteps, useBills, useGenerateRecurring, useRecurringPreview, type BillRow } from "@/lib/procurement/de";
import { procurementDe } from "@/content/pages/procurement-de";
import { fill } from "@/content/pages/procurement-common";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { EmptyPanel, SavedViewTabs } from "@/components/molecules/ops/ops";
import { PageHead } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { ButtonLink, Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Amount, DocNo, LockChip, MatchDot, Pill, ProcPill, useP, type MatchDotState } from "@/components/atoms/procurement";
import { ProcNoAccess, SegregationStrip } from "@/components/molecules/procurement/procurement";
import { PROC_POLICY } from "@/shared/policy";
import { ApiError } from "@/lib/api/client";

export const useDE = () => procurementDe(useI18n().locale);
const VIEWS = ["all", "exceptions", "due", "overdue", "approval", "ready", "paid", "disputed", "drafts"] as const;
type View = (typeof VIEWS)[number];
const LIVE = ["submitted", "matched", "match_exception", "approved", "authorised", "partially_paid"];
const inView = (b: BillRow, v: View, today: string) =>
  v === "all" ? b.status !== "void"
  : v === "exceptions" ? b.status === "match_exception"
  : v === "due" ? LIVE.includes(b.status) && b.dueOn >= today && daysBetween(today, b.dueOn) <= 7
  : v === "overdue" ? LIVE.includes(b.status) && b.dueOn < today
  : v === "approval" ? ["submitted", "matched", "approved"].includes(b.status)
  : v === "ready" ? ["authorised", "partially_paid"].includes(b.status)
  : v === "paid" ? b.status === "paid"
  : v === "disputed" ? b.status === "disputed" : b.status === "draft";
export const matchState = (b: Pick<BillRow, "match" | "status">): MatchDotState =>
  !b.match ? "pending" : b.match.result === "match_exception" && !b.match.exceptionApproved ? "exception"
  : b.match.result === "matched" ? (b.match.lines.some((l) => l.result === "tolerance") ? "tolerance" : "matched") : b.match.result === "match_exception" ? "matched" : b.match.result;

export function DueChip({ due, today, status }: { due: string; today: string; status: string }) {
  const { locale } = useI18n();
  const n = daysBetween(today, due);
  if (status === "paid" || status === "void") return <span className="text-small text-fg-muted tabular">{formatDate(due, locale)}</span>;
  return <Pill tone={n < 0 ? "danger" : n <= PROC_POLICY.dueSoonDays ? "warning" : "neutral"} icon="calendar" title={formatDate(due, locale)}>{n < 0 ? `${formatDate(due, locale)} · −${-n} d` : `${formatDate(due, locale)} · ${n} d`}</Pill>;
}

export function BillsView() {
  const c = useDE();
  const p = useP();
  const { locale } = useI18n();
  const router = useRouter();
  const u = useUrlParams();
  const view = (VIEWS as readonly string[]).includes(u.get("view") ?? "") ? (u.get("view") as View) : "all";
  const search = (u.get("q") ?? "").toLowerCase();
  const q = useBills();
  const [focused, setFocused] = useState<string | null>(null);
  if (q.isError && q.error instanceof ApiError && q.error.status === 403) return <ProcNoAccess />;
  const today = q.data?.today ?? "";
  const all = q.data?.items ?? [];
  const rows = all.filter((b) => inView(b, view, today) && (!search || [b.no, b.vendorName, b.vendorInvoiceNo].some((x) => x.toLowerCase().includes(search))));
  const cols: OpsColumn<BillRow>[] = [
    { key: "match", label: c.bills.cols.match, cell: (b) => <MatchDot state={matchState(b)} /> },
    { key: "no", label: c.bills.cols.no, sort: (b) => b.no, cell: (b) => <DocNo kind="BL" no={b.no} /> },
    { key: "supplier", label: c.bills.cols.supplier, wrap: true, sort: (b) => b.vendorName, cell: (b) => (
      <span className="grid gap-0.5"><span className="max-w-[16rem] truncate font-medium" title={b.vendorName}>{b.vendorName}</span>{b.locked && <LockChip until={b.lockUntil} compact />}</span>
    ) },
    { key: "invoice", label: c.bills.cols.invoice, cell: (b) => <span className="max-w-[10rem] truncate text-small tabular" title={b.vendorInvoiceNo}>{b.vendorInvoiceNo}</span> },
    { key: "due", label: c.bills.cols.due, sort: (b) => b.dueOn, cell: (b) => <DueChip due={b.dueOn} today={today} status={b.status} /> },
    { key: "amount", label: c.bills.cols.amount, align: "right", sort: (b) => b.total, cell: (b) => <Amount value={b.total} className="font-semibold" /> },
    { key: "state", label: c.bills.cols.state, cell: (b) => <ProcPill state={b.status} machine="bill" /> },
    { key: "people", label: c.bills.cols.people, card: false, cell: (b) => <SegregationStrip compact steps={billSteps(b, PROC_POLICY.financeMax)} /> },
  ];
  const count = (v: View) => all.filter((b) => inView(b, v, today)).length;
  return (
    <div className="grid gap-5">
      <PageHead title={c.bills.title} sub={c.bills.sub} actions={<ButtonLink variant="primary" href={localHref(locale, "/procurement/bills/new")} dots className="m-press"><Icon name="plus" size={16} aria-hidden />{c.bills.enter}</ButtonLink>} />
      <RecurringBillsPanel />
      <div className="grid gap-3 m-rise">
        <SavedViewTabs active={view} onChange={(k) => setUrlParams({ view: k === "all" ? null : k })} views={VIEWS.map((v) => ({ key: v, label: c.bills.views[v], count: q.data ? count(v) : undefined }))} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="relative w-full max-w-sm">
            <span className="sr-only">{c.bills.search}</span>
            <Icon name="search" size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
            <Input type="search" defaultValue={u.get("q") ?? ""} placeholder={c.bills.search} onChange={(e) => setUrlParams({ q: e.target.value || null })} className="h-10 pl-9 text-small" />
          </label>
          {q.data && <span className="text-small text-fg-muted tabular" aria-live="polite">{fill(c.bills.shown, { n: rows.length })}</span>}
        </div>
      </div>
      <div className="border border-border bg-surface m-rise">
        <OpsTable rows={rows} columns={cols} rowKey={(b) => b.no} rowLabel={(b) => `${b.no} · ${b.vendorName}`} label={c.bills.views[view]} loading={q.isPending}
          error={q.isError ? q.error : undefined} onRetry={() => q.refetch()} focused={focused} onFocus={setFocused} shortcuts
          rowTone={(b) => (b.status === "match_exception" || (LIVE.includes(b.status) && b.dueOn < today) ? "danger" : b.status === "void" ? "muted" : null)}
          onOpen={(b) => router.push(localHref(locale, `/procurement/bills/${b.no}${b.status === "match_exception" ? "?tab=match" : ""}`))}
          empty={<div className="p-4"><EmptyPanel title={search ? fill(p.empty.search, { q: search }) : p.empty.bills} /></div>} />
      </div>
    </div>
  );
}

function RecurringBillsPanel() {
  const c = useDE();
  const toast = useToast();
  const { locale } = useI18n();
  const prev = useRecurringPreview();
  const gen = useGenerateRecurring();
  const online = useOnline();
  const items = prev.data?.items ?? [];
  if (prev.isPending || prev.isError) return null;
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 bg-info-bg p-4 m-rise">
      <div className="min-w-0">
        <h2 className="text-card-title">{c.bills.recurring.title}</h2>
        <p className="text-small text-fg-muted">{items.length ? fill(c.bills.recurring.due, { n: items.length }) : c.bills.recurring.none}</p>
        {items.length > 0 && <p className="mt-1 text-eyebrow text-fg-subtle">{items.map((i) => `${i.vendorName} ${formatMoney(i.amount, "RWF", locale)}`).join(" · ")}</p>}
      </div>
      {items.length > 0 && (
        <Button size="sm" disabled={!online} loading={gen.isPending} className="m-press" onClick={async () => {
          try { const r = await gen.mutateAsync({ idempotencyKey: newIdempotencyKey() }); toast({ title: fill(c.bills.recurring.done, { n: r.created.length }), tone: "success" }); }
          catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
        }}>{c.bills.recurring.draft}</Button>
      )}
    </section>
  );
}
