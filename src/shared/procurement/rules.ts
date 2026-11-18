// Mirror of server/src/domain/procurement/rules.ts — UI display only; the server enforces.
// Stage 12 rules R-1…R-19 (plan 12 §2.3), pure. Worked examples §2.4 are the reference values.
import { applyBps, splitVat } from "@/shared/money";
import { POLICY, PROC_POLICY } from "@/shared/policy";
import { ageingBucket, daysPastDue } from "@/shared/finance/ageing";
import type { ApprovalLimits, Bill, BudgetCategory, Contract, ContractStatus, Line, MatchLine, PoLine, Route, RouteReason } from "./types";

export { ageingBucket, daysPastDue };
export const DEFAULT_LIMITS: ApprovalLimits = {
  financeMax: PROC_POLICY.financeMax, quoteThreshold: PROC_POLICY.quoteThreshold, quotesRequired: PROC_POLICY.quotesRequired,
  tolerancePct: PROC_POLICY.tolerancePct, toleranceMin: PROC_POLICY.toleranceMin, lockHours: PROC_POLICY.lockHours,
  reminderOffsets: [...PROC_POLICY.reminderOffsets], budgetWarnPct: PROC_POLICY.budgetWarnPct,
  depositReturnDays: PROC_POLICY.depositReturnDays, vatRoundingTolerance: PROC_POLICY.vatRoundingTolerance,
};
const DAY = 86_400_000;
/** Calendar date arithmetic on YYYY-MM-DD (UTC, no DST). */
export const addDays = (d: string, n: number) => new Date(Date.parse(d.slice(0, 10)) + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / DAY);

// ---------------------------------------------------------------- R-5 VAT lines
/** One line: excl → net = qty × unit, VAT on top; incl → gross = qty × unit, VAT split out. Not VAT-registered → VAT 0. */
export function lineCalc(l: { qty: number; unitPrice: number; vatable: boolean }, mode: "excl" | "incl" = "excl", vatBps = POLICY.vatBps) {
  const base = Math.round(l.qty * l.unitPrice);
  if (!l.vatable) return { net: base, vat: 0, total: base };
  if (mode === "incl") { const s = splitVat(base, vatBps); return { net: s.net, vat: s.vat, total: base }; }
  const vat = applyBps(base, vatBps);
  return { net: base, vat, total: base + vat };
}
export const withCalc = <T extends Omit<Line, "net" | "vat" | "total">>(l: T, mode: "excl" | "incl" = "excl") => ({ ...l, ...lineCalc(l, mode) });
export function totals(lines: { net: number; vat: number; total: number }[]) {
  return lines.reduce((a, l) => ({ subtotal: a.subtotal + l.net, vat: a.vat + l.vat, total: a.total + l.total }), { subtotal: 0, vat: 0, total: 0 });
}

// ---------------------------------------------------------------- R-1/R-2/R-8 routing
export const quotesRequired = (total: number, lim = DEFAULT_LIMITS) => (total > lim.quoteThreshold ? lim.quotesRequired : 0);
export const budgetAvailable = (b: BudgetCategory) => b.annualBudget - b.committed - b.actual;
/** Meter values: used % now and after `adding`. tone: normal < warn, warning ≥ warn, over > 100. */
export function budgetMeter(b: BudgetCategory, adding = 0, lim = DEFAULT_LIMITS) {
  const used = b.committed + b.actual;
  const pct = b.annualBudget ? Math.round(((used + adding) * 100) / b.annualBudget) : 100;
  return { used, after: used + adding, pct, tone: pct > 100 ? "over" : pct >= lim.budgetWarnPct ? "warning" : "normal" } as const;
}
export function routeFor(amount: number, o: { budget?: BudgetCategory; quotesWaived?: boolean; noPo?: boolean } = {}, lim = DEFAULT_LIMITS) {
  const reasons: RouteReason[] = [];
  if (amount > lim.financeMax) reasons.push("over_limit");
  if (o.budget && amount > budgetAvailable(o.budget)) reasons.push("over_budget");
  if (o.quotesWaived) reasons.push("quotes_waived");
  if (o.noPo) reasons.push("no_po");
  return { route: (reasons.length ? "executive" : "finance") as Route, reasons };
}
/** Bill chain: approve by finance unless escalated; authorise by executive above the limit. */
export const authoriserFor = (amount: number, lim = DEFAULT_LIMITS): Route => (amount > lim.financeMax ? "executive" : "finance");

// ---------------------------------------------------------------- R-3/R-4 three-way match
export const lineTolerance = (poNet: number, lim = DEFAULT_LIMITS) => Math.max(Math.round((poNet * lim.tolerancePct) / 100), lim.toleranceMin);
/** Per line: billed qty ≤ received; |Δnet| ≤ tolerance; VAT within rounding. Lines matched by position/id. */
export function match(po: PoLine[], billLines: Line[], lim = DEFAULT_LIMITS, vatBps = POLICY.vatBps): { result: "matched" | "match_exception"; lines: MatchLine[] } {
  const lines = po.map((p, i): MatchLine => {
    const b = billLines.find((x) => x.id === p.id) ?? billLines[i];
    const billed = b?.qty ?? 0, billNet = b?.net ?? 0;
    const expectedNet = Math.round(p.unitPrice * Math.min(billed, p.received));
    const delta = billNet - expectedNet;
    const threshold = lineTolerance(p.net, lim);
    const vatOk = !b || !b.vatable || Math.abs(b.vat - applyBps(b.net, vatBps)) <= lim.vatRoundingTolerance;
    const reason = billed > p.received ? "qty" : Math.abs(delta) > threshold ? "amount" : !vatOk ? "vat" : undefined;
    return {
      lineId: p.id, description: p.description, ordered: p.qty, received: p.received, billed, poNet: p.net, billNet, delta, threshold,
      result: reason ? "exception" : delta === 0 ? "matched" : "tolerance", reason,
    };
  });
  return { result: lines.some((l) => l.result === "exception") ? "match_exception" : "matched", lines };
}

