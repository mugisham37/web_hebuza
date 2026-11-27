"use client";
// US2 / J1 invite: live SoD check + approver path before submit, step-up, 202 (pending approval) or 201 (sent),
// inline email_taken / self_grant, discard confirm without window.confirm. Typed values never go in the URL.
import { useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { ApiError, api } from "@/lib/api/client";
import { ROLES } from "@/shared/auth/roles";
import { cx, formatDateTime } from "@/shared/format";
import { approversFor, needsApproval, PRIVILEGED_GRANT } from "@/shared/system/approvals";
import { sodConflicts } from "@/shared/system/governance";
import type { ChangeRequestVM } from "@/shared/system/types";
import { fill } from "@/content/pages/system-common";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Field, Input, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { usePhone } from "@/components/atoms/step-up";
import { useRoleLabel, useS, SysArt } from "@/components/atoms/system";
import { ApproverPath, useDirtyGuard } from "@/components/molecules/system/system";
import { causeOf, useC, useRun } from "@/components/molecules/system/system";

// Mirrors server ASSIGNABLE: ops/finance/marketing/procurement/executive are system-admin only (all workspaces).
const SYSADMIN_ONLY: readonly string[] = ["staff:service_manager", "staff:finance", "staff:marketing", "staff:procurement", "staff:executive"];
const ASSIGNABLE = ROLES.filter((r) => r !== "visitor" && r !== "client" && !SYSADMIN_ONLY.includes(r));
type Done = { kind: "pending"; cr: ChangeRequestVM } | { kind: "sent"; userId: string; expiresAt: string; email: string };

export function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const role = useRoleLabel();
  const phone = usePhone();
  const me = useSession().user;
  const guard = useDirtyGuard();
  const { run, online, dialog } = useRun();
  const [f, setF] = useState({ name: "", email: "", phone: "", reason: "" });
  const [roles, setRoles] = useState<string[]>([]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const conflicts = sodConflicts(roles);
  const priv = needsApproval(roles);
  const top = roles.find((r) => r === "staff:sysadmin") ?? roles.find((r) => PRIVILEGED_GRANT.has(r));
  const dirty = !!(f.name || f.email || f.phone || f.reason || roles.length);
  const reset = () => { setF({ name: "", email: "", phone: "", reason: "" }); setRoles([]); setErrs({}); setDone(null); setBusy(false); guard.cancel(); };
  const close = () => { reset(); onClose(); };
  const tryClose = () => (dirty && !done ? guard.request() : close());
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async () => {
    const e: Record<string, string> = {};
    const phoneNorm = f.phone.replace(/\s/g, "");
    if (f.name.trim().length < 2) e.name = c.inv.errName;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = c.inv.errEmail;
    if (phoneNorm && !/^\+2507[2389]\d{7}$/.test(phoneNorm)) e.phone = c.inv.errPhone;
    if (!roles.length) e.roles = c.inv.errRoles;
    if (priv && f.reason.trim().length < 10) e.reason = c.inv.errReason;
    if (conflicts.length) e.roles = s.errors.sod_conflict;
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const r = await run<ChangeRequestVM | { invitation: { userId: string; expiresAt: string } }>(
        { req: (h) => api.POST("/api/staff/users/invitations", { body: { name: f.name.trim(), email: f.email.trim(), phone: phoneNorm || undefined, roles, reason: f.reason.trim() }, headers: h }) },
        c.inv.stepUp,
      );
      setDone("invitation" in r ? { kind: "sent", ...r.invitation, email: f.email.trim() } : { kind: "pending", cr: r });
    } catch (x) {
      const ce = causeOf(x);
      const t = ce instanceof ApiError ? ce.errorType : null;
      setErrs(t === "email_taken" || t === "self_grant" ? { email: (x as Error).message } : t === "sod_conflict" ? { roles: (x as Error).message } : t === "reason_required" ? { reason: c.inv.errReason } : { form: (x as Error).message });
    } finally { setBusy(false); }
  };

  const approver = done?.kind === "pending" ? done.cr.approvers.map((a) => role(a.role)).join(" + ") : "";
  return (
    <>
      <Dialog open={open} onClose={tryClose} side={phone ? "bottom" : "right"} title={done ? (done.kind === "pending" ? c.inv.pendingTitle : c.inv.sentTitle) : c.inv.title} description={done ? undefined : c.inv.sub}
        footer={done ? (
          <>
            <Button variant="outline" onClick={reset}>{c.inv.another}</Button>
            <Button onClick={close}>{c.inv.done}</Button>
          </>
        ) : guard.ask ? (
          <div className="grid w-full gap-3 bg-warning-bg p-3 m-rise" role="alert">
            <p className="text-small"><span className="block font-medium">{c.inv.discardQ}</span>{c.inv.discardBody}</p>
            <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={guard.cancel}>{s.states.keepEditing}</Button><Button size="sm" variant="danger" onClick={close}>{s.states.discardYes}</Button></div>
          </div>
        ) : (
          <>
            <Button variant="outline" onClick={tryClose}>{s.common.cancel}</Button>
            <Button dots data-guide="system-invite-send" loading={busy} disabled={!online || conflicts.length > 0} onClick={submit}>{priv ? c.inv.sendApproval : c.inv.send}</Button>
          </>
        )}>
        {done ? (
          <div className="grid justify-items-center gap-4 py-6 text-center m-rise">
            <span className="flex size-20 items-center justify-center rounded-full bg-success-bg text-success"><SysArt name={done.kind === "pending" ? "shield" : "sprout"} /></span>
            <p className="max-w-sm text-body text-fg-muted">
              {done.kind === "pending" ? fill(c.inv.pendingBody, { who: approver }) : fill(c.inv.sentBody, { email: done.email, t: formatDateTime(done.expiresAt, locale) })}
            </p>
            {done.kind === "pending" ? <ApproverPath cr={done.cr} me={me?.id} /> : <p className="flex items-center gap-1.5 text-small text-fg-subtle"><Icon name="clock" size={14} aria-hidden />{c.inv.expiry}</p>}
            <Link href={localHref(locale, done.kind === "pending" ? `/system/approvals?id=${done.cr.id}` : `/system/users/${done.userId}`)} className="text-small font-medium text-link underline underline-offset-4" onClick={close}>
              {done.kind === "pending" ? c.inv.viewApproval : c.inv.viewUser}
            </Link>
          </div>
        ) : (
          <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
            {errs.form && <p role="alert" className="bg-danger-bg p-3 text-small font-medium text-danger">{errs.form}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={c.inv.name} error={errs.name}>
                {(x) => <Input id={x.id} aria-describedby={x.describedBy} aria-invalid={x.invalid || undefined} autoComplete="off" value={f.name} onChange={set("name")} />}
              </Field>
              <Field label={c.inv.email} error={errs.email}>
                {(x) => <Input id={x.id} type="email" aria-describedby={x.describedBy} aria-invalid={x.invalid || undefined} autoComplete="off" value={f.email} onChange={set("email")} />}
              </Field>
            </div>
            <Field label={c.inv.phone} hint={c.inv.phoneHint} optional={s.common.optional} error={errs.phone}>
              {(x) => <Input id={x.id} type="tel" inputMode="tel" aria-describedby={x.describedBy} aria-invalid={x.invalid || undefined} placeholder="+250 78…" value={f.phone} onChange={set("phone")} />}
            </Field>
            <fieldset className="grid gap-2" aria-describedby="inv-roles-hint">
              <legend className="text-label">{c.inv.roles}</legend>
              <p id="inv-roles-hint" className="text-small text-fg-subtle">{c.inv.rolesHint}</p>
              {errs.roles && <p className="text-small font-medium text-danger">{errs.roles}</p>}
              <div className="flex flex-wrap gap-2">
                {ASSIGNABLE.map((r) => {
                  const on = roles.includes(r);
                  const bad = conflicts.some((p) => p.a === r || p.b === r);
                  return (
                    <label key={r} className={cx("inline-flex min-h-9 cursor-pointer items-center gap-1.5 border px-3 text-small m-press", on ? (bad ? "border-danger bg-danger-bg text-danger" : "border-secondary bg-secondary text-on-secondary") : "border-border-strong bg-surface hover:border-navy-300/40")}>
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => setRoles((x) => (on ? x.filter((y) => y !== r) : [...x, r]))} />
                      {PRIVILEGED_GRANT.has(r) && <Icon name="shield" size={13} aria-hidden />}
                      {role(r)}
                      {on && <Icon name="check" size={13} aria-hidden />}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div aria-live="polite" className="grid gap-3">
              {roles.length > 0 && (conflicts.length ? (
                <div className="grid gap-1.5 border border-danger/30 bg-danger-bg p-3 text-small text-danger m-shake">
                  {conflicts.map((p) => <p key={p.a + p.b} className="flex items-start gap-2"><Icon name="x" size={15} aria-hidden className="mt-0.5 shrink-0" />{fill(c.inv.conflict, { a: role(p.a), b: role(p.b), why: p.why })}</p>)}
                  <p className="text-fg-muted">{c.inv.requestWaiver}</p>
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-small font-medium text-success"><Icon name="check" size={15} aria-hidden className="m-tick" />{c.inv.noConflicts}</p>
              ))}
              {priv && top && !conflicts.length && (
                <>
                  <p className="flex items-start gap-2 bg-info-bg p-3 text-small"><Icon name="shield" size={16} aria-hidden className="mt-0.5 shrink-0 text-navy-700" />{c.inv.privileged}</p>
                  <ApproverPath me={undefined} cr={{ title: fill(c.inv.title, {}), proposedBy: { id: me?.id ?? "", name: me?.name ?? "" }, approvers: approversFor("invite_privileged", { role: top }), decisions: [], expiresAt: "", state: "applied" }} />
                  <Field label={c.inv.reason} hint={c.inv.reasonHint} error={errs.reason}>
                    {(x) => <Textarea id={x.id} aria-describedby={x.describedBy} aria-invalid={x.invalid || undefined} className="min-h-20" value={f.reason} onChange={set("reason")} />}
                  </Field>
                </>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-small text-fg-subtle"><Icon name="clock" size={14} aria-hidden />{c.inv.expiry}</p>
          </form>
        )}
      </Dialog>
      {dialog}
    </>
  );
}
