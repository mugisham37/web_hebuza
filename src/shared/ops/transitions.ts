// Mirror of server/src/domain/ops/transitions.ts — UI display only; the server enforces.
// Allowed status transitions for staff (spec/05-modules/service-request-lifecycle.md §7).
// The server is the authority; this drives what the UI offers and explains (status changer, bulk change, phone sheet).
import { CASE_STATUS_META, type CaseStatus } from "@/shared/domain/case-status";

export type Actor =
  "manager" | "assignee" | "reviewer" | "finance" | "client" | "system";

/** Facts about a case the guards need. Anything unknown is treated as "not satisfied". */
export type CaseFacts = {
  status: CaseStatus;
  previous?: CaseStatus | null; // status before on_hold / awaiting_client_documents
  missingItems?: number;
  pricingMode?: "fixed" | "range" | "quote";
  fee?: number | null;
  paid?: boolean;
  covered?: boolean;
  payLaterAllowed?: boolean;
  complete?: boolean;
  assigneeChosen?: boolean;
  deliverablesUploaded?: number;
  workStarted?: boolean;
  withinRefundWindow?: boolean;
  offer?: "accept" | "undo"; // agent offer accept / its 8 s undo (only the offer endpoints set this)
};

/** Why a move is blocked (i18n key under ops.guard.*), or null when allowed. */
export type Guard = (f: CaseFacts) => string | null;

type Rule = { to: CaseStatus; by: Actor[]; guard?: Guard; reason?: boolean };

const need = (ok: boolean | undefined, key: string): string | null =>
  ok ? null : key;
const working = (f: CaseFacts): CaseStatus =>
  f.previous && !CASE_STATUS_META[f.previous].terminal
    ? f.previous
    : "under_review";

const HOLDABLE: CaseStatus[] = [
  "received",
  "under_review",
  "awaiting_quotation",
  "awaiting_payment",
  "awaiting_client_documents",
  "approved_assigned",
  "in_progress",
  "awaiting_internal_review",
  "awaiting_external_institution",
];
const EARLY: CaseStatus[] = [
  "received",
  "under_review",
  "awaiting_quotation",
  "awaiting_payment",
  "awaiting_client_documents",
  "approved_assigned",
];
const LATE: CaseStatus[] = [
  "in_progress",
  "awaiting_internal_review",
  "awaiting_external_institution",
];

const TABLE: Partial<Record<CaseStatus, Rule[]>> = {
  received: [
    { to: "under_review", by: ["manager", "system"] },
    { to: "rejected", by: ["manager"], reason: true }, // duplicate triage rejects before review
  ],
  under_review: [
    {
      to: "awaiting_client_documents",
      by: ["manager", "assignee"],
      guard: (f) => need((f.missingItems ?? 0) > 0, "missingItems"),
    },
    {
      to: "awaiting_quotation",
      by: ["manager"],
      guard: (f) =>
        need(
          f.pricingMode === "quote" || f.pricingMode === "range",
          "notQuoteService",
        ),
    },
    {
      to: "awaiting_payment",
      by: ["manager", "system"],
      guard: (f) =>
        need((f.fee ?? 0) > 0 && !f.paid && !f.covered, "nothingToPay"),
    },
    {
      to: "approved_assigned",
      by: ["manager"],
      guard: (f) =>
        need(f.complete, "incomplete") ??
        need(!!(f.paid || f.covered || f.payLaterAllowed), "unpaid") ??
        need(f.assigneeChosen, "noAssignee"),
    },
    { to: "rejected", by: ["manager"], reason: true },
  ],
  awaiting_quotation: [{ to: "awaiting_payment", by: ["finance", "manager"] }],
  awaiting_payment: [
    {
      to: "approved_assigned",
      by: ["system", "finance"],
      guard: (f) => need(f.paid, "unpaid"),
    },
    { to: "under_review", by: ["system", "manager"] },
  ],
  awaiting_client_documents: [
    { to: "under_review", by: ["system", "manager"] },
    {
      to: "in_progress",
      by: ["system", "manager"],
      guard: (f) => need(f.previous === "in_progress", "notResumable"),
    },
  ],
  approved_assigned: [
    { to: "in_progress", by: ["assignee"] },
    { to: "under_review", by: ["assignee", "manager"], reason: true },
  ],
  in_progress: [
    {
      to: "awaiting_internal_review",
      by: ["assignee"],
      guard: (f) => need((f.deliverablesUploaded ?? 0) > 0, "noDeliverable"),
    },
    { to: "awaiting_external_institution", by: ["assignee"] },
    // Agent journey A4: the assignee may pause for client documents (needs a returned item) or put on hold (reason).
    { to: "awaiting_client_documents", by: ["assignee"], guard: (f) => need((f.missingItems ?? 0) > 0, "missingItems") },
    { to: "on_hold", by: ["assignee"], reason: true },
  ],
  awaiting_internal_review: [
    { to: "in_progress", by: ["reviewer", "manager"], reason: true },
    { to: "awaiting_external_institution", by: ["reviewer", "manager"] },
    { to: "completed_delivered", by: ["reviewer", "manager"] },
  ],
  awaiting_external_institution: [
    { to: "in_progress", by: ["assignee", "manager"] },
    { to: "awaiting_internal_review", by: ["assignee", "manager"] },
  ],
  refund_requested: [{ to: "refunded", by: ["finance"] }],
};

