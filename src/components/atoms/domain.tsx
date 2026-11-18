"use client";
import { useState, useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { formatMoney, formatRelative, mask, cx } from "@/shared/format";
import { type CaseStatus, type ExternalOutcome, type Tone } from "@/shared/domain/case-status";
import { Badge, StageBadge, type Stage } from "@/components/atoms/tag";

/** Integer amount + ISO currency → "RWF 12,000" in the active locale. */
export function Money({ amount, currency = "RWF", className }: { amount: number; currency?: string; className?: string }) {
  const { locale } = useI18n();
  return <span className={cx("tabular", className)}>{formatMoney(amount, currency, locale)}</span>;
}

/** Masked identifier (ID, TIN, phone, bank). `onReveal` must record an audit entry server-side (F-AUD-04). */
export function MaskedValue({ value, onReveal, label }: { value: string; onReveal?: () => Promise<void> | void; label: string }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="tabular">{shown ? value : mask(value)}</span>
      {onReveal && !shown && (
        <button type="button" className="text-small text-link underline underline-offset-2 hover:text-link-hover" aria-label={`${t("common.reveal")} ${label}`} onClick={async () => { await onReveal(); setShown(true); }}>
          {t("common.reveal")}
        </button>
      )}
    </span>
  );
}

// D12: case lifecycle → guide pipeline stage colours, by meaning.
export const CASE_STAGE: Record<CaseStatus, Stage> = {
  received: "applied", under_review: "review", awaiting_quotation: "interview", awaiting_payment: "interview",
  awaiting_client_documents: "interview", approved_assigned: "shortlisted", in_progress: "shortlisted",
  awaiting_internal_review: "review", awaiting_external_institution: "hold", completed_delivered: "hired",
  on_hold: "hold", cancelled: "rejected", rejected: "rejected", refund_requested: "offer", refunded: "applied",
};

export function StatusPill({ status, subStatus }: { status: CaseStatus; subStatus?: string }) {
  const { t } = useI18n();
  return (
    <StageBadge stage={CASE_STAGE[status]}>
      {t(`status.${status}`)}{subStatus && <span className="opacity-80">· {subStatus}</span>}
    </StageBadge>
  );
}

const OUTCOME_TONE: Record<ExternalOutcome, Tone> = { none: "neutral", pending: "info", approved: "success", rejected: "danger", more_info_requested: "warning" };
/** Institution decision, always shown separately from HEBUZA's status (F-REQ-09). */
export function OutcomePill({ outcome }: { outcome: ExternalOutcome }) {
  const { t } = useI18n();
  return <Badge tone={OUTCOME_TONE[outcome]}>{t(`outcome.${outcome}`)}</Badge>;
}

const subscribeMinute = (fn: () => void) => { const id = setInterval(fn, 60_000); return () => clearInterval(id); };
const minuteNow = () => Math.floor(Date.now() / 60_000) * 60_000; // stable within a minute, as useSyncExternalStore needs

/** SLA countdown; `paused` when the case is in an SLA-pausing status. Re-renders every minute. */
export function CountdownSLA({ dueAt, paused }: { dueAt: string; paused?: boolean }) {
  const { t, locale } = useI18n();
  const now = useSyncExternalStore(subscribeMinute, minuteNow, () => null); // null on the server: no stale prerendered time
  if (paused) return <Badge tone="neutral">{t("sla.paused")}</Badge>;
  if (now === null) return <Badge tone="neutral"><time dateTime={dueAt}>…</time></Badge>;
  const ms = new Date(dueAt).getTime() - now;
  const rel = formatRelative(dueAt, locale, now);
  const tone: Tone = ms < 0 ? "danger" : ms < 4 * 3600_000 ? "warning" : "neutral";
  return <Badge tone={tone}><time dateTime={dueAt}>{ms < 0 ? t("sla.overdue", { time: rel }) : t("sla.dueIn", { time: rel })}</time></Badge>;
}
