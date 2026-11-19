// Mirror of server/src/domain/ops/ranking.ts — UI display only; the server enforces.
// Assignment suggestions (spec: assignment-and-workload F-ASN-02; journey service-manager M3.1).
// Eligibility first (hard filters, each with a reason), then a weighted score with human-readable reasons.
export type Agent = {
  id: string;
  name: string;
  external?: boolean;
  location?: string;
  services: string[]; // authorised service slugs
  skills: Record<string, number>; // slug → proficiency 0..1
  load: number;
  cap: number;
  onLeaveUntil?: string | null;
  cleared?: boolean;
  onTime: number; // 0..1, 30 days
  rating: number; // 0..5
  languages: string[];
  conflictWith?: string[]; // client ids
  cost?: number; // agreed price for externals
  duty?: string; // "away" blocks new work (F-WRK-09)
  dailyCap?: number | null;
  assignedToday?: number;
};
export type CaseForRanking = {
  service: string;
  clientId: string;
  language: string;
  dedicatedAgentId?: string | null;
  includeExternal?: boolean;
};

export type Ineligible = {
  agent: Agent;
  reason: "notAuthorised" | "onLeave" | "atCap" | "dailyCap" | "offDuty" | "conflict" | "notCleared" | "contractExpired";
};

/** ASN-05/09, WRK-06/12: the same eligibility for ranked suggestions and manual assignment. */
export function ineligibleReason(
  c: Pick<CaseForRanking, "service" | "clientId">,
  a: Agent & { contractUntil?: string | null },
  today = new Date().toISOString().slice(0, 10),
): Ineligible["reason"] | null {
  return !a.services.includes(c.service)
    ? "notAuthorised"
    : a.cleared === false
      ? "notCleared"
      : a.onLeaveUntil && a.onLeaveUntil >= today
        ? "onLeave"
        : a.contractUntil && a.contractUntil.slice(0, 10) < today
          ? "contractExpired"
          : a.duty === "away"
            ? "offDuty"
          : a.load >= a.cap
            ? "atCap"
          : a.dailyCap != null && (a.assignedToday ?? 0) >= a.dailyCap
            ? "dailyCap"
            : a.conflictWith?.includes(c.clientId)
              ? "conflict"
              : null;
}
export type Suggestion = { agent: Agent; score: number; reasons: string[] };

export const WEIGHTS = {
  skill: 0.3,
  load: 0.2,
  onTime: 0.2,
  rating: 0.1,
  dedicated: 0.1,
  language: 0.05,
  cost: 0.05,
};

export function rankAgents(
  c: CaseForRanking,
  agents: Agent[],
  today = new Date().toISOString().slice(0, 10),
): { suggestions: Suggestion[]; ineligible: Ineligible[] } {
  const ineligible: Ineligible[] = [];
  const pool = agents.filter((a) => {
    const reason = ineligibleReason(c, a, today);
    if (reason) ineligible.push({ agent: a, reason });
    return !reason && (c.includeExternal || !a.external);
  });
  const maxCost = Math.max(1, ...pool.map((a) => a.cost ?? 0));
  const suggestions = pool
    .map((a) => {
      const skill = a.skills[c.service] ?? 0;
      const free = 1 - a.load / a.cap;
      const dedicated = c.dedicatedAgentId === a.id ? 1 : 0;
      const lang = a.languages.includes(c.language) ? 1 : 0;
      const cost = a.external ? 1 - (a.cost ?? 0) / maxCost : 1;
      const score =
        WEIGHTS.skill * skill +
        WEIGHTS.load * free +
        WEIGHTS.onTime * a.onTime +
        WEIGHTS.rating * (a.rating / 5) +
        WEIGHTS.dedicated * dedicated +
        WEIGHTS.language * lang +
        WEIGHTS.cost * cost;
      const reasons = [
        ...(dedicated ? ["dedicated"] : []),
        skill >= 0.9
          ? "skillExpert"
          : skill >= 0.7
            ? "skillAdvanced"
            : "skillBasic",
        `load:${a.load}/${a.cap}`,
        `onTime:${Math.round(a.onTime * 100)}`,
        `rating:${a.rating.toFixed(1)}`,
        ...(lang ? [`lang:${c.language}`] : []),
      ];
      return { agent: a, score: Math.round(score * 100), reasons };
    })
    .sort((x, y) => y.score - x.score || x.agent.load - y.agent.load);
  return { suggestions, ineligible };
}
