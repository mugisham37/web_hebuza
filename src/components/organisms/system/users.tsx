"use client";
// U3 Users (plan 06 §7 U3, board 04 US1/US5/PU1). URL owns tab + filters + page + ?dialog=invite.
// Emails masked by the server in lists; clients tab is account status only; bulk suspend skips privileged accounts.
import { useState } from "react";
import { api } from "@/lib/api/client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { ROLES } from "@/shared/auth/roles";
import { cx, formatDate, formatRelative } from "@/shared/format";
import { errorState } from "@/lib/system/api";
import { useServiceAccounts, useUsers, type UserFilters } from "@/lib/system/b";
import { PRIVILEGED_GRANT } from "@/shared/system/approvals";
import type { ServiceAccountVM, SystemUserVM, UserKind } from "@/shared/system/types";
import { fill } from "@/content/pages/system-common";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Checkbox } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { Pagination } from "@/components/atoms/data-table";
import { BulkAction, BulkBar, EmptyPanel, FilterBar, MenuButton, PanelError, ReasonDialog, SavedViewTabs } from "@/components/molecules/ops/ops";
import { useNow, usePhone } from "@/components/atoms/step-up";
import { LockedContent, MfaBadge, RoleChip, StatusDot, useRoleLabel, useS } from "@/components/atoms/system";
import { SysPageHead } from "@/components/molecules/system/system";
import { ConfirmDialog, RowsSkeleton, UserActions, useC, useRun } from "@/components/molecules/system/system";
import { InviteDialog } from "@/components/organisms/system/invite";

const TABS = ["staff", "agents", "clients", "service"] as const;
type Tab = (typeof TABS)[number];
const KIND: Record<Exclude<Tab, "service">, UserKind> = { staff: "staff", agents: "agent", clients: "client" };
const STATUSES = ["active", "invited", "invite_expired", "suspended", "locked", "deactivated"] as const;
const MFAS = ["enrolled", "pending", "reset"] as const;
const LASTS = ["7", "30", "90", "never"] as const;
const PAGE = 20;
// shortcut: client-side paging; the API returns the whole filtered list (clients capped at 500), switch to nextCursor when it pages.

export function UsersView() {
  const c = useC();
  const s = useS();
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const tab = (TABS as readonly string[]).includes(sp.get("tab") ?? "") ? (sp.get("tab") as Tab) : "staff";
  const setQ = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    if (!("page" in patch)) n.delete("page");
    router.replace(`${path}?${n}`, { scroll: false });
  };
  const counts = useUsers({ kind: "staff" }).data?.counts;

  return (
    <div className="grid gap-5 pb-24">
      <SysPageHead title={c.title} sub={c.sub} actions={tab !== "service" && tab !== "clients" ? (
        <Button dots data-guide="system-invite" onClick={() => setQ({ dialog: "invite" })}><Icon name="plus" size={16} aria-hidden />{c.invite}</Button>
      ) : undefined} />
      <SavedViewTabs active={tab} onChange={(k) => setQ({ tab: k === "staff" ? null : k, role: null, status: null, mfa: null, last: null, q: null })}
        views={TABS.map((t) => ({ key: t, label: c.tabs[t], count: counts?.[t === "service" ? "service" : KIND[t]] }))} />
      {tab === "service" ? <ServiceTab /> : <UserList kind={KIND[tab]} sp={sp} setQ={setQ} />}
      <InviteDialog open={sp.get("dialog") === "invite"} onClose={() => setQ({ dialog: null })} />
    </div>
  );
}

