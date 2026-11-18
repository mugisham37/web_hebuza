// Mirror of server/src/domain/finance/numbering.ts — UI display only; the server enforces.
// Gapless document numbers (A-4, D6): PREFIX-YYYY-NNNNN per series per year; void keeps its number.
// shortcut: sequence locking is in-memory per tab session, upgrade is server SELECT … FOR UPDATE.
export type NumberSeries = "INV" | "QUO" | "RCPT" | "CN" | "RFD";

export const formatNo = (series: NumberSeries, year: number, n: number) => `${series}-${year}-${String(n).padStart(5, "0")}`;
/** Payout batch PB-YYYY-MM (+ -2 for a mid-month run). */
export const batchNo = (year: number, month: number, run = 1) => `PB-${year}-${String(month).padStart(2, "0")}${run > 1 ? `-${run}` : ""}`;
/** Preview before issue: the number is assigned at issue time. */
export const pendingNo = (series: NumberSeries, year: number) => `${series}-${year}-•••••`;

export function createSequences(seed: Partial<Record<`${NumberSeries}-${number}`, number>> = {}) {
  const last = new Map<string, number>(Object.entries(seed) as [string, number][]);
  return {
    /** Takes the next number; synchronous, so concurrent callers never share or skip one. */
    next(series: NumberSeries, year: number) {
      const k = `${series}-${year}`;
      const n = (last.get(k) ?? 0) + 1;
      last.set(k, n);
      return formatNo(series, year, n);
    },
    lastUsed: (series: NumberSeries, year: number) => last.get(`${series}-${year}`) ?? 0,
  };
}
export type Sequences = ReturnType<typeof createSequences>;
