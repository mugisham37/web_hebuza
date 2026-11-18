// Mirror of server/src/domain/marketing/types.ts — UI display only; the server enforces.
// Stage 10 marketing contract (plan 10 §9.1). Shared by every lane, the MSW world and the server CMS store.
// Edit only by appending; lanes request changes in their hand-back.
export type Locale = "rw" | "en" | "fr";
export const LOCALES: Locale[] = ["rw", "en", "fr"];

// ---------------------------------------------------------------- CMS
export type CmsType = "page" | "landing_page" | "article" | "guide" | "regulatory_update" | "faq" | "team_member" | "testimonial" | "partner_logo" | "legal_doc";
export type CmsStatus = "draft" | "in_review" | "approved" | "scheduled" | "published" | "stale" | "archived";
export type HomeSection = "hero" | "tracker" | "institutions" | "services" | "how" | "pricing" | "guides" | "cta";
export type RichDoc = { type: "doc"; content: RichNode[] };
export type RichNode =
  | { type: "paragraph"; content?: RichInline[] }
  | { type: "bullet_list" | "ordered_list"; items: RichInline[][] };
export type RichInline = { text: string; marks?: ("bold" | "italic")[]; href?: string };

/** Structure lives on the entry; per-locale text lives in the variant `body[blockId]`. */
export type BlockType =
  | "heading" | "rich_text" | "image" | "gallery" | "video" | "callout" | "cta" | "service_cards" | "faq_list" | "steps"
  | "table" | "quote" | "form" | "stats" | "contact" | "divider" | "testimonial" | "requirements" | "tip" | `home.${HomeSection}`;
export type BlockShape = {
  id: string; type: BlockType; hidden?: boolean;
  /** Locale-neutral settings: level, tone, assetId(s), serviceSlugs, faqIds, form kind, href, variant, provider/videoId. */
  props?: Record<string, unknown>;
};
/** Per-locale text of one block. Shape by type: heading/callout/tip/quote → {text, cite?}; rich_text → {doc};
 * cta → {label}; steps → {items:[{title, body?}]}; table → {head, rows}; stats → {items:[{value,label}]};
 * requirements → {items:string[]}; image → {caption?}; video → {title}; home.* → {copy: Record<string,string>}. */
export type BlockText = Record<string, unknown>;

export type SeoFields = {
  title: string; description: string; canonical?: string; ogTitle?: string; ogDescription?: string; ogImageId?: string;
  robots: "index" | "noindex"; jsonLdType?: "Article" | "FAQPage" | "HowTo" | "Service" | "WebPage"; focusKeyword?: string;
};
export type LeadFormConfig = { email: boolean; servicePreselect?: string; consent: ("email" | "whatsapp" | "sms")[]; thankYou: Partial<Record<Locale, string>> };
export type TypeMeta = {
  regulatory?: { authority: string; effectiveAt: string; sourceUrl: string; deadline?: string; affects: string[]; urgency?: "high" | "medium" | "low" };
  landing?: { campaignId?: string; campaignTag?: string; form: LeadFormConfig; price?: number };
  guide?: { readMinutes: number; category: string; image?: string };
  faq?: { category: string };
  team?: { role: string; photo?: string; verified: boolean; links?: string[] };
};
export type CmsVariant = {
  language: Locale; slug: string; title: string; excerpt?: string; body: Record<string, BlockText>; seo: SeoFields;
  status: CmsStatus; version: number; publishedAt?: string; scheduledAt?: string; unpublishAt?: string;
  authorId: string; approvedBy?: string; reviewerId?: string; needsReview?: boolean; fallbackAllowed?: boolean; updatedAt: string; updatedBy: string;
};
export type CmsEntry = {
  id: string; type: CmsType; key: string; ownerId: string; serviceSlugs: string[]; tags: string[];
  aiApproved: boolean; reviewBy?: string; serviceFacts: boolean; blocks: BlockShape[]; meta: TypeMeta;
  variants: Partial<Record<Locale, CmsVariant>>; version: number; createdAt: string; archivedTo?: string;
};
export type CmsVersion = { entryId: string; language: Locale; version: number; at: string; by: string; summary: string; snapshot: { blocks: BlockShape[]; variant: CmsVariant } };
export type CmsComment = { id: string; entryId: string; blockId?: string; language?: Locale; by: string; body: string; at: string; resolved: boolean };
export type Redirect = { id: string; from: string; to: string; code: 301 | 302; hits: number; createdBy: string; createdAt: string };
export type NotFoundHit = { path: string; hits: number; lastAt: string };
export type NavLocation = "header" | "mobile" | "footer";
export type NavNode = { id: string; href: string; label: Partial<Record<Locale, string>>; children?: NavNode[] };
export type SiteSettings = {
  address: string; phone: string; email: string; whatsapp: string; hours: Partial<Record<Locale, string>>;
  social: { network: string; url: string }[];
  announcement?: { text: Partial<Record<Locale, string>>; href?: string; from?: string; to?: string; dismissible: boolean };
};
/** Admin list row (GET /api/admin/cms/entries). */
export type CmsRow = {
  id: string; type: CmsType; key: string; title: string; coverage: Record<Locale, LocaleState>; status: CmsStatus;
  updatedAt: string; updatedBy: string; scheduledAt?: string; aiApproved: boolean; kb: KbState; views?: number; serviceFacts: boolean; slug?: string;
};
export type LocaleState = "ok" | "missing" | "outdated" | "needs_review";
export type KbState = "indexed" | "pending" | "not_approved" | "stale";
export type PublishBlocker = { language: Locale; code: string; field?: string; blockId?: string; severity: "error" | "warning" };

