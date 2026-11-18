// Stage 10 marketing mock world (plan 10 §9.4), built on ops-world clients and finance-world invoices.
// Module state, resets on reload (same as the other worlds). Deterministic: seeded PRNG, never Math.random.
// Lanes add their own state in their handler files; shared entities live here.
import { CLIENTS, MANAGER } from "./ops-world";
import { INVOICES } from "./finance-world";
import { currentPersona } from "./personas";
import { audit } from "./audit";
import { MKT_POLICY } from "@/shared/policy";
import type {
  AutomationRule, AutomationRun, Campaign, CampaignStats, Channel, ConsentState, Contact, CrmNote, CrmTask, InboxThread, Lead, LeadActivity,
  Locale, MktNote, MsgTemplate, PaidInvoice, Referral, Referrer, Segment, Staff, Testimonial, Touch,
} from "@/shared/marketing/types";

export const NOW = Date.now(); // read once at load
const H = 3600_000, D = 24 * H;
export const iso = (offsetMs = 0) => new Date(NOW + offsetMs).toISOString();
export const YEAR = new Date(NOW).getUTCFullYear();

/** mulberry32 — the plan's seeded PRNG. */
export function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- staff & actor
export const STAFF: Staff[] = [
  { id: "st-grace-m", name: "Grace Mutesi", role: "marketing", color: "#C9B8F5" }, // ≠ agent Grace Uwimana (ag-grace): always full name
  { id: MANAGER.id, name: MANAGER.name, role: "service_manager", color: "#D9F26B" },
  { id: "st-alice", name: "Alice Mutoni", role: "executive", color: "#F4B183" },
];
export const staffOf = (id?: string) => STAFF.find((s) => s.id === id);
const PERSONA_STAFF: Record<string, string> = { marketing: "st-grace-m", sm: MANAGER.id, exec: "st-alice" };
/** The signed-in mock persona as marketing staff (null for roles outside the CRM). */
export function me(): Staff | null {
  const p = currentPersona();
  return staffOf(PERSONA_STAFF[p?.key ?? ""]) ?? null;
}
export const meId = () => me()?.id ?? "anonymous";
export const isExec = () => me()?.role === "executive";
export const isSm = () => me()?.role === "service_manager";

export class MktError extends Error {
  constructor(public status: number, public code: string, public details?: unknown) { super(code); }
}
export function record(action: string, kind: string, id: string, after?: unknown, reason?: string) {
  return audit({ actor: me()?.name ?? "system", action, entity: { kind, id }, after, reason });
}

/** `LD-2026-00413`-style ids (D-05 PLACEHOLDER formats). */
const counters: Record<string, number> = { LD: 440, CP: 24, SG: 6, TP: 20, SQ: 6, TS: 12, TH: 30, TK: 60, NT: 40, RF: 20, AR: 200 };
export function nextId(prefix: keyof typeof counters | string, pad = 5) {
  counters[prefix] = (counters[prefix] ?? 0) + 1;
  return prefix === "LD" || prefix === "CP" ? `${prefix}-${YEAR}-${String(counters[prefix]).padStart(prefix === "CP" ? 3 : pad, "0")}` : `${prefix.toLowerCase()}-${counters[prefix]}`;
}

// ---------------------------------------------------------------- contacts (synthetic SMEs + ops clients)
const DISTRICTS: [string, string][] = [["Gasabo", "Kigali"], ["Kicukiro", "Kigali"], ["Nyarugenge", "Kigali"], ["Musanze", "North"], ["Huye", "South"], ["Rubavu", "West"], ["Rwamagana", "East"]];
const SECTORS = ["retail", "agri", "hospitality", "transport", "services", "manufacturing", "ict"];
const SERVICES = ["company-registration", "vat-registration", "tax-filing", "business-plan", "trademark", "work-permit"];
const LANGS: Locale[] = ["rw", "rw", "rw", "en", "fr"];
const consent = (e: ConsentState, w: ConsentState, s: ConsentState): Record<Channel, ConsentState> => ({ email: e, whatsapp: w, sms: s });

