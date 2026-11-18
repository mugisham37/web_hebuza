// SLA maths in business hours (spec: service-request-lifecycle §SLA, assignment-and-workload F-ASN-08).
// Kigali is UTC+2 with no daylight saving, so a fixed offset is exact.
const OFFSET_MS = 2 * 3600_000;
const DAY_MS = 86_400_000;
export const BUSINESS = { startHour: 8, endHour: 17, days: [1, 2, 3, 4, 5] }; // Mon–Fri 08:00–17:00

/** Public holidays (YYYY-MM-DD, Kigali). shortcut: static 2026 list, load from /api/admin/settings when exposed. */
export const HOLIDAYS_2026 = new Set([
  "2026-01-01",
  "2026-01-02",
  "2026-02-01",
  "2026-04-03",
  "2026-04-06",
  "2026-04-07",
  "2026-05-01",
  "2026-07-01",
  "2026-07-04",
  "2026-08-07",
  "2026-08-15",
  "2026-12-25",
  "2026-12-26",
]);

const local = (t: number) => new Date(t + OFFSET_MS); // read with getUTC* to get Kigali wall time
const dayKey = (t: number) => local(t).toISOString().slice(0, 10);
const isWorkday = (t: number, holidays: Set<string>) =>
  BUSINESS.days.includes(local(t).getUTCDay()) && !holidays.has(dayKey(t));
/** UTC ms of Kigali midnight for the day containing t. */
const dayStart = (t: number) =>
  Math.floor((t + OFFSET_MS) / DAY_MS) * DAY_MS - OFFSET_MS;

/** Business milliseconds between a and b (b ≥ a). */
export function businessMsBetween(
  a: number,
  b: number,
  holidays = HOLIDAYS_2026,
): number {
  if (b <= a) return 0;
  let total = 0;
  for (let d = dayStart(a); d < b; d += DAY_MS) {
    if (!isWorkday(d + 12 * 3600_000, holidays)) continue;
    const open = d + BUSINESS.startHour * 3600_000,
      close = d + BUSINESS.endHour * 3600_000;
    total += Math.max(0, Math.min(close, b) - Math.max(open, a));
  }
  return total;
}

/** The instant reached after `ms` business milliseconds from `start`. */
export function addBusinessMs(
  start: number,
  ms: number,
  holidays = HOLIDAYS_2026,
): number {
  let left = ms;
  for (let d = dayStart(start); ; d += DAY_MS) {
    if (!isWorkday(d + 12 * 3600_000, holidays)) continue;
    const open = Math.max(d + BUSINESS.startHour * 3600_000, start),
      close = d + BUSINESS.endHour * 3600_000;
    if (open >= close) continue;
    if (close - open >= left) return open + left;
    left -= close - open;
  }
}

export type SlaState = "ok" | "risk" | "breach" | "paused" | "met";
export const AT_RISK_MS = 24 * 3600_000; // wall-clock, as escalation T−24h is wall-clock

/** State + business time left (negative = overdue) for a due instant. */
export function slaStatus({
  due,
  now,
  paused,
  done,
}: {
  due: number;
  now: number;
  paused?: boolean;
  done?: boolean;
}): { state: SlaState; leftMs: number } {
  if (done) return { state: "met", leftMs: 0 };
  const leftMs =
    due >= now ? businessMsBetween(now, due) : -businessMsBetween(due, now);
  if (paused) return { state: "paused", leftMs };
  if (now > due) return { state: "breach", leftMs };
  return { state: due - now <= AT_RISK_MS ? "risk" : "ok", leftMs };
}

/** Escalation ladder instants (T−24h warn assignee, T0 manager, T+48h senior digest). */
export const escalations = (due: number) => [
  { step: "warn" as const, at: due - 24 * 3600_000 },
  { step: "manager" as const, at: due },
  { step: "senior" as const, at: due + 48 * 3600_000 },
];

/** Compact duration: "2d 4h", "5h 20m", "45m" (business days = 9 h). */
export function formatDuration(
  ms: number,
  businessDay = (BUSINESS.endHour - BUSINESS.startHour) * 3600_000,
): string {
  const m = Math.round(Math.abs(ms) / 60_000);
  const d = Math.floor((m * 60_000) / businessDay),
    h = Math.floor((m - (d * businessDay) / 60_000) / 60),
    min = m % 60;
  return d ? (h ? `${d}d ${h}h` : `${d}d`) : h ? (min ? `${h}h ${min}m` : `${h}h`) : `${min}m`;
}
