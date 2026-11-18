"use client";
// U9 Break-glass `/system/break-glass` (plan 06 §7 U9, board 06 v2 AG4/PAG1): sealed card → request (reason, incident,
// duration) → approvals by Yvonne AND Alice → active countdown + End now → ended/expired → executive review note.
// Credentials are never shown: elevation is the approvals-gated server state (system.governance breakGlassHolder).
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { systemGovernance } from "@/content/pages/system-governance";
import { fill } from "@/content/pages/system-common";
import { cx, formatDateTime } from "@/shared/format";
import { BREAK_GLASS_MINUTES } from "@/shared/system/governance";
import { useWithdraw } from "@/lib/system/api";
import { useBreakGlass, useBreakGlassAction, type BreakGlassViewVM } from "@/lib/system/c";
import type { BreakGlassState } from "@/shared/system/types";
import { Icon } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { Button } from "@/components/atoms/button";
import { ErrorSummary, Field, Input, Select, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { CountdownPill, useRoleLabel, useS } from "@/components/atoms/system";
import { ApproverPath, SysPageHead } from "@/components/molecules/system/system";
import { Confirm, QueryFail, Skeleton, fieldsOf, useCanMutate, useErrText, useGuarded } from "@/components/molecules/system/system";

const useC = () => systemGovernance(useI18n().locale);
const TONE: Record<BreakGlassState, string> = {
  sealed: "bg-ink-100 text-ink-700", requested: "bg-warning-bg text-warning", active: "bg-danger text-white",
  ended: "bg-navy-50 text-navy-700", expired: "bg-navy-50 text-navy-700", reviewed: "bg-success-bg text-success",
};

export function BreakGlassView() {
  const c = useC();
  const q = useBreakGlass();
  const head = <SysPageHead title={c.breakGlass} sub={c.bgSub} />;
  if (q.isError && !q.data) return <div className="m-rise">{head}<QueryFail error={q.error} what={c.breakGlass} onRetry={() => q.refetch()} /></div>;
  if (!q.data) return <div className="m-rise" aria-busy>{head}<Skeleton rows={5} /></div>;
  const d = q.data;
  return (
    <div className="mx-auto grid max-w-3xl gap-4 m-rise">
      {head}
      {d.state === "active" && d.activeUntil && <ActiveStrip until={d.activeUntil} />}
      <AccountCard d={d} />
      {(d.state === "sealed" || d.state === "reviewed") && <RequestForm d={d} />}
      {d.state === "requested" && <Requested d={d} />}
      {d.state === "active" && <Active d={d} />}
      {(d.state === "ended" || d.state === "expired") && <Review d={d} />}
    </div>
  );
}

function ActiveStrip({ until }: { until: string }) {
  const c = useC();
  return (
    <p role="alert" className="flex flex-wrap items-center gap-2 border border-danger/25 bg-danger-bg px-4 py-3 text-small font-medium text-danger m-rise">
      <Icon name="zap" size={16} aria-hidden />{c.activeTitle}<CountdownPill until={until} danger className="ml-auto" />
    </p>
  );
}

function AccountCard({ d }: { d: BreakGlassViewVM }) {
  const c = useC();
  const { locale } = useI18n();
  return (
    <section className="flex flex-wrap items-center gap-4 border border-border bg-surface p-5">
      <span className={cx("flex size-14 shrink-0 items-center justify-center rounded-full", d.state === "active" ? "bg-danger-bg text-danger" : "bg-navy-50 text-navy-700")}>
        <Icon name={d.state === "active" ? "zap" : "lock"} size={26} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-h3">{c.bgAccount}</h2>
        <p className="text-small text-fg-muted">{fill(c.lastUsed, { t: d.lastUsedAt ? formatDateTime(d.lastUsedAt, locale) : c.never })}</p>
      </div>
      <span className={cx("inline-flex h-8 items-center gap-1.5 px-3 text-small font-medium m-tone", TONE[d.state])}>
        <Icon name={d.state === "reviewed" ? "check" : d.state === "requested" ? "clock" : d.state === "active" ? "zap" : "lock"} size={13} aria-hidden />{c.bgState[d.state]}
      </span>
      <p className="basis-full text-small text-fg-subtle">{c.credsNote}</p>
    </section>
  );
}

function Approvers({ d }: { d: BreakGlassViewVM }) {
  const c = useC();
  const label = useRoleLabel();
  return (
    <div className="grid gap-2">
      <p className="text-label">{c.requiresBoth}</p>
      <ul className="flex flex-wrap items-center gap-2">
        {d.approvers.map((a, i) => (
          <li key={a.id} className="flex items-center gap-2">
            {i > 0 && <Icon name="plus" size={14} aria-hidden className="text-fg-subtle" />}
            <span className="flex items-center gap-2.5 border border-border bg-bg-subtle/50 px-3 py-2">
              <Avatar name={a.name} size="sm" />
              <span className="text-small"><span className="block font-medium">{a.name}</span><span className="text-fg-muted">{label(a.role)}</span></span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RequestForm({ d }: { d: BreakGlassViewVM }) {
  const c = useC();
  const s = useS();
  const toast = useToast();
  const errText = useErrText();
  const online = useCanMutate();
  const { run, dialog } = useGuarded();
  const act = useBreakGlassAction();
  const [reason, setReason] = useState("");
  const [incident, setIncident] = useState("");
  const [minutes, setMinutes] = useState<60 | 120 | 240>(120);
  const [tried, setTried] = useState(false);
  const [srv, setSrv] = useState<Record<string, string>>({});
  const local: Record<string, string> = reason.trim().length < 10 ? { reason: c.reasonHint } : {};
  const errs = { ...Object.fromEntries(Object.keys(srv).map((k) => [k, k === "reason" ? c.reasonHint : s.errors.validation])), ...(tried ? local : {}) };

  async function submit() {
    setTried(true);
    if (Object.keys(local).length || !online) return;
    try {
      const r = await run(c.stepUpRequest, (token) => act.mutateAsync({ kind: "request", input: { reason: reason.trim(), minutes, incidentId: incident.trim() || undefined }, token }));
      if (r) toast({ tone: "success", title: c.requested, body: fill(c.requestedBody, { id: r.request?.changeId ?? "" }) });
    } catch (e) { setSrv(fieldsOf(e)); toast({ tone: "danger", title: errText(e) }); }
  }
  const errList = Object.entries(errs).map(([field, message]) => ({ field, message }));
  return (
    <section className="grid gap-4 border border-border bg-surface p-5">
      {dialog}
      <h2 className="text-label-lg">{c.requestAccess}</h2>
      {d.state === "reviewed" && d.reviewNote && <p className="bg-success-bg p-3 text-small"><span className="font-medium">{c.reviewedTitle}:</span> {d.reviewNote}</p>}
      {tried && errList.length > 0 && <ErrorSummary title={s.errors.validation} errors={errList} />}
      <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field id="reason" label={c.reason} hint={c.reasonHint} error={errs.reason}>
          {(f) => <Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <Field id="incident" label={c.incident} hint={c.incidentHint} optional={s.common.optional}>
            {(f) => <Input id={f.id} aria-describedby={f.describedBy} value={incident} maxLength={40} onChange={(e) => setIncident(e.target.value)} />}
          </Field>
          <Field id="minutes" label={c.duration}>
            {(f) => (
              <Select id={f.id} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) as 60 | 120 | 240)}>
                {BREAK_GLASS_MINUTES.map((m) => <option key={m} value={m}>{m === 60 ? c.hour : fill(c.hours, { n: m / 60 })}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <Approvers d={d} />
        <div className="flex justify-end">
          <Button type="submit" variant="danger" loading={act.isPending} disabled={!online}><Icon name="shield" size={15} aria-hidden />{c.requestBtn}</Button>
        </div>
        {!online && <p className="text-small text-fg-muted">{s.states.offlineAction}</p>}
      </form>
    </section>
  );
}

function Requested({ d }: { d: BreakGlassViewVM }) {
  const c = useC();
  const toast = useToast();
  const errText = useErrText();
  const me = useSession().user;
  const online = useCanMutate();
  const w = useWithdraw();
  const mine = !!d.request && me?.id === d.request.by.id;
  return (
    <section className="grid gap-4 border border-warning/30 bg-surface p-5 m-rise">
      <h2 className="flex items-center gap-2 text-label-lg"><Icon name="clock" size={18} aria-hidden className="text-warning" />{c.waiting}</h2>
      {d.request && (
        <p className="text-small text-fg-muted">
          {fill(c.forReason, { r: d.request.reason })}{d.request.incidentId && ` · ${fill(c.incidentRef, { r: d.request.incidentId })}`} · {d.request.minutes === 60 ? c.hour : fill(c.hours, { n: d.request.minutes / 60 })}
        </p>
      )}
      {d.change ? <ApproverPath cr={d.change} me={me?.id} names={Object.fromEntries(d.approvers.map((a) => [a.role, a.name]))} /> : <Approvers d={d} />}
      {mine && d.change && ((cr) => (
        <Button variant="outline" size="sm" className="justify-self-start" disabled={!online} loading={w.isPending}
          onClick={async () => { try { await w.mutateAsync(cr.id); toast({ tone: "success", title: c.withdrawn }); } catch (e) { toast({ tone: "danger", title: errText(e) }); } }}>
          {c.withdraw}
        </Button>
      ))(d.change)}
    </section>
  );
}

function Active({ d }: { d: BreakGlassViewVM }) {
  const c = useC();
  const toast = useToast();
  const errText = useErrText();
  const online = useCanMutate();
  const act = useBreakGlassAction();
  const [ask, setAsk] = useState(false);
  return (
    <section className="grid gap-3 border border-danger/25 bg-surface p-5">
      <h2 className="text-label-lg text-danger">{c.activeTitle}</h2>
      <p className="text-small text-fg-muted">{c.activeBody}</p>
      {d.request && <p className="text-small">{fill(c.forReason, { r: d.request.reason })}</p>}
      {d.activeUntil && <CountdownPill until={d.activeUntil} danger className="justify-self-start" />}
      <Button variant="danger" className="justify-self-start" disabled={!online} onClick={() => setAsk(true)}>{c.endNow}</Button>
      <Confirm open={ask} danger title={c.endTitle} body={c.endBody} yes={c.endNow} busy={act.isPending} onNo={() => setAsk(false)}
        onYes={async () => { try { await act.mutateAsync({ kind: "end" }); setAsk(false); toast({ tone: "success", title: c.ended }); } catch (e) { setAsk(false); toast({ tone: "danger", title: errText(e) }); } }} />
    </section>
  );
}

function Review({ d }: { d: BreakGlassViewVM }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const toast = useToast();
  const errText = useErrText();
  const me = useSession().user;
  const online = useCanMutate();
  const { run, dialog } = useGuarded();
  const act = useBreakGlassAction();
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const exec = !!me?.roles.includes("staff:executive");
  const err = tried && note.trim().length < 10 ? c.validation.note : undefined;
  async function submit() {
    setTried(true);
    if (note.trim().length < 10 || !online) return;
    try {
      const r = await run(c.stepUpReview, (token) => act.mutateAsync({ kind: "review", note: note.trim(), token }));
      if (r) toast({ tone: "success", title: c.reviewedToast });
    } catch (e) { toast({ tone: "danger", title: errText(e) }); }
  }
  return (
    <section className="grid gap-4 border border-navy-100 bg-surface p-5 m-rise">
      {dialog}
      <h2 className="flex items-center gap-2 text-label-lg"><Icon name="file" size={18} aria-hidden className="text-navy-700" />{c.endedTitle}</h2>
      <p className="text-small text-fg-muted">
        {d.endedAt && fill(c.endedAt, { t: formatDateTime(d.endedAt, locale) })}{d.request && ` · ${fill(c.forReason, { r: d.request.reason })}`}
      </p>
      {exec ? (
        <form className="grid gap-3" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Field id="note" label={c.reviewNote} hint={c.reviewNoteHint} error={err}>
            {(f) => <Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />}
          </Field>
          <Button type="submit" className="justify-self-start" loading={act.isPending} disabled={!online}>{c.submitReview}</Button>
          {!online && <p className="text-small text-fg-muted">{s.states.offlineAction}</p>}
        </form>
      ) : (
        <p className="flex items-center gap-2 bg-bg-subtle p-3 text-small"><Icon name="lock" size={15} aria-hidden />{c.reviewOnlyExec}</p>
      )}
    </section>
  );
}
