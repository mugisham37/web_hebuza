"use client";
// U15 Privacy (plan 06 §7 U15, board 12 with §3 fixes): data map, processors, retention + dry run, DSR queue.
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatDateTime, formatRelative } from "@/shared/format";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { Tabs } from "@/components/atoms/tabs";
import { Button } from "@/components/atoms/button";
import { Field, Input, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, Panel } from "@/components/molecules/ops/ops";
import { useNow } from "@/components/atoms/step-up";
import { useOnline } from "@/components/atoms/hooks";
import { systemPrivacy, type SystemPrivacy } from "@/content/pages/system-privacy";
import { fill } from "@/content/pages/system-common";
import {
  useDataMap, useDryRun, useDsrs, useProcessors, useRetention, useRetentionChange, useSaveProcessor, type DataMapRow, type ProcessorInput, type Visibility,
} from "@/lib/system/f";
import type { DsrVM, ProcessorVM, RetentionRow } from "@/shared/system/types";
import { PendingChangeBanner, SysPageHead } from "@/components/molecules/system/system";
import { useRoleLabel, useS } from "@/components/atoms/system";
import { FDialog, Gate, Pill, STable, useFail, useStepped } from "@/components/molecules/system/system";

const TABS = ["map", "processors", "retention", "requests"] as const;
type Tab = (typeof TABS)[number];
const useC = () => systemPrivacy(useI18n().locale);

export function PrivacyView() {
  const c = useC();
  const p = useUrlParams();
  const tab = (TABS as readonly string[]).includes(p.get("tab") ?? "") ? (p.get("tab") as Tab) : "map";
  const body: Record<Tab, ReactNode> = { map: <DataMap />, processors: <Processors />, retention: <Retention />, requests: <Requests /> };
  return (
    <div className="m-rise">
      <SysPageHead title={c.title} sub={c.sub} />
      <Tabs value={tab} onChange={(t) => setUrlParams({ tab: t === "map" ? null : t })} tabs={TABS.map((t) => ({ id: t, label: c.tabs[t], content: body[t] }))} />
    </div>
  );
}

