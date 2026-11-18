// Mirror of server/src/domain/system/privacy.ts — UI display only; the server enforces.
// Data-subject requests and retention (plan 06 §2.7, §2.8; privacy §2, §4).
import type { DsrStatus, DsrType, DsrVM, PlanAction, RetentionRow } from "./types";

export const DSR_SLA_DAYS = 30; // spec ⚖
export const dsrDue = (receivedAt: string) => new Date(Date.parse(receivedAt) + DSR_SLA_DAYS * 86_400_000).toISOString();

export const DSR_NEXT: Record<DsrStatus, DsrStatus[]> = {
  received: ["verifying", "rejected"],
  verifying: ["in_progress", "rejected"],
  in_progress: ["completed", "rejected"],
  completed: [],
  rejected: [],
};

/** Inventory per data category: what erasure does with it (privacy §2). */
export const DATA_CATEGORIES: { category: string; erase: PlanAction; keep?: string; reason?: string }[] = [
  { category: "Account", erase: "anonymise" },
  { category: "Identity documents", erase: "delete" },
  { category: "Business / tax records", erase: "retain", keep: "10 y", reason: "Tax law ⚖" },
  { category: "Financial records", erase: "retain", keep: "10 y", reason: "Accounting law ⚖ · PII pseudonymised" },
  { category: "Communications", erase: "anonymise" },
  { category: "Field data", erase: "delete" },
  { category: "Marketing", erase: "delete" },
  { category: "Analytics", erase: "delete" },
  { category: "AI conversations", erase: "delete" },
];

/** Erasure plan; export/rectification/restriction carry no destructive plan. */
export function erasurePlan(type: DsrType, receivedAt: string): DsrVM["plan"] {
  if (type !== "erasure") return [];
  const y = new Date(receivedAt).getUTCFullYear();
  return DATA_CATEGORIES.map((c) => ({ category: c.category, action: c.erase, ...(c.keep && { until: `${y + 10}-12-31`, reason: c.reason }) }));
}

/** Legal hold blocks erasure (409 legal_hold); export is still allowed. */
export const blockedByHold = (d: Pick<DsrVM, "type" | "legalHold">) => d.legalHold && d.type === "erasure";

/** privacy §2 authoritative values. */
export const RETENTION: Omit<RetentionRow, "lastRunAt" | "due">[] = [
  { category: "Account", keep: "Life of account + 2 y", action: "anonymise", legal: false },
  { category: "Identity documents", keep: "Case closed + 5 y", action: "delete", legal: false },
  { category: "Business / tax records", keep: "10 y", action: "archive", legal: true },
  { category: "Financial records", keep: "10 y", action: "archive", legal: true },
  { category: "Communications", keep: "7 y", action: "anonymise", legal: false },
  { category: "Field data", keep: "Case closed + 2 y", action: "delete", legal: false },
  { category: "Marketing", keep: "Until withdrawn + 1 y", action: "delete", legal: false },
  { category: "Analytics", keep: "14 months", action: "delete", legal: false },
  { category: "AI conversations", keep: "90 days (raw)", action: "delete", legal: false },
  { category: "Audit logs", keep: "7 y financial · 5 y other", action: "archive", legal: true },
  { category: "Worker HR", keep: "End of engagement + 5 y", action: "archive", legal: false },
];
