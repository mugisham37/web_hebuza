"use client";
// Stage 11 atoms + small molecules shared by booking, assistant and staff AI (plan 11 §5.2–5.3, §5.6).
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDate, formatMoney } from "@/shared/format";
import { bkgCopy, fill } from "@/lib/booking/copy";
import { formatDay, formatTime, googleCalLink, icsFor, joinOpensAt, viewerTz } from "@/shared/booking/rules";
import { TIME_ZONE } from "@/shared/format";
import type { BookingStatus, Citation, JoinState, KbStatus, Mode, ReminderEntry } from "@/shared/booking/types";
import type { Tone } from "@/shared/domain/case-status";
import { Badge } from "@/components/atoms/tag";
import { Button } from "@/components/atoms/button";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Checkbox } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { useOnline } from "@/components/atoms/hooks";
import { errorCopy } from "@/lib/api/error-copy";

export { fill };
export const useBkg = () => {
  const { locale } = useI18n();
  return { c: bkgCopy(locale), locale };
};

// ---------------------------------------------------------------- 1 s clock (shared interval, SSR-safe: 0 on the server)
let nowVal = 0;
const subs = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
function subscribe(fn: () => void) {
  subs.add(fn);
  if (!timer) {
    nowVal = Date.now();
    timer = setInterval(() => { nowVal = Date.now(); subs.forEach((f) => f()); }, 1000);
  }
  return () => { subs.delete(fn); if (!subs.size) { clearInterval(timer); timer = undefined; } };
}
export const useClock = () => useSyncExternalStore(subscribe, () => nowVal || (nowVal = Date.now()), () => 0);
export { useOnline };

// ---------------------------------------------------------------- Mode, price, status
const MODE_ICON: Record<Mode, IconName> = { office: "building", video: "laptop", phone: "phone", premises: "briefcase" };
export const ModeIcon = ({ mode, size = 16 }: { mode: Mode; size?: number }) => <Icon name={MODE_ICON[mode]} size={size} aria-hidden />;
export function ModeTag({ mode }: { mode: Mode }) {
  const { c } = useBkg();
  return <span className="inline-flex items-center gap-1.5 rounded-none bg-ink-100 px-2.5 py-1 text-eyebrow whitespace-nowrap"><ModeIcon mode={mode} size={13} />{c.modeShort[mode]}</span>;
}
export function PriceBadge({ price, className }: { price: number; className?: string }) {
  const { c, locale } = useBkg();
  return price === 0
    ? <Badge tone="accent" className={className}>{c.common.free}</Badge>
    : <span className={cx("text-label tabular-nums", className)}>{formatMoney(price, "RWF", locale)}</span>;
}
const STATUS_TONE: Record<string, Tone> = {
  held: "info", pending_payment: "warning", confirmed: "success", rescheduled: "neutral", cancelled_by_client: "neutral", cancelled_by_staff: "neutral",
  completed: "accent", no_show: "danger", expired: "neutral", new: "info", scheduled: "success", closed: "neutral",
};
export function BkgStatus({ status }: { status: BookingStatus | "new" | "scheduled" | "closed" }) {
  const { c } = useBkg();
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{c.status[status] ?? status}</Badge>;
}
const KB_TONE: Record<KbStatus, Tone> = { draft: "neutral", approved_for_ai: "info", indexed: "success", stale: "warning", withdrawn: "neutral", changes_requested: "danger" };
export function KbStatusPill({ status }: { status: KbStatus }) {
  const { c } = useBkg();
  return <Badge tone={KB_TONE[status]}>{c.staff.kbStatus[status]}</Badge>;
}

