// Mirror of server/src/domain/finance/types.ts — UI display only; the server enforces.
// Finance domain types (plan 05 §9.1). Mirrored by src/mocks/finance-world.ts. All money is integer RWF; rates are basis points.
import type { Locale } from "@/shared/i18n/config";

export type Rwf = number;
export type Bps = number;
export type UserRef = { id: string; name: string };
export type I18nText = string | Partial<Record<Locale, string>>;

export type LineKind = "service_fee" | "urgent_surcharge" | "government_fee" | "third_party_cost" | "discount" | "other";
/** `unit` is ex-VAT; discount units are entered positive and count negative. `taxable` is read for `other` only. */
export type DocLine = { kind: LineKind; label: I18nText; qty: number; unit: Rwf; taxable?: boolean };
export type DocTotals = { subtotal: Rwf; vat: Rwf; passThrough: Rwf; total: Rwf; eligible: Rwf };

export type QuoteStatus = "draft" | "pending_approval" | "sent" | "accepted" | "declined" | "changes_requested" | "expired" | "withdrawn" | "superseded" | "converted";
export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "void" | "credited" | "paid_by_plan";
export type Series = "standard" | "deposit" | "plan" | "credit";
export type Method = "mtn_momo" | "airtel_money" | "card" | "bank_transfer" | "cash" | "other";
export type PaymentState =
  | "initiated" | "pending_provider" | "confirmed" | "failed" | "expired" | "confirmed_late"
  | "proof_submitted" | "under_verification" | "rejected" | "reversed";
export type Provider = "mtn_momo" | "airtel_money" | "card" | "bank";
export type MatchState = "matched" | "suggested" | "exception" | "unmatched" | "ignored" | "duplicate";
export type RefundStatus =
  | "requested" | "under_review" | "rejected" | "recommended" | "awaiting_executive" | "approved" | "credited"
  | "completed_as_credit" | "executing" | "refunded" | "execution_failed" | "withdrawn";
export type RefundReason = "quality_dispute" | "cancelled_before_work" | "duplicate_payment" | "service_not_delivered" | "other";
export type RefundMethod = "original" | "mtn_momo" | "airtel_money" | "bank" | "credit";
export type AllocationStatus = "pending_review" | "reviewed" | "approved_for_payment" | "in_batch" | "paid" | "on_hold" | "voided";
export type AdjStatus = "proposed" | "approved" | "in_batch" | "settled";
export type AdjReason = "refund" | "correction" | "bonus" | "clawback" | "other";
export type BatchStatus = "draft" | "submitted" | "rejected" | "authorised" | "executing" | "paid" | "partially_paid" | "closed";

export type SignerRole = "finance" | "finance_second" | "executive" | "service_manager" | "procurement";
export type Step = {
  role: SignerRole;
  /** finance_second steps an executive may also sign (batch authorise, manual adjustments). */
  orExec?: boolean;
  /** Copy key in financeCommon(locale).chain. */
  reason: string;
  signedBy?: UserRef;
  at?: string;
};

export type PaymentEvent = { at: string; kind: string; source: "client" | "webhook" | "poll" | "finance" | "system"; by?: UserRef; note?: string };

