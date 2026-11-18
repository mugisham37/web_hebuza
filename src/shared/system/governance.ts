// Mirror of server/src/domain/system/governance.ts — UI display only; the server enforces.
// Access reviews, segregation of duties, break-glass, impersonation, user lifecycle (plan 06 §2.2–2.4, U8, U11).
import type { Role } from "@/shared/auth/roles";
import { POLICY } from "@/shared/policy";
import { PRIVILEGED_GRANT } from "./approvals";
import type { BreakGlassState, ReviewCampaignVM, RiskFlag, SodPair, SystemUserVM, UserStatus } from "./types";

// ---------------------------------------------------------------- user lifecycle (IAM §7 + WRK worker_status)
export type UserAction = "suspend" | "reactivate" | "deactivate" | "unlock" | "resend" | "revoke_invite";
export const USER_NEXT: Record<UserStatus, Partial<Record<UserAction, UserStatus>>> = {
  invited: { resend: "invited", revoke_invite: "invite_revoked" },
  invite_expired: { resend: "invited" },
  invite_revoked: { resend: "invited" },
  active: { suspend: "suspended", deactivate: "deactivated" },
  suspended: { reactivate: "active", deactivate: "deactivated" },
  locked: { unlock: "active", deactivate: "deactivated" },
  deactivated: {},
};
export const INVITE_TTL_MS = POLICY.inviteTtlMs;

/** IAM §13: the last active sysadmin can't be suspended, deactivated or lose the role (409 last_sysadmin). */
export function isLastSysadmin(users: readonly SystemUserVM[], id: string) {
  const live = users.filter((u) => u.status === "active" && !u.isBootstrap && u.roles.some((r) => r.role === "staff:sysadmin"));
  return live.length === 1 && live[0].id === id;
}

/** Impersonation never targets these (IAM F-IAM-15). */
export const PROTECTED_TARGETS: ReadonlySet<string> = new Set<Role>(["staff:finance", "staff:executive", "staff:sysadmin"]);
export const isProtectedTarget = (u: Pick<SystemUserVM, "roles">) => u.roles.some((r) => PROTECTED_TARGETS.has(r.role));
/** D-11 PLACEHOLDER(impersonation-minutes) */
export const IMPERSONATION_MINUTES = [15, 30] as const;

// ---------------------------------------------------------------- SoD (spec/02 §4.3, D-4)
export const SOD_PAIRS: readonly SodPair[] = [
  { a: "staff:finance", b: "staff:procurement", status: "blocked", why: "Raises and pays the same supplier bill" },
  { a: "staff:sysadmin", b: "staff:finance", status: "blocked", why: "Controls access and moves money" },
];
/** Process rules (maker ≠ checker) shown read-only. */
export const SOD_PROCESS: readonly { maker: string; checker: string; rule: string }[] = [
  { maker: "Finance (records manual payment)", checker: "Second finance officer / executive", rule: "fin.payment.manual" },
  { maker: "Finance (proposes revenue rule)", checker: "Executive", rule: "rev.rules" },
  { maker: "Service manager (refund step 1)", checker: "Finance (step 2)", rule: "rfd.approve" },
  { maker: "Sysadmin (proposes privileged grant)", checker: "Executive / second sysadmin", rule: "iam.roles.grant" },
  { maker: "Procurement (supplier bank change)", checker: "Finance", rule: "sup.bank" },
  { maker: "Agent (deliverable)", checker: "Designated reviewer, not the author", rule: "dlv.review" },
];
export function sodConflicts(roles: readonly string[], waived: readonly [string, string][] = []) {
  return SOD_PAIRS.filter((p) => roles.includes(p.a) && roles.includes(p.b) && !waived.some(([a, b]) => (a === p.a && b === p.b) || (a === p.b && b === p.a)));
}
/** Custom-role lint (U6): money + access mixes and maker+checker in one role. */
export function customRoleConflicts(perms: readonly string[]): string[] {
  const out: string[] = [];
  if (perms.includes("rev.payouts.manage") && perms.includes("rev.payouts.approve")) out.push("rev.payouts.manage + rev.payouts.approve");
  if (perms.some((p) => p.startsWith("fin.")) && perms.some((p) => p.startsWith("iam."))) out.push("fin.* + iam.*");
  if (perms.includes("fin.payment.manual.make") && perms.includes("fin.payment.manual.check")) out.push("fin.payment.manual.make + check");
  return out;
}
/** PLACEHOLDER(sod-waiver-max) 12 months. */
export const WAIVER_MAX_DAYS = POLICY.waiverMaxDays;

// ---------------------------------------------------------------- access reviews (§2.3, F-IAM-23)
/** PLACEHOLDER(inactive-days) */
export const INACTIVE_DAYS = POLICY.inactiveDays;
export function riskFlags(u: Pick<SystemUserVM, "roles" | "lastActiveAt" | "mfa">, now: number, waivers = 0): RiskFlag[] {
  const f: RiskFlag[] = [];
  if (!u.lastActiveAt) f.push("never_signed_in");
  else if (now - Date.parse(u.lastActiveAt) >= INACTIVE_DAYS * 86_400_000) f.push("inactive");
  if (u.roles.some((r) => PRIVILEGED_GRANT.has(r.role))) f.push("privileged");
  if (waivers) f.push("sod_waiver");
  if (u.mfa.state !== "enrolled") f.push("no_mfa");
  return f;
}
export const reviewProgress = (c: Pick<ReviewCampaignVM, "items">) => {
  const done = c.items.filter((i) => i.decision !== "pending").length;
  return { done, total: c.items.length, pct: c.items.length ? Math.floor((done / c.items.length) * 100) : 0 };
};
/** Completion: every item decided and both sign-offs present. */
export const canComplete = (c: Pick<ReviewCampaignVM, "items" | "signOffs">) =>
  c.items.every((i) => i.decision !== "pending") && ["staff:sysadmin", "staff:executive"].every((r) => c.signOffs.some((s) => s.role === r));
/** A reviewer never decides on their own access. */
export const canReview = (reviewerId: string, subjectId: string) => reviewerId !== subjectId;

// ---------------------------------------------------------------- break-glass (§2.4)
/** PLACEHOLDER(break-glass-durations) max 4 h. */
export const BREAK_GLASS_MINUTES = [60, 120, 240] as const;
export const BREAK_GLASS_NEXT: Record<BreakGlassState, BreakGlassState[]> = {
  sealed: ["requested"],
  requested: ["active", "sealed"],
  active: ["ended", "expired"],
  ended: ["reviewed"],
  expired: ["reviewed"],
  reviewed: ["sealed"],
};