// ---------------------------------------------------------------- data map
const VIS_TONE: Record<Visibility, "success" | "warning" | "purple" | "neutral"> = { full: "success", masked: "warning", own: "purple", none: "neutral" };
function Vis({ v, c }: { v: Visibility; c: SystemPrivacy }) {
  return <Pill tone={VIS_TONE[v]}>{v === "none" && <Icon name="lock" size={11} aria-hidden />}{c.map.vis[v]}</Pill>;
}
function DataMap() {
  const c = useC();
  const q = useDataMap();
  const role = useRoleLabel();
  const [view, setView] = useState<"category" | "role" | "location">("category");
  const { locale } = useI18n();
  return (
    <Gate q={q} what={c.tabs.map} rows={6}>
      {(d) => (
        <div className="grid gap-4">
          {d.residencyOpen && (
            <p role="note" className="flex items-start gap-3 border border-warning/30 bg-warning-bg p-4 text-small text-warning m-rise">
              <Icon name="globe" size={18} aria-hidden className="mt-0.5 shrink-0" />{c.residency}
            </p>
          )}
          <div role="radiogroup" aria-label={c.tabs.map} className="flex w-fit flex-wrap gap-1 bg-ink-100 p-1">
            {(["category", "role", "location"] as const).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)}
                className={cx("h-9 px-4 text-small font-medium m-press", view === v ? "bg-secondary text-on-secondary" : "text-fg-muted hover:text-fg")}>{c.map.views[v]}</button>
            ))}
          </div>
          {view === "category" && (
            <STable label={c.map.views.category} head={[c.map.category, c.map.stored, c.map.location, c.map.retention, c.map.visibility]}>
              {d.items.map((r) => (
                <tr key={r.category}>
                  <td data-label={c.map.category} className="font-medium">{r.category}</td>
                  <td data-label={c.map.stored}>{r.stored}</td>
                  <td data-label={c.map.location}><Loc v={r.location} c={c} /></td>
                  <td data-label={c.map.retention}>{r.retention}</td>
                  <td data-label={c.map.visibility}>
                    <ul className="flex flex-wrap justify-end gap-1 md:justify-start">
                      {d.roles.map((ro) => <li key={ro} className="flex items-center gap-1 text-eyebrow text-fg-muted"><span className="sr-only md:not-sr-only">{role(ro)}:</span><span className="md:hidden">{role(ro)}</span><Vis v={r.visibility[ro]} c={c} /></li>)}
                    </ul>
                  </td>
                </tr>
              ))}
            </STable>
          )}
          {view === "role" && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 m-stagger">
              {d.roles.map((ro, i) => (
                <section key={ro} style={{ ["--i" as string]: i }} className={cx("border bg-surface p-4", ro === "staff:sysadmin" ? "border-navy-300" : "border-border")}>
                  <h3 className="mb-3 text-label">{role(ro)}</h3>
                  <ul className="grid gap-1.5">
                    {d.items.map((r) => <li key={r.category} className="flex items-center justify-between gap-2 text-small"><span className="min-w-0">{r.category}</span><Vis v={r.visibility[ro]} c={c} /></li>)}
                  </ul>
                  {ro === "staff:sysadmin" && <p className="mt-3 flex gap-2 bg-info-bg p-3 text-small text-link"><Icon name="lock" size={14} aria-hidden className="mt-0.5 shrink-0" />{c.map.sysNote}</p>}
                </section>
              ))}
            </div>
          )}
          {view === "location" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(groupBy(d.items, (r) => r.location)).map(([loc, rows]) => (
                <Panel key={loc} title={<span className="flex items-center gap-2"><Icon name="mapPin" size={16} aria-hidden /><Loc v={loc} c={c} /></span>}>
                  <ul className="grid gap-2">{rows.map((r) => <li key={r.category} className="flex justify-between gap-3 text-small"><span className="font-medium">{r.category}</span><span className="text-right text-fg-muted">{r.stored}</span></li>)}</ul>
                </Panel>
              ))}
            </div>
          )}
          <Link href={localHref(locale, "/system/privacy?tab=retention")} onClick={(e) => { e.preventDefault(); setUrlParams({ tab: "retention" }); }} className="flex w-fit items-center gap-2 text-small font-medium text-link hover:underline">
            <Icon name="file" size={15} aria-hidden />{c.map.toRetention}<Icon name="arrowRight" size={14} aria-hidden />
          </Link>
        </div>
      )}
    </Gate>
  );
}
const groupBy = <T,>(xs: T[], k: (x: T) => string) => xs.reduce<Record<string, T[]>>((a, x) => ((a[k(x)] ??= []).push(x), a), {});
/** "EU (PLACEHOLDER)" → "EU · to confirm" (Q-PRV-02 unverified locations). */
function Loc({ v, c }: { v: string; c: SystemPrivacy }) {
  const unverified = /PLACEHOLDER/.test(v);
  const base = v.replace(/\s*\(?PLACEHOLDER\)?/, "").trim();
  return <span className="inline-flex flex-wrap items-center gap-1.5">{base || "—"}{unverified && <Pill tone="warning">{c.processors.toConfirm}</Pill>}</span>;
}

