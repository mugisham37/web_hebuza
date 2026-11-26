"use client";
import { todayIso } from "@/components/molecules/procurement/procurement";
// R1–R4 Reports (board 09, fixes: procurement nav, computed ticks, "Not due" column): ageing, supplier statement,
// spend & budget, obligations. Every tab: definitions, client CSV export with an audited data_export, data table behind the chart.
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDate, formatMoney } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useProcAlerts } from "@/lib/procurement/api";
import { addDays } from "@/shared/procurement/rules";
import { downloadCsv, useAgeing, useLogExport, useSendStatement, useSpend, useStatement, useVendors } from "@/lib/procurement/ab";
import { BUCKETS } from "@/shared/finance/ageing";
import { fill } from "@/content/pages/procurement-common";
import { PageHead } from "@/components/atoms/agent";
import { SavedViewTabs } from "@/components/molecules/ops/ops";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { DateInput, Select } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Amount, BudgetBar, DocNo, useP } from "@/components/atoms/procurement";
import { PanelErr, ProcLink } from "@/components/molecules/procurement/procurement";
import { ObligationRow } from "@/components/organisms/procurement/home";
import { useAB } from "@/components/molecules/procurement/procurement";

const TABS = ["ageing", "statement", "spend", "obligations"] as const;
type Tab = (typeof TABS)[number];
const BAR = ["bg-success", "bg-info", "bg-warning", "bg-danger/70", "bg-danger"];

export function ReportsView() {
  const c = useAB().reports;
  const u = useUrlParams();
  const tab = (TABS as readonly string[]).includes(u.get("tab") ?? "") ? (u.get("tab") as Tab) : "ageing";
  return (
    <div className="grid gap-5">
      <PageHead title={c.title} sub={c.sub} />
      <SavedViewTabs active={tab} onChange={(k) => setUrlParams({ tab: k })} views={TABS.map((t) => ({ key: t, label: c.tabs[t] }))} />
      {tab === "ageing" ? <AgeingReport /> : tab === "statement" ? <StatementTab /> : tab === "spend" ? <SpendReport /> : <ObligationsReport />}
      <details className="border border-border bg-surface p-4 text-small">
        <summary className="cursor-pointer font-medium">{c.defsTitle}</summary>
        <p className="mt-2 text-fg-muted">{c.defs[tab]}</p>
      </details>
    </div>
  );
}

/** Export: CSV of the loaded rows + one audited data_export event. */
function ExportButton({ report, header, rows, params }: { report: string; header: string[]; rows: (string | number)[][]; params?: string }) {
  const p = useP();
  const c = useAB().reports;
  const toast = useToast();
  const { locale } = useI18n();
  const m = useLogExport();
  return (
    <Button size="sm" variant="secondary" disabled={!rows.length} loading={m.isPending} className="m-press" onClick={async () => {
      try {
        await m.mutateAsync({ report, rows: rows.length, params, idempotencyKey: newIdempotencyKey() });
        downloadCsv(`${report}-${todayIso()}`, header, rows);
        toast({ title: c.exported, tone: "success" });
      } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
    }}><Icon name="upload" size={14} aria-hidden className="rotate-180" />{p.common.export}</Button>
  );
}

