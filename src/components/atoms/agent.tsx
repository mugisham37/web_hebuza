"use client";
// Stage 4 agent atoms (plan §3.1, board 01 AK1–AK7). Reuse ops atoms (Kbd, SlaChip, FlagChip, CountBadge, Sparkline,
// KpiTile, OpsStatus, CopyRef) directly — these are only the agent-specific pieces. Every atom: text + icon, never colour alone.
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatMoney } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { agentCommon, fill } from "@/content/pages/agent-common";
import { urgency, compactLeft, type Urgency } from "@/shared/agent/core";
import type { MoneyState } from "@/lib/agent/money";

export const useA = () => agentCommon(useI18n().locale);

// ---------------------------------------------------------------- clock (pure render: time comes from a store)
const tick = (fn: () => void) => {
  const id = setInterval(fn, 30_000);
  return () => clearInterval(id);
};
const now30 = () => Math.floor(Date.now() / 30_000) * 30_000;
/** Current time rounded to 30 s, null during SSR/hydration (render a placeholder then). */
export const useNow = () => useSyncExternalStore(tick, now30, () => null);

const URG: Record<Urgency, string> = {
  normal: "bg-ink-100 text-ink-700",
  soon: "bg-warning-bg text-warning",
  critical: "bg-danger-bg text-danger",
  expired: "bg-ink-100 text-fg-muted line-through decoration-1",
};

/** AK1 live countdown pill. kind=respond ("Respond within 3h 12m") | left ("3h 12m left") | due ("Due in 2d"). */
export function Countdown({
  to,
  kind = "left",
  compact,
  className,
}: {
  to: string;
  kind?: "respond" | "left" | "due";
  compact?: boolean;
  className?: string;
}) {
  const a = useA();
  const now = useNow();
  if (now === null)
    return (
      <span
        aria-hidden
        className={cx(
          "inline-block h-6 w-20 rounded-none m-shimmer",
          className,
        )}
      />
    );
  const ms = Date.parse(to) - now;
  const u = urgency(ms);
  const t = compactLeft(Math.abs(ms));
  const text =
    u === "expired"
      ? kind === "due"
        ? fill(a.urgency.overdue, { t })
        : a.urgency.expired
      : compact
        ? t
        : fill(
            kind === "respond"
              ? a.urgency.respond
              : kind === "due"
                ? a.urgency.due
                : a.urgency.left,
            { t },
          );
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 rounded-none px-2.5 text-eyebrow font-medium whitespace-nowrap tabular m-tone",
        // A missed deadline is urgent (red); only an expired offer is struck through.
        u === "expired" && kind === "due" ? URG.critical : URG[u],
        className,
      )}
    >
      <Icon name="clock" size={12} aria-hidden />
      <time dateTime={to}>{text}</time>
    </span>
  );
}

// ---------------------------------------------------------------- money
const MONEY: Record<MoneyState, { cls: string; icon: IconName }> = {
  invoiced: { cls: "bg-ink-100 text-ink-700", icon: "file" },
  collected: { cls: "bg-ink-100 text-ink-700", icon: "wallet" },
  allocated: { cls: "bg-navy-50 text-navy-700", icon: "layers" },
  approved: { cls: "bg-info-bg text-info", icon: "check" },
  scheduled: { cls: "bg-warning-bg text-warning", icon: "calendar" },
  paid: { cls: "bg-success-bg text-success", icon: "wallet" },
  deducted: { cls: "bg-danger-bg text-danger", icon: "minus" },
  adjusted: { cls: "bg-ink-100 text-ink-700", icon: "refresh" },
};
/** AK2 money-state pill. Colours are tokens; the same map drives the earnings chart. */
export function MoneyStatePill({
  state,
  className,
}: {
  state: MoneyState;
  className?: string;
}) {
  const a = useA();
  const m = MONEY[state];
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 rounded-none px-2.5 text-eyebrow font-medium whitespace-nowrap",
        m.cls,
        className,
      )}
    >
      <Icon name={m.icon} size={12} aria-hidden />
      {a.money[state]}
    </span>
  );
}
/** Chart fills for money states (token colours, plan board-11 fix). */
export const MONEY_FILL: Record<MoneyState, string> = {
  invoiced: "var(--color-ink-500)",
  collected: "var(--color-ink-500)",
  paid: "var(--color-success)",
  scheduled: "var(--color-warning)",
  approved: "var(--color-info)",
  allocated: "var(--color-navy-300)",
  deducted: "var(--color-ink-500)",
  adjusted: "var(--color-ink-400)",
};

