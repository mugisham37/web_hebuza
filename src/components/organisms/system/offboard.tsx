"use client";
// US4 Offboarding `/system/users/[id]/offboard` (WRK §6.3, board 04 US4): reason → hand off work → confirm.
// Deactivate only (records kept). SYS can't reassign cases — the service manager gets a hand-off.
import { useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { ApiError, api } from "@/lib/api/client";
import { cx } from "@/shared/format";
import { errorState } from "@/lib/system/api";
import { useUser } from "@/lib/system/b";
import { fill } from "@/content/pages/system-common";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Checkbox, Field, Select, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Stepper } from "@/components/atoms/misc";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { IdentityBlock, LockedContent, SysArt, useRoleLabel, useS } from "@/components/atoms/system";
import { SysPageHead } from "@/components/molecules/system/system";
import { useC, useRun } from "@/components/molecules/system/system";

export function OffboardView({ id }: { id: string }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const me = useSession().user?.id;
  const roleLabel = useRoleLabel();
  const q = useUser(id);
  const { run, online, dialog } = useRun();
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [revoke, setRevoke] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ handoffId: string | null; sm: string } | null>(null);
  const userHref = localHref(locale, `/system/users/${id}`);

  if (q.isPending) return <div className="grid max-w-2xl gap-4" aria-busy><div className="h-10 w-1/2 m-shimmer" /><div className="h-80 m-shimmer" /></div>;
  if (q.isError) {
    if (errorState(q.error) === "locked") return <LockedContent reason="role" />;
    if (q.error instanceof ApiError && q.error.status === 404) return <EmptyPanel title={s.states.notFound} body={c.d.notFound} action={<ButtonLink size="sm" variant="outline" href={localHref(locale, "/system/users")}>{c.d.back}</ButtonLink>} />;
    return <PanelError what={c.loadWhat} onRetry={() => q.refetch()} />;
  }
  const u = q.data;
  const blocked = u.id === me ? c.d.you : u.lastSysadmin ? c.lastSysadmin : u.status === "deactivated" && !done ? c.off.already : null;
  const reasonText = [c.off.reasons[reason as keyof typeof c.off.reasons], note.trim()].filter(Boolean).join(", ");
  const accountOnly = u.kind === "client" || u.kind === "service";

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      setDone(await run<{ handoffId: string | null; sm: string }>({ req: (h) => api.POST("/api/staff/users/{id}/offboard", { params: { path: { id: u.id } }, body: { reason: reasonText, revokeSessions: revoke }, headers: h }) }, c.off.stepUp));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const back = <Link href={userHref} className="inline-flex min-h-9 w-fit items-center gap-1.5 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{fill(c.off.back, { name: u.name })}</Link>;

  if (done) return (
    <div className="grid max-w-2xl gap-4">
      {back}
      <section className="grid justify-items-center gap-3 border border-border bg-surface px-6 py-12 text-center m-rise" aria-live="polite">
        <SysArt name="shield" />
        <h1 className="text-h3">{fill(c.off.doneTitle, { name: u.name })}</h1>
        <p className="max-w-md text-body text-fg-muted">{done.handoffId ? fill(c.off.doneBody, { id: done.handoffId, sm: done.sm }) : c.off.doneNoHandoff}</p>
        <ButtonLink href={userHref} variant="outline">{fill(c.off.back, { name: u.name })}</ButtonLink>
      </section>
    </div>
  );

  return (
    <div className="grid max-w-2xl gap-4 pb-16">
      {back}
      <SysPageHead title={c.offboard} sub={c.off.sub} />
      <div className="border border-border bg-surface p-4 sm:p-6"><IdentityBlock name={u.name} email={u.email} roles={u.roles.map((r) => r.role)} status={u.status} mfa={u.mfa} lastActiveAt={u.lastActiveAt} /></div>
      {blocked ? (
        <p role="alert" className="flex items-start gap-2 bg-warning-bg p-4 text-small"><Icon name="lock" size={16} aria-hidden className="mt-0.5 shrink-0" />{blocked}</p>
      ) : (
        <section className="grid gap-5 border border-border bg-surface p-4 sm:p-6">
          <Stepper steps={c.off.steps} current={step} />
          {err && <p role="alert" className="bg-danger-bg p-3 text-small font-medium text-danger m-shake">{err}</p>}
          <div key={step} className="grid gap-4 m-rise">
            {step === 0 && (
              <>
                <Field label={c.off.reason}>
                  {(f) => (
                    <Select id={f.id} value={reason} onChange={(e) => setReason(e.target.value)}>
                      <option value=""></option>
                      {Object.entries(c.off.reasons).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label={c.off.note} optional={s.common.optional}>{(f) => <Textarea id={f.id} className="min-h-20" value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
              </>
            )}
            {step === 1 && (
              <>
                <div className={cx("flex items-start gap-3 p-3 text-small", u.openCases ? "bg-warning-bg" : "bg-ink-100")}>
                  <Icon name={u.openCases ? "briefcase" : "check"} size={16} aria-hidden className="mt-0.5 shrink-0" />
                  <p><span className="block font-medium">{c.off.handoff}</span>{accountOnly ? c.off.handoffAccount : u.openCases ? fill(c.off.handoffBody, { n: u.openCases, sm: roleLabel("staff:service_manager") }) : c.off.handoffNone}</p>
                </div>
                <Checkbox label={c.off.revokeSessions} checked={revoke} onChange={(e) => setRevoke(e.target.checked)} />
              </>
            )}
            {step === 2 && (
              <>
                <p className="text-body"><span className="block text-label-lg">{fill(c.off.confirm, { name: u.name })}</span><span className="text-fg-muted">{fill(c.off.confirmBody, { name: u.name })}</span></p>
                <dl className="grid gap-2 bg-bg-subtle p-3 text-small">
                  <div className="flex flex-wrap gap-2"><dt className="text-fg-muted">{c.off.summaryReason}:</dt><dd className="font-medium">{reasonText}</dd></div>
                  <div className="flex flex-wrap gap-2"><dt className="text-fg-muted">{c.off.summaryHandoff}:</dt><dd className="font-medium tabular">{accountOnly || !u.openCases ? "" : u.openCases}</dd></div>
                  <div className="flex flex-wrap gap-2"><dt className="text-fg-muted">{c.off.summarySessions}:</dt><dd className="font-medium">{revoke ? c.off.yes : c.off.no}</dd></div>
                </dl>
              </>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            {step > 0 ? <Button variant="outline" onClick={() => setStep(step - 1)}>{s.common.back}</Button> : <ButtonLink variant="outline" href={userHref}>{s.common.cancel}</ButtonLink>}
            {step < 2
              ? <Button dots disabled={step === 0 && !reason} onClick={() => setStep(step + 1)}>{s.common.next}</Button>
              : <Button variant="danger" loading={busy} disabled={!online} onClick={submit}>{fill(c.off.confirm, { name: u.name })}</Button>}
          </div>
        </section>
      )}
      {dialog}
    </div>
  );
}
