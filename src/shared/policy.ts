// Mirror of server/src/domain/policy.ts — UI display only; the server enforces.
// Every business value the app uses, in one place (master roadmap X-8). Server-tunable ones are mirrored in the settings registry (src/lib/system/settings-registry.ts). Spec values cite their source;
// anything the spec does not fix is PLACEHOLDER(id) — `grep -rn PLACEHOLDER src` lists them all.
export const POLICY = {
  vatBps: 1800, // spec: VAT 18%
  whtBps: 1500, // spec: WHT 15% on external agent payouts
  /** X-2: licence fee is monthly, external agents only, taken at payout after WHT. PLACEHOLDER(licence-fee-amount) */
  licenceFeeMonthly: 500,
  /** X-3: refunds above this need an executive. spec/05 refunds */
  refundExecLimit: 200_000,
  /** X-4: manual payment confirmation thresholds */
  manualConfirmSecondFinance: 500_000,
  manualConfirmExec: 1_000_000,
  /** X-7: step-up verification window, spec/02 */
  stepUpMs: 5 * 60_000,
  /** F-IAM-11: idle timeout per role group (settings-registry security.idle_minutes.* defaults), warn 2 min before. */
  idleMsClient: 60 * 60_000,
  idleMsStaff: 30 * 60_000,
  sessionWarnMs: 2 * 60_000,
  /** D-A3: PLACEHOLDER(momo-prompt-ttl) USSD prompt countdown; PLACEHOLDER(payment-intent-ttl) */
  momoPromptMs: 2 * 60_000,
  paymentIntentMs: 60 * 60_000,
  /** PLACEHOLDER(consultation-price) */
  consultationPrice: 20_000,
  /** Payment tolerance: greater of 2% or RWF 5,000 (procurement plan §14). */
  toleranceBps: 200,
  toleranceMin: 5_000,
  /** Agent daily case cap upper bound. PLACEHOLDER(daily-cap-max) */
  capMax: 20,
  /** Offer acceptance window before it returns to the ops queue. PLACEHOLDER(offer-ttl) */
  offerTtlMs: 4 * 3600_000,
  // ---- Stage 5 finance (plan 05 §2, §14). Rates in basis points.
  /** D-08 / Q-FIN-03: quotes at or above this need a deposit of depositBps. */
  depositThreshold: 200_000,
  depositBps: 5000,
  /** D-18 PLACEHOLDER(quote-approval-threshold): SM quotes above this need finance approval. */
  quoteApprovalThreshold: 500_000,
  /** PLACEHOLDER(quote-validity-days) */
  quoteValidityDays: 14,
  /** PLACEHOLDER(invoice-terms-days) */
  invoiceTermsDays: 7,
  /** F-REV-01 default agent share. */
  defaultAgentBps: 3000,
  /** D-12 payout on this day of the month. */
  payoutDay: 5,
  /** D-19 no executive step on payout batches unless set. */
  payoutExecThreshold: null as number | null,
  /** X-4: a manual confirmation waiting this long returns to the queue. */
  manualReturnMs: 72 * 3600_000,
  /** D-14 payout destination change cooling. */
  destinationCoolingMs: 48 * 3600_000,
  /** PLACEHOLDER(reminder-offsets) days relative to due date. */
  reminderOffsets: [-2, 0, 3, 7, 14],
  // ---- F-CAL-01 compliance rules (spec 05-modules/deadlines-and-compliance-calendar §12).
  /** spec §12 default reminder offsets (days before due). */
  complianceOffsets: [-10, -3, -1, 0] as readonly number[],
  /** Server DeadlineRuleIn default lead days. */
  complianceLeadDays: 14,
  /** PLACEHOLDER(rdb-annual-return-date) spec §12 says "per RDB rule"; month/day unknown. */
  rdbAnnualReturn: { month: 4, day: 30 },
  /** PLACEHOLDER(refund-policy) max refundable share of the eligible fee by case stage (bps). */
  refundPolicyBps: { before_work: 10_000, in_progress: 5000, submitted: 2500, completed: 0 } as Record<string, number>,
  // ---- Stage 6 system admin (plan 06 §14.2).
  /** D-3 PLACEHOLDER(approval-expiry) two-person requests expire after this. */
  changeTtlMs: 48 * 3600_000,
  /** F-IAM-14 invitation lifetime (spec). */
  inviteTtlMs: 72 * 3600_000,
  /** PLACEHOLDER(inactive-days) access-review risk flag. */
  inactiveDays: 60,
  /** D-11 PLACEHOLDER(impersonation-minutes) */
  impersonationMinutes: [15, 30] as readonly number[],
  /** PLACEHOLDER(break-glass-durations) max 4 h. */
  breakGlassMinutes: [60, 120, 240] as readonly number[],
  /** PLACEHOLDER(sod-waiver-max) */
  waiverMaxDays: 365,
  // ---- Stage 8 external agents (plan 08 §14.2). Spec gives no value for these → PLACEHOLDER(id).
  /** PLACEHOLDER(business-hours) offer TTL counts Mon–Fri 08:00–17:00 Africa/Kigali (lib/work/limits). */
  businessHours: [8, 17] as readonly [number, number],
  /** PLACEHOLDER(application-review-days) "We'll review within N working days". */
  applicationReviewDays: 5,
  /** PLACEHOLDER(rejected-application-retention-months) spec: "per retention policy". */
  rejectedRetentionMonths: 12,
  /** PLACEHOLDER(allocation-question-days) answer SLA for a questioned allocation. */
  allocationQuestionDays: 2,
  /** PLACEHOLDER(tin-format) TIN digits checked on the payout step. */
  tinDigits: 9,
  /** PLACEHOLDER(qualification-upload-limits) per file MB and max files on /join. */
  qualificationMaxMb: 10,
  qualificationMaxFiles: 5,
  /** DLV-01 deliverable upload limit (spec). */
  deliverableMaxMb: 25,
  /** PLACEHOLDER(training-required) onboarding training item off by default. */
  trainingRequired: false,
  /** PLACEHOLDER(contract-notice-days) notice period when the worker gives notice. */
  contractNoticeDays: 30,
  /** PLACEHOLDER(application-ref-format) APP-YYYY-NNNN; PLACEHOLDER(statement-ref-format) ST-YYYY-MM-XXX. */
  applicationRefPrefix: "APP",
} as const;
export type Policy = typeof POLICY;
// ---- Stage 9 field agent (plan 09 §2.2, §14). Spec values cite their source.
export const FIELD_POLICY = {
  /** BUILD-PLAN / Q-OPS-09 check-in radius (D-1; workforce §12 says 500 m). */
  radiusM: 300,
  /** PLACEHOLDER(field-low-accuracy-m) */
  lowAccuracyM: 100,
  /** spec F-WRK-20: offline reference cache wiped after 72 h. */
  cacheTtlMs: 72 * 3600_000,
  /** spec F-WRK-21: unconfirmed cash escalates after 48 h. */
  cashEscalationMs: 48 * 3600_000,
  /** PLACEHOLDER(field-per-visit-fee) flat fee per completed visit (Q-REV-03). */
  perVisitFee: 5_000,
  /** PLACEHOLDER(field-moto-cap) per trip; over-cap is flagged, never blocked. */
  motoCap: 5_000,
  /** PLACEHOLDER(field-travel-kmh) straight-line travel estimate. */
  travelKmh: 20,
  /** PLACEHOLDER(momo-min-partial) */
  momoMinPartial: 100,
  /** spec F-REV-05 worked example: field share of a case pool. */
  fieldShareBps: 3000,
  /** PLACEHOLDER(field-expense-categories) D-18 */
  expenseCategories: ["moto", "transport", "stationery", "meal", "other"] as const,
} as const;
// ---- Stage 12 procurement (plan 12 §2.3, §14.2). Spec values cite their source.
export const PROC_POLICY = {
  /** R-1 spec module §12: finance approves ≤ this, executive above. */
  financeMax: 1_000_000,
  /** R-2 spec module §12: above this a PR needs quotesRequired quotes. */
  quoteThreshold: 500_000,
  quotesRequired: 3,
  /** R-3 spec: 2 % or RWF 5,000, read as the greater (D-05). */
  tolerancePct: 2,
  toleranceMin: 5_000,
  /** R-7 spec 02 §4.3: payments locked 24 h after a bank-detail change. */
  lockHours: 24,
  /** R-9 D-04 union of module −90/−60/−30 and journey −7. */
  reminderOffsets: [90, 60, 30, 7] as readonly number[],
  /** R-10 spec worked example: deposit return due end + 30 d. */
  depositReturnDays: 30,
  /** PLACEHOLDER(budget-warn-pct) R-8 meter warning. */
  budgetWarnPct: 85,
  /** PLACEHOLDER(vat-rounding-tolerance) R-4 per-line VAT difference allowed (RWF). */
  vatRoundingTolerance: 1,
  /** PLACEHOLDER(grn-age-badge) received-not-invoiced age thresholds (days). */
  ageBadge: [3, 7] as readonly [number, number],
  /** PLACEHOLDER(bank-remask-seconds) */
  remaskSeconds: 30,
  /** PLACEHOLDER(bill-due-soon-days) R-15 module §10 says T−5. */
  dueSoonDays: 5,
  /** PLACEHOLDER(proc-numbering) R-17 D-08: only V-/PO- are in the spec. */
  prefixes: { pr: "PR", po: "PO", grn: "GRN", bill: "BL", payment: "VP", remittance: "RA", contract: "CT", deposit: "DP", advance: "ADV" },
  /** PLACEHOLDER(justification-min) PR justification length. */
  justificationMin: 10,
  /** PLACEHOLDER(quote-file-mb) */
  quoteMaxMb: 10,
} as const;
// ---- Stage 10 marketing (plan 10 §2.5, §14.2). Spec values cite their source; the rest are PLACEHOLDER(id).
export const MKT_POLICY = {
  /** PLACEHOLDER(wa-marketing-unit-cost) RWF per WhatsApp marketing message. */
  unitCost: { whatsapp: 45, sms: 15, email: 0 } as Record<"whatsapp" | "sms" | "email", number>, // PLACEHOLDER(sms-unit-cost) per segment
  /** PLACEHOLDER(marketing-budget-cap) monthly RWF cap on marketing sends (board). Alert at 80 %, pause at 100 % (NTF spec). */
  budgetCap: 60_000,
  budgetWarnPct: 80,
  /** spec CRM: more than this many recipients needs a second approver. */
  approvalRecipients: 500,
  /** PLACEHOLDER(campaign-approval-cost) estimate above this needs approval too (D-03). */
  approvalCost: 50_000,
  /** spec NTF: 21:00–07:00 Africa/Kigali (D-15). */
  quietHours: [21, 7] as readonly [number, number],
  /** spec NTF: marketing messages per person per week, across channels. */
  frequencyCap: 2,
  /** PLACEHOLDER(send-throttle) messages per minute. */
  throttle: 60,
  /** PLACEHOLDER(min-schedule-lead-minutes) */
  minScheduleMinutes: 5,
  /** PLACEHOLDER(ab-winner-hours) */
  abWinnerHours: 4,
  /** PLACEHOLDER(failure-threshold) provider error rate over a 100-message window. */
  failurePct: 20,
  /** PLACEHOLDER(attribution-window-days) */
  attributionDays: 90,
  /** spec CRM-14 / D-09: inactive after N days, configurable. */
  inactiveDays: 90,
  /** PLACEHOLDER(referral-reward) RWF credit after the referee's first paid request. */
  referralReward: 5_000,
  /** PLACEHOLDER(nps-min-sample) */
  npsMinSample: 30,
  /** BUILD-PLAN "≥ 30 guides" (setting cms.guide_target). */
  guideTarget: 30,
  /** spec CMS-06: upload limits. */
  maxImageMb: 5,
  maxPdfMb: 20,
  /** spec CMS-17: preview links expire after 24 h. */
  previewTtlMs: 24 * 3600_000,
  /** spec CMS-10: review_by at most 12 months ahead. */
  reviewByMaxMonths: 12,
  /** spec Q-PRV-03: leads without activity are deleted after this many months. */
  leadRetentionMonths: 24,
  /** spec CRM-04: attribution cookie lifetime (only after analytics consent). */
  attributionCookieDays: 90,
  /** spec/06 accessibility: statement reply time. PLACEHOLDER(a11y-response-days) */
  a11yResponseDays: 5,
  /** PLACEHOLDER(a11y-contact) no dedicated accessibility inbox is known; general CONTACT is shown. PLACEHOLDER(a11y-reviewed-date) */
  a11yReviewed: "2026-11-15",
} as const;
