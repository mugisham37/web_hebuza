"use client";
// U16 Operations (plan 06 §7 U16, board 13 v2 with §3 fixes: system shell, posture checks not an invented score,
// spec backup tiers, no phone numbers — "On-call: see runbook").
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatDateTime, formatRelative } from "@/shared/format";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import type { Locale } from "@/shared/i18n/config";
import { Tabs } from "@/components/atoms/tabs";
import { Button } from "@/components/atoms/button";
import { Checkbox, Field, Input, Radio, Select, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, KpiTile, Panel } from "@/components/molecules/ops/ops";
import { Sparkline } from "@/components/atoms/ops";
import { useNow } from "@/components/atoms/step-up";
import { useOnline } from "@/components/atoms/hooks";
import { systemOps, type SystemOps } from "@/content/pages/system-ops";
import { fill } from "@/content/pages/system-common";
import {
  useBackups, useCreateIncident, useDependencies, useDrills, useIncidents, useMonitoring, usePosture, useRestore, useStatusPost,
} from "@/lib/system/f";
import { RTO_MINUTES } from "@/shared/system/incidents";
import type { BackupVM, Health, IncidentVM } from "@/shared/system/types";
import { PostureCheck, SysPageHead, UptimeBars } from "@/components/molecules/system/system";
import { HealthPill, SevPill, SysArt, useRoleLabel, useS } from "@/components/atoms/system";
import { FDialog, Gate, Pill, STable, useFail, useStepped } from "@/components/molecules/system/system";

const TABS = ["monitoring", "backups", "incidents", "security", "dependencies"] as const;
type Tab = (typeof TABS)[number];
const useC = () => systemOps(useI18n().locale);
const LOCALES: Locale[] = ["rw", "en", "fr"];

export function OpsView() {
  const c = useC();
  const p = useUrlParams();
  const tab = (TABS as readonly string[]).includes(p.get("tab") ?? "") ? (p.get("tab") as Tab) : "monitoring";
  const body: Record<Tab, ReactNode> = { monitoring: <Monitoring />, backups: <Backups />, incidents: <Incidents />, security: <Security />, dependencies: <Dependencies /> };
  return (
    <div className="m-rise">
      <SysPageHead title={c.title} sub={c.sub} />
      <Kpis />
      <Tabs className="mt-6" value={tab} onChange={(t) => setUrlParams({ tab: t === "monitoring" ? null : t })} tabs={TABS.map((t) => ({ id: t, label: c.tabs[t], content: body[t] }))} />
    </div>
  );
}

// ---------------------------------------------------------------- KPI strip (each tile fails on its own)
function Kpis() {
  const c = useC();
  const { locale } = useI18n();
  const now = useNow(60_000);
  const mon = useMonitoring(), bk = useBackups(), inc = useIncidents(), pos = usePosture();
  const avg = mon.data ? mon.data.uptime.reduce((n, d) => n + d.up, 0) / Math.max(1, mon.data.uptime.length) : null;
  const last = bk.data?.items.filter((b) => b.ok).sort((a, b) => b.at.localeCompare(a.at))[0];
  const lastFailed = bk.data?.items.slice().sort((a, b) => b.at.localeCompare(a.at))[0]?.ok === false;
  const open = inc.data?.items.filter((i) => i.status !== "resolved" && i.status !== "postmortem_done").length;
  const pass = pos.data?.items.filter((p) => p.status === "pass").length;
  const dash = (q: { isError: boolean }) => (q.isError ? "—" : <span className="inline-block h-8 w-20 m-shimmer" aria-hidden />);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 m-stagger">
      <div style={{ ["--i" as string]: 0 }}><KpiTile icon="chart" label={c.kpi.uptime} value={avg !== null ? `${(avg * 100).toFixed(2)}%` : dash(mon)} spark={mon.data?.p95.slice(-24)} /></div>
      <div style={{ ["--i" as string]: 1 }}><KpiTile icon="layers" tone={lastFailed ? "danger" : "neutral"} label={c.kpi.lastBackup} value={last && now ? formatRelative(last.at, locale, now) : dash(bk)} note={lastFailed ? c.kpi.failed : last ? `${last.sizeMb.toLocaleString()} MB` : undefined} href={localHref(locale, "/system/ops?tab=backups")} /></div>
      <div style={{ ["--i" as string]: 2 }}><KpiTile icon="zap" tone={open ? "danger" : "neutral"} label={c.kpi.openIncidents} value={open ?? dash(inc)} note={open === 0 ? c.kpi.allClear : undefined} href={localHref(locale, "/system/ops?tab=incidents")} /></div>
      <div style={{ ["--i" as string]: 3 }}><KpiTile icon="shield" tone={pos.data && pass !== pos.data.items.length ? "warning" : "neutral"} label={c.kpi.posture} value={pos.data ? fill(c.kpi.postureVal, { n: pass ?? 0, t: pos.data.items.length }) : dash(pos)} href={localHref(locale, "/system/ops?tab=security")} /></div>
    </div>
  );
}