/** Seed segment SG-VAT-SMEs: 1,596 match → 312 excluded on WhatsApp (287 no consent, 19 opted out, 6 suppressed) → 1,284 eligible. */
export const VAT_SME = { match: 1596, noConsent: 287, optedOut: 19, suppressed: 6 } as const;
// shortcut: synthetic contact generator (seeded PRNG) for segment counts, remove when the CRM API serves real data.
function generate(): Contact[] {
  const r = mulberry32(10);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const out: Contact[] = [];
  for (let i = 0; i < 2200; i++) {
    const vat = i < VAT_SME.match;
    const [district, province] = pick(DISTRICTS);
    const wa: ConsentState = !vat ? (r() < 0.7 ? "in" : "unknown") : i < VAT_SME.noConsent ? "unknown" : i < VAT_SME.noConsent + VAT_SME.optedOut ? "out" : "in";
    out.push({
      id: i === 0 ? "ct-no-wa" : `ct-${String(i).padStart(4, "0")}`,
      name: `SME contact ${i + 1}`, // synthetic, never shown with a real-looking name
      phoneE164: `+25078${String(1_000_000 + i * 37).slice(-7)}`,
      email: r() < 0.8 ? `contact${i + 1}@sme.example.rw` : undefined,
      language: pick(LANGS), sector: pick(SECTORS), district, province,
      size: vat ? (r() < 0.6 ? "small" : "medium") : pick(["micro", "small", "large"] as const),
      servicesUsed: r() < 0.4 ? [pick(SERVICES)] : [], interests: [pick(SERVICES)], obligations: vat ? ["vat"] : r() < 0.3 ? ["paye"] : [],
      lastActiveAt: iso(-Math.floor(r() * 240) * D), ltv: Math.floor(r() * 40) * 10_000,
      consent: consent(r() < 0.75 ? "in" : r() < 0.5 ? "out" : "unknown", wa, r() < 0.5 ? "in" : "unknown"),
      suppressed: vat && i >= VAT_SME.noConsent + VAT_SME.optedOut && i < VAT_SME.noConsent + VAT_SME.optedOut + VAT_SME.suppressed,
    });
  }
  return out;
}
export const CONTACTS: Contact[] = [
  ...CLIENTS.map((c, i): Contact => ({
    id: c.id, name: c.name, org: c.type === "company" ? c.name : undefined, phoneE164: c.phone.replace(/\s/g, ""), email: c.email,
    language: c.language as Locale, sector: ["services", "agri", "manufacturing", "services"][i] ?? "services", district: "Gasabo", province: "Kigali",
    size: c.type === "company" ? "small" : "micro", servicesUsed: ["company-registration"], interests: ["business-plan"], obligations: [],
    lastActiveAt: iso(-(i * 40 + 3) * D), ltv: c.past * 50_000, consent: consent("in", i === 0 ? "in" : "unknown", "unknown"), clientId: c.id,
    customerId: `HBC-${YEAR}-${String(101 + i).padStart(5, "0")}`, // D-04 A-4 format, PLACEHOLDER
  })),
  ...generate(),
];
export const contactOf = (id: string) => CONTACTS.find((c) => c.id === id);
/** Mask a phone for lists: +250 78• ••• 456 (spec §10.2). */
export const maskPhone = (p?: string) => (p ? `${p.slice(0, 4)} ${p.slice(4, 6)}• ••• ${p.slice(-3)}` : "");

