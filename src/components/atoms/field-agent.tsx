"use client";
// Field atoms (plan §5.2). Text + icon on every chip (never colour-only). Motion from globals.css m-* utilities.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx, formatDate } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { localHref } from "@/lib/i18n/provider";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { useEngine } from "@/lib/field/sync";
import { useOnline } from "@/lib/field/net";
import { pendingCount, needsReview, failedCount } from "@/lib/field/queue";
import { expiryState } from "@/lib/field/store";
import { formatDistance } from "@/lib/field/geo";
import type { Flag, Evidence, Outcome, L3 } from "@/shared/field/types";

/** Kigali HH:mm. */
export const hhmm = (iso: string, locale: L3) => formatDate(iso, locale, { hour: "2-digit", minute: "2-digit", hour12: false });
export const kb = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
export function duration(ms: number) {
  const h = Math.floor(ms / 3600_000), m = Math.max(0, Math.round((ms % 3600_000) / 60_000));
  return h ? `${h} h ${m ? `${m} min` : ""}`.trim() : `${m} min`;
}

/** Field base path for the current workspace (/agent/field or /work/field). */
export function useFieldBase() {
  const { locale } = useFieldCopy();
  const ws = usePathname().includes("/work/") ? "work" : "agent";
  return (p = "") => localHref(locale, `/${ws}/field${p}`);
}
/** Workspace root ("/agent" or "/work") for links outside field. */
export function useWsRoot() { return usePathname().includes("/work/") ? "/work" : "/agent"; }

