// Mirror of server/src/domain/procurement/types.ts — UI display only; the server enforces.
// Stage 12 procurement domain types (plan 12 §9.1). Integers are RWF. Mirrored by src/mocks/procurement-world.ts.
import type { UserRef } from "@/shared/finance/types";
export type { UserRef };

export type FileRef = { id: string; name: string; size?: number; expiresOn?: string; key?: string };
export type VendorType = "landlord" | "supplier" | "service_provider" | "government_body";
export type VendorStatus = "active" | "inactive" | "blocked";
export type BankKind = "bank" | "momo" | "airtel";
export type Contact = { name: string; role?: string; phone?: string; email?: string };
export type Vendor = {
  id: string; code: string; type: VendorType; legalName: string; tradingName?: string; tinMasked: string; rdbNumber?: string;
  categories: string[]; contacts: Contact[]; address?: string; paymentTermsDays: number;
  bank?: { kind: BankKind; label: string; masked: string }; bankStatus: "verified" | "unverified"; lockUntil?: string;
  status: VendorStatus; blockReason?: string; rating?: number; balance: number; openBills: number; lastPaymentAt?: string;
  documents: FileRef[]; vatRegistered: boolean; version: number;
};
export type Reminder = { offset: number; on: string; channel: "in_app" | "email"; sentAt?: string; key: string };
export type ContractKind = "lease" | "service" | "supply" | "other";
export type Frequency = "one_off" | "monthly" | "quarterly" | "annual";
export type ContractStatus = "draft" | "active" | "expiring" | "renewed" | "terminated" | "expired";
export type Contract = {
  id: string; ref: string; vendorId: string; kind: ContractKind; title: string; startOn: string; endOn: string; amount: number;
  frequency: Frequency; dueDay?: number; escalationPercent: number; noticeDays: number; autoRenew: boolean; depositAmount?: number;
  depositNo?: string; budgetCategory: string; status: ContractStatus; ownerId: string; reminders: Reminder[]; versionOf?: string;
  renewal?: { amount: number; endOn: string; noticeDays: number; reason: string; status: "requested" | "approved" | "rejected"; by: string; at: string; decidedBy?: string };
  termination?: { effectiveOn: string; checklist: string[]; at: string };
  snoozedUntil?: Record<string, string>; documents: FileRef[]; version: number;
};
export type Line = { id: string; description: string; qty: number; unitPrice: number; vatable: boolean; net: number; vat: number; total: number };
export type RouteReason = "over_limit" | "over_budget" | "quotes_waived" | "no_po";
export type Route = "finance" | "executive";
export type Decision = {
  step: "approve" | "authorise" | "exception" | "override" | "request_info" | "resubmit" | "submit";
  by: UserRef; at: string; outcome: "approved" | "rejected" | "info_requested" | "done"; reason?: string;
};
export type PrStatus = "draft" | "submitted" | "info_requested" | "approved" | "rejected" | "withdrawn" | "ordered";
export type Quote = FileRef & { vendorName: string; amount: number };
export type PurchaseRequest = {
  id: string; no: string; title: string; requester: UserRef; requesterWorkspace: string; vendorId?: string; vendorFreeText?: string;
  lines: Line[]; estimatedTotal: number; budgetCategory: string; neededBy: string; justification: string; quotes: Quote[];
  chosenQuoteId?: string; chosenReason?: string; status: PrStatus; route: Route; routeReasons: RouteReason[];
  decisions: Decision[]; poNo?: string; createdAt: string; submittedAt?: string; version: number;
};
export type PoStatus = "issued" | "partially_received" | "received" | "closed" | "cancelled";
export type PoLine = Line & { received: number };
export type PurchaseOrder = {
  id: string; no: string; prNo: string; vendorId: string; lines: PoLine[]; subtotal: number; vat: number; total: number;
  status: PoStatus; deliveryAddress: string; paymentTermsDays: number; neededBy: string; sentAt?: string; sentTo?: string;
  issuedBy: UserRef; issuedAt: string; closeReason?: string; version: number; pdfKey?: string;
};
export type Condition = "good" | "damaged" | "rejected";
export type GoodsReceipt = {
  id: string; no: string; poNo: string; lines: { lineId: string; qty: number; condition: Condition; note?: string }[];
  receivedBy: UserRef; receivedAt: string; evidence?: FileRef; notes?: string; reverses?: string; service: boolean; invoiced: boolean;
};
export type MatchResult = "matched" | "tolerance" | "exception";
export type MatchLine = {
  lineId: string; description: string; ordered: number; received: number; billed: number; poNet: number; billNet: number;
  delta: number; threshold: number; result: MatchResult; reason?: "qty" | "amount" | "vat";
};
export type BillStatus = "draft" | "submitted" | "matched" | "match_exception" | "approved" | "authorised" | "partially_paid" | "paid" | "disputed" | "void";
export type Bill = {
  id: string; no: string; vendorId: string; vendorInvoiceNo: string; invoiceDate: string; dueOn: string; poNo?: string; contractRef?: string;
  noPoJustification?: string; vatMode: "excl" | "incl"; lines: Line[]; subtotal: number; vat: number; total: number;
  appliedAdvances: { advanceNo: string; amount: number }[]; payable: number; amountPaid: number; status: BillStatus;
  disputedFrom?: BillStatus; disputeReason?: string; voidReason?: string; budgetCategory: string;
  match?: { result: "matched" | "match_exception" | "no_po" | "contract"; lines: MatchLine[]; exceptionApproved?: boolean; exceptionRequested?: boolean };
  preparedBy?: UserRef; preparedAt?: string; approvedBy?: UserRef; approvedAt?: string; authorisedBy?: UserRef; authorisedAt?: string;
  route: Route; routeReasons: RouteReason[]; override?: { by: UserRef; reason: string }; file?: FileRef; createdAt: string; version: number;
};
export type PayMethod = "bank" | "mtn_momo" | "airtel_money";
export type VendorPayment = {
  id: string; no: string; vendorId: string; allocations: { billNo: string; amount: number }[]; amount: number; method: PayMethod;
  reference: string; proof: FileRef; paidBy: UserRef; paidAt: string;
  remittance: { no: string; status: "draft" | "sent" | "failed"; sentAt?: string; to?: string };
};
export type AdvanceKind = "advance" | "prepayment" | "deposit" | "refund" | "credit_note";
export type AdvanceStatus =
  | "pending_payment" | "paid_out" | "held" | "return_due" | "returned" | "partially_returned" | "forfeited" | "active" | "offset" | "received";
