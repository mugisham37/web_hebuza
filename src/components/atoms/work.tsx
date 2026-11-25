"use client";
// Stage 8 external-agent atoms (plan §5.2, board 01 XK1–XK7). Reuse Stage 3/4 atoms first; these are the deltas.
import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { useToast } from "@/components/atoms/toast";
import { workCommon, fill } from "@/content/pages/work-common";
import { workKeys, type WorkerStatus } from "@/lib/work/api";
import { expiry } from "@/lib/work/limits";
import type { Rate } from "@/lib/agent/money";

export const useW = () => workCommon(useI18n().locale);

const chip = "inline-flex h-7 items-center gap-1.5 rounded-pill px-2.5 text-eyebrow font-medium normal-case whitespace-nowrap";

export function ExternalBadge({ className }: { className?: string }) {
  const w = useW();
  return <span className={cx(chip, "bg-navy-100 text-navy-700", className)}>{w.external}</span>;
}

const STATUS: Record<WorkerStatus, { icon: IconName; cls: string }> = {
  cleared: { icon: "check", cls: "bg-success-bg text-success" },
  pending_verification: { icon: "clock", cls: "bg-warning-bg text-warning" },
  changes_requested: { icon: "x", cls: "bg-danger-bg text-danger" },
  onboarding: { icon: "lock", cls: "bg-ink-100 text-ink-700" },
  suspended: { icon: "lock", cls: "bg-danger-bg text-danger" },
  terminated: { icon: "x", cls: "bg-navy-700 text-white" },
};
/** XK1: one status chip, icon + text (never colour alone). */
export function WorkerStatusChip({ status, className }: { status: WorkerStatus; className?: string }) {
  const w = useW();
  const s = STATUS[status];
  return (
    <span className={cx(chip, s.cls, "m-tone", className)} title={w.statusHint[status]}>
      <Icon name={s.icon} size={13} aria-hidden />
      {w.status[status]}
    </span>
  );
}

/** XK2 "Shared with you" / "Not shared". */
export function SharedChip({ shared }: { shared: boolean }) {
  const w = useW();
  return shared ? (
    <span className={cx(chip, "h-6 bg-success-bg text-success")}>
      <Icon name="check" size={12} aria-hidden />
      {w.shared}
    </span>
  ) : (
    <span className={cx(chip, "h-6 bg-ink-100 text-fg-muted")}>
      <Icon name="lock" size={12} aria-hidden />
      {w.notShared}
    </span>
  );
}

/** XK2 "N documents not shared with you" + Request access. */
export function LockedCount({ n, onRequest }: { n: number; onRequest?: () => void }) {
  const w = useW();
  if (!n) return null;
  const text = n === 1 ? w.lockedCountOne : fill(w.lockedCount, { n });
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-bg-subtle px-4 py-3 text-small">
      <Icon name="lock" size={16} aria-hidden className="text-fg-muted" />
      <span className="flex-1">{text}</span>
      {onRequest && (
        <button type="button" onClick={onRequest} className="font-medium text-navy-700 underline underline-offset-4" aria-label={`${w.requestAccess} — ${text}`}>
          {w.requestAccess}
        </button>
      )}
    </div>
  );
}

