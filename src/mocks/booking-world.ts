// Stage 11 booking world (plan 11 §9.4): consultation types, advisers' availability, bookings, callback requests.
// One in-memory store behind every booking endpoint. Dates are relative to NOW at module load (never in render).
// shortcut: in-memory booking-world resets on reload, replace per endpoint as server ships.
import { POLICY } from "@/shared/policy";
import { audit } from "./audit";
import { SERVICES } from "./ops-world";
import { mask } from "@/shared/format";
import {
  ACTIVE, BKG, addDays, at, can, cancelOutcome, computeSlots, dayOf, joinState, nearest, pickAdviser, planReminders, shouldAutoNoShow, weekdayOf,
  type SlotAdviser, type SlotInput,
} from "@/shared/booking/rules";
import type {
  AdminBookings, Availability, AvailabilityOverride, AvailabilityRule, Booking, BookingAnalytics, BookingEvent, CallbackRequest, ConsultationType, Hold, Mode, SlotsResponse, StaffBooking,
} from "@/shared/booking/types";
import type { Locale } from "@/shared/i18n/config";

export const NOW = Date.now();
const MIN = 60_000;
const H = 60 * MIN;
const TODAY = dayOf(NOW);
const nextWeekday = (wd: number, minDays = 1) => { let d = addDays(TODAY, minDays); while (weekdayOf(d) !== wd) d = addDays(d, 1); return d; };
const tl = (en: string, fr: string, rw: string): Record<Locale, string> => ({ en, fr, rw });

// ---------------------------------------------------------------- Types (F-BKG-01)
export const TYPES: ConsultationType[] = [
  {
    id: "ct-intro", slug: "intro-30", version: 1, isActive: true,
    name: tl("Free intro call", "Appel découverte gratuit", "Ikiganiro cy'ibanze cy'ubuntu"),
    description: tl("30 minutes to understand your need and the right service. Once per service family.", "30 minutes pour comprendre votre besoin et le bon service. Une fois par famille de services.", "Iminota 30 yo gusobanukirwa icyo ukeneye na serivisi ikwiye."),
    durationMin: 30, modes: ["video", "phone", "office"], price: 0, currency: "RWF",
    bufferBeforeMin: 0, bufferAfterMin: 15, minNoticeMin: 4 * 60, horizonDays: 14 /* D-7: journey 14 d for free intro */, maxPerDay: 6,
    familySlugs: [], serviceSlugs: [], adviserIds: ["ag-eric", "ag-grace", "ag-jp", "sm-diane"], freeOncePerFamily: true,
    intakeSchema: [
      { id: "stage", type: "radio", required: true, label: tl("Where are you today?", "Où en êtes-vous ?", "Ugeze he?"), options: ["Just an idea", "Business running", "Investor abroad"] },
      { id: "goal", type: "text", required: false, label: tl("What would you like to achieve?", "Que souhaitez-vous accomplir ?", "Wifuza kugera kuki?") },
    ],
    prepare: { en: ["Your questions, written down", "Any registration numbers you already have (TIN, company code)"], fr: ["Vos questions, par écrit", "Vos numéros existants (NIF, code société)"], rw: ["Ibibazo byawe, byanditse", "Nomero usanzwe ufite (TIN, kode ya sosiyete)"] },
  },
  {
    id: "ct-consult", slug: "consult-60", version: 1, isActive: true,
    name: tl("Expert consultation", "Consultation d'expert", "Inama n'impuguke"),
    description: tl("60 minutes with a specialist on your case: documents, steps, costs and a written next-step summary.", "60 minutes avec un spécialiste : documents, étapes, coûts et un résumé écrit.", "Iminota 60 n'inzobere ku kibazo cyawe."),
    durationMin: 60, modes: ["video", "office", "phone"], price: POLICY.consultationPrice /* PLACEHOLDER(consultation-price) D-1 */, currency: "RWF",
    bufferBeforeMin: 15, bufferAfterMin: 15, minNoticeMin: 4 * 60, horizonDays: 30, maxPerDay: 5,
    familySlugs: [], serviceSlugs: [], adviserIds: ["ag-eric", "ag-grace", "ag-jp"], freeOncePerFamily: false,
    intakeSchema: [
      { id: "topic", type: "text", required: true, label: tl("What should the adviser prepare?", "Que doit préparer le conseiller ?", "Umujyanama yitegure iki?") },
      { id: "docs", type: "checkbox", required: false, label: tl("I'll bring documents to review", "J'apporterai des documents à examiner", "Nzazana inyandiko zo gusuzuma") },
    ],
    prepare: { en: ["Passport or ID copy", "A short summary of your business idea", "Any letters from RDB or RRA"], fr: ["Copie du passeport ou de la carte d'identité", "Un court résumé de votre projet", "Tout courrier de RDB ou RRA"], rw: ["Kopi ya pasiporo cyangwa indangamuntu", "Incamake y'umushinga wawe", "Amabaruwa ya RDB cyangwa RRA"] },
  },
  {
    id: "ct-onsite", slug: "on-site-60", version: 1, isActive: false, // D-6: inactive until HEBUZA confirms price/coverage
    name: tl("On-site visit (Kigali)", "Visite sur place (Kigali)", "Gusurwa aho ukorera (Kigali)"),
    description: tl("An adviser visits your premises in Kigali.", "Un conseiller se déplace dans vos locaux à Kigali.", "Umujyanama agusura aho ukorera i Kigali."),
    durationMin: 60, modes: ["premises"], price: 35_000 /* PLACEHOLDER(on-site-price) */, currency: "RWF",
    bufferBeforeMin: 45, bufferAfterMin: 45, minNoticeMin: 24 * 60, horizonDays: 30, maxPerDay: 2,
    familySlugs: [], serviceSlugs: [], adviserIds: ["ag-eric"], freeOncePerFamily: false, intakeSchema: [], prepare: { en: [], fr: [], rw: [] },
  },
];
export const typeBySlug = (slug: string) => TYPES.find((t) => t.slug === slug);

