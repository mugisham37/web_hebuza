"use client";
// Stage 3 staff atoms (board 01 v2: K1–K3, K7, K8). Small, stateless, accessible; colour is never the only signal.
import { useSyncExternalStore, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { opsCommon } from "@/content/pages/ops-common";
import { slaStatus, formatDuration, type SlaState } from "@/lib/ops/sla";
import type { Flag } from "@/lib/ops/api";
import { Badge } from "@/components/atoms/tag";
import { CASE_STATUS_META, type CaseStatus } from "@/shared/domain/case-status";

const useC = () => opsCommon(useI18n().locale);

/** Keyboard hint chip. */
export function Kbd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cx(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-pill border border-border-strong bg-white px-1.5 font-mono text-[0.72rem] leading-none text-fg-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

// ---- SLA ----
const minute = (fn: () => void) => {
  const id = setInterval(fn, 30_000);
  return () => clearInterval(id);
};
const now30 = () => Math.floor(Date.now() / 30_000) * 30_000;
const SLA_STYLE: Record<
  SlaState,
  { cls: string; icon: IconName | "pause" | "dot" }
> = {
  ok: { cls: "bg-success-bg text-success", icon: "check" },
  risk: { cls: "bg-warning-bg text-warning", icon: "dot" },
  breach: { cls: "bg-danger-bg text-danger", icon: "clock" },
  paused: { cls: "bg-ink-100 text-fg-muted", icon: "pause" },
  met: { cls: "bg-success-bg text-success", icon: "check" },
};
/** Live SLA chip in business hours: "Due in 5h 20m" / "Overdue 1d 3h" / "Paused" / "SLA met". Ticks every 30 s. */
export function SlaChip({
  due,
  paused,
  done,
  firstResponse,
  className,
}: {
  due: string | null;
  paused?: boolean;
  done?: boolean;
  firstResponse?: boolean;
  className?: string;
}) {
  const c = useC().sla;
  const now = useSyncExternalStore(minute, now30, () => null);
  if (!due) return null;
  if (now === null)
    return (
      <span
        className={cx(
          "inline-flex h-6 w-24 animate-pulse rounded-md bg-ink-100",
          className,
        )}
        aria-hidden
      />
    );
  const { state, leftMs } = slaStatus({
    due: Date.parse(due),
    now,
    paused,
    done,
  });
  const t = formatDuration(leftMs);
  const label =
    state === "paused"
      ? c.paused
      : state === "met"
        ? c.met
        : state === "breach"
          ? c.breach.replace("{t}", t)
          : (firstResponse ? c.firstResponse : c[state]).replace("{t}", t);
  const st = SLA_STYLE[state];
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 rounded-pill px-2.5 text-eyebrow font-medium whitespace-nowrap tabular",
        st.cls,
        className,
      )}
      title={c.businessHours}
      data-sla={state}
    >
      {st.icon === "dot" ? (
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-gold-400 ring-2 ring-warning/40"
        />
      ) : st.icon === "pause" ? (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-3.5"
          fill="currentColor"
        >
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      ) : (
        <Icon name={st.icon} size={13} aria-hidden />
      )}
      {label}
    </span>
  );
}

// ---- Flags, payment, priority ----
const FLAG_ICON: Record<Flag, IconName> = {
  urgent: "zap",
  vip: "sparkle",
  subscriber: "check",
  ai: "sparkle",
  partner: "building",
  duplicate: "layers",
  dedicated: "user",
};
const FLAG_CLS: Record<Flag, string> = {
  urgent: "bg-danger-bg text-danger",
  vip: "bg-gold-400 text-navy-950",
  subscriber: "bg-success-bg text-success",
  ai: "bg-info-bg text-info",
  partner: "bg-ink-100 text-ink-700",
  duplicate: "bg-warning-bg text-warning",
  dedicated: "bg-navy-100 text-navy-700",
};
export function FlagChip({
  flag,
  detail,
}: {
  flag: Flag;
  detail?: string | null;
}) {
  const c = useC().flags;
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1 rounded-pill px-2 text-eyebrow font-medium whitespace-nowrap",
        FLAG_CLS[flag],
      )}
    >
      <Icon name={FLAG_ICON[flag]} size={12} aria-hidden />
      {c[flag]}
      {detail ? <span className="opacity-75">· {detail}</span> : null}
    </span>
  );
}

const PAY_CLS: Record<string, string> = {
  paid: "bg-success-bg text-success",
  unpaid: "bg-danger-bg text-danger",
  partial: "bg-warning-bg text-warning",
  covered: "bg-info-bg text-info",
};
export function PaymentChip({ status }: { status: string }) {
  const c = useC().payment as Record<string, string>;
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center rounded-pill px-2.5 text-eyebrow font-medium whitespace-nowrap",
        PAY_CLS[status] ?? "bg-ink-100 text-fg-muted",
      )}
    >
      {c[status] ?? status}
    </span>
  );
}

export function PriorityDot({ p }: { p: 1 | 2 | 3 | 4 }) {
  const cls = ["", "bg-danger", "bg-warning", "bg-info", "bg-ink-400"][p];
  return (
    <span className="inline-flex items-center gap-1.5 text-eyebrow text-fg-muted">
      <span aria-hidden className={cx("size-2 rounded-full", cls)} />P{p}
    </span>
  );
}

