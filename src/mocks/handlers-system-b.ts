// Stage 6 system lane B mocks (Project/SYSTEM-AGENT-BRIEF.md): users (U3/U4), offboarding, service accounts,
// identity checks (U10, real /api/admin/access-requests paths) and impersonation (U11). Owned by lane B.
// shortcut: ★ mock — drop each handler as the real /api/staff/* endpoint ships.
import { http, delay, type HttpHandler } from "msw";
import { guard, readOnlyGuard, stepUpOk, needStepUp, stale, idempotent, accepted, submitChange, onApply, ok, fail } from "./handlers-system";
import {
  USERS, SESSIONS, DEVICES, SERVICE_ACCOUNTS, IDENTITY, IMPERSONATION, PEOPLE, actor, userOf, record, nextChangeId, inviteExpiry, auditChain,
} from "./system-world";
import { CASES } from "./ops-world";
import { propose, needsApproval, PRIVILEGED_GRANT } from "@/shared/system/approvals";
import { USER_NEXT, isLastSysadmin, isProtectedTarget, sodConflicts, IMPERSONATION_MINUTES, type UserAction } from "@/shared/system/governance";
import { ROLES, ROLE_META } from "@/shared/auth/roles";
import { mask } from "@/shared/format";
import type { SystemUserVM, UserKind } from "@/shared/system/types";

const D = 86_400_000;
const body = async <T,>(r: Request) => ((await r.json().catch(() => ({}))) ?? {}) as T;
const write = () => guard() ?? readOnlyGuard();
/** Phones are masked everywhere for SYS (§10.2); list emails masked too. */
const view = (u: SystemUserVM, list = false): SystemUserVM => ({
  ...u, phone: u.phone ? mask(u.phone, 3) : null, email: list ? u.email.replace(/^(.{1,5}).*@/, "$1…@") : u.email,
});
const sessionsOf = (id: string) => SESSIONS.filter((s) => s.userId === id && !s.revokedAt);
function revokeSessions(id: string, keepCurrent = true) {
  const now = new Date().toISOString();
  const hit = sessionsOf(id).filter((s) => !(keepCurrent && s.current));
  hit.forEach((s) => (s.revokedAt = now));
  if (hit.length) record("auth.session.revoked", "user", id, { sessions: hit.length }, { sessions: 0 });
  return hit.length;
}
const bump = (u: SystemUserVM) => { u.version++; return u; };
const ASSIGNABLE: readonly string[] = ROLES.filter((r) => r !== "visitor" && r !== "client");
const openCases = (id: string) => CASES.filter((c) => c.assignees.some((a) => a.id === id) && !["closed", "cancelled", "completed"].includes(String(c.status))).length;

/** Invite expiry + impersonation expiry are swept on read (server would run a job). */
function sweep(now = Date.now()) {
  USERS.forEach((u) => { if (u.status === "invited" && u.invitation && Date.parse(u.invitation.expiresAt) <= now) { u.status = "invite_expired"; bump(u); } });
  const imp = IMPERSONATION.current;
  if (imp && Date.parse(imp.until) <= now) {
    IMPERSONATION.current = null;
    record("access.impersonation.ended", "user", imp.targetId, undefined, { endedBy: "expiry" }, undefined, PEOPLE.system);
  }
}

function createInvited(p: { name: string; email: string; phone?: string | null; roles: string[] }, by: string): SystemUserVM {
  const kind: UserKind = p.roles.every((r) => r === "staff:agent" || r === "ext:agent") ? "agent" : "staff";
  const now = new Date().toISOString();
  const u: SystemUserVM = {
    id: `u-${Math.abs([...p.email].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(36)}`, name: p.name, email: p.email, phone: p.phone ?? null, kind,
    roles: p.roles.map((role) => ({ role, grantedBy: by, grantedAt: now, expiresAt: null })), status: "invited",
    mfa: { state: "pending", methods: [], backupCodesLeft: null }, lastActiveAt: null, invitation: { expiresAt: inviteExpiry(), invitedBy: by },
    createdAt: now, createdBy: by, locale: "rw", version: 1,
  };
  USERS.push(u);
  record("access.user.invited", "user", u.id, undefined, { roles: p.roles, expiresAt: u.invitation!.expiresAt });
  return u;
}