// ---------------------------------------------------------------- Advisers + availability (F-BKG-02)
// PLACEHOLDER(adviser-default-hours) Mon–Fri 08:00–17:00 with PLACEHOLDER(lunch-break) 12:00–13:00 (D-22).
const WEEK: AvailabilityRule[] = [1, 2, 3, 4, 5].flatMap((weekday) => [{ weekday, start: "08:00", end: "12:00" }, { weekday, start: "13:00", end: "17:00" }]);
export const ADVISERS: (SlotAdviser & { name: string; title: string; photo?: string; version: number; externalBusy: { from: string; to: string }[] })[] = [
  { id: "ag-eric", name: "Eric Habimana", title: "Tax adviser", photo: "/hebuza/faces/2.jpg", priority: 1, rules: WEEK, overrides: [], leave: [], active: true, version: 1,
    externalBusy: [{ from: at(addDays(TODAY, 2), "15:00"), to: at(addDays(TODAY, 2), "16:00") }] /* shortcut: calendar sync row disabled (F-BKG-10 P3), mock busy block only */ },
  { id: "ag-grace", name: "Grace Uwimana", title: "Business adviser", photo: "/hebuza/faces/5.jpg", priority: 2, rules: WEEK, overrides: [], version: 1, externalBusy: [],
    leave: [{ from: nextWeekday(4), to: nextWeekday(4) }], active: true },
  { id: "ag-jp", name: "Jean-Paul Nkurunziza", title: "Investment adviser", photo: "/hebuza/faces/3.jpg", priority: 3, rules: WEEK, overrides: [], leave: [], active: true, version: 1, externalBusy: [] },
  { id: "sm-diane", name: "Diane Mukamana", title: "Service manager", photo: "/hebuza/faces/6.jpg", priority: 4, rules: WEEK.filter((r) => r.start === "13:00"), overrides: [], leave: [], active: true, version: 1, externalBusy: [] },
];
export const adviserOf = (id: string | null) => ADVISERS.find((a) => a.id === id) ?? null;
export const pubAdviser = (id: string | null) => { const a = adviserOf(id); return a ? { id: a.id, name: a.name, photo: a.photo, title: a.title } : null; };

// ---------------------------------------------------------------- Bookings
type Rec = StaffBooking & { token: string; confirmKey: string; createdAt: number; contactKey: string; phone?: string; email?: string; whatsapp: boolean; joinUrl: string; lateRefund?: boolean };
export const BOOKINGS: Rec[] = [];
let seq = 217;
const ref = () => `BKG-${new Date(NOW).getFullYear()}-${String(++seq).padStart(4, "0")}`;
const rid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;
export const contactKey = (c: { phone?: string; email?: string; clientId?: string | null }) =>
  c.clientId ?? (c.phone ? c.phone.replace(/\D/g, "").slice(-9) : (c.email ?? "").trim().toLowerCase());

