"use client";
// Marketing atoms (plan 10 §5.2, board marketing/01). Status is always icon + text, never colour alone. Motion: m-* tokens only.
import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { cx, formatDate, formatMoney } from "@/shared/format";
import { mktCommon, fill } from "@/content/pages/mkt-common";
import type { CampaignStatus, Channel, CmsStatus, ConsentState, KbState, LeadStage, Locale, LocaleState, Staff, TemplateStatus, Touch } from "@/shared/marketing/types";
import { LOCALES } from "@/shared/marketing/types";
import { Icon, type IconName, WhatsAppGlyph } from "@/components/atoms/icon";

export const useM = () => mktCommon(useI18n().locale);

export type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "accent";
export const TONE_CLS: Record<Tone, string> = {
  neutral: "bg-ink-100 text-fg-muted",
  info: "bg-info-bg text-info",
  warning: "bg-warning-bg text-warning",
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
  accent: "bg-navy-50 text-navy-700",
};
export function Pill({ tone = "neutral", icon, children, className, title, motion = "m-pop" }: { tone?: Tone; icon?: IconName; children: ReactNode; className?: string; title?: string; motion?: string }) {
  return (
    <span title={title} className={cx("inline-flex h-6 items-center gap-1.5 rounded-none px-2.5 text-eyebrow font-medium whitespace-nowrap", TONE_CLS[tone], motion, className)}>
      {icon && <Icon name={icon} size={12} aria-hidden />}
      {children}
    </span>
  );
}

const LOC_TONE: Record<LocaleState, string> = { ok: "bg-success", missing: "bg-transparent ring-1 ring-inset ring-border-strong", outdated: "bg-warning", needs_review: "bg-info" };
/** rw ✓ en ✓ fr ✗ — dots with a full spoken label. */
export function LocaleCoverage({ coverage, size = "dots" }: { coverage: Record<Locale, LocaleState>; size?: "dots" | "pills" }) {
  const m = useM();
  const label = LOCALES.map((l) => `${m.locale[l]} ${m.locale[coverage[l]]}`).join(", ");
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex items-center gap-1.5 m-tone">
      {LOCALES.map((l) => size === "pills" ? (
        <span key={l} className={cx("inline-flex h-5 items-center gap-1 rounded-none px-1.5 text-[0.68rem] font-medium uppercase", coverage[l] === "ok" ? "bg-success-bg text-success" : coverage[l] === "missing" ? "bg-ink-100 text-fg-subtle line-through" : "bg-warning-bg text-warning")}>{l}</span>
      ) : (
        <span key={l} className="inline-flex items-center gap-0.5 text-[0.68rem] uppercase text-fg-subtle"><span className={cx("size-2 rounded-full", LOC_TONE[coverage[l]])} />{l}</span>
      ))}
    </span>
  );
}

const WF: Record<CmsStatus, [Tone, IconName]> = {
  draft: ["neutral", "file"], in_review: ["info", "search"], approved: ["accent", "check"], scheduled: ["warning", "clock"],
  published: ["success", "globe"], stale: ["danger", "refresh"], archived: ["neutral", "lock"],
};
export function WorkflowChip({ status, at }: { status: CmsStatus; at?: string }) {
  const m = useM();
  const { locale } = useI18n();
  const [tone, icon] = WF[status];
  return <Pill tone={tone} icon={icon}>{status === "scheduled" && at ? fill(m.workflow.scheduledFor, { d: formatDate(at, locale) }) : m.workflow[status]}</Pill>;
}

export function ChannelIcon({ channel, label, size = 14 }: { channel: Channel | "web" | "call" | "event"; label?: boolean; size?: number }) {
  const m = useM();
  const icon: IconName = channel === "email" ? "mail" : channel === "sms" ? "message" : channel === "web" ? "globe" : channel === "call" ? "phone" : channel === "event" ? "calendar" : "message";
  return (
    <span className="inline-flex items-center gap-1" title={m.channel[channel]}>
      {channel === "whatsapp" ? <WhatsAppGlyph size={size} /> : <Icon name={icon} size={size} aria-hidden />}
      {label ? <span>{m.channel[channel]}</span> : <span className="sr-only">{m.channel[channel]}</span>}
    </span>
  );
}

export function ConsentChip({ channel, state }: { channel: Channel; state: ConsentState }) {
  const m = useM();
  return (
    <Pill motion="m-tone" tone={state === "in" ? "success" : state === "out" ? "danger" : "neutral"} icon={state === "in" ? "check" : state === "out" ? "x" : "minus"}>
      {m.consent[channel]}<span className="sr-only">: {m.consent[state]}</span>
    </Pill>
  );
}

