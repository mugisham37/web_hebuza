// Mirror of server/src/domain/booking/types.ts — UI display only; the server enforces.
// Stage 11 contracts (plan 11 §9.1): consultation booking (BKG) + AI assistant (AIA) + KB. Times are UTC ISO.
import type { Locale } from "@/shared/i18n/config";

export type Mode = "office" | "video" | "phone" | "premises";
export type BookingStatus = "held" | "pending_payment" | "confirmed" | "rescheduled" | "cancelled_by_client" | "cancelled_by_staff" | "completed" | "no_show" | "expired";
export type BookingBlock = "past_cutoff" | "reschedule_limit" | "terminal" | "not_owner" | "reason_required" | "too_early_outcome";
export type JoinState = "locked" | "open" | "ended";

export type IntakeQuestion = { id: string; type: "text" | "select" | "radio" | "checkbox"; label: Record<Locale, string>; options?: string[]; required: boolean };

export type ConsultationType = {
  id: string; slug: string; name: Record<Locale, string>; description: Record<Locale, string>;
  durationMin: 15 | 30 | 45 | 60; modes: Mode[]; price: number; currency: "RWF";
  bufferBeforeMin: number; bufferAfterMin: number; minNoticeMin: number; horizonDays: number; maxPerDay: number;
  familySlugs: string[]; serviceSlugs: string[]; adviserIds: string[]; intakeSchema: IntakeQuestion[];
  prepare: Record<Locale, string[]>; freeOncePerFamily: boolean; isActive: boolean; version: number;
  /** Per-contact flag after 2 no-shows (F-BKG-12); only set when the list is asked with a contact. */
  requiresPrepayment?: boolean;
};

export type Slot = { startsAt: string; endsAt: string; adviserIds: string[] };
export type SlotsResponse = { tz: string; slots: Slot[]; nextAvailable: string | null; waitlist: boolean };
export type Hold = { bookingId: string; holdExpiresAt: string; adviserId: string; startsAt: string; endsAt: string; typeSlug: string };
export type Adviser = { id: string; name: string; photo?: string; title?: string };

export type ReminderKind = "confirmation" | "24h" | "1h" | "adviser_15m";
export type ReminderEntry = { kind: ReminderKind; at: string; channel: "whatsapp" | "sms" | "email"; status: "planned" | "queued" | "deferred" | "sent" | "skipped" };
export type BookingEvent = { at: string; kind: "booked" | "confirmed" | "paid" | "rescheduled" | "cancelled" | "reminder" | "completed" | "no_show" | "reassigned" | "expired"; note?: string };

export type Booking = {
  id: string; reference: string; typeSlug: string; typeName: Record<Locale, string>; price: number;
  adviser: Adviser | null; clientId: string | null; leadId: string | null;
  contact: { name: string; phoneMasked?: string; emailMasked?: string };
  language: Locale; startsAt: string; endsAt: string; mode: Mode; location: string | null; status: BookingStatus;
  intakeAnswers: Record<string, unknown>; familySlug: string | null; serviceSlug: string | null;
  invoiceRef: string | null; holdExpiresAt: string | null; paid: boolean;
  rescheduleCount: number; rescheduledFromId: string | null; rescheduledToRef: string | null;
  cancelReason: string | null; cancelledBy: "client" | "staff" | null; clientSummary: string | null;
  recommendedServiceSlugs: string[]; startLinks: { slug: string; name: string; href: string }[]; quoteRef: string | null;
  reminders: ReminderEntry[]; events: BookingEvent[]; version: number; noShowCount: number;
  can: { reschedule: boolean; cancel: boolean; join: JoinState; reason?: BookingBlock };
  refund?: { ref: string; amount: number; kind: "refund" | "credit" } | null;
  prepare: string[];
};
export type StaffBooking = Booking & {
  outcomeNotes: string | null; contactFull: { name: string; phone?: string; email?: string };
  source: "web" | "assistant" | "staff" | "campaign"; quoteRequest: { lines: { label: string; qty: number; unit: number }[]; status: "waiting" | "sent" } | null;
};

export type AvailabilityRule = { weekday: number; start: string; end: string };
export type AvailabilityOverride = { id: string; date: string; kind: "extra" | "blocked"; start?: string; end?: string; note?: string };
export type Availability = { adviserId: string; rules: AvailabilityRule[]; overrides: AvailabilityOverride[]; leave: { from: string; to: string; label: string }[]; version: number };

export type CallbackRequest = {
  id: string; name: string; phoneMasked: string; phone: string; email?: string; topic: string; preferredTimes: string[];
  language: Locale; status: "new" | "scheduled" | "closed"; createdAt: string; bookingRef?: string; closeReason?: string;
};
export type AdminAdviser = { id: string; name: string; onLeave: boolean; deactivated: boolean; load: number };
export type AdminBookings = { bookings: StaffBooking[]; advisers: AdminAdviser[]; alerts: { adviserId: string; name: string; count: number; why: "leave" | "deactivated" }[] };
export type BookingAnalytics = {
  funnel: { label: string; value: number }[]; showUp: number; noShow: number; leadTimeDays: number; utilisation: number;
  freeToPaid: number; revenue: number; byType: { label: string; value: number }[]; byAdviser: { label: string; value: number }[]; bySource: { label: string; value: number }[];
};