function seed(o: { type: string; adviser: string; date: string; time: string; status: Rec["status"]; name: string; clientId?: string; phone?: string; email?: string; lang: Locale; mode: Mode;
  family?: string; source?: Rec["source"]; summary?: string; recommend?: string[]; notes?: string; token?: string; paid?: boolean }) {
  const t = typeBySlug(o.type)!;
  const startsAt = at(o.date, o.time);
  const endsAt = new Date(Date.parse(startsAt) + t.durationMin * MIN).toISOString();
  const createdAt = Date.parse(startsAt) - 3 * 24 * H;
  const r: Rec = {
    id: rid("bk"), reference: ref(), typeSlug: t.slug, typeName: t.name, price: t.price, adviser: pubAdviser(o.adviser), clientId: o.clientId ?? null, leadId: o.clientId ? null : rid("lead"),
    contact: { name: o.name, phoneMasked: o.phone ? mask(o.phone, 3) : undefined, emailMasked: o.email ? maskEmail(o.email) : undefined },
    contactFull: { name: o.name, phone: o.phone, email: o.email }, phone: o.phone, email: o.email, whatsapp: true,
    language: o.lang, startsAt, endsAt, mode: o.mode, location: o.mode === "office" ? OFFICE : null, status: o.status, intakeAnswers: o.type === "intro-30" ? { stage: "Business running" } : { topic: "Company set-up as a foreign investor" },
    familySlug: o.family ?? "taxes-and-business-support", serviceSlug: null, invoiceRef: t.price ? `INV-${ref().slice(4)}` : null, holdExpiresAt: null, paid: o.paid ?? t.price > 0,
    rescheduleCount: 0, rescheduledFromId: null, rescheduledToRef: null, cancelReason: null, cancelledBy: null, clientSummary: o.summary ?? null,
    recommendedServiceSlugs: o.recommend ?? [], startLinks: [], quoteRef: null, reminders: [], events: [], version: 1, noShowCount: 0,
    can: { reschedule: false, cancel: false, join: "locked" }, prepare: [], outcomeNotes: o.notes ?? null, source: o.source ?? "web", quoteRequest: null,
    token: o.token ?? rid("mt"), confirmKey: rid("ck"), createdAt, contactKey: contactKey({ clientId: o.clientId, phone: o.phone, email: o.email }), joinUrl: `https://meet.google.com/hbz-${Math.random().toString(36).slice(2, 5)}-${Math.random().toString(36).slice(2, 6)}`,
  };
  r.startLinks = r.recommendedServiceSlugs.map(startLink);
  r.events = [{ at: new Date(createdAt).toISOString(), kind: "booked" }, { at: new Date(createdAt + MIN).toISOString(), kind: "confirmed" }];
  if (o.status === "completed") r.events.push({ at: endsAt, kind: "completed" });
  if (o.status === "no_show") r.events.push({ at: endsAt, kind: "no_show" });
  BOOKINGS.push(r);
  return r;
}
/** PLACEHOLDER(office-address) D-15: spec Sonatube/Kicukiro. */
export const OFFICE = "HEBUZA office, Sonatube — Kicukiro, Kigali";
export const maskEmail = (e: string) => e.replace(/^(.)[^@]*(@.*)$/, "$1•••$2");
const startLink = (slug: string) => {
  const s = SERVICES.find((x) => x.slug === slug);
  return { slug, name: s?.name ?? slug, href: `/apply/${slug}?draft=${rid("dr")}` };
};

