// Mirror of server/src/domain/booking/rules.ts — UI display only; the server enforces.
// Pure booking rules (plan 11 §2): Kigali time helpers, slot engine, policy, machine guards, reminders, join window.
// No React. All instants are UTC ISO; wall-clock maths goes through Intl with the zone, never "+2".
import { TIME_ZONE } from "@/shared/format";
import type { Locale } from "@/shared/i18n/config";
import type { AvailabilityOverride, AvailabilityRule, Booking, BookingBlock, BookingStatus, JoinState, ReminderEntry, Slot } from "@/shared/booking/types";

const MIN = 60_000;
const H = 60 * MIN;
const D = 24 * H;
export const BKG = {
  /** spec F-BKG-03 */ holdMin: 10, gridMin: 15,
  /** spec F-BKG-09 (D-2) */ cutoffH: 12, maxReschedules: 2,
  /** spec F-BKG-07 */ joinBeforeMin: 15,
  /** spec F-BKG-12 */ autoNoShowMin: 15, noShowLimit: 2,
  /** spec NTF quiet hours 21:00–07:00 Kigali */ quiet: [21, 7] as const,
};

// ---------------------------------------------------------------- Time zone helpers
function offsetMin(tz: string, utcMs: number) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(utcMs / MIN) * MIN) / MIN;
}
/** "YYYY-MM-DD" of an instant in `tz`. */
export function dayOf(v: string | number, tz = TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(v));
}
/** Minutes since local midnight in `tz`. */
export function minuteOf(v: string | number, tz = TIME_ZONE) {
  const ms = new Date(v).getTime();
  const local = ms + offsetMin(tz, ms) * MIN;
  return Math.floor((((local % D) + D) % D) / MIN);
}
/** Instant for a wall-clock date + "HH:MM" in `tz`. */
export function at(date: string, hm: string, tz = TIME_ZONE) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = hm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  return new Date(guess - offsetMin(tz, guess) * MIN).toISOString();
}
export const hm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
export const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T12:00:00Z`) + n * D).toISOString().slice(0, 10);
export const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

export function formatTime(v: string, locale: Locale, tz = TIME_ZONE) {
  return new Intl.DateTimeFormat(locale === "rw" ? "en-GB" : locale, { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(v));
}
export function formatDay(v: string, locale: Locale, tz = TIME_ZONE, long = false) {
  const lc = locale === "rw" ? "en-GB" : locale;
  return new Intl.DateTimeFormat(lc, { timeZone: tz, weekday: long ? "long" : "short", day: "numeric", month: long ? "long" : "short", year: long ? "numeric" : undefined }).format(new Date(v));
}
export const formatSlot = (v: string, locale: Locale, tz = TIME_ZONE) => `${formatDay(v, locale, tz)} · ${formatTime(v, locale, tz)}`;
export const viewerTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return TIME_ZONE; } };

// ---------------------------------------------------------------- Slot engine (§2.3)
type Interval = [number, number];
const subtract = (free: Interval[], cut: Interval): Interval[] =>
  free.flatMap(([a, b]) => (cut[1] <= a || cut[0] >= b ? [[a, b] as Interval] : ([[a, cut[0]], [cut[1], b]] as Interval[]).filter(([x, y]) => y > x)));

export type SlotAdviser = { id: string; priority: number; rules: AvailabilityRule[]; overrides: AvailabilityOverride[]; leave: { from: string; to: string }[]; active: boolean };
export type SlotBooking = { adviserId: string | null; startsAt: string; endsAt: string; status: BookingStatus };
export type SlotInput = {
  durationMin: number; bufferBeforeMin: number; bufferAfterMin: number; minNoticeMin: number; horizonDays: number; maxPerDay: number;
  advisers: SlotAdviser[]; bookings: SlotBooking[]; externalBusy: { adviserId: string; from: string; to: string }[];
  from: string; to: string; adviserId?: string | null;
};
export const ACTIVE: BookingStatus[] = ["held", "pending_payment", "confirmed"];

/** Free intervals of one adviser on one Kigali date (ms). */
export function freeFor(a: SlotAdviser, date: string, inp: Pick<SlotInput, "bookings" | "externalBusy" | "bufferBeforeMin" | "bufferAfterMin">): Interval[] {
  if (!a.active || a.leave.some((l) => date >= l.from && date <= l.to)) return [];
  const ov = a.overrides.filter((o) => o.date === date);
  if (ov.some((o) => o.kind === "blocked" && !o.start)) return [];
  let free: Interval[] = [
    ...a.rules.filter((r) => r.weekday === weekdayOf(date)),
    ...ov.filter((o) => o.kind === "extra" && o.start && o.end).map((o) => ({ start: o.start!, end: o.end! })),
  ].map((r) => [Date.parse(at(date, r.start)), Date.parse(at(date, r.end))] as Interval);
  for (const o of ov.filter((o) => o.kind === "blocked" && o.start && o.end)) free = subtract(free, [Date.parse(at(date, o.start!)), Date.parse(at(date, o.end!))]);
  for (const b of inp.bookings.filter((b) => b.adviserId === a.id && ACTIVE.includes(b.status)))
    free = subtract(free, [Date.parse(b.startsAt) - inp.bufferBeforeMin * MIN, Date.parse(b.endsAt) + inp.bufferAfterMin * MIN]);
  for (const x of inp.externalBusy.filter((x) => x.adviserId === a.id)) free = subtract(free, [Date.parse(x.from), Date.parse(x.to)]);
  return free;
}

export function computeSlots(inp: SlotInput, now: number): Slot[] {
  const out: Slot[] = [];
  const dur = inp.durationMin * MIN;
  const earliest = now + inp.minNoticeMin * MIN;
  const latest = now + inp.horizonDays * D;
  const advisers = inp.advisers.filter((a) => !inp.adviserId || a.id === inp.adviserId);
  for (let date = inp.from; date <= inp.to; date = addDays(date, 1)) {
    const byStart = new Map<number, string[]>();
    for (const a of advisers) {
      const count = inp.bookings.filter((b) => b.adviserId === a.id && ACTIVE.includes(b.status) && dayOf(b.startsAt) === date).length;
      if (count >= inp.maxPerDay) continue;
      for (const [s, e] of freeFor(a, date, inp)) {
        const grid = BKG.gridMin * MIN;
        for (let t = Math.ceil(s / grid) * grid; t + dur <= e; t += grid) {
          if (t < earliest || t > latest) continue;
          byStart.set(t, [...(byStart.get(t) ?? []), a.id]);
        }
      }
    }
    for (const [t, ids] of [...byStart].sort((x, y) => x[0] - y[0])) out.push({ startsAt: new Date(t).toISOString(), endsAt: new Date(t + dur).toISOString(), adviserIds: ids });
  }
  return out;
}

/** "Any adviser": least-loaded that day, tie → priority (lower first). */
export function pickAdviser(slot: Slot, advisers: SlotAdviser[], bookings: SlotBooking[]): string {
  const day = dayOf(slot.startsAt);
  const load = (id: string) => bookings.filter((b) => b.adviserId === id && ACTIVE.includes(b.status) && dayOf(b.startsAt) === day).length;
  const prio = (id: string) => advisers.find((a) => a.id === id)?.priority ?? 99;
  return [...slot.adviserIds].sort((a, b) => load(a) - load(b) || prio(a) - prio(b))[0];
}

/** Nearest n free slots to a wanted start (409 slot_taken body, V5.4). */
export const nearest = (slots: Slot[], wanted: string, n = 3) =>
  [...slots].sort((a, b) => Math.abs(Date.parse(a.startsAt) - Date.parse(wanted)) - Math.abs(Date.parse(b.startsAt) - Date.parse(wanted))).slice(0, n)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

// ---------------------------------------------------------------- Policy (§2.4) and machine (§2.1)
export const cutoffAt = (startsAt: string, cutoffH: number = BKG.cutoffH) => Date.parse(startsAt) - cutoffH * H;

/** Refund is all-or-nothing, so no rounding exists. */
export function cancelOutcome(b: { price: number; startsAt: string; paid: boolean }, by: "client" | "staff", now: number, cutoffH: number = BKG.cutoffH) {
  if (!b.paid || b.price === 0) return { refund: 0, creditOption: false, forfeited: false, allowed: by === "staff" || now < cutoffAt(b.startsAt, cutoffH) };
  if (by === "staff") return { refund: b.price, creditOption: true, forfeited: false, allowed: true };
  const before = now < cutoffAt(b.startsAt, cutoffH);
  return { refund: before ? b.price : 0, creditOption: before, forfeited: !before, allowed: true };
}

export const TERMINAL: BookingStatus[] = ["rescheduled", "cancelled_by_client", "cancelled_by_staff", "completed", "no_show", "expired"];
export type BookingAction = "reschedule" | "cancel" | "outcome";
export function can(action: BookingAction, b: Pick<Booking, "status" | "startsAt" | "rescheduleCount" | "paid" | "price">, actor: "client" | "staff", now: number, reason?: string):
  { ok: true } | { ok: false; reason: BookingBlock } {
  if (action === "outcome") {
    if (b.status !== "confirmed") return { ok: false, reason: "terminal" };
    return now >= Date.parse(b.startsAt) ? { ok: true } : { ok: false, reason: "too_early_outcome" };
  }
  if (TERMINAL.includes(b.status) || b.status === "expired") return { ok: false, reason: "terminal" };
  if (actor === "staff") return reason?.trim() ? { ok: true } : { ok: false, reason: "reason_required" };
  if (b.status !== "confirmed") return { ok: false, reason: "terminal" };
  if (action === "reschedule" && b.rescheduleCount >= BKG.maxReschedules) return { ok: false, reason: "reschedule_limit" };
  // Paid client cancels after cutoff are allowed (forfeit, D-2); free ones are not (plan §2.4 row 4).
  if (now >= cutoffAt(b.startsAt) && (action === "reschedule" || !b.paid)) return { ok: false, reason: "past_cutoff" };
  return { ok: true };
}
export const shouldAutoNoShow = (b: Pick<Booking, "status" | "endsAt">, now: number) => b.status === "confirmed" && now > Date.parse(b.endsAt) + BKG.autoNoShowMin * MIN;

/** Adapter for Stage 3 lane-F code (scheduled|attended|no_show|cancelled) until it migrates (T-2). */
export const toOpsStatus = (s: BookingStatus) =>
  s === "completed" ? "attended" : s === "no_show" ? "no_show" : s.startsWith("cancelled") || s === "expired" || s === "rescheduled" ? "cancelled" : "scheduled";

// ---------------------------------------------------------------- Reminders (§2.5) and join window (§2.6)
export function planReminders(startsAt: string, bookedAt: number, channel: ReminderEntry["channel"], now: number): ReminderEntry[] {
  const s = Date.parse(startsAt);
  const status = (t: number): ReminderEntry["status"] => (t <= now ? "sent" : "planned");
  const out: ReminderEntry[] = [{ kind: "confirmation", at: new Date(bookedAt).toISOString(), channel, status: "sent" }];
  let t24 = s - D;
  if (t24 >= bookedAt) {
    const m = minuteOf(t24);
    const [qs, qe] = BKG.quiet;
    let deferred = false;
    if (m >= qs * 60) { t24 = Date.parse(at(addDays(dayOf(t24), 1), hm(qe * 60))); deferred = true; }
    else if (m < qe * 60) { t24 = Date.parse(at(dayOf(t24), hm(qe * 60))); deferred = true; }
    if (t24 < s) out.push({ kind: "24h", at: new Date(t24).toISOString(), channel, status: t24 <= now ? "sent" : deferred ? "deferred" : "planned" });
  } else out.push({ kind: "24h", at: new Date(t24).toISOString(), channel, status: "skipped" });
  // D-9: 1 h and adviser 15 min are time-critical, never deferred. PLACEHOLDER(reminder-quiet-hours-1h)
  out.push({ kind: "1h", at: new Date(s - H).toISOString(), channel, status: status(s - H) });
  out.push({ kind: "adviser_15m", at: new Date(s - 15 * MIN).toISOString(), channel: "email", status: status(s - 15 * MIN) });
  return out;
}
export function joinState(startsAt: string, endsAt: string, now: number): JoinState {
  if (now < Date.parse(startsAt) - BKG.joinBeforeMin * MIN) return "locked";
  return now > Date.parse(endsAt) ? "ended" : "open";
}
export const joinOpensAt = (startsAt: string) => new Date(Date.parse(startsAt) - BKG.joinBeforeMin * MIN).toISOString();

// ---------------------------------------------------------------- Calendar files
const icsStamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export function icsFor(b: { reference: string; title: string; startsAt: string; endsAt: string; location: string | null }) {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HEBUZA//Bookings//EN", "BEGIN:VEVENT", `UID:${b.reference}@hebuza`, `DTSTAMP:${icsStamp(new Date().toISOString())}`,
    `DTSTART:${icsStamp(b.startsAt)}`, `DTEND:${icsStamp(b.endsAt)}`, `SUMMARY:${b.title} (${b.reference})`, b.location ? `LOCATION:${b.location}` : "", "END:VEVENT", "END:VCALENDAR"]
    .filter(Boolean).join("\r\n");
}
export const googleCalLink = (b: { reference: string; title: string; startsAt: string; endsAt: string; location: string | null }) =>
  `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${b.title} (${b.reference})`)}&dates=${icsStamp(b.startsAt)}/${icsStamp(b.endsAt)}${b.location ? `&location=${encodeURIComponent(b.location)}` : ""}`;

/** Phone: +250 7xx xxx xxx (local 07… or 7… accepted), or any international +… when abroad. */
export const isPhone = (v: string, intl = false) => {
  const d = v.replace(/[\s-]/g, "");
  return /^(\+?250|0)?7[2389]\d{7}$/.test(d) || (intl && /^\+\d{8,15}$/.test(d));
};
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