// Applied by the core approvals engine once the second person approves.
onApply("invite_privileged", (cr) => {
  const p = cr.payload as { name: string; email: string; phone?: string | null; roles: string[] };
  if (!USERS.some((u) => u.email.toLowerCase() === p.email.toLowerCase())) createInvited(p, cr.proposedBy.name);
});
onApply("role_grant", (cr) => {
  const p = cr.payload as { userId: string; role: string; expiresAt?: string | null };
  const u = userOf(p.userId);
  if (!u || u.roles.some((r) => r.role === p.role)) return;
  u.roles.push({ role: p.role, grantedBy: cr.proposedBy.name, grantedAt: new Date().toISOString(), expiresAt: p.expiresAt ?? null });
  bump(u);
  record("access.role.granted", "user", u.id, undefined, { role: p.role }, cr.reason, undefined, { approvalRef: cr.id });
});

const LAST: Record<string, (t: number | null, now: number) => boolean> = {
  "7": (t, n) => t !== null && n - t < 7 * D, "30": (t, n) => t !== null && n - t < 30 * D, "90": (t, n) => t !== null && n - t >= 90 * D, never: (t) => t === null,
};

export const handlers: HttpHandler[] = [
  // ------------------------------------------------------------ U3 list
  http.get("/api/staff/users", async ({ request }) => {
    await delay(220);
    const g = guard();
    if (g) return g;
    sweep();
    const q = new URL(request.url).searchParams;
    const kind = (q.get("kind") ?? "staff") as UserKind;
    const role = q.get("role"), status = q.get("status"), mfa = q.get("mfa"), last = q.get("last"), text = (q.get("q") ?? "").trim().toLowerCase();
    const now = Date.now();
    const counts = { staff: 0, agent: 0, client: 0, service: 0 } as Record<UserKind, number>;
    USERS.forEach((u) => counts[u.kind]++);
    const rows = USERS.filter((u) => u.kind === kind
      && (!role || u.roles.some((r) => r.role === role))
      && (!status || u.status === status)
      && (!mfa || u.mfa.state === mfa)
      && (!last || !LAST[last] || LAST[last](u.lastActiveAt ? Date.parse(u.lastActiveAt) : null, now))
      && (!text || u.name.toLowerCase().includes(text) || u.email.toLowerCase().includes(text) || (u.customerNo ?? "").toLowerCase().includes(text)));
    return ok({ rows: rows.map((u) => view(u, true)), total: rows.length, counts, nextCursor: null });
  }),
  http.post("/api/staff/users/export", async () => {
    const g = write();
    if (g) return g;
    record("data_export.report.exported", "report", "users.csv", undefined, { rows: USERS.length });
    return ok({ ready: true });
  }),

  // ------------------------------------------------------------ U4 detail
  http.get("/api/staff/users/:id", async ({ params }) => {
    await delay(160);
    const g = guard();
    if (g) return g;
    sweep();
    const u = userOf(String(params.id));
    return u ? ok({ ...view(u), lastSysadmin: isLastSysadmin(USERS, u.id), openCases: openCases(u.id) }) : fail(404, "not_found", "Not found.");
  }),
  http.get("/api/staff/users/:id/activity", async ({ params }) => {
    await delay(260);
    const g = guard();
    if (g) return g;
    const id = String(params.id);
    const rows = (await auditChain()).filter((e) => e.resourceId === id || e.actorId === id).slice(-40).reverse();
    return ok({ items: rows });
  }),

  // ------------------------------------------------------------ invite (J1)
  http.post("/api/staff/users/invitations", async ({ request }) => {
    const g = write();
    if (g) return g;
    if (!stepUpOk(request)) return needStepUp();
    const b = await body<{ name?: string; email?: string; phone?: string; roles?: string[]; reason?: string }>(request);
    const name = (b.name ?? "").trim(), email = (b.email ?? "").trim().toLowerCase(), roles = (b.roles ?? []).filter((r) => ASSIGNABLE.includes(r)), reason = (b.reason ?? "").trim();
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !roles.length || (b.phone && !/^\+2507[2389]\d{7}$/.test(b.phone))) return fail(422, "validation", "Check the fields.");
    return idempotent(request, () => {
      const me = actor();
      if (USERS.some((u) => u.email.toLowerCase() === email)) {
        if (userOf(me.id)?.email.toLowerCase() === email) return fail(403, "self_grant", "Can't grant yourself roles.");
        return fail(409, "email_taken", "Email already has an account.");
      }
      if (sodConflicts(roles).length) return fail(422, "sod_conflict", "Role mix blocked.");
      if (needsApproval(roles)) {
        if (reason.length < 10) return fail(422, "reason_required", "Reason needed.");
        const top = roles.find((r) => r === "staff:sysadmin") ?? roles.find((r) => PRIVILEGED_GRANT.has(r))!;
        return submitChange(propose({
          id: nextChangeId(), kind: "invite_privileged", title: `Invite ${name} (${roles.join(", ")})`, by: { id: me.id, name: me.name }, now: Date.now(), reason,
          before: null, after: { name, email, roles }, payload: { name, email, phone: b.phone ?? null, roles, role: top },
        }));
      }
      const u = createInvited({ name, email, phone: b.phone, roles }, me.name);
      return ok({ invitation: { userId: u.id, expiresAt: u.invitation!.expiresAt } });
    });
  }),
  http.post("/api/staff/users/invitations/:id/:op", async ({ request, params }) => {
    const g = write();
    if (g) return g;
    sweep();
    const u = userOf(String(params.id));
    if (!u) return fail(404, "not_found", "Not found.");
    const op = params.op === "resend" ? "resend" : params.op === "revoke" ? "revoke_invite" : null;
    if (!op) return fail(404, "not_found", "Not found.");
    return idempotent(request, () => {
      const next = USER_NEXT[u.status][op];
      if (!next) return fail(409, "stale", "Invitation already changed.");
      u.status = next;
      if (op === "resend") { u.invitation = { expiresAt: inviteExpiry(), invitedBy: actor().name }; record("access.invitation.resent", "user", u.id, undefined, { expiresAt: u.invitation.expiresAt }); }
      else record("access.invitation.revoked", "user", u.id);
      return ok(view(bump(u)));
    });
  }),

  // ------------------------------------------------------------ roles
  http.post("/api/staff/users/:id/roles", async ({ request, params }) => {
    const g = write();
    if (g) return g;
    const u = userOf(String(params.id));
    if (!u) return fail(404, "not_found", "Not found.");
    const b = await body<{ action: "grant" | "revoke"; role: string; reason?: string; expiresAt?: string | null }>(request);
    const me = actor();
    const reason = (b.reason ?? "").trim();
    if (u.id === me.id) return fail(403, "self_grant", "Can't change your own roles.");
    const conflict = stale(request, u.version);
    if (conflict) return conflict;
    if (b.action === "grant") {
      if (!ASSIGNABLE.includes(b.role) || u.kind === "client" || u.kind === "service") return fail(422, "validation", "Role can't be granted here.");
      if (u.roles.some((r) => r.role === b.role)) return fail(409, "stale", "Already has it.");
      if (sodConflicts([...u.roles.map((r) => r.role), b.role]).length) return fail(422, "sod_conflict", "Role mix blocked.");
      if (reason.length < 10) return fail(422, "reason_required", "Reason needed.");
      if (needsApproval([b.role])) {
        if (!stepUpOk(request)) return needStepUp();
        return submitChange(propose({
          id: nextChangeId(), kind: "role_grant", title: `Grant ${b.role} to ${u.name}`, by: { id: me.id, name: me.name }, now: Date.now(), reason,
          before: { roles: u.roles.map((r) => r.role) }, after: { roles: [...u.roles.map((r) => r.role), b.role] }, payload: { userId: u.id, role: b.role, expiresAt: b.expiresAt ?? null },
        }));
      }
      u.roles.push({ role: b.role, grantedBy: me.name, grantedAt: new Date().toISOString(), expiresAt: b.expiresAt ?? null });
      record("access.role.granted", "user", u.id, undefined, { role: b.role }, reason);
      return ok(view(bump(u)));
    }
    if (!u.roles.some((r) => r.role === b.role)) return fail(409, "stale", "Role already removed.");
    if (b.role === "staff:sysadmin" && isLastSysadmin(USERS, u.id)) return fail(409, "last_sysadmin", "Last sysadmin.");
    if (reason.length < 3) return fail(422, "reason_required", "Reason needed.");
    u.roles = u.roles.filter((r) => r.role !== b.role);
    record("access.role.revoked", "user", u.id, { role: b.role }, undefined, reason);
    revokeSessions(u.id); // IAM §12: revoking a role revokes sessions
    return ok(view(bump(u)));
  }),

  // ------------------------------------------------------------ status (suspend / reactivate / deactivate / unlock)
  http.post("/api/staff/users/:id/status", async ({ request, params }) => {
    const g = write();
    if (g) return g;
    const u = userOf(String(params.id));
    if (!u) return fail(404, "not_found", "Not found.");
    const b = await body<{ action: UserAction; reason?: string }>(request);
    if (u.id === actor().id) return fail(403, "self_grant", "Not on your own account.");
    if ((b.reason ?? "").trim().length < 3) return fail(422, "reason_required", "Reason needed.");
    return idempotent(request, () => {
      const next = USER_NEXT[u.status][b.action];
      if (!next) return fail(409, "stale", "Status already changed.");
      if ((b.action === "suspend" || b.action === "deactivate") && isLastSysadmin(USERS, u.id)) return fail(409, "last_sysadmin", "Last sysadmin.");
      const before = u.status;
      u.status = next;
      if (b.action !== "reactivate" && b.action !== "unlock") revokeSessions(u.id, false);
      const code = b.action === "suspend" ? "access.user.suspended" : b.action === "deactivate" ? "access.user.deactivated" : "access.user.reactivated";
      record(code, "user", u.id, { status: before }, { status: next }, b.reason);
      return ok(view(bump(u)));
    });
  }),
  http.post("/api/staff/users/:id/password-reset", async ({ request, params }) => {
    const g = write();
    if (g) return g;
    if (!stepUpOk(request)) return needStepUp();
    const u = userOf(String(params.id));
    if (!u) return fail(404, "not_found", "Not found.");
    if (u.id === actor().id) return fail(403, "self_grant", "Not on your own account.");
    return idempotent(request, () => {
      revokeSessions(u.id, false);
      record("auth.password.reset_forced", "user", u.id);
      return ok({});
    });
  }),
  http.post("/api/staff/users/:id/mfa-reset", async ({ request, params }) => {
    const g = write();
    if (g) return g;
    if (!stepUpOk(request)) return needStepUp();
    const u = userOf(String(params.id));
    if (!u) return fail(404, "not_found", "Not found.");
    const { accessRequestId } = await body<{ accessRequestId?: string }>(request);
    const req = IDENTITY.find((r) => r.id === accessRequestId && r.userId === u.id && r.kind === "two_factor" && r.status === "approved");
    if (!req) return fail(422, "validation", "Needs an approved identity check.");
    return idempotent(request, () => {
      u.mfa = { state: "reset", methods: [], backupCodesLeft: null };
      record("auth.mfa.reset", "user", u.id, undefined, undefined, undefined, undefined, { approvalRef: req.id });
      return ok(view(bump(u)));
    });
  }),
  http.post("/api/staff/users/:id/unlock", async ({ request, params }) => {
    const g = write();
    if (g) return g;
    const u = userOf(String(params.id));
    if (!u) return fail(404, "not_found", "Not found.");
    if (u.status !== "locked") return fail(409, "stale", "Not locked.");
    const { accessRequestId } = await body<{ accessRequestId?: string }>(request);
    u.status = "active";
    record(accessRequestId ? "access.access_request.approved" : "access.user.reactivated", "user", u.id, { status: "locked" }, { status: "active" });
    return ok(view(bump(u)));
  }),

  // ------------------------------------------------------------ sessions + trusted devices
  http.get("/api/staff/users/:id/sessions", async ({ params }) => {
    await delay(140);
    return guard() ?? ok({ items: sessionsOf(String(params.id)) });
  }),
  http.delete("/api/staff/users/:id/sessions/:sid?", async ({ request, params }) => {
    const g = write();
    if (g) return g;
    const id = String(params.id);
    if (!params.sid) {
      if (!stepUpOk(request)) return needStepUp();
      return ok({ revoked: revokeSessions(id) });
    }
    const s = sessionsOf(id).find((x) => x.id === params.sid);
    if (!s) return fail(409, "stale", "Session already ended.");
    if (s.current) return fail(422, "validation", "Sign out instead.");
    s.revokedAt = new Date().toISOString();
    record("auth.session.revoked", "session", s.id, undefined, undefined, undefined, undefined, {});
    return ok({ revoked: 1 });
  }),
  http.get("/api/staff/users/:id/trusted-devices", async ({ params }) => {
    await delay(140);
    return guard() ?? ok({ items: DEVICES.filter((d) => d.userId === params.id) });
  }),
  http.delete("/api/staff/users/:id/trusted-devices/:did", async ({ params }) => {
    const g = write();
    if (g) return g;
    const i = DEVICES.findIndex((d) => d.id === params.did && d.userId === params.id);
    if (i < 0) return fail(409, "stale", "Already removed.");
    DEVICES.splice(i, 1);
    record("auth.trusted_device.revoked", "trusted_device", String(params.did));
    return ok({});
  }),

  // ------------------------------------------------------------ offboarding (WRK §6.3)
  http.post("/api/staff/users/:id/offboard", async ({ request, params }) => {
    const g = write();
    if (g) return g;
    if (!stepUpOk(request)) return needStepUp();
    const u = userOf(String(params.id));
    if (!u) return fail(404, "not_found", "Not found.");
    const b = await body<{ reason?: string; revokeSessions?: boolean }>(request);
    if (u.id === actor().id) return fail(403, "self_grant", "Not on your own account.");
    if ((b.reason ?? "").trim().length < 3) return fail(422, "reason_required", "Reason needed.");
    return idempotent(request, () => {
      if (!USER_NEXT[u.status].deactivate) return fail(409, "stale", "Already deactivated.");
      if (isLastSysadmin(USERS, u.id)) return fail(409, "last_sysadmin", "Last sysadmin.");
      const before = u.status;
      u.status = "deactivated";
      if (b.revokeSessions !== false) revokeSessions(u.id, false);
      const n = openCases(u.id);
      const handoffId = n ? `HO-${u.id.slice(-4).toUpperCase()}-${n}` : null;
      record("access.user.deactivated", "user", u.id, { status: before }, { status: "deactivated", handoffTo: n ? PEOPLE.diane.name : null, openCases: n }, b.reason);
      bump(u);
      return ok({ handoffId, sm: PEOPLE.diane.name });
    });
  }),

  // ------------------------------------------------------------ service accounts (US5)
  http.get("/api/staff/x/service-accounts", async () => {
    await delay(150);
    return guard() ?? ok({ items: SERVICE_ACCOUNTS, bootstrap: view(userOf("u-bootstrap")!) });
  }),
  http.post("/api/staff/x/service-accounts/:id/rotate", async ({ request, params }) => {
    const g = write();
    if (g) return g;
    if (!stepUpOk(request)) return needStepUp();
    const a = SERVICE_ACCOUNTS.find((s) => s.id === params.id);
    if (!a) return fail(404, "not_found", "Not found.");
    return idempotent(request, () => {
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      const secret = `hbz_svc_${Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("")}`;
      const before = a.last4;
      a.last4 = secret.slice(-4);
      a.rotatedAt = new Date().toISOString();
      record("config.integration.credential_rotated", "service_account", a.id, { last4: before }, { last4: a.last4 });
      return ok({ secret, account: a });
    });
  }),

  // ------------------------------------------------------------ U10 identity checks (real access-request paths + x_system fields)
  http.get("/api/admin/access-requests", async () => {
    await delay(200);
    return guard() ?? ok({ items: IDENTITY });
  }),
  http.post("/api/admin/access-requests/:id/:op", async ({ request, params }) => {
    const g = write();
    if (g) return g;
    const op = String(params.op);
    if (op !== "approve" && op !== "decline") return fail(404, "not_found", "Not found.");
    if (op === "approve" && !stepUpOk(request)) return needStepUp();
    const r = IDENTITY.find((x) => x.id === params.id);
    if (!r) return fail(404, "not_found", "Not found.");
    const b = await body<{ checklist?: Record<string, boolean>; reason?: string; note?: string }>(request);
    return idempotent(request, () => {
      if (r.status === "approved" || r.status === "declined") return fail(409, "already_decided", "Already decided.");
      const me = actor();
      if (r.userId === me.id) return fail(403, "self_approval", "Not your own request.");
      const u = userOf(r.userId);
      if (op === "decline") {
        if ((b.reason ?? "").trim().length < 10) return fail(422, "reason_required", "Reason needed.");
        Object.assign(r, { status: "declined", decidedBy: me.name, decidedAt: new Date().toISOString(), declineReason: b.reason });
        record("access.access_request.declined", "access_request", r.id, undefined, { userId: r.userId }, b.reason);
        return ok(r);
      }
      const c = b.checklist ?? {};
      if (!["callback", "video", "manager", "reason"].every((k) => c[k] === true)) return fail(422, "validation", "Checklist incomplete.");
      Object.assign(r, { status: "approved", decidedBy: me.name, decidedAt: new Date().toISOString() });
      record("access.access_request.approved", "access_request", r.id, undefined, { userId: r.userId, kind: r.kind, checklist: c }, b.note);
      if (u && r.kind === "two_factor") { u.mfa = { state: "reset", methods: [], backupCodesLeft: null }; record("auth.mfa.reset", "user", u.id, undefined, undefined, undefined, undefined, { approvalRef: r.id }); }
      if (u && r.kind === "unlock" && u.status === "locked") { u.status = "active"; record("access.user.reactivated", "user", u.id, { status: "locked" }, { status: "active" }, undefined, undefined, { approvalRef: r.id }); }
      if (u) bump(u);
      return ok(r);
    });
  }),

  // ------------------------------------------------------------ U11 impersonation (F-IAM-15)
  http.post("/api/staff/impersonate", async ({ request }) => {
    const g = write();
    if (g) return g;
    if (!stepUpOk(request)) return needStepUp();
    const b = await body<{ targetId?: string; reason?: string; minutes?: number }>(request);
    const u = userOf(b.targetId ?? "");
    if (!u) return fail(404, "not_found", "Not found.");
    if (isProtectedTarget(u)) return fail(403, "target_protected", "Protected account.");
    if (u.status !== "active") return fail(422, "validation", "Only active accounts.");
    if ((b.reason ?? "").trim().length < 10) return fail(422, "reason_required", "Reason needed.");
    const minutes = (IMPERSONATION_MINUTES as readonly number[]).includes(b.minutes ?? 0) ? b.minutes! : IMPERSONATION_MINUTES[0];
    return idempotent(request, () => {
      if (IMPERSONATION.current) return fail(409, "stale", "Already impersonating.");
      const me = actor(), now = Date.now();
      record("access.impersonation.started", "user", u.id, undefined, { minutes }, b.reason); // written before the read-only state starts
      IMPERSONATION.current = { targetId: u.id, targetName: u.name, reason: b.reason!.trim(), until: new Date(now + minutes * 60_000).toISOString(), startedAt: new Date(now).toISOString(), by: { id: me.id, name: me.name } };
      const home = u.roles.map((r) => ROLE_META[r.role as keyof typeof ROLE_META]?.home).find(Boolean) ?? "/";
      return ok({ until: IMPERSONATION.current.until, home });
    });
  }),
  http.delete("/api/staff/impersonate", async () => {
    const g = guard();
    if (g) return g;
    const imp = IMPERSONATION.current;
    if (!imp) return ok({ ended: false });
    IMPERSONATION.current = null;
    record("access.impersonation.ended", "user", imp.targetId, undefined, { endedBy: "user" });
    return ok({ ended: true, targetId: imp.targetId });
  }),
];
void accepted;