{
  const soon = new Date(Math.ceil((NOW + 10 * MIN) / (5 * MIN)) * 5 * MIN);
  const soonDate = dayOf(soon.getTime());
  const soonTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kigali", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(soon);
  // Lane-F today board stays consistent: 10:30 / 11:00 / 14:00.
  seed({ type: "consult-60", adviser: "ag-eric", date: TODAY, time: "10:30", status: "confirmed", name: "Kigali Fresh Foods Ltd", clientId: "cl-kff", phone: "+250 788 555 210", email: "finance@kff.example.rw", lang: "en", mode: "office" });
  seed({ type: "intro-30", adviser: "ag-grace", date: TODAY, time: "11:00", status: "confirmed", name: "Nyamirambo Tailors Coop", clientId: "cl-nyt", phone: "+250 722 410 998", lang: "rw", mode: "phone", family: "business-training-coaching" });
  seed({ type: "consult-60", adviser: "ag-jp", date: TODAY, time: "14:00", status: "confirmed", name: "Rwandan Ltd", clientId: "cl-rwl", email: "admin@rwl.example.rw", lang: "fr", mode: "video", family: "investment-financing" });
  // Aline (client persona): one starting soon (Join opens), one upcoming, one attended with next steps, one no-show.
  seed({ type: "intro-30", adviser: "ag-eric", date: soonDate, time: soonTime, status: "confirmed", name: "Aline Uwase", clientId: "cl-aline", phone: "+250 788 123 456", email: "aline.uwase@example.rw", lang: "rw", mode: "video", family: "online-services", token: "mt_aline_soon" });
  seed({ type: "consult-60", adviser: "ag-eric", date: nextWeekday(2, 3), time: "09:00", status: "confirmed", name: "Aline Uwase", clientId: "cl-aline", phone: "+250 788 123 456", email: "aline.uwase@example.rw", lang: "rw", mode: "office", token: "mt_aline_next" });
  seed({ type: "intro-30", adviser: "ag-eric", date: addDays(TODAY, -12), time: "10:00", status: "completed", name: "Aline Uwase", clientId: "cl-aline", phone: "+250 788 123 456", lang: "rw", mode: "video",
    summary: "We agreed to register your company with RDB first, then file your first VAT declaration once you start invoicing. Bring your passport copy and the address of your office.",
    recommend: ["company-registration", "vat-declaration"], notes: "Client is ready; prefers Kinyarwanda. Follow up next week." });
  seed({ type: "consult-60", adviser: "ag-grace", date: addDays(TODAY, -30), time: "15:00", status: "no_show", name: "Aline Uwase", clientId: "cl-aline", phone: "+250 788 123 456", lang: "rw", mode: "phone" });
  // Jean Claude Habimana (lead, fr): paid video next Thursday 10:30 (Done-when persona).
  seed({ type: "consult-60", adviser: "ag-eric", date: nextWeekday(4, 2), time: "10:30", status: "confirmed", name: "Jean Claude Habimana", phone: "+32 470 12 34 56", email: "jc.habimana@example.be", lang: "fr", mode: "video", family: "investment-financing", source: "assistant", token: "mt_jc" });
  // Grace on leave that Thursday but still holding a session → alert + auto-reassign demo.
  seed({ type: "intro-30", adviser: "ag-grace", date: nextWeekday(4), time: "14:00", status: "confirmed", name: "Kigali Fresh Foods Ltd", clientId: "cl-kff", phone: "+250 788 555 210", lang: "en", mode: "office" });
  // A lead with two no-shows → prepayment for free intros (F-BKG-12).
  for (const d of [-40, -20]) seed({ type: "intro-30", adviser: "ag-jp", date: addDays(TODAY, d), time: "09:00", status: "no_show", name: "Demo Lead", phone: "+250 788 999 001", lang: "en", mode: "phone", family: "online-services" });
}

export const REQUESTS: CallbackRequest[] = [
  { id: "CB-0031", name: "Claudine M.", phone: "+250 788 410 221", phoneMasked: mask("+250 788 410 221", 3), topic: "taxes-and-business-support", preferredTimes: ["Weekdays · Morning"], language: "rw", status: "new", createdAt: new Date(NOW - 3 * H).toISOString() },
  { id: "CB-0030", name: "Olivier N.", phone: "+250 733 112 908", phoneMasked: mask("+250 733 112 908", 3), email: "olivier@example.rw", topic: "investment-financing", preferredTimes: ["Weekdays · Afternoon", "Saturday · Morning"], language: "fr", status: "new", createdAt: new Date(NOW - 20 * H).toISOString() },
  { id: "CB-0029", name: "Samuel K.", phone: "+250 722 300 441", phoneMasked: mask("+250 722 300 441", 3), topic: "online-services", preferredTimes: ["Weekdays · Evening"], language: "en", status: "scheduled", createdAt: new Date(NOW - 50 * H).toISOString(), bookingRef: "BKG-2026-0201" },
];
export const WAITLIST: { id: string; type: string; date: string; contact: string; at: number }[] = [];

// ---------------------------------------------------------------- Engine glue
const lazyNoShow = (now: number) => {
  for (const b of BOOKINGS) if (shouldAutoNoShow(b, now)) { b.status = "no_show"; b.events.push({ at: new Date(now).toISOString(), kind: "no_show", note: "auto" }); }
  for (const b of BOOKINGS) if ((b.status === "held" || b.status === "pending_payment") && b.holdExpiresAt && Date.parse(b.holdExpiresAt) < now && !b.paid) { b.status = "expired"; b.events.push({ at: new Date(now).toISOString(), kind: "expired" }); }
};
export const noShowsOf = (key: string) => BOOKINGS.filter((b) => b.contactKey === key && b.status === "no_show").length;

