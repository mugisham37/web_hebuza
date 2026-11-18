// Mirror of server/src/domain/finance/rules.ts — UI display only; the server enforces.
// Revenue rule resolution and guards (REV §8, §12.3, §12.10). Dates are YYYY-MM-DD, bounds inclusive.
import type { Rule, RuleScope } from "@/shared/finance/types";

/** Highest precedence first (fixed, never reorderable — board 10 fix). */
export const PRECEDENCE: RuleScope[] = ["contract", "agent_service", "service", "agent", "global"];
const live = (r: Rule) => r.status === "active" || r.status === "scheduled" || r.status === "ended";
const inRange = (r: Rule, d: string) => r.from <= d && (!r.to || d <= r.to);
const fits = (r: Rule, k: { agentId?: string; serviceSlug?: string; contractId?: string }) =>
  (r.scope === "global") ||
  (r.scope === "service" && r.serviceSlug === k.serviceSlug) ||
  (r.scope === "agent" && r.agentId === k.agentId) ||
  (r.scope === "agent_service" && r.agentId === k.agentId && r.serviceSlug === k.serviceSlug) ||
  (r.scope === "contract" && !!k.contractId && r.contractId === k.contractId);

/** The rule in force on `date` (D-13: the case completion date). Throws when no global rule covers it. */
export function resolveRule(rules: Rule[], k: { agentId?: string; serviceSlug?: string; contractId?: string; date: string }): Rule {
  const hits = rules.filter((r) => live(r) && inRange(r, k.date.slice(0, 10)) && fits(r, k));
  const best = hits.sort((a, b) => PRECEDENCE.indexOf(a.scope) - PRECEDENCE.indexOf(b.scope))[0];
  if (!best) throw new Error("no_rule");
  return best;
}

const sameKey = (a: Rule, b: Rule) =>
  a.scope === b.scope && a.serviceSlug === b.serviceSlug && a.agentId === b.agentId && a.contractId === b.contractId;
/** 409 rule_overlap: same scope + key with intersecting ranges. */
export const rulesOverlap = (rules: Rule[], c: Rule) =>
  rules.some((r) => r.id !== c.id && r.status !== "ended" && sameKey(r, c) && r.from <= (c.to ?? "9999-12-31") && c.from <= (r.to ?? "9999-12-31"));
/** 422 retroactive: rules and settings only take effect from today on. */
export const isRetroactive = (from: string, today: string) => from.slice(0, 10) < today.slice(0, 10);