export type Quote = {
  no: string; caseRef: string; clientId: string; orgTin?: string; version: number; status: QuoteStatus;
  lines: DocLine[]; totals: DocTotals; depositPct: Bps | null; validUntil: string; lang: Locale;
  preparedBy: UserRef; approvedBy?: UserRef; sentAt?: string; respondedAt?: string; responseNote?: string; rev: number;
};
export type Invoice = {
  no: string | null; series: Series; caseRef?: string; subscriptionId?: string; clientId: string;
  billTo: { name: string; tin?: string; address?: string; email?: string }; status: InvoiceStatus; overdue: boolean;
  lines: DocLine[]; totals: DocTotals; amountPaid: Rwf; amountCredited: Rwf; balanceDue: Rwf; issuedAt?: string;
  dueAt?: string; ebmReceiptNo?: string; voidReason?: string; currency: string; fx?: { rate: number; at: string }; rev: number;
};
export type Payment = {
  id: string; invoiceNo: string; caseRef?: string; clientId: string; method: Method; state: PaymentState;
  amountExpected: Rwf; amountReceived?: Rwf; providerFee?: Rwf; providerRef?: string; bankReference?: string;
  proofDocId?: string; chain?: Step[]; makerId?: string; events: PaymentEvent[]; verify?: { nextAt: string; cadence: "5m" | "1h" };
  lockedBy?: UserRef; reconciliationId?: string; receiptNo?: string; at: string;
  /** Confirmed while the invoice was already paid (recon case 6). */
  duplicate?: boolean; rev: number;
};
export type StatementImport = {
  id: string; provider: Provider; from: string; to: string; rows: number; fileHash: string;
  importedBy: UserRef; counts: Record<MatchState, number>;
};
export type StatementLine = {
  id: string; importId: string; externalRef: string; amount: Rwf; fee: Rwf; occurredAt: string;
  match: MatchState; paymentId?: string; suggestionId?: string; reason?: string;
};
export type PeriodLock = { provider: Provider; day: string; state: "open" | "closed" | "reopened"; by?: UserRef; reason?: string };
export type RefundRequest = {
  no: string; caseRef: string; invoiceNo: string; paymentId?: string; reason: RefundReason; stage: string;
  requested: Rwf; recommended?: Rwf; approved?: Rwf; method: RefundMethod; destination?: { masked: string; changed: boolean };
  status: RefundStatus; chain: Step[]; requestedBy: UserRef; executedBy?: UserRef; providerRef?: string; creditNoteNo?: string;
  impact: { workerId: string; allocated: Rwf; reversal: Rwf; paidOut: boolean }[]; auto?: "duplicate" | "cancelled"; at: string; rev: number;
};
export type CreditNote = {
  no: string; invoiceNo: string; refundNo?: string; lines: DocLine[]; totals: DocTotals; eligible: Rwf; ebmRef?: string;
  issuedBy: UserRef; issuedAt: string;
};
export type RuleScope = "global" | "service" | "agent" | "agent_service" | "contract";
export type Rule = {
  id: string; scope: RuleScope; serviceSlug?: string; agentId?: string; contractId?: string;
  agentPct: Bps; appliesTo: "one_off" | "subscription" | "both";
  /** Inclusive YYYY-MM-DD bounds. */
  from: string; to?: string; status: "active" | "scheduled" | "pending_approval" | "ended"; approvedBy?: UserRef; note?: string;
};
export type Share = { workerId: string; kind: "internal" | "external" | "field"; pct: Bps; amount: Rwf };
export type Allocation = {
  id: string; caseRef: string; invoiceNos: string[]; eligible: Rwf; deductions: { kind: string; amount: Rwf; note: string }[];
  netBase: Rwf; ruleId: string; agentPct: Bps; pool: Rwf; hebuza: Rwf; shares: Share[];
  status: AllocationStatus; reviewedBy?: UserRef; approvedBy?: UserRef; batchNo?: string; frozenAt: string;
  question?: { id: string; status: "open" | "answered"; text: string };
};
export type Adjustment = {
  id: string; workerId: string; allocationId?: string; refundNo?: string; amount: Rwf; reason: AdjReason; note: string;
  status: AdjStatus; approvedBy?: UserRef;
};
export type AgentFee = { id: string; workerId: string; kind: "licensing" | "platform" | "other"; amount: Rwf; month: string; status: "due" | "netted" | "invoiced" | "waived" };
export type ExportFile = { kind: "bank" | "momo" | "wht" | "summary"; name: string; checksum: string; at: string };
export type PayoutLine = {
  id: string; workerId: string; gross: Rwf; adjustments: Rwf; fees: Rwf; wht: Rwf; net: Rwf; carryForward: Rwf;
  method: "mtn_momo" | "airtel_money" | "bank"; destination: { masked: string; verified: boolean; coolingUntil?: string };
  status: "pending" | "paid" | "failed" | "excluded"; providerRef?: string; proofDocId?: string;
};
export type PayoutBatch = {
  no: string; period: string; status: BatchStatus; preparedBy: UserRef; authorisedBy?: UserRef;
  totals: { gross: Rwf; adjustments: Rwf; fees: Rwf; wht: Rwf; net: Rwf; carried: Rwf }; lines: PayoutLine[]; exports: ExportFile[];
};
export type FinanceSettingKey =
  | "vat_registered" | "vat_bps" | "hebuza_tin" | "invoice_terms_days" | "quote_validity_days" | "deposit_threshold"
  | "deposit_bps" | "manual_confirm_threshold" | "manual_confirm_exec" | "refund_exec_limit" | "wht_bps" | "payout_day"
  | "quote_approval_threshold" | "licence_fee_monthly";
export type SettingRow = { key: FinanceSettingKey; value: unknown; effectiveFrom: string; status: "active" | "scheduled" | "pending_approval"; enforcedBy: string; changedAt?: string };
export type SettingChange = {
  id: string; key: FinanceSettingKey; old: unknown; next: unknown; effectiveAt: string;
  status: "proposed" | "approved" | "applied" | "rejected" | "withdrawn"; proposedBy: UserRef; approvedBy?: UserRef; reason: string;
};
export type ReportResult<R> = {
  meta: {
    period: { from: string; to: string }; tz: "Africa/Kigali"; filters: Record<string, string>;
    definitions: { key: string; text: I18nText }[]; generatedAt: string; freshness: string;
  };
  rows: R[]; totals: Partial<R>;
};
export type ExportJob = { id: string; status: "queued" | "running" | "ready" | "failed" | "expired"; format: string; rowCount?: number; url?: string; expiresAt?: string };

// ---- core read models (handlers-finance.ts)
export type ApprovalType = "manual_payment" | "refund" | "allocation" | "batch" | "setting" | "rule";
export type ApprovalItem = {
  id: string; type: ApprovalType; record: string; href: string; maker: UserRef; amount: Rwf | null; reason: string;
  at: string; slaAt?: string;
  /** "sign" = I can sign the next step; "waiting" = I'm the maker/previous signer; "blocked" = not my role. */
  mine: "sign" | "waiting" | "blocked";
};
export type FinSummary = {
  me: UserRef & { roles: string[]; executiveOnly: boolean };
  badges: { approvals: number; proofs: number; unmatched: number; refunds: number };
  needsYou: { key: "proofs" | "approvals" | "unmatched" | "refunds" | "allocations"; n: number; href: string }[];
};
export type FinNote = { id: string; kind: "proof" | "approval" | "recon" | "refund" | "batch" | "setting"; text: string; ref?: string; href: string; at: string; read: boolean };