function input(t: ConsultationType, from: string, to: string, adviserId?: string | null, ignoreId?: string): SlotInput {
  return {
    durationMin: t.durationMin, bufferBeforeMin: t.bufferBeforeMin, bufferAfterMin: t.bufferAfterMin, minNoticeMin: t.minNoticeMin, horizonDays: t.horizonDays, maxPerDay: t.maxPerDay,
    advisers: ADVISERS.filter((a) => t.adviserIds.includes(a.id)), adviserId,
    bookings: BOOKINGS.filter((b) => b.id !== ignoreId).map((b) => ({ adviserId: b.adviser?.id ?? null, startsAt: b.startsAt, endsAt: b.endsAt, status: b.status })),
    externalBusy: ADVISERS.flatMap((a) => a.externalBusy.map((x) => ({ adviserId: a.id, ...x }))), from, to,
  };
}
export function slotsFor(t: ConsultationType, from: string, to: string, adviserId: string | null, now = Date.now()): SlotsResponse {
  lazyNoShow(now);
  const slots = computeSlots(input(t, from, to, adviserId), now);
  const next = slots[0] ? null : computeSlots(input(t, to, addDays(TODAY, t.horizonDays + 1), adviserId), now)[0]?.startsAt ?? null;
  return { tz: "Africa/Kigali", slots, nextAvailable: slots[0]?.startsAt ?? next, waitlist: true };
}

export function hold(t: ConsultationType, startsAt: string, adviserId: string | null, opts: { race?: boolean; ignoreId?: string } = {}, now = Date.now()):
  { ok: true; hold: Hold; rec: Rec } | { ok: false; status: number; errorType: string; data?: unknown } {
  lazyNoShow(now);
  const day = dayOf(startsAt);
  const inp = input(t, day, day, adviserId, opts.ignoreId);
  if (Date.parse(startsAt) < now + t.minNoticeMin * MIN || Date.parse(startsAt) > now + t.horizonDays * 24 * H) return { ok: false, status: 422, errorType: "outside_window" };
  const free = computeSlots(inp, now);
  const slot = free.find((s) => s.startsAt === startsAt);
  if (!slot || opts.race) {
    const near = computeSlots(input(t, day, addDays(day, 3), adviserId, opts.ignoreId), now).filter((s) => s.startsAt !== startsAt);
    return { ok: false, status: 409, errorType: "slot_taken", data: { nearest: nearest(near, startsAt) } };
  }
  const adviser = adviserId ?? pickAdviser(slot, inp.advisers, inp.bookings);
  const exp = new Date(now + BKG.holdMin * MIN).toISOString();
  const r: Rec = {
    ...BOOKINGS[0], id: rid("bk"), reference: "", typeSlug: t.slug, typeName: t.name, price: t.price, adviser: pubAdviser(adviser), clientId: null, leadId: null,
    contact: { name: "" }, contactFull: { name: "" }, phone: undefined, email: undefined, language: "en", startsAt, endsAt: slot.endsAt, mode: t.modes[0], location: null,
    status: "held", intakeAnswers: {}, familySlug: null, serviceSlug: null, invoiceRef: null, holdExpiresAt: exp, paid: false, rescheduleCount: 0, rescheduledFromId: null, rescheduledToRef: null,
    cancelReason: null, cancelledBy: null, clientSummary: null, recommendedServiceSlugs: [], startLinks: [], quoteRef: null, reminders: [], events: [{ at: new Date(now).toISOString(), kind: "booked" }],
    version: 1, noShowCount: 0, outcomeNotes: null, source: "web", quoteRequest: null, token: rid("mt"), confirmKey: rid("ck"), createdAt: now, contactKey: "", whatsapp: false,
    joinUrl: `https://meet.google.com/hbz-${Math.random().toString(36).slice(2, 5)}-${Math.random().toString(36).slice(2, 6)}`,
  };
  BOOKINGS.push(r);
  audit({ actor: "visitor", action: "booking.held", entity: { kind: "booking", id: r.id } });
  return { ok: true, rec: r, hold: { bookingId: r.id, holdExpiresAt: exp, adviserId: adviser, startsAt, endsAt: slot.endsAt, typeSlug: t.slug } };
}
export const byId = (id: string) => BOOKINGS.find((b) => b.id === id);
export const byRef = (r: string) => BOOKINGS.find((b) => b.reference === r);
export const byToken = (tk: string) => BOOKINGS.find((b) => b.token === tk);

