"use client";
// U16 Reports (board 12, Fix applied): library cards with last run, ReportView = ReportFrame + chart (with the table as its
// alternative) + grouped table + drill drawer (Σ drill rows = cell, every row links to its source) + background export job.
import { useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatDateTime, formatNumber } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { REPORT_KEYS, startExport, useCatalog, useDrill, useExportJob, useReport, type ColKind, type ReportData, type ReportKey } from "@/lib/finance/a";
import type { Bucket } from "@/shared/finance/ageing";
import { fill } from "@/content/pages/finance-common";
import { financeReports } from "@/content/pages/finance-reports";
import { Icon, type IconName } from "@/components/atoms/icon";
import { ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { DateInput, Input, Select } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { PageHead, useNow } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { Amount, FinStatus, FxNote, PeriodLabel } from "@/components/atoms/finance";
import { AgeingBar, ExportMenu, FiveStatesBar, ReportFrame } from "@/components/molecules/finance/finance";
import { ArtNoImports } from "@/components/atoms/finance-art";
import { Button } from "@/components/atoms/button";
import { api, unwrap } from "@/lib/api/client";
import { reportSubscribeCopy } from "@/content/pages/report-subscribe";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useRp = () => financeReports(useI18n().locale);

const ICON: Record<ReportKey, IconName> = {
  "fin.revenue": "chart", "fin.collections": "card", "fin.receivables_ageing": "clock", "fin.reconciliation": "layers", "fin.refunds_credit_notes": "refresh",
  "fin.revenue_share": "users", "fin.revenue_reconciliation": "sparkle", "fin.vat": "file", "fin.wht_payable": "building", "fin.cash_flow": "wallet",
  "fin.subscriptions": "calendar", "fin.payables_ageing": "briefcase",
};
// shortcut: display-only FX rate PLACEHOLDER(fx-usd-demo-rate), move to src/lib/policy.ts when the integrator adds it.
const DEMO_FX = { rate: 1300, currency: "USD" };

/** Library card: icon, title, one-line description, last run, Open. Lifts on hover (m-lift). */
export function ReportCard({ k, lastRun, i = 0 }: { k: ReportKey; lastRun: string | null | undefined; i?: number }) {
  const c = useRp();
  const { locale } = useI18n();
  const r = c.reports[k];
  return (
    <li style={{ ["--i" as string]: i }} className="grid">
      <Link href={localHref(locale, `/finance/reports/${k}`)} className="group grid content-between gap-4 border border-border bg-white p-5 m-lift focus-visible:outline-2">
        <span className="grid gap-3">
          <span className="flex size-11 items-center justify-center bg-bg-tint text-navy-600"><Icon name={ICON[k]} size={20} aria-hidden /></span>
          <span className="text-label-lg">{r.title}</span>
          <span className="text-small text-fg-muted">{r.body}</span>
        </span>
        <span className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-eyebrow text-fg-subtle tabular">{lastRun === undefined ? <span aria-hidden className="inline-block h-3 w-24 m-shimmer" /> : lastRun ? fill(c.lastRun, { t: formatDateTime(lastRun, locale) }) : c.never}</span>
          <span className="inline-flex items-center gap-1 text-small font-medium text-navy-800">{c.open}<Icon name="arrowRight" size={14} aria-hidden className="transition-transform group-hover:translate-x-0.5" /></span>
        </span>
      </Link>
    </li>
  );
}

export function ReportsLibrary() {
  const c = useRp();
  const { locale } = useI18n();
  const cat = useCatalog();
  const params = useUrlParams();
  const term = params.get("q") ?? "";
  const last = new Map(cat.data?.items.map((x) => [x.key, x.lastRun]));
  const keys = REPORT_KEYS.filter((k) => !term || `${c.reports[k].title} ${c.reports[k].body}`.toLowerCase().includes(term.toLowerCase()));
  return (
    <div className="grid gap-5">
      <PageHead title={c.title} sub={c.sub} actions={
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">{c.search}</span>
          <Icon name="search" size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
          <Input type="search" value={term} placeholder={c.search} onChange={(e) => setUrlParams({ q: e.target.value || null })} className="pl-9" />
        </label>
      } />
      <Link href={localHref(locale, "/finance/reports/definitions")} className="w-fit text-small underline underline-offset-4">{reportSubscribeCopy(locale).definitions}</Link>
      {cat.isError && <PanelError what={c.title} onRetry={() => cat.refetch()} />}
      {keys.length === 0 ? <EmptyPanel title={fill(c.noMatch, { q: term })} compact /> : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 m-stagger">
          {keys.map((k, i) => <ReportCard key={k} k={k} i={i} lastRun={cat.isPending ? undefined : (last.get(k) ?? null)} />)}
        </ul>
      )}
      <Link href={localHref(locale, "/finance/reports/accounting-export")} className="group flex flex-wrap items-center gap-4 theme-dark bg-grad-navy-depth p-5 text-fg m-lift">
        <span className="flex size-11 items-center justify-center bg-white/10 text-gold-400"><Icon name="fileCheck" size={20} aria-hidden /></span>
        <span className="grid min-w-0 flex-1 gap-1"><span className="text-label-lg">{c.exportCard.title}</span><span className="text-small text-fg-muted">{c.exportCard.body}</span></span>
        <span className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-small font-medium text-on-gold hover:bg-primary-hover m-press">{c.exportCard.cta}<Icon name="arrowRight" size={14} aria-hidden /></span>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------- report detail
function Cell({ kind, v }: { kind: ColKind; v: number | undefined }) {
  const { locale } = useI18n();
  const x = v ?? 0;
  if (kind === "money") return <Amount value={x} size="sm" />;
  if (kind === "pct") return <span className="tabular">{formatNumber(x / 100, locale)}%</span>; // basis points → percent (display only)
  return <span className="tabular">{formatNumber(x, locale)}</span>;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
function presets(now: number) {
  const t = new Date(now);
  const y = t.getUTCFullYear(), m = t.getUTCMonth();
  return {
    month: { from: iso(new Date(Date.UTC(y, m, 1))), to: iso(t) },
    last: { from: iso(new Date(Date.UTC(y, m - 1, 1))), to: iso(new Date(Date.UTC(y, m, 0))) },
    year: { from: iso(new Date(Date.UTC(y, 0, 1))), to: iso(t) },
  };
}

/** Bars for the first metric per row (aria-hidden: the table right below is the accessible version). */
function Bars({ d, metric }: { d: ReportData; metric: string }) {
  const rows = d.rows.slice(0, 8);
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.values[metric] ?? 0)));
  if (!rows.length) return null;
  return (
    <div aria-hidden className="grid gap-2">
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-small">
          <span className="truncate text-fg-muted">{r.label}</span>
          <span className="h-2.5 overflow-hidden bg-ink-100"><span className="block h-full bg-navy-700 m-grow" style={{ width: `${(Math.abs(r.values[metric] ?? 0) / max) * 100}%` }} /></span>
          <Amount value={r.values[metric] ?? 0} size="sm" />
        </div>
      ))}
    </div>
  );
}

