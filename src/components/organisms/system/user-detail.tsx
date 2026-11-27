"use client";
// U4 User detail (plan 06 §7 U4, board 04 US3): header + Profile / Roles & access / Security / Sessions / Activity,
// plus "Respond to compromise" (J4). Phones masked; worker private fields hidden; self + last-sysadmin guards.
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { ApiError, api } from "@/lib/api/client";
import { ROLES } from "@/shared/auth/roles";
import { cx, formatDate, formatDateTime, formatRelative } from "@/shared/format";
import { errorState } from "@/lib/system/api";
import { useDevices, useIdentity, useSessions, useUser, useUserActivity, type UserDetail } from "@/lib/system/b";
import { approversFor, needsApproval, PRIVILEGED_GRANT } from "@/shared/system/approvals";
import { sodConflicts } from "@/shared/system/governance";
import type { ChangeRequestVM, SystemUserVM } from "@/shared/system/types";
import { fill } from "@/content/pages/system-common";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { DateInput, Field, Select, Textarea } from "@/components/atoms/field";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Tabs } from "@/components/atoms/tabs";
import { EmptyPanel, PanelError, ReasonDialog } from "@/components/molecules/ops/ops";
import { usePhone } from "@/components/atoms/step-up";
import { CategoryChip, IdentityBlock, LockedContent, MfaBadge, RoleChip, useRoleLabel, useS } from "@/components/atoms/system";
import { ApproverPath, ConflictBanner, SessionRow } from "@/components/molecules/system/system";
import { causeOf, ConfirmDialog, RowsSkeleton, UserActions, useC, useRun } from "@/components/molecules/system/system";

const TABS = ["profile", "roles", "security", "sessions", "activity"] as const;
type Tab = (typeof TABS)[number];
const LANG = { rw: "Ikinyarwanda", en: "English", fr: "Français" } as const;
// Mirrors server ASSIGNABLE: ops/finance/marketing/procurement/executive are system-admin only (all workspaces).
const SYSADMIN_ONLY: readonly string[] = ["staff:service_manager", "staff:finance", "staff:marketing", "staff:procurement", "staff:executive"];
const ASSIGNABLE = ROLES.filter((r) => r !== "visitor" && r !== "client" && !SYSADMIN_ONLY.includes(r));

export function UserDetailView({ id }: { id: string }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const me = useSession().user?.id;
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const q = useUser(id);
  const [cmp, setCmp] = useState(false);
  const tab = (TABS as readonly string[]).includes(sp.get("tab") ?? "") ? (sp.get("tab") as Tab) : "profile";
  const back = (
    <Link href={localHref(locale, "/system/users")} className="inline-flex min-h-9 w-fit items-center gap-1.5 text-small text-fg-muted hover:text-fg">
      <Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{c.d.back}
    </Link>
  );

  if (q.isPending) return <div className="grid gap-4" aria-busy>{back}<div className="h-36 m-shimmer" /><div className="h-11 m-shimmer" /><div className="h-64 m-shimmer" /></div>;
  if (q.isError) {
    const st = errorState(q.error);
    if (st === "locked") return <LockedContent reason="role" />;
    if (q.error instanceof ApiError && q.error.status === 404) return <div className="grid gap-4">{back}<EmptyPanel title={s.states.notFound} body={c.d.notFound} /></div>;
    return <div className="grid gap-4">{back}<PanelError what={c.loadWhat} onRetry={() => q.refetch()} /></div>;
  }
  const u = q.data;
  const you = u.id === me;
  const live = u.status === "active" || u.status === "suspended" || u.status === "locked";

  return (
    <div className="grid gap-5 pb-16">
      {back}
      <header className="grid gap-4 border border-border bg-surface p-4 sm:p-6 m-rise">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <IdentityBlock name={u.name} email={u.email} roles={u.roles.map((r) => r.role)} status={u.status} mfa={u.mfa} lastActiveAt={u.lastActiveAt} you={you} />
          <div className="flex flex-wrap gap-2">
            {live && !you && u.kind !== "client" && <Button variant="danger" size="sm" data-guide="system-respond" onClick={() => setCmp(true)}><Icon name="shield" size={14} aria-hidden />{c.d.respond}</Button>}
            <UserActions user={u} lastSysadmin={u.lastSysadmin} />
          </div>
        </div>
        <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-small text-fg-muted">
          <span>{fill(c.d.created, { t: formatDate(u.createdAt, locale), who: u.createdBy ?? s.common.system })}</span>
          {u.invitation && <span>{fill(c.d.invitedBy, { who: u.invitation.invitedBy })} · {fill(c.expires, { t: formatDateTime(u.invitation.expiresAt, locale) })}</span>}
        </p>
        {you && <p className="flex items-center gap-2 bg-bg-subtle px-3 py-2.5 text-small"><Icon name="lock" size={15} aria-hidden />{c.d.you}</p>}
        {u.lastSysadmin && <p className="flex items-center gap-2 bg-warning-bg px-3 py-2.5 text-small"><Icon name="shield" size={15} aria-hidden />{c.lastSysadmin}</p>}
      </header>
      <Tabs value={tab} onChange={(t) => router.replace(`${path}?${t === "profile" ? "" : `tab=${t}`}`, { scroll: false })}
        tabs={TABS.map((t) => ({
          id: t, label: c.d.tabs[t],
          content: t === "profile" ? <Profile u={u} /> : t === "roles" ? <RolesTab u={u} you={you} onReload={() => q.refetch()} />
            : t === "security" ? <Security u={u} you={you} /> : t === "sessions" ? <Sessions u={u} /> : <Activity id={u.id} />,
        }))} />
      <CompromiseDialog u={u} open={cmp} onClose={() => setCmp(false)} />
    </div>
  );
}

