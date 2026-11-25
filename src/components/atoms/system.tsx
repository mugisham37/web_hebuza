"use client";
// Stage 6 system atoms (plan 06 §5.2, board 01 SK1–SK7). Tokens + m-* motion only; every state shown on /design/system.
// Colour is never the only signal: every pill carries an icon and text.
import { useId, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatRelative } from "@/shared/format";
import { ROLES, type Role } from "@/shared/auth/roles";
import type { Scope } from "@/shared/auth/permissions";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { useNow } from "@/components/atoms/step-up";
import { PRIVILEGED_GRANT } from "@/shared/system/approvals";
import { shortHash } from "@/shared/system/audit";
import { systemCommon, fill } from "@/content/pages/system-common";
import type { AuditCategory, ChainState, Env, Health, MfaMethod, MfaState, UserStatus } from "@/shared/system/types";

/** System copy for the current locale. */
export const useS = () => systemCommon(useI18n().locale);
/** Role label: built-in roles from the dictionary, custom roles as their own name. */
export function useRoleLabel() {
  const { t } = useI18n();
  return (r: string) => ((ROLES as readonly string[]).includes(r) ? t(`role.${r as Role}`) : r === "staff:admin" ? "Legacy admin (all roles)" : r);
}

const PILL = "inline-flex h-7 items-center gap-1.5 rounded-none px-2.5 text-eyebrow font-medium whitespace-nowrap";

// ---------------------------------------------------------------- SK1 identity
export function RoleChip({ role, privileged, conflict, removable, onRemove, className }: {
  role: Role | string; privileged?: boolean; conflict?: boolean; removable?: boolean; onRemove?: () => void; className?: string;
}) {
  const label = useRoleLabel()(role);
  const priv = privileged ?? PRIVILEGED_GRANT.has(role);
  const custom = !(ROLES as readonly string[]).includes(role) && role !== "staff:admin";
  return (
    <span className={cx(PILL, "m-pop border", conflict ? "border-danger bg-danger-bg text-danger" : priv ? "border-navy-700/25 bg-navy-50 text-navy-700" : custom ? "border-dashed border-border-strong bg-white text-fg" : "border-transparent bg-ink-100 text-ink-700", className)}>
      {priv && <Icon name="shield" size={12} aria-hidden />}
      {conflict && <Icon name="x" size={12} aria-hidden />}
      <span className="max-w-[16ch] truncate" title={label}>{label}</span>
      {removable && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="-mr-1 flex size-5 items-center justify-center rounded-full hover:bg-navy-100 m-press">
          <Icon name="x" size={11} aria-hidden />
        </button>
      )}
    </span>
  );
}

export function MfaBadge({ state, methods = [] }: { state: MfaState; methods?: MfaMethod[] }) {
  const s = useS().mfa;
  const cls = state === "enrolled" ? "bg-success-bg text-success" : state === "pending" ? "bg-warning-bg text-warning" : "bg-danger-bg text-danger";
  return (
    <span className={cx(PILL, cls)} title={methods.map((m) => s[m]).join(" · ") || undefined}>
      <Icon name={state === "enrolled" ? "shield" : state === "pending" ? "clock" : "refresh"} size={12} aria-hidden />
      {s[state]}
      {state === "enrolled" && methods.includes("webauthn") && <Icon name="lock" size={11} aria-label={s.webauthn} />}
    </span>
  );
}

const STATUS_TONE: Record<UserStatus, string> = {
  active: "bg-success", invited: "bg-info", invite_expired: "bg-ink-500", invite_revoked: "bg-ink-500", suspended: "bg-warning", locked: "bg-danger", deactivated: "bg-ink-400",
};
export function StatusDot({ status }: { status: UserStatus }) {
  const s = useS().status;
  return (
    <span className="inline-flex items-center gap-2 text-small whitespace-nowrap">
      <span aria-hidden className={cx("size-2 rounded-full", STATUS_TONE[status], status === "locked" && "ring-2 ring-danger/25")} />
      {s[status]}
    </span>
  );
}