function UserList({ kind, sp, setQ }: { kind: UserKind; sp: URLSearchParams; setQ: (p: Record<string, string | null>) => void }) {
  const c = useC();
  const s = useS();
  const role = useRoleLabel();
  const { locale } = useI18n();
  const me = useSession().user?.id;
  const now = useNow(60_000);
  const f: UserFilters = { kind, role: sp.get("role") ?? undefined, status: sp.get("status") ?? undefined, mfa: sp.get("mfa") ?? undefined, last: sp.get("last") ?? undefined, q: sp.get("q") ?? undefined };
  const q = useUsers(f);
  const [text, setText] = useState(f.q ?? "");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [ask, setAsk] = useState<null | "suspend" | "sessions">(null);
  const { attempt, run, dialog, toast, online } = useRun();
  const clients = kind === "client";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const rows = q.data?.rows ?? [];
  const pageRows = rows.slice((page - 1) * PAGE, page * PAGE);
  const filtered = !!(f.role || f.status || f.mfa || f.last || f.q);

  const one = (key: string, label: string, opts: readonly string[], name: (v: string) => string) => (
    <MenuButton key={key} label={`${label}: ${sp.get(key) ? name(sp.get(key)!) : c.filters.all}`} active={!!sp.get(key)}>
      {(close) => (
        <div role="radiogroup" aria-label={label} className="grid">
          {["", ...opts].map((v) => (
            <label key={v || "all"} className="flex cursor-pointer items-center gap-2.5 px-2.5 py-2 text-small hover:bg-navy-50">
              <input type="radio" name={`f-${key}`} className="size-4 accent-navy-700" checked={(sp.get(key) ?? "") === v} onChange={() => { setQ({ [key]: v || null }); close(); }} />
              {v ? name(v) : c.filters.all}
            </label>
          ))}
        </div>
      )}
    </MenuButton>
  );
  const chips = (["role", "status", "mfa", "last"] as const).filter((k) => sp.get(k)).map((k) => {
    const v = sp.get(k)!;
    const label = k === "role" ? role(v) : k === "status" ? s.status[v as keyof typeof s.status] : k === "mfa" ? s.mfa[v as keyof typeof s.mfa] : c.last[v as keyof typeof c.last];
    return { key: k, label: `${c.filters[k]}: ${label}`, onRemove: () => setQ({ [k]: null }) };
  });

  const selected = rows.filter((u) => sel.has(u.id));
  const toggle = (id: string) => setSel((x) => { const n = new Set(x); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const privSel = selected.filter((u) => u.roles.some((r) => PRIVILEGED_GRANT.has(r.role)));

  const bulkSuspend = async (reason: string) => {
    const targets = selected.filter((u) => !privSel.includes(u) && u.status === "active" && u.id !== me);
    let n = 0;
    for (const u of targets) { await run({ req: (h) => api.POST("/api/staff/users/{id}/status", { params: { path: { id: u.id } }, body: { action: "suspend", reason }, headers: h }) }); n++; }
    toast({ title: fill(c.toast.bulkSuspended, { n }), body: privSel.length ? fill(c.bulk.privilegedSkipped, { n: privSel.length }) : undefined, tone: "success" });
    setSel(new Set());
  };
  const bulkSessions = async () => {
    for (const u of selected) await attempt({ req: (h) => api.DELETE("/api/staff/users/{id}/sessions", { params: { path: { id: u.id } }, headers: h }) }, { stepUp: c.bulk.revoke });
    toast({ title: c.toast.sessions, tone: "success" });
    setSel(new Set());
  };
  const exportCsv = () => attempt({ req: (h) => api.POST("/api/staff/users/export", { headers: h }) }, { stepUp: c.bulk.export, ok: c.toast.exported });

  if (q.isError && !q.data) {
    const st = errorState(q.error);
    return st === "locked" ? <LockedContent reason="role" /> : <PanelError what={c.loadWhat} onRetry={() => q.refetch()} />;
  }
  const last = (u: SystemUserVM) => (u.lastActiveAt ? (now ? formatRelative(u.lastActiveAt, locale, now) : formatDate(u.lastActiveAt, locale)) : c.never);

  return (
    <section className="grid gap-4" aria-busy={q.isPending}>
      {clients && <p className="flex items-start gap-2 bg-ink-100 p-3 text-small"><Icon name="lock" size={16} aria-hidden className="mt-0.5 shrink-0" />{c.clientsNote}</p>}
      <FilterBar search={text} placeholder={c.search} chips={chips}
        onSearch={(v) => { setText(v); setQ({ q: v.trim() || null }); }}
        addFilter={<>
          {!clients && one("role", c.filters.role, ROLES.filter((r) => r !== "visitor" && r !== "client"), role)}
          {one("status", c.filters.status, STATUSES, (v) => s.status[v as keyof typeof s.status])}
          {one("mfa", c.filters.mfa, MFAS, (v) => s.mfa[v as keyof typeof s.mfa])}
          {one("last", c.filters.last, LASTS, (v) => c.last[v as keyof typeof c.last])}
        </>}
        right={<Button size="sm" variant="outline" disabled={!online} onClick={exportCsv}><Icon name="upload" size={14} aria-hidden />{c.bulk.export}</Button>}
      />

      <div className="overflow-hidden border border-border bg-surface">
        {q.isPending ? <RowsSkeleton /> : !rows.length ? (
          <div className="p-4">
            {filtered
              ? <EmptyPanel title={c.empty.title} body={c.empty.body} action={<Button size="sm" variant="outline" onClick={() => { setText(""); setQ({ role: null, status: null, mfa: null, last: null, q: null }); }}>{c.filters.clear}</Button>} />
              : <EmptyPanel title={c.empty.none} body={c.empty.noneBody} action={!clients ? <Button size="sm" onClick={() => setQ({ dialog: "invite" })}>{c.invite}</Button> : undefined} />}
          </div>
        ) : (
          <>
            {/* ≥ md: table; phones: stacked rows (no horizontal page scroll at 360 px). */}
            <table className="w-full text-small max-md:hidden">
              <thead className="border-b border-border bg-bg-subtle text-left text-eyebrow text-fg-muted">
                <tr>
                  {!clients && <th className="w-10 px-4 py-3"><input type="checkbox" aria-label={fill(c.bulk.selectAll, { n: pageRows.length })} className="size-4 accent-navy-700" checked={pageRows.length > 0 && pageRows.every((u) => sel.has(u.id))} onChange={(e) => setSel(e.target.checked ? new Set(pageRows.map((u) => u.id)) : new Set())} /></th>}
                  <th className="px-4 py-3 font-medium">{c.cols.name}</th>
                  {clients ? <th className="px-4 py-3 font-medium">{c.cols.customer}</th> : <th className="px-4 py-3 font-medium">{c.cols.roles}</th>}
                  <th className="px-4 py-3 font-medium">{c.cols.status}</th>
                  <th className="px-4 py-3 font-medium">{clients ? c.cols.mfaOpt : c.cols.mfa}</th>
                  <th className="px-4 py-3 font-medium">{clients ? c.cols.signIn : c.cols.last}</th>
                  <th className="px-4 py-3 text-right font-medium"><span className="sr-only">{c.cols.actions}</span></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((u) => (
                  <tr key={u.id} className={cx("border-b border-border last:border-0 hover:bg-navy-50", sel.has(u.id) && "bg-navy-100")}>
                    {!clients && <td className="px-4 py-3"><input type="checkbox" aria-label={fill(c.bulk.select, { name: u.name })} className="size-4 accent-navy-700" checked={sel.has(u.id)} onChange={() => toggle(u.id)} /></td>}
                    <td className="px-4 py-3"><NameCell u={u} you={u.id === me} /></td>
                    <td className="px-4 py-3">{clients ? <span className="font-mono tabular">{u.customerNo ?? ""}</span> : <Roles u={u} />}</td>
                    <td className="px-4 py-3"><StatusDot status={u.status} />{u.status === "invited" && u.invitation && <span className="block text-eyebrow text-fg-subtle tabular">{fill(c.expires, { t: now ? formatRelative(u.invitation.expiresAt, locale, now) : formatDate(u.invitation.expiresAt, locale) })}</span>}</td>
                    <td className="px-4 py-3"><MfaBadge state={u.mfa.state} methods={u.mfa.methods} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-fg-muted tabular">{last(u)}</td>
                    <td className="px-4 py-3 text-right"><UserActions user={u} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-border md:hidden">
              {pageRows.map((u) => (
                <li key={u.id} className={cx("grid gap-2 p-4", sel.has(u.id) && "bg-navy-100")}>
                  <div className="flex items-start gap-3">
                    {!clients && <input type="checkbox" aria-label={fill(c.bulk.select, { name: u.name })} className="mt-3 size-5 shrink-0 accent-navy-700" checked={sel.has(u.id)} onChange={() => toggle(u.id)} />}
                    <div className="min-w-0 flex-1"><NameCell u={u} you={u.id === me} /></div>
                    <UserActions user={u} compact />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-0">
                    {clients ? <span className="font-mono text-small">{u.customerNo}</span> : <Roles u={u} />}
                    <StatusDot status={u.status} /><MfaBadge state={u.mfa.state} />
                    <span className="text-small text-fg-muted">{last(u)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-small text-fg-muted tabular">{fill(c.showing, { n: pageRows.length, total: q.data?.total ?? 0 })}</p>
          {rows.length > PAGE && <Pagination page={page} pageCount={Math.ceil(rows.length / PAGE)} onPage={(p) => setQ({ page: p > 1 ? String(p) : null })} />}
        </div>
      )}

      <BulkBar count={sel.size} onClear={() => setSel(new Set())}>
        <BulkAction icon="laptop" onClick={() => setAsk("sessions")}>{c.bulk.revoke}</BulkAction>
        <BulkAction icon="clock" onClick={() => setAsk("suspend")}>{c.bulk.suspend}</BulkAction>
        <BulkAction icon="upload" onClick={exportCsv}>{c.bulk.export}</BulkAction>
      </BulkBar>
      <ReasonDialog open={ask === "suspend"} onClose={() => setAsk(null)} title={fill(c.toast.bulkSuspended, { n: selected.length - privSel.length })} description={c.suspendBody}
        notice={privSel.length ? <p className="bg-warning-bg p-3 text-small">{fill(c.bulk.privilegedSkipped, { n: privSel.length })}</p> : undefined}
        options={Object.entries(c.reasonOpts.suspend).map(([value, label]) => ({ value, label }))} noteLabel={c.reasonNote} confirmLabel={c.bulk.suspend} destructive audited
        onConfirm={(v) => bulkSuspend([c.reasonOpts.suspend[v.reason as keyof typeof c.reasonOpts.suspend], v.note].filter(Boolean).join(", "))} />
      <ConfirmDialog open={ask === "sessions"} onClose={() => setAsk(null)} title={c.bulk.revoke} body={c.d.sess.revokeAllBody} confirm={c.d.sess.revokeAll} danger onConfirm={bulkSessions} />
      {dialog}
    </section>
  );
}

function NameCell({ u, you }: { u: SystemUserVM; you: boolean }) {
  const { locale } = useI18n();
  const s = useS();
  return (
    <Link href={localHref(locale, `/system/users/${u.id}`)} className="group flex min-w-0 items-center gap-3">
      <Avatar name={u.name} size="sm" className="shrink-0 bg-navy-50 text-navy-700" />
      <span className="min-w-0">
        <span className="block truncate font-medium group-hover:underline">{u.name}{you && <span className="ml-1.5 text-fg-subtle">({s.identity.you})</span>}</span>
        <span className="block truncate text-fg-muted">{u.email}</span>
      </span>
    </Link>
  );
}
function Roles({ u }: { u: SystemUserVM }) {
  const c = useC();
  return (
    <span className="flex flex-wrap items-center gap-1">
      {u.roles.slice(0, 2).map((r) => <RoleChip key={r.role} role={r.role} />)}
      {u.roles.length > 2 && <span className="text-eyebrow text-fg-muted" title={u.roles.slice(2).map((r) => r.role).join(", ")}>{fill(c.more, { n: u.roles.length - 2 })}</span>}
    </span>
  );
}

// ---------------------------------------------------------------- US5 bootstrap + service accounts
function ServiceTab() {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const q = useServiceAccounts();
  const { run, attempt, online, dialog, toast } = useRun();
  const [disable, setDisable] = useState(false);
  const [secret, setSecret] = useState<{ name: string; value: string } | null>(null);
  const rotate = async (a: ServiceAccountVM) => {
    const r = await attempt<{ secret: string }>({ req: (h) => api.POST("/api/staff/x/service-accounts/{id}/rotate", { params: { path: { id: a.id } }, headers: h }) }, { stepUp: c.svc.stepUp });
    if (r) setSecret({ name: a.name, value: r.secret });
  };
  if (q.isError && !q.data) return errorState(q.error) === "locked" ? <LockedContent reason="role" /> : <PanelError what={c.svc.title} onRetry={() => q.refetch()} />;
  const b = q.data?.bootstrap;
  const bootOn = b && b.status !== "deactivated";
  return (
    <section className="grid gap-4" aria-busy={q.isPending}>
      {q.isPending ? <div className="h-20 m-shimmer" /> : bootOn ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 border border-danger/30 bg-danger-bg p-4 m-rise">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger text-white"><Icon name="lock" size={16} aria-hidden /></span>
          <p className="min-w-0 flex-1 text-small"><span className="block font-medium text-danger">{c.svc.seedTitle}</span>{c.svc.seedBody}</p>
          <Button variant="outline" size="sm" disabled={!online} onClick={() => setDisable(true)}>{c.svc.disable}</Button>
        </div>
      ) : b ? (
        <p className="flex items-center gap-2 bg-success-bg p-4 text-small text-success m-tone"><Icon name="check" size={16} aria-hidden className="m-tick" />{c.svc.seedDone}</p>
      ) : null}
      <div className="overflow-hidden border border-border bg-surface">
        <h2 className="border-b border-border px-4 py-3 text-label-lg">{c.svc.title}</h2>
        {q.isPending ? <RowsSkeleton rows={2} /> : !q.data?.items.length ? <div className="p-4"><EmptyPanel compact title={c.svc.none} /></div> : (
          <ul className="divide-y divide-border">
            {q.data.items.map((a) => (
              <li key={a.id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto_auto] sm:items-center sm:gap-4">
                <span className="font-medium">{a.name}</span>
                <span className="flex flex-wrap gap-1">{a.scopes.map((x) => <span key={x} className="bg-ink-100 px-2 py-0.5 font-mono text-eyebrow">{x}</span>)}</span>
                <span className="text-small text-fg-muted tabular"><span className="font-mono">••••••{a.last4}</span> · {fill(s.secret.lastRotated, { t: formatDate(a.rotatedAt, locale) })}</span>
                <Button size="sm" variant="outline" disabled={!online} onClick={() => rotate(a)}><Icon name="refresh" size={14} aria-hidden />{c.svc.rotate}</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {b && <ConfirmDialog open={disable} onClose={() => setDisable(false)} title={c.svc.seedTitle} body={c.svc.seedBody} confirm={c.svc.disable} danger
        onConfirm={async () => { await run({ req: (h) => api.POST("/api/staff/users/{id}/status", { params: { path: { id: b.id } }, body: { action: "deactivate", reason: "Bootstrap admin disabled after setup" }, headers: h }) }, c.svc.disableStepUp); toast({ title: c.svc.seedOff, tone: "success" }); }} />}
      <RevealOnce secret={secret} onClose={() => setSecret(null)} />
      {dialog}
    </section>
  );
}

/** Reveal-once key dialog: copy + "I've stored it" gate; the value is dropped from state on close. */
function RevealOnce({ secret, onClose }: { secret: { name: string; value: string } | null; onClose: () => void }) {
  const c = useC();
  const phone = usePhone();
  const [stored, setStored] = useState(false);
  const [copied, setCopied] = useState(false);
  const close = () => { setStored(false); setCopied(false); onClose(); };
  return (
    <Dialog open={!!secret} onClose={() => stored && close()} side={phone ? "bottom" : undefined} title={secret ? fill(c.svc.rotateTitle, { name: secret.name }) : ""} description={c.svc.rotateBody}
      footer={<Button disabled={!stored} onClick={close}>{c.inv.done}</Button>}>
      <div className="grid gap-4">
        <div className="flex items-center gap-2 theme-dark bg-bg p-3 text-fg">
          <code className="min-w-0 flex-1 font-mono text-small break-all select-all">{secret?.value}</code>
          <Button size="sm" variant="ghost" className="shrink-0 text-fg" onClick={() => { navigator.clipboard?.writeText(secret?.value ?? "").then(() => setCopied(true), () => {}); }}>
            <Icon name={copied ? "check" : "file"} size={14} aria-hidden />{copied ? c.svc.copied : c.svc.copy}
          </Button>
        </div>
        <Checkbox label={c.svc.stored} checked={stored} onChange={(e) => setStored(e.target.checked)} />
      </div>
    </Dialog>
  );
}