function AgeingReport() {
  const c = useAB().reports;
  const u = useUrlParams();
  const asOf = u.get("asOf") ?? todayIso();
  const q = useAgeing(asOf);
  const d = q.data;
  return (
    <section className="grid gap-4 m-rise">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="grid gap-1 text-small">{c.asOf}<DateInput value={asOf} onChange={(e) => setUrlParams({ asOf: e.target.value || null })} className="h-10" /></label>
        {d && <ExportButton report="payables-ageing" params={asOf} header={[c.cols.bill, c.cols.supplier, c.cols.invoice, c.cols.due, "bucket", c.cols.open]}
        rows={d.bills.map((b) => [b.no, b.vendorName, b.vendorInvoiceNo, b.dueOn, c.buckets[b.bucket], b.open])} />}
      </div>
      {q.isError ? <PanelErr onRetry={() => q.refetch()} /> : !d ? <div className="h-40 m-shimmer" /> : (
        <>
          <div className="grid gap-3 border border-border bg-surface p-5">
            <p className="flex items-baseline justify-between gap-2"><span className="text-small text-fg-muted">{c.total}</span><Amount value={d.total} size="xl" className="font-semibold" /></p>
            <div className="flex h-4 overflow-hidden bg-ink-100" aria-hidden>
              {BUCKETS.map((b, i) => d.totals[b] > 0 && <span key={b} className={cx("h-full m-grow", BAR[i])} style={{ width: `${(d.totals[b] * 100) / Math.max(d.total, 1)}%` }} title={`${c.buckets[b]}: ${d.totals[b]}`} />)}
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {BUCKETS.map((b, i) => (
                <ProcLink key={b} href={`/procurement/bills?view=${b === "not_due" ? "due_week" : "overdue"}`} className="grid gap-0.5 p-2 hover:bg-navy-50">
                  <dt className="flex items-center gap-1.5 text-eyebrow text-fg-subtle"><span aria-hidden className={cx("size-2.5 rounded-full", BAR[i])} />{c.buckets[b]}</dt>
                  <dd><Amount value={d.totals[b]} className="font-medium" /></dd>
                </ProcLink>
              ))}
            </dl>
          </div>
          <Table head={[c.cols.supplier, ...BUCKETS.map((b) => c.buckets[b]), c.cols.open]} rows={d.vendors.map((v) => [
            <ProcLink key="n" href={`/procurement/suppliers/${v.vendorId}?tab=bills`} className="font-medium hover:text-link">{v.name}</ProcLink>,
            ...BUCKETS.map((b) => <Amount key={b} value={v.buckets[b]} size="sm" className={v.buckets[b] ? "" : "text-fg-subtle"} />),
            <Amount key="t" value={v.total} size="sm" className="font-semibold" />,
          ])} />
        </>
      )}
    </section>
  );
}

function StatementTab() {
const c = useAB().reports;
  const u = useUrlParams();
  const vendors = useVendors();
  const id = u.get("supplier") ?? "";
  return (
    <section className="grid gap-4 m-rise">
      <label className="grid max-w-sm gap-1 text-small">{c.supplier}
        <Select value={id} onChange={(e) => setUrlParams({ supplier: e.target.value || null })}>
          <option value="">{c.chooseSupplier}</option>
          {(vendors.data?.items ?? []).map((v) => <option key={v.id} value={v.id}>{v.legalName} · {v.code}</option>)}
        </Select>
      </label>
      {id ? <StatementView vendorId={id} /> : <p className="border border-dashed border-border-strong p-8 text-center text-small text-fg-muted">{c.chooseSupplier}</p>}
    </section>
  );
}

