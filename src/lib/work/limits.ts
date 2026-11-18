// External-agent least privilege (plan §2.8). Pure: the mock guard and the UI read the same rules.
import type { External, ServiceClearance, WorkerStatus } from "./api";

export type Act =
  | "accept"
  | "upload"
  | "download"
  | "message.client"
  | "message.team"
  | "reveal"
  | "handback"
  | "assign.member"
  | "contract.manage"
  | "payout.change";
export type Scope = {
  status: WorkerStatus;
  firmRole: "admin" | "member" | null;
  contractExpired?: boolean;
  /** per job (omit for workspace-level checks) */
  active?: boolean;
  clientLane?: boolean;
  serviceState?: ServiceClearance;
};
/** Reason keys (copy in work-common `why`). null = allowed. */
export type Why =
  | "notCleared"
  | "pending"
  | "suspended"
  | "terminated"
  | "contractExpired"
  | "serviceNotCleared"
  | "accessEnded"
  | "clientLaneOff"
  | "adminOnly";

export function why(s: Scope, act: Act): Why | null {
  if (s.status === "terminated") return "terminated";
  if (s.status === "suspended") return "suspended";
  const cleared = s.status === "cleared";
  if (act === "payout.change") return s.firmRole === "member" ? "adminOnly" : null;
  if (act === "contract.manage" || act === "assign.member")
    return s.firmRole === "member" ? "adminOnly" : cleared ? null : s.status === "pending_verification" ? "pending" : "notCleared";
  if (!cleared) return s.status === "pending_verification" ? "pending" : "notCleared";
  if (act === "accept") {
    if (s.contractExpired) return "contractExpired";
    if (s.serviceState && s.serviceState !== "cleared") return "serviceNotCleared";
    return null;
  }
  if (s.active === false) return "accessEnded";
  if (act === "upload" && s.serviceState && s.serviceState !== "cleared") return "serviceNotCleared";
  if (act === "message.client" && !s.clientLane) return "clientLaneOff";
  return null;
}
export const can = (s: Scope, act: Act) => why(s, act) === null;

/** Scope for workspace-level checks from summary.external. */
export const scopeOf = (e: External | undefined, extra: Partial<Scope> = {}): Scope => ({
  status: e?.status ?? "onboarding",
  firmRole: e?.firmRole ?? null,
  contractExpired: e?.contractState === "expired",
  ...extra,
});

// ---------------------------------------------------------------- offers: TTL in business hours (ASN)
/** PLACEHOLDER(business-hours): Mon–Fri 08:00–17:00 Africa/Kigali (UTC+2, no DST). */
const OPEN = 8,
  CLOSE = 17,
  TZ = 2;
export function addBusinessHours(fromIso: string, hours: number): string {
  let t = Date.parse(fromIso) + TZ * 3600_000; // work in Kigali wall-clock as UTC
  let left = hours * 3600_000;
  while (left > 0) {
    const d = new Date(t);
    const day = d.getUTCDay();
    const h = d.getUTCHours() + d.getUTCMinutes() / 60;
    if (day === 0 || day === 6 || h >= CLOSE) {
      d.setUTCDate(d.getUTCDate() + (day === 6 ? 2 : day === 0 ? 1 : h >= CLOSE ? (day === 5 ? 3 : 1) : 0));
      d.setUTCHours(OPEN, 0, 0, 0);
      t = d.getTime();
      continue;
    }
    if (h < OPEN) {
      d.setUTCHours(OPEN, 0, 0, 0);
      t = d.getTime();
      continue;
    }
    const step = Math.min(left, (CLOSE - h) * 3600_000);
    t += step;
    left -= step;
  }
  return new Date(t - TZ * 3600_000).toISOString();
}

// ---------------------------------------------------------------- contract reminders (WRK F-WRK-07)
export const REMINDER_MARKS = [60, 30, 7, 0] as const;
/** Days until end (ceil), and the reminder mark currently reached (60/30/7/0) or null. */
export function expiry(endIso: string | null, now = Date.now()) {
  if (!endIso) return { days: null, mark: null as number | null };
  const days = Math.ceil((Date.parse(endIso) - now) / 86_400_000);
  const mark = days < 0 ? 0 : (([...REMINDER_MARKS].reverse().find((m) => days <= m) ?? null) as number | null);
  return { days, mark };
}
