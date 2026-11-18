"use client";
// U16 Incident detail (plan 06 §7 U16, §2.10): status machine, timeline + notes, response checklist (POP1),
// postmortem (due +5 business days; summary, root cause, actions with owners), audit window link.
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDateTime, formatRelative } from "@/shared/format";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/atoms/button";
import { Checkbox, Field, Input, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Panel } from "@/components/molecules/ops/ops";
import { useNow } from "@/components/atoms/step-up";
import { useOnline } from "@/components/atoms/hooks";
import { systemOps } from "@/content/pages/system-ops";
import { fill } from "@/content/pages/system-common";
import { useIncident, useIncidentMutations } from "@/lib/system/f";
import { INCIDENT_NEXT, RESPONSE_TARGET } from "@/shared/system/incidents";
import type { IncidentStatus, IncidentVM } from "@/shared/system/types";
import { ConflictBanner, SysPageHead } from "@/components/molecules/system/system";
import { SevPill, useS } from "@/components/atoms/system";
import { Gate, Pill, useFail } from "@/components/molecules/system/system";
import { IncidentStatusPill } from "@/components/organisms/system/operations";

const useC = () => systemOps(useI18n().locale);
const TARGET = { 1: RESPONSE_TARGET.critical, 2: RESPONSE_TARGET.high, 3: RESPONSE_TARGET.medium } as const;

export function IncidentDetailView({ id }: { id: string }) {
  const c = useC();
  const { locale } = useI18n();
  const q = useIncident(id);
  return (
    <div className="m-rise">
      <Link href={localHref(locale, "/system/ops?tab=incidents")} className="mb-3 inline-flex items-center gap-1.5 text-small text-fg-muted hover:text-fg">
        <Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{c.detail.back}
      </Link>
      <Gate q={q} what={c.incident} rows={6}>{(d) => <Detail key={d.id} i={d} />}</Gate>
    </div>
  );
}

