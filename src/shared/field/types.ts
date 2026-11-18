// Mirror of server/src/domain/field/types.ts — UI display only; the server enforces.
// Stage 9 field domain + API types (plan §9.1). Shared by every field lane and the mocks.
export type L3 = "rw" | "en" | "fr";
export type I18nText = Record<L3, string>;

export type VisitPurpose = "pickup" | "dropoff" | "institution_submission" | "site_visit" | "meeting" | "assisted_application";
export type VisitStatus = "offered" | "scheduled" | "in_progress" | "completed" | "missed" | "cancelled" | "declined";
export type Outcome = "completed" | "partially_done" | "client_absent" | "rescheduled";
export type Flag = "far" | "no_gps" | "low_accuracy" | "gallery_suspect" | "clock_skew" | "over_cap";
export type Fix = { lat: number; lng: number; accuracyM: number; at: string } | null;
export type Evidence = "photo" | "signature" | "otp" | "scan";

export type MinimalContact = { name: string; phone: string; phoneMasked: string; language: L3 };
export type ChecklistEntry = { id: string; label_i18n: I18nText; required: boolean; done: boolean };

export type FieldVisit = {
  id: string; ref: string;
  caseRef: string; serviceId: string; purpose: VisitPurpose; status: VisitStatus; version: number;
  title_i18n: I18nText; todo_i18n: I18nText;
  institution?: string; address: string; lat: number | null; lng: number | null;
  windowStart: string; windowEnd: string; priority: "normal" | "high";
  checklist: ChecklistEntry[];
  evidenceRequired: Evidence[];
  client: MinimalContact;
  checkin?: { at: string; fix: Fix; photoUrl?: string; flags: Flag[]; reason?: string; distanceM?: number | null };
  checkout?: { at: string; fix: Fix; outcome: Outcome; notes?: string; rescheduleTo?: string };
  notes?: string[];
  custodyOpen: number; cashEnabled: boolean;
  offerExpiresAt?: string; cancelledReason?: string;
  /** Set by the server when the office edited the visit after the agent's snapshot (shown as a "Changed" chip). */
  changed?: { field: "time" | "address"; from: string; at: string };
  collectsDocs: boolean;
};

export type ReceiptItem = { label: string; docKind: string; original: boolean; pages: number };
export type SignatureMethod = "drawn" | "typed" | "otp";
export type CustodyReceipt = {
  id: string; ref: string | null; localRef: string; visitId: string; direction: "collected" | "returned";
  items: ReceiptItem[]; clientName: string;
  signature: { method: SignatureMethod; signedAt: string; locale: L3 };
  conditionNotes?: string; pdfUrl?: string; sha256?: string; supersedesId?: string; status: "draft" | "signed" | "synced";
  createdAt: string;
};
export type CustodyStage = "with_agent" | "with_office" | "returned_to_client" | "deposited" | "lost" | "damaged";
export type CustodyEvent = { stage: CustodyStage; at: string; by: string; ref?: string };

export type ExpenseCategory = "moto" | "transport" | "stationery" | "meal" | "other";
export type ExpenseState = "queued" | "submitted" | "sm_approved" | "finance_approved" | "paid" | "rejected" | "withdrawn";
export type TrailStep = { step: "submitted" | "sm" | "finance" | "paid"; by?: string; byId?: string; at?: string; decision?: "approved" | "rejected"; reason?: string };
export type Expense = {
  id: string; ref: string | null; localRef: string; visitId: string | null; visitRef?: string | null; category: ExpenseCategory;
  amount: number; receiptUrl?: string; noReceiptReason?: string; note?: string; state: ExpenseState; flags: Flag[];
  trail: TrailStep[]; payoutBatch?: string; createdAt: string; claimant: string; claimantName: string;
};
export type CashCollection = {
  id: string; visitId: string; visitRef: string; agentName: string; invoiceNo: string; amount: number; provisionalNo: string;
  status: "recorded" | "deposited" | "confirmed" | "disputed"; recordedAt: string; depositRef?: string;
  confirmations: { by: string; at: string }[];
};
export type FieldSettings = {
  fieldCashEnabled: boolean; radiusM: number; lowAccuracyM: number; motoCap: number; perVisitFee: Record<string, number>;
  manualConfirmThreshold: number; momoMinPartial: number; travelKmh: number;
};
export type CaseSummary = { ref: string; service: string; status: string; nextStep: string };
export type PrepareBundle = {
  date: string; preparedAt: string; expiresAt: string; visits: FieldVisit[];
  caseSummaries: CaseSummary[]; settings: FieldSettings; bytesEstimate: number;
};
export type ConflictPayload = { office: Partial<FieldVisit>; mine: Record<string, unknown>; autoMerged: string[]; needsReview: string[] };
export type FieldMe = { id: string; name: string; firstName: string; isFieldAgent: boolean; external: boolean; districts: string[]; manager: string };

export type OpKind = "visit.accept" | "visit.checkin" | "visit.checklist" | "visit.note" | "scan.upload"
  | "receipt.create" | "custody.handover" | "incident.create" | "visit.checkout" | "expense.create"
  | "cash.record" | "cash.deposit";
export type OpState = "queued" | "sending" | "sent" | "failed" | "blocked" | "conflict" | "rejected";
/** Plain header (no PII) — ordering/counting happens without decrypting bodies. */
export type OpHeader = {
  seq: number; opId: string; kind: OpKind; visitId?: string; localRef?: string; dependsOn: string[];
  state: OpState; attempts: number; nextAt: number; createdAt: number; bytes: number; error?: string;
  serverRef?: string; sentAt?: number;
};
/** Op body: request JSON. Files travel inline as data URLs (see sync.ts shortcut). */
export type OpBody = Record<string, unknown>;
export type Op = OpHeader & { body: OpBody };
export type SendResult =
  | { kind: "ok"; serverRef?: string; data?: unknown }
  | { kind: "retry"; error: string; retryAfterMs?: number }
  | { kind: "conflict"; payload: ConflictPayload }
  | { kind: "rejected"; error: string }
  | { kind: "revoked" };