// ---------------------------------------------------------------- Time
export function When({ iso, long }: { iso: string; long?: boolean }) {
  const { locale } = useBkg();
  return <span className="tabular-nums">{formatDay(iso, locale, TIME_ZONE, long)} · {formatTime(iso, locale)}</span>;
}
/** Kigali time, plus the viewer's own zone when it differs (V5.1 cross-border). */
export function TzNote({ at }: { at?: string }) {
  const { c, locale } = useBkg();
  const tz = useSyncExternalStore(() => () => {}, viewerTz, () => TIME_ZONE);
  if (!at || tz === TIME_ZONE) return <p className="text-small text-fg-subtle">{c.time.tz}</p>;
  return <p className="text-small text-fg-subtle">{fill(c.time.tzDual, { kigali: formatTime(at, locale), local: `${formatTime(at, locale, tz)} (${tz})` })}</p>;
}
/** 10-min hold countdown. Announces only at 2 min and at 0 (plan §5.2). */
export function HoldTimer({ expiresAt, online = true }: { expiresAt: string; online?: boolean }) {
  const { c } = useBkg();
  const now = useClock();
  const left = Math.max(0, Date.parse(expiresAt) - (now || Date.parse(expiresAt) - 600_000));
  const mm = Math.floor(left / 60_000), ss = Math.floor((left % 60_000) / 1000);
  const warn = left <= 120_000;
  const announce = left === 0 ? c.time.expired : warn ? `${c.time.hold} 2:00` : "";
  return (
    <span role="timer" aria-live="off" className={cx("inline-flex items-center gap-1.5 rounded-none px-3 py-1 text-small tabular-nums", left === 0 ? "bg-danger-bg text-danger" : warn ? "bg-warning-bg text-warning m-tone" : "bg-bg-tint text-fg", !online && "opacity-60")}>
      <Icon name="clock" size={14} aria-hidden />
      {left === 0 ? c.time.expired : <>{c.time.hold} {mm}:{String(ss).padStart(2, "0")}</>}
      <span className="sr-only" aria-live="polite">{warn && ss === 0 ? announce : ""}</span>
    </span>
  );
}

// ---------------------------------------------------------------- Join (F-BKG-07): the URL is fetched on click, never shipped in lists
export function JoinButton({ state, startsAt, fetchUrl, size = "md" }: { state: JoinState; startsAt: string; fetchUrl: () => Promise<{ url: string }>; size?: "sm" | "md" }) {
  const { c, locale } = useBkg();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const descId = `join-${startsAt}`;
  if (state === "ended") return <span className="text-small text-fg-subtle">{c.manage.ended}</span>;
  if (state === "locked") return (
    <span className="inline-flex flex-col gap-1">
      <Button size={size} variant="secondary" disabled aria-describedby={descId}><Icon name="laptop" size={16} aria-hidden />{c.manage.join}</Button>
      <span id={descId} className="text-eyebrow text-fg-subtle">{fill(c.manage.opensAt, { time: formatTime(joinOpensAt(startsAt), locale) })}</span>
    </span>
  );
  return (
    <Button size={size} variant="primary" className="m-pop" loading={busy} onClick={async () => {
      setBusy(true);
      try { const r = await fetchUrl(); window.open(r.url, "_blank", "noopener"); }
      catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
      finally { setBusy(false); }
    }}><Icon name="laptop" size={16} aria-hidden />{c.manage.joinVideo}</Button>
  );
}