// ---------------------------------------------------------------- processors
function Processors() {
  const c = useC();
  const { locale } = useI18n();
  const q = useProcessors();
  const now = useNow(60_000);
  const online = useOnline();
  const [edit, setEdit] = useState<ProcessorVM | "new" | null>(null);
  return (
    <Gate q={q} what={c.processors.title}>
      {(d) => (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-label-lg">{c.processors.title} <span className="text-fg-muted tabular">({d.items.length})</span></h2>
            <Button size="sm" className="m-press" disabled={!online} onClick={() => setEdit("new")}><Icon name="plus" size={15} aria-hidden />{c.processors.add}</Button>
          </div>
          {d.items.length === 0 ? <EmptyPanel title={c.processors.empty} body={c.processors.emptyBody} action={<Button size="sm" disabled={!online} onClick={() => setEdit("new")}>{c.processors.add}</Button>} /> : (
            <STable label={c.processors.title} head={[c.processors.name, c.processors.purpose, c.processors.data, c.processors.location, c.processors.dpa, c.processors.review, ""]}>
              {d.items.map((p) => {
                const left = now ? Date.parse(p.reviewDue) - now : Infinity;
                return (
                  <tr key={p.id}>
                    <td data-label={c.processors.name} className="font-medium">{p.name}</td>
                    <td data-label={c.processors.purpose}>{p.purpose}</td>
                    <td data-label={c.processors.data} className="text-fg-muted">{p.data.join(", ") || "—"}</td>
                    <td data-label={c.processors.location}>{p.placeholder ? <span className="inline-flex flex-wrap gap-1.5">{p.location.replace("PLACEHOLDER", "").trim() || "—"}<Pill tone="warning">{c.processors.toConfirm}</Pill></span> : p.location}</td>
                    <td data-label={c.processors.dpa}>{p.dpaSignedAt ? formatDate(p.dpaSignedAt, locale) : <Pill tone="warning">{c.processors.notRecorded}</Pill>}</td>
                    <td data-label={c.processors.review} className="whitespace-nowrap">
                      {formatDate(p.reviewDue, locale)}{" "}
                      {left < 0 ? <Pill tone="danger">{c.processors.overdue}</Pill> : left < 30 * 86_400_000 && <Pill tone="warning">{c.processors.soon}</Pill>}
                    </td>
                    <td data-label="" className="text-right"><Button size="sm" variant="ghost" disabled={!online} onClick={() => setEdit(p)} aria-label={`${c.processors.edit} ${p.name}`}>{c.processors.edit}</Button></td>
                  </tr>
                );
              })}
            </STable>
          )}
          {edit && <ProcessorDialog key={edit === "new" ? "new" : edit.id} p={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
        </div>
      )}
    </Gate>
  );
}
function ProcessorDialog({ p, onClose }: { p: ProcessorVM | null; onClose: () => void }) {
  const c = useC().processors;
  const s = useS();
  const toast = useToast();
  const fail = useFail();
  const save = useSaveProcessor();
  const [f, setF] = useState({
    name: p?.name ?? "", purpose: p?.purpose ?? "", data: p?.data.join(", ") ?? "", location: p?.placeholder ? "" : p?.location ?? "",
    dpa: p?.dpaSignedAt?.slice(0, 10) ?? "", review: p?.reviewDue.slice(0, 10) ?? "",
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = c.nameErr;
    if (!f.purpose.trim()) e.purpose = c.purposeErr;
    if (!f.review) e.review = c.reviewErr;
    setErr(e);
    if (Object.keys(e).length) return;
    const body: ProcessorInput = {
      name: f.name.trim(), purpose: f.purpose.trim(), data: f.data.split(",").map((x) => x.trim()).filter(Boolean), location: f.location.trim(),
      dpaSignedAt: f.dpa ? new Date(f.dpa).toISOString() : null, reviewDue: new Date(f.review).toISOString(),
    };
    try { await save.mutateAsync({ id: p?.id, body }); toast({ tone: "success", title: c.saved }); onClose(); }
    catch (x) { fail(x); }
  };
  return (
    <FDialog open onClose={onClose} title={p ? `${c.edit} · ${p.name}` : c.add}
      footer={<><Button variant="ghost" onClick={onClose}>{s.common.cancel}</Button><Button loading={save.isPending} onClick={submit}>{c.save}</Button></>}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <Field label={c.name} error={err.name}>{(i) => <Input id={i.id} aria-describedby={i.describedBy} aria-invalid={i.invalid} value={f.name} onChange={set("name")} autoFocus />}</Field>
        <Field label={c.purpose} error={err.purpose}>{(i) => <Input id={i.id} aria-describedby={i.describedBy} aria-invalid={i.invalid} value={f.purpose} onChange={set("purpose")} />}</Field>
        <Field label={c.data} hint={c.dataHint} optional={s.common.optional}>{(i) => <Input id={i.id} aria-describedby={i.describedBy} value={f.data} onChange={set("data")} />}</Field>
        <Field label={c.location} hint={c.toConfirm} optional={s.common.optional}>{(i) => <Input id={i.id} aria-describedby={i.describedBy} value={f.location} onChange={set("location")} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={c.dpaDate} optional={s.common.optional}>{(i) => <Input id={i.id} type="date" value={f.dpa} onChange={set("dpa")} />}</Field>
          <Field label={c.reviewDate} error={err.review}>{(i) => <Input id={i.id} type="date" aria-describedby={i.describedBy} aria-invalid={i.invalid} value={f.review} onChange={set("review")} />}</Field>
        </div>
      </form>
    </FDialog>
  );
}

// ---------------------------------------------------------------- retention
function Retention() {
  const c = useC();
  const { locale } = useI18n();
  const q = useRetention();
  const online = useOnline();
  const [dry, setDry] = useState(false);
  const [change, setChange] = useState<RetentionRow | null>(null);
  return (
    <Gate q={q} what={c.tabs.retention}>
      {(d) => (
        <div className="grid gap-4">
          {d.pending.length > 0 && <PendingChangeBanner changes={d.pending} href="/system/approvals?area=settings" />}
          <STable label={c.tabs.retention} head={[c.retention.category, c.retention.keep, c.retention.action, c.retention.lastRun, c.retention.due, ""]}>
            {d.items.map((r) => (
              <tr key={r.category}>
                <td data-label={c.retention.category} className="font-medium">{r.category}{r.legal && <Pill tone="info" className="ml-2">{c.retention.legal}</Pill>}</td>
                <td data-label={c.retention.keep}>{r.keep}</td>
                <td data-label={c.retention.action}>{c.retention.actions[r.action]}</td>
                <td data-label={c.retention.lastRun} className="text-fg-muted">{r.lastRunAt ? formatDateTime(r.lastRunAt, locale) : c.retention.never}</td>
                <td data-label={c.retention.due} className="tabular">{r.due}</td>
                <td data-label="" className="text-right"><Button size="sm" variant="ghost" disabled={!online} onClick={() => setChange(r)} aria-label={`${c.retention.request}: ${r.category}`}>{c.retention.request}</Button></td>
              </tr>
            ))}
          </STable>
          <div className="flex flex-wrap items-center justify-between gap-3 border border-warning/30 bg-warning-bg p-4">
            <p className="flex items-center gap-2 text-small text-warning"><Icon name="shield" size={16} aria-hidden />{c.retention.approval}</p>
            <Button size="sm" variant="outline" className="m-press" onClick={() => setDry(true)}><Icon name="refresh" size={14} aria-hidden />{c.retention.dryRun}</Button>
          </div>
          {dry && <DryRunSheet onClose={() => setDry(false)} />}
          {change && <RetentionChangeDialog key={change.category} row={change} onClose={() => setChange(null)} />}
        </div>
      )}
    </Gate>
  );
}
function DryRunSheet({ onClose }: { onClose: () => void }) {
  const c = useC().retention;
  const s = useS();
  const { locale } = useI18n();
  const run = useDryRun();
  const fail = useFail();
  // Run once when the sheet opens (read-only simulation, no audit).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run.mutate(undefined, { onError: fail }); }, []);
  const total = run.data?.items.reduce((n, i) => n + i.due, 0) ?? 0;
  return (
    <FDialog open onClose={onClose} title={c.dryTitle} description={c.dryBody} footer={<Button variant="ghost" onClick={onClose}>{s.common.close}</Button>}>
      {run.isPending ? <div aria-busy="true" className="grid gap-2"><p className="text-small text-fg-muted">{c.dryRunning}</p>{[0, 1, 2, 3].map((i) => <div key={i} className="h-9 m-shimmer" />)}</div>
        : run.isError ? <div className="grid justify-items-start gap-2"><p role="alert" className="text-small text-danger">{s.states.loadFailed.replace("{what}", c.dryRun)}</p><Button size="sm" variant="outline" onClick={() => run.mutate(undefined, { onError: fail })}>{s.states.retry}</Button></div>
        : run.data && (
          <div className="grid gap-3" aria-live="polite">
            <p className="text-small text-fg-muted">{fill(c.dryRan, { t: formatDateTime(run.data.ranAt, locale) })} · <strong className="text-fg">{fill(c.dryTotal, { n: total })}</strong></p>
            <ul className="grid gap-1.5 m-stagger">
              {run.data.items.map((i, n) => (
                <li key={i.category} style={{ ["--i" as string]: Math.min(n, 6) }} className="flex items-center justify-between gap-3 bg-bg-subtle px-3 py-2 text-small">
                  <span className="min-w-0">{i.category}</span>
                  <span className="flex items-center gap-2 tabular"><Pill>{c.actions[i.action]}</Pill><strong className={cx(i.due === 0 && "text-fg-subtle")}>{i.due}</strong></span>
                </li>
              ))}
            </ul>
          </div>
        )}
    </FDialog>
  );
}
function RetentionChangeDialog({ row, onClose }: { row: RetentionRow; onClose: () => void }) {
  const c = useC().retention;
  const s = useS();
  const toast = useToast();
  const fail = useFail();
  const mut = useRetentionChange();
  const { run, dialog } = useStepped();
  const [keep, setKeep] = useState(row.keep);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<{ keep?: string; reason?: string }>({});
  const submit = async () => {
    const e = { keep: !keep.trim() ? c.keepErr : keep.trim() === row.keep ? c.sameErr : undefined, reason: reason.trim().length < 10 ? c.reasonErr : undefined };
    setErr(e);
    if (e.keep || e.reason) return;
    try {
      const cr = await run(`retention ${row.category}`, (token) => mut.mutateAsync({ category: row.category, keep: keep.trim(), reason: reason.trim(), token }));
      if (cr) { toast({ tone: "success", title: c.submitted, body: cr.title }); onClose(); }
    } catch (x) { fail(x); }
  };
  return (
    <>
      <FDialog open onClose={onClose} title={c.changeTitle} description={row.category}
        footer={<><Button variant="ghost" onClick={onClose}>{s.common.cancel}</Button><Button loading={mut.isPending} onClick={submit}>{c.submit}</Button></>}>
        <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {row.legal && <p role="note" className="flex gap-2 bg-info-bg p-3 text-small text-info"><Icon name="shield" size={15} aria-hidden className="mt-0.5 shrink-0" />{c.legalWarn}</p>}
          <p className="text-small text-fg-muted">{c.keep}: <strong className="text-fg">{row.keep}</strong></p>
          <Field label={c.newKeep} error={err.keep}>{(i) => <Input id={i.id} aria-describedby={i.describedBy} aria-invalid={i.invalid} value={keep} onChange={(e) => setKeep(e.target.value)} />}</Field>
          <Field label={c.reason} error={err.reason}>{(i) => <Textarea id={i.id} rows={3} aria-describedby={i.describedBy} aria-invalid={i.invalid} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
          {/* Approver path is known before submit: retention changes need the executive (approvals.ts AREA settings). */}
          <p className="flex items-center gap-2 bg-info-bg p-3 text-small text-link"><Icon name="users" size={15} aria-hidden />{c.approval}</p>
        </form>
      </FDialog>
      {dialog}
    </>
  );
}

// ---------------------------------------------------------------- requests (DSR queue)
const OPEN: DsrVM["status"][] = ["received", "verifying", "in_progress"];
const DSR_TONE: Record<DsrVM["status"], "neutral" | "info" | "purple" | "success" | "danger"> = { received: "neutral", verifying: "info", in_progress: "purple", completed: "success", rejected: "danger" };
export function DsrStatusPill({ status, c }: { status: DsrVM["status"]; c: SystemPrivacy }) {
  return <Pill tone={DSR_TONE[status]}>{c.requests.statuses[status]}</Pill>;
}
export function DueChip({ due, done, c }: { due: string; done?: boolean; c: SystemPrivacy }) {
  const { locale } = useI18n();
  const now = useNow(60_000);
  if (!now || done) return <span className="text-small text-fg-muted">{formatDate(due, locale)}</span>;
  const left = Date.parse(due) - now;
  return <Pill tone={left < 0 ? "danger" : left < 7 * 86_400_000 ? "warning" : "neutral"}><Icon name="clock" size={11} aria-hidden />{left < 0 ? c.requests.overdue : fill(c.requests.dueIn, { t: formatRelative(due, locale, now) })}</Pill>;
}
function Requests() {
  const c = useC();
  const { locale } = useI18n();
  const q = useDsrs();
  const [state, setState] = useState<"open" | "done">("open");
  return (
    <Gate q={q} what={c.tabs.requests}>
      {(d) => {
        const open = d.items.filter((x) => OPEN.includes(x.status)).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
        const rows = state === "open" ? open : d.items.filter((x) => !OPEN.includes(x.status));
        return (
          <div className="grid gap-4">
            <div role="radiogroup" aria-label={c.tabs.requests} className="flex w-fit gap-1 bg-ink-100 p-1">
              {(["open", "done"] as const).map((v) => (
                <button key={v} type="button" role="radio" aria-checked={state === v} onClick={() => setState(v)}
                  className={cx("flex h-9 items-center gap-2 px-4 text-small font-medium m-press", state === v ? "bg-secondary text-on-secondary" : "text-fg-muted hover:text-fg")}>
                  {v === "open" ? c.requests.queue : c.requests.done}
                  {v === "open" && <span className="bg-primary px-1.5 text-eyebrow text-on-gold tabular">{open.length}</span>}
                </button>
              ))}
            </div>
            <p className="text-small text-fg-subtle">{c.requests.subjectNote}</p>
            {rows.length === 0 ? <EmptyPanel title={state === "open" ? c.requests.empty : c.requests.emptyDone} body={state === "open" ? c.requests.emptyBody : undefined} /> : (
              <ul className="grid gap-3 m-stagger">
                {rows.map((r, i) => (
                  <li key={r.id} style={{ ["--i" as string]: Math.min(i, 6) }}>
                    <Link href={localHref(locale, `/system/privacy/requests/${r.id}`)} className="grid gap-3 border border-border bg-surface p-4 m-lift hover:border-navy-300 sm:grid-cols-[1fr_auto] sm:items-center">
                      <span className="grid min-w-0 gap-1.5">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-label">{r.id}</span>
                          <Pill tone={r.type === "erasure" ? "danger" : "purple"}>{c.requests.types[r.type]}</Pill>
                          {r.legalHold && <Pill tone="warning"><Icon name="lock" size={11} aria-hidden />{c.requests.hold}</Pill>}
                        </span>
                        <span className="text-small text-fg-muted">{c.requests.subject} <span className="font-mono">{r.subjectNo}</span> · {c.requests.received} {formatDateTime(r.receivedAt, locale)}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <DsrStatusPill status={r.status} c={c} />
                        <DueChip due={r.dueAt} done={!OPEN.includes(r.status)} c={c} />
                        <Icon name="arrowRight" size={16} aria-hidden className="text-fg-subtle" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }}
    </Gate>
  );
}