/** SK1 identity block: avatar, name, masked email, role + status + MFA + last active. */
export function IdentityBlock({ name, email, roles, status, mfa, lastActiveAt, you }: {
  name: string; email: string; roles: string[]; status: UserStatus; mfa: { state: MfaState; methods: MfaMethod[] }; lastActiveAt: string | null; you?: boolean;
}) {
  const s = useS();
  const { locale } = useI18n();
  return (
    <div className="flex min-w-0 items-start gap-4">
      <Avatar name={name} size="lg" className="bg-navy-100 text-navy-700" />
      <div className="grid min-w-0 gap-2">
        <p className="min-w-0"><span className="block truncate text-label-lg">{name}{you && <span className="ml-2 text-small text-fg-subtle">({s.identity.you})</span>}</span><span className="block truncate text-small text-fg-muted">{email}</span></p>
        <div className="flex flex-wrap gap-1.5">{roles.map((r) => <RoleChip key={r} role={r} />)}</div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusDot status={status} />
          <MfaBadge state={mfa.state} methods={mfa.methods} />
          <span className="inline-flex items-center gap-1 text-small text-fg-muted tabular"><Icon name="clock" size={13} aria-hidden />{lastActiveAt ? fill(s.identity.lastActive, { t: formatRelative(lastActiveAt, locale) }) : s.identity.never}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- SK2 matrix cell
export type PermValue = "allow" | "deny" | "inherit" | "changed" | "locked";
const PERM: Record<PermValue, { icon: IconName | null; cls: string }> = {
  allow: { icon: "check", cls: "text-success" },
  deny: { icon: null, cls: "text-fg-subtle" },
  inherit: { icon: "layers", cls: "text-fg-subtle" },
  changed: { icon: "refresh", cls: "bg-navy-50 text-navy-700" },
  locked: { icon: "lock", cls: "text-fg-subtle" },
};
/** role="gridcell"; the scope/note is the cell's accessible description and a hover/focus tooltip. */
export function PermCell({ value, scope, note, tabIndex = -1 }: { value: PermValue; scope?: Scope | null; note?: string; tabIndex?: number }) {
  const s = useS();
  const id = useId();
  const tip = [scope && scope !== "all" ? s.scope[scope] : null, note].filter(Boolean).join(" · ");
  const p = PERM[value];
  return (
    <td role="gridcell" tabIndex={tabIndex} aria-describedby={tip ? id : undefined}
      className={cx("group/cell relative h-11 px-3 text-small whitespace-nowrap m-tone focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus", p.cls)}>
      <span className="inline-flex items-center gap-1.5">
        {p.icon ? <Icon name={p.icon} size={14} aria-hidden /> : <span aria-hidden>—</span>}
        <span className={cx(value === "deny" && "sr-only")}>{scope && value === "allow" && scope !== "all" ? s.scope[scope] : s.perm[value]}</span>
      </span>
      {tip && (
        <span id={id} role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 w-max max-w-56 -translate-x-1/2 rounded-none bg-ink-900 px-2.5 py-1.5 text-eyebrow font-normal text-white opacity-0 transition-opacity duration-150 group-hover/cell:opacity-100 group-focus/cell:opacity-100">
          {tip}
        </span>
      )}
    </td>
  );
}

// ---------------------------------------------------------------- SK4/SK5 health & environment
const HEALTH: Record<Health, { icon: IconName; cls: string }> = {
  operational: { icon: "check", cls: "bg-success-bg text-success" },
  degraded: { icon: "clock", cls: "bg-warning-bg text-warning" },
  down: { icon: "x", cls: "bg-danger-bg text-danger" },
  untested: { icon: "minus", cls: "bg-ink-100 text-fg-muted" },
  maintenance: { icon: "refresh", cls: "bg-navy-50 text-navy-700" },
};
export function HealthPill({ health, className }: { health: Health; className?: string }) {
  const h = HEALTH[health];
  return (
    <span className={cx(PILL, h.cls, className)}>
      {health === "operational" ? (
        <span aria-hidden className="relative flex size-2"><span className="absolute inset-0 rounded-full bg-success opacity-60 motion-safe:animate-ping" /><span className="relative size-2 rounded-full bg-success" /></span>
      ) : <Icon name={h.icon} size={12} aria-hidden />}
      {useS().health[health]}
    </span>
  );
}
export function EnvPill({ env }: { env: Env | "development" }) {
  const s = useS().shell.env;
  return (
    <span className={cx(PILL, "h-8 border bg-white", env === "production" ? "border-danger/40 text-danger" : "border-border-strong text-fg-muted")}>
      <span aria-hidden className={cx("size-2 rounded-full", env === "production" ? "bg-danger" : env === "sandbox" ? "bg-warning" : "bg-ink-500")} />
      {s[env]}
    </span>
  );
}

// ---------------------------------------------------------------- SK6 audit atoms
export function ChainBadge({ state, entries, hash, brokenAt }: { state: ChainState; entries?: number; hash?: string; brokenAt?: string }) {
  const s = useS().chain;
  const { locale } = useI18n();
  return (
    <span role="status" className={cx(PILL, "h-8", state === "verified" ? "bg-success-bg text-success" : state === "broken" ? "bg-danger-bg text-danger" : "text-fg-muted m-shimmer")}>
      <Icon name={state === "verified" ? "shield" : state === "broken" ? "zap" : "refresh"} size={13} aria-hidden />
      {state === "broken" ? fill(s.broken, { id: brokenAt ?? "?" }) : state === "verified" ? s.verified : s.checking}
      {state === "verified" && entries !== undefined && <span className="font-normal tabular">· {fill(s.entries, { n: entries.toLocaleString(locale === "fr" ? "fr-RW" : "en-RW") })}{hash && <span className="hidden sm:inline"> · {fill(s.lastHash, { h: shortHash(hash) })}</span>}</span>}
    </span>
  );
}
const CAT_TONE: Partial<Record<AuditCategory, string>> = {
  auth: "bg-info-bg text-info", access_control: "bg-navy-50 text-navy-700", config: "bg-ink-100 text-ink-700", data_export: "bg-warning-bg text-warning",
  data_deletion: "bg-danger-bg text-danger", document_access: "bg-warning-bg text-warning", financial: "bg-success-bg text-success",
};
export function CategoryChip({ category }: { category: AuditCategory }) {
  return <span className={cx(PILL, "h-6", CAT_TONE[category] ?? "bg-ink-100 text-fg-muted")}>{useS().category[category]}</span>;
}
export function SevPill({ sev }: { sev: 1 | 2 | 3 }) {
  return <span className={cx(PILL, "h-6 font-semibold tabular", sev === 1 ? "bg-danger text-white" : sev === 2 ? "bg-warning-bg text-warning" : "bg-ink-100 text-ink-700")}>{useS().sev[sev]}</span>;
}
export function DiffLine({ kind, text }: { kind: "+" | "-" | "="; text: string }) {
  const s = useS().diff;
  return (
    <div className={cx("grid grid-cols-[1.25rem_1fr] gap-1 px-3 py-0.5 font-mono text-[0.8rem] leading-6", kind === "+" ? "bg-success-bg text-success" : kind === "-" ? "bg-danger-bg text-danger" : "text-fg-muted")}>
      <span aria-hidden>{kind === "=" ? " " : kind}</span>
      <span className="min-w-0 break-all"><span className="sr-only">{kind === "+" ? s.added : kind === "-" ? s.removed : s.same}: </span>{text}</span>
    </div>
  );
}

// ---------------------------------------------------------------- SK4 secret field (write-only)
export type SecretTest = { ok: boolean; message: string; at: string } | null;
/** Write-only credential: shows last4 + rotation age; the new value is never prefilled and never echoed back. */
export function SecretField({ name, last4, rotatedAt, lastTest, onSave, onTest, disabled }: {
  name: string; last4: string; rotatedAt: string; lastTest?: SecretTest;
  onSave: (value: string) => Promise<void>; onTest?: () => Promise<{ ok: boolean; message: string }>; disabled?: boolean;
}) {
  const s = useS().secret;
  const { locale } = useI18n();
  const id = useId();
  const [mode, setMode] = useState<"idle" | "editing" | "saving" | "testing">("idle");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<SecretTest>(null);
  const test = async () => {
    if (!onTest) return;
    setMode("testing");
    const at = new Date().toISOString();
    try { setResult({ ...(await onTest()), at }); } catch { setResult({ ok: false, message: "—", at }); } finally { setMode("idle"); }
  };
  const save = async () => {
    if (!value.trim()) return;
    setMode("saving");
    try { await onSave(value); setValue(""); setMode("idle"); } catch { setMode("editing"); }
  };
  const shown = result ?? lastTest;
  return (
    <div className="grid gap-2.5">
      <p className="text-label">{name}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-10 min-w-0 flex-1 items-center rounded-none border border-border bg-bg-subtle px-3 font-mono text-small tracking-wider tabular" aria-label={`${name} ending ${last4}`}>••••••••••{last4}</span>
        <button type="button" disabled={disabled || mode !== "idle"} onClick={() => setMode("editing")} className="inline-flex h-10 items-center gap-1.5 rounded-none border border-border-strong bg-white px-3.5 text-small m-press disabled:opacity-50"><Icon name="refresh" size={14} aria-hidden />{s.rotate}</button>
        {onTest && <button type="button" disabled={disabled || mode !== "idle"} onClick={test} className="inline-flex h-10 items-center gap-1.5 rounded-none border border-border-strong bg-white px-3.5 text-small m-press disabled:opacity-50"><Icon name="zap" size={14} aria-hidden />{mode === "testing" ? s.testing : s.test}</button>}
      </div>
      <p className="flex items-center gap-1.5 text-eyebrow text-fg-subtle tabular"><Icon name="clock" size={12} aria-hidden />{fill(s.lastRotated, { t: formatRelative(rotatedAt, locale) })}</p>
      {(mode === "editing" || mode === "saving") && (
        <div className="grid gap-2 rounded-none border border-border bg-white p-3 m-rise">
          <label htmlFor={id} className="text-small font-medium">{s.label}</label>
          <input id={id} type="password" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" spellCheck={false} placeholder={s.paste} autoFocus
            className="h-11 w-full rounded-none border border-border-strong px-3 font-mono text-small" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setValue(""); setMode("idle"); }} className="h-9 rounded-none px-3 text-small hover:bg-bg-subtle">{s.cancel}</button>
            <button type="button" onClick={save} disabled={!value.trim() || mode === "saving"} className="h-9 rounded-none bg-navy-700 px-4 text-small text-white m-press disabled:opacity-50">{s.save}</button>
          </div>
        </div>
      )}
      {shown ? (
        <p role="status" className={cx("flex items-center gap-1.5 text-small", shown.ok ? "text-success" : "text-danger m-shake")}>
          <Icon name={shown.ok ? "check" : "x"} size={14} aria-hidden />
          {shown.ok ? fill(s.passed, { t: formatRelative(shown.at, locale) }) : fill(s.failed, { m: shown.message })}
        </p>
      ) : <p className="text-small text-fg-subtle">{s.never}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- settings hint
export function EnforcedByHint({ id, component, lastChangedBy, lastChangedAt, ownedBy }: { id?: string; component: string; lastChangedBy?: string | null; lastChangedAt?: string | null; ownedBy?: string }) {
  const s = useS().enforced;
  const { locale } = useI18n();
  const role = useRoleLabel();
  return (
    <p id={id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-eyebrow text-fg-subtle">
      <span className="inline-flex items-center gap-1"><Icon name="shield" size={12} aria-hidden className="text-success" />{fill(s.by, { c: component })}</span>
      {ownedBy && <span className="inline-flex items-center gap-1"><Icon name="lock" size={12} aria-hidden />{fill(s.owned, { role: role(ownedBy) })}</span>}
      {lastChangedBy && lastChangedAt && <span className="tabular">{fill(s.changed, { who: lastChangedBy, t: formatRelative(lastChangedAt, locale) })}</span>}
    </p>
  );
}

// ---------------------------------------------------------------- countdown
const clock = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};
/** Live mm:ss pill. Visible text ticks each second (aria-live off); a polite sr-only line updates once a minute. */
export function CountdownPill({ until, danger, className }: { until: string; danger?: boolean; className?: string }) {
  const s = useS().countdown;
  const now = useNow(1000);
  if (!now) return <span aria-hidden className={cx("inline-block h-7 w-20 rounded-none m-shimmer", className)} />;
  const ms = Date.parse(until) - now;
  const ended = ms <= 0;
  const tone = ended ? "bg-ink-100 text-fg-muted" : danger ? "bg-danger text-white" : ms < 15 * 60_000 ? "bg-warning-bg text-warning" : "bg-ink-100 text-ink-700";
  return (
    <span className={cx(PILL, "tabular", tone, className)}>
      <Icon name="clock" size={12} aria-hidden />
      <span aria-live="off">{ended ? s.ended : clock(ms)}</span>
      <span className="sr-only" aria-live="polite">{ended ? s.ended : fill(s.left, { t: `${Math.ceil(ms / 60_000)} min` })}</span>
    </span>
  );
}

// ---------------------------------------------------------------- SK7 locked content
export function LockedContent({ reason, compact }: { reason: "role" | "impersonation" | "break_glass_required"; compact?: boolean }) {
  const s = useS().locked;
  const why = s[`${reason}Why` as const];
  if (compact)
    return (
      <div className="flex items-start gap-3 rounded-none border border-border bg-bg-subtle p-4">
        <Icon name="lock" size={18} aria-hidden className="mt-0.5 shrink-0 text-fg-muted" />
        <p className="text-small"><span className="block font-medium">{s[reason]}</span><span className="text-fg-muted">{why}</span></p>
      </div>
    );
  return (
    <section aria-labelledby="locked-h" className="relative grid place-items-center gap-4 overflow-hidden rounded-none border border-border bg-white px-6 py-14 text-center">
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(closest-side,black,transparent)]" />
      <SysArt name="lock" className="relative m-rise" />
      <h2 id="locked-h" className="relative max-w-md text-h3">{s[reason]}</h2>
      <p className="relative max-w-md text-body text-fg-muted">{why}</p>
    </section>
  );
}

// ---------------------------------------------------------------- §5.5 illustrations (currentColor, lime accents, draw-in)
export type ArtName = "lock" | "shield" | "broken" | "sprout" | "inbox";
/** 64 px line art. Strokes draw in with `m-tick` (static under reduced motion via the global rule). */
export function SysArt({ name, className }: { name: ArtName; className?: string }) {
  const accent = "stroke-gold-500";
  const art: Record<ArtName, ReactNode> = {
    lock: (<>
      <rect x="16" y="28" width="32" height="26" rx="5" />
      <path d="M22 28v-7a10 10 0 0120 0v7" /><circle cx="32" cy="40" r="3" /><path d="M32 43v4" />
      <path className={cx(accent, "m-tick")} d="M50 14l5-4M53 22h6M50 30l5 3" />
    </>),
    shield: (<>
      <path d="M32 8l20 7v14c0 13-9 22-20 27-11-5-20-14-20-27V15z" />
      <path className={cx(accent, "m-tick")} style={{ ["--len" as string]: 30 }} d="M23 32l6 6 12-13" />
    </>),
    broken: (<>
      <path d="M26 22l-6-6a8 8 0 00-11 11l6 6M38 42l6 6a8 8 0 0011-11l-6-6" />
      <path d="M22 30l4 4M38 30l4 4" /><path className="stroke-danger m-tick" d="M30 26l2 6-4 2 6 6" />
    </>),
    sprout: (<>
      <path d="M20 40h24l-3 14H23z" /><path d="M32 40V26" />
      <path className={cx(accent, "m-tick")} d="M32 30c-8 0-12-5-12-11 7 0 12 4 12 11zM32 26c0-7 5-11 12-11 0 6-4 11-12 11z" />
    </>),
    inbox: (<>
      <path d="M10 36l7-18h30l7 18v14H10z" /><path d="M10 36h13l3 5h12l3-5h13" />
      <path className={cx(accent, "m-tick")} d="M25 26l5 5 9-9" />
    </>),
  };
  return (
    <svg viewBox="0 0 64 64" width={64} height={64} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cx("text-fg", className)}>
      {art[name]}
    </svg>
  );
}