// ---------------------------------------------------------------- leads
const touch = (source: string, medium: string, campaign: string | undefined, daysAgo: number, landing = "/rw"): Touch => ({ source, medium, campaign, landing, at: iso(-daysAgo * D) });
const STORY_FIRST = touch("facebook", "paid_social", "invest-rw", 21, "/rw/services/business-plan");
const STORY_LAST = touch("whatsapp", "campaign", "vat-deadline-nov", 6, "/rw/campaign/register-in-3-days");
const LEAD_NAMES = [
  ["Jean Bosco Habimana", "Ubumwe Agro Ltd"], ["Claudine Uwimana", undefined], ["Eric Nshimiyimana", "Kivu Transport Co"], ["Sandrine Mukandayisenga", "Inzozi Salon"],
  ["Patrick Mugisha", "Rwiza Tech"], ["Josiane Ingabire", undefined], ["Olivier Ndayisaba", "Ikaze Lodge"], ["Divine Uwera", "Divine Crafts"],
  ["Emmanuel Hakizimana", "Isoko Fresh"], ["Chantal Nyiraneza", undefined], ["Fabrice Iradukunda", "Fab Logistics"], ["Yvette Mukamurenzi", "Yvette Bakery"],
  ["Innocent Ndagijimana", "Inno Builders"], ["Ange Umutoni", undefined], ["Thierry Kamanzi", "Kamanzi & Sons"], ["Belise Uwamahoro", "Belle Boutique"],
] as const; // fictional (F-PRV-06)
const STAGES: Lead["stage"][] = ["new", "new", "new", "contacted", "contacted", "qualified", "qualified", "quote_sent", "quote_sent", "won", "lost", "new", "contacted", "qualified", "new", "quote_sent"];
const SOURCES: Lead["source"][] = ["landing_form", "whatsapp", "contact_form", "booking", "event", "manual", "landing_form", "quote_request", "ai", "csv", "referral", "email", "landing_form", "whatsapp", "contact_form", "booking"];
const TOUCHES: (Touch | undefined)[] = [
  touch("facebook", "paid_social", "nov_tax", 1), touch("whatsapp", "campaign", "vat-deadline-nov", 2), touch("google", "organic", undefined, 3),
  touch("google", "cpc", "bdf-business-plan", 4), undefined, undefined, touch("facebook", "paid_social", "nov_tax", 6), touch("google", "cpc", "bdf-business-plan", 8),
  touch("referral", "client", "REF-ALINE-7K2", 9), undefined, touch("referral", "client", "REF-ALINE-7K2", 12), touch("newsletter", "email", "oct-digest", 13),
  touch("facebook", "paid_social", "invest-rw", 14), touch("whatsapp", "campaign", "vat-deadline-nov", 15), touch("google", "organic", undefined, 16), undefined,
];
export const LEADS: Lead[] = [
  {
    id: `LD-${YEAR}-00413`, name: "Aline Uwase", phoneE164: "+250788123456", email: "aline.uwase@example.rw", language: "rw", serviceInterest: ["business-plan"],
    source: "landing_form", firstTouch: STORY_FIRST, lastTouch: STORY_LAST, stage: "quote_sent", ownerId: "st-grace-m", nextActionAt: iso(1 * D),
    estimatedValue: 50_000, consent: consent("in", "in", "unknown"), clientId: "cl-aline", customerId: CONTACTS[0].customerId, campaignId: `CP-${YEAR}-018`,
    tags: ["vat"], createdAt: iso(-6 * D), updatedAt: iso(-1 * D), firstResponseAt: iso(-6 * D + 2 * H), version: 3,
  },
  ...LEAD_NAMES.map(([name, org], i): Lead => {
    const stage = STAGES[i];
    const t = TOUCHES[i];
    return {
      id: `LD-${YEAR}-${String(420 + i).padStart(5, "0")}`, name, org, phoneE164: `+25078${String(8_400_100 + i * 1_013).slice(-7)}`,
      email: i % 3 ? `${name.split(" ")[0].toLowerCase()}@example.rw` : undefined, language: LANGS[i % LANGS.length], serviceInterest: [SERVICES[i % SERVICES.length]],
      source: SOURCES[i], firstTouch: t, lastTouch: t, stage, lostReason: stage === "lost" ? "price" : undefined,
      ownerId: i % 4 === 3 ? undefined : "st-grace-m", nextActionAt: stage === "won" || stage === "lost" ? undefined : iso((i % 5 - 2) * D),
      estimatedValue: i % 2 ? (i + 2) * 25_000 : undefined, consent: consent(i % 3 ? "in" : "unknown", i % 4 ? "in" : "out", "unknown"),
      campaignId: t?.campaign === "vat-deadline-nov" ? `CP-${YEAR}-018` : undefined, tags: [],
      createdAt: iso(-(i + 1) * 0.7 * D), updatedAt: iso(-(i % 4) * H), firstResponseAt: stage === "new" ? undefined : iso(-(i + 1) * 0.7 * D + 3 * H), version: 1,
    };
  }),
];
export const leadOf = (id: string) => LEADS.find((l) => l.id === id);
export const ACTIVITIES: LeadActivity[] = LEADS.flatMap((l, i) => [
  { id: `ac-${i}-a`, leadId: l.id, kind: "created" as const, text: `source:${l.source}`, by: "system", at: l.createdAt },
  ...(l.firstResponseAt ? [{ id: `ac-${i}-b`, leadId: l.id, kind: "call" as const, text: "First call", by: "st-grace-m", at: l.firstResponseAt }] : []),
]);
export const TASKS: CrmTask[] = LEADS.filter((l) => l.nextActionAt).slice(0, 9).map((l, i) => ({
  id: `tk-${i + 1}`, subject: { type: "lead", id: l.id, label: l.name }, kind: (["call", "follow_up", "email", "meeting"] as const)[i % 4],
  title: ["Call back", "Send quote reminder", "Share requirements list", "Book consultation"][i % 4], dueAt: l.nextActionAt!, assigneeId: "st-grace-m", done: false,
}));
export const NOTES: CrmNote[] = [{ id: "nt-1", subject: { type: "lead", id: LEADS[0].id }, body: "Wants the business plan before the BDF window closes.", by: "st-grace-m", at: iso(-2 * D), mentions: [] }];