/** XK7 evidence line: time · IP · short sha256 + copy. */
export function EvidenceLine({ signedAt, ip, sha, compact }: { signedAt: string; ip: string; sha: string; compact?: boolean }) {
  const w = useW();
  const { locale } = useI18n();
  const toast = useToast();
  const d = new Intl.DateTimeFormat(locale === "rw" ? "en-GB" : locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kigali" }).format(new Date(signedAt));
  return (
    <p className={cx("flex flex-wrap items-center gap-2 text-eyebrow text-fg-muted m-pop", compact && "text-[0.7rem]")}>
      <Icon name="check" size={13} aria-hidden className="text-success" />
      <span>
        <time dateTime={signedAt}>{fill(w.sign.evidence, { d, ip, sha: `${sha.slice(0, 8)}…` })}</time>
      </span>
      <button
        type="button"
        className="rounded-md bg-ink-100 px-2 py-0.5 hover:bg-ink-200"
        onClick={() => navigator.clipboard?.writeText(sha).then(() => toast({ title: w.sign.copied, tone: "success" }))}
      >
        {w.sign.copySha}
      </button>
    </p>
  );
}

/** XK7 scroll-to-read meter. */
export function ReadMeter({ pct }: { pct: number }) {
  const w = useW();
  const p = Math.round(Math.min(100, Math.max(0, pct)));
  return (
    <div>
      <p className="mb-1.5 flex justify-between text-small">
        <span>{p >= 100 ? w.sign.read : fill(w.sign.readPct, { p: 100 })}</span>
        <span className="tabular text-fg-muted">{p}%</span>
      </p>
      <div role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={fill(w.sign.readPct, { p: 100 })} className="h-2 overflow-hidden rounded-md bg-ink-100">
        <div className="h-full rounded-md bg-navy-700 transition-[width] duration-(--dur-2)" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

/** XK3 diagonal watermark over a viewer. Static (never animated). */
export function WatermarkOverlay({ name, refId, at }: { name: string; refId: string; at: string }) {
  const w = useW();
  const text = `${name} · ${refId} · ${new Date(at).toLocaleString("en-GB", { timeZone: "Africa/Kigali", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
  return (
    <>
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full text-fg" style={{ opacity: 0.12 }}>
        <defs>
          <pattern id="wm" width="420" height="160" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
            <text x="0" y="60" fontSize="18" fontWeight="600" fill="currentColor">{text}</text>
            <text x="-210" y="140" fontSize="18" fontWeight="600" fill="currentColor">{text}</text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wm)" />
      </svg>
      <span className="sr-only">{w.watermarkSr}</span>
    </>
  );
}

export function RateLabel({ rate }: { rate: Rate }) {
  const w = useW();
  return (
    <span className={cx(chip, "h-6 bg-ink-100 text-ink-700")}>
      {rate.flat !== undefined ? w.rate.flat : fill(w.rate.pct, { p: (rate.bps ?? 0) / 100 })}
    </span>
  );
}

/** 60/30/7/0 tones; text always includes the days. */
export function ExpiryChip({ date }: { date: string | null }) {
  const w = useW();
  const { days, mark } = expiry(date);
  if (days === null) return <span className={cx(chip, "bg-ink-100")}>{w.expiry.none}</span>;
  const text = days < 0 ? fill(w.expiry.expired, { n: -days }) : days === 0 ? w.expiry.today : days === 1 ? w.expiry.one : fill(w.expiry.days, { n: days });
  const cls = days <= 0 ? "bg-danger-bg text-danger" : mark === 7 ? "bg-danger-bg text-danger" : mark === 30 ? "bg-warning-bg text-warning" : mark === 60 ? "bg-info-bg text-info" : "bg-success-bg text-success";
  return (
    <span className={cx(chip, cls, "m-tone")}>
      <Icon name="clock" size={13} aria-hidden />
      {text}
    </span>
  );
}

export function FirmRoleTag({ role }: { role: "admin" | "member" }) {
  const w = useW();
  return <span className={cx(chip, "h-6", role === "admin" ? "bg-navy-700 text-white" : "bg-ink-100 text-ink-700")}>{w.firmRole[role]}</span>;
}

/** Explains a disabled control (plan §4 permission-denied: never a blank). */
export function WhyNote({ children, action, tone = "lavender" }: { children: ReactNode; action?: ReactNode; tone?: "lavender" | "danger" | "warning" }) {
  return (
    <p role="note" className={cx("flex flex-wrap items-center gap-2 rounded-md px-3 py-2 text-small", tone === "danger" ? "bg-danger-bg text-danger" : tone === "warning" ? "bg-warning-bg" : "bg-bg-tint")}>
      <Icon name="lock" size={14} aria-hidden />
      <span className="flex-1">{children}</span>
      {action}
    </p>
  );
}

