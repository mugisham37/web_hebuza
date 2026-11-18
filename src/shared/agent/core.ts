// Mirror of server/src/domain/agent/core.ts — UI display only; the server enforces.
// Pure agent-side rules shared by every lane (plan §3, §4). No React here — unit tested in tests/unit/agent.test.ts.
import type { CaseStatus } from "@/shared/domain/case-status";
import { movesFor, type CaseFacts } from "@/shared/ops/transitions";

// ---------------------------------------------------------------- countdown
export type Urgency = "normal" | "soon" | "critical" | "expired";
/** Offer/deadline urgency: <1h soon (amber), <15m critical (red), ≤0 expired. */
export function urgency(msLeft: number): Urgency {
  if (msLeft <= 0) return "expired";
  if (msLeft < 15 * 60_000) return "critical";
  if (msLeft < 3600_000) return "soon";
  return "normal";
}
/** "3h 12m" / "2d 4h" / "14m" — compact, locale-neutral units. */
export function compactLeft(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000));
  const d = Math.floor(m / 1440),
    h = Math.floor((m % 1440) / 60),
    mm = m % 60;
  if (d) return h ? `${d}d ${h}h` : `${d}d`;
  if (h) return mm ? `${h}h ${mm}m` : `${h}h`;
  return `${mm}m`;
}

// ---------------------------------------------------------------- work groups (Today / Cases)
export const WORK_GROUPS = [
  "overdue",
  "today",
  "week",
  "client",
  "institution",
  "review",
  "later",
] as const;
export type WorkGroup = (typeof WORK_GROUPS)[number];
/** Spec A2 grouping. Waiting states win over dates (the clock is paused there). */
export function groupOf(
  c: { status: CaseStatus; dueAt: string },
  now: number,
): WorkGroup {
  if (c.status === "awaiting_client_documents") return "client";
  if (c.status === "awaiting_external_institution") return "institution";
  if (c.status === "awaiting_internal_review") return "review";
  const left = Date.parse(c.dueAt) - now;
  if (left < 0) return "overdue";
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  if (Date.parse(c.dueAt) <= endOfDay.getTime()) return "today";
  if (left < 7 * 86_400_000) return "week";
  return "later";
}

/** Contextual primary action for a work row (plan U3). */
export type RowAction =
  "upload" | "reply" | "check" | "track" | "view" | "start";
export function rowAction(c: {
  status: CaseStatus;
  unread?: number;
  docsToCheck?: number;
}): RowAction {
  if (c.status === "approved_assigned") return "start";
  if (c.docsToCheck) return "check";
  if (c.unread) return "reply";
  if (c.status === "awaiting_external_institution") return "track";
  if (c.status === "in_progress") return "upload";
  return "view";
}
export const ACTION_TAB: Record<RowAction, string> = {
  upload: "deliverables",
  reply: "conversation",
  check: "documents",
  track: "brief",
  view: "brief",
  start: "brief",
};

// ---------------------------------------------------------------- status changer (agent = assignee)
/** Moves the agent may make. awaiting_internal_review is only reachable via "Submit deliverables" (shown blocked). */
export function agentMoves(f: CaseFacts) {
  return movesFor(f, "assignee").map((m) =>
    m.to === "awaiting_internal_review"
      ? { ...m, blocked: m.blocked ?? "viaSubmit" }
      : m,
  );
}

// ---------------------------------------------------------------- offers
export const CONFLICTS = ["none", "related", "competitor", "other"] as const;
export type Conflict = (typeof CONFLICTS)[number];
export const DECLINE_REASONS = [
  "expertise",
  "workload",
  "conflict",
  "unavailable",
  "other",
] as const;
/** D5: any declared conflict turns Accept into "Declare & return". */
export const acceptMode = (c: Conflict | null) =>
  c === null ? "pick" : c === "none" ? "accept" : "return";

// ---------------------------------------------------------------- deliverables
export type Slot = {
  key: string;
  required: boolean;
  state:
    "empty" | "uploading" | "failed" | "uploaded" | "returned" | "approved";
};
/** Reasons Submit is blocked (empty = can submit). */
export function submitBlockers(s: {
  slots: Slot[];
  checklistDone: number;
  checklistTotal: number;
  inReview: boolean;
  cleared: boolean;
}): string[] {
  const out: string[] = [];
  if (!s.cleared) out.push("notCleared");
  if (s.inReview) out.push("inReview");
  if (
    s.slots.some(
      (x) => x.required && !["uploaded", "approved"].includes(x.state),
    )
  )
    out.push("missingRequired");
  if (s.slots.some((x) => x.state === "uploading")) out.push("uploading");
  if (s.checklistDone < s.checklistTotal) out.push("checklist");
  return out;
}

/** Typed signature matches the profile name (case/space-insensitive). */
export const signatureMatches = (typed: string, name: string) =>
  typed.trim().replace(/\s+/g, " ").toLowerCase() ===
    name.trim().replace(/\s+/g, " ").toLowerCase() && typed.trim().length > 1;
