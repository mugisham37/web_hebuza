// Pure money rules live in @/shared/finance/money; this adds the agent-side mapping (web only).
import type { AllocationStatus } from "@/shared/finance/types";
import type { MoneyState } from "@/lib/agent/money";
export * from "@/shared/finance/money";

/** Finance allocation status → agent-side money state (§2.4); consumed by lib/agent/money.ts. */
export const AGENT_STATE_OF: Record<AllocationStatus, MoneyState> = {
  pending_review: "allocated", reviewed: "allocated", on_hold: "allocated",
  approved_for_payment: "approved", in_batch: "scheduled", paid: "paid", voided: "adjusted",
};
