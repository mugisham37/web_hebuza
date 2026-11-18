// Mirror of server/src/domain/system/approvals.ts — UI display only; the server enforces.
// Two-person approval engine (plan 06 §2.1). Pure: the mock calls it like the server would; Stage 5 may import it.
import type { Role } from "@/shared/auth/roles";
import { POLICY } from "@/shared/policy";
import type { ApproverRule, ChangeArea, ChangeKind, ChangeRequestVM, ChangeState, Decision, Iso, PersonRef } from "./types";

/** D-2 PLACEHOLDER(privileged-grant-set): roles whose grant needs a second person. */
export const PRIVILEGED_GRANT: ReadonlySet<string> = new Set<Role>(["staff:sysadmin", "staff:executive", "staff:finance", "staff:partner_manager"]);
/** D-3 PLACEHOLDER(approval-expiry). */
export const CHANGE_TTL_MS = POLICY.changeTtlMs;

export const AREA: Record<ChangeKind, ChangeArea> = {
  role_grant: "access", role_revoke_privileged: "access", invite_privileged: "access", custom_role: "access",
  sod_waiver: "access", break_glass: "access", impersonation_write: "access",
  setting_change: "settings", retention_change: "settings",
  ip_allowlist_disable: "security", credential_rotation: "security",
  prod_restore: "ops",
};

const SYS: Role = "staff:sysadmin", EXE: Role = "staff:executive";

/** Who must approve (§2.1 table). Rules are AND-ed; `anyOf` lists roles any one of which satisfies the rule. */
export function approversFor(kind: ChangeKind, payload: Record<string, unknown> = {}): ApproverRule[] {
  const role = String(payload.role ?? "");
  switch (kind) {
    case "role_grant":
    case "invite_privileged":
      return role === SYS ? [{ role: SYS, anyOf: [SYS, EXE] }] : [{ role: EXE }];
    case "role_revoke_privileged":
    case "custom_role":
    case "setting_change":
    case "ip_allowlist_disable":
    case "credential_rotation":
      return [{ role: SYS, anyOf: [SYS, EXE] }];
    case "retention_change":
    case "sod_waiver":
      return [{ role: EXE }];
    case "prod_restore":
    case "break_glass":
      return [{ role: SYS }, { role: EXE }];
    case "impersonation_write":
      return []; // never approvable in P1
  }
}

export type DecideError = "self_approval" | "already_decided" | "expired" | "forbidden_role" | "reason_required" | "not_approvable";
export type Approver = PersonRef & { roles: Role[] };

/** Which still-open rule this person would satisfy, or why they can't decide. */
export function canDecide(cr: ChangeRequestVM, who: Approver, now: number): { ok: true; rule: number } | { ok: false; error: DecideError } {
  if (cr.kind === "impersonation_write") return { ok: false, error: "not_approvable" };
  if (cr.state !== "proposed") return { ok: false, error: cr.state === "expired" ? "expired" : "already_decided" };
  if (Date.parse(cr.expiresAt) <= now) return { ok: false, error: "expired" };
  if (cr.proposedBy.id === who.id) return { ok: false, error: "self_approval" };
  if (cr.decisions.some((d) => d.by.id === who.id)) return { ok: false, error: "already_decided" };
  // The sysadmin never approves finance items (spec/02 §4.1): fin.* kinds aren't modelled here at all.
  const open = openRules(cr);
  const rule = open.findIndex((r) => (r.anyOf ?? [r.role]).some((x) => who.roles.includes(x as Role)));
  return rule < 0 ? { ok: false, error: "forbidden_role" } : { ok: true, rule: cr.approvers.indexOf(open[rule]) };
}

/** Rules not yet satisfied by an approve decision. */
export function openRules(cr: ChangeRequestVM): ApproverRule[] {
  const used = new Set<number>();
  for (const d of cr.decisions) {
    if (d.decision !== "approve") continue;
    const i = cr.approvers.findIndex((r, j) => !used.has(j) && (r.anyOf ?? [r.role]).includes(d.by.role));
    if (i >= 0) used.add(i);
  }
  return cr.approvers.filter((_, j) => !used.has(j));
}

/** Apply one decision. Returns the next VM (never mutates). Reject needs a reason ≥ 10 chars. */
export function decide(cr: ChangeRequestVM, who: Approver, decision: "approve" | "reject", now: number, reason?: string):
  { ok: true; next: ChangeRequestVM } | { ok: false; error: DecideError } {
  const check = canDecide(cr, who, now);
  if (!check.ok) return check;
  if (decision === "reject" && (reason ?? "").trim().length < 10) return { ok: false, error: "reason_required" };
  const by: Decision["by"] = { id: who.id, name: who.name, role: (cr.approvers[check.rule].anyOf ?? [cr.approvers[check.rule].role]).find((r) => who.roles.includes(r as Role)) as Role };
  const decisions = [...cr.decisions, { by, decision, at: new Date(now).toISOString(), reason }];
  let state: ChangeState = "proposed";
  if (decision === "reject") state = "rejected";
  else if (!openRules({ ...cr, decisions }).length) state = cr.effectiveAt && Date.parse(cr.effectiveAt) > now ? "approved" : "applied";
  return { ok: true, next: { ...cr, decisions, state, version: cr.version + 1 } };
}

export function withdraw(cr: ChangeRequestVM, whoId: string): { ok: true; next: ChangeRequestVM } | { ok: false; error: DecideError } {
  if (cr.proposedBy.id !== whoId) return { ok: false, error: "forbidden_role" };
  if (cr.state !== "proposed") return { ok: false, error: "already_decided" };
  return { ok: true, next: { ...cr, state: "withdrawn", version: cr.version + 1 } };
}

/** Sweep: expire stale proposals, apply approved ones whose effective time came. */
export function tick(cr: ChangeRequestVM, now: number): ChangeRequestVM {
  if (cr.state === "proposed" && Date.parse(cr.expiresAt) <= now) return { ...cr, state: "expired", version: cr.version + 1 };
  if (cr.state === "approved" && cr.effectiveAt && Date.parse(cr.effectiveAt) <= now) return { ...cr, state: "applied", version: cr.version + 1 };
  return cr;
}

export function propose(p: {
  id: string; kind: ChangeKind; title: string; by: PersonRef; now: number; reason: string;
  before: unknown; after: unknown; payload?: Record<string, unknown>; effectiveAt?: Iso | null;
}): ChangeRequestVM {
  const payload = p.payload ?? {};
  return {
    id: p.id, kind: p.kind, state: "proposed", title: p.title, area: AREA[p.kind],
    proposedBy: p.by, proposedAt: new Date(p.now).toISOString(), expiresAt: new Date(p.now + CHANGE_TTL_MS).toISOString(),
    effectiveAt: p.effectiveAt ?? null, approvers: approversFor(p.kind, payload), decisions: [],
    before: p.before, after: p.after, reason: p.reason, payload, version: 1,
  };
}

/** Is this grant privileged (needs a ChangeRequest instead of applying now)? */
export const needsApproval = (roles: readonly string[]) => roles.some((r) => PRIVILEGED_GRANT.has(r));