function DrillDialog({ reportKey, qs, metric, row, label, onClose }: { reportKey: ReportKey; qs: string; metric: string; row: string | null; label: string; onClose: () => void }) {
  const c = useRp();
  const { locale } = useI18n();
  const dq = new URLSearchParams(qs);
  dq.set("metric", metric);
  if (row) dq.set("row", row);
  const q = useDrill(reportKey, dq.toString(), true);
  const kind = metric === "failure_rate" ? "pct" : ["initiated", "confirmed", "failed", "matched", "unmatched", "refunds", "credit_notes", "invoices", "missing_ebm", "renewals"].includes(metric) ? "count" : "money";
  return (
    <Dialog open onClose={onClose} side="right" title={fill(c.drill.title, { metric: c.cols[metric] ?? metric, row: label })}
      description={q.data ? `${c.drill.total}` : undefined}>
      {q.isPending ? <div aria-hidden className="grid gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 m-shimmer" />)}</div>
        : q.isError ? <PanelError what={c.failed} onRetry={() => q.refetch()} />
        : !q.data.items.length ? <EmptyPanel title={c.drill.empty} compact />
        : (
          <div className="grid gap-3">
            <p className="flex items-center justify-between bg-bg-tint px-4 py-3 text-small"><span>{c.drill.total}</span><Cell kind={kind} v={q.data.total} /></p>
            <ul className="grid gap-1.5 m-stagger">
              {q.data.items.map((it, i) => (
                <li key={`${it.ref}-${i}`} style={{ ["--i" as string]: Math.min(i, 6) }}>
                  <Link href={localHref(locale, it.href)} aria-label={fill(c.drill.openSource, { ref: it.ref })} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 border border-border p-3 hover:bg-navy-50">
                    <span className="truncate font-medium tabular">{it.ref}</span>
                    <Cell kind={kind} v={it.value} />
                    <span className="truncate text-eyebrow text-fg-subtle">{formatDate(it.date, locale)} · {it.party}</span>
                    {it.state ? <FinStatus status={it.state} className="justify-self-end" /> : <span />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
    </Dialog>
  );
}

export function ReportView({ reportKey }: { reportKey: ReportKey }) {
  const c = useRp();
  const { locale } = useI18n();
  const toast = useToast();
  const online = useOnline();
  const now = useNow();
  const params = useUrlParams();
  const base = new URLSearchParams();
  for (const k of ["from", "to", "group"]) { const v = params.get(k); if (v) base.set(k, v); }
  const qs = base.toString();
  const q = useReport(reportKey, qs);
  const d = q.data;
  const [jobId, setJobId] = useState<string | null>(null);
  const job = useExportJob(jobId);
  const drill = params.get("drill");
  const drillRow = params.get("row");
  const title = c.reports[reportKey].title;

  async function exportAs(format: string) {
    try {
      const j = await startExport(reportKey, format as "pdf" | "csv" | "xlsx", Object.fromEntries(base), newIdempotencyKey());
      setJobId(j.id);
    } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
  }

  const back = <Link href={localHref(locale, "/finance/reports")} className="mb-2 inline-flex items-center gap-1.5 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{c.back}</Link>;

  if (q.isError) return <div className="grid gap-4"><PageHead title={title} back={back} /><PanelError what={c.failed} onRetry={() => q.refetch()} /></div>;
  if (!d) return (
    <div className="grid gap-4">
      <PageHead title={title} back={back} />
      <div aria-hidden className="grid gap-4 border border-border bg-white p-6"><div className="h-5 w-56 m-shimmer" /><div className="h-40 m-shimmer" />{[0, 1, 2, 3].map((i) => <div key={i} className="h-10 m-shimmer" />)}</div>
    </div>
  );

  const metric = d.columns[0]?.key ?? "";
  const p = now ? presets(now) : null;
  const rowLabel = drillRow ? (d.rows.find((r) => r.key === drillRow)?.label ?? drillRow) : c.drill.all;
  const drillBtn = (m: string, row: string | null, kind: ColKind, v: number | undefined, label: string) => (
    <button type="button" onClick={() => setUrlParams({ drill: m, row })} aria-label={`${c.cols[m] ?? m} · ${label}`}
      className="underline decoration-border-strong decoration-dotted underline-offset-4 hover:decoration-fg focus-visible:outline-2"><Cell kind={kind} v={v} /></button>
  );

  return (
    <div className="grid gap-4">
      <PageHead title={title} back={back} sub={c.reports[reportKey].body} />
      <ReportFrame
        title={title}
        period={<PeriodLabel from={d.meta.period.from} to={d.meta.period.to} />}
        generatedAt={d.meta.generatedAt} freshness={d.meta.freshness}
        definitions={[...d.columns.map((col) => ({ key: c.cols[col.key] ?? col.key, text: c.defs[col.key] ?? "" }))]}
        actions={<div className="flex flex-wrap items-center gap-2"><ExportMenu formats={["csv", "xlsx", "pdf"]} job={job.data ?? null} onPick={exportAs} disabled={!online || !d.rows.length} /><SubscribeControl reportKey={reportKey} /><SavedViews reportKey={reportKey} current={Object.fromEntries(base)} /></div>}
        filters={
          <>
            <label className="grid gap-1 text-eyebrow text-fg-muted">{c.from}<DateInput value={d.meta.period.from} onChange={(e) => setUrlParams({ from: e.target.value || null })} className="w-40" /></label>
            <label className="grid gap-1 text-eyebrow text-fg-muted">{c.to}<DateInput value={d.meta.period.to} onChange={(e) => setUrlParams({ to: e.target.value || null })} className="w-40" /></label>
            {d.groups.length > 1 && (
              <label className="grid gap-1 text-eyebrow text-fg-muted">{c.group}
                <Select value={d.group} onChange={(e) => setUrlParams({ group: e.target.value, drill: null, row: null })} className="w-40">
                  {d.groups.map((g) => <option key={g} value={g}>{c.groups[g] ?? g}</option>)}
                </Select>
              </label>
            )}
            {p && (
              <div className="flex flex-wrap items-end gap-1.5">
                {(Object.keys(p) as (keyof typeof p)[]).map((k) => {
                  const on = p[k].from === d.meta.period.from && p[k].to === d.meta.period.to;
                  return <button key={k} type="button" aria-pressed={on} onClick={() => setUrlParams(p[k])} className={cx("h-9 px-3 text-small", on ? "bg-secondary text-on-navy" : "bg-bg-subtle hover:bg-border-strong")}>{c.presets[k]}</button>;
                })}
              </div>
            )}
          </>
        }
      >
        <TargetLights d={d} cols={c.cols} />
        {(reportKey === "fin.revenue_reconciliation" || reportKey === "fin.revenue_share") && (
          <p className="flex items-center gap-2 bg-bg-tint px-4 py-3 text-small"><Icon name="sparkle" size={16} aria-hidden className="text-navy-600" />{c.eligibleNote}</p>
        )}

        {d.empty === "no_import" ? (
          <EmptyPanel title={c.empty.no_import} body={c.empty.no_importBody} action={<div className="grid place-items-center gap-3"><ArtNoImports /><ButtonLink href={localHref(locale, "/finance/reconciliation/import")} size="sm" className="m-press">{c.empty.importCta}</ButtonLink></div>} />
        ) : d.empty === "stage12" ? (
          <EmptyPanel title={c.empty.stage12} body={c.empty.stage12Body} />
        ) : !d.rows.length ? (
          <EmptyPanel title={c.empty.rows} body={c.empty.rowsBody} />
        ) : (
          <>
            <figure className="grid gap-3">
              <figcaption className="text-eyebrow text-fg-subtle">{fill(c.chartLabel, { metric: c.cols[metric] ?? metric, group: c.groups[d.group] ?? d.group })}</figcaption>
              {d.five ? <FiveStatesBar values={d.five} />
                : reportKey === "fin.receivables_ageing" ? <AgeingBar buckets={d.total as Record<Bucket, number>} />
                : d.columns[0]?.kind === "money" ? <Bars d={d} metric={metric} /> : null}
            </figure>

            <div role="region" aria-label={fill(c.rowsLabel, { title })} tabIndex={0} className="overflow-x-auto border border-border">
              <table className="w-full min-w-[40rem] text-small">
                <thead className="sticky top-0 bg-ink-100 text-eyebrow text-fg-subtle">
                  <tr>
                    <th scope="col" className="p-3 text-left font-medium">{c.groups[d.group] ?? d.group}</th>
                    {d.columns.map((col) => <th key={col.key} scope="col" className="p-3 text-right font-medium">{c.cols[col.key] ?? col.key}</th>)}
                  </tr>
                </thead>
                <tbody className="m-stagger">
                  {d.rows.map((r, i) => (
                    <tr key={r.key} style={{ ["--i" as string]: Math.min(i, 6) }} className="border-t border-border hover:bg-navy-50">
                      <th scope="row" className="max-w-56 truncate p-3 text-left font-normal">{r.label}</th>
                      {d.columns.map((col) => (
                        <td key={col.key} className="p-3 text-right whitespace-nowrap">
                          {col.drill && r.values[col.key] ? drillBtn(col.key, r.key, col.kind, r.values[col.key], r.label) : <Cell kind={col.kind} v={r.values[col.key]} />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border-strong bg-bg-subtle font-medium">
                  <tr>
                    <th scope="row" className="p-3 text-left">{c.totalRow}</th>
                    {d.columns.map((col) => (
                      <td key={col.key} className="p-3 text-right whitespace-nowrap">
                        {col.drill && d.total[col.key] ? drillBtn(col.key, null, col.kind, d.total[col.key], c.drill.all) : <Cell kind={col.kind} v={d.total[col.key]} />}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        {reportKey === "fin.revenue" && (
          <div className="grid gap-2">
            <FxNote rate={DEMO_FX.rate} at={d.meta.period.to} currency={DEMO_FX.currency} />
            <p className="text-eyebrow text-fg-subtle">{c.fx}</p>
          </div>
        )}
      </ReportFrame>

      {drill && (
        <DrillDialog key={`${drill}:${drillRow ?? ""}:${qs}`} reportKey={reportKey} qs={qs} metric={drill} row={drillRow} label={rowLabel}
          onClose={() => setUrlParams({ drill: null, row: null })} />
      )}
    </div>
  );
}

type Sub = { id: string; report: string; format: "csv" | "xlsx"; freq: "weekly" | "monthly" };
/** F-RPT-05: subscribe to this report by email (weekly/monthly, CSV or XLSX); shows and stops an existing subscription. */
function SubscribeControl({ reportKey }: { reportKey: ReportKey }) {
  const { locale } = useI18n();
  const k = reportSubscribeCopy(locale);
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [freq, setFreq] = useState<Sub["freq"]>("weekly");
  const [format, setFormat] = useState<Sub["format"]>("xlsx");
  const subs = useQuery({ queryKey: ["reports", "subs"], queryFn: () => unwrap<{ items: Sub[] }>(api.GET("/api/reports/subscriptions")) });
  const mine = subs.data?.items.find((x) => x.report === reportKey);
  const done = () => qc.invalidateQueries({ queryKey: ["reports", "subs"] });
  const add = useMutation({
    mutationFn: () => unwrap(api.POST("/api/reports/subscriptions", { body: { report: reportKey, freq, format } })),
    onSuccess: () => (void done(), setOpen(false), toast({ title: k.saved, tone: "success" })),
    onError: () => toast({ title: k.failed, tone: "danger" }),
  });
  const stop = useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE("/api/reports/subscriptions/{id}", { params: { path: { id } } })),
    onSuccess: () => (void done(), toast({ title: k.stopped, tone: "success" })),
    onError: () => toast({ title: k.failed, tone: "danger" }),
  });
  if (subs.isPending || subs.isError) return null;
  if (mine)
    return (
      <span className="inline-flex items-center gap-2 text-small text-fg-muted">
        {k.active} · {mine.freq === "weekly" ? k.weekly : k.monthly}
        <Button size="sm" variant="outline" disabled={stop.isPending} onClick={() => stop.mutate(mine.id)}>{k.stop}</Button>
      </span>
    );
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Icon name="clock" size={14} aria-hidden />{k.subscribe}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={k.subscribe}
        footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>{k.cancel}</Button><Button disabled={add.isPending} onClick={() => add.mutate()}>{k.save}</Button></div>}>
        <div className="grid gap-3">
          <label className="grid gap-1 text-small font-medium">{k.subscribe}
            <Select value={freq} onChange={(e) => setFreq(e.target.value as Sub["freq"])}><option value="weekly">{k.weekly}</option><option value="monthly">{k.monthly}</option></Select>
          </label>
          <label className="grid gap-1 text-small font-medium">{k.format}
            <Select value={format} onChange={(e) => setFormat(e.target.value as Sub["format"])}><option value="xlsx">XLSX</option><option value="csv">CSV</option></Select>
          </label>
        </div>
      </Dialog>
    </>
  );
}

type Light = { metric: string; target: number; actual: number; light: "green" | "amber" | "red" };
const LIGHT = { green: "bg-success", amber: "bg-warning", red: "bg-danger" } as const;
/** F-RPT-08/10: period total vs the executive's target (scaled to the period), with a text label next to the colour. */
function TargetLights({ d, cols }: { d: ReportData; cols: Record<string, string> }) {
  const { locale } = useI18n();
  const k = reportSubscribeCopy(locale);
  const t = (d as ReportData & { targets?: Light[] }).targets ?? [];
  if (!t.length) return null;
  return (
    <ul aria-label={k.targets} className="flex flex-wrap gap-3">
      {t.map((x) => (
        <li key={x.metric} className="flex items-center gap-2 border border-border px-3 py-2 text-small">
          <span aria-hidden className={cx("size-2.5 rounded-full", LIGHT[x.light])} />
          <span className="font-medium">{cols[x.metric] ?? x.metric}</span>
          <span className="tabular">{formatNumber(x.actual, locale)} / {formatNumber(x.target, locale)}</span>
          <span className="text-fg-subtle">{k[x.light]}</span>
        </li>
      ))}
    </ul>
  );
}

type View = { id: string; name: string; filters: Record<string, string> };
/** F-RPT-06: per-user saved filter sets for this report. */
function SavedViews({ reportKey, current }: { reportKey: ReportKey; current: Record<string, string> }) {
  const { locale } = useI18n();
  const k = reportSubscribeCopy(locale);
  const toast = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const key = ["reports", "views", reportKey];
  const q = useQuery({ queryKey: key, queryFn: () => unwrap<{ items: View[] }>(api.GET("/api/reports/{key}/views", { params: { path: { key: reportKey } } })) });
  const save = useMutation({
    mutationFn: () => unwrap(api.POST("/api/reports/{key}/views", { params: { path: { key: reportKey } }, body: { name, filters: current } })),
    onSuccess: () => (void qc.invalidateQueries({ queryKey: key }), setOpen(false), setName("")),
    onError: () => toast({ title: k.failed, tone: "danger" }),
  });
  const del = useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE("/api/reports/views/{id}", { params: { path: { id } } })),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
  });
  return (
    <>
      {(q.data?.items ?? []).map((v) => (
        <span key={v.id} className="inline-flex items-center">
          <button type="button" onClick={() => setUrlParams({ from: v.filters.from ?? null, to: v.filters.to ?? null, group: v.filters.group ?? null })} className="h-8 bg-bg-subtle px-3 text-small hover:bg-border-strong">{v.name}</button>
          <button type="button" aria-label={`${k.deleteView}: ${v.name}`} onClick={() => del.mutate(v.id)} className="h-8 px-2 text-small text-fg-subtle hover:text-fg"><Icon name="x" size={12} aria-hidden /></button>
        </span>
      ))}
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{k.saveView}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={k.saveView}
        footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>{k.cancel}</Button><Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>{k.saveView}</Button></div>}>
        <label className="grid gap-1 text-small font-medium">{k.viewName}<Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
      </Dialog>
    </>
  );
}

type MetricDef = { key: string; unit: string; owner: string; label: Record<string, string>; definition: Record<string, string> };
/** F-RPT-11: data definitions page — the server's metric registry, the same text every report frame and export carries. */
export function MetricDefinitions() {
  const { locale } = useI18n();
  const k = reportSubscribeCopy(locale);
  const c = useRp();
  const q = useQuery({ queryKey: ["reports", "definitions"], queryFn: () => unwrap<{ items: MetricDef[] }>(api.GET("/api/reports/definitions")) });
  const back = <Link href={localHref(locale, "/finance/reports")} className="mb-2 inline-flex items-center gap-1.5 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{c.back}</Link>;
  return (
    <div className="grid gap-4">
      <PageHead title={k.definitions} back={back} />
      {q.isError ? <PanelError what={c.failed} onRetry={() => q.refetch()} />
        : !q.data ? <div aria-hidden className="h-40 m-shimmer" />
        : !q.data.items.length ? <EmptyPanel title={c.empty.rows} body={c.empty.rowsBody} />
        : (
          <dl className="grid gap-px border border-border bg-border">
            {q.data.items.map((m) => (
              <div key={m.key} className="grid gap-1 bg-white p-4 sm:grid-cols-[14rem_1fr]">
                <dt className="font-medium">{m.label[locale] ?? m.label.en} <span className="text-eyebrow text-fg-subtle">· {m.unit}</span></dt>
                <dd className="text-small text-fg-muted">{m.definition[locale] ?? m.definition.en}</dd>
              </div>
            ))}
          </dl>
        )}
    </div>
  );
}

type TargetRow = { id: string; report: ReportKey; metric: string; monthly: number; direction: "up" | "down" };
/** F-RPT-10 executive targets screen: set / remove a monthly target per report metric. */
export function ReportTargets() {
  const { locale } = useI18n();
  const k = reportSubscribeCopy(locale);
  const c = useRp();
  const toast = useToast();
  const qc = useQueryClient();
  const [report, setReport] = useState<ReportKey>(REPORT_KEYS[0]);
  const [metric, setMetric] = useState("");
  const [monthly, setMonthly] = useState("");
  const [direction, setDirection] = useState<"up" | "down">("up");
  const list = useQuery({ queryKey: ["reports", "targets"], queryFn: () => unwrap<{ items: TargetRow[] }>(api.GET("/api/reports/targets")) });
  const cols = useReport(report, "");
  const metrics = cols.data?.columns.map((x) => x.key) ?? [];
  const save = useMutation({
    mutationFn: (b: { report: ReportKey; metric: string; monthly: number; direction: "up" | "down" }) => unwrap(api.PUT("/api/reports/targets", { body: b })),
    onSuccess: () => (void qc.invalidateQueries({ queryKey: ["reports", "targets"] }), setMonthly(""), toast({ title: k.saved.split(".")[0], tone: "success" })),
    onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }),
  });
  const m = metric || metrics[0] || "";
  const amount = Number(monthly);
  return (
    <div className="grid gap-6">
      <PageHead title={k.targetsTitle} sub={k.targetsLede} />
      <form className="grid gap-3 border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end" onSubmit={(e) => { e.preventDefault(); if (m && amount > 0) save.mutate({ report, metric: m, monthly: amount, direction }); }}>
        <label className="grid gap-1 text-small font-medium">{k.report}
          <Select value={report} onChange={(e) => (setReport(e.target.value as ReportKey), setMetric(""))}>{REPORT_KEYS.map((r) => <option key={r} value={r}>{c.reports[r].title}</option>)}</Select>
        </label>
        <label className="grid gap-1 text-small font-medium">{k.metric}
          <Select value={m} onChange={(e) => setMetric(e.target.value)} disabled={!metrics.length}>{metrics.map((x) => <option key={x} value={x}>{c.cols[x] ?? x}</option>)}</Select>
        </label>
        <label className="grid gap-1 text-small font-medium">{k.monthlyTarget}
          <Input inputMode="numeric" value={monthly} onChange={(e) => setMonthly(e.target.value.replace(/\D/g, ""))} />
        </label>
        <label className="grid gap-1 text-small font-medium">{k.direction}
          <Select value={direction} onChange={(e) => setDirection(e.target.value as "up" | "down")}><option value="up">{k.up}</option><option value="down">{k.down}</option></Select>
        </label>
        <Button type="submit" disabled={!m || !(amount > 0) || save.isPending}>{k.setTarget}</Button>
      </form>
      {list.isError ? <PanelError what={k.targetsTitle} onRetry={() => list.refetch()} />
        : !list.data ? <div aria-hidden className="h-24 m-shimmer" />
        : !list.data.items.length ? <EmptyPanel title={k.none} compact />
        : (
          <div role="region" aria-label={k.targetsTitle} tabIndex={0} className="overflow-x-auto border border-border">
            <table className="w-full min-w-[32rem] text-small">
              <thead className="bg-ink-100 text-eyebrow text-fg-subtle"><tr><th className="p-3 text-left">{k.report}</th><th className="p-3 text-left">{k.metric}</th><th className="p-3 text-right">{k.monthlyTarget}</th><th className="p-3 text-left">{k.direction}</th><th className="p-3"><span className="sr-only">{k.remove}</span></th></tr></thead>
              <tbody>
                {list.data.items.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="p-3">{c.reports[t.report]?.title ?? t.report}</td>
                    <td className="p-3">{c.cols[t.metric] ?? t.metric}</td>
                    <td className="p-3 text-right tabular">{formatNumber(t.monthly, locale)}</td>
                    <td className="p-3">{t.direction === "up" ? k.up : k.down}</td>
                    <td className="p-3 text-right"><Button size="sm" variant="outline" disabled={save.isPending} onClick={() => save.mutate({ report: t.report, metric: t.metric, monthly: 0, direction: t.direction })}>{k.remove}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