export type Advance = {
  id: string; no: string; vendorId: string; kind: AdvanceKind; amount: number; remaining: number; contractRef?: string; paidOn?: string;
  returnDueOn?: string; status: AdvanceStatus; deductions?: { reason: string; amount: number }[]; returned?: number; note?: string;
  forfeit?: { reason: string; status: "requested" | "approved" | "rejected"; by: string };
};
export type CallbackLog = { calledNumber: string; holderConfirmed: boolean; last4Confirmed: boolean; answeredBy: string };
export type BankChange = {
  id: string; vendorId: string; requestedBy: UserRef; requestedAt: string; newKind: BankKind; newLabel: string; newMasked: string;
  oldMasked?: string; callbackNumber?: string; reason: string; status: "requested" | "verified" | "rejected";
  verifiedBy?: UserRef; verifiedAt?: string; callback?: CallbackLog; doc?: FileRef;
};
export type BudgetCategory = { code: string; name: string; annualBudget: number; committed: number; actual: number };
export type ApprovalLimits = {
  financeMax: number; quoteThreshold: number; quotesRequired: number; tolerancePct: number; toleranceMin: number; lockHours: number;
  reminderOffsets: number[]; budgetWarnPct: number; depositReturnDays: number; vatRoundingTolerance: number;
};
export type SettingsProposal = {
  id: string; by: UserRef; at: string; effectiveOn: string; reason: string; status: "pending" | "approved" | "rejected";
  limits?: Partial<ApprovalLimits>; budgets?: { code: string; annualBudget: number }[]; decidedBy?: UserRef;
};
export type ProcSettings = { limits: ApprovalLimits; budgets: BudgetCategory[]; proposals: SettingsProposal[] };

/** Unified approval queue item for finance (/finance/payables) and executive (/exec/approvals). */
export type ProcApprovalKind = "pr" | "bill_approve" | "bill_authorise" | "exception" | "renewal" | "settings" | "bank" | "forfeit" | "override";
export type ProcApproval = {
  id: string; kind: ProcApprovalKind; ref: string; title: string; vendorName?: string; amount?: number; reasons: string[];
  maker: UserRef; at: string; href: string; blockedSelf?: boolean; locked?: string;
};
export type AlertKind = "contract_end" | "notice" | "rent_due" | "bill_due" | "bill_overdue" | "deposit_return" | "document" | "bank_change";
export type ProcAlert = { id: string; kind: AlertKind; on: string; title: string; ref: string; href: string; amount?: number; days: number };
export type ProcNote = { id: string; kind: string; text: string; ref?: string; href: string; at: string; read: boolean };
export type ProcSummary = {
  tiles: {
    contracts60: number; contracts90: number; billsDueWeek: number; billsDueWeekCount: number; overdue: number; overdueCount: number;
    notInvoiced: number; depositsOutstanding: number; budgetUsedPct: number;
  };
  banner: { leaseDays?: number; leaseRef?: string; billsDue: number; requests: number };
  balances: { vendorId: string; name: string; balance: number }[];
  obligations: ProcAlert[];
  checklist: { landlord: boolean; lease: boolean; budgets: boolean; limits: boolean };
  badges: { requests: number; bills: number; deposits: number; payables: number; execApprovals: number };
  firstRun: boolean;
};

// ---- workforce (/ops/workforce)
export type WorkerStatus = "invited" | "onboarding" | "cleared" | "suspended" | "terminated";
export type WorkerRow = {
  id: string; name: string; role: string; type: "internal" | "external"; field: boolean; status: WorkerStatus; services: string[];
  expertise: string[]; languages: string[]; districts: string[]; load: { open: number; cap: number }; onTimePct?: number; rating?: number;
  contractEnd?: string; availableFrom?: string; lastLoginAt?: string; email: string;
};
export type WorkerDetail = WorkerRow & {
  privateFields: { address: string; phone: string; nationalId: string };
  kpis: { key: string; value: number; unit: "pct" | "count" | "hours" | "rating" }[];
  cv?: { education: unknown[]; experience: unknown[]; expertise: string[]; years: string; languages: string[]; bio: string };
  contracts?: { id: string; kind: string; title: string; version: number; status: string; start: string; end: string | null; signedAt: string | null }[];
  outcomes?: { completed90d: number; firstPassPct: number | null; reassignmentPct: number | null; revenue90d: number };
  certifications: { name: string; expiresOn?: string }[];
  openCases: { ref: string; title: string; client: string }[];
  pendingOffers: { ref: string; title: string }[];
  documents: FileRef[];
};
export type Review = {
  id: string; workerId: string; period: string; kpis: Record<string, number>; rating: 1 | 2 | 3 | 4 | 5; goals: string; comments: string;
  ackRequired: boolean; status: "draft" | "submitted" | "acknowledged"; by: UserRef; at: string;
};
export type WorkerEvent = { id: string; at: string; kind: string; text: string; actor?: string };