export type MediaAsset = {
  id: string; key: string; mime: string; width?: number; height?: number; bytes: number; url: string; variants: { w: number; url: string }[];
  alt: Partial<Record<Locale, string>>; credit?: string; licence?: string; focal?: { x: number; y: number };
  usage: { entryId: string; title: string }[]; uploadedBy: string; uploadedAt: string;
};

// ---------------------------------------------------------------- CRM
export type Channel = "email" | "whatsapp" | "sms";
export type ConsentState = "in" | "out" | "unknown";
export type Touch = { source: string; medium: string; campaign?: string; term?: string; content?: string; gclid?: string; fbclid?: string; referrer?: string; landing: string; at: string };
export type LeadStage = "new" | "contacted" | "qualified" | "quote_sent" | "won" | "lost" | "merged";
export type LostReason = "price" | "timing" | "competitor" | "no_response" | "not_eligible" | "other";
export type LeadSource = "contact_form" | "booking" | "ai" | "assistant" | "quote_request" | "landing_form" | "whatsapp" | "sms" | "email" | "manual" | "csv" | "event" | "referral";
export type Lead = {
  id: string; name: string; org?: string; phoneE164?: string; email?: string; language: Locale; serviceInterest: string[];
  source: LeadSource; firstTouch?: Touch; lastTouch?: Touch; stage: LeadStage; lostReason?: LostReason; lostNote?: string;
  ownerId?: string; nextActionAt?: string; estimatedValue?: number; consent: Record<Channel, ConsentState>;
  userId?: string; customerId?: string; clientId?: string; mergedIntoId?: string; campaignId?: string; businessType?: string; landing?: string; tags: string[];
  createdAt: string; updatedAt: string; firstResponseAt?: string; version: number;
};
export type LeadActivity = { id: string; leadId: string; kind: "created" | "stage" | "call" | "message" | "email" | "note" | "task" | "converted" | "reopened" | "merged" | "form"; text: string; by: string; at: string };
export type CrmTask = { id: string; subject: { type: "lead" | "customer"; id: string; label: string }; kind: "call" | "email" | "meeting" | "follow_up"; title: string; dueAt: string; assigneeId: string; done: boolean; doneAt?: string };
export type CrmNote = { id: string; subject: { type: "lead" | "customer"; id: string }; body: string; by: string; at: string; mentions: string[] };
export type Staff = { id: string; name: string; role: "marketing" | "service_manager" | "executive"; color: string };

export type SegField =
  | "service_used" | "category_interest" | "sector" | "district" | "province" | "company_size" | "subscription"
  | "last_active_days" | "ltv" | "language" | "obligation" | "consent_email" | "consent_whatsapp" | "consent_sms";