/** AK2 share ring: arc = pct; centre = pct; caption = amount of eligible. Arc draws once on mount. */
export function ShareRing({
  pct,
  amount,
  eligible,
  size = 72,
}: {
  pct: number;
  amount?: number;
  eligible?: number;
  size?: number;
}) {
  const a = useA();
  const { locale } = useI18n();
  const r = 15.9155; // circumference 100
  return (
    <figure className="flex items-center gap-3">
      <svg
        viewBox="0 0 36 36"
        width={size}
        height={size}
        role="img"
        aria-label={`${a.money.share} ${Math.round(pct * 100)}%`}
      >
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="var(--color-ink-100)"
          strokeWidth="3.5"
        />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="var(--color-navy-700)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${pct * 100} 100`}
          transform="rotate(-90 18 18)"
          className="m-tick"
          style={{ ["--len" as string]: 100 }}
        />
        <text
          x="18"
          y="20.5"
          textAnchor="middle"
          className="fill-fg text-[8px] font-semibold"
        >
          {Math.round(pct * 100)}%
        </text>
      </svg>
      {amount !== undefined && (
        <figcaption className="grid">
          <span className="text-card-title tabular">
            {formatMoney(amount, "RWF", locale)}
          </span>
          {eligible !== undefined && (
            <span className="text-small text-fg-subtle">
              {fill(a.money.ofEligible, {
                v: formatMoney(eligible, "RWF", locale),
              })}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

// ---------------------------------------------------------------- availability + clearance
export type DutyState = "on" | "away" | "leave";
const DUTY: Record<DutyState, string> = {
  on: "bg-success",
  away: "bg-warning",
  leave: "bg-ink-500",
};
/** Status dot + label used in the top-bar pill, More sheet and profile. */
export function DutyDot({
  state,
  label,
  pending,
}: {
  state: DutyState;
  label?: boolean;
  pending?: boolean;
}) {
  const a = useA();
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className={cx(
          "size-2 rounded-full m-tone",
          DUTY[state],
          pending && "animate-pulse",
        )}
      />
      {label !== false && (
        <span>
          {state === "on"
            ? a.duty.on
            : state === "away"
              ? a.duty.away
              : a.duty.leave}
        </span>
      )}
    </span>
  );
}

export type ClearanceState =
  "new" | "in_progress" | "submitted" | "changes_requested" | "cleared";
/** AK5/ON5 "not cleared yet" bar. Hidden once cleared. */
export function ClearanceBar({
  state,
  manager,
  steps = 0,
  action,
}: {
  state: ClearanceState;
  manager: string;
  steps?: number;
  action?: ReactNode;
}) {
  const a = useA();
  if (state === "cleared") return null;
  const warn = state === "changes_requested";
  return (
    <div
      role="status"
      className={cx(
        "flex flex-wrap items-center gap-3 rounded-none p-4 m-rise",
        warn ? "bg-warning-bg text-fg" : "bg-bg-tint text-fg",
      )}
    >
      <Icon
        name={warn ? "shield" : "clock"}
        size={20}
        aria-hidden
        className={warn ? "text-warning" : "text-navy-700"}
      />
      <p className="min-w-0 flex-1 text-small">
        {fill(a.clearance[state], { m: manager, n: steps })}
      </p>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------- grouping
/** Collapsible group header (Today / Cases): tone dot + label + count; body collapses with .m-collapse. */
export function Group({
  id,
  label,
  count,
  tone = "neutral",
  defaultOpen = true,
  children,
}: {
  id: string;
  label: string;
  count: number;
  tone?: "neutral" | "danger" | "warning" | "info";
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const dot = {
    neutral: "bg-ink-500",
    danger: "bg-danger",
    warning: "bg-warning",
    info: "bg-info",
  }[tone];
  return (
    <section aria-labelledby={`g-${id}`}>
      <h3 id={`g-${id}`}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`gb-${id}`}
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2 rounded-none py-2 text-left text-label hover:bg-navy-50"
        >
          <span aria-hidden className={cx("size-2 rounded-full", dot)} />
          <span className={cx(tone === "danger" && "text-danger")}>
            {label}
          </span>
          <span className="text-fg-subtle tabular">({count})</span>
          <Icon
            name="chevronDown"
            size={16}
            aria-hidden
            className={cx(
              "ml-auto transition-transform duration-200",
              !open && "-rotate-90",
            )}
          />
        </button>
      </h3>
      <div
        id={`gb-${id}`}
        className="m-collapse"
        data-closed={open ? undefined : ""}
        inert={!open}
      >
        <div>{children}</div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- conversation + versions
export type Channel = "client" | "internal" | "system";
/** Channel tag; internal is amber with a lock — never sent to the client. */
export function ChannelTag({ channel }: { channel: Channel }) {
  const a = useA();
  const cls = {
    client: "bg-navy-50 text-navy-700",
    internal: "bg-warning-bg text-warning",
    system: "bg-ink-100 text-fg-muted",
  }[channel];
  return (
    <span
      className={cx(
        "inline-flex h-5 items-center gap-1 rounded-none px-2 text-[0.6875rem] font-medium",
        cls,
      )}
      title={channel === "internal" ? a.channel.internalHint : undefined}
    >
      {channel === "internal" && <Icon name="lock" size={10} aria-hidden />}
      {a.channel[channel]}
    </span>
  );
}

export function VersionChip({
  v,
  state,
}: {
  v: string;
  state?: "draft" | "returned" | "approved" | "current";
}) {
  const a = useA();
  const cls =
    state === "returned"
      ? "bg-danger-bg text-danger"
      : state === "approved"
        ? "bg-success-bg text-success"
        : state === "draft"
          ? "border border-dashed border-border-strong text-fg-muted"
          : "bg-ink-100 text-ink-700";
  return (
    <span
      className={cx(
        "inline-flex h-5 items-center gap-1 rounded-none px-2 text-[0.6875rem] font-medium tabular",
        cls,
      )}
    >
      {v}
      {state && state !== "current" && <span>· {a.version[state]}</span>}
    </span>
  );
}

// ---------------------------------------------------------------- calendar
export type EventKind = "deadline" | "appointment" | "field" | "obligation";
const EV: Record<EventKind, { cls: string; shape: string }> = {
  deadline: { cls: "bg-danger", shape: "rounded-none rotate-45" },
  appointment: { cls: "bg-navy-700", shape: "rounded-full" }, // data-round: event dot
  field: { cls: "bg-warning", shape: "rounded-none" },
  obligation: {
    cls: "bg-success",
    shape: "rounded-full ring-2 ring-success/30", // data-round: event dot
  },
};
/** Event marker: colour AND shape differ per kind (legend uses the same). */
export function EventDot({
  kind,
  label,
}: {
  kind: EventKind;
  label?: boolean;
}) {
  const a = useA();
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className={cx("inline-block size-2", EV[kind].cls, EV[kind].shape)}
      />
      {label ? (
        <span className="text-small">{a.event[kind]}</span>
      ) : (
        <span className="sr-only">{a.event[kind]}</span>
      )}
    </span>
  );
}
export const EVENT_BG: Record<EventKind, string> = {
  deadline: "bg-danger-bg text-danger border-danger/30",
  appointment: "bg-navy-50 text-navy-700 border-navy-700/30",
  field: "bg-warning-bg text-warning border-warning/30",
  obligation: "bg-success-bg text-success border-success/30",
};

// ---------------------------------------------------------------- masked data (WB4)
/** Masked value with logged reveal. onReveal fires once per reveal (caller logs it). */
export function MaskedValue({
  value,
  masked,
  shared = true,
  onReveal,
}: {
  value: string;
  masked: string;
  shared?: boolean;
  onReveal?: () => void;
}) {
  const a = useA();
  const [open, setOpen] = useState(false);
  if (!shared)
    return (
      <span className="inline-flex items-center gap-1.5 text-fg-subtle">
        <Icon name="lock" size={12} aria-hidden />
        {a.masked.notShared}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-2">
      <span className="tabular" aria-live="polite">
        {open ? value : masked}
      </span>
      <button
        type="button"
        className="rounded-none bg-navy-50 px-2 text-[0.6875rem] font-medium text-navy-700 hover:bg-navy-100"
        onClick={() => {
          if (!open) onReveal?.();
          setOpen(!open);
        }}
      >
        {open ? a.masked.hide : a.masked.reveal}
      </button>
    </span>
  );
}

// ---------------------------------------------------------------- skills + rating
export type Level = "basic" | "intermediate" | "advanced" | "expert";
export function SkillLevel({
  level,
  pending,
}: {
  level: Level;
  pending?: boolean;
}) {
  const a = useA();
  const n = { basic: 1, intermediate: 2, advanced: 3, expert: 4 }[level];
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="flex gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cx(
              "h-1.5 w-3 rounded-none",
              i <= n ? "bg-navy-700" : "bg-ink-200",
            )}
          />
        ))}
      </span>
      <span className="text-small">{a.skill[level]}</span>
      {pending && (
        <span className="rounded-none bg-warning-bg px-2 text-[0.6875rem] font-medium text-warning">
          {a.skill.pending}
        </span>
      )}
    </span>
  );
}

export function StarRating({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const a = useA();
  return (
    <span
      role="img"
      aria-label={fill(a.rating, { n: value.toFixed(1) })}
      className={cx("inline-flex gap-0.5", className)}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const f = Math.max(0, Math.min(1, value - i + 1));
        return (
          <svg key={i} viewBox="0 0 24 24" className="size-4" aria-hidden>
            <defs>
              <linearGradient id={`st${i}-${Math.round(f * 100)}`}>
                <stop offset={f} stopColor="var(--color-warning)" />
                <stop offset={f} stopColor="var(--color-ink-200)" />
              </linearGradient>
            </defs>
            <path
              d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"
              fill={`url(#st${i}-${Math.round(f * 100)})`}
            />
          </svg>
        );
      })}
    </span>
  );
}

// ---------------------------------------------------------------- skeleton + section helpers
/** Content-shaped skeleton rows. */
export function SkeletonRows({
  n = 3,
  className,
}: {
  n?: number;
  className?: string;
}) {
  return (
    <div aria-hidden className={cx("grid gap-3", className)}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="h-14 rounded-none m-shimmer" />
      ))}
    </div>
  );
}

/** Page header used by every agent page: title, optional subtitle, actions; rises once on mount. */
export function PageHead({
  title,
  sub,
  actions,
  back,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end gap-3 m-rise">
      <div className="min-w-0 flex-1">
        {back}
        <h1 className="text-h3">{title}</h1>
        {sub && <p className="mt-1 text-body text-fg-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
