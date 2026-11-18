// Pure state machines live in @/shared/finance/states; this adds the UI status meta (web only).
import type { IconName } from "@/components/atoms/icon";
export * from "@/shared/finance/states";

export type FinTone = "neutral" | "info" | "warning" | "success" | "danger" | "accent";
/** One icon + tone per status name (shared across kinds; labels in financeCommon(locale).status). */
export const STATUS_META: Record<string, { tone: FinTone; icon: IconName }> = {
  draft: { tone: "neutral", icon: "file" }, pending_approval: { tone: "warning", icon: "clock" }, sent: { tone: "info", icon: "arrowRight" },
  accepted: { tone: "success", icon: "check" }, declined: { tone: "danger", icon: "x" }, changes_requested: { tone: "warning", icon: "refresh" },
  expired: { tone: "neutral", icon: "clock" }, withdrawn: { tone: "neutral", icon: "x" }, superseded: { tone: "neutral", icon: "layers" },
  converted: { tone: "success", icon: "fileCheck" }, issued: { tone: "info", icon: "file" }, partially_paid: { tone: "warning", icon: "wallet" },
  paid: { tone: "success", icon: "check" }, void: { tone: "neutral", icon: "x" }, credited: { tone: "accent", icon: "refresh" },
  paid_by_plan: { tone: "success", icon: "shield" }, overdue: { tone: "danger", icon: "clock" },
  initiated: { tone: "neutral", icon: "clock" }, pending_provider: { tone: "warning", icon: "clock" }, confirmed: { tone: "success", icon: "check" },
  failed: { tone: "danger", icon: "x" }, confirmed_late: { tone: "warning", icon: "check" }, proof_submitted: { tone: "info", icon: "upload" },
  under_verification: { tone: "warning", icon: "search" }, rejected: { tone: "danger", icon: "x" }, reversed: { tone: "danger", icon: "refresh" },
  requested: { tone: "info", icon: "message" }, under_review: { tone: "warning", icon: "search" }, recommended: { tone: "accent", icon: "fileCheck" },
  awaiting_executive: { tone: "warning", icon: "shield" }, approved: { tone: "success", icon: "check" }, completed_as_credit: { tone: "success", icon: "wallet" },
  executing: { tone: "info", icon: "refresh" }, refunded: { tone: "success", icon: "check" }, execution_failed: { tone: "danger", icon: "x" },
  pending_review: { tone: "warning", icon: "clock" }, reviewed: { tone: "info", icon: "fileCheck" }, approved_for_payment: { tone: "success", icon: "check" },
  in_batch: { tone: "accent", icon: "layers" }, on_hold: { tone: "neutral", icon: "clock" }, voided: { tone: "neutral", icon: "x" },
  proposed: { tone: "info", icon: "message" }, settled: { tone: "success", icon: "check" }, submitted: { tone: "info", icon: "arrowRight" },
  authorised: { tone: "success", icon: "shield" }, closed: { tone: "neutral", icon: "check" }, pending: { tone: "warning", icon: "clock" },
  excluded: { tone: "neutral", icon: "x" }, uploaded: { tone: "neutral", icon: "upload" }, mapped: { tone: "info", icon: "layers" },
  parsed: { tone: "info", icon: "file" }, matched: { tone: "success", icon: "check" }, applied: { tone: "success", icon: "check" },
  active: { tone: "success", icon: "check" }, scheduled: { tone: "info", icon: "calendar" }, ended: { tone: "neutral", icon: "clock" },
  open: { tone: "neutral", icon: "clock" }, reopened: { tone: "warning", icon: "refresh" },
};
export const statusMeta = (s: string) => STATUS_META[s] ?? { tone: "neutral" as const, icon: "file" as IconName };

/** REV F-REV-03 / FN7.2: an allocation is created only when delivered, every case invoice is paid, and no dispute is open. */
export const allocationDue = (c: { status: string; disputed?: boolean }, invoices: { status: string }[]) =>
  c.status === "completed_delivered" && !c.disputed && invoices.length > 0 &&
  invoices.every((i) => i.status === "paid" || i.status === "paid_by_plan" || i.status === "void");
