// Mirror of server/src/domain/system/incidents.ts — UI display only; the server enforces.
// Incident machine + postmortem due (plan 06 §2.10, security §11).
import type { IncidentStatus } from "./types";

export const INCIDENT_NEXT: Record<IncidentStatus, IncidentStatus[]> = {
  open: ["investigating"],
  investigating: ["mitigated", "resolved"],
  mitigated: ["resolved", "investigating"],
  resolved: ["postmortem_done"],
  postmortem_done: [],
};

/** Art. 11.5 response targets. */
export const RESPONSE_TARGET = { critical: "2 business hours", high: "4 business hours", medium: "1 business day", low: "3 business days" } as const;

/** +n business days (Mon–Fri, Africa/Kigali = UTC+2).
 * shortcut: postmortem due ignores holidays, use F-SET-05 calendar when Stage 3 exposes it. */
export function addBusinessDays(from: string, n: number): string {
  const d = new Date(Date.parse(from) + 2 * 3600_000);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return new Date(d.getTime() - 2 * 3600_000).toISOString();
}
export const postmortemDue = (resolvedAt: string) => addBusinessDays(resolvedAt, 5);

/** Backup tiers (backups §2) and restore objective. */
export const BACKUP_TIERS = [
  { tier: "hourly", keep: "48 h" }, { tier: "daily", keep: "35 d" }, { tier: "monthly", keep: "12 m" }, { tier: "yearly", keep: "7 y" },
] as const;
export const RTO_MINUTES = 240;
/** Launch gate (Art. 10.3): red until at least one passed restore drill. */
export const launchGateOpen = (drills: readonly { ok: boolean }[]) => drills.some((d) => d.ok);

/** PRV-breach default: 48 h (stricter reading, audit D / NCSA). Overridable per deployment with the
 *  `privacy.breach_notify_hours` setting. PLACEHOLDER(breach-notify-hours): confirm 48 h vs 72 h with counsel. */
export const BREACH_NOTIFY_HOURS = 48;
export type Breach = { personalData: true; notifyBy: string; notifiedAt?: string; reference?: string };
export const breachDeadline = (startedAt: string, hours = BREACH_NOTIFY_HOURS) => new Date(Date.parse(startedAt) + hours * 3600_000).toISOString();