const Row = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div className="grid gap-1 border-b border-border py-3 last:border-0 sm:grid-cols-[12rem_1fr]"><dt className="text-small text-fg-muted">{k}</dt><dd className="min-w-0 text-small break-words">{children}</dd></div>
);

function Profile({ u }: { u: UserDetail }) {
  const c = useC().d.profile;
  return (
    <section className="grid gap-4">
      <dl className="border border-border bg-surface px-4 sm:px-6">
        <Row k={c.name}>{u.name}</Row>
        <Row k={c.email}>{u.email}</Row>
        <Row k={c.phone}>{u.phone ? <span className="inline-flex flex-wrap items-center gap-2"><span className="font-mono tabular">{u.phone}</span><span className="text-eyebrow text-fg-subtle">{c.phoneHidden}</span></span> : ""}</Row>
        <Row k={c.locale}>{u.locale ? LANG[u.locale] : ""}</Row>
        {u.kind === "client" ? <Row k={c.customer}><span className="font-mono">{u.customerNo ?? ""}</span></Row> : <Row k={c.terms}>{u.termsVersion ? fill(c.termsVal, { v: u.termsVersion }) : c.termsNone}</Row>}
        {u.managerName && <Row k={c.manager}>{u.managerName}</Row>}
      </dl>
      {(u.kind === "agent" || u.kind === "staff") && <p className="flex items-start gap-2 bg-ink-100 p-3 text-small"><Icon name="lock" size={15} aria-hidden className="mt-0.5 shrink-0" />{c.worker}</p>}
    </section>
  );
}