// ---------------------------------------------------------------- R-6 duplicates
export const normaliseInvoiceNo = (s: string) => s.trim().toUpperCase().replace(/[\s-]/g, "");
export const isDuplicate = (bills: Pick<Bill, "vendorId" | "vendorInvoiceNo" | "no">[], vendorId: string, invoiceNo: string, exceptNo?: string) =>
  bills.find((b) => b.no !== exceptNo && b.vendorId === vendorId && normaliseInvoiceNo(b.vendorInvoiceNo) === normaliseInvoiceNo(invoiceNo));

// ---------------------------------------------------------------- R-7 bank lock
/** ISO time payments unlock; null = never verified yet (locked until finance verifies). Rejected → lifts at decision time. */
export function paymentLockUntil(c: { requestedAt: string; verifiedAt?: string; status: "requested" | "verified" | "rejected" }, lim = DEFAULT_LIMITS) {
  if (c.status === "requested") return null;
  if (c.status === "rejected") return c.verifiedAt ?? c.requestedAt;
  const min = Date.parse(c.requestedAt) + lim.lockHours * 3600_000;
  return new Date(Math.max(Date.parse(c.verifiedAt ?? c.requestedAt), min)).toISOString();
}

// ---------------------------------------------------------------- R-9/R-10 contracts and deposits
export const reminderDates = (endOn: string, offsets: readonly number[] = DEFAULT_LIMITS.reminderOffsets) =>
  offsets.map((o) => ({ offset: o, on: addDays(endOn, -o), key: `${endOn}:${o}` }));
export const noticeDeadline = (c: Pick<Contract, "endOn" | "noticeDays">) => addDays(c.endOn, -c.noticeDays);
export const depositReturnDue = (endOn: string, lim = DEFAULT_LIMITS) => addDays(endOn, lim.depositReturnDays);
export function contractStatus(c: Pick<Contract, "status" | "endOn" | "noticeDays">, today: string): ContractStatus {
  if (c.status === "draft" || c.status === "renewed" || c.status === "terminated") return c.status;
  if (today > c.endOn) return "expired";
  return today >= noticeDeadline(c) ? "expiring" : "active";
}
/** R-14: escalation rounded half-up to 1 RWF. */
export const escalate = (amount: number, pct: number) => Math.round(amount * (1 + pct / 100));

// ---------------------------------------------------------------- R-11/R-13
export function applyAdvance(billTotal: number, remaining: number, requested = remaining) {
  const applied = Math.max(0, Math.min(requested, remaining, billTotal));
  return { applied, payable: Math.max(0, billTotal - applied), remaining: remaining - applied };
}
export function dueDate(invoiceDate: string, termsDays: number, dueDay?: number) {
  if (!dueDay) return addDays(invoiceDate, termsDays);
  const d = new Date(`${invoiceDate.slice(0, 10)}T00:00:00Z`);
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + (d.getUTCDate() > dueDay ? 1 : 0), dueDay));
  return first.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- R-12 / R-16 / segregation
export const AGE_LABEL = { not_due: "Not due", "0_30": "1–30", "31_60": "31–60", "61_90": "61–90", "90_plus": "90+" } as const;
export type Guard = null | "segregation_violation" | "limit_exceeded" | "payment_locked" | "vendor_blocked" | "invalid_state";
type Who = { id: string; roles: readonly string[] };
const isExec = (u: Who) => u.roles.includes("staff:executive");
const isFin = (u: Who) => u.roles.includes("staff:finance");
export function guardApprove(b: Pick<Bill, "status" | "preparedBy" | "route" | "total" | "match">, u: Who): Guard {
  const ok = b.status === "matched" || b.status === "submitted" || (b.status === "match_exception" && b.match?.exceptionApproved);
  if (!ok) return "invalid_state";
  if (b.preparedBy?.id === u.id) return "segregation_violation";
  if (b.route === "executive" ? !isExec(u) : !(isFin(u) || isExec(u))) return "limit_exceeded";
  return null;
}
export function guardAuthorise(b: Pick<Bill, "status" | "approvedBy" | "preparedBy" | "total">, u: Who, lim = DEFAULT_LIMITS): Guard {
  if (b.status !== "approved") return "invalid_state";
  if (b.approvedBy?.id === u.id || b.preparedBy?.id === u.id) return "segregation_violation";
  if (authoriserFor(b.total, lim) === "executive" ? !isExec(u) : !(isFin(u) || isExec(u))) return "limit_exceeded";
  return null;
}
export function guardPay(b: Pick<Bill, "status" | "approvedBy" | "preparedBy">, u: Who, vendor: { status: string; lockUntil?: string; bankStatus: string }, now: number): Guard {
  if (b.status !== "authorised" && b.status !== "partially_paid") return "invalid_state";
  if (!isFin(u)) return "limit_exceeded";
  if (b.preparedBy?.id === u.id || b.approvedBy?.id === u.id) return "segregation_violation";
  if (vendor.status === "blocked") return "vendor_blocked";
  if (vendor.bankStatus === "unverified" || (vendor.lockUntil && Date.parse(vendor.lockUntil) > now)) return "payment_locked";
  return null;
}
/** R-6 TIN check: PLACEHOLDER(tin-format) 9 digits. */
export const validTin = (tin: string) => new RegExp(`^\\d{${POLICY.tinDigits}}$`).test(tin.replace(/\s/g, ""));
export const maskTin = (tin: string) => `•••• ${tin.replace(/\s/g, "").slice(-4)}`;