// ---------------------------------------------------------------- paid invoices (conversion & revenue)
/** The Done-when story invoice: unpaid until "Simulate payment" (POST /api/dev/invoices/{no}/pay). */
export const STORY_INVOICE = { no: `INV-${YEAR}-00245`, clientId: "cl-aline", total: 50_000, paidAt: undefined as string | undefined, leadId: LEADS[0].id };
// shortcut: paidInvoices() reads finance-world INVOICES + the story invoice; switch to the finance API when it is live.
export function paidInvoices(): PaidInvoice[] {
  const fin = INVOICES.filter((i) => i.no && (i.status === "paid" || i.status === "paid_by_plan"))
    .map((i) => ({ no: i.no!, clientId: i.clientId, caseRef: i.caseRef, total: i.totals.total, paidAt: i.issuedAt ?? iso() }));
  return STORY_INVOICE.paidAt ? [...fin, { no: STORY_INVOICE.no, clientId: STORY_INVOICE.clientId, total: STORY_INVOICE.total, paidAt: STORY_INVOICE.paidAt }] : fin;
}

// ---------------------------------------------------------------- segments, templates, campaigns
export const SEGMENTS: Segment[] = [
  { id: "SG-VAT-SMEs", name: "VAT-registered SMEs", definition: { join: "and", rules: [{ field: "obligation", op: "is", value: "vat" }, { field: "company_size", op: "in", value: ["small", "medium"] }] }, lastCount: VAT_SME.match, createdBy: "st-grace-m", updatedAt: iso(-9 * D), version: 2 },
  { id: "SG-INACTIVE-90", name: "Inactive 90+ days", definition: { join: "and", rules: [{ field: "last_active_days", op: "gt", value: MKT_POLICY.inactiveDays }] }, lastCount: 0, createdBy: "st-grace-m", updatedAt: iso(-20 * D), version: 1 },
  { id: "SG-KIGALI-RETAIL", name: "Kigali retail", definition: { join: "and", rules: [{ field: "province", op: "is", value: "Kigali" }, { field: "sector", op: "is", value: "retail" }] }, lastCount: 0, createdBy: "st-grace-m", updatedAt: iso(-30 * D), version: 1 },
  { id: "SG-REG-SUBS", name: "Regulatory subscribers", definition: { join: "or", rules: [{ field: "consent_email", op: "is", value: "in" }] }, lastCount: 0, createdBy: "st-grace-m", updatedAt: iso(-40 * D), version: 1 },
];
const tpl = (key: string, name: string, channel: Channel, language: Locale, body: string, status: MsgTemplate["status"] = "active", extra: Partial<MsgTemplate> = {}): MsgTemplate =>
  ({ id: `tp-${key}-${channel}-${language}`, key, name, channel, language, category: "marketing", body, variables: [...body.matchAll(/{{(\w+)}}/g)].map((m) => m[1]), status, version: 1, updatedAt: iso(-12 * D), ...extra });
