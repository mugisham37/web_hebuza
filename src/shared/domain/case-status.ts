// Mirror of server/src/domain/domain/case-status.ts — UI display only; the server enforces.
// Canonical case statuses — spec/00-index.md + 05-modules/service-request-lifecycle.md §7.
export const CASE_STATUSES = [
  "received",
  "under_review",
  "awaiting_quotation",
  "awaiting_payment",
  "awaiting_client_documents",
  "approved_assigned",
  "in_progress",
  "awaiting_internal_review",
  "awaiting_external_institution",
  "completed_delivered",
  "on_hold",
  "cancelled",
  "rejected",
  "refund_requested",
  "refunded",
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "accent";

export const CASE_STATUS_META: Record<CaseStatus, { tone: Tone; pausesSla: boolean; terminal: boolean; waitingOnClient: boolean }> = {
  received: { tone: "neutral", pausesSla: false, terminal: false, waitingOnClient: false },
  under_review: { tone: "info", pausesSla: false, terminal: false, waitingOnClient: false },
  awaiting_quotation: { tone: "warning", pausesSla: true, terminal: false, waitingOnClient: false },
  awaiting_payment: { tone: "warning", pausesSla: true, terminal: false, waitingOnClient: true },
  awaiting_client_documents: { tone: "warning", pausesSla: true, terminal: false, waitingOnClient: true },
  approved_assigned: { tone: "info", pausesSla: false, terminal: false, waitingOnClient: false },
  in_progress: { tone: "accent", pausesSla: false, terminal: false, waitingOnClient: false },
  awaiting_internal_review: { tone: "info", pausesSla: false, terminal: false, waitingOnClient: false },
  awaiting_external_institution: { tone: "neutral", pausesSla: true, terminal: false, waitingOnClient: false },
  completed_delivered: { tone: "success", pausesSla: false, terminal: false, waitingOnClient: false },
  on_hold: { tone: "neutral", pausesSla: true, terminal: false, waitingOnClient: false },
  cancelled: { tone: "danger", pausesSla: false, terminal: true, waitingOnClient: false },
  rejected: { tone: "danger", pausesSla: false, terminal: true, waitingOnClient: false },
  refund_requested: { tone: "warning", pausesSla: false, terminal: false, waitingOnClient: false },
  refunded: { tone: "neutral", pausesSla: false, terminal: true, waitingOnClient: false },
};

export const EXTERNAL_OUTCOMES = ["none", "pending", "approved", "rejected", "more_info_requested"] as const;
export type ExternalOutcome = (typeof EXTERNAL_OUTCOMES)[number];

/** Legacy server values → canonical (REQ migration). */
export const LEGACY_STATUS: Record<string, CaseStatus> = {
  assigned: "approved_assigned",
  action_required: "awaiting_client_documents",
  completed: "completed_delivered",
};
export const normalizeStatus = (s: string): CaseStatus =>
  (CASE_STATUSES as readonly string[]).includes(s) ? (s as CaseStatus) : LEGACY_STATUS[s] ?? "received";