// ---------------------------------------------------------------- roles & access
function RolesTab({ u, you, onReload }: { u: UserDetail; you: boolean; onReload: () => void }) {
  const c = useC();
  const s = useS();
  const role = useRoleLabel();
  const { locale } = useI18n();
  const { run, online, dialog, toast } = useRun();
  const [rm, setRm] = useState<string | null>(null);
  const [grant, setGrant] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const canEdit = !you && u.kind !== "client" && u.kind !== "service" && online;
  return (
    <section className="grid gap-4">
      {conflict && <ConflictBanner by={s.common.system} at={conflict} onReload={() => { setConflict(null); onReload(); }} />}
      <div className="border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6">
          <h2 className="text-label-lg">{c.d.roles.current}</h2>
          {canEdit && <Button size="sm" data-guide="system-grant-role" onClick={() => setGrant(true)}><Icon name="plus" size={14} aria-hidden />{c.d.roles.grant}</Button>}
        </div>
        {!u.roles.length ? <div className="p-4"><EmptyPanel compact title={c.d.roles.none} /></div> : (
          <ul className="divide-y divide-border m-stagger">
            {u.roles.map((r, i) => {
              const last = r.role === "staff:sysadmin" && u.lastSysadmin;
              return (
                <li key={r.role} style={{ "--i": i } as React.CSSProperties} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
                  <RoleChip role={r.role} />
                  <span className="min-w-0 flex-1 text-small text-fg-muted">
                    <span className="block">{fill(c.d.roles.grantedBy, { who: r.grantedBy, t: formatDate(r.grantedAt, locale) })}</span>
                    <span className="block">{r.expiresAt ? fill(c.d.roles.expiresAt, { t: formatDate(r.expiresAt, locale) }) : c.d.roles.noExpiry}</span>
                  </span>
                  {canEdit && (last
                    ? <span className="text-eyebrow text-fg-subtle">{c.d.roles.lastSys}</span>
                    : <Button size="sm" variant="outline" data-guide="system-role-remove" onClick={() => setRm(r.role)}>{c.d.roles.revoke}</Button>)}
                </li>
              );
            })}
          </ul>
        )}
        {you && <p className="flex items-center gap-2 border-t border-border px-4 py-3 text-small text-fg-muted sm:px-6"><Icon name="lock" size={14} aria-hidden />{c.d.roles.self}</p>}
      </div>
      <ReasonDialog open={!!rm} onClose={() => setRm(null)} title={rm ? fill(c.d.roles.revokeTitle, { role: role(rm), name: u.name }) : ""} description={c.d.roles.revokeBody}
        options={Object.entries(c.reasonOpts.revokeRole).map(([value, label]) => ({ value, label }))} noteLabel={c.reasonNote} confirmLabel={c.d.roles.revoke} destructive audited
        onConfirm={async (v) => {
          try {
            await run({ req: (h) => api.POST("/api/staff/users/{id}/roles", { params: { path: { id: u.id } }, body: { action: "revoke", role: rm!, reason: [c.reasonOpts.revokeRole[v.reason as keyof typeof c.reasonOpts.revokeRole], v.note].filter(Boolean).join(", ") }, headers: h }), version: u.version });
          } catch (e) { const ce = causeOf(e); if (ce instanceof ApiError && ce.errorType === "stale") setConflict(new Date().toISOString()); throw e; }
          toast({ title: fill(c.toast.roleRevoked, { role: role(rm!) }), tone: "success" });
        }} />
      {u.roles.some((r) => r.role === "staff:sysadmin") && u.kind !== "service" && <AllWorkspaces u={u} />}
      <GrantDialog u={u} open={grant} onClose={() => setGrant(false)} onConflict={() => setConflict(new Date().toISOString())} />
      {dialog}
    </section>
  );
}