/** Finalises a held booking: free → confirmed, paid → pending_payment with an invoice. */
export function confirmHeld(r: Rec, o: { name: string; phone?: string; email?: string; clientId?: string | null; intake: Record<string, unknown>; whatsapp: boolean; language: Locale; mode: Mode; family: string | null; service: string | null; source?: Rec["source"]; prepay?: boolean }, now = Date.now()) {
  r.reference = ref();
  r.contact = { name: o.name, phoneMasked: o.phone ? mask(o.phone, 3) : undefined, emailMasked: o.email ? maskEmail(o.email) : undefined };
  r.contactFull = { name: o.name, phone: o.phone, email: o.email };
  Object.assign(r, { phone: o.phone, email: o.email, clientId: o.clientId ?? null, leadId: o.clientId ? null : rid("lead"), intakeAnswers: o.intake, whatsapp: o.whatsapp, language: o.language,
    mode: o.mode, familySlug: o.family, serviceSlug: o.service, contactKey: contactKey({ clientId: o.clientId, phone: o.phone, email: o.email }), location: o.mode === "office" ? OFFICE : null, source: o.source ?? r.source });
  const price = r.price || (o.prepay ? POLICY.consultationPrice /* PLACEHOLDER(no-show-prepayment) D-21 */ : 0);
  r.price = price;
  if (price > 0) {
    r.status = "pending_payment"; r.invoiceRef = `INV-BKG-${r.reference.slice(-4)}`;
  } else {
    r.status = "confirmed"; r.holdExpiresAt = null; r.events.push({ at: new Date(now).toISOString(), kind: "confirmed" });
    r.reminders = planReminders(r.startsAt, now, o.whatsapp ? "whatsapp" : o.phone ? "sms" : "email", now);
  }
  r.version++;
  audit({ actor: o.name, action: "booking.confirmed", entity: { kind: "booking", id: r.reference } });
}
export function markPaid(r: Rec, now = Date.now()) {
  if (r.status === "expired" || (r.holdExpiresAt && Date.parse(r.holdExpiresAt) < now)) {
    // Late payment (spec §13): confirm if the slot is still free, else expire + auto refund.
    const t = typeBySlug(r.typeSlug)!;
    const still = computeSlots(input(t, dayOf(r.startsAt), dayOf(r.startsAt), r.adviser?.id ?? null, r.id), now - t.minNoticeMin * MIN).some((s) => s.startsAt === r.startsAt);
    if (!still || r.lateRefund) { r.status = "expired"; r.paid = true; r.refund = { ref: `RFD-${r.reference.slice(-4)}`, amount: r.price, kind: "refund" }; r.lateRefund = true; return; }
  }
  r.paid = true; r.status = "confirmed"; r.holdExpiresAt = null;
  r.events.push({ at: new Date(now).toISOString(), kind: "paid" }, { at: new Date(now).toISOString(), kind: "confirmed" });
  r.reminders = planReminders(r.startsAt, now, r.whatsapp ? "whatsapp" : r.phone ? "sms" : "email", now);
  r.version++;
}

/** Public/client view: strips staff fields and secrets, computes `can` (server-side, UI trusts it). */
export function view(r: Rec, actor: "client" | "staff" = "client", locale: Locale = "en", now = Date.now()): Booking | StaffBooking {
  lazyNoShow(now);
  const res = can("reschedule", r, "client", now);
  const cnl = can("cancel", r, "client", now);
  const base: Booking = {
    id: r.id, reference: r.reference, typeSlug: r.typeSlug, typeName: r.typeName, price: r.price, adviser: r.adviser, clientId: r.clientId, leadId: r.leadId, contact: r.contact,
    language: r.language, startsAt: r.startsAt, endsAt: r.endsAt, mode: r.mode, location: r.location, status: r.status, intakeAnswers: r.intakeAnswers, familySlug: r.familySlug, serviceSlug: r.serviceSlug,
    invoiceRef: r.invoiceRef, holdExpiresAt: r.holdExpiresAt, paid: r.paid, rescheduleCount: r.rescheduleCount, rescheduledFromId: r.rescheduledFromId, rescheduledToRef: r.rescheduledToRef,
    cancelReason: r.cancelReason, cancelledBy: r.cancelledBy, clientSummary: r.clientSummary, recommendedServiceSlugs: r.recommendedServiceSlugs, startLinks: r.status === "completed" ? r.startLinks : [],
    quoteRef: r.quoteRef, reminders: r.reminders, events: r.events, version: r.version, noShowCount: noShowsOf(r.contactKey), refund: r.refund ?? null,
    prepare: typeBySlug(r.typeSlug)?.prepare[locale] ?? [],
    can: { reschedule: res.ok, cancel: cnl.ok, join: r.status === "confirmed" ? joinState(r.startsAt, r.endsAt, now) : "ended", reason: !res.ok ? res.reason : !cnl.ok ? cnl.reason : undefined },
  };
  if (actor === "client") return base;
  return { ...base, outcomeNotes: r.outcomeNotes, contactFull: r.contactFull, source: r.source, quoteRequest: r.quoteRequest };
}

