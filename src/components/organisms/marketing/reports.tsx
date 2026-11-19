"use client";
// U18 Reports (board marketing/12 v2): tabs in the URL, range + attribution model, export with reason, social import.
import { Fragment, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { formatDate, formatMoney, formatNumber } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { ApiError, newIdempotencyKey } from "@/lib/api/client";
import { addSocial, confirmSocial, importSocial, useAnalytics, useContentFeedback, type CampaignRow, type FunnelRow, type Range, type SocialRow, type Tab } from "@/lib/marketing/insights";
import { fill } from "@/content/pages/mkt-common";
import { Tabs } from "@/components/atoms/tabs";
import { Field, Input, Select, Textarea } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { Dialog } from "@/components/atoms/dialog";
import { useToast } from "@/components/atoms/toast";
import { KpiTile, Panel, PanelError, EmptyPanel } from "@/components/molecules/ops/ops";
import { PageHead, useM } from "@/components/atoms/marketing";
import { Bars, Button, ExportButton, FunnelChart, ModelToggle, RangePicker, Skel, Updated, useI, useRange } from "@/components/molecules/marketing/marketing";

const TABS: Tab[] = ["funnel", "campaigns", "leads", "traffic", "social", "clients"];

export function ReportsView() {
  const t = useI();
  const p = useUrlParams();
  const tab = (TABS.includes(p.get("tab") as Tab) ? p.get("tab") : "funnel") as Tab;
  const model = p.get("model") === "first" ? "first" : "last";
  const range = useRange("30d");
  return (
    <div className="grid gap-5">
      <PageHead title={t.rep.title} sub={t.rep.sub} actions={<ExportButton report={tab} range={range} model={model} />} />
      <div className="flex flex-wrap items-center gap-3"><RangePicker value={range} />{(tab === "funnel" || tab === "campaigns") && <ModelToggle value={model} />}</div>
      <Tabs value={tab} onChange={(id) => setUrlParams({ tab: id })} tabs={TABS.map((id) => ({
        id, label: t.rep.tabs[id],
        content: id !== tab ? null : id === "funnel" ? <FunnelTab r={range} model={model} /> : id === "campaigns" ? <CampaignsTab r={range} model={model} />
          : id === "leads" ? <LeadsTab r={range} /> : id === "traffic" ? <TrafficTab r={range} /> : id === "social" ? <SocialTab r={range} /> : <ClientsTab r={range} />,
      }))} />
    </div>
  );
}

function useTab<T>(tab: Tab, r: Range, model = "last", extra: Record<string, string | undefined> = {}) {
  return useAnalytics<T>(tab, r, model, extra);
}
function Frame<T>({ q, children }: { q: ReturnType<typeof useTab<T>>; children: (d: T & { generatedAt: string }) => React.ReactNode }) {
  const t = useI();
  if (q.isPending) return <div className="grid gap-3"><Skel className="h-10" /><Skel className="h-64" /></div>;
  if (q.isError) return <PanelError what={t.rep.title} onRetry={() => q.refetch()} />;
  return <div className="grid gap-4 m-rise">{children(q.data)}<Updated at={q.data.generatedAt} onRefresh={() => q.refetch()} /></div>;
}

function FunnelTab({ r, model }: { r: Range; model: string }) {
  const t = useI();
  const m = useM();
  const [source, setSource] = useState("");
  const q = useTab<{ steps: FunnelRow[]; months: { month: string; leads: number }[] }>("funnel", r, model, { source: source || undefined });
  return (
    <Frame q={q}>{(d) => (
      <>
        <label className="flex w-fit items-center gap-2 text-small">{t.rep.source}
          <Select value={source} onChange={(e) => setSource(e.target.value)} className="h-9 w-auto">
            <option value="">{t.rep.allSources}</option>
            {["facebook", "google", "whatsapp", "referral", "direct", "email"].map((s) => <option key={s} value={s}>{m.source[s] ?? s}</option>)}
          </Select>
        </label>
        <Panel title={`${t.dash.funnel} · ${t.rep.model[model]}`}><FunnelChart rows={d.steps} /></Panel>
        <Panel title={t.rep.months}>{d.months.every((x) => !x.leads) ? <EmptyPanel compact title={t.rep.empty} /> : <Bars items={d.months.map((x) => ({ label: x.month, value: x.leads }))} />}</Panel>
      </>
    )}</Frame>
  );
}

function CampaignsTab({ r, model }: { r: Range; model: string }) {
  const t = useI();
  const { locale } = useI18n();
  const q = useTab<{ rows: CampaignRow[] }>("campaigns", r, model);
  const [open, setOpen] = useState<string | null>(null);
  const money = (n: number) => formatMoney(n, "RWF", locale);
  const c = t.rep.col;
  return (
    <Frame q={q}>{(d) => !d.rows.length ? <EmptyPanel title={t.rep.empty} /> : (
      <div className="overflow-x-auto border border-border bg-white">
        <table className="w-full min-w-[56rem] text-left text-small">
          <thead className="bg-ink-100 text-ink-700"><tr>{[c.campaign, c.source, c.leads, c.consultations, c.requests, c.paid, c.revenue, c.cost, c.cpl, c.roi].map((h) => <th key={h} scope="col" className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{d.rows.map((row) => (
            <Fragment key={row.id}>
              <tr className="border-t border-border">
                <th scope="row" className="p-3 font-medium">
                  <button type="button" aria-expanded={open === row.id} onClick={() => setOpen(open === row.id ? null : row.id)} className="flex items-center gap-2 text-left hover:underline">
                    <span aria-hidden className={open === row.id ? "rotate-90 transition-transform" : "transition-transform"}>›</span>{row.name}<span className="text-eyebrow text-fg-subtle">{row.id}</span>
                  </button>
                </th>
                <td className="p-3">{row.source}</td>
                {[row.leads, row.consultations, row.requests, row.paid].map((n, i) => <td key={i} className="p-3 tabular">{formatNumber(n, locale)}</td>)}
                <td className="p-3 tabular">{money(row.revenue)}</td><td className="p-3 tabular">{money(row.cost)}</td>
                <td className="p-3 tabular">{row.cpl == null ? "—" : money(row.cpl)}</td><td className="p-3 tabular">{row.roi == null ? "—" : `${row.roi}%`}</td>
              </tr>
              {open === row.id && (
                <tr className="bg-bg-subtle"><td colSpan={10} className="p-3">
                  <p className="mb-2 text-eyebrow text-fg-subtle">{t.rep.chain} · {t.rep.model[model]}</p>
                  {row.chain?.length ? <ul className="grid gap-1">{row.chain.map((x) => (
                    <li key={x.invoiceNo} className="flex flex-wrap items-center gap-2 tabular">{x.leadId} <span aria-hidden>→</span> {x.client} <span aria-hidden>→</span> {x.invoiceNo} · {fill(t.rep.paidLine, { amount: money(x.total) })} · {formatDate(x.paidAt, locale)}</li>
                  ))}</ul> : <p className="text-fg-muted">{t.rep.chainNone}</p>}
                </td></tr>
              )}
            </Fragment>
          ))}</tbody>
        </table>
      </div>
    )}</Frame>
  );
}

type LeadsData = { total: number; bySource: { key: string; n: number }[]; byStage: { key: string; n: number }[]; lostReasons: { key: string; n: number }[]; ttfrHours: number | null; winRate: number | null };
function LeadsTab({ r }: { r: Range }) {
  const t = useI();
  const m = useM();
  const { locale } = useI18n();
  const q = useTab<LeadsData>("leads", r);
  return (
    <Frame q={q}>{(d) => (
      <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <KpiTile label={t.rep.leads.total} value={formatNumber(d.total, locale)} />
          <KpiTile label={t.rep.leads.ttfr} value={d.ttfrHours == null ? "—" : fill(t.rep.leads.hours, { n: d.ttfrHours })} />
          <KpiTile label={t.rep.leads.winRate} value={d.winRate == null ? "—" : `${d.winRate}%`} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title={t.rep.leads.bySource}><Bars items={d.bySource.map((x) => ({ label: t.rep.leadSource[x.key] ?? x.key, value: x.n }))} /></Panel>
          <Panel title={t.rep.leads.byStage}><Bars items={d.byStage.map((x) => ({ label: m.stage[x.key] ?? x.key, value: x.n }))} /></Panel>
          <Panel title={t.rep.leads.lost}>{d.lostReasons.length ? <Bars items={d.lostReasons.map((x) => ({ label: t.rep.lostReason[x.key] ?? x.key, value: x.n }))} /> : <p className="text-small text-fg-muted">{t.rep.leads.none}</p>}</Panel>
        </div>
      </>
    )}</Frame>
  );
}

type Traffic = { provider: "ga4" | "first_party"; sessions: number; users: number; sources: { source: string; sessions: number }[]; pages: { path: string; views: number }[] };
function TrafficTab({ r }: { r: Range }) {
  const t = useI();
  const m = useM();
  const { locale } = useI18n();
  const q = useTab<Traffic>("traffic", r);
  return (
    <Frame q={q}>{(d) => (
      <>
        <p className="w-fit bg-ink-100 px-3 py-1 text-eyebrow">{d.provider === "ga4" ? t.rep.traffic.ga4 : t.rep.traffic.first}</p>
        <div className="grid grid-cols-2 gap-3"><KpiTile label={t.rep.traffic.sessions} value={formatNumber(d.sessions, locale)} /><KpiTile label={t.rep.traffic.users} value={formatNumber(d.users, locale)} /></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={t.rep.traffic.sources}><Bars items={d.sources.map((x) => ({ label: m.source[x.source] ?? x.source, value: x.sessions }))} /></Panel>
          <Panel title={t.rep.traffic.pages}><Bars items={d.pages.map((x) => ({ label: x.path, value: x.views }))} /></Panel>
        </div>
        <HelpfulPanel />
      </>
    )}</Frame>
  );
}

function HelpfulPanel() {
  const t = useI();
  const q = useContentFeedback();
  if (q.error instanceof ApiError && q.error.isForbidden) return null; // no CMS read role: hide, not an error
  return (
    <Panel title={t.rep.traffic.helpful}>
      {q.isPending ? <Skel className="h-24" /> : q.isError ? <PanelError what={t.rep.traffic.helpful} onRetry={() => q.refetch()} />
        : !q.data.items.length ? <p className="text-small text-fg-muted">{t.rep.traffic.noVotes}</p>
        : <Bars max={100} format={(n) => `${n}%`} items={q.data.items.map((x) => ({ label: `${x.key} (${x.yes + x.no})`, value: Math.round((100 * x.yes) / Math.max(1, x.yes + x.no)) }))} />}
    </Panel>
  );
}

const SOCIAL_COLS = ["date", "network", "campaign", "reach", "impressions", "engagements", "clicks", "followers", "spend"] as const;
function SocialTab({ r }: { r: Range }) {
  const t = useI();
  const { locale } = useI18n();
  const toast = useToast();
  const q = useTab<{ rows: SocialRow[] }>("social", r);
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof importSocial>> | null>(null);
  const [key] = useState(() => newIdempotencyKey());
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const sc = t.rep.social;
  const runPreview = async (text: string) => {
    setBusy(true);
    try { setPreview(await importSocial(text)); } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
    setBusy(false);
  };
  const valid = preview?.rows.filter((x) => !x.error).length ?? 0;
  return (
    <Frame q={q}>{(d) => (
      <>
        <Panel title={sc.import} action={<a href="/templates/social-metrics.csv" className="text-small text-link underline underline-offset-4">{sc.template}</a>}>
          <div className="grid gap-3">
            <FileDrop accept=".csv,text/csv" maxSizeMb={2} onFiles={async (fs) => { const text = await fs[0]?.text(); if (text) { setCsv(text); runPreview(text); } }} />
            <Field label={sc.paste}>{({ id }) => <Textarea id={id} rows={3} value={csv} onChange={(e) => setCsv(e.target.value)} />}</Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" loading={busy} disabled={!csv.trim()} onClick={() => runPreview(csv)}>{sc.preview}</Button>
              <Button size="sm" variant="outline" onClick={() => setManual(true)}>{sc.manual}</Button>
            </div>
            {preview && (
              <div className="grid gap-2 overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-small">
                  <thead className="text-fg-subtle"><tr><th className="py-1">{sc.line}</th>{SOCIAL_COLS.map((c) => <th key={c}>{sc.col[c]}</th>)}<th>{sc.match}</th></tr></thead>
                  <tbody>{preview.rows.map((x) => (
                    <tr key={x.line} className={x.error ? "border-t border-border bg-danger-bg" : "border-t border-border"}>
                      <td className="py-1 tabular">{x.line}</td>
                      {x.error ? <td colSpan={SOCIAL_COLS.length + 1} className="text-danger">{sc.error[x.error] ?? x.error}</td> : <>
                        {SOCIAL_COLS.map((c) => <td key={c} className="tabular">{String(x.row[c])}</td>)}<td>{x.row.utmMatch ?? sc.noMatch}</td></>}
                    </tr>
                  ))}</tbody>
                </table>
                <Button size="sm" disabled={!valid} onClick={async () => {
                  try { const res = await confirmSocial(preview.id, key); toast({ title: fill(sc.done, { n: res.created }), tone: "success" }); setPreview(null); setCsv(""); q.refetch(); }
                  catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
                }}>{fill(sc.confirm, { n: valid })}</Button>
              </div>
            )}
          </div>
        </Panel>
        {!d.rows.length ? <EmptyPanel title={sc.none} /> : (
          <div className="overflow-x-auto border border-border bg-white">
            <table className="w-full min-w-[48rem] text-left text-small">
              <thead className="bg-ink-100 text-ink-700"><tr>{SOCIAL_COLS.map((c) => <th key={c} className="p-3 font-medium">{sc.col[c]}</th>)}<th className="p-3 font-medium">{sc.match}</th></tr></thead>
              <tbody>{d.rows.map((x) => (
                <tr key={x.id} className="border-t border-border">{SOCIAL_COLS.map((c) => <td key={c} className="p-3 tabular">{c === "spend" ? formatMoney(x.spend, "RWF", locale) : typeof x[c] === "number" ? formatNumber(x[c] as number, locale) : String(x[c])}</td>)}<td className="p-3">{x.utmMatch ?? sc.noMatch}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <ManualSocial open={manual} onClose={() => setManual(false)} onDone={() => { setManual(false); q.refetch(); toast({ title: sc.added, tone: "success" }); }} />
      </>
    )}</Frame>
  );
}

function ManualSocial({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const t = useI();
  const m = useM();
  const { locale } = useI18n();
  const [v, setV] = useState<Record<string, string>>({ network: "facebook" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sc = t.rep.social;
  const submit = async () => {
    const nums = ["reach", "impressions", "engagements", "clicks", "followers", "spend"] as const;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date ?? "")) return setErr(sc.error.date);
    if (nums.some((k) => !/^\d+$/.test(v[k] ?? "0"))) return setErr(sc.error.number);
    setBusy(true);
    try {
      await addSocial({ date: v.date, network: v.network, campaign: v.campaign ?? "", ...Object.fromEntries(nums.map((k) => [k, Number(v[k] ?? 0)])) } as Omit<SocialRow, "id" | "utmMatch">);
      setV({ network: "facebook" }); setErr(null); onDone();
    } catch (e) { setErr(errorCopy(e, locale)); }
    setBusy(false);
  };
  return (
    <Dialog open={open} onClose={onClose} title={sc.manual} footer={<><Button variant="outline" onClick={onClose}>{m.common.cancel}</Button><Button loading={busy} onClick={submit}>{m.common.save}</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {SOCIAL_COLS.map((c) => (
          <Field key={c} label={sc.col[c]}>
            {({ id }) => c === "network" ? <Select id={id} value={v.network} onChange={(e) => setV({ ...v, network: e.target.value })}>{["facebook", "instagram", "linkedin", "x", "tiktok"].map((n) => <option key={n}>{n}</option>)}</Select>
              : <Input id={id} type={c === "date" ? "date" : c === "campaign" ? "text" : "number"} min={0} step={1} inputMode={c === "date" || c === "campaign" ? undefined : "numeric"} value={v[c] ?? ""} onChange={(e) => setV({ ...v, [c]: e.target.value })} />}
          </Field>
        ))}
      </div>
      {err && <p role="alert" className="mt-3 text-small text-danger m-shake">{err}</p>}
    </Dialog>
  );
}

type Clients = { inactiveDays: number; newClients: number; returning: number; inactive: number; active: number; reactivationRate: number | null; renewalsDue: number | null };
function ClientsTab({ r }: { r: Range }) {
  const t = useI();
  const { locale } = useI18n();
  const q = useTab<Clients>("clients", r);
  const c = t.rep.clients;
  return (
    <Frame q={q}>{(d) => (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiTile label={c.new} value={formatNumber(d.newClients, locale)} />
        <KpiTile label={c.returning} value={formatNumber(d.returning, locale)} />
        <KpiTile label={c.active} value={formatNumber(d.active, locale)} />
        <KpiTile label={fill(c.inactive, { d: d.inactiveDays })} value={formatNumber(d.inactive, locale)} href={undefined} tone="warning" />
        <KpiTile label={c.reactivation} value={d.reactivationRate == null ? "—" : `${d.reactivationRate}%`} note={d.reactivationRate == null ? c.pending : undefined} />
        <KpiTile label={c.renewals} value={d.renewalsDue == null ? "—" : formatNumber(d.renewalsDue, locale)} note={d.renewalsDue == null ? c.pending : undefined} />
      </div>
    )}</Frame>
  );
}