export const TEMPLATES: MsgTemplate[] = [
  tpl("vat_deadline_reminder", "VAT deadline reminder", "whatsapp", "rw", "Muraho {{first_name}}, itariki ntarengwa ya TVA iregereje. Twagufasha kuyimenyekanisha ku gihe."),
  tpl("vat_deadline_reminder", "VAT deadline reminder", "whatsapp", "en", "Hello {{first_name}}, the VAT filing deadline is close. We can file it for you on time."),
  tpl("vat_deadline_reminder", "VAT deadline reminder", "whatsapp", "fr", "Bonjour {{first_name}}, l'échéance TVA approche. Nous pouvons la déclarer pour vous à temps."),
  tpl("bdf_loan_promo", "BDF business plan", "whatsapp", "en", "Hi {{first_name}}, applying for a BDF loan? Get a bank-ready business plan.", "rejected", { providerReason: "Promotional content must include an opt-out option." }),
  tpl("winback_90", "We miss you", "whatsapp", "rw", "Muraho {{first_name}}, tumaze igihe tutakubona. Hari icyo twagufasha?", "pending_provider_approval"),
  tpl("monthly_digest", "Monthly digest", "email", "en", "Hello {{first_name}}, here is what changed for businesses this month.", "active", { subject: "Your monthly business digest" }),
  tpl("monthly_digest", "Monthly digest", "email", "rw", "Muraho {{first_name}}, dore ibyahindutse kuri bizinesi muri uku kwezi.", "active", { subject: "Amakuru y'ukwezi" }),
  tpl("monthly_digest", "Monthly digest", "email", "fr", "Bonjour {{first_name}}, voici ce qui a changé pour les entreprises ce mois-ci.", "active", { subject: "Votre lettre mensuelle" }),
  tpl("vat_sms", "VAT SMS", "sms", "rw", "TVA: itariki ntarengwa iregereje. HEBUZA irakwifashisha."),
  tpl("case_update", "Case update", "whatsapp", "en", "Your case {{case_ref}} moved to {{status}}.", "active", { category: "transactional" }),
];
const zero: CampaignStats = { queued: 0, sent: 0, delivered: 0, opened: 0, read: 0, clicked: 0, replied: 0, leads: 0, converted: 0, revenue: 0, failed: 0, unsubscribed: 0 };
const cmp = (id: string, name: string, slug: string, channel: Channel, status: Campaign["status"], extra: Partial<Campaign> = {}): Campaign => ({
  id, name, slug, channel, segmentId: "SG-VAT-SMEs", templates: {}, throttle: MKT_POLICY.throttle, status, createdBy: "st-grace-m",
  createdAt: iso(-10 * D), estimate: 0, stats: zero, version: 1, ...extra,
});
const waTemplates = { rw: { templateKey: "vat_deadline_reminder" }, en: { templateKey: "vat_deadline_reminder" }, fr: { templateKey: "vat_deadline_reminder" } };
export const CAMPAIGNS: Campaign[] = [
  cmp(`CP-${YEAR}-018`, "VAT deadline Nov", "vat-deadline-nov", "whatsapp", "sent", {
    templates: waTemplates, segmentSnapshot: { count: VAT_SME.match, eligible: 1284, excluded: { no_consent: 287, opted_out: 19, suppressed: 6 } },
    estimate: 1284 * MKT_POLICY.unitCost.whatsapp, approvedBy: "st-alice", approvedAt: iso(-7 * D), scheduledAt: iso(-7 * D + 2 * H),
    stats: { ...zero, queued: 1284, sent: 1284, delivered: 1251, read: 1016, clicked: 212, replied: 64, leads: 41, converted: 0, failed: 33, unsubscribed: 7 },
  }),
  cmp(`CP-${YEAR}-019`, "October digest", "oct-digest", "email", "sent", { segmentId: "SG-REG-SUBS", templates: { en: { templateKey: "monthly_digest", subjectA: "Your monthly business digest", subjectB: "3 deadlines this month" }, rw: { templateKey: "monthly_digest" }, fr: { templateKey: "monthly_digest" } }, stats: { ...zero, queued: 1520, sent: 1520, delivered: 1498, opened: 702, clicked: 133, leads: 12, failed: 22, unsubscribed: 4 } }),
  cmp(`CP-${YEAR}-021`, "Win-back 90 days", "winback-90", "whatsapp", "draft", { segmentId: "SG-INACTIVE-90" }),
  cmp(`CP-${YEAR}-022`, "Kigali retail VAT SMS", "kigali-retail-vat", "sms", "paused", { segmentId: "SG-KIGALI-RETAIL", pausedReason: "budget_cap", estimate: 9_000, templates: { rw: { templateKey: "vat_sms" } }, stats: { ...zero, queued: 600, sent: 444, delivered: 430, failed: 14 } }),
  cmp(`CP-${YEAR}-023`, "BDF business plan push", "bdf-business-plan", "whatsapp", "failed", { failedReason: "template_rejected", templates: { en: { templateKey: "bdf_loan_promo" } } }),
  cmp(`CP-${YEAR}-024`, "December filing reminder", "dec-filing", "email", "pending_approval", { segmentId: "SG-REG-SUBS", estimate: 0, approverId: "st-alice", templates: { en: { templateKey: "monthly_digest", subjectA: "File before the holidays" } } }),
];
export const campaignOf = (id: string) => CAMPAIGNS.find((c) => c.id === id);
/** Marketing spend this month (budget meter). */
export const SPEND = { month: 40_000 };