export function cancel(r: Rec, by: "client" | "staff", o: { reason?: string; refundChoice?: "refund" | "credit" }, now = Date.now()) {
  const out = cancelOutcome(r, by, now);
  r.status = by === "client" ? "cancelled_by_client" : "cancelled_by_staff";
  r.cancelledBy = by; r.cancelReason = o.reason ?? null; r.version++;
  if (out.refund > 0) r.refund = { ref: `RFD-${new Date(now).getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`, amount: out.refund, kind: o.refundChoice === "credit" ? "credit" : "refund" };
  r.events.push({ at: new Date(now).toISOString(), kind: "cancelled", note: o.reason });
  audit({ actor: by, action: "booking.cancelled", entity: { kind: "booking", id: r.reference }, reason: o.reason, after: { refund: r.refund ?? null } });
  return r;
}
export function reschedule(old: Rec, held: Rec, now = Date.now()) {
  held.reference = ref();
  Object.assign(held, {
    contact: old.contact, contactFull: old.contactFull, phone: old.phone, email: old.email, clientId: old.clientId, leadId: old.leadId, intakeAnswers: old.intakeAnswers, whatsapp: old.whatsapp,
    language: old.language, mode: old.mode, location: old.location, familySlug: old.familySlug, serviceSlug: old.serviceSlug, contactKey: old.contactKey, price: old.price, paid: old.paid,
    invoiceRef: old.invoiceRef, rescheduleCount: old.rescheduleCount + 1, rescheduledFromId: old.id, status: "confirmed", holdExpiresAt: null, token: old.token, source: old.source,
  });
  old.token = rid("mt_old"); // manage link follows the live booking
  held.events = [...old.events, { at: new Date(now).toISOString(), kind: "rescheduled", note: old.reference }];
  held.reminders = planReminders(held.startsAt, now, held.whatsapp ? "whatsapp" : "sms", now);
  old.status = "rescheduled"; old.rescheduledToRef = held.reference; old.version++;
  audit({ actor: "client", action: "booking.rescheduled", entity: { kind: "booking", id: old.reference }, after: { to: held.reference } });
  return held;
}