// ---- People & capacity ----
/** Circular match score (0–100) with the number inside. */
export function MatchRing({
  value,
  size = 44,
}: {
  value: number;
  size?: number;
}) {
  const r = (size - 6) / 2,
    len = 2 * Math.PI * r;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${value}% match`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={4}
          className="stroke-ink-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          className={
            value >= 80
              ? "stroke-success"
              : value >= 60
                ? "stroke-navy-700"
                : "stroke-warning"
          }
          strokeDasharray={`${(len * value) / 100} ${len}`}
        />
      </svg>
      <span className="absolute text-[0.72rem] font-semibold tabular">
        {value}
      </span>
    </span>
  );
}

/** Load vs cap bar: amber above 80 %, red over cap. */
export function CapacityBar({
  load,
  cap,
  className,
}: {
  load: number;
  cap: number;
  className?: string;
}) {
  const pct = Math.min(100, (load / cap) * 100),
    over = load > cap,
    warn = load / cap >= 0.8;
  return (
    <span className={cx("inline-flex min-w-28 items-center gap-2", className)}>
      <span
        className="relative h-1.5 flex-1 overflow-hidden rounded-md bg-ink-100"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-valuenow={load}
        aria-label={`${load} of ${cap}`}
      >
        <span
          className={cx(
            "absolute inset-y-0 left-0 rounded-md",
            over ? "bg-danger" : warn ? "bg-gold-400" : "bg-navy-700",
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span
        className={cx(
          "text-eyebrow tabular",
          over ? "font-semibold text-danger" : "text-fg-muted",
        )}
      >
        {load}/{cap}
        {over && <span className="sr-only"> over capacity</span>}
      </span>
    </span>
  );
}

export function CountBadge({
  n,
  tone = "neutral",
}: {
  n: number;
  tone?: "neutral" | "attention" | "danger";
}) {
  if (!n) return null;
  return (
    <span
      className={cx(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 text-[0.7rem] font-semibold tabular",
        tone === "attention"
          ? "bg-gold-400 text-navy-950"
          : tone === "danger"
            ? "bg-danger text-white"
            : "bg-navy-700 text-white",
      )}
    >
      {n}
    </span>
  );
}

export function RoleTag({
  external,
  location,
}: {
  external?: boolean;
  location?: string;
}) {
  const c = useC().role;
  return (
    <span
      className={cx(
        "inline-flex h-5 items-center rounded-pill px-2 text-[0.7rem] font-medium",
        external ? "bg-warning-bg text-warning" : "bg-info-bg text-info",
      )}
    >
      {external ? c.external : c.internal}
      {external && location ? ` · ${location}` : ""}
    </span>
  );
}

export type OfferState =
  "sent" | "viewed" | "accepted" | "declined" | "timeout";
export function OfferPill({ state }: { state: OfferState }) {
  const c = useC().offer;
  const cls = {
    sent: "bg-info-bg text-info",
    viewed: "bg-ink-100 text-ink-700",
    accepted: "bg-success-bg text-success",
    declined: "bg-danger-bg text-danger",
    timeout: "bg-warning-bg text-warning",
  }[state];
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center rounded-pill px-2.5 text-eyebrow font-medium",
        cls,
      )}
    >
      {c[state]}
    </span>
  );
}

/** "Internal — not visible to client" with a lock. */
export function LockLabel({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 text-eyebrow font-medium text-warning",
        className,
      )}
    >
      <Icon name="lock" size={12} aria-hidden />
      {useC().internal}
    </span>
  );
}

export type Precheck =
  "legible" | "expires" | "nameMatch" | "mismatch" | "blurry";
export function PrecheckBadge({
  kind,
  detail,
}: {
  kind: Precheck;
  detail?: string;
}) {
  const c = useC().precheck;
  const bad = kind === "mismatch" || kind === "blurry";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 text-eyebrow",
        bad
          ? "text-danger"
          : kind === "expires"
            ? "text-fg-muted"
            : "text-success",
      )}
    >
      <Icon
        name={bad ? "x" : kind === "expires" ? "calendar" : "check"}
        size={12}
        aria-hidden
      />
      {c[kind].replace("{d}", detail ?? "")}
    </span>
  );
}

/** Mini sparkline (inline SVG, no chart lib). */
export function Sparkline({
  values,
  className,
  label,
}: {
  values: number[];
  className?: string;
  label?: string;
}) {
  if (values.length < 2) return null;
  const w = 64,
    h = 20,
    max = Math.max(...values, 1),
    min = Math.min(...values, 0);
  const pts = values
    .map(
      (v, i) =>
        `${(i / (values.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * (h - 2) - 1}`,
    )
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className={cx("overflow-visible", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Staff-facing status pill: canonical staff labels (not the client's "your documents" wording), sub-status as a second line. */
export function OpsStatus({ status, sub }: { status: CaseStatus; sub?: string | null }) {
  const c = useC().status;
  return (
    <span className="inline-grid justify-items-start gap-0.5">
      <Badge tone={CASE_STATUS_META[status].tone}>{c[status]}</Badge>
      {sub && <span className="max-w-48 truncate pl-1 text-eyebrow text-fg-subtle">{sub}</span>}
    </span>
  );
}