// ---------------------------------------------------------------- automations
export const AUTOMATIONS: AutomationRule[] = [
  { id: "sq-quote", name: "Quote follow-up", trigger: "quote_sent_no_reply", steps: [
    { waitDays: 1, action: "send_template", params: { channel: "whatsapp", template: "vat_deadline_reminder" } },
    { waitDays: 3, action: "send_template", params: { channel: "email", template: "monthly_digest" } },
    { waitDays: 7, action: "create_task", params: { kind: "call", title: "Call about the quote" } },
    { waitDays: 14, action: "set_stage", params: { stage: "lost", reason: "no_response" } },
  ], exit: ["replied", "paid", "won", "lost", "unsubscribed"], active: true, frequencyCap: MKT_POLICY.frequencyCap, enrolled: 48, converted: 11, exited: 9, updatedAt: iso(-5 * D) },
  { id: "sq-info", name: "Info requested, no reply", trigger: "info_requested_no_reply", steps: [{ waitDays: 2, action: "send_template", params: { channel: "email", template: "monthly_digest" } }, { waitDays: 5, action: "create_task", params: { kind: "call", title: "Check in" } }], exit: ["replied", "won", "lost"], active: true, frequencyCap: 2, enrolled: 22, converted: 4, exited: 6, updatedAt: iso(-15 * D) },
  { id: "sq-inactive", name: "Win-back after 90 days", trigger: "inactive_90d", steps: [{ waitDays: 0, action: "send_template", params: { channel: "whatsapp", template: "winback_90" } }], exit: ["replied", "paid", "unsubscribed"], active: false, frequencyCap: 2, enrolled: 0, converted: 0, exited: 0, updatedAt: iso(-25 * D) },
  { id: "sys-tax", name: "Tax deadline reminders", trigger: "manual", steps: [], exit: [], active: true, frequencyCap: 2, system: { owner: "Service Management" }, enrolled: 0, converted: 0, exited: 0, updatedAt: iso(-60 * D) },
  { id: "sys-renew", name: "Plan renewal reminders", trigger: "manual", steps: [], exit: [], active: true, frequencyCap: 2, system: { owner: "Service Management" }, enrolled: 0, converted: 0, exited: 0, updatedAt: iso(-60 * D) },
];
export const RUNS: AutomationRun[] = LEADS.filter((l) => l.stage === "quote_sent").flatMap((l, i) => [
  { id: `ar-${i}-0`, ruleId: "sq-quote", subject: { type: "lead", id: l.id, label: l.name }, stepIndex: 0, status: "executed", runAt: iso(-3 * D) },
  { id: `ar-${i}-1`, ruleId: "sq-quote", subject: { type: "lead", id: l.id, label: l.name }, stepIndex: 1, status: i % 2 ? "skipped" : "executed", reason: i % 2 ? "no_consent" : undefined, runAt: iso(-1 * D) },
  { id: `ar-${i}-2`, ruleId: "sq-quote", subject: { type: "lead", id: l.id, label: l.name }, stepIndex: 2, status: "waiting", runAt: iso(3 * D) },
]);