export type Move = { to: CaseStatus; blocked: string | null; reason: boolean };

/** Every move this actor may see from the current status, with the guard result (null = allowed). */
export function movesFor(f: CaseFacts, actor: Actor = "manager"): Move[] {
  const out: Move[] = [];
  // Offer accept takes an early case to its new assignee; undo returns it to the snapshot status.
  if (actor === "assignee" && f.offer === "accept" && EARLY.includes(f.status))
    for (const to of ["approved_assigned", "in_progress"] as const) out.push({ to, blocked: null, reason: false });
  if (actor === "assignee" && f.offer === "undo" && f.status === "approved_assigned" && f.previous && EARLY.includes(f.previous))
    out.push({ to: f.previous, blocked: null, reason: false });
  // No-review services: the delivery itself completes the case.
  if (actor === "system" && f.status === "in_progress")
    out.push({ to: "completed_delivered", blocked: need((f.deliverablesUploaded ?? 0) > 0, "noDeliverable"), reason: false });
  for (const r of TABLE[f.status] ?? [])
    if (r.by.includes(actor))
      out.push({ to: r.to, blocked: r.guard?.(f) ?? null, reason: !!r.reason });
  if (actor === "manager" && HOLDABLE.includes(f.status))
    out.push({ to: "on_hold", blocked: null, reason: true });
  if (actor === "manager" && f.status === "on_hold")
    out.push({ to: working(f), blocked: null, reason: false });
  if (
    (actor === "manager" &&
      (EARLY.includes(f.status) || LATE.includes(f.status))) ||
    (actor === "client" && EARLY.includes(f.status))
  )
    out.push({
      to: "cancelled",
      blocked: actor === "client" && f.workStarted ? "workStarted" : null,
      reason: actor === "manager",
    });
  if (
    (actor === "manager" || actor === "client") &&
    f.status === "completed_delivered"
  )
    out.push({
      to: "refund_requested",
      blocked: need(f.withinRefundWindow, "refundWindow"),
      reason: true,
    });
  if (
    (actor === "finance" || actor === "manager") &&
    f.status === "refund_requested"
  )
    out.push({ to: working(f), blocked: null, reason: true });
  // De-duplicate (a status reachable by two rules keeps the first, which is the most specific).
  return out.filter((m, i) => out.findIndex((x) => x.to === m.to) === i);
}

export const canMove = (
  f: CaseFacts,
  to: CaseStatus,
  actor: Actor = "manager",
) => movesFor(f, actor).some((m) => m.to === to && !m.blocked);

/** Statuses every selected case can move to right now (bulk change), plus how many cases block each other option. */
export function commonMoves(
  cases: CaseFacts[],
  actor: Actor = "manager",
): {
  allowed: CaseStatus[];
  blockedCount: Partial<Record<CaseStatus, number>>;
} {
  const all = new Set<CaseStatus>();
  cases.forEach((c) => movesFor(c, actor).forEach((m) => all.add(m.to)));
  const allowed: CaseStatus[] = [];
  const blockedCount: Partial<Record<CaseStatus, number>> = {};
  for (const to of all) {
    const blocked = cases.filter((c) => !canMove(c, to, actor)).length;
    if (blocked === 0) allowed.push(to);
    else blockedCount[to] = blocked;
  }
  return { allowed, blockedCount };
}