function Detail({ i }: { i: IncidentVM }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const online = useOnline();
  const toast = useToast();
  const fail = useFail();
  const now = useNow(60_000);
  const { patch, note } = useIncidentMutations(i.id);
  const [conflict, setConflict] = useState(false);
  const [text, setText] = useState("");
  const [noteErr, setNoteErr] = useState<string>();
  // shortcut: checklist ticks are per-browser (not persisted), persist via incident events when the backend ships.
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const onErr = (e: unknown) => { if (e instanceof ApiError && e.status === 409) setConflict(true); else fail(e); };

  const move = (to: IncidentStatus) =>
    patch.mutate({ patch: { status: to }, version: i.version }, { onSuccess: () => toast({ tone: "success", title: fill(c.detail.moved, { s: c.incidents.statuses[to] }) }), onError: onErr });
  const addNote = () => {
    if (!text.trim()) return setNoteErr(c.detail.noteErr);
    setNoteErr(undefined);
    note.mutate(text.trim(), { onSuccess: () => setText(""), onError: fail });
  };
  const from = new Date(Date.parse(i.startedAt) - 15 * 60_000).toISOString();
  const to = i.resolvedAt ?? (now ? new Date(now).toISOString() : i.startedAt);
  const open = i.status !== "resolved" && i.status !== "postmortem_done";

  return (
    <>
      <SysPageHead
        title={i.title}
        sub={<span className="flex flex-wrap items-center gap-2"><SevPill sev={i.sev} /><IncidentStatusPill status={i.status} c={c} /><span className="font-mono text-eyebrow">{i.id}</span></span>}
        actions={INCIDENT_NEXT[i.status].filter((x) => x !== "postmortem_done").map((x) => (
          <Button key={x} size="sm" variant={x === "resolved" ? "primary" : "outline"} className="m-press" disabled={!online} loading={patch.isPending && patch.variables?.patch.status === x} onClick={() => move(x)}>
            {fill(c.detail.moveTo, { s: c.incidents.statuses[x] })}
          </Button>
        ))}
      />
      {conflict && <div className="mb-4"><ConflictBanner by={s.common.system} at={i.timeline.at(-1)?.at ?? i.startedAt} onReload={() => { setConflict(false); patch.reset(); }} /></div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="grid content-start gap-4">
          <section className="grid gap-3 border border-border bg-surface p-4 sm:grid-cols-3 sm:p-5">
            <Meta label={c.incidents.start}>{formatDateTime(i.startedAt, locale)}{now ? <span className="block text-eyebrow text-fg-subtle">{formatRelative(i.startedAt, locale, now)}</span> : null}</Meta>
            <Meta label={c.incidents.components}><span className="flex flex-wrap gap-1">{i.components.map((x) => <Pill key={x}>{x}</Pill>)}</span></Meta>
            <Meta label={c.incidents.sev}>{fill(c.detail.target, { t: TARGET[i.sev] })}</Meta>
            <div className="sm:col-span-3"><Meta label={c.incidents.impact}><span className="font-normal">{i.impact}</span></Meta></div>
            {i.resolvedAt && <p className="text-small text-success sm:col-span-3">{fill(c.detail.resolvedAt, { t: formatDateTime(i.resolvedAt, locale) })}</p>}
          </section>

          <Panel title={c.detail.timeline}>
            <ol className="grid">
              {i.timeline.map((e, n) => (
                <li key={`${e.at}-${n}`} className="relative grid grid-cols-[1.5rem_1fr] gap-3 pb-4 last:pb-0">
                  {n < i.timeline.length - 1 && <span aria-hidden className="absolute top-6 bottom-0 left-3 w-px bg-border" />}
                  <span aria-hidden className={cx("relative z-10 mt-0.5 size-6 rounded-full border-4", n === i.timeline.length - 1 ? "border-navy-100 bg-navy-700" : "border-ink-100 bg-ink-400")} />
                  <span className="min-w-0 text-small"><span className="block break-words">{e.text}</span><span className="text-eyebrow text-fg-subtle">{e.by} · {formatDateTime(e.at, locale)}</span></span>
                </li>
              ))}
            </ol>
            <form className="mt-4 grid gap-2 border-t border-border pt-4" noValidate onSubmit={(e) => { e.preventDefault(); addNote(); }}>
              <Field label={c.detail.addNote} error={noteErr}>{(x) => <Textarea id={x.id} rows={2} maxLength={500} placeholder={c.detail.note} aria-describedby={x.describedBy} aria-invalid={x.invalid} value={text} onChange={(e) => setText(e.target.value)} disabled={!online} />}</Field>
              <Button type="submit" size="sm" className="w-fit m-press" disabled={!online} loading={note.isPending}>{c.detail.post}</Button>
            </form>
          </Panel>

          <Postmortem i={i} onErr={onErr} />
        </div>

        <div className="grid content-start gap-4">
          {open && (
            <Panel title={c.detail.checklist} className="border-danger/25">
              <ul className="grid gap-2">
                {(["ack", "assess", "notify"] as const).map((k) => (
                  <li key={k}><Checkbox label={c.detail.steps[k]} checked={!!checks[k]} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} /></li>
                ))}
              </ul>
              <p className="mt-3 flex items-center gap-2 text-eyebrow text-fg-subtle"><Icon name="phone" size={12} aria-hidden />{c.mon.onCall}</p>
            </Panel>
          )}
          <Panel title={c.detail.audit}>
            <Link href={localHref(locale, `/system/audit?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)} className="flex items-center justify-between gap-2 bg-bg-subtle p-3 text-small font-medium hover:bg-navy-50 m-press">
              <span>{formatDateTime(from, locale)} → {i.resolvedAt ? formatDateTime(i.resolvedAt, locale) : "…"}</span><Icon name="arrowRight" size={14} aria-hidden />
            </Link>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Postmortem({ i, onErr }: { i: IncidentVM; onErr: (e: unknown) => void }) {
  const c = useC().detail;
  const { locale } = useI18n();
  const online = useOnline();
  const toast = useToast();
  const { patch } = useIncidentMutations(i.id);
  const pm = i.postmortem;
  const [f, setF] = useState({ summary: pm?.summary ?? "", rootCause: pm?.rootCause ?? "", actions: pm?.actions ?? [] });
  const [err, setErr] = useState<string>();
  if (!i.resolvedAt || !pm) return <Panel title={c.postmortem}><p className="flex items-center gap-2 text-small text-fg-muted"><Icon name="lock" size={14} aria-hidden />{c.pmLocked}</p></Panel>;
  const done = i.status === "postmortem_done";
  const save = (finish: boolean) => {
    if (finish && (!f.summary.trim() || !f.rootCause.trim())) return setErr(c.pmNeeded);
    setErr(undefined);
    const actions = f.actions.filter((a) => a.text.trim());
    patch.mutate({ patch: { postmortem: { summary: f.summary.trim(), rootCause: f.rootCause.trim(), actions } }, version: i.version }, {
      onError: onErr,
      onSuccess: (d) => finish
        ? patch.mutate({ patch: { status: "postmortem_done" }, version: d.version }, { onError: onErr, onSuccess: () => toast({ tone: "success", title: c.finish }) })
        : toast({ tone: "success", title: c.pmSaved }),
    });
  };
  const setAction = (n: number, k: "text" | "owner" | "done", v: string | boolean) => setF({ ...f, actions: f.actions.map((a, j) => (j === n ? { ...a, [k]: v } : a)) });
  return (
    <Panel title={c.postmortem} action={<Pill tone={done ? "success" : "warning"}>{fill(c.due, { t: formatDateTime(pm.dueAt, locale) })}</Pill>} className="m-rise">
      <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); save(false); }}>
        {err && <p role="alert" className="text-small font-medium text-danger">{err}</p>}
        <Field label={c.summary}>{(x) => <Textarea id={x.id} rows={3} disabled={done} aria-invalid={!!err && !f.summary.trim()} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />}</Field>
        <Field label={c.root}>{(x) => <Textarea id={x.id} rows={3} disabled={done} aria-invalid={!!err && !f.rootCause.trim()} value={f.rootCause} onChange={(e) => setF({ ...f, rootCause: e.target.value })} />}</Field>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-label">{c.actions}</legend>
          {f.actions.map((a, n) => (
            <div key={n} className="grid items-end gap-2 bg-bg-subtle p-3 sm:grid-cols-[auto_1fr_10rem]">
              <Checkbox label={<span className="sr-only">{c.action} {n + 1}</span>} checked={a.done} disabled={done} onChange={(e) => setAction(n, "done", e.target.checked)} />
              <Field label={c.action}>{(x) => <Input id={x.id} className="h-10" disabled={done} value={a.text} onChange={(e) => setAction(n, "text", e.target.value)} />}</Field>
              <Field label={c.owner}>{(x) => <Input id={x.id} className="h-10" disabled={done} value={a.owner} onChange={(e) => setAction(n, "owner", e.target.value)} />}</Field>
            </div>
          ))}
          {!done && <Button type="button" size="sm" variant="ghost" className="w-fit" onClick={() => setF({ ...f, actions: [...f.actions, { text: "", owner: "", done: false }] })}><Icon name="plus" size={14} aria-hidden />{c.addAction}</Button>}
        </fieldset>
        {!done && (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="outline" disabled={!online} loading={patch.isPending}>{c.savePm}</Button>
            <Button type="button" size="sm" disabled={!online} onClick={() => save(true)}>{c.finish}</Button>
          </div>
        )}
      </form>
    </Panel>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-1"><span className="text-eyebrow text-fg-subtle">{label}</span><span className="text-small font-medium">{children}</span></div>;
}