// ---------------------------------------------------------------- testimonials, referrals, inbox
export const TESTIMONIALS: Testimonial[] = [
  { id: "ts-1", ratingId: "rt-101", clientLabel: "Aline · Individual", stars: 5, quote: "Byihuse kandi nasobanuriwe buri ntambwe.", language: "rw", serviceSlug: "company-registration", consent: true, status: "pending", placements: [], createdAt: iso(-2 * D) },
  { id: "ts-2", ratingId: "rt-102", clientLabel: "Jean Bosco · Ubumwe Agro Ltd", stars: 4, quote: "Clear updates at every step and no surprise fees.", language: "en", serviceSlug: "vat-registration", consent: false, status: "pending", placements: [], createdAt: iso(-3 * D) },
  { id: "ts-3", ratingId: "rt-103", clientLabel: "Claudine · Inzozi Salon", stars: 5, quote: "Service rapide et une équipe disponible sur WhatsApp.", language: "fr", serviceSlug: "tax-filing", consent: true, status: "pending", placements: [], createdAt: iso(-4 * D) },
  { id: "ts-4", ratingId: "rt-090", clientLabel: "Eric · Kivu Transport Co", stars: 5, quote: "They handled the RDB filing while I kept working.", language: "en", serviceSlug: "company-registration", consent: true, status: "published", placements: ["home"], createdAt: iso(-20 * D) },
  { id: "ts-5", ratingId: "rt-080", clientLabel: "Divine · Divine Crafts", stars: 4, quote: "Good service.", language: "en", serviceSlug: "trademark", consent: true, status: "rejected", rejectedReason: "Too short to be useful", placements: [], createdAt: iso(-30 * D) },
]; // quotes are PLACEHOLDER mock copy, not real client words
export const REFERRERS: Referrer[] = [
  { id: "cl-aline", name: "Aline Uwase", kind: "client", code: "REF-ALINE-7K2", referred: 4, paid: 2, rewardDue: 2 * MKT_POLICY.referralReward },
  { id: "ag-grace", name: "Grace Uwimana", kind: "agent", code: "REF-GRACE-Q4M", referred: 3, paid: 1, rewardDue: MKT_POLICY.referralReward },
  { id: "cl-kff", name: "Kigali Fresh Foods Ltd", kind: "client", code: "REF-KFF-2NB", referred: 1, paid: 0, rewardDue: 0 },
];
export const REFERRALS: Referral[] = [
  { id: "rf-1", code: "REF-ALINE-7K2", referrerId: "cl-aline", refereeLabel: "Fabrice I.", state: "paid", at: iso(-12 * D) },
  { id: "rf-2", code: "REF-ALINE-7K2", referrerId: "cl-aline", refereeLabel: "Olivier N.", state: "paid", at: iso(-9 * D) },
  { id: "rf-3", code: "REF-ALINE-7K2", referrerId: "cl-aline", refereeLabel: "Josiane I.", state: "signed_up", at: iso(-4 * D) },
  { id: "rf-4", code: "REF-ALINE-7K2", referrerId: "cl-aline", refereeLabel: "Aline U.", state: "rejected_self", at: iso(-3 * D) },
  { id: "rf-5", code: "REF-GRACE-Q4M", referrerId: "ag-grace", refereeLabel: "Thierry K.", state: "paid", at: iso(-8 * D) },
  { id: "rf-6", code: "REF-KFF-2NB", referrerId: "cl-kff", refereeLabel: "Isoko Fresh", state: "ineligible", at: iso(-2 * D) },
];
export const THREADS: InboxThread[] = [
  { id: "th-1", channel: "whatsapp", contactName: "Sandrine Mukandayisenga", preview: "Ese mwamfasha kwiyandikisha muri TVA?", unread: 2, lastInboundAt: iso(-3 * H), tags: [], messages: [
    { id: "m1", dir: "in", body: "Muraho, ese mwamfasha kwiyandikisha muri TVA?", at: iso(-4 * H) }, { id: "m2", dir: "in", body: "Ese mwamfasha kwiyandikisha muri TVA?", at: iso(-3 * H) }] },
  { id: "th-2", channel: "whatsapp", contactName: "Fabrice Iradukunda", preview: "Thanks, I'll think about it.", unread: 0, lastInboundAt: iso(-30 * H), leadId: LEADS[11]?.id, tags: [], messages: [
    { id: "m1", dir: "out", body: "Here is the quote for the business plan.", at: iso(-31 * H), by: "st-grace-m" }, { id: "m2", dir: "in", body: "Thanks, I'll think about it.", at: iso(-30 * H) }] },
  { id: "th-3", channel: "email", contactName: "Olivier Ndayisaba", subject: "Work permit for a chef", preview: "We are hiring a chef from abroad…", unread: 1, lastInboundAt: iso(-6 * H), tags: [], messages: [
    { id: "m1", dir: "in", body: "We are hiring a chef from abroad and need a work permit. What documents do you need?", at: iso(-6 * H) }] },
  { id: "th-4", channel: "web", contactName: "Website visitor", subject: "Contact form", preview: "How long does trademark registration take?", unread: 1, lastInboundAt: iso(-1 * H), tags: [], messages: [
    { id: "m1", dir: "in", body: "How long does trademark registration take?", at: iso(-1 * H) }] },
  { id: "th-5", channel: "sms", contactName: "+250 78• ••• 210", preview: "STOP", unread: 0, lastInboundAt: iso(-50 * H), tags: ["opt-out"], messages: [{ id: "m1", dir: "in", body: "STOP", at: iso(-50 * H) }] },
];

