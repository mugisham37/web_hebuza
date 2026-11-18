// Mirror of server/src/domain/ops/quotation.ts — UI display only; the server enforces.
// Quotation maths (spec: quotes-invoices-payments F-FIN-01; journey M2 "needs pricing").
export type QuoteLine = { label: string; qty: number; unit: number };
export type Quote = {
  lines: QuoteLine[];
  discountPct: number;
  discountReason?: string;
  vatPct?: number;
  validityDays: number;
};

export const VAT_PCT = 18;

/** Totals in whole RWF. VAT applies after discount. A discount needs a reason (returned as an error key). */
export function quoteTotals(q: Quote, issuedAt = new Date()) {
  const subtotal = q.lines.reduce(
    (s, l) => s + Math.max(0, l.qty) * Math.max(0, l.unit),
    0,
  );
  const pct = Math.min(100, Math.max(0, q.discountPct));
  const discount = Math.round((subtotal * pct) / 100);
  const vat = Math.round(((subtotal - discount) * (q.vatPct ?? VAT_PCT)) / 100);
  const total = subtotal - discount + vat;
  const validUntil = new Date(issuedAt.getTime() + q.validityDays * 86_400_000);
  const errors: string[] = [];
  if (!q.lines.length || subtotal === 0) errors.push("noLines");
  if (pct > 0 && !q.discountReason?.trim()) errors.push("discountReason");
  return { subtotal, discount, vat, total, validUntil, errors };
}