/** R2 statement (also the supplier profile Statement tab): period pickers, totals, rows, send + print + CSV. */
export function StatementView({ vendorId }: { vendorId: string }) {
  const c = useAB().reports;
  const p = useP();
  const { locale } = useI18n();
  const toast = useToast();
  const [from, setFrom] = useState(() => addDays(todayIso(), -90));
  const [to, setTo] = useState(todayIso);
  const q = useStatement(vendorId, from, to);
  const send = useSendStatement();
  const [confirm, setConfirm] = useState(false);
  const d = q.data;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="grid gap-1 text-small">{c.from}<DateInput value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-10" /></label>
        <label className="grid gap-1 text-small">{c.to}<DateInput value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-10" /></label>
        <span className="ml-auto flex flex-wrap gap-2">
          {d && <ExportButton report={`statement-${d.vendor.code}`} params={`${from}..${to}`} header={[c.cols.date, c.cols.ref, c.cols.text, c.cols.debit, c.cols.credit]} rows={d.rows.map((r) => [r.date, r.ref, r.text, r.debit, r.credit])} />}
          <Button size="sm" variant="secondary" onClick={() => window.open(`/api/procurement/vendors/${encodeURIComponent(vendorId)}/statement.pdf?from=${from}&to=${to}`, "_blank", "noopener")}><Icon name="file" size={14} aria-hidden />{p.common.print}</Button>
          <Button size="sm" onClick={() => setConfirm(true)} disabled={!d} className="m-press"><Icon name="mail" size={14} aria-hidden />{c.send}</Button>
        </span>
        </div>
      {q.isError ? <PanelErr onRetry={() => q.refetch()} /> : !d ? <div className="h-40 m-shimmer" /> : (
        <>
          <dl className="grid grid-cols-2 gap-3 border border-border bg-surface p-4 sm:grid-cols-4">
            {([["opening", d.opening], ["billed", d.billed], ["paid", d.paid], ["closing", d.closing]] as const).map(([k, v]) => (
              <div key={k}><dt className="text-eyebrow text-fg-subtle">{c[k]}</dt><dd><Amount value={v} size="lg" className={cx(k === "closing" && "font-semibold")} /></dd></div>
      ))}
          </dl>
          <Table head={[c.cols.date, c.cols.ref, c.cols.text, c.cols.debit, c.cols.credit]} rows={d.rows.map((r) => [
            <span key="d" className="tabular">{formatDate(r.date, locale)}</span>, <DocNo key="r" no={r.ref} href={r.ref.startsWith("BL-") ? `/procurement/bills/${r.ref}` : undefined} />, r.text,
            r.debit ? <Amount key="db" value={r.debit} size="sm" /> : "", r.credit ? <Amount key="cr" value={r.credit} size="sm" /> : "",
          ])} />
        </>
      )}
      <Dialog open={confirm} onClose={() => setConfirm(false)} title={c.sendTitle}
      footer={d?.vendor.email ? <Button loading={send.isPending} className="m-press" onClick={async () => {
        try {
          const r = await send.mutateAsync({ id: vendorId, from, to, idempotencyKey: newIdempotencyKey() });
          toast({ title: fill(c.sent, { email: r.sentTo }), tone: "success" }); setConfirm(false);
          } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
        }}>{c.send}</Button> : undefined}>
        <p className="text-body">{d?.vendor.email ? fill(c.sendBody, { from: formatDate(from, locale), to: formatDate(to, locale), email: d.vendor.email }) : c.noEmail}</p>
      </Dialog>
    </div>
  );
}