// ---------------------------------------------------------------- notifications (§8.2)
export const NOTES_FEED: MktNote[] = [
  { id: "n1", kind: "lead", text: "New lead assigned: Aline Uwase", href: `/marketing/leads?lead=${LEADS[0].id}`, at: iso(-2 * H), read: false },
  { id: "n2", kind: "review", text: "Content approved: VAT deadline update", href: "/marketing/updates", at: iso(-5 * H), read: false },
  { id: "n3", kind: "campaign", text: "Campaign finished: VAT deadline Nov", href: `/marketing/campaigns/CP-${YEAR}-018?tab=results`, at: iso(-6 * D), read: true },
  { id: "n4", kind: "budget", text: "Paused at budget cap: Kigali retail VAT SMS", href: `/marketing/campaigns/CP-${YEAR}-022`, at: iso(-1 * D), read: false },
  { id: "n5", kind: "template", text: "Template rejected by Meta: BDF business plan", href: "/marketing/templates?status=rejected", at: iso(-2 * D), read: true },
  { id: "n6", kind: "seo", text: "3 broken links found", href: "/marketing/seo?tab=health", at: iso(-3 * D), read: true },
  { id: "n7", kind: "task", text: "4 follow-ups due today", href: "/marketing/leads?view=tasks", at: iso(-1 * H), read: false },
];
export const pushNote = (n: Omit<MktNote, "id" | "at" | "read">) => NOTES_FEED.unshift({ ...n, id: `n${NOTES_FEED.length + 1}-${Date.now()}`, at: new Date().toISOString(), read: false });
