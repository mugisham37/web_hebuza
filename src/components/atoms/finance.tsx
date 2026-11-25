"use client";
// Finance atoms (plan 05 §5.3, board 01 FK1/FK2/FK5/FK9). Status is always icon + text, never colour alone;
// money is always text ("RWF 80,800", negative read as "minus …"). Motion: app tokens only (m-*).
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDate, formatMoney, formatNumber, formatRelative } from "@/shared/format";
import { financeCommon, fill } from "@/content/pages/finance-common";
import { statusMeta, type FinTone } from "@/lib/finance/states";
import type { Bucket } from "@/shared/finance/ageing";
import type { MatchState, Series } from "@/shared/finance/types";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { Tooltip } from "@/components/atoms/misc";
import { useNow } from "@/components/atoms/agent";

export const useF = () => financeCommon(useI18n().locale);

/** Tone → pill classes (semantic tokens only; lime marks the active step/selection). */
export const TONE_CLS: Record<FinTone, string> = {
  neutral: "bg-ink-100 text-fg-muted",
  info: "bg-info-bg text-info",
  warning: "bg-warning-bg text-warning",
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
  accent: "bg-navy-50 text-navy-700",
};
function Pill({ tone, icon, children, className, title }: { tone: FinTone; icon?: IconName; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex h-6 items-center gap-1.5 rounded-none px-2.5 text-eyebrow font-medium whitespace-nowrap m-tone", TONE_CLS[tone], className)}>
      {icon && <Icon name={icon} size={12} aria-hidden />}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- Amount
const SIZE = { sm: "text-small", md: "text-body", lg: "text-card-title", xl: "text-h3" } as const;
/** Integer RWF as text. Negative: danger + leading "−" + "minus" label. Credit: success + "CR". */
export function Amount({ value, currency = "RWF", sign = "auto", credit, size = "md", strike, className }: {
  value: number; currency?: string; sign?: "auto" | "always"; credit?: boolean; size?: keyof typeof SIZE; strike?: boolean; className?: string;
}) {
  const f = useF();
  const { locale } = useI18n();
  const abs = formatMoney(Math.abs(value), currency, locale);
  const neg = value < 0;
  const text = `${neg ? "−" : sign === "always" && value > 0 ? "+" : ""}${abs}${credit ? ` ${f.money.credit}` : ""}`;
  const label = `${neg ? `${f.money.minus} ` : ""}${abs}${credit ? ` ${f.money.creditLabel}` : ""}`;
  return (
    <span aria-label={label} className={cx("tabular whitespace-nowrap", SIZE[size], neg && "text-danger", credit && "text-success", strike && "text-fg-subtle line-through", className)}>
      {text}
    </span>
  );
}

/** "▲ 12% vs last month" — the period label is mandatory (board 01 fix). */
export function AmountDelta({ value, period }: { value: number; period: string }) {
  const f = useF();
  const dir = value > 0 ? "up" : value < 0 ? "down" : "flat";
  return (
    <span className={cx("inline-flex items-center gap-1 text-eyebrow tabular", dir === "up" ? "text-success" : dir === "down" ? "text-danger" : "text-fg-subtle")}>
      <span aria-hidden>{dir === "up" ? "▲" : dir === "down" ? "▼" : "–"}</span>
      <span className="sr-only">{f.money[dir]}</span>
      {Math.abs(value)}% <span className="text-fg-subtle">{fill(f.money.vs, { period })}</span>
    </span>
  );
}

/** Document number. `no` null → pending ("Assigned on issue"); void → struck + "Void". Number slot pops in when assigned. */
export function DocNumber({ no, void: isVoid, href, className }: { no: string | null; void?: boolean; href?: string; className?: string }) {
  const f = useF();
  if (!no) return <span className={cx("text-small text-fg-subtle italic", className)}>{f.doc.pending}</span>;
  const body = <span className={cx("tabular font-medium m-pop", isVoid && "line-through text-fg-subtle")}>{no}</span>;
  return (
    <span className={cx("inline-flex items-center gap-1.5", className)}>
      {href ? <a href={href} className="underline-offset-4 hover:underline">{body}</a> : body}
      {isVoid && <Pill tone="neutral" icon="x">{f.doc.void}</Pill>}
    </span>
  );
}

export type FinKind = "quote" | "invoice" | "payment" | "refund" | "allocation" | "adjustment" | "batch" | "line" | "import" | "setting" | "rule" | "period";
/** One icon + text per state (STATUS_META in lib/finance/states.ts). `kind` is for callers' clarity and tests. */
export function FinStatus({ status, kind, className }: { status: string; kind?: FinKind; className?: string }) {
  const f = useF();
  const m = statusMeta(status);
  return <Pill tone={m.tone} icon={m.icon} className={className}><span data-kind={kind}>{f.status[status] ?? status}</span></Pill>;
}

/** "Executive above RWF 200,000". */
export function TierChip({ tier, limit }: { tier: "finance" | "finance_second" | "executive" | "sm"; limit?: number }) {
  const f = useF();
  const { locale } = useI18n();
  const who = f.tier[tier];
  return <Pill tone={tier === "executive" ? "warning" : "accent"} icon="shield">{limit != null ? fill(f.tier.above, { who, amount: formatMoney(limit, "RWF", locale) }) : who}</Pill>;
}

export type SignerState = "signed" | "waiting" | "you" | "blocked";
const SIGNER: Record<SignerState, { ring: string; icon?: IconName; tone: FinTone }> = {
  signed: { ring: "ring-success", icon: "check", tone: "success" },
  waiting: { ring: "ring-border-strong", icon: "clock", tone: "neutral" },
  you: { ring: "ring-gold-400", icon: "arrowRight", tone: "accent" },
  blocked: { ring: "ring-danger", icon: "x", tone: "danger" },
};
/** Full name + initials (two Patricks in the world, §0.2) + state text. */
export function SignerAvatar({ user, state, caption }: { user: { name: string } | null; state: SignerState; caption?: string }) {
  const f = useF();
  const s = SIGNER[state];
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <span className="relative">
        <Avatar name={user?.name ?? "?"} size="md" className={cx("ring-2", s.ring)} />
        {s.icon && (
          <span aria-hidden className={cx("absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full ring-2 ring-white", TONE_CLS[s.tone])}>
            {state === "signed" ? <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path className="m-tick" d="M5 12l5 5 9-10" /></svg> : <Icon name={s.icon} size={11} />}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-small font-medium">{user?.name ?? "—"}</span>
        <span className="block truncate text-eyebrow text-fg-subtle">{caption ? `${caption} · ` : ""}{f.signer[state]}</span>
      </span>
    </span>
  );
}

/** Day/month lock state (board 01 FK5). */
export function LockChip({ scope, state }: { scope: "day" | "month"; state: "open" | "closed" | "reopened" }) {
  const f = useF();
  return <Pill tone={state === "closed" ? "accent" : state === "reopened" ? "warning" : "neutral"} icon={state === "closed" ? "lock" : state === "reopened" ? "refresh" : "clock"}>{f.lock[scope]} · {f.lock[state]}</Pill>;
}

const MATCH: Record<MatchState, { tone: FinTone; icon: IconName }> = {
  matched: { tone: "success", icon: "check" }, suggested: { tone: "accent", icon: "sparkle" }, exception: { tone: "warning", icon: "zap" },
  unmatched: { tone: "danger", icon: "search" }, ignored: { tone: "neutral", icon: "x" }, duplicate: { tone: "danger", icon: "layers" },
};
export function MatchChip({ state }: { state: MatchState }) {
  const f = useF();
  return <Pill {...MATCH[state]}>{f.match[state]}</Pill>;
}

const BUCKET_TONE: Record<Bucket, FinTone> = { not_due: "neutral", "0_30": "info", "31_60": "warning", "61_90": "warning", "90_plus": "danger" };
export function AgeingBucketChip({ bucket }: { bucket: Bucket }) {
  const f = useF();
  return <Pill tone={BUCKET_TONE[bucket]} icon={bucket === "not_due" ? "calendar" : "clock"}>{f.bucket[bucket]}</Pill>;
}

/** Text label only, no provider logos (D8). */
export function MethodTag({ method }: { method: string }) {
  const f = useF();
  const icon: IconName = method.includes("momo") || method.includes("airtel") ? "phone" : method === "card" ? "card" : method === "cash" ? "wallet" : "building";
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-none border border-border px-2.5 text-eyebrow whitespace-nowrap">
      <Icon name={icon} size={12} aria-hidden />{(f.method as Record<string, string>)[method] ?? method}
    </span>
  );
}

/** "Next check 14:35 · every 5 min for 1 h, then hourly". Live (useNow), polite region updates ≤ 1/min. */
export function VerifyScheduleChip({ nextAt, cadence }: { nextAt: string; cadence: "5m" | "1h" }) {
  const f = useF();
  const { locale } = useI18n();
  const now = useNow();
  const t = now ? formatRelative(nextAt, locale, now) : formatDate(nextAt, locale, { timeStyle: "short" });
  return (
    <span className="inline-flex items-center gap-1.5 text-eyebrow text-fg-muted">
      <Icon name="refresh" size={12} aria-hidden />
      <span aria-live="polite">{fill(f.verify.next, { t })}</span>
      <span className="text-fg-subtle">· {cadence === "5m" ? f.verify.cadence5 : f.verify.cadence1}</span>
    </span>
  );
}

export function EbmBadge({ no, required }: { no?: string; required?: boolean }) {
  const f = useF();
  if (no) return <Pill tone="success" icon="fileCheck">{fill(f.ebm.present, { no })}</Pill>;
  return required ? <Pill tone="warning" icon="zap">{f.ebm.missing}</Pill> : null;
}

export function SeriesTag({ series }: { series: Series }) {
  const f = useF();
  return <Pill tone={series === "plan" ? "accent" : series === "deposit" ? "info" : series === "credit" ? "warning" : "neutral"}>{f.series[series]}</Pill>;
}

/** "1–30 Nov 2026 · Africa/Kigali". */
export function PeriodLabel({ from, to }: { from: string; to: string }) {
  const f = useF();
  const { locale } = useI18n();
  const r = new Intl.DateTimeFormat(locale === "rw" ? "rw-RW" : locale, { dateStyle: "medium", timeZone: f.period.tz });
  let text: string;
  try { text = r.formatRange(new Date(from), new Date(to)); } catch { text = `${formatDate(from, locale)} – ${formatDate(to, locale)}`; }
  return <span className="text-small text-fg-muted tabular">{text} · {f.period.tz}</span>;
}

/** P3 display FX. `demo` marks a PLACEHOLDER rate. */
export function FxNote({ rate, at, currency, demo = true }: { rate: number; at: string; currency: string; demo?: boolean }) {
  const f = useF();
  const { locale } = useI18n();
  return (
    <p className="inline-flex flex-wrap items-center gap-2 rounded-none bg-bg-tint px-3 py-2 text-small">
      <Icon name="globe" size={14} aria-hidden />
      {fill(f.fx.rate, { c: currency, r: formatNumber(rate, locale), d: formatDate(at, locale) })}
      {demo && <Pill tone="warning">{f.fx.demo}</Pill>}
    </p>
  );
}