/** "All workspaces": one sysadmin account works in every workspace (top-bar tabs) and can be assigned cases. */
const EVERY = ROLES.filter((r) => r !== "visitor");
function AllWorkspaces({ u }: { u: UserDetail }) {
  const c = useC();
  const s = useS();
  const a = c.d.roles.all;
  const phone = usePhone();
  const { run, online, dialog, toast } = useRun();
  const me = useSession().user?.id;
  const has = EVERY.every((r) => u.roles.some((g) => g.role === r));
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => { setOpen(false); setReason(""); setErr(null); };
  const submit = async () => {
    if (reason.trim().length < 10) return setErr(a.reasonHint);
    setBusy(true); setErr(null);
    try {
      await run({ req: (h) => api.POST("/api/staff/users/{id}/all-workspaces", { params: { path: { id: u.id } }, body: { on: !has, reason: reason.trim() }, headers: h }), version: u.version }, c.inv.stepUp);
      if (u.id === me) { // own account: reissue the access token now so the top bar shows the new workspaces
        await api.POST("/api/auth/active-role", { body: { role: "staff:sysadmin" } });
        return window.location.reload();
      }
      toast({ title: a.done, tone: "success" });
      close();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div data-guide="system-all-workspaces" className="flex flex-wrap items-start gap-4 border border-border bg-surface p-4 sm:p-6">
      <Icon name="layers" size={20} aria-hidden className="mt-0.5 shrink-0 text-navy-700" />
      <div className="grid min-w-0 flex-1 basis-64 gap-1">
        <h2 className="flex flex-wrap items-center gap-2 text-label-lg">{a.title}{has && <span className="bg-success-bg px-2 py-0.5 text-eyebrow text-success">{a.active}</span>}</h2>
        <p className="text-small text-fg-muted">{a.body}</p>
      </div>
      <Button size="sm" variant={has ? "outline" : "primary"} disabled={!online} onClick={() => setOpen(true)}>{has ? a.off : a.on}</Button>
      <Dialog open={open} onClose={close} side={phone ? "bottom" : undefined} title={fill(has ? a.offTitle : a.onTitle, { name: u.name })}
        footer={<><Button variant="outline" onClick={close}>{s.common.cancel}</Button><Button dots loading={busy} disabled={!online} variant={has ? "danger" : "primary"} onClick={submit}>{has ? a.off : a.on}</Button></>}>
        <div className="grid gap-4">
          {err && <p role="alert" className="bg-danger-bg p-3 text-small font-medium text-danger m-shake">{err}</p>}
          <p className="text-small text-fg-muted">{has ? a.offBody : a.body}</p>
          <Field label={a.reason} hint={a.reasonHint}>{(f) => <Textarea id={f.id} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />}</Field>
        </div>
      </Dialog>
      {dialog}
    </div>
  );
}

function GrantDialog({ u, open, onClose, onConflict }: { u: UserDetail; open: boolean; onClose: () => void; onConflict: () => void }) {
  const c = useC();
  const s = useS();
  const role = useRoleLabel();
  const phone = usePhone();
  const me = useSession().user;
  const { run, online, dialog, toast } = useRun();
  const [r, setR] = useState("");
  const [reason, setReason] = useState("");
  const [exp, setExp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const have = u.roles.map((x) => x.role);
  const conflicts = r ? sodConflicts([...have, r]) : [];
  const priv = !!r && needsApproval([r]);
  const close = () => { setR(""); setReason(""); setExp(""); setErr(null); onClose(); };
  const submit = async () => {
    if (!r) return setErr(c.inv.errRoles);
    if (reason.trim().length < 10) return setErr(c.inv.errReason);
    setBusy(true); setErr(null);
    try {
      const res = await run<ChangeRequestVM | SystemUserVM>({ req: (h) => api.POST("/api/staff/users/{id}/roles", { params: { path: { id: u.id } }, body: { action: "grant", role: r, reason: reason.trim(), expiresAt: exp ? new Date(`${exp}T23:59:59+02:00`).toISOString() : null }, headers: h }), version: u.version }, priv ? c.inv.stepUp : undefined);
      if ("approvers" in res) toast({ title: c.toast.pending, body: fill(c.toast.pendingBody, { who: res.approvers.map((a) => role(a.role)).join(" + ") }), tone: "success" });
      else toast({ title: fill(c.toast.roleGranted, { role: role(r) }), tone: "success" });
      close();
    } catch (e) {
      const ce = causeOf(e);
      if (ce instanceof ApiError && ce.errorType === "stale") { onConflict(); close(); }
      setErr((e as Error).message);
    } finally { setBusy(false); }
  };
  return (
    <>
      <Dialog open={open} onClose={close} side={phone ? "bottom" : undefined} title={fill(c.d.roles.grantTitle, { name: u.name })}
        footer={<><Button variant="outline" onClick={close}>{s.common.cancel}</Button><Button dots data-guide="system-grant-submit" loading={busy} disabled={!online || conflicts.length > 0} onClick={submit}>{priv ? c.inv.sendApproval : c.d.roles.grant}</Button></>}>
        <div className="grid gap-4">
          {err && <p role="alert" className="bg-danger-bg p-3 text-small font-medium text-danger m-shake">{err}</p>}
          <Field label={c.d.roles.role}>
            {(f) => (
              <Select id={f.id} value={r} onChange={(e) => setR(e.target.value)}>
                <option value=""></option>
                {ASSIGNABLE.filter((x) => !have.includes(x)).map((x) => <option key={x} value={x}>{role(x)}{PRIVILEGED_GRANT.has(x) ? " ★" : ""}</option>)}
              </Select>
            )}
          </Field>
          {r && (conflicts.length
            ? <div className="grid gap-1 border border-danger/30 bg-danger-bg p-3 text-small text-danger">{conflicts.map((p) => <p key={p.a + p.b}>{fill(c.inv.conflict, { a: role(p.a), b: role(p.b), why: p.why })}</p>)}<p className="text-fg-muted">{c.inv.requestWaiver}</p></div>
            : <p className="flex items-center gap-1.5 text-small font-medium text-success"><Icon name="check" size={15} aria-hidden className="m-tick" />{c.inv.noConflicts}</p>)}
          {priv && !conflicts.length && <ApproverPath cr={{ title: fill(c.d.roles.grantTitle, { name: u.name }), proposedBy: { id: me?.id ?? "", name: me?.name ?? "" }, approvers: approversFor("role_grant", { role: r }), decisions: [], expiresAt: "", state: "applied" }} />}
          <Field label={c.inv.reason} hint={c.inv.reasonHint}>
            {(f) => <Textarea id={f.id} aria-describedby={f.describedBy} className="min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
          <Field label={c.d.roles.expiry} hint={c.d.roles.expiryHint} optional={s.common.optional}>
            {(f) => <DateInput id={f.id} aria-describedby={f.describedBy} value={exp} onChange={(e) => setExp(e.target.value)} />}
          </Field>
        </div>
      </Dialog>
      {dialog}
    </>
  );
}

// ---------------------------------------------------------------- security
function Security({ u, you }: { u: UserDetail; you: boolean }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const dev = useDevices(u.id);
  const idc = useIdentity();
  const { attempt, online, dialog } = useRun();
  const [reset, setReset] = useState(false);
  const approved = idc.data?.items.find((r) => r.userId === u.id && r.kind === "two_factor" && r.status === "approved");
  const noTrust = u.roles.some((r) => r.role === "staff:sysadmin" || r.role === "staff:finance");
  const off = you || !online;
  return (
    <section className="grid gap-4">
      <div className="border border-border bg-surface p-4 sm:p-6">
        <h2 className="mb-3 text-label-lg">{c.d.sec.mfa}</h2>
        <dl>
          <Row k={c.cols.mfa}><MfaBadge state={u.mfa.state} methods={u.mfa.methods} /></Row>
          <Row k={c.d.sec.methods}>{u.mfa.methods.length ? u.mfa.methods.map((m) => s.mfa[m]).join(" · ") : ""}</Row>
          <Row k={c.d.sec.backup}>{u.mfa.backupCodesLeft ?? c.d.sec.backupNone}</Row>
        </dl>
        <div className="mt-4 grid gap-3 border-t border-border pt-4">
          <Action title={c.d.sec.reset} body={c.d.sec.resetBody} icon="refresh">
            <Button size="sm" variant="outline" data-guide="system-reset-password" disabled={off} onClick={() => setReset(true)}>{c.d.sec.reset}</Button>
          </Action>
          <Action title={c.d.sec.mfaReset} body={approved ? c.d.sec.mfaResetHint : c.d.sec.noCheck} icon="shield">
            {approved
              ? <Button size="sm" variant="outline" data-guide="system-mfa-reset" disabled={off} onClick={() => attempt({ req: (h) => api.POST("/api/staff/users/{id}/mfa-reset", { params: { path: { id: u.id } }, body: { accessRequestId: approved.id }, headers: h }) }, { stepUp: c.d.sec.mfaReset, ok: c.d.sec.mfaReset })}>{c.d.sec.mfaReset}</Button>
              : <ButtonLink size="sm" variant="outline" data-guide="system-mfa-reset" href={localHref(locale, `/system/identity?q=${encodeURIComponent(u.name)}`)}>{c.d.sec.openCheck}</ButtonLink>}
          </Action>
          {u.status === "locked" && (
            <Action title={c.d.sec.unlock} body={c.d.sec.unlockBody} icon="lock">
              <ButtonLink size="sm" href={localHref(locale, `/system/identity?q=${encodeURIComponent(u.name)}`)}>{c.d.sec.unlockFromRequest}</ButtonLink>
            </Action>
          )}
        </div>
      </div>
      <div className="border border-border bg-surface p-4 sm:p-6">
        <h2 className="mb-3 text-label-lg">{c.d.sec.devices}</h2>
        {noTrust && <p className="mb-3 flex items-start gap-2 bg-info-bg p-3 text-small"><Icon name="lock" size={15} aria-hidden className="mt-0.5 shrink-0 text-navy-700" />{c.d.sec.devicesBlocked}</p>}
        {dev.isPending ? <RowsSkeleton rows={2} /> : dev.isError ? <PanelError what={c.d.sec.devices} onRetry={() => dev.refetch()} /> : !dev.data.items.length ? <p className="text-small text-fg-muted">{c.d.sec.devicesNone}</p> : (
          <ul className="divide-y divide-border">
            {dev.data.items.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-ink-100"><Icon name="laptop" size={16} aria-hidden /></span>
                <span className="min-w-0 flex-1 text-small"><span className="block font-medium">{d.label}</span><span className="text-fg-muted">{fill(c.d.sec.added, { t: formatDate(d.addedAt, locale) })} · {fill(c.d.sec.used, { t: formatDate(d.lastUsedAt, locale) })}</span></span>
                <Button size="sm" variant="outline" disabled={!online} onClick={() => attempt({ req: (h) => api.DELETE("/api/staff/users/{id}/trusted-devices/{did}", { params: { path: { id: u.id, did: d.id } }, headers: h }) }, { ok: c.toast.device })}>{c.d.sec.remove}</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ConfirmDialog open={reset} onClose={() => setReset(false)} title={c.d.sec.reset} body={c.d.sec.resetBody} confirm={c.d.sec.resetConfirm} danger
        onConfirm={() => attempt({ req: (h) => api.POST("/api/staff/users/{id}/password-reset", { params: { path: { id: u.id } }, headers: h }) }, { stepUp: c.d.sec.reset, ok: fill(c.toast.reset, { name: u.name }) })} />
      {dialog}
    </section>
  );
}
function Action({ title, body, icon, children }: { title: string; body: string; icon: IconName; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-100"><Icon name={icon} size={16} aria-hidden /></span>
      <p className="min-w-0 flex-1 basis-56 text-small"><span className="block font-medium">{title}</span><span className="text-fg-muted">{body}</span></p>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- sessions
function Sessions({ u }: { u: UserDetail }) {
  const c = useC();
  const q = useSessions(u.id);
  const { attempt, online, dialog } = useRun();
  const [busy, setBusy] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const items = q.data?.items ?? [];
  return (
    <section className="border border-border bg-surface p-4 sm:p-6" aria-busy={q.isPending}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-label-lg">{c.d.sess.title}{items.length > 0 && <span className="ml-2 text-small text-fg-muted tabular">{items.length}</span>}</h2>
        {items.some((x) => !x.current) && <Button size="sm" variant="danger" disabled={!online} onClick={() => setAll(true)}>{c.d.sess.revokeAll}</Button>}
      </div>
      {q.isPending ? <RowsSkeleton rows={3} /> : q.isError ? <PanelError what={c.d.sess.title} onRetry={() => q.refetch()} /> : !items.length ? <EmptyPanel compact title={c.d.sess.none} /> : (
        <ul>
          {items.map((x) => <SessionRow key={x.id} session={x} busy={busy === x.id}
            onRevoke={online ? async () => { setBusy(x.id); await attempt({ req: (h) => api.DELETE("/api/staff/users/{id}/sessions/{sid}", { params: { path: { id: u.id, sid: x.id } }, headers: h }) }, { ok: c.toast.session }); setBusy(null); } : undefined} />)}
        </ul>
      )}
      <ConfirmDialog open={all} onClose={() => setAll(false)} title={fill(c.d.sess.revokeAllTitle, { name: u.name })} body={c.d.sess.revokeAllBody} confirm={c.d.sess.revokeAll} danger
        onConfirm={() => attempt({ req: (h) => api.DELETE("/api/staff/users/{id}/sessions", { params: { path: { id: u.id } }, headers: h }) }, { stepUp: c.d.sess.revokeAll, ok: c.toast.sessions })} />
      {dialog}
    </section>
  );
}

// ---------------------------------------------------------------- activity (F-AUD-10) — no motion on audit rows
function Activity({ id }: { id: string }) {
  const c = useC();
  const { locale } = useI18n();
  const q = useUserActivity(id);
  if (q.isPending) return <RowsSkeleton />;
  if (q.isError) return <PanelError what={c.d.tabs.activity} onRetry={() => q.refetch()} />;
  if (!q.data.items.length) return <EmptyPanel title={c.d.act.empty} />;
  return (
    <section className="border border-border bg-surface">
      <ol className="divide-y divide-border">
        {q.data.items.map((e) => (
          <li key={e.id} className="grid gap-1.5 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-6">
            <time dateTime={e.at} className="text-small text-fg-muted tabular">{formatDateTime(e.at, locale)}</time>
            <span className="min-w-0 text-small"><span className="block truncate font-mono">{e.action}</span><span className="text-fg-muted">{e.actorLabel}{e.details.reason ? ` · ${e.details.reason}` : ""}</span></span>
            <span className="flex items-center gap-2"><CategoryChip category={e.category} />
              <Link href={localHref(locale, `/system/audit?id=${e.id}`)} className="text-small font-medium text-link underline-offset-4 hover:underline">{c.d.act.openAudit}</Link></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------- J4 respond to compromise
type StepState = "idle" | "running" | "done" | "failed" | "skipped";
function CompromiseDialog({ u, open, onClose }: { u: UserDetail; open: boolean; onClose: () => void }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const phone = usePhone();
  const idc = useIdentity();
  const { run, online, dialog } = useRun();
  const [st, setSt] = useState<StepState[]>(["idle", "idle", "idle", "idle", "idle"]);
  const set = (i: number, v: StepState) => setSt((x) => x.map((y, j) => (j === i ? v : y)));
  const approved = idc.data?.items.find((r) => r.userId === u.id && r.kind === "two_factor" && r.status === "approved");
  const L = (p: string) => localHref(locale, p);
  const steps: { label: string; go?: () => Promise<unknown>; href?: string }[] = [
    { label: c.cmp.s1, go: () => run({ req: (h) => api.DELETE("/api/staff/users/{id}/sessions", { params: { path: { id: u.id } }, headers: h }) }, c.cmp.stepUp) },
    { label: c.cmp.s2, go: () => run({ req: (h) => api.POST("/api/staff/users/{id}/password-reset", { params: { path: { id: u.id } }, headers: h }) }, c.cmp.stepUp) },
    { label: c.cmp.s3, go: approved ? () => run({ req: (h) => api.POST("/api/staff/users/{id}/mfa-reset", { params: { path: { id: u.id } }, body: { accessRequestId: approved.id }, headers: h }) }, c.cmp.stepUp) : undefined },
    { label: c.cmp.s4, href: L(`/system/ops?tab=incidents&new=1&sev=2&title=${encodeURIComponent(`${c.cmp.title}: ${u.name}`)}`) },
    { label: c.cmp.s5, href: L(`/system/audit?actor=${u.id}`) },
  ];
  const exec = async (i: number) => {
    const g = steps[i].go;
    if (!g) return set(i, "skipped");
    set(i, "running");
    try { await g(); set(i, "done"); } catch { set(i, "failed"); }
  };
  const close = () => { setSt(["idle", "idle", "idle", "idle", "idle"]); onClose(); };
  return (
    <>
      <Dialog open={open} onClose={close} side={phone ? "bottom" : "right"} title={c.cmp.title} description={c.cmp.sub}
        footer={<><Button variant="outline" onClick={close}>{s.common.close}</Button><Button variant="danger" disabled={!online} onClick={async () => { await exec(0); await exec(1); }}>{c.cmp.runAll}</Button></>}>
        <ol className="grid gap-3">
          {steps.map((x, i) => {
            const v = x.go || x.href ? st[i] : "skipped";
            return (
              <li key={i} className={cx("flex flex-wrap items-center gap-3 border p-3", v === "done" ? "border-success/30 bg-success-bg m-tone" : v === "failed" ? "border-danger/30 bg-danger-bg m-shake" : "border-border bg-surface")}>
                <span className={cx("flex size-8 shrink-0 items-center justify-center rounded-full text-eyebrow", v === "done" ? "bg-success text-white" : "bg-ink-100")}>
                  {v === "done" ? <Icon name="check" size={14} aria-hidden className="m-tick" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1 basis-40 text-small">
                  <span className="block font-medium">{x.label}</span>
                  <span aria-live="polite" className={cx(v === "failed" ? "text-danger" : "text-fg-muted")}>
                    {v === "done" ? c.cmp.done : v === "failed" ? c.cmp.failed : !x.go && !x.href ? c.cmp.skipped : ""}
                  </span>
                </span>
                {x.href ? <ButtonLink size="sm" variant="outline" href={x.href}>{i === 3 ? c.cmp.incident : c.cmp.audit}</ButtonLink>
                  : x.go ? <Button size="sm" variant="outline" loading={v === "running"} disabled={!online || v === "done"} onClick={() => exec(i)}>{v === "failed" ? s.states.retry : c.cmp.run}</Button>
                  : <ButtonLink size="sm" variant="ghost" href={L(`/system/identity?q=${encodeURIComponent(u.name)}`)}>{c.d.sec.openCheck}</ButtonLink>}
              </li>
            );
          })}
        </ol>
      </Dialog>
      {dialog}
    </>
  );
}
