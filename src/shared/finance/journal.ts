// Mirror of server/src/domain/finance/journal.ts — UI display only; the server enforces.
// Accounting journal (F-FIN-13). Account codes are PLACEHOLDER(chart-of-accounts) until finance confirms them.
import type { DocTotals, Rwf } from "@/shared/finance/types";

export const ACCOUNTS = {
  cash: "1010", receivable: "1100", vat: "2200", passThrough: "2300", clientCredit: "2350", agentPayable: "2400",
  revenue: "4000", agentShare: "5000", providerFees: "6100",
} as const; // PLACEHOLDER(chart-of-accounts)
export type Account = keyof typeof ACCOUNTS;
export type Entry = { ref: string; account: Account; debit: Rwf; credit: Rwf };

export type JournalEvent =
  | { kind: "invoice"; ref: string; totals: DocTotals }
  | { kind: "credit_note"; ref: string; totals: DocTotals }
  | { kind: "payment"; ref: string; applied: Rwf; credit: Rwf; fee?: Rwf }
  | { kind: "allocation"; ref: string; pool: Rwf }
  | { kind: "payout"; ref: string; net: Rwf };

const dr = (ref: string, account: Account, v: Rwf): Entry => ({ ref, account, debit: v, credit: 0 });
const cr = (ref: string, account: Account, v: Rwf): Entry => ({ ref, account, debit: 0, credit: v });

export function journal(events: JournalEvent[]): Entry[] {
  const out: Entry[] = [];
  for (const e of events) {
    if (e.kind === "invoice") {
      const t = e.totals;
      out.push(dr(e.ref, "receivable", t.total), cr(e.ref, "revenue", t.subtotal), cr(e.ref, "vat", t.vat), cr(e.ref, "passThrough", t.passThrough));
    } else if (e.kind === "credit_note") {
      const t = e.totals; // credit-note totals are negative: mirror the invoice entry
      out.push(cr(e.ref, "receivable", -t.total), dr(e.ref, "revenue", -t.subtotal), dr(e.ref, "vat", -t.vat), dr(e.ref, "passThrough", -t.passThrough));
    } else if (e.kind === "payment") {
      out.push(dr(e.ref, "cash", e.applied + e.credit), cr(e.ref, "receivable", e.applied));
      if (e.credit) out.push(cr(e.ref, "clientCredit", e.credit));
      if (e.fee) out.push(dr(e.ref, "providerFees", e.fee), cr(e.ref, "cash", e.fee)); // D-09: fee recorded separately
    } else if (e.kind === "allocation") out.push(dr(e.ref, "agentShare", e.pool), cr(e.ref, "agentPayable", e.pool));
    else out.push(dr(e.ref, "agentPayable", e.net), cr(e.ref, "cash", e.net));
  }
  return out.filter((l) => l.debit || l.credit);
}

export const balance = (entries: Entry[]) => entries.reduce((s, e) => s + e.debit - e.credit, 0);
export const isBalanced = (entries: Entry[]) => balance(entries) === 0;
