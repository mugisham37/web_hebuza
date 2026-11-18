// Mirror of server/src/domain/marketing/lead-machine.ts — UI display only; the server enforces.
// Lead state machine (plan 10 §2.2). Pure; the mock handler and the UI both call it.
import type { Lead, LeadStage, LostReason } from "@/shared/marketing/types";

export const OPEN_STAGES: LeadStage[] = ["new", "contacted", "qualified", "quote_sent"];
export const BOARD_STAGES: LeadStage[] = ["new", "contacted", "qualified", "quote_sent", "won", "lost"];
export const LOST_REASONS: LostReason[] = ["price", "timing", "competitor", "no_response", "not_eligible", "other"];
export const isOpen = (s: LeadStage) => OPEN_STAGES.includes(s);

export type StageCheck = { ok: true } | { ok: false; code: "STAGE_RULE" | "NEXT_ACTION_REQUIRED"; why: "won_auto" | "merged" | "lost_reason" | "needs_interest" | "reopen_only_new" | "next_action" };
/** May `lead` move to `to` by hand? `won` is set only by the conversion rule (§2.4); merged is terminal. */
export function canMove(lead: Pick<Lead, "stage" | "serviceInterest" | "nextActionAt">, to: LeadStage, p: { lostReason?: LostReason; nextActionAt?: string } = {}): StageCheck {
  if (lead.stage === "merged" || to === "merged") return { ok: false, code: "STAGE_RULE", why: "merged" };
  if (to === "won") return { ok: false, code: "STAGE_RULE", why: "won_auto" };
  if (to === "lost") return p.lostReason ? { ok: true } : { ok: false, code: "STAGE_RULE", why: "lost_reason" };
  if (lead.stage === "lost" && to !== "new") return { ok: false, code: "STAGE_RULE", why: "reopen_only_new" };
  if (lead.stage === "won") return { ok: false, code: "STAGE_RULE", why: "won_auto" };
  if (to === "qualified" && !lead.serviceInterest.length) return { ok: false, code: "STAGE_RULE", why: "needs_interest" };
  if (isOpen(to) && !(p.nextActionAt ?? lead.nextActionAt)) return { ok: false, code: "NEXT_ACTION_REQUIRED", why: "next_action" };
  return { ok: true };
}