// ---------------------------------------------------------------- Staff views
export const ownerAdviser = (personaKey: string | undefined) => (personaKey === "agent" ? "ag-eric" : personaKey === "ext" ? "ag-jp" : personaKey === "sm" || personaKey === "exec" ? "sm-diane" : null);
export function adminList(q: { date?: string | null; adviser?: string | null; type?: string | null; status?: string | null; q?: string | null }, now = Date.now()): AdminBookings {
  lazyNoShow(now);
  const rows = BOOKINGS.filter((b) => b.reference && (!q.date || dayOf(b.startsAt) === q.date) && (!q.adviser || b.adviser?.id === q.adviser) && (!q.type || b.typeSlug === q.type)
    && (!q.status || b.status === q.status) && (!q.q || `${b.reference} ${b.contact.name}`.toLowerCase().includes(q.q.toLowerCase())))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const advisers = ADVISERS.map((a) => ({ id: a.id, name: a.name, deactivated: !a.active, onLeave: a.leave.some((l) => TODAY >= l.from && TODAY <= l.to),
    load: BOOKINGS.filter((b) => b.adviser?.id === a.id && ACTIVE.includes(b.status) && (!q.date || dayOf(b.startsAt) === q.date)).length }));
  const alerts = ADVISERS.map((a) => {
    const n = BOOKINGS.filter((b) => b.adviser?.id === a.id && b.status === "confirmed" && Date.parse(b.startsAt) > now && (!a.active || a.leave.some((l) => dayOf(b.startsAt) >= l.from && dayOf(b.startsAt) <= l.to))).length;
    return { adviserId: a.id, name: a.name, count: n, why: (a.active ? "leave" : "deactivated") as "leave" | "deactivated" };
  }).filter((x) => x.count > 0);
  return { bookings: rows.map((r) => view(r, "staff", "en", now) as StaffBooking), advisers, alerts };
}
export function adviserFree(adviserId: string, r: Rec, now = Date.now()) {
  const t = typeBySlug(r.typeSlug)!;
  const a = adviserOf(adviserId);
  if (!a) return false;
  const day = dayOf(r.startsAt);
  return computeSlots({ ...input(t, day, day, adviserId, r.id), advisers: [a], minNoticeMin: 0, horizonDays: 365 }, Math.min(now, Date.parse(r.startsAt) - MIN)).some((s) => s.startsAt === r.startsAt);
}
export function reassign(r: Rec, adviserId: string, reason: string, actor: string) {
  const from = r.adviser?.name;
  r.adviser = pubAdviser(adviserId); r.version++;
  r.events.push({ at: new Date().toISOString(), kind: "reassigned", note: `${from} → ${r.adviser?.name}` });
  audit({ actor, action: "booking.reassigned", entity: { kind: "booking", id: r.reference }, reason, before: { adviser: from }, after: { adviser: r.adviser?.name }, requireReason: true });
}
export function autoReassign(adviserId: string, actor: string) {
  const a = adviserOf(adviserId)!;
  const moved: string[] = []; const unresolved: string[] = [];
  for (const b of BOOKINGS.filter((b) => b.adviser?.id === adviserId && b.status === "confirmed" && Date.parse(b.startsAt) > Date.now()
    && (!a.active || a.leave.some((l) => dayOf(b.startsAt) >= l.from && dayOf(b.startsAt) <= l.to)))) {
    const t = typeBySlug(b.typeSlug)!;
    const cand = t.adviserIds.filter((id) => id !== adviserId && adviserFree(id, b));
    if (!cand.length) { unresolved.push(b.reference); continue; }
    const best = pickAdviser({ startsAt: b.startsAt, endsAt: b.endsAt, adviserIds: cand }, ADVISERS, BOOKINGS.map((x) => ({ adviserId: x.adviser?.id ?? null, startsAt: x.startsAt, endsAt: x.endsAt, status: x.status })));
    reassign(b, best, "Auto-reassign: adviser unavailable", actor);
    moved.push(b.reference);
  }
  return { moved, unresolved };
}
export function availabilityOf(id: string): Availability {
  const a = adviserOf(id)!;
  return { adviserId: id, rules: a.rules, overrides: a.overrides, leave: a.leave.map((l) => ({ ...l, label: "Approved leave" })), version: a.version };
}
export function setAvailability(id: string, body: { rules: AvailabilityRule[]; overrides?: AvailabilityOverride[] }) {
  const a = adviserOf(id)!;
  a.rules = body.rules; if (body.overrides) a.overrides = body.overrides; a.version++;
  audit({ actor: a.name, action: "availability.updated", entity: { kind: "adviser", id } });
  // Bookings now outside availability stay (not auto-cancelled) and are listed as warnings.
  const affected = BOOKINGS.filter((b) => b.adviser?.id === id && b.status === "confirmed" && Date.parse(b.startsAt) > Date.now()).filter((b) => {
    const t = typeBySlug(b.typeSlug)!;
    const day = dayOf(b.startsAt);
    return !computeSlots({ ...input(t, day, day, id, b.id), advisers: [a], minNoticeMin: 0, maxPerDay: 99, horizonDays: 365, bufferBeforeMin: 0, bufferAfterMin: 0 }, Date.parse(b.startsAt) - MIN).some((s) => s.startsAt === b.startsAt);
  });
  return affected;
}
export function analytics(): BookingAnalytics {
  const real = BOOKINGS.filter((b) => b.reference);
  const booked = real.length;
  const attended = real.filter((b) => b.status === "completed").length;
  const noShow = real.filter((b) => b.status === "no_show").length;
  const past = attended + noShow || 1;
  const count = (f: (b: Rec) => string) => Object.entries(real.reduce<Record<string, number>>((m, b) => ({ ...m, [f(b)]: (m[f(b)] ?? 0) + 1 }), {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  return {
    funnel: [{ label: "Booked", value: booked }, { label: "Attended", value: attended }, { label: "Paid work ≤ 30 d", value: real.filter((b) => b.quoteRef || b.startLinks.length).length }],
    showUp: Math.round((attended / past) * 100), noShow: Math.round((noShow / past) * 100), leadTimeDays: 3, utilisation: 41, freeToPaid: 18,
    revenue: real.filter((b) => b.paid && b.price).reduce((s, b) => s + b.price, 0),
    byType: count((b) => b.typeName.en), byAdviser: count((b) => b.adviser?.name ?? "—"), bySource: count((b) => b.source),
  };
}
export { startLink };
export type BookingRec = Rec;
export type { BookingEvent };
