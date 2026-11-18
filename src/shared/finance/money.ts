// Mirror of server/src/domain/finance/money.ts — UI display only; the server enforces.
// Finance money maths (plan 05 §2.3). Pure, integer RWF in and out, rates in basis points.
// Builds on the shared src/lib/money (applyBps/splitVat); every derived amount on a finance screen comes from here.
import { applyBps, splitVat } from "@/shared/money";
import { POLICY } from "@/shared/policy";
import type { AllocationStatus, Bps, DocLine, DocTotals, LineKind, Rwf } from "@/shared/finance/types";

/** Half away from zero, symmetric for negatives (credit-note lines). */
export const roundHalfUp = (n: number) => Math.sign(n) * Math.round(Math.abs(n));

/** VAT-able kinds (FIN §12): only service fee, surcharge and discount; `other` per line. Gov fees and disbursements pass through. */
export const VATABLE: Record<LineKind, boolean> = {
  service_fee: true, urgent_surcharge: true, discount: true, government_fee: false, third_party_cost: false, other: false,
};
export const isTaxable = (l: DocLine) => (l.kind === "other" ? !!l.taxable : VATABLE[l.kind]);
export const lineNet = (l: DocLine): Rwf => roundHalfUp(l.qty * l.unit) * (l.kind === "discount" ? -1 : 1);
export const lineVat = (l: DocLine, vatBps: Bps = POLICY.vatBps): Rwf => (isTaxable(l) ? applyBps(lineNet(l), vatBps) : 0);

/** Totals are always computed from lines (FIN §13). eligible = taxable lines net of VAT (F-REV-02). */
export function docTotals(lines: DocLine[], vatBps: Bps = POLICY.vatBps): DocTotals {
  let subtotal = 0, vat = 0, passThrough = 0;
  for (const l of lines) {
    if (isTaxable(l)) { subtotal += lineNet(l); vat += lineVat(l, vatBps); } else passThrough += lineNet(l);
  }
  return { subtotal, vat, passThrough, total: subtotal + vat + passThrough, eligible: subtotal };
}

/** Deposit when total ≥ threshold (D-08); a per-quote `bps` override skips the threshold. */
export function depositSplit(total: Rwf, rule: { bps: Bps; threshold?: Rwf } = { bps: POLICY.depositBps, threshold: POLICY.depositThreshold }) {
  if (rule.threshold != null && total < rule.threshold) return null;
  const deposit = applyBps(total, rule.bps);
  return { deposit, balance: total - deposit };
}

/** Apply a received amount to an invoice balance; any excess becomes client credit (FIN §12). */
export function applyPayment(inv: { balanceDue: Rwf }, amount: Rwf) {
  const applied = Math.min(amount, inv.balanceDue);
  const credit = Math.max(0, amount - inv.balanceDue);
  const status = applied >= inv.balanceDue ? ("paid" as const) : applied > 0 ? ("partially_paid" as const) : ("issued" as const);
  return { applied, credit, status };
}

/** Suggested refund (RFD §12): stage % of the eligible fee + proportional VAT + unspent pass-through. */
export function refundSuggestion(inv: { lines: DocLine[] }, stage: string, policy: Record<string, Bps> = POLICY.refundPolicyBps, spent = true, vatBps: Bps = POLICY.vatBps) {
  const t = docTotals(inv.lines, vatBps);
  const pct = stage === "duplicate" ? 10_000 : (policy[stage] ?? 0);
  const eligiblePart = applyBps(t.eligible, pct);
  const vat = applyBps(eligiblePart, vatBps);
  const passThrough = spent ? 0 : t.passThrough;
  return { eligiblePart, vat, passThrough, total: eligiblePart + vat + passThrough, pct };
}

/** Negative mirror lines for a credit note. Caller guards Σ ≤ total − previous credits (`exceedsRefundable`). */
export function creditNoteLines(s: { eligiblePart: Rwf; passThrough: Rwf }, label = "Credit"): DocLine[] {
  const out: DocLine[] = [{ kind: "service_fee", label, qty: 1, unit: -s.eligiblePart }];
  if (s.passThrough) out.push({ kind: "third_party_cost", label, qty: 1, unit: -s.passThrough });
  return out;
}
export const exceedsRefundable = (amount: Rwf, invoiceTotal: Rwf, previousCredits: Rwf) => amount > invoiceTotal - previousCredits;

/** Revenue split on the eligible fee (F-REV-01..03). */
export function allocate(eligible: Rwf, deductions: Rwf[] | { amount: Rwf }[], bps: Bps) {
  const ded = (deductions as (Rwf | { amount: Rwf })[]).reduce<number>((s, d) => s + (typeof d === "number" ? d : d.amount), 0);
  const netBase = eligible - ded;
  const pool = applyBps(netBase, bps);
  return { netBase, pool, hebuza: netBase - pool };
}

/** Largest-remainder split; Σ = pool exactly; ties go to the first (lead) share. */
export function splitPool(pool: Rwf, shares: { workerId: string; bps: Bps }[]) {
  const total = shares.reduce((s, x) => s + x.bps, 0) || 1;
  const raw = shares.map((s, i) => ({ i, workerId: s.workerId, exact: (pool * s.bps) / total }));
  const out = raw.map((r) => ({ workerId: r.workerId, amount: Math.floor(r.exact) }));
  let left = pool - out.reduce((s, x) => s + x.amount, 0);
  for (const r of [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1) || a.i - b.i)) {
    if (left <= 0) break;
    out[r.i].amount += 1;
    left -= 1;
  }
  return out;
}

/** Agent reversal on a refund (F-RFD-05): −round(refundedEligible × pct). */
export const reversal = (refundedEligible: Rwf, bps: Bps): Rwf => -applyBps(refundedEligible, bps);

/** One payout line (REV §12.8/12.9, X-2): WHT on externals, then fees; net < 0 → 0 and carried forward. */
export function payoutLine(o: { gross: Rwf; adjustments: Rwf; fees: Rwf; external: boolean; whtBps?: Bps; carried?: Rwf }) {
  const taxable = o.gross + o.adjustments + (o.carried ?? 0);
  const wht = o.external && taxable > 0 ? applyBps(taxable, o.whtBps ?? POLICY.whtBps) : 0;
  const fees = o.external ? o.fees : 0;
  const raw = taxable - wht - fees;
  return { taxable, wht, fees, net: Math.max(0, raw), carryForward: Math.min(0, raw) };
}

/** Subscription price net of VAT (W10). */
export const subscriptionNet = (price: Rwf, vatInclusive: boolean, vatBps: Bps = POLICY.vatBps) => (vatInclusive ? splitVat(price, vatBps).net : price);

/** Upgrade proration charged now (W15). */
export const prorate = (oldPrice: Rwf, newPrice: Rwf, remainingDays: number, periodDays: number) =>
  roundHalfUp(((newPrice - oldPrice) * remainingDays) / periodDays);

/** P3 display-only FX (F-FIN-14). rate = RWF per unit. */
export const fx = (amount: number, rate: number) => ({ rwf: roundHalfUp(amount * rate), display: amount });
