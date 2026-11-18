// Agent money maths (spec/05-modules/revenue-sharing; plan D2/D3) on top of the shared lib/money.
// One place so offers, the workbench, deliverables and earnings always agree.
// Stage 5 (§13.3): the share is the finance allocation pool; state names map via AGENT_STATE_OF.
import { allocate } from "@/lib/finance/money";
export { applyBps, payout } from "@/shared/money";
export { AGENT_STATE_OF } from "@/lib/finance/money";

export const MONEY_STATES = [
  "invoiced",
  "collected",
  "allocated",
  "approved",
  "scheduled",
  "paid",
  "deducted",
  "adjusted",
] as const;
export type MoneyState = (typeof MONEY_STATES)[number];

/** Internal agent share in whole RWF (X-2: no per-case licence; external licence is monthly, at payout). */
export const shareOf = (eligible: number, shareBps: number) =>
  allocate(eligible, [], shareBps).pool;

export type MoneyTotals = Record<
  "allocated" | "approved" | "scheduled" | "paid" | "deducted",
  number
>;

/** Totals per money state. "allocated" counts everything earned; later states are subsets of it. */
export function totals(
  rows: { amount: number; state: MoneyState; deducted?: number }[],
): MoneyTotals {
  const t: MoneyTotals = {
    allocated: 0,
    approved: 0,
    scheduled: 0,
    paid: 0,
    deducted: 0,
  };
  const rank: Record<MoneyState, number> = {
    invoiced: -2,
    collected: -2,
    allocated: 0,
    approved: 1,
    scheduled: 2,
    paid: 3,
    deducted: -1,
    adjusted: 0,
  };
  for (const r of rows) {
    t.deducted += r.deducted ?? 0;
    if (rank[r.state] === -2) continue; // pre-allocation: not yet the agent's money
    if (r.state === "deducted") {
      t.deducted += r.amount;
      continue;
    }
    t.allocated += r.amount;
    if (rank[r.state] >= 1) t.approved += r.amount;
    if (rank[r.state] >= 2) t.scheduled += r.amount;
    if (rank[r.state] >= 3) t.paid += r.amount;
  }
  return t;
}

// ---------------------------------------------------------------- Stage 8 external agents (plan §2.6)
import { applyBps as bps, payout as payoutOf } from "@/shared/money";
/** A rate card row is exactly one of a percentage (bps) or a flat RWF amount. */
export type Rate = { bps?: number; flat?: number };
/** What the worker earns on an eligible fee: flat wins, else eligible × bps. */
export const expectedEarning = (eligible: number, r: Rate) =>
  r.flat ?? bps(eligible, r.bps ?? 0);
/** Monthly statement for an external: WHT on (gross + adjustments), then the monthly licence; negative net carries. */
export const statementOf = (o: { gross: number; adjustments: number; licence?: number; carriedIn?: number }) => {
  const p = payoutOf({ gross: o.gross + o.adjustments, shareBps: 10_000, external: true, licence: o.licence, carriedIn: o.carriedIn });
  return { taxable: p.share, wht: p.wht, licence: p.licence, net: p.net, carry: -p.carryForward };
};
