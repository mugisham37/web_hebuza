// Mirror of server/src/domain/ops/rules.ts — UI display only; the server enforces.
// Pure ops rules shared by the UI and the server (no React, no "use client"): compliance occurrences and validation,
// auto-assign preview. The server is the authority; the UI uses the same functions to explain.
import type { Agent } from "./ranking";

export const AUTHORITIES = ["RRA", "RSSB", "RDB", "district", "other"] as const;
export type Authority = (typeof AUTHORITIES)[number];
export type Recurrence =
  | { kind: "monthly"; day: number }
  | { kind: "quarterly"; day: number }
  | { kind: "annual"; month: number; day: number }
  | { kind: "dates"; dates: string[] }; // "MM-DD"
export type DueRule = "fixed" | "next_business_day";
export type ComplianceRule = {
  id: string;
  code: string;
  authority: Authority;
  label: { rw: string; en: string; fr: string };
  recurrence: Recurrence;
  dueRule: DueRule;
  leadDays: number;
  remindOffsets: number[];
  serviceSlug: string | null;
  active: boolean;
  /** Spec §12: a tax adviser must confirm each seeded date before go-live. */
  verified: boolean;
  nextDates: string[];
  updatedAt: string;
};
export type RuleInput = Omit<
  ComplianceRule,
  "id" | "nextDates" | "updatedAt" | "verified"
>;

const MS_DAY = 86_400_000;
/** Next `n` due dates on or after `from` (YYYY-MM-DD), in UTC calendar days. */
export function nextDates(
  r: Pick<ComplianceRule, "recurrence" | "dueRule">,
  from: string,
  n = 12,
  holidays: ReadonlySet<string> = new Set(),
): string[] {
  const out: string[] = [];
  const [y0, m0] = from.split("-").map(Number);
  const rec = r.recurrence;
  for (let i = 0; out.length < n && i < 60; i++) {
    const y = y0 + Math.floor((m0 - 1 + i) / 12);
    const m = ((m0 - 1 + i) % 12) + 1;
    const days =
      rec.kind === "monthly"
        ? [rec.day]
        : rec.kind === "quarterly"
          ? [1, 4, 7, 10].includes(m)
            ? [rec.day]
            : [] // day N of the month after quarter end
          : rec.kind === "annual"
            ? m === rec.month
              ? [rec.day]
              : []
            : rec.dates
                .filter((d) => Number(d.slice(0, 2)) === m)
                .map((d) => Number(d.slice(3)));
    for (const d of [...days].sort((a, b) => a - b)) {
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      let t = Date.UTC(y, m - 1, Math.min(d, last));
      // Weekends and public holidays (compliance_holidays, sent by the server) roll to the next business day.
      if (r.dueRule === "next_business_day")
        while ([0, 6].includes(new Date(t).getUTCDay()) || holidays.has(new Date(t).toISOString().slice(0, 10))) t += MS_DAY;
      const s = new Date(t).toISOString().slice(0, 10);
      if (s >= from && out.length < n && !out.includes(s)) out.push(s);
    }
  }
  return out;
}

export type RuleErrors = Partial<
  Record<"code" | "label" | "recurrence" | "leadDays" | "remindOffsets", true>
>;
const okDay = (d: number) => Number.isInteger(d) && d >= 1 && d <= 31;
/** Field-level checks; the mock answers 422 on the same rules. */
export function validateRule(r: RuleInput): RuleErrors {
  const e: RuleErrors = {};
  if (!/^[A-Z][A-Z0-9_]{2,39}$/.test(r.code)) e.code = true;
  if (!r.label.rw.trim() || !r.label.en.trim() || !r.label.fr.trim())
    e.label = true;
  const rec = r.recurrence;
  if (
    rec.kind === "dates"
      ? !rec.dates.length ||
        rec.dates.some(
          (d) => !/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d),
        )
      : !okDay(rec.day) ||
        (rec.kind === "annual" &&
          !(Number.isInteger(rec.month) && rec.month >= 1 && rec.month <= 12))
  )
    e.recurrence = true;
  if (!Number.isInteger(r.leadDays) || r.leadDays < 0 || r.leadDays > 365)
    e.leadDays = true;
  if (
    !r.remindOffsets.length ||
    r.remindOffsets.some((o) => !Number.isInteger(o) || o > 0 || o < -90)
  )
    e.remindOffsets = true;
  return e;
}

/** Next three agents auto-assign would pick (names), honouring pool and cap. */
export function previewNext(
  r: { mode: "roundRobin" | "leastLoaded" | "skill"; pool: string[]; cap: number },
  agents: Agent[],
  slug: string,
  n = 3,
): string[] {
  const load = new Map(agents.map((a) => [a.id, a.load]));
  const pool = agents.filter((a) => r.pool.includes(a.id) && !a.onLeaveUntil);
  const out: string[] = [];
  for (let i = 0, rr = 0; i < n; i++) {
    const open = pool.filter((a) => load.get(a.id)! < Math.min(a.cap, r.cap));
    if (!open.length) break;
    const pick =
      r.mode === "roundRobin"
        ? open[rr++ % open.length]
        : r.mode === "leastLoaded"
          ? [...open].sort((a, b) => load.get(a.id)! - load.get(b.id)!)[0]
          : [...open].sort(
              (a, b) =>
                (b.skills[slug] ?? 0) - (a.skills[slug] ?? 0) ||
                load.get(a.id)! - load.get(b.id)!,
            )[0];
    out.push(pick.name);
    load.set(pick.id, load.get(pick.id)! + 1);
  }
  return out;
}
/** Co-assignment shares: total and whether they add up to exactly 100 %. */

/** ASN-08: share of the SLA used, pause-aware (deadline already carries paused time, so remove it from both sides). */
export function slaUsedPct(submittedAt: string, deadline: string, pausedMs: number, now = Date.now()): number {
  const start = Date.parse(submittedAt);
  const total = Date.parse(deadline) - start - pausedMs;
  return total > 0 ? Math.round(((now - start - pausedMs) / total) * 100) : 100;
}
/** The escalation steps reached: 80 → assignee, 100 → service manager, 150 → executive digest. */
export const SLA_STEPS = [80, 100, 150] as const;
export const slaStepsReached = (pct: number) => SLA_STEPS.filter((s) => pct >= s);