// ---------------------------------------------------------------- monitoring
function Monitoring() {
  const c = useC();
  const { locale } = useI18n();
  const now = useNow(30_000);
  const online = useOnline();
  const q = useMonitoring();
  const [post, setPost] = useState(false);
  return (
    <Gate q={q} what={c.tabs.monitoring} rows={6}>
      {(d) => (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Panel title={c.mon.p95} action={<span className="flex items-center gap-2 text-eyebrow text-fg-muted"><span aria-hidden className="h-0 w-4 border-t-2 border-dashed border-navy-300" />{fill(c.mon.target, { ms: d.targetMs })}</span>}>
            <P95Chart values={d.p95} target={d.targetMs} label={fill(c.mon.chartLabel, { ms: d.p95.at(-1) ?? 0, t: d.targetMs })} />
          </Panel>
          <Panel title={c.mon.components} action={<Button size="sm" variant="outline" className="m-press" disabled={!online} onClick={() => setPost(true)}><Icon name="megaphone" size={14} aria-hidden />{c.mon.post}</Button>}>
            <ul className="grid">
              {d.components.map((x) => (
                <li key={x.key} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2.5 last:border-0">
                  <span className="min-w-0 text-small"><span className="block font-medium">{x.name}</span><span className="text-eyebrow text-fg-subtle">{x.detail}{now ? ` · ${fill(c.mon.checked, { t: formatRelative(x.checkedAt, locale, now) })}` : ""}</span></span>
                  <HealthPill health={x.health} className="m-tone" />
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title={c.mon.errorRate} action={<strong className={cx("tabular text-label", d.errorPct > 1 && "text-danger")}>{d.errorPct}%</strong>}>
            <span className={d.errorPct > 1 ? "text-danger" : "text-navy-700"}><Sparkline values={d.errorRate} /></span>
          </Panel>
          <Panel title={c.mon.slow}>
            <ol className="grid gap-1.5">
              {d.slow.map((s, i) => (
                <li key={s.path} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-2 text-small">
                  <span className="text-eyebrow text-fg-subtle tabular">{i + 1}</span>
                  <code className="min-w-0 truncate font-mono text-[0.78rem]" title={s.path}>{s.path}</code>
                  <span className={cx("tabular", s.p95 > d.targetMs * 0.75 && "text-warning")}>{s.p95} ms</span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title={c.mon.jobs}>
            {d.jobs.length === 0 ? <p className="text-small text-fg-muted">{c.mon.noJobs}</p> : (
              <ul className="grid gap-2">{d.jobs.map((j) => <li key={j.name} className="flex flex-wrap justify-between gap-2 text-small"><code className="font-mono">{j.name}</code><span><Pill tone={j.failures > 5 ? "danger" : "warning"}>{j.failures}×</Pill> <span className="text-eyebrow text-fg-subtle">{formatDateTime(j.lastAt, locale)}</span></span></li>)}</ul>
            )}
          </Panel>
          <Panel title={c.mon.uptime}><UptimeBars days={d.uptime} /></Panel>
          <Panel title={c.mon.links} className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              {d.links.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 border border-border px-4 text-small font-medium hover:bg-navy-50 m-press">
                  {l.label}<Icon name="arrowUpRight" size={14} aria-hidden /><span className="sr-only">{c.mon.newTab}</span>
                </a>
              ))}
              <span className="ml-auto flex items-center gap-2 text-small text-fg-muted"><Icon name="phone" size={14} aria-hidden />{c.mon.onCall}</span>
            </div>
          </Panel>
          {post && <StatusDialog components={d.components.map((x) => ({ key: x.key, name: x.name }))} onClose={() => setPost(false)} />}
        </div>
      )}
    </Gate>
  );
}

/** p95 area line with a dashed target; y scaled to max(target·1.5, peak). */
function P95Chart({ values, target, label }: { values: number[]; target: number; label: string }) {
  const W = 600, H = 180, top = Math.max(target * 1.5, ...values);
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * W;
  const y = (v: number) => H - (v / top) * H;
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return (
    <figure className="grid gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="none" className="h-44 w-full overflow-visible text-navy-700">
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} className="stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
        <path d={`${line}L${W},${H}L0,${H}Z`} className="fill-navy-100" />
        <path d={line} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" className="m-tick" style={{ ["--len" as string]: 2000 }} />
        <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="currentColor" strokeOpacity={0.5} strokeDasharray="6 5" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="flex justify-between text-eyebrow text-fg-subtle tabular"><span>−48 h</span><span>{values.at(-1)} ms</span></figcaption>
    </figure>
  );
}

function StatusDialog({ components, onClose }: { components: { key: string; name: string }[]; onClose: () => void }) {
  const c = useC().status;
  const s = useS();
  const toast = useToast();
  const fail = useFail();
  const mut = useStatusPost();
  const [component, setComponent] = useState(components[0]?.key ?? "");
  const [state, setState] = useState<Health>("degraded");
  const [msg, setMsg] = useState<Record<Locale, string>>({ rw: "", en: "", fr: "" });
  const [err, setErr] = useState<string>();
  const submit = async () => {
    if (!LOCALES.every((l) => msg[l].trim())) return setErr(c.msgErr);
    setErr(undefined);
    try { await mut.mutateAsync({ component, state, message: msg }); toast({ tone: "success", title: c.posted }); onClose(); }
    catch (e) { fail(e); }
  };
  return (
    <FDialog open onClose={onClose} title={c.title} description={c.note}
      footer={<><Button variant="ghost" onClick={onClose}>{s.common.cancel}</Button><Button loading={mut.isPending} onClick={submit}>{c.submit}</Button></>}>
      <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={c.component}>{(i) => <Select id={i.id} value={component} onChange={(e) => setComponent(e.target.value)}>{components.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</Select>}</Field>
          <Field label={c.state}>{(i) => <Select id={i.id} value={state} onChange={(e) => setState(e.target.value as Health)}>{(["operational", "degraded", "down", "maintenance"] as const).map((h) => <option key={h} value={h}>{s.health[h]}</option>)}</Select>}</Field>
        </div>
        {err && <p role="alert" className="text-small font-medium text-danger">{err}</p>}
        {LOCALES.map((l) => (
          <Field key={l} label={fill(c.message, { lang: l.toUpperCase() })}>{(i) => <Textarea id={i.id} rows={2} lang={l} aria-invalid={!!err && !msg[l].trim()} value={msg[l]} onChange={(e) => setMsg({ ...msg, [l]: e.target.value })} />}</Field>
        ))}
      </form>
    </FDialog>
  );
}

// ---------------------------------------------------------------- backups + drills + launch gate
function Backups() {
  const c = useC();
  const { locale } = useI18n();
  const online = useOnline();
  const q = useBackups();
  const drills = useDrills();
  const [more, setMore] = useState(false);
  const [ask, setAsk] = useState<"staging" | "production" | null>(null);
  return (
    <Gate q={q} what={c.tabs.backups} rows={5}>
      {(d) => {
        const sorted = d.items.slice().sort((a, b) => b.at.localeCompare(a.at));
        const last = sorted.find((b) => b.ok);
        const shown = more ? sorted : sorted.slice(0, 8);
        return (
          <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <Panel title={c.backups.last}>
                {last ? (
                  <div className="flex items-start gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-success text-white"><Icon name="check" size={24} aria-hidden /></span>
                    <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-small">
                      <dt className="text-fg-subtle">{c.backups.when}</dt><dd>{formatDateTime(last.at, locale)}</dd>
                      <dt className="text-fg-subtle">{c.backups.size}</dt><dd className="tabular">{last.sizeMb.toLocaleString()} MB</dd>
                      <dt className="text-fg-subtle">{c.backups.encryption}</dt><dd>{last.encrypted ? <code className="font-mono">age</code> : <Pill tone="danger">{c.backups.failed}</Pill>}</dd>
                      <dt className="text-fg-subtle">{c.backups.offsite}</dt><dd>{last.location}</dd>
                    </dl>
                  </div>
                ) : <p className="text-small text-danger">{c.backups.failed}</p>}
              </Panel>
              <Panel title={c.backups.tiers}>
                <ul className="grid grid-cols-2 gap-2">
                  {d.tiers.map((t) => (
                    <li key={t.tier} className="bg-bg-subtle p-3 text-small"><span className="block font-medium">{c.backups.tierNames[t.tier]}</span><span className="text-fg-muted">{fill(c.backups.keep, { k: t.keep })}</span></li>
                  ))}
                </ul>
              </Panel>
            </div>

            <Panel title={c.backups.drills} action={<div className="flex flex-wrap gap-2">
              <Button size="sm" className="m-press" disabled={!online} onClick={() => setAsk("staging")}><Icon name="refresh" size={14} aria-hidden />{c.backups.staging}</Button>
              <Button size="sm" variant="outline" className="m-press" disabled={!online} onClick={() => setAsk("production")}>{c.backups.prod}</Button>
            </div>}>
              <Gate q={drills} what={c.backups.drills} rows={2}>
                {(dr) => (
                  <div className="grid gap-3">
                    <p role="status" className={cx("flex w-fit items-center gap-2 px-3 py-1.5 text-small font-medium m-tone", dr.gateOpen ? "bg-success-bg text-success" : "bg-danger-bg text-danger")}>
                      <Icon name={dr.gateOpen ? "shield" : "lock"} size={14} aria-hidden />{dr.gateOpen ? c.backups.gateOpen : c.backups.gateClosed}
                    </p>
                    {dr.items.length === 0 ? <EmptyPanel compact title={c.backups.noDrills} body={c.backups.noDrillsBody} /> : (
                      <ul className="grid gap-2 m-stagger">
                        {dr.items.map((x, i) => (
                          <li key={x.id} style={{ ["--i" as string]: Math.min(i, 6) }} className="flex flex-wrap items-center justify-between gap-2 border border-border p-3 text-small">
                            <span className="grid gap-0.5"><span className="font-medium">{formatDate(x.at, locale)} · {c.backups.drillType[x.type]}</span><span className="text-eyebrow text-fg-subtle">{fill(c.backups.report, { who: x.reportBy })}</span></span>
                            <span className="flex flex-wrap items-center gap-2">
                              <span className={cx("tabular", x.rtoMinutes > RTO_MINUTES && "text-danger")}>{fill(c.backups.rto, { m: x.rtoMinutes, t: RTO_MINUTES })}</span>
                              <Pill tone={x.ok ? "success" : "danger"}>{x.ok ? c.backups.ok : c.backups.failed}</Pill>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Gate>
            </Panel>

            <section aria-labelledby="bk-hist" className="grid gap-2">
              <h2 id="bk-hist" className="text-label-lg">{c.backups.history}</h2>
              <STable label={c.backups.history} head={[c.backups.when, c.backups.tier, c.backups.size, c.backups.encryption, c.backups.offsite, c.backups.result]}>
                {shown.map((b) => (
                  <tr key={b.id}>
                    <td data-label={c.backups.when} className="whitespace-nowrap">{formatDateTime(b.at, locale)}</td>
                    <td data-label={c.backups.tier}>{c.backups.tierNames[b.tier]}</td>
                    <td data-label={c.backups.size} className="tabular">{b.sizeMb.toLocaleString()} MB</td>
                    <td data-label={c.backups.encryption}>{b.encrypted ? "age" : "—"}</td>
                    <td data-label={c.backups.offsite}>{b.location}</td>
                    <td data-label={c.backups.result}><Pill tone={b.ok ? "success" : "danger"}>{b.ok ? c.backups.ok : c.backups.failed}</Pill></td>
                  </tr>
                ))}
              </STable>
              {!more && sorted.length > 8 && <Button size="sm" variant="ghost" className="w-fit" onClick={() => setMore(true)}>{fill(c.backups.more, { n: sorted.length - 8 })}</Button>}
            </section>
            {ask && <RestoreDialog target={ask} backups={sorted.filter((b) => b.ok)} onClose={() => setAsk(null)} />}
          </div>
        );
      }}
    </Gate>
  );
}

function RestoreDialog({ target, backups, onClose }: { target: "staging" | "production"; backups: BackupVM[]; onClose: () => void }) {
  const c = useC().backups;
  const s = useS();
  const { locale } = useI18n();
  const toast = useToast();
  const fail = useFail();
  const mut = useRestore();
  const { run, dialog } = useStepped();
  const [backupId, setBackupId] = useState(backups[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string>();
  const prod = target === "production";
  const role = useRoleLabel();
  const submit = async () => {
    if (prod && reason.trim().length < 10) return setErr(c.reasonErr);
    setErr(undefined);
    try {
      const r = await run(prod ? "production restore" : "restore to staging", (token) => mut.mutateAsync({ target, backupId: prod ? backupId : undefined, reason: prod ? reason.trim() : undefined, token }));
      if (!r) return;
      toast({ tone: "success", title: prod ? c.prodSent : c.stagingDone });
      onClose();
    } catch (e) { fail(e); }
  };
  return (
    <>
      <FDialog open onClose={onClose} title={prod ? c.prodTitle : c.stagingTitle} description={prod ? c.prodBody : c.stagingBody}
        footer={<><Button variant="ghost" onClick={onClose}>{s.common.cancel}</Button><Button variant={prod ? "danger" : "primary"} loading={mut.isPending} onClick={submit}>{prod ? c.prodGo : c.stagingGo}</Button></>}>
        {mut.isPending && !prod ? <div aria-busy="true" className="h-12 m-shimmer" /> : prod && (
          <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <Field label={c.point}>{(i) => <Select id={i.id} value={backupId} onChange={(e) => setBackupId(e.target.value)}>{backups.slice(0, 20).map((b) => <option key={b.id} value={b.id}>{formatDateTime(b.at, locale)} · {c.tierNames[b.tier]}</option>)}</Select>}</Field>
            <Field label={c.reason} error={err}>{(i) => <Textarea id={i.id} rows={3} aria-describedby={i.describedBy} aria-invalid={i.invalid} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
            {/* Approver path shown before submit (prod_restore: executive + another sysadmin). */}
            <ol className="flex flex-wrap items-center gap-2 bg-info-bg p-3 text-small text-link">
              <li className="flex items-center gap-1.5"><Icon name="users" size={14} aria-hidden />{role("staff:sysadmin")}</li><li aria-hidden>+</li><li>{role("staff:executive")}</li>
            </ol>
          </form>
        )}
      </FDialog>
      {dialog}
    </>
  );
}

// ---------------------------------------------------------------- incidents
const OPEN_STATES: IncidentVM["status"][] = ["open", "investigating", "mitigated"];
export function IncidentStatusPill({ status, c }: { status: IncidentVM["status"]; c: SystemOps }) {
  const tone = status === "open" ? "danger" : status === "investigating" ? "warning" : status === "mitigated" ? "info" : "success";
  return <Pill tone={tone} className="m-tone">{c.incidents.statuses[status]}</Pill>;
}
function Incidents() {
  const c = useC();
  const { locale } = useI18n();
  const now = useNow(60_000);
  const online = useOnline();
  const q = useIncidents();
  const [creating, setCreating] = useState(false);
  const p = useUrlParams();
  // Deep links: ?dialog=new (command menu) or ?new=1&sev=&title= (user-detail compromise flow).
  const fromUrl = p.get("dialog") === "new" || p.get("new") === "1";
  const sevQ = Number(p.get("sev"));
  const prefill = { title: p.get("title") ?? "", sev: (sevQ === 1 || sevQ === 3 ? sevQ : 2) as 1 | 2 | 3 };
  const close = () => { setCreating(false); if (fromUrl) setUrlParams({ dialog: null, new: null, sev: null, title: null }); };
  const comps = useMonitoring().data?.components;
  return (
    <Gate q={q} what={c.incidents.list}>
      {(d) => {
        const open = d.items.filter((i) => OPEN_STATES.includes(i.status));
        const closed = d.items.filter((i) => !OPEN_STATES.includes(i.status));
        const row = (i: IncidentVM, n: number) => (
          <li key={i.id} style={{ ["--i" as string]: Math.min(n, 6) }}>
            <Link href={localHref(locale, `/system/ops/incidents/${i.id}`)} className="grid gap-2 border border-border bg-surface p-4 m-lift hover:border-navy-300 sm:grid-cols-[1fr_auto] sm:items-center">
              <span className="grid min-w-0 gap-1">
                <span className="flex flex-wrap items-center gap-2"><SevPill sev={i.sev} /><span className="font-mono text-eyebrow text-fg-subtle">{i.id}</span></span>
                <span className="text-label">{i.title}</span>
                <span className="text-eyebrow text-fg-subtle">{i.components.join(" · ")} · {now ? fill(c.incidents.started, { t: formatRelative(i.startedAt, locale, now) }) : formatDateTime(i.startedAt, locale)}</span>
              </span>
              <span className="flex items-center gap-2"><IncidentStatusPill status={i.status} c={c} /><Icon name="arrowRight" size={16} aria-hidden className="text-fg-subtle" /></span>
            </Link>
          </li>
        );
        return (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-label-lg">{c.incidents.open} <span className="text-fg-muted tabular">({open.length})</span></h2>
              <Button size="sm" variant="danger" className="m-press" disabled={!online} onClick={() => setCreating(true)}><Icon name="plus" size={14} aria-hidden />{c.incidents.new}</Button>
            </div>
            {open.length === 0 ? (
              <div className="grid place-items-center gap-3 border border-border bg-surface px-6 py-12 text-center">
                <SysArt name="shield" className="text-navy-700" />
                <p className="text-h3">{c.incidents.empty}</p>
                <p className="max-w-sm text-small text-fg-muted">{c.incidents.emptyBody}</p>
              </div>
            ) : <ul className="grid gap-3 m-stagger">{open.map(row)}</ul>}
            {closed.length > 0 && (
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-label text-fg-muted hover:text-fg">
                  <Icon name="chevronDown" size={16} aria-hidden className="transition-transform group-open:rotate-180" />{c.incidents.closed} ({closed.length})
                </summary>
                <ul className="mt-3 grid gap-3 m-collapse">{closed.map(row)}</ul>
              </details>
            )}
            {(creating || fromUrl) && <CreateIncident prefill={fromUrl ? prefill : undefined} components={comps?.map((x) => x.name) ?? ["API", "Worker heartbeat", "Database", "Redis", "Storage", "Queues"]} onClose={close} />}
          </div>
        );
      }}
    </Gate>
  );
}
function CreateIncident({ components, onClose, prefill }: { components: string[]; onClose: () => void; prefill?: { title: string; sev: 1 | 2 | 3 } }) {
  const c = useC().incidents;
  const s = useS();
  const toast = useToast();
  const fail = useFail();
  const mut = useCreateIncident();
  const [f, setF] = useState({ title: prefill?.title ?? "", sev: prefill?.sev ?? (2 as 1 | 2 | 3), comps: [] as string[], start: "", impact: "" });
  const [err, setErr] = useState<{ title?: string; impact?: string; comps?: string }>({});
  const submit = async () => {
    const e = { title: f.title.trim() ? undefined : c.titleErr, impact: f.impact.trim() ? undefined : c.impactErr, comps: f.comps.length ? undefined : c.compErr };
    setErr(e);
    if (e.title || e.impact || e.comps) return;
    try {
      const inc = await mut.mutateAsync({ title: f.title.trim(), sev: f.sev, components: f.comps, startedAt: f.start ? new Date(f.start).toISOString() : "", impact: f.impact.trim() });
      toast({ tone: "success", title: c.created, body: inc.id });
      onClose();
    } catch (x) { fail(x); }
  };
  return (
    <FDialog open onClose={onClose} title={c.new}
      footer={<><Button variant="ghost" onClick={onClose}>{s.common.cancel}</Button><Button variant="danger" loading={mut.isPending} onClick={submit}>{c.create}</Button></>}>
      <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label={c.titleL} error={err.title}>{(i) => <Input id={i.id} autoFocus aria-describedby={i.describedBy} aria-invalid={i.invalid} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-label">{c.sev}</legend>
          {([1, 2, 3] as const).map((n) => <Radio key={n} name="sev" checked={f.sev === n} onChange={() => setF({ ...f, sev: n })} label={<span className="flex flex-wrap items-center gap-2"><SevPill sev={n} /><span className="text-small text-fg-muted">{c.sevHint[n]}</span></span>} />)}
        </fieldset>
        <fieldset className="grid gap-2" aria-describedby={err.comps ? "inc-comp-err" : undefined}>
          <legend className="mb-1 text-label">{c.components}</legend>
          {err.comps && <p id="inc-comp-err" className="text-small font-medium text-danger">{err.comps}</p>}
          <div className="grid grid-cols-2 gap-2">
            {components.map((x) => <Checkbox key={x} label={x} checked={f.comps.includes(x)} onChange={(e) => setF({ ...f, comps: e.target.checked ? [...f.comps, x] : f.comps.filter((y) => y !== x) })} />)}
          </div>
        </fieldset>
        <Field label={c.start} optional={s.common.optional}>{(i) => <Input id={i.id} type="datetime-local" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />}</Field>
        <Field label={c.impact} error={err.impact}>{(i) => <Textarea id={i.id} rows={3} aria-describedby={i.describedBy} aria-invalid={i.invalid} value={f.impact} onChange={(e) => setF({ ...f, impact: e.target.value })} />}</Field>
      </form>
    </FDialog>
  );
}

// ---------------------------------------------------------------- security posture (+ live same-origin headers)
const LIVE = ["strict-transport-security", "content-security-policy", "content-security-policy-report-only", "cross-origin-opener-policy", "cross-origin-resource-policy", "permissions-policy"];
function Security() {
  const c = useC();
  const q = usePosture();
  // Live HEAD on this origin: what the deployment actually sends (not declared).
  const live = useQuery({
    queryKey: ["system", "f", "live-headers"],
    queryFn: async () => { const r = await fetch(location.origin, { method: "HEAD", cache: "no-store" }); return LIVE.map((h) => ({ h, v: r.headers.get(h) })); },
    staleTime: 60_000,
  });
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <Panel title={c.security.title}>
        <Gate q={q} what={c.security.title}>{(d) => <ul>{d.items.map((p) => <PostureCheck key={p.id} check={p} />)}</ul>}</Gate>
      </Panel>
      <Panel title={c.security.live}>
        <Gate q={live} what={c.security.live} rows={3}>
          {(rows) => (
            <ul className="grid gap-2">
              {rows.map(({ h, v }) => (
                <li key={h} className="grid gap-0.5 bg-bg-subtle p-3">
                  <span className="flex items-center justify-between gap-2"><code className="font-mono text-[0.78rem] font-medium">{h}</code><Pill tone={v ? "success" : "warning"}>{v ? "✓" : "—"}</Pill></span>
                  <span className="break-all font-mono text-[0.72rem] text-fg-muted">{v ? v.slice(0, 160) : c.security.liveMissing}</span>
                </li>
              ))}
            </ul>
          )}
        </Gate>
        <p className="mt-3 text-eyebrow text-fg-subtle">TLS · encryption: {c.security.declared}</p>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- dependencies
function Dependencies() {
  const c = useC();
  const { locale } = useI18n();
  const q = useDependencies();
  return (
    <Gate q={q} what={c.tabs.dependencies}>
      {(d) => (
        <div className="grid gap-4">
          <p className="flex w-fit items-center gap-2 bg-info-bg px-3 py-1.5 text-small text-link"><Icon name="calendar" size={14} aria-hidden />{fill(c.deps.window, { t: formatDate(d.nextWindow, locale) })}</p>
          {d.items.length === 0 ? <EmptyPanel title={c.deps.empty} /> : (
            <STable label={c.tabs.dependencies} head={[c.deps.pkg, c.deps.change, c.deps.type, c.deps.merged, c.deps.cves]}>
              {d.items.map((x) => (
                <tr key={x.id}>
                  <td data-label={c.deps.pkg}><code className="font-mono">{x.pkg}</code></td>
                  <td data-label={c.deps.change} className="font-mono text-[0.8rem] whitespace-nowrap">{x.from} → {x.to}</td>
                  <td data-label={c.deps.type}><Pill tone={x.type === "security" ? "danger" : x.type === "major" ? "warning" : "neutral"}>{c.deps.types[x.type]}</Pill></td>
                  <td data-label={c.deps.merged}>{formatDate(x.mergedAt, locale)}</td>
                  <td data-label={c.deps.cves} className="font-mono text-[0.78rem]">{x.cves.length ? x.cves.join(", ") : c.deps.none}</td>
                </tr>
              ))}
            </STable>
          )}
        </div>
      )}
    </Gate>
  );
}