// ---------------------------------------------------------------- Reminders, calendar, policy
export function ReminderTimeline({ items }: { items: ReminderEntry[] }) {
  const { c, locale } = useBkg();
  return (
    <ol className="grid gap-2" aria-label={c.confirmed.reminders}>
      {items.map((r) => (
        <li key={r.kind} className="flex items-start gap-3">
          <span aria-hidden className={cx("mt-1.5 size-2.5 shrink-0 rounded-full", r.status === "sent" ? "bg-success" : r.status === "deferred" ? "bg-warning" : r.status === "skipped" ? "bg-ink-400" : "bg-navy-500")} />
          <span className="min-w-0 flex-1">
            <span className="block text-small font-medium">{c.reminder[r.kind]}</span>
            <span className="block text-eyebrow text-fg-subtle tabular-nums">
              {r.status === "skipped" ? c.reminder.skipped : `${formatDay(r.at, locale)} · ${formatTime(r.at, locale)} · ${c.reminder[r.channel]} · ${c.reminder[r.status]}`}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
export function AddToCalendar({ b }: { b: { reference: string; title: string; startsAt: string; endsAt: string; location: string | null } }) {
  const { c } = useBkg();
  const ics = () => {
    const url = URL.createObjectURL(new Blob([icsFor(b)], { type: "text/calendar" }));
    Object.assign(document.createElement("a"), { href: url, download: `${b.reference}.ics` }).click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={c.confirmed.addCal}>
      <a href={googleCalLink(b)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-none border border-border-strong px-4 text-small font-medium hover:bg-navy-50"><Icon name="calendar" size={15} aria-hidden />{c.confirmed.google}</a>
      <button type="button" onClick={ics} className="inline-flex h-9 items-center gap-2 rounded-none border border-border-strong px-4 text-small font-medium hover:bg-navy-50"><Icon name="file" size={15} aria-hidden />{c.confirmed.ics}</button>
    </div>
  );
}
export function PolicyNote() {
  const { c } = useBkg();
  return <p className="flex gap-2 rounded-none bg-ink-100 p-3 text-small text-fg-muted"><Icon name="shield" size={16} className="mt-0.5 shrink-0" aria-hidden />{fill(c.manage.policy, { h: 12 })}</p>;
}
export function OfflineBanner({ text }: { text?: string }) {
  const { c } = useBkg();
  const online = useOnline();
  if (online) return null;
  return <p role="status" className="flex items-center gap-2 rounded-none bg-warning-bg px-4 py-2.5 text-small text-warning"><Icon name="globe" size={16} aria-hidden />{text ?? c.common.offline}</p>;
}
const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
type TurnstileApi = { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove: (id: string) => void };
let turnstileLoad: Promise<TurnstileApi> | null = null;
const loadTurnstile = () =>
  (turnstileLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve((window as unknown as { turnstile: TurnstileApi }).turnstile);
    s.onerror = reject;
    document.head.appendChild(s);
  }));

/** Cloudflare Turnstile when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set; otherwise the dev checkbox (`mock-ok`, accepted by a dev API only). */
export function Captcha({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const { c, locale } = useBkg();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!TURNSTILE_KEY || !box.current) return;
    let id: string | undefined;
    let api: TurnstileApi | undefined;
    loadTurnstile().then((t) => {
      api = t;
      if (box.current) id = t.render(box.current, { sitekey: TURNSTILE_KEY, language: locale === "rw" ? "en" : locale, callback: onChange, "expired-callback": () => onChange(""), "error-callback": () => onChange("") });
    }, () => onChange(""));
    return () => { if (id) api?.remove(id); };
  }, [locale, onChange]);
  return (
    <div className={cx("rounded-none border p-3", error ? "border-danger" : "border-border")}>
      {TURNSTILE_KEY
        ? <div ref={box} aria-label={c.details.captcha} />
        : <Checkbox id="captcha" label={c.details.captcha} checked={value === "mock-ok"} onChange={(e) => onChange(e.target.checked ? "mock-ok" : "")} aria-describedby="captcha-hint" />}
      <p id="captcha-hint" className="mt-1 text-eyebrow text-fg-subtle">{c.details.captchaHint}</p>
      {error && <p className="mt-1 text-small text-danger">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- AI atoms
export function AiLabel({ kind = "generated" }: { kind?: "generated" | "assistant" }) {
  const { c } = useBkg();
  return <span className="inline-flex items-center gap-1 rounded-none bg-bg-tint px-2 py-0.5 text-eyebrow text-navy-800"><Icon name="sparkle" size={12} aria-hidden />{kind === "generated" ? c.staff.ai : c.aia.sub}</span>;
}
export function TypingDots() {
  const { c } = useBkg();
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => <span key={i} aria-hidden className="size-1.5 rounded-full bg-fg-subtle motion-safe:animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />)}
      <span className="sr-only">{c.aia.typing}</span>
    </span>
  );
}
export function Citations({ items }: { items: Citation[] }) {
  const { c, locale } = useBkg();
  const [all, setAll] = useState(false);
  if (!items.length) return null;
  const shown = all ? items : items.slice(0, 3);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label={c.aia.sources}>
      {shown.map((s) => (
        <a key={s.id} href={s.url.startsWith("/") ? s.url : "#"} className="inline-flex max-w-full items-center gap-1.5 rounded-none border border-border bg-white px-2.5 py-1 text-eyebrow hover:border-ink-400">
          <Icon name="file" size={12} aria-hidden />
          <span className="truncate">{s.title}</span>
          <span className="text-fg-subtle">· {fill(c.aia.updated, { date: formatDate(s.updatedAt, locale) })}</span>
          {s.sourceLang !== locale && s.sourceLang === "en" && <span className="rounded-none bg-ink-100 px-1.5">{c.aia.sourceEn}</span>}
        </a>
      ))}
      {!all && items.length > 3 && <button type="button" onClick={() => setAll(true)} className="rounded-none bg-ink-100 px-2.5 py-1 text-eyebrow">{fill(c.aia.moreSources, { n: items.length - 3 })}</button>}
    </div>
  );
}
export function ConfidenceBadge({ pct }: { pct: number }) {
  const { c } = useBkg();
  return <Badge tone={pct >= 75 ? "success" : pct >= 50 ? "warning" : "danger"}>{fill(c.staff.confidence, { pct })}</Badge>;
}

// ---------------------------------------------------------------- Illustrations (inline, currentColor, aria-hidden)
const Svg = ({ children, className }: { children: ReactNode; className?: string }) =>
  <svg viewBox="0 0 120 96" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cx("h-20 w-auto text-navy-700", className)}>{children}</svg>;
export const IllusAssistantResting = ({ className }: { className?: string }) => (
  <Svg className={className}><path d="M18 30h60a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8H44l-14 12V70h-12a8 8 0 0 1-8-8V38a8 8 0 0 1 8-8Z" /><path d="M100 14a12 12 0 1 0 8 20 14 14 0 0 1-8-20Z" fill="currentColor" fillOpacity=".15" /><path d="M34 50h4M48 50h4M62 50h4" /></Svg>
);
export const IllusNoSlots = ({ className }: { className?: string }) => (
  <Svg className={className}><rect x="14" y="18" width="62" height="58" rx="8" /><path d="M14 34h62M30 12v12M60 12v12M28 48h8M44 48h8M28 60h8" /><path d="M88 50c6 0 10 4 12 10l-6 4c-2-3-4-4-6-4l-4 8c4 6 8 10 14 12l4-6c6 2 10 6 10 12" /></Svg>
);
export const IllusHandoff = ({ className }: { className?: string }) => (
  <Svg className={className}><path d="M10 22h34a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H24l-8 8v-8h-6a6 6 0 0 1-6-6V28" /><path d="M54 40h22M68 32l8 8-8 8" /><circle cx="96" cy="32" r="10" /><path d="M78 76c2-12 10-18 18-18s16 6 18 18" /></Svg>
);
export const IllusLinkExpired = ({ className }: { className?: string }) => (
  <Svg className={className}><rect x="14" y="40" width="72" height="44" rx="6" /><path d="m14 44 36 22 36-22" /><path d="M70 22l8-8a8 8 0 0 1 12 12l-8 8M100 40l-6-2M92 10l2 6M62 30l-8 8a8 8 0 0 0 12 12l8-8" /></Svg>
);
export const IllusKbEmpty = ({ className }: { className?: string }) => (
  <Svg className={className}><path d="M60 26c-10-8-26-10-42-6v54c16-4 32-2 42 6 10-8 26-10 42-6V20c-16-4-32-2-42 6Z" /><path d="M60 26v54" /><path d="m76 46 6 6 12-14" /></Svg>
);

/** Centred illustrated state used by every "nothing / not allowed / resting" panel. */
export function StatePanel({ art, title, body, children, tone = "plain" }: { art?: ReactNode; title: ReactNode; body?: ReactNode; children?: ReactNode; tone?: "plain" | "danger" }) {
  return (
    <div role={tone === "danger" ? "alert" : undefined} className={cx("grid place-items-center gap-3 rounded-none border px-6 py-10 text-center m-rise", tone === "danger" ? "border-danger/25 bg-danger-bg" : "border-dashed border-border-strong bg-white")}>
      {art}
      <p className="text-card-title">{title}</p>
      {body && <p className="max-w-md text-small text-fg-muted">{body}</p>}
      {children && <div className="flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
export function SkeletonList({ n = 3, h = "h-20" }: { n?: number; h?: string }) {
  return <div className="grid gap-3" aria-busy="true">{Array.from({ length: n }, (_, i) => <div key={i} className={cx("rounded-none m-shimmer", h)} />)}</div>;
}