// ---------------------------------------------------------------- Assistant (AIA)
export type FeeInfo = { min: number; max: number | null; asOf: string; indicative: true };
export type HandoffReason = "user_request" | "risk_topic" | "low_confidence" | "clarification_failed" | "money_owed" | "minor" | "budget";
export type HandoffData = {
  conversationId: string | null; ticketRef: string | null; reasonCode: HandoffReason; inHours: boolean; promise: string | null;
  nextOpenAt: string | null; whatsapp: string; callbackHref: string; bookHref: string;
};
export type ToolCard =
  | { kind: "service"; slug: string; name: string; summary: string; fee: FeeInfo | null; turnaround: string | null; applyHref: string; bookHref: string }
  | { kind: "requirements"; slug: string; name: string; items: { label: string; required: boolean }[]; serviceHref: string }
  | { kind: "fee"; slug: string; name: string; fee: FeeInfo }
  | { kind: "slots"; typeSlug: string; typeName: string; slots: Slot[]; moreHref: string }
  | { kind: "intake_question"; toolCallId: string; field: { id: string; label: string; type: "choice" | "text" | "number" | "date"; options?: string[]; required: boolean; help?: string }; step: number; total: number }
  | { kind: "secure_upload"; draftId: string | null; href: string }
  | { kind: "draft"; draftId: string; serviceSlug: string; serviceName: string; answeredCount: number; missingDocs: string[]; expiresAt: string; reviewHref: string; docsHref: string; expired?: boolean }
  | { kind: "case_status"; cases: { ref: string; service: string; status: string; nextStep: string; href: string }[] }
  | { kind: "case_not_found" }
  | { kind: "sign_in_to_track" }
  | { kind: "lead_form"; toolCallId: string; topic: string }
  | { kind: "handoff"; data: HandoffData };
export type Citation = { id: string; title: string; url: string; updatedAt: string; sourceLang: Locale };
export type NoticeKind = "guardrail_advice" | "guardrail_guarantee" | "off_topic" | "pii_masked" | "no_source" | "source_in_english";
export type AiErrorType = "budget_stopped" | "rate_limited" | "ai_disabled" | "session_blocked" | "session_closed" | "stream_in_progress" | "server_error";
export type StreamEvent =
  | { event: "meta"; data: { messageId: string; lang: Locale } }
  | { event: "delta"; data: { text: string } }
  | { event: "citation"; data: Citation }
  | { event: "tool_card"; data: ToolCard }
  | { event: "notice"; data: { kind: NoticeKind } }
  | { event: "handoff"; data: HandoffData }
  | { event: "done"; data: { outcome: string; maskedUserText?: string } }
  | { event: "error"; data: { errorType: AiErrorType; message?: string } };

export type AssistantStatus = {
  enabled: boolean; budgetState: "ok" | "warn" | "stopped";
  officeHours: { open: boolean; nextOpenAt: string | null; promise: string }; dailyRemaining: number | null; resetAt: string | null;
};
export type AssistantMode = "ready" | "streaming" | "awaiting_tool_input" | "handed_off" | "busy" | "off" | "rate_limited" | "offline" | "error" | "blocked" | "idle_closed";

export type ChatMessage = {
  id: string; role: "user" | "assistant"; text: string; citations: Citation[]; cards: ToolCard[]; notices: NoticeKind[];
  state: "streaming" | "done" | "stopped" | "error"; rating?: 1 | -1; messageId?: string; lang?: Locale;
};
export type SessionSummary = { id: string; startedAt: string; title: string; outcome: string };

// ---------------------------------------------------------------- Staff AI
export type KbStatus = "draft" | "approved_for_ai" | "indexed" | "stale" | "withdrawn" | "changes_requested";
export type KbSource = {
  id: string; title: string; kind: "guide" | "faq" | "catalogue" | "policy" | "consultation_type"; locale: Locale; status: KbStatus;
  owner: string; factsBy: string | null; toneBy: string | null; reviewBy: string; lastIndexedAt: string | null; updatedAt: string; version: number;
  body: string; previous: string | null; flags: { text: string; why: "guarantee" | "unsourced_fee" | "outdated" }[]; comment?: string; cms?: boolean;
};
export type AiSessionRow = {
  id: string; startedAt: string; lang: Locale; outcome: "answered" | "handed_off" | "no_source" | "abandoned" | "blocked";
  rating: 1 | -1 | null; handoff: boolean; turns: number; context: "public" | "portal"; title: string;
};
export type AiTranscript = AiSessionRow & {
  meta: { model: string; tokensIn: number; tokensOut: number; costUsd: number; latencyMs: number };
  messages: { role: "user" | "assistant" | "tool"; text: string; sources?: string[]; flags?: string[] }[];
};
export type EvalRun = { id: string; at: string; trigger: string; passed: number; total: number; prohibited: number; deployBlocked: boolean };
export type AiSettings = { enabled: boolean; monthlyBudget: { amount: number; currency: "USD" }; spent: number; perIpDaily: number; retentionMonths: number; officeHours: string; version: number };
export type Cluster = { id: string; label: string; count: number; sample: string[]; lang: Locale };
export type CopilotResult = { text: string; items?: { label: string; ok: boolean }[]; generatedAt: string; sources?: string[] };
export type HandoffItem = { id: string; conversationId: string; at: string; reason: HandoffReason; lang: Locale; summary: string; sessionId: string; claimedBy: string | null; who: string };
