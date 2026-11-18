// Mirror of server/src/domain/finance/ageing.ts — UI display only; the server enforces.
// Receivables ageing (F-FIN-12, D-11): not yet due + four buckets by days past due.
import type { Rwf } from "@/shared/finance/types";

export const BUCKETS = ["not_due", "0_30", "31_60", "61_90", "90_plus"] as const;
export type Bucket = (typeof BUCKETS)[number];
const DAY = 86_400_000;

export const daysPastDue = (dueAt: string, today: string) =>
  Math.floor((Date.parse(today.slice(0, 10)) - Date.parse(dueAt.slice(0, 10))) / DAY);

export function ageingBucket(dueAt: string, today: string): Bucket {
  const d = daysPastDue(dueAt, today);
  return d <= 0 ? "not_due" : d <= 30 ? "0_30" : d <= 60 ? "31_60" : d <= 90 ? "61_90" : "90_plus";
}

export function ageingSummary(invoices: { dueAt?: string; balanceDue: Rwf }[], today: string) {
  const out = Object.fromEntries(BUCKETS.map((b) => [b, 0])) as Record<Bucket, Rwf>;
  for (const i of invoices) if (i.dueAt && i.balanceDue > 0) out[ageingBucket(i.dueAt, today)] += i.balanceDue;
  return out;
}
