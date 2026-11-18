// Mirror of server/src/domain/finance/recon.ts — UI display only; the server enforces.
// Statement ⇄ platform matcher (plan 05 §2.5). Pure; finance-world and lane C call it.
import type { MatchState, Method, Rwf } from "@/shared/finance/types";

export type LineIn = { id: string; externalRef: string; amount: Rwf; fee: Rwf; occurredAt: string };
export type PaymentIn = { id: string; ref?: string; amount: Rwf; at: string; method: Method; confirmed: boolean; duplicate?: boolean };
export type LineResult = { lineId: string; match: MatchState; paymentId?: string; diff?: Rwf; reason?: string };

const DAY = 86_400_000;

/** Rules 1–6: exact ref+amount → matched (duplicate if the payment was a second one); ref with other amount → exception;
 * unique same-amount payment within ±1 day → suggested; else unmatched. Rule 7 (fees) is the caller's: line.fee → payment.providerFee. */
export function matchLines(lines: LineIn[], payments: PaymentIn[]) {
  const used = new Set<string>();
  const byRef = new Map(payments.filter((p) => p.ref).map((p) => [p.ref!, p]));
  const results: LineResult[] = lines.map((l) => {
    const p = byRef.get(l.externalRef);
    if (p) {
      used.add(p.id);
      if (p.amount !== l.amount) return { lineId: l.id, match: "exception", paymentId: p.id, diff: l.amount - p.amount, reason: "amount_mismatch" };
      return { lineId: l.id, match: p.duplicate ? "duplicate" : "matched", paymentId: p.id };
    }
    return { lineId: l.id, match: "unmatched" };
  });
  // Rule 3 after exact matches so a suggestion never steals an exact payment.
  for (const r of results) {
    if (r.match !== "unmatched") continue;
    const l = lines.find((x) => x.id === r.lineId)!;
    const t = Date.parse(l.occurredAt);
    const c = payments.filter((p) => !used.has(p.id) && p.amount === l.amount && Math.abs(Date.parse(p.at) - t) <= DAY);
    if (c.length === 1) { r.match = "suggested"; r.paymentId = c[0].id; used.add(c[0].id); }
  }
  /** Rule 5: confirmed platform payments with no statement line (only meaningful for a closed provider-day). */
  const platformUnmatched = payments.filter((p) => p.confirmed && !used.has(p.id)).map((p) => p.id);
  return { results, platformUnmatched };
}

export const countBy = (results: LineResult[]) =>
  results.reduce((m, r) => ({ ...m, [r.match]: m[r.match] + 1 }),
    { matched: 0, suggested: 0, exception: 0, unmatched: 0, ignored: 0, duplicate: 0 } as Record<MatchState, number>);

/** Difference is computed from what is still unexplained, never from totals alone (board 07 fix). */
export function difference(lines: LineIn[], results: LineResult[], payments: PaymentIn[], platformUnmatched: string[]): Rwf {
  const open = results.filter((r) => r.match === "unmatched").reduce((s, r) => s + lines.find((l) => l.id === r.lineId)!.amount, 0);
  const plat = platformUnmatched.reduce((s, id) => s + payments.find((p) => p.id === id)!.amount, 0);
  const exc = results.filter((r) => r.match === "exception").reduce((s, r) => s + (r.diff ?? 0), 0);
  return open - plat + exc;
}

/** Closing a provider-day: no unmatched/suggested; exceptions and ignores carry a reason. */
export function closeBlockers(results: LineResult[]) {
  return results.filter((r) => r.match === "unmatched" || r.match === "suggested" || ((r.match === "exception" || r.match === "ignored") && !r.reason?.trim()));
}