/** Small ticking clock in state (never Date.now() during render). */
export function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = window.setInterval(tick, everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

// ---------------------------------------------------------------- SyncPill
export function SyncPill({ className }: { className?: string }) {
  const { c } = useFieldCopy();
  const online = useOnline();
  const eng = useEngine();
  const base = useFieldBase();
  const pending = pendingCount(eng.ops);
  const review = needsReview(eng.ops);
  const failed = failedCount(eng.ops);
  const expired = expiryState(eng.meta, eng.now) === "expired" && pending > 0;
  const [tick, setTick] = useState(0);
  const prev = useRef(pending);
  useEffect(() => { if (prev.current !== pending) { prev.current = pending; setTick((t) => t + 1); } }, [pending]);

  const tone = !online ? "bg-navy-700 text-white" : review ? "bg-warning-bg text-warning" : failed ? "bg-danger-bg text-danger" : pending ? "bg-navy-100 text-navy-700" : "bg-navy-700 text-white";
  const text = eng.syncing
    ? fill(c.syncing, { done: eng.syncing.done, total: eng.syncing.total })
    : review ? fill(c.needsReview, { n: review })
      : failed ? fill(c.failed, { n: failed })
        : expired ? c.expired
          : `${online ? c.online : c.offline} · ${pending ? fill(c.pending, { n: pending }) : c.allSynced}`;
  const label = !online ? fill(c.pillLabelOffline, { n: pending }) : pending ? fill(c.pillLabelPending, { n: pending }) : c.pillLabelOnline;
  return (
    <Link href={base("/outbox")} aria-label={`${text}. ${label}`} className={cx("m-press inline-flex h-9 items-center gap-2 rounded-md px-3 text-small font-medium whitespace-nowrap", tone, className)}>
      {eng.syncing ? (
        <span aria-hidden className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
      ) : (
        <span aria-hidden className={cx("size-2 rounded-full", !online ? "bg-white/60" : review || failed ? "bg-current" : "bg-success")} />
      )}
      <span key={tick} className="m-pop tabular">{text}</span>
      {online && !pending && !eng.syncing && <Icon name="check" size={14} aria-hidden />}
    </Link>
  );
}

/** Live region announcing sync progress (separate from the pill so the label stays stable). */
export function SyncAnnouncer() {
  const { c } = useFieldCopy();
  const eng = useEngine();
  const pending = pendingCount(eng.ops);
  return <p className="sr-only" aria-live="polite">{eng.syncing ? fill(c.syncing, { done: eng.syncing.done, total: eng.syncing.total }) : pending ? fill(c.pending, { n: pending }) : c.allSynced}</p>;
}

// ---------------------------------------------------------------- OfflineBanner
export function OfflineBanner() {
  const { c } = useFieldCopy();
  const online = useOnline();
  const eng = useEngine();
  const ex = expiryState(eng.meta, eng.now);
  const pending = pendingCount(eng.ops);
  const msg = ex === "expired" && pending ? fill(c.bannerExpired, { n: pending })
    : ex === "expiring" && eng.meta?.expiresAt ? fill(c.bannerExpiring, { time: duration(eng.meta.expiresAt - eng.now) })
      : !online ? c.banner : null;
  return (
    <div className="m-collapse" data-closed={msg ? undefined : ""}>
      <div>
        {msg && (
          <p role="status" className={cx("flex items-start gap-3 rounded-md px-4 py-3 text-small", ex === "expired" ? "bg-danger-bg text-danger" : "bg-warning-bg text-fg")}>
            <span aria-hidden className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-danger text-[0.7rem] font-bold text-white">!</span>
            <span className="font-medium">{msg}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- chips
const chip = "inline-flex h-7 items-center gap-1.5 rounded-pill px-2.5 text-eyebrow font-medium normal-case whitespace-nowrap";

export function GeoChip({ distanceM, accuracyM, verdict }: { distanceM: number | null; accuracyM: number | null; verdict: "verified" | "far" | "low" | "no_gps" }) {
  const { c } = useFieldCopy();
  const map = {
    verified: ["bg-success-bg text-success", "check", `${c.geo.verified}${distanceM !== null ? ` · ${formatDistance(distanceM)}` : ""}`],
    far: ["bg-warning-bg text-warning", "mapPin", fill(c.geo.far, { d: formatDistance(distanceM ?? 0) })],
    low: ["bg-warning-bg text-warning", "mapPin", fill(c.geo.low, { a: accuracyM ?? 0 })],
    no_gps: ["bg-danger-bg text-danger", "x", c.geo.noGps],
  } as const;
  const [cls, icon, text] = map[verdict];
  return <span className={cx(chip, cls)}><Icon name={icon} size={12} aria-hidden />{text}{accuracyM !== null && verdict === "verified" && <span className="opacity-75">±{accuracyM} m</span>}</span>;
}

const FLAG_ICON: Record<Flag, IconName> = { far: "mapPin", no_gps: "x", low_accuracy: "mapPin", gallery_suspect: "camera", clock_skew: "clock", over_cap: "wallet" };
export function FieldFlagChip({ flag, detail }: { flag: Flag; detail?: string }) {
  const { c } = useFieldCopy();
  return <span className={cx(chip, flag === "no_gps" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning")}><Icon name={FLAG_ICON[flag]} size={12} aria-hidden />{c.flags[flag]}{detail && <span className="opacity-75">· {detail}</span>}</span>;
}

const EV_ICON: Record<Evidence | "gps", IconName> = { photo: "camera", scan: "file", signature: "fileCheck", otp: "lock", gps: "mapPin" };
export function EvidenceChip({ kind, done }: { kind: Evidence | "gps"; done?: boolean }) {
  const { c } = useFieldCopy();
  return (
    <span className={cx(chip, "h-8 border", done ? "border-success/30 bg-success-bg text-success" : "border-border bg-white text-fg")}>
      <Icon name={EV_ICON[kind]} size={14} aria-hidden />{c.evidence[kind]}
      {done && <svg aria-hidden viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path className="m-tick" pathLength={24} d="M20 6 9 17l-5-5" /></svg>}
    </span>
  );
}

const OUTCOME_CLS: Record<Outcome | "missed" | "cancelled", string> = {
  completed: "bg-success-bg text-success", partially_done: "bg-warning-bg text-warning", client_absent: "bg-danger-bg text-danger",
  rescheduled: "bg-info-bg text-info", missed: "bg-danger-bg text-danger", cancelled: "bg-ink-100 text-fg-muted",
};
export function OutcomeChip({ outcome }: { outcome: Outcome | "missed" | "cancelled" }) {
  const { c } = useFieldCopy();
  return <span className={cx(chip, OUTCOME_CLS[outcome])}>{c.outcome[outcome]}</span>;
}

export function CustodyChip({ count, since }: { count: number; since?: string }) {
  const { c, locale } = useFieldCopy();
  if (!count) return null;
  return (
    <span className="inline-flex items-center gap-2 rounded-md bg-warning-bg px-3 py-2 text-small font-medium text-fg">
      <Icon name="lock" size={16} aria-hidden />{fill(c.custody, { n: count, time: since ? hhmm(since, locale) : "—" })}
    </span>
  );
}

export function TimeWindowChip({ start, end, now }: { start: string; end: string; now: number }) {
  const { c, locale } = useFieldCopy();
  const s = Date.parse(start), e = Date.parse(end);
  const st = !now ? "upcoming" : now > e ? "late" : now >= s ? "now" : s - now <= 3600_000 ? "soon" : "upcoming";
  const cls = { upcoming: "bg-ink-100 text-ink-700", soon: "bg-gold-400 text-navy-950", now: "bg-navy-700 text-white", late: "bg-danger-bg text-danger" }[st];
  return (
    <span className={cx(chip, cls)}>
      <Icon name="clock" size={12} aria-hidden /><span className="tabular">{hhmm(start, locale)}–{hhmm(end, locale)}</span>
      {st !== "upcoming" && <span>· {c.window[st]}</span>}
    </span>
  );
}

export function QuotaBar({ used, quota }: { used: number; quota: number }) {
  const { c } = useFieldCopy();
  const pct = quota ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  const level = pct >= 95 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-navy-700";
  return (
    <div className="grid gap-1.5">
      <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={fill(c.quota, { used: kb(used), quota: kb(quota) })} className="h-2 overflow-hidden rounded-md bg-ink-100">
        <span className={cx("block h-full origin-left rounded-md transition-[width] duration-(--dur-3)", level)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-eyebrow normal-case text-fg-subtle tabular">{fill(c.quota, { used: kb(used), quota: kb(quota) })} · {pct}%</p>
    </div>
  );
}

export function LocalRef({ localRef, serverRef }: { localRef: string; serverRef?: string | null }) {
  const { c } = useFieldCopy();
  if (serverRef) return <span key={serverRef} className="m-pop inline-flex h-6 items-center rounded-pill bg-ink-100 px-2 font-mono text-eyebrow normal-case">{serverRef}</span>;
  return <span title={c.localRefHint} className="inline-flex h-6 items-center rounded-pill border border-dashed border-border-strong px-2 font-mono text-eyebrow normal-case text-fg-subtle">{localRef}<span className="sr-only"> — {c.localRefHint}</span></span>;
}

/** Disabled-with-reason wrapper for server-only actions while offline (never hidden, plan §4). */
export function NeedsConnection({ children, online }: { children: ReactNode; online: boolean }) {
  const { c } = useFieldCopy();
  return (
    <div className="grid gap-1">
      {children}
      {!online && <p className="flex items-center gap-1.5 text-small text-fg-subtle"><Icon name="lock" size={14} aria-hidden />{c.needsConnection}</p>}
    </div>
  );
}

/** Bottom-anchored action bar for phones (≥48 px targets), inline on desktop. */
export function ActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("sticky bottom-0 z-10 -mx-gutter mt-6 flex flex-wrap gap-2 border-t border-border bg-white/95 px-gutter py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 [&>*]:min-h-12 [&>*]:flex-1 lg:[&>*]:flex-none", className)}>
      {children}
    </div>
  );
}

/** Page header used by every field page. */
export function FieldHeader({ title, sub, back, action }: { title: ReactNode; sub?: ReactNode; back?: string; action?: ReactNode }) {
  const { c } = useFieldCopy();
  return (
    <header className="m-rise mb-5 flex items-start gap-3">
      {back && (
        <Link href={back} aria-label={c.back} className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-navy-50">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-h3 sm:text-h2">{title}</h1>
        {sub && <p className="mt-1 text-small text-fg-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}
