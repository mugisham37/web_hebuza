"use client";
// Stage 12 procurement atoms (plan 12 §5.2). Reuse finance Amount/TONE_CLS; every pill is icon + text (BD-5).
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatDateTime, formatMoney } from "@/shared/format";
import { daysBetween } from "@/shared/procurement/rules";
import { procurementCommon, fill } from "@/content/pages/procurement-common";
import { TONE_CLS } from "@/components/atoms/finance";
import { useNow } from "@/components/atoms/agent";
import { Icon, type IconName } from "@/components/atoms/icon";
import { PROC_POLICY } from "@/shared/policy";
import type { VendorType } from "@/shared/procurement/types";

export { Amount } from "@/components/atoms/finance";
export const useP = () => procurementCommon(useI18n().locale);
type Tone = keyof typeof TONE_CLS;

export function Pill({ tone, icon, children, className, title }: { tone: Tone; icon?: IconName; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex h-6 items-center gap-1.5 rounded-pill px-2.5 text-eyebrow font-medium whitespace-nowrap m-tone", TONE_CLS[tone], className)}>
      {icon && <Icon name={icon} size={12} aria-hidden />}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- DocNo (copyable)
export type DocKind = "PR" | "PO" | "GRN" | "BL" | "VP" | "RA" | "CT" | "DP" | "V" | "ADV";
export function DocNo({ no, href, copy, className }: { kind?: DocKind; no: string; href?: string; copy?: boolean; className?: string }) {
  const p = useP();
  const { locale } = useI18n();
  const [done, setDone] = useState(false);
  const text = <span className="tabular font-medium" title={no}>{no}</span>;
  return (
    <span className={cx("inline-flex max-w-full min-w-0 items-center gap-1", className)}>
      {href ? <Link href={localHref(locale, href)} className="truncate underline-offset-4 hover:underline">{text}</Link> : <span className="truncate">{text}</span>}
      {copy && (
        <button type="button" aria-label={fill(p.copy, { no })} title={done ? p.copied : fill(p.copy, { no })}
          onClick={() => { navigator.clipboard?.writeText(no).catch(() => {}); setDone(true); setTimeout(() => setDone(false), 1500); }}
          className="flex size-6 items-center justify-center rounded-full text-fg-subtle hover:bg-navy-50 m-press">
          <Icon name={done ? "check" : "file"} size={12} aria-hidden />
        </button>
      )}
    </span>
  );
}

// ---------------------------------------------------------------- ProcPill (every machine, §2.1)
const META: Record<string, { tone: Tone; icon: IconName }> = {
  draft: { tone: "neutral", icon: "file" }, submitted: { tone: "accent", icon: "upload" }, info_requested: { tone: "warning", icon: "message" },
  approved: { tone: "success", icon: "check" }, rejected: { tone: "danger", icon: "x" }, withdrawn: { tone: "neutral", icon: "x" }, ordered: { tone: "info", icon: "briefcase" },
  issued: { tone: "accent", icon: "mail" }, partially_received: { tone: "warning", icon: "layers" }, received: { tone: "success", icon: "check" },
  closed: { tone: "neutral", icon: "lock" }, cancelled: { tone: "danger", icon: "x" },
  matched: { tone: "success", icon: "check" }, match_exception: { tone: "warning", icon: "zap" }, authorised: { tone: "info", icon: "shield" },
  partially_paid: { tone: "warning", icon: "wallet" }, paid: { tone: "success", icon: "wallet" }, disputed: { tone: "danger", icon: "message" }, void: { tone: "neutral", icon: "x" },
  active: { tone: "success", icon: "check" }, inactive: { tone: "neutral", icon: "clock" }, blocked: { tone: "danger", icon: "lock" },
  verified: { tone: "success", icon: "shield" }, unverified: { tone: "warning", icon: "lock" }, requested: { tone: "warning", icon: "clock" },
  expiring: { tone: "warning", icon: "clock" }, renewed: { tone: "info", icon: "refresh" }, terminated: { tone: "neutral", icon: "x" }, expired: { tone: "danger", icon: "clock" },
  pending_payment: { tone: "neutral", icon: "clock" }, paid_out: { tone: "info", icon: "wallet" }, held: { tone: "accent", icon: "lock" },
  return_due: { tone: "warning", icon: "refresh" }, returned: { tone: "success", icon: "check" }, partially_returned: { tone: "warning", icon: "layers" },
  forfeited: { tone: "danger", icon: "x" }, offset: { tone: "neutral", icon: "check" }, sent: { tone: "success", icon: "mail" }, failed: { tone: "danger", icon: "x" },
  scheduled: { tone: "info", icon: "calendar" }, invited: { tone: "accent", icon: "mail" }, onboarding: { tone: "warning", icon: "user" },
  cleared: { tone: "success", icon: "shield" }, suspended: { tone: "danger", icon: "lock" },
};
export type Machine = "pr" | "po" | "bill" | "vendor" | "contract" | "deposit" | "bank" | "worker" | "remittance";
export function ProcPill({ state, machine, className }: { state: string; machine?: Machine; className?: string }) {
  const p = useP();
  const m = META[state] ?? { tone: "neutral" as Tone, icon: "file" as IconName };
  return <Pill tone={m.tone} icon={m.icon} className={className}><span data-machine={machine}>{p.status[state] ?? state}</span></Pill>;
}

// ---------------------------------------------------------------- MatchDot
export type MatchDotState = "matched" | "tolerance" | "exception" | "no_po" | "pending" | "contract";
const DOT: Record<MatchDotState, { cls: string; glyph: string }> = {
  matched: { cls: "bg-success-bg text-success", glyph: "✓" }, contract: { cls: "bg-success-bg text-success", glyph: "✓" },
  tolerance: { cls: "bg-info-bg text-info", glyph: "≈" }, exception: { cls: "bg-warning-bg text-warning", glyph: "⚠" },
  no_po: { cls: "bg-ink-100 text-fg-muted", glyph: "○" }, pending: { cls: "bg-ink-100 text-fg-subtle", glyph: "…" },
};
export function MatchDot({ state, label }: { state: MatchDotState; label?: boolean }) {
  const p = useP();
  return (
    <span className="inline-flex items-center gap-1.5">
      <span role="img" aria-label={p.match[state]} title={p.match[state]} className={cx("flex size-6 items-center justify-center rounded-full text-[0.75rem] font-semibold", DOT[state].cls)}>{DOT[state].glyph}</span>
      {label && <span className="text-small">{p.match[state]}</span>}
    </span>
  );
}

// ---------------------------------------------------------------- LockChip (countdown)
/** `until` ISO → counts down; null → locked until finance verifies; past → hidden. */
export function LockChip({ until, compact }: { until: string | null | undefined; compact?: boolean }) {
  const p = useP();
  const { locale } = useI18n();
  const now = useNow();
  if (until === undefined) return null;
  if (until && now !== null && Date.parse(until) <= now) return null;
  const text = until ? fill(p.lock.until, { when: formatDateTime(until, locale) }) : p.lock.pending;
  const left = until && now !== null ? Math.max(0, Date.parse(until) - now) : null;
  const hm = left !== null ? `${Math.floor(left / 3600_000)}h ${String(Math.floor((left % 3600_000) / 60_000)).padStart(2, "0")}m` : null;
  return (
    <Pill tone="danger" icon="lock" title={text} className={cx(!compact && "h-auto min-h-6 py-0.5 whitespace-normal")}>
      {compact ? (hm ?? p.status.unverified) : <>{text}{hm && <span className="tabular opacity-80"> · {hm}</span>}</>}
    </Pill>
  );
}

// ---------------------------------------------------------------- ExpiryChip
export function ExpiryChip({ date, today, thresholds = PROC_POLICY.reminderOffsets }: { date: string; today: string; thresholds?: readonly number[] }) {
  const p = useP();
  const { locale } = useI18n();
  const n = daysBetween(today, date);
  const tone: Tone = n < 0 ? "danger" : n <= (thresholds.at(-1) ?? 7) ? "danger" : n <= (thresholds[2] ?? 30) ? "warning" : n <= (thresholds[0] ?? 90) ? "accent" : "neutral";
  return (
    <Pill tone={tone} icon={n < 0 ? "x" : "calendar"} title={formatDate(date, locale)}>
      {n < 0 ? p.expiry.expired : n === 0 ? p.expiry.today : fill(p.expiry.days, { n })}
    </Pill>
  );
}

// ---------------------------------------------------------------- BudgetBar (role=meter)
export function BudgetBar({ used, budget, adding = 0, name, compact }: { used: number; budget: number; adding?: number; name: string; compact?: boolean }) {
  const p = useP();
  const { locale } = useI18n();
  const pct = budget ? Math.round(((used + adding) * 100) / budget) : 100;
  const tone = pct > 100 ? "over" : pct >= PROC_POLICY.budgetWarnPct ? "warning" : "normal";
  const w = (x: number) => `${Math.min(100, budget ? (x * 100) / budget : 100)}%`;
  const fillCls = tone === "over" ? "bg-danger" : tone === "warning" ? "bg-warning" : "bg-success";
  return (
    <div className="grid gap-1">
      <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(pct, 100)} aria-valuetext={fill(p.budget.meter, { pct, name })}
        className={cx("relative overflow-hidden rounded-md bg-ink-100", compact ? "h-1.5" : "h-2.5")}>
        <span className={cx("absolute inset-y-0 left-0 rounded-md m-grow", fillCls)} style={{ width: w(used) }} />
        {adding > 0 && <span className={cx("absolute inset-y-0 rounded-md opacity-50 m-grow", fillCls)} style={{ left: w(used), width: `calc(${w(used + adding)} - ${w(used)})` }} />}
      </div>
      {!compact && (
        <p className="flex flex-wrap justify-between gap-x-3 text-eyebrow text-fg-muted tabular">
          <span>{fill(p.budget.used, { used: formatMoney(used + adding, "RWF", locale), budget: formatMoney(budget, "RWF", locale) })} ({pct}%)</span>
          <span className={cx(tone === "over" && "text-danger font-medium")}>
            {tone === "over" ? fill(p.budget.over, { amount: formatMoney(used + adding - budget, "RWF", locale) }) : fill(p.budget.remaining, { amount: formatMoney(budget - used - adding, "RWF", locale) })}
          </span>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- TolerancePill / VendorTypeIcon / AgeBadge
export function TolerancePill({ delta, base, within }: { delta: number; base: number; within: boolean }) {
  const p = useP();
  const { locale } = useI18n();
  const pct = base ? ((Math.abs(delta) * 100) / base).toFixed(1) : "0";
  const amount = `${delta >= 0 ? "+" : "−"}${formatMoney(Math.abs(delta), "RWF", locale)}`;
  return <Pill tone={within ? "info" : "warning"} icon={within ? "check" : "zap"}>{fill(within ? p.tolerance.within : p.tolerance.out, { amount, pct })}</Pill>;
}
const VT: Record<VendorType, IconName> = { landlord: "building", supplier: "briefcase", service_provider: "users", government_body: "shield" };
export function VendorTypeIcon({ type, withLabel }: { type: VendorType; withLabel?: boolean }) {
  const p = useP();
  return (
    <span className="inline-flex items-center gap-1.5 text-small">
      <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Icon name={VT[type]} size={14} /></span>
      {withLabel && p.vendorType[type]}
    </span>
  );
}
export function AgeBadge({ days }: { days: number }) {
  const p = useP();
  const [warn, danger] = PROC_POLICY.ageBadge;
  return <Pill tone={days > danger ? "danger" : days > warn ? "warning" : "neutral"} icon="clock">{fill(p.age.days, { n: days })}</Pill>;
}
/** Small labelled value used in summary cards. */
export function Fact({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx("grid gap-0.5", className)}>
      <dt className="text-eyebrow text-fg-subtle">{label}</dt>
      <dd className="min-w-0 text-small break-words">{children}</dd>
    </div>
  );
}
