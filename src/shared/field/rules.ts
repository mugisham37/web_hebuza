// Mirror of server/src/domain/field/rules.ts — UI display only; the server enforces.
// Pure field rules (plan §2.1, §2.2): expense machine + SoD, cash ageing + 4-eyes, fees, totals. Used by UI and mocks.
import { POLICY, FIELD_POLICY } from "@/shared/policy";
import { applyBps } from "@/shared/money";
/** Re-exported so callers read policy through lib, not the dummy data directly. */
export { POLICY, FIELD_POLICY };
import type { Expense, ExpenseState, CashCollection } from "@/shared/field/types";

// ---- expenses
export const EXPENSE_PENDING: ExpenseState[] = ["queued", "submitted", "sm_approved"];
export const EXPENSE_APPROVED: ExpenseState[] = ["finance_approved", "paid"];
export const expenseCounts = (s: ExpenseState) => s !== "rejected" && s !== "withdrawn";
/** Month total excludes rejected/withdrawn (board EX2 total is computed, never typed). */
export const expenseTotal = (xs: Pick<Expense, "amount" | "state">[]) => xs.filter((x) => expenseCounts(x.state)).reduce((s, x) => s + x.amount, 0);
export const sumBy = (xs: Pick<Expense, "amount" | "state">[], states: ExpenseState[]) => xs.filter((x) => states.includes(x.state)).reduce((s, x) => s + x.amount, 0);
export const overCap = (category: string, amount: number) => category === "moto" && amount > FIELD_POLICY.motoCap;

export type Decision = { level: 1 | 2; decision: "approved" | "rejected"; by: string; reason?: string };
/** Returns the next state or an errorType. Approvers ≠ claimant; L2 ≠ L1 (all compared by user id). */
export function decideExpense(x: Pick<Expense, "state" | "claimant" | "trail">, d: Decision): { state: ExpenseState } | { error: "sod_violation" | "wrong_level" | "reason_required" } {
  if (d.decision === "rejected" && !d.reason?.trim()) return { error: "reason_required" };
  if (d.by === x.claimant) return { error: "sod_violation" };
  if (d.level === 1) {
    if (x.state !== "submitted") return { error: "wrong_level" };
    return { state: d.decision === "approved" ? "sm_approved" : "rejected" };
  }
  if (x.state !== "sm_approved") return { error: "wrong_level" };
  if (x.trail.find((t) => t.step === "sm")?.byId === d.by) return { error: "sod_violation" };
  return { state: d.decision === "approved" ? "finance_approved" : "rejected" };
}

// ---- cash (F-WRK-21, F-FIN-12)
export const cashAgeMs = (c: Pick<CashCollection, "recordedAt">, now: number) => now - Date.parse(c.recordedAt);
export const cashEscalated = (c: Pick<CashCollection, "recordedAt" | "status">, now: number) =>
  c.status !== "confirmed" && cashAgeMs(c, now) >= FIELD_POLICY.cashEscalationMs;
export const cashNeedsTwo = (amount: number) => amount >= POLICY.manualConfirmSecondFinance;
export function confirmCash(c: Pick<CashCollection, "amount" | "status" | "confirmations">, by: string):
  { status: CashCollection["status"]; done: boolean } | { error: "same_approver" | "not_deposited" } {
  if (c.status !== "deposited") return { error: "not_deposited" };
  if (c.confirmations.some((x) => x.by === by)) return { error: "same_approver" };
  const n = c.confirmations.length + 1;
  const done = !cashNeedsTwo(c.amount) || n >= 2;
  return { status: done ? "confirmed" : "deposited", done };
}

// ---- fees (F-REV-05, Q-REV-03)
export const perVisitFee = (serviceId: string, table: Record<string, number> = {}) => table[serviceId] ?? FIELD_POLICY.perVisitFee;
export const fieldShare = (pool: number, bps: number = FIELD_POLICY.fieldShareBps) => applyBps(pool, bps);
export const withholding = (fees: number, external: boolean) => (external ? applyBps(fees, POLICY.whtBps) : 0);

if (process.env.NODE_ENV !== "production") {
  console.assert(fieldShare(18_000) === 5_400 && 18_000 - fieldShare(18_000) === 12_600, "field rules: F-REV-05 worked example");
  console.assert("error" in decideExpense({ state: "sm_approved", claimant: "a", trail: [{ step: "sm", by: "Bea", byId: "b" }] }, { level: 2, decision: "approved", by: "b" }), "field rules: L2 ≠ L1");
  console.assert(expenseTotal([{ amount: 1000, state: "rejected" }, { amount: 3000, state: "submitted" }]) === 3000, "field rules: totals exclude rejected");
}
