// Mirror of server/src/domain/finance/states.ts — UI display only; the server enforces.
// Finance state machines (plan 05 §2.1) as transition tables + one presentation table for FinStatus.
// Who may move and the money guards live in approvals.ts / the mock handlers; this file answers "is the move legal".

type Machine = Record<string, readonly string[]>;

export const MACHINES = {
  quote: {
    draft: ["pending_approval", "sent"], pending_approval: ["sent", "draft"],
    sent: ["accepted", "declined", "changes_requested", "expired", "withdrawn", "superseded"],
    changes_requested: ["superseded"], accepted: ["converted"],
  },
  invoice: {
    draft: ["issued"], issued: ["partially_paid", "paid", "void"], partially_paid: ["paid", "credited"], paid: ["credited"],
  },
  payment: {
    initiated: ["pending_provider"], pending_provider: ["confirmed", "failed", "expired"], expired: ["confirmed_late"],
    proof_submitted: ["under_verification"], under_verification: ["confirmed", "rejected", "proof_submitted"],
    confirmed: ["reversed"], confirmed_late: ["reversed"],
  },
  refund: {
    requested: ["under_review", "withdrawn"], under_review: ["rejected", "recommended", "withdrawn"],
    recommended: ["approved", "awaiting_executive", "rejected"], awaiting_executive: ["approved", "rejected"],
    approved: ["credited"], credited: ["completed_as_credit", "executing"], executing: ["refunded", "execution_failed"],
    execution_failed: ["executing"],
  },
  allocation: {
    pending_review: ["reviewed", "on_hold", "voided"], reviewed: ["approved_for_payment", "pending_review", "on_hold", "voided"],
    on_hold: ["pending_review", "voided"], approved_for_payment: ["in_batch", "voided"], in_batch: ["paid"],
  },
  adjustment: { proposed: ["approved"], approved: ["in_batch"], in_batch: ["settled"] },
  batch: {
    draft: ["submitted"], submitted: ["authorised", "rejected"], rejected: ["draft"], authorised: ["executing"],
    executing: ["paid", "partially_paid"], paid: ["closed"], partially_paid: ["closed"],
  },
  line: { pending: ["paid", "failed", "excluded"] },
  import: { uploaded: ["mapped"], mapped: ["parsed"], parsed: ["matched"] },
  period: { open: ["closed"], closed: ["reopened"], reopened: ["closed"] },
  setting: { proposed: ["approved", "rejected", "withdrawn"], approved: ["applied"] },
} as const satisfies Record<string, Machine>;
export type MachineKind = keyof typeof MACHINES;

export function canMove(kind: MachineKind, from: string, to: string): boolean {
  return ((MACHINES[kind] as Machine)[from] ?? []).includes(to);
}

/** D7: overdue is computed, never stored. Dates are ISO strings. */
export const isOverdue = (inv: { dueAt?: string; balanceDue: number; status: string }, today: string) =>
  !!inv.dueAt && inv.dueAt.slice(0, 10) < today.slice(0, 10) && inv.balanceDue > 0 && inv.status !== "void" && inv.status !== "draft";

/** REV F-REV-03 / FN7.2: an allocation is created only when delivered, every case invoice is paid, and no dispute is open. */
export const allocationDue = (c: { status: string; disputed?: boolean }, invoices: { status: string }[]) =>
  c.status === "completed_delivered" && !c.disputed && invoices.length > 0 &&
  invoices.every((i) => i.status === "paid" || i.status === "paid_by_plan" || i.status === "void");