function SpendReport() {
  const c = useAB().reports;
  const { locale } = useI18n();
  const [from, setFrom] = useState(() => `${todayIso().slice(0, 4)}-01-01`);
  const [to, setTo] = useState(todayIso);
  const q = useSpend(from, to);
  const d = q.data;
  const max = Math.max(1, ...(d?.months ?? []).flatMap((m) => [m.spend, m.budget]));
  const ticks = [0, 0.5, 1].map((f) => Math.round((max * f) / 1000) * 1000);
  const top = d?.months.reduce((a, m) => (m.spend > a.spend ? m : a), { month: "", spend: 0, budget: 0 });
  return (
    <section className="grid gap-4 m-rise">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-small">{c.from}<DateInput value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-10" /></label>
        <label className="grid gap-1 text-small">{c.to}<DateInput value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-10" /></label>
        {d && <span className="ml-auto"><ExportButton report="spend-budget" params={`${from}..${to}`} header={[c.cols.category, c.cols.budget, c.cols.committed, c.cols.actual, c.cols.available]}
        rows={d.categories.map((x) => [x.name, x.annualBudget, x.committed, x.actual, x.available])} /></span>}
      </div>
      {q.isError ? <PanelErr onRetry={() => q.refetch()} /> : !d ? <div className="h-56 m-shimmer" /> : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <div className="border border-border bg-surface p-4"><dt className="text-eyebrow text-fg-subtle">{c.spendTotal}</dt><dd><Amount value={d.months.reduce((s, m) => s + m.spend, 0)} size="lg" className="font-semibold" /></dd></div>
            <div className="border border-border bg-surface p-4"><dt className="text-eyebrow text-fg-subtle">{c.paidTotal}</dt><dd><Amount value={d.paid} size="lg" className="font-semibold" /></dd></div>
          </dl>
          <figure className="grid gap-2 border border-border bg-surface p-5">
            <figcaption className="text-card-title">{c.chart}</figcaption>
            {/* shortcut: charts use native <title> tooltips, upgrade if drill-down on hover is requested */}
            <div className="grid grid-cols-[auto_1fr] gap-2" aria-hidden>
              <div className="flex h-44 flex-col-reverse justify-between text-eyebrow text-fg-subtle tabular">{ticks.map((t) => <span key={t}>{formatMoney(t, "RWF", locale)}</span>)}</div>
              <div className="flex h-44 items-end gap-3 border-b border-l border-border px-2">
                {d.months.map((m) => (
                  <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <div className="flex h-full w-full items-end justify-center gap-1">
                      <span className="w-1/3 bg-navy-700 m-grow" style={{ height: `${(m.spend * 100) / max}%` }}><title>{`${m.month}: ${m.spend}`}</title></span>
                      <span className="w-1/3 border-2 border-dashed border-navy-300" style={{ height: `${(m.budget * 100) / max}%` }} />
                    </div>
                    <span className="text-eyebrow text-fg-subtle">{m.month.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-small text-fg-muted">{fill(c.chartSummary, { months: d.months.length, max: formatMoney(top?.spend ?? 0, "RWF", locale), month: top?.month ?? "" })}</p>
            <table className="sr-only"><thead><tr><th>{c.cols.month}</th><th>{c.cols.spend}</th><th>{c.cols.budget}</th></tr></thead><tbody>{d.months.map((m) => <tr key={m.month}><td>{m.month}</td><td>{m.spend}</td><td>{m.budget}</td></tr>)}</tbody></table>
          </figure>
          <h2 className="text-card-title">{c.byCategory}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {d.categories.map((x) => (
              <li key={x.code} className="grid gap-2 border border-border bg-surface p-4">
                <p className="flex items-center justify-between gap-2 text-small font-medium"><span>{x.name}</span><span className="text-fg-muted tabular">{x.pct}%</span></p>
                <BudgetBar used={x.committed + x.actual} budget={x.annualBudget} name={x.name} />
                </li>
              ))}
            </ul>
          <h2 className="text-card-title">{c.bySupplier}</h2>
          <Table head={[c.cols.supplier, c.cols.spend]} rows={d.vendors.map((v) => [<ProcLink key="n" href={`/procurement/suppliers/${v.vendorId}`} className="hover:text-link">{v.name}</ProcLink>, <Amount key="a" value={v.total} size="sm" />])} />
        </>
        )}
    </section>
  );
}

function ObligationsReport() {
  const c = useAB().reports;
  const p = useP();
  const u = useUrlParams();
  const h = Number(u.get("horizon") ?? 90);
  const q = useProcAlerts(h);
  const items = q.data?.items ?? [];
  return (
    <section className="grid gap-4 m-rise">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" className="inline-flex border border-border bg-surface p-0.5 text-small">
          {[30, 60, 90].map((n) => <button key={n} type="button" role="radio" aria-checked={h === n} onClick={() => setUrlParams({ horizon: n === 90 ? null : String(n) })} className={cx("h-8 px-3 m-press", h === n ? "bg-secondary text-on-secondary" : "text-fg-muted")}>{fill(c.horizon, { n })}</button>)}
        </div>
        <ExportButton report="obligations" params={String(h)} header={[c.cols.when, c.cols.kind, c.cols.text, c.cols.ref, c.cols.amount]} rows={items.map((o) => [o.on, o.kind, o.title, o.ref, o.amount ?? ""])} />
      </div>
      <div className="border border-border bg-surface px-5">
        {q.isError ? <div className="py-4"><PanelErr onRetry={() => q.refetch()} /></div> : q.isPending ? <div className="h-40 m-shimmer" /> : !items.length
          ? <p className="py-10 text-center text-small text-fg-muted">{p.empty.obligations}</p>
          : <ul className="divide-y divide-border">{items.map((o) => <ObligationRow key={o.id} o={o} />)}</ul>}
      </div>
    </section>
  );
  }

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto border border-border bg-surface">
      <table className="w-full min-w-[36rem] text-small">
        <thead className="bg-ink-100 text-left text-eyebrow text-ink-700"><tr>{head.map((h, i) => <th key={i} scope="col" className={cx("px-4 py-2.5 font-medium", i > 0 && "text-right")}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-border">{r.map((cell, k) => <td key={k} className={cx("px-4 py-2.5", k > 0 && "text-right")}>{cell}</td>)}</tr>)}</tbody>
              </table>
    </div>
  );
}
