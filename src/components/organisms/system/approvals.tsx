"use client";
// U2 Approvals `/system/approvals?area=&state=&q=&id=` (plan 06 §7 U2, board 14 AP1–AP4/PAP1 with §3 fixes) and
// `/exec/approvals` (viewer="executive", X-6). Inbox + ApprovalDrawer: diff, approver path, note, countdown,
// Approve (step-up) / Reject (reason ≥ 10) / Withdraw (own) / Propose again (own, expired). Own requests are locked.
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { systemOverview } from "@/content/pages/system-overview";
import { fill, sysError } from "@/content/pages/system-common";
import { cx, formatDate, formatRelative } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { ApiError } from "@/lib/api/client";
import { errorState, useChange, useChanges, useDecide, useWithdraw } from "@/lib/system/api";
import { usePropose } from "@/lib/system/a";
import { canDecide, openRules } from "@/shared/system/approvals";
import type { ChangeArea, ChangeKind, ChangeRequestVM, ChangeState } from "@/shared/system/types";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { Button } from "@/components/atoms/button";
import { Dialog, Sheet } from "@/components/atoms/dialog";
import { Field, Input, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { CopyRef, EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { SkeletonRows } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { StepUpCancelled, useNow, usePhone, useStepUp } from "@/components/atoms/step-up";
import { CountdownPill, LockedContent, useRoleLabel, useS } from "@/components/atoms/system";
import { ApproverPath, ConflictBanner, DiffView, SysPageHead } from "@/components/molecules/system/system";

type Viewer = "sysadmin" | "executive";
const useC = () => systemOverview(useI18n().locale);
const AREAS = ["all", "access", "security", "settings", "ops"] as const;
const KIND_ICON: Record<ChangeKind, IconName> = {
  role_grant: "users", role_revoke_privileged: "users", invite_privileged: "user", custom_role: "layers", sod_waiver: "shield",
  break_glass: "zap", impersonation_write: "user", setting_change: "layers", retention_change: "calendar",
  ip_allowlist_disable: "globe", credential_rotation: "lock", prod_restore: "refresh",
};
const STATE_TONE: Record<ChangeState, string> = {
  proposed: "bg-warning-bg text-warning", approved: "bg-navy-50 text-navy-700", applied: "bg-success-bg text-success",
  rejected: "bg-danger-bg text-danger", withdrawn: "bg-ink-100 text-ink-700", expired: "bg-ink-100 text-ink-700",
};
const SECRETS = ["secret", "token", "password", "apiKey", "value"] as const;

function StatePill({ state }: { state: ChangeState }) {
  const c = useC();
  return (
    <span className={cx("inline-flex h-7 items-center gap-1.5 px-2.5 text-small font-medium whitespace-nowrap m-tone", STATE_TONE[state])}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />{c.state[state]}
    </span>
  );
}

export function ApprovalsView() {
  return <ApprovalsInbox viewer="sysadmin" />;
}

export function ApprovalsInbox({ viewer }: { viewer: Viewer }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const p = useUrlParams();
  const area = (AREAS as readonly string[]).includes(p.get("area") ?? "") ? (p.get("area") as ChangeArea | "all") : "all";
  const state = p.get("state") === "decided" ? "decided" : "pending";
  const term = p.get("q") ?? "";
  const id = p.get("id");
  // One fetch per state; areas filter client-side so the chips can show counts.
  const q = useChanges("all", state);
  const all = q.data?.items ?? [];
  const needle = term.trim().toLowerCase();
  const rows = all
    .filter((r) => (area === "all" || r.area === area) && (!needle || `${r.title} ${r.id} ${r.proposedBy.name}`.toLowerCase().includes(needle)))
    .sort((a, b) => b.proposedAt.localeCompare(a.proposedAt));
  const count = (a: (typeof AREAS)[number]) => all.filter((r) => a === "all" || r.area === a).length;

  if (q.isError && !q.data && errorState(q.error) === "locked") return <LockedContent reason="role" />;

  return (
    <div className="grid gap-5">
      <div className="m-rise">
        <SysPageHead
          title={c.approvals}
          sub={viewer === "executive" ? c.inbox.execSub : c.inbox.sub}
          actions={state === "pending" && q.data ? <span className="inline-flex h-9 min-w-9 items-center justify-center bg-navy-50 text-navy-700 px-3 text-label tabular" aria-label={fill(c.approvalsCard.pending, { n: all.length })}>{all.length}</span> : undefined}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label={c.approvals} className="inline-flex bg-ink-100 p-1">
          {(["pending", "decided"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={state === t} onClick={() => setUrlParams({ state: t === "pending" ? null : t, id: null })}
              className={cx("h-9 px-4 text-small font-medium m-press", state === t ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}>
              {c.inbox.tabs[t]}
            </button>
          ))}
        </div>
        <label className="relative ml-auto w-full sm:w-72">
          <span className="sr-only">{c.inbox.searchLabel}</span>
          <Icon name="search" size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-subtle" />
          <Input type="search" data-guide="system-appr-search" value={term} placeholder={c.inbox.search} onChange={(e) => setUrlParams({ q: e.target.value || null })} className="h-11 pl-10" />
        </label>
      </div>

      <ul data-guide="system-appr-areas" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label={c.inbox.cols.request}>
        {AREAS.map((a) => (
          <li key={a}>
            <button type="button" aria-pressed={area === a} onClick={() => setUrlParams({ area: a === "all" ? null : a })}
              className={cx("h-9 border px-4 text-small font-medium whitespace-nowrap m-press", area === a ? "border-secondary bg-secondary text-on-secondary" : "border-border bg-surface hover:bg-navy-50")}>
              {c.inbox.areas[a]}{q.data && <span className="ml-1.5 tabular opacity-75">({count(a)})</span>}
            </button>
          </li>
        ))}
      </ul>

      {q.isPending ? (
        <div aria-busy className="border border-border bg-surface p-4"><span className="sr-only" role="status">{c.inbox.loading}</span><SkeletonRows n={3} /></div>
      ) : q.isError && !q.data ? (
        <PanelError what={c.inbox.what} onRetry={() => q.refetch()} />
      ) : !rows.length ? (
        needle || area !== "all" ? (
          <EmptyPanel title={c.inbox.empty.noMatchTitle} body={c.inbox.empty.noMatchBody} action={<Button size="sm" variant="outline" onClick={() => setUrlParams({ q: null, area: null })}>{c.inbox.empty.clear}</Button>} />
        ) : state === "pending" ? (
          <EmptyPanel title={c.inbox.empty.pendingTitle} body={c.inbox.empty.pendingBody} />
        ) : (
          <EmptyPanel title={c.inbox.empty.decidedTitle} body={c.inbox.empty.decidedBody} />
        )
      ) : (
        <section className="overflow-hidden border border-border bg-surface" aria-busy={q.isFetching}>
          <div aria-hidden className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_7rem_minmax(0,1.3fr)_8.5rem_6.5rem] gap-4 border-b border-border bg-bg-subtle px-5 py-3 text-eyebrow font-medium tracking-wide text-fg-subtle uppercase lg:grid">
            <span>{c.inbox.cols.request}</span><span>{c.inbox.cols.by}</span><span>{c.inbox.cols.date}</span><span>{c.inbox.cols.requires}</span><span>{c.inbox.cols.status}</span><span className="text-right">{c.inbox.cols.action}</span>
          </div>
          <ul className="divide-y divide-border m-stagger">
            {rows.map((r, i) => <Row key={r.id} r={r} i={i} />)}
          </ul>
          <p className="border-t border-border px-5 py-3 text-small text-fg-subtle" aria-live="polite">{fill(c.inbox.showing, { n: rows.length, total: all.length })}</p>
        </section>
      )}
      {q.isError && q.data && <p role="status" className="text-small text-warning">{fill(s.states.lastKnown, { what: c.inbox.what, t: formatDate(q.dataUpdatedAt, locale, { timeStyle: "short" }) })}</p>}

      <ApprovalDrawer id={id} viewer={viewer} onClose={() => setUrlParams({ id: null })} />
    </div>
  );
}

function Needs({ r }: { r: ChangeRequestVM }) {
  const s = useS().approver;
  const role = useRoleLabel();
  return <>{r.approvers.map((a) => (a.anyOf ?? [a.role]).map(role).join(` ${s.or} `)).join(` ${s.and} `)}</>;
}

function Row({ r, i }: { r: ChangeRequestVM; i: number }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const me = useSession().user?.id;
  const mine = r.proposedBy.id === me;
  const open = () => setUrlParams({ id: r.id });
  return (
    <li style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
      className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_7rem_minmax(0,1.3fr)_8.5rem_6.5rem] lg:items-center lg:gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center bg-bg-subtle text-link"><Icon name={KIND_ICON[r.kind]} size={17} /></span>
        <span className="min-w-0">
          <button type="button" onClick={open} className="block max-w-full text-left text-label break-words hover:underline">{r.title}</button>
          <span className="block text-small text-fg-muted">{s.kind[r.kind]} · {c.inbox.areas[r.area]}</span>
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar name={r.proposedBy.name} size="sm" />
        <span className="min-w-0 truncate text-small">{r.proposedBy.name}{mine && <span className="ml-1.5 bg-gold-100 text-gold-800 px-2 py-0.5 text-eyebrow">{c.inbox.yours}</span>}</span>
      </div>
      <time dateTime={r.proposedAt} className="text-small text-fg-muted tabular">{formatDate(r.proposedAt, locale, { dateStyle: "medium", timeStyle: "short" })}</time>
      <span className="text-small max-lg:hidden"><Needs r={r} /></span>
      <span className="flex flex-wrap items-center gap-2"><StatePill state={r.state} />{r.state === "proposed" && <CountdownPill until={r.expiresAt} className="lg:hidden" />}</span>
      <span className="lg:text-right">
        <Button size="sm" data-guide="system-appr-review" variant={r.state === "proposed" && !mine ? "primary" : "outline"} onClick={open} className="m-press max-lg:w-full" aria-label={`${r.state === "proposed" && !mine ? c.inbox.review : c.inbox.view}: ${r.title}`}>
          {r.state === "proposed" && !mine ? c.inbox.review : c.inbox.view}<Icon name="arrowRight" size={14} aria-hidden />
        </Button>
      </span>
    </li>
  );
}

// ---------------------------------------------------------------- ApprovalDrawer
export function ApprovalDrawer({ id, viewer, onClose }: { id: string | null; viewer: Viewer; onClose: () => void }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const phone = usePhone();
  const toast = useToast();
  const online = useOnline();
  const now = useNow(30_000);
  const user = useSession().user;
  const role = useRoleLabel();
  const who = (rules: ChangeRequestVM["approvers"]) => rules.map((a) => (a.anyOf ?? [a.role]).map(role).join(" / ")).join(" + ");
  const q = useChange(id);
  const decide = useDecide();
  const withdraw = useWithdraw();
  const propose = usePropose();
  const { request, reset, dialog } = useStepUp();
  const [conflict, setConflict] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const cr = q.data;
  const busy = decide.isPending || withdraw.isPending || propose.isPending;
  const mine = !!cr && cr.proposedBy.id === user?.id;
  const check = cr && user && now ? canDecide(cr, { id: user.id, name: user.name, roles: user.roles }, now) : null;
  const canAct = online && !!check?.ok && cr?.state === "proposed";
  const close = () => { setConflict(false); setRejecting(false); setWithdrawing(false); onClose(); };

  /** Step-up → call; on step_up_required drop the cached token and retry once. */
  async function withStepUp<T>(what: string, run: (token: string) => Promise<T>): Promise<T> {
    let token = await request(what);
    try { return await run(token); } catch (e) {
      if (errorState(e) !== "step_up") throw e;
      reset();
      token = await request(what);
      return run(token);
    }
  }
  function onError(e: unknown) {
    if (e instanceof StepUpCancelled) return;
    const st = errorState(e);
    if (st === "conflict") { setConflict(true); q.refetch(); return; }
    if (st === "expired") { toast({ title: s.states.expired, body: c.drawer.expiredBody }); q.refetch(); return; }
    toast({ tone: "danger", title: st === "offline" ? s.states.offlineAction : sysError(locale, e instanceof ApiError ? e.errorType : null) });
  }

  async function approve() {
    if (!cr || busy) return;
    try {
      const next = await withStepUp(fill(c.drawer.stepUpWhat, { title: cr.title }), (token) => decide.mutateAsync({ cr, decision: "approve", token }));
      const left = openRules(next);
      toast({
        tone: "success", title: fill(c.drawer.approvedToast, { title: cr.title }),
        body: next.state === "applied" ? c.drawer.appliedToast : next.state === "approved" && next.effectiveAt ? fill(c.drawer.effective, { t: formatDate(next.effectiveAt, locale, { dateStyle: "medium", timeStyle: "short" }) }) : left.length ? fill(c.drawer.waitingToast, { who: who(left) }) : undefined,
      });
      close();
    } catch (e) { onError(e); }
  }
  async function reject(reason: string) {
    if (!cr) return;
    try {
      await withStepUp(fill(c.drawer.stepUpWhat, { title: cr.title }), (token) => decide.mutateAsync({ cr, decision: "reject", reason, token }));
      toast({ tone: "success", title: c.drawer.rejectedToast });
      close();
    } catch (e) { setRejecting(false); onError(e); }
  }
  async function doWithdraw() {
    if (!cr) return;
    try { await withdraw.mutateAsync(cr.id); toast({ tone: "success", title: c.drawer.withdrawnToast }); close(); }
    catch (e) { setWithdrawing(false); onError(e); }
  }
  async function again() {
    if (!cr) return;
    try {
      const next = await withStepUp(fill(c.drawer.stepUpWhat, { title: cr.title }), (token) => propose.mutateAsync({ id: cr.id, token }));
      toast({ tone: "success", title: fill(c.drawer.reproposedToast, { id: next.id }) });
      setUrlParams({ id: next.id, state: null });
    } catch (e) { onError(e); }
  }

  const last = cr?.decisions.at(-1);
  const reasonWhy = check && !check.ok
    ? check.error === "self_approval" ? null
      : check.error === "already_decided" && cr?.state === "proposed" ? c.drawer.alreadyYou
      : check.error === "forbidden_role" && cr ? fill(c.drawer.cantDecide, { who: who(openRules(cr)) }) : null
    : null;

  const footer = cr && (
    <>
      {mine && cr.state === "proposed" && <Button variant="ghost" onClick={() => setWithdrawing(true)} disabled={!online || busy} className="mr-auto m-press">{c.drawer.withdraw}</Button>}
      {mine && cr.state === "expired" && viewer === "sysadmin" && <Button variant="outline" onClick={again} loading={propose.isPending} disabled={!online} className="mr-auto m-press"><Icon name="refresh" size={15} aria-hidden />{s.states.proposeAgain}</Button>}
      {!mine && cr.state === "proposed" && (
        <>
          <Button variant="outline" onClick={() => setRejecting(true)} disabled={!canAct || busy} className="m-press">{c.drawer.reject}</Button>
          <Button onClick={approve} loading={decide.isPending} disabled={!canAct || busy} className="m-press"><Icon name="shield" size={15} aria-hidden />{c.drawer.approve}</Button>
        </>
      )}
      <Button variant="ghost" onClick={close} className="m-press">{c.drawer.close}</Button>
    </>
  );

  return (
    <>
      <Sheet open={!!id} onClose={close} side={phone ? "bottom" : "right"} className={cx(!phone && "max-w-xl", phone && "max-h-[92dvh]")}
        title={cr ? cr.title : c.drawer.id}
        description={cr ? <span className="flex flex-wrap items-center gap-2">{s.kind[cr.kind]} · <CopyRef value={cr.id} /></span> : undefined}
        footer={footer}>
        {q.isPending && id ? (
          <div aria-busy><SkeletonRows n={4} /></div>
        ) : q.isError ? (
          errorState(q.error) === "locked" ? <LockedContent reason="role" compact />
            : q.error instanceof ApiError && q.error.status === 404 ? <EmptyPanel compact title={c.drawer.notFound} />
            : <PanelError what={c.inbox.what} onRetry={() => q.refetch()} />
        ) : cr ? (
          <div className="grid gap-5 m-rise">
            {conflict && last && (
              <ConflictBanner by={last.by.name} at={last.at} onReload={() => { setConflict(false); q.refetch(); }} />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <StatePill state={cr.state} />
              <span className="text-small text-fg-muted">{cr.effectiveAt ? fill(c.drawer.effective, { t: formatDate(cr.effectiveAt, locale, { dateStyle: "medium", timeStyle: "short" }) }) : c.drawer.immediate}</span>
            </div>
            {cr.state === "expired" && <p className="flex items-start gap-2 bg-bg-subtle px-3 py-2.5 text-small"><Icon name="clock" size={15} aria-hidden className="mt-0.5 shrink-0" />{c.drawer.expiredBody}</p>}
            {!online && cr.state === "proposed" && <p role="status" className="flex items-start gap-2 bg-warning-bg px-3 py-2.5 text-small text-warning"><Icon name="globe" size={15} aria-hidden className="mt-0.5 shrink-0" />{c.drawer.offline}</p>}

            <ApproverPath cr={cr} me={user?.id} />
            {reasonWhy && <p className="flex items-start gap-2 text-small text-fg-muted"><Icon name="lock" size={15} aria-hidden className="mt-0.5 shrink-0" />{reasonWhy}</p>}

            <section className="grid gap-2">
              <h3 className="text-label">{c.drawer.what}</h3>
              <DiffView before={cr.before} after={cr.after} redactKeys={SECRETS} />
            </section>

            <section className="grid gap-2">
              <h3 className="text-label">{c.drawer.note}</h3>
              <blockquote className="border-l-4 border-rule bg-bg-subtle px-4 py-3 text-body break-words">{cr.reason}</blockquote>
            </section>

            <section className="grid gap-2">
              <h3 className="text-label">{c.drawer.decisions}</h3>
              <ol className="grid gap-3 border-l border-border pl-4">
                <Event icon="plus" text={fill(c.drawer.proposedBy, { name: cr.proposedBy.name })} at={cr.proposedAt} now={now} />
                {cr.decisions.map((d, k) => (
                  <Event key={k} icon={d.decision === "approve" ? "check" : "x"} tone={d.decision === "approve" ? "text-success" : "text-danger"}
                    text={fill(d.decision === "approve" ? c.drawer.approvedBy : c.drawer.rejectedBy, { name: d.by.name })} at={d.at} now={now} reason={d.reason} />
                ))}
              </ol>
            </section>
            <p className="text-small text-fg-subtle">{c.drawer.audit}</p>
          </div>
        ) : null}
      </Sheet>

      <RejectDialog open={rejecting} busy={decide.isPending} onClose={() => setRejecting(false)} onConfirm={reject} />
      <Dialog open={withdrawing} onClose={() => setWithdrawing(false)} title={c.drawer.withdrawTitle} description={c.drawer.withdrawBody}
        footer={<><Button variant="ghost" onClick={() => setWithdrawing(false)}>{c.drawer.keep}</Button><Button variant="danger" onClick={doWithdraw} loading={withdraw.isPending}>{c.drawer.withdrawYes}</Button></>} />
      {dialog}
    </>
  );
}

function Event({ icon, text, at, now, tone, reason }: { icon: IconName; text: string; at: string; now: number; tone?: string; reason?: string }) {
  const { locale } = useI18n();
  return (
    <li className="relative grid gap-0.5 text-small">
      <span aria-hidden className={cx("absolute top-0.5 -left-[1.6rem] flex size-5 items-center justify-center rounded-full bg-surface ring-1 ring-border", tone)}><Icon name={icon} size={12} /></span>
      <span className="font-medium">{text}</span>
      <time dateTime={at} className="text-fg-subtle tabular" title={formatDate(at, locale, { dateStyle: "medium", timeStyle: "short" })}>{now ? formatRelative(at, locale, now) : formatDate(at, locale, { dateStyle: "medium" })}</time>
      {reason && <span className="bg-bg-subtle px-3 py-2 break-words">{reason}</span>}
    </li>
  );
}

function RejectDialog({ open, busy, onClose, onConfirm }: { open: boolean; busy: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const c = useC();
  const s = useS().approver;
  const phone = usePhone();
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const n = reason.trim().length;
  const done = () => { setReason(""); setErr(undefined); onClose(); };
  const submit = () => (n < 10 ? setErr(fill(c.drawer.charCount, { n })) : onConfirm(reason.trim()));
  return (
    <Dialog open={open} onClose={done} side={phone ? "bottom" : undefined} title={c.drawer.rejectTitle} description={c.drawer.rejectHint}
      footer={<><Button variant="ghost" onClick={done}>{c.drawer.keep}</Button><Button variant="danger" onClick={submit} loading={busy}>{c.drawer.rejectYes}</Button></>}>
      <Field label={s.reasonLabel} error={err} hint={fill(c.drawer.charCount, { n })}>
        {({ id, describedBy, invalid }) => (
          <Textarea id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} value={reason} maxLength={500}
            onChange={(e) => { setReason(e.target.value); if (err) setErr(undefined); }} className={cx(err && "m-shake")} />
        )}
      </Field>
    </Dialog>
  );
}
