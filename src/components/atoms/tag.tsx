import type { ReactNode } from "react";
import { cx } from "@/shared/format";
import type { Tone } from "@/shared/domain/case-status";

// Guide §7 chips: sharp rectangles.
const TAG = {
  neutral: "bg-ink-100 text-ink-700",
  navy: "border border-navy-100 bg-navy-50 text-navy-700",
  selected: "bg-navy-700 text-white",
  new: "bg-gold-400 text-navy-950",
  featured: "bg-gold-100 text-gold-800",
  shine: "bg-grad-gold-shine text-navy-950",
  /** On dark (.theme-dark / navy) surfaces. */
  "outline-dark": "border border-white/25 text-white",
  glass: "glass border border-white/35 text-white",
  dark: "bg-ink-900 text-ink-100",
  /** White chip with hairline, e.g. over photos. */
  outline: "border border-border bg-surface text-ink-700",
} as const;
export type TagVariant = keyof typeof TAG;

export function Tag({ variant = "neutral", dot, children, className }: { variant?: TagVariant; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex h-8 items-center gap-2 rounded-pill px-3 text-small font-medium whitespace-nowrap", TAG[variant], className)}>
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Semantic badge for statuses/counts in app screens. Always pair with a word (never colour alone). */
const TONE: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  info: "bg-info-bg text-info",
  warning: "bg-warning-bg text-warning",
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
  accent: "bg-gold-400 text-navy-950",
};
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex h-6 items-center gap-1.5 rounded-pill px-2 text-eyebrow font-medium normal-case whitespace-nowrap", TONE[tone], className)}>{children}</span>;
}

/** Pipeline stage colours (guide §7 status badges, plan D12). Domain statuses map onto these by meaning. */
export type Stage = "applied" | "review" | "shortlisted" | "interview" | "offer" | "hired" | "rejected" | "hold";
export const STAGE: Record<Stage, { chip: string; dot: string }> = {
  applied: { chip: "bg-ink-100 text-ink-700", dot: "bg-ink-500" },
  review: { chip: "bg-sky-100 text-sky-800", dot: "bg-sky-600" },
  shortlisted: { chip: "bg-navy-100 text-navy-700", dot: "bg-navy-500" },
  interview: { chip: "bg-gold-100 text-gold-800", dot: "bg-gold-500" },
  offer: { chip: "border border-gold-400 bg-gold-50 text-gold-900", dot: "bg-gold-400" },
  hired: { chip: "bg-green-50 text-green-700", dot: "bg-green-600" },
  rejected: { chip: "bg-red-50 text-red-800", dot: "bg-red-600" },
  hold: { chip: "bg-ink-50 text-ink-600", dot: "bg-ink-400" },
};
/** Tone → stage, for screens that only know a Tone. */
export const TONE_STAGE: Record<Tone, Stage> = { neutral: "applied", info: "review", warning: "interview", success: "hired", danger: "rejected", accent: "offer" };

export function StageBadge({ stage, children, className }: { stage: Stage; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex h-6 items-center gap-1.5 rounded-pill px-2 text-eyebrow font-medium normal-case whitespace-nowrap", STAGE[stage].chip, className)}>
      <span aria-hidden className={cx("size-1.5 shrink-0 rounded-full", STAGE[stage].dot)} />
      {children}
    </span>
  );
}

/** Live/status dot from the hero ("Now booking…"). */
export function LiveDot({ className }: { className?: string }) {
  return <span aria-hidden className={cx("inline-block size-2 animate-pulse-dot rounded-full bg-success-icon", className)} />;
}