const STAGE_TONE: Record<LeadStage, Tone> = { new: "info", contacted: "accent", qualified: "warning", quote_sent: "accent", won: "success", lost: "danger", merged: "neutral" };
export function LeadStageChip({ stage }: { stage: LeadStage }) {
  return <Pill tone={STAGE_TONE[stage]}>{useM().stage[stage]}</Pill>;
}
const CMP: Record<CampaignStatus, [Tone, IconName]> = {
  draft: ["neutral", "file"], pending_approval: ["warning", "shield"], approved: ["accent", "check"], scheduled: ["info", "clock"], sending: ["info", "zap"],
  sent: ["success", "check"], paused: ["warning", "clock"], cancelled: ["neutral", "x"], failed: ["danger", "x"],
};
export function CampaignStatusChip({ status }: { status: CampaignStatus }) {
  const [tone, icon] = CMP[status];
  return <Pill tone={tone} icon={icon}>{useM().campaign[status]}</Pill>;
}
export function TemplateStatusChip({ status }: { status: TemplateStatus }) {
  const tone: Tone = status === "active" ? "success" : status === "rejected" ? "danger" : status === "pending_provider_approval" ? "warning" : "neutral";
  return <Pill tone={tone} icon={status === "active" ? "check" : status === "rejected" ? "x" : "clock"}>{useM().template[status]}</Pill>;
}
export function KbChip({ state }: { state: KbState }) {
  const tone: Tone = state === "indexed" ? "accent" : state === "stale" ? "danger" : state === "pending" ? "info" : "neutral";
  return <Pill tone={tone} icon="sparkle">{useM().kb[state]}</Pill>;
}
export function StepDot({ state }: { state: "waiting" | "executed" | "skipped" | "cancelled" | "deferred" }) {
  const cls = state === "executed" ? "bg-success" : state === "waiting" ? "bg-info" : state === "deferred" ? "bg-warning" : "bg-border-strong";
  return <span className="inline-flex items-center gap-1.5 text-small"><span className={cx("size-2.5 rounded-full", cls)} aria-hidden />{useM().step[state]}</span>;
}
export function SourceBadge({ touch }: { touch?: Touch | null }) {
  const m = useM();
  const s = touch?.source ?? "direct";
  const name = m.source[s] ?? s;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-none border border-border bg-white px-2 py-0.5 text-eyebrow" title={touch ? [touch.source, touch.medium, touch.campaign].filter(Boolean).join(" / ") : name}>
      <span aria-hidden className={cx("size-2 rounded-full", s === "facebook" ? "bg-info" : s === "google" ? "bg-warning" : s === "whatsapp" ? "bg-success" : s === "referral" ? "bg-navy-700" : "bg-border-strong")} />
      {name}{touch?.campaign && <span className="truncate text-fg-subtle">· {touch.campaign}</span>}
    </span>
  );
}

/** Live character counter; announces only when crossing near/over. */
export function CharCounter({ value, max }: { value: string; max: number }) {
  const m = useM();
  const n = value.length;
  const state = n > max ? "over" : n >= max * 0.9 ? "near" : "ok";
  return (
    <span className={cx("text-eyebrow tabular", state === "over" ? "text-danger" : state === "near" ? "text-warning" : "text-fg-subtle")}>
      {fill(m.counter.of, { n, max })}
      <span className="sr-only" aria-live="polite">{state === "over" ? fill(m.counter.over, { n: n - max }) : state === "near" ? m.counter.near : ""}</span>
    </span>
  );
}

export function CostPill({ amount, perUnit, state = "ok" }: { amount: number; perUnit?: number; state?: "ok" | "warn" | "block" }) {
  const m = useM();
  const { locale } = useI18n();
  return (
    <span className={cx("inline-flex items-baseline gap-2 rounded-none px-3 py-1 tabular m-tick", state === "block" ? "bg-danger-bg text-danger" : state === "warn" ? "bg-warning-bg text-warning" : "bg-gold-400 text-navy-950")}>
      <strong className="text-body">{formatMoney(amount, "RWF", locale)}</strong>
      {perUnit != null && <span className="text-eyebrow">{fill(m.cost.per, { amount: formatMoney(perUnit, "RWF", locale) })}</span>}
    </span>
  );
}

/** Staff name with a distinct colour dot; always the full name (two Graces exist, §0.2). */
export function StaffName({ staff, className }: { staff?: Staff | null; className?: string }) {
  if (!staff) return <span className={cx("text-fg-subtle", className)}></span>;
  return (
    <span className={cx("inline-flex min-w-0 items-center gap-1.5", className)} title={staff.name}>
      <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-semibold text-fg" style={{ background: staff.color }}>{staff.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</span>
      <span className="truncate">{staff.name}</span>
    </span>
  );
}

/** Page header used by every workspace page. */
export function PageHead({ title, sub, actions, eyebrow }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 m-rise">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-eyebrow uppercase tracking-wide text-fg-subtle">{eyebrow}</p>}
        <h1 className="text-h3 md:text-h2">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-body text-fg-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Route-level permission denial, role-aware. */
export function NoAccess() {
  const m = useM();
  const { locale } = useI18n();
  const { user } = useSession();
  void user;
  return (
    <div role="alert" className="mx-auto grid max-w-md place-items-center gap-3 py-16 text-center m-rise">
      <span className="flex size-14 items-center justify-center rounded-full bg-navy-100 text-navy-700"><Icon name="lock" size={24} aria-hidden /></span>
      <h1 className="text-h3">{m.noAccess.title}</h1>
      <p className="text-body text-fg-muted">{m.noAccess.body}</p>
      <Link href={localHref(locale, "/")} className="inline-flex h-11 items-center rounded-none bg-navy-700 px-5 text-button text-white m-press">{m.noAccess.home}</Link>
    </div>
  );
}