export type SegOp = "is" | "is_not" | "in" | "lt" | "lte" | "gt" | "gte" | "before" | "after" | "within_days";
export type SegRule = { field: SegField; op: SegOp; value: unknown };
export type SegGroup = { join: "and" | "or"; rules: (SegRule | SegGroup)[] };
export type Contact = {
  id: string; name: string; org?: string; phoneE164?: string; email?: string; language: Locale; sector: string; district: string; province: string;
  size: "micro" | "small" | "medium" | "large"; subscription?: string; servicesUsed: string[]; interests: string[]; obligations: string[];
  lastActiveAt: string; ltv: number; consent: Record<Channel, ConsentState>; suppressed?: boolean; clientId?: string; customerId?: string;
};
export type ExcludedReason = "no_consent" | "opted_out" | "suppressed" | "freq_cap" | "no_address" | "no_content";
export type Segment = { id: string; name: string; definition: SegGroup; lastCount: number; createdBy: string; updatedAt: string; version: number };

export type CampaignStatus = "draft" | "pending_approval" | "approved" | "scheduled" | "sending" | "sent" | "paused" | "cancelled" | "failed";
export type CampaignStats = { queued: number; sent: number; delivered: number; opened: number; read: number; clicked: number; replied: number; leads: number; converted: number; revenue: number; failed: number; unsubscribed: number };
export type Campaign = {
  id: string; name: string; slug: string; channel: Channel; segmentId: string; segmentSnapshot?: { count: number; eligible: number; excluded: Partial<Record<ExcludedReason, number>> };
  templates: Partial<Record<Locale, { templateKey?: string; subjectA?: string; subjectB?: string; abSplit?: number; body?: string }>>;
  fallbackLanguage?: Locale; scheduledAt?: string; throttle: number; status: CampaignStatus; pausedReason?: "user" | "budget_cap";
  createdBy: string; createdAt: string; approvedBy?: string; approvedAt?: string; approverId?: string; rejectedReason?: string; failedReason?: string;
  estimate: number; stats: CampaignStats; version: number;
};
export type TemplateStatus = "draft" | "pending_provider_approval" | "active" | "rejected" | "retired";
export type MsgTemplate = {
  id: string; key: string; name: string; channel: Channel; language: Locale; category: "marketing" | "transactional";
  subject?: string; body: string; variables: string[]; status: TemplateStatus; providerReason?: string; version: number; updatedAt: string;
};
export type Trigger = "quote_sent_no_reply" | "info_requested_no_reply" | "consultation_attended_no_case" | "draft_abandoned_24h" | "inactive_90d" | "manual";
export type AutomationStep = { waitDays: number; action: "send_template" | "create_task" | "set_stage"; params: Record<string, unknown> };
export type AutomationRule = {
  id: string; name: string; trigger: Trigger; conditions?: SegGroup; steps: AutomationStep[]; exit: ("replied" | "paid" | "unsubscribed" | "won" | "lost")[];
  active: boolean; frequencyCap: number; system?: { owner: string }; enrolled: number; converted: number; exited: number; updatedAt: string;
};
export type AutomationRun = { id: string; ruleId: string; subject: { type: "lead" | "user"; id: string; label: string }; stepIndex: number; status: "waiting" | "executed" | "skipped" | "cancelled" | "deferred"; reason?: string; runAt: string };
export type Testimonial = {
  id: string; ratingId: string; clientLabel: string; stars: 1 | 2 | 3 | 4 | 5; quote: string; excerpt?: string; language: Locale; serviceSlug: string;
  consent: boolean; consentRequested?: boolean; status: "pending" | "published" | "rejected"; placements: ("home" | "service" | "landing")[];
  rejectedReason?: string; createdAt: string;
};
export type ReferralState = "clicked" | "signed_up" | "paid" | "rewarded" | "rejected_self" | "ineligible";
export type Referral = { id: string; code: string; referrerId: string; refereeLabel: string; state: ReferralState; at: string };
export type Referrer = { id: string; name: string; kind: "client" | "agent"; code: string; referred: number; paid: number; rewardDue: number };
export type PaidInvoice = { no: string; clientId: string; caseRef?: string; total: number; paidAt: string };
export type InboxThread = {
  id: string; channel: "web" | "whatsapp" | "email" | "sms"; contactName: string; subject?: string; preview: string; unread: number;
  lastInboundAt: string; leadId?: string; customerId?: string; assigneeId?: string; tags: string[];
  messages: { id: string; dir: "in" | "out"; body: string; at: string; by?: string; template?: string }[];
};
export type MktNote = { id: string; kind: "lead" | "task" | "review" | "cms" | "approval" | "campaign" | "budget" | "template" | "seo" | "testimonial"; text: string; href: string; at: string; read: boolean };
export type MktBadges = { leads: number; inbox: number; testimonials: number; content: number; campaigns: number };
