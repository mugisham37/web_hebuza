"use client";
import { useId, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDateTime, formatMoney, formatRelative } from "@/shared/format";
import { Icon, type IconName } from "@/components/atoms/icon";
import { Avatar, Stepper } from "@/components/atoms/misc";
import { Button } from "@/components/atoms/button";
import { Switch, Field, Textarea } from "@/components/atoms/field";
import { type Role } from "@/shared/auth/roles";
import { canonicalJson, redact } from "@/shared/system/audit";
import { pctUsed, budgetTone, smsSegments } from "@/shared/system/templates";
import { type SettingDef } from "@/shared/system/settings-registry";
import { type AuditEntryVM, type ChangeRequestVM, type Channel, type EventRuleVM, type I18nText, type IntegrationVM, type PostureVM, type SessionVM, type SetupItem, type TemplateBody, type SystemUserVM } from "@/shared/system/types";
import { fill, sysError } from "@/content/pages/system-common";
import { CategoryChip, CountdownPill, DiffLine, EnforcedByHint, HealthPill, EnvPill, useRoleLabel, useS, IdentityBlock, LockedContent } from "@/components/atoms/system";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session";
import { ApiError, api } from "@/lib/api/client";
import { useCall, type Call } from "@/lib/system/b";
import { USER_NEXT, isProtectedTarget, IMPERSONATION_MINUTES } from "@/shared/system/governance";
import { systemUsers } from "@/content/pages/system-users";
import { useToast } from "@/components/atoms/toast";
import { Dialog } from "@/components/atoms/dialog";
import { MenuButton, ReasonDialog, PanelError } from "@/components/molecules/ops/ops";
import { StepUpCancelled, useStepUp, usePhone } from "@/components/atoms/step-up";
import { useOnline } from "@/components/atoms/hooks";
import { errorState } from "@/lib/system/api";
import { type UseQueryResult } from "@tanstack/react-query";
import { SkeletonRows } from "@/components/atoms/agent";

// Stage 6 system molecules (plan 06 §5.3, boards 01/02/08–13). Built from system atoms + ui/* + ops molecules.
/** `p.niy…@hebuza.example` — emails are masked in every list (§10.2). */
export const maskEmail = (e: string) => { const [u, d] = e.split("@"); return d ? `${u.slice(0, Math.min(5, Math.max(1, u.length - 2)))}…@${d}` : e; };
/** `41.186.23.•` — last octet masked in session lists. */
export const maskIp = (ip: string) => (ip.includes(".") ? ip.replace(/\.\d+$/, ".•") : ip.replace(/:[^:]+$/, ":•"));

// ---------------------------------------------------------------- SK3 approver path
/** Requester → approver(s), pending timer, and the self-request lock (two-person rule, shown BEFORE submit too). */
export function ApproverPath({ cr, me, names }: { cr: Pick<ChangeRequestVM, "proposedBy" | "approvers" | "decisions" | "expiresAt" | "state" | "title">; me?: string; names?: Partial<Record<Role, string>> }) {
  const s = useS().approver;
  const role = useRoleLabel();
  const mine = me === cr.proposedBy.id && cr.state === "proposed";
  return (
    <div className="grid gap-3 border border-border bg-surface p-4">
      <p className="text-eyebrow font-medium tracking-wide text-fg-subtle uppercase">{s.title}</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={cr.proposedBy.name} size="sm" />
          <span className="min-w-0 text-small"><span className="block truncate font-medium">{cr.proposedBy.name}</span><span className="block truncate text-fg-muted">{s.requested} “{cr.title}”</span></span>
        </span>
        <Icon name="arrowRight" size={18} aria-hidden className="shrink-0 text-fg-subtle" />
        <ul className="flex flex-wrap items-center gap-2" aria-label={s.needs}>
          {cr.approvers.map((r, i) => {
            const done = cr.decisions.find((d) => d.decision === "approve" && (r.anyOf ?? [r.role]).includes(d.by.role));
            const label = names?.[r.role] ?? (r.anyOf ?? [r.role]).map((x) => fill(s.anyRole, { role: role(x) })).join(` ${s.or} `);
            return (
              <li key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-small text-fg-subtle">{s.and}</span>}
                <span className={cx("inline-flex h-8 items-center gap-1.5 px-3 text-small", done ? "bg-success-bg text-success" : "bg-gold-100 text-gold-800")}>
                  <Icon name={done ? "check" : "clock"} size={13} aria-hidden />{done ? `${done.by.name} · ${s.approved}` : label}
                </span>
              </li>
            );
          })}
        </ul>
        {cr.state === "proposed" && <CountdownPill until={cr.expiresAt} className="ml-auto" />}
      </div>
      {mine && (
        <p className="flex items-center gap-2 border-l-2 border-secondary bg-bg-subtle px-3 py-2.5 text-small"><Icon name="lock" size={15} aria-hidden />{s.self}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- SK6 diff
function lines(v: unknown, keys?: readonly string[]): Map<string, string> {
  const out = new Map<string, string>();
  const red = redact(v, keys) as unknown;
  const walk = (x: unknown, path: string) => {
    if (x && typeof x === "object" && !Array.isArray(x)) Object.entries(x as Record<string, unknown>).forEach(([k, y]) => walk(y, path ? `${path}.${k}` : k));
    else out.set(path || "value", canonicalJson(x, false));
  };
  walk(red, "");
  return out;
}
/** Key-level before/after diff with secrets redacted (F-AUD-03). */
export function DiffView({ before, after, redactKeys, title }: { before: unknown; after: unknown; redactKeys?: readonly string[]; title?: string }) {
  const s = useS().diff;
  const rows = useMemo(() => {
    const b = lines(before, redactKeys), a = lines(after, redactKeys);
    const keys = [...new Set([...b.keys(), ...a.keys()])];
    return keys.flatMap((k): { kind: "+" | "-" | "="; text: string }[] => {
      const x = b.get(k), y = a.get(k);
      if (x === y) return [{ kind: "=", text: `${k}: ${x}` }];
      return [...(x !== undefined ? [{ kind: "-" as const, text: `${k}: ${x}` }] : []), ...(y !== undefined ? [{ kind: "+" as const, text: `${k}: ${y}` }] : [])];
    });
  }, [before, after, redactKeys]);
  return (
    <figure className="overflow-hidden border border-border bg-surface">
      {title && <figcaption className="border-b border-border px-3 py-2 text-small font-medium">{title}</figcaption>}
      <div className="max-h-80 overflow-auto py-1">{rows.length ? rows.map((r, i) => <DiffLine key={i} {...r} />) : <p className="px-3 py-2 text-small text-fg-muted">{s.noChanges}</p>}</div>
    </figure>
  );
}

// ---------------------------------------------------------------- conflict / pending
export function ConflictBanner({ by, at, onReview, onReload }: { by: string; at: string; onReview?: () => void; onReload: () => void }) {
  const s = useS().states;
  const { locale } = useI18n();
  return (
    <div role="alert" className="flex flex-wrap items-start gap-3 border border-warning/30 bg-warning-bg p-4 m-rise">
      <Icon name="refresh" size={18} aria-hidden className="mt-0.5 shrink-0 text-warning" />
      <div className="min-w-0 flex-1 text-small"><p className="font-medium">{s.conflictTitle}</p><p className="text-fg-muted">{fill(s.conflictBody, { by, t: formatRelative(at, locale) })}</p></div>
      <div className="flex gap-2">
        {onReview && <Button size="sm" variant="outline" onClick={onReview}>{s.review}</Button>}
        <Button size="sm" onClick={onReload}>{s.reload}</Button>
      </div>
    </div>
  );
}
export function PendingChangeBanner({ changes, href }: { changes: Pick<ChangeRequestVM, "id" | "title" | "approvers" | "effectiveAt">[]; href?: string }) {
  const s = useS();
  const role = useRoleLabel();
  const { locale } = useI18n();
  if (!changes.length) return null;
  return (
    <div role="status" className="grid gap-2 border border-navy-100 bg-info-bg p-4 m-rise">
      <p className="flex items-center gap-2 text-small font-medium"><Icon name="clock" size={16} aria-hidden className="text-navy-700" />{fill(s.pending.banner, { n: changes.length })}</p>
      <ul className="grid gap-1 pl-6 text-small text-fg-muted">
        {changes.map((c) => (
          <li key={c.id}>
            {href ? <Link href={localHref(locale, `${href}?id=${c.id}`)} className="text-link underline underline-offset-4 hover:text-link-hover">{c.title}</Link> : c.title}
            {" — "}{c.approvers.map((a) => role(a.role)).join(` ${s.approver.and} `)}
            {c.effectiveAt && ` · ${fill(s.pending.effective, { t: formatDateTime(c.effectiveAt, locale) })}`}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- settings field
/** Label + control by type + "Enforced by" + last change. Read-only/owned types render as text. */
export function SettingField({ def, label, description, value, onChange, disabled, changedBy, changedAt, error }: {
  def: SettingDef; label: string; description?: string; value: unknown; onChange: (v: unknown) => void; disabled?: boolean;
  changedBy?: string | null; changedAt?: string | null; error?: string | null;
}) {
  const id = useId();
  const hint = `${id}-hint`;
  const s = useS();
  const ro = def.type === "readonly" || disabled;
  const control = (() => {
    switch (def.type) {
      case "bool": return <Switch label={<span className="sr-only">{label}</span>} checked={value === true} disabled={ro} aria-describedby={hint} onChange={(e) => onChange(e.target.checked)} />;
      case "int": return (
        <span className="inline-flex items-center gap-2">
          <input id={id} type="number" inputMode="numeric" value={Number(value)} disabled={ro} aria-describedby={hint} aria-invalid={!!error || undefined}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} className="h-11 w-28 border border-border-strong bg-surface px-3 tabular hover:border-ink-400 focus-visible:border-focus" />
          {def.unit && <span className="text-small text-fg-muted">{def.unit}</span>}
        </span>
      );
      case "enum": return (
        <select id={id} value={String(value)} disabled={ro} aria-describedby={hint} onChange={(e) => onChange(e.target.value)} className="h-11 border border-border-strong bg-surface px-3 hover:border-ink-400 focus-visible:border-focus">
          {def.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      default: return (
        <p className="flex items-center gap-2 text-small"><span className="tabular">{Array.isArray(value) ? value.join(", ") || "—" : String(value ?? "—")}{def.unit ? ` ${def.unit}` : ""}</span>{def.type === "readonly" && <span className="inline-flex h-6 items-center gap-1 bg-ink-100 px-2 text-eyebrow text-ink-700"><Icon name="lock" size={11} aria-hidden />{s.enforced.readonly}</span>}</p>
      );
    }
  })();
  return (
    <div className="grid gap-2 border-b border-border py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6">
      <div className="min-w-0">
        <label htmlFor={def.type === "bool" ? undefined : id} className="text-label">{label}</label>
        {description && <p className="mt-0.5 text-small text-fg-muted">{description}</p>}
        <div className="mt-1.5"><EnforcedByHint id={hint} component={def.enforcedBy} lastChangedBy={changedBy} lastChangedAt={changedAt} ownedBy={def.ownedBy} /></div>
        {error && <p role="alert" className="mt-1 text-small font-medium text-danger">{error}</p>}
      </div>
      <div className="sm:justify-self-end">{control}</div>
    </div>
  );
}

// ---------------------------------------------------------------- banners (stack order: break-glass → impersonation → maintenance → offline)
function Bar({ tone, icon, children, action, label }: { tone: "danger" | "info" | "night"; icon: "shield" | "user" | "refresh" | "globe"; children: ReactNode; action?: ReactNode; label: string }) {
  return (
    <div role="region" aria-label={label} className={cx("flex flex-wrap items-center gap-3 px-4 py-3 text-small m-rise", tone === "danger" ? "bg-danger text-white" : tone === "info" ? "border-l-4 border-info bg-info-bg text-fg" : "theme-dark bg-bg text-fg")}>
      <Icon name={icon} size={18} aria-hidden className="shrink-0" />
      <p className="min-w-0 flex-1">{children}</p>
      {action}
    </div>
  );
}
const barBtn = "h-8 shrink-0 bg-white/15 px-3 text-small font-medium hover:bg-white/25 m-press";
export function BreakGlassBanner({ until, actor, onEnd }: { until: string; actor: string; onEnd?: () => void }) {
  const s = useS().banners;
  return (
    <Bar tone="danger" icon="shield" label={actor} action={onEnd && <button type="button" onClick={onEnd} className={barBtn}>{s.breakGlassEnd}</button>}>
      {s.breakGlass} <CountdownPill until={until} danger className="ml-1 align-middle" />
    </Bar>
  );
}
export function ImpersonationBanner({ target, reason, until, onEnd }: { target: string; reason: string; until: string; onEnd: () => void }) {
  const s = useS().banners;
  const text = fill(s.impersonation, { name: target, reason });
  return (
    <div className="sticky top-16 z-20">
      <Bar tone="danger" icon="user" label={text} action={<button type="button" onClick={onEnd} className={barBtn}>{s.impersonationEnd}<Icon name="arrowRight" size={13} aria-hidden className="ml-1 inline" /></button>}>
        {text} <CountdownPill until={until} danger className="ml-1 align-middle" />
      </Bar>
    </div>
  );
}
export function MaintenanceBanner({ message, until }: { message: I18nText; until: string | null }) {
  const s = useS().banners;
  const { locale } = useI18n();
  return (
    <Bar tone="info" icon="refresh" label="Maintenance">
      {fill(s.maintenance, { msg: message[locale] || message.en })}{until && <span className="ml-1 text-fg-muted">{fill(s.maintenanceUntil, { t: formatDateTime(until, locale) })}</span>}
    </Bar>
  );
}
export function OfflineBanner({ since }: { since: string }) {
  const { locale } = useI18n();
  return <Bar tone="night" icon="globe" label="Offline">{fill(useS().banners.offline, { t: formatDateTime(since, locale) })}</Bar>;
}

// ---------------------------------------------------------------- SK5 budget / uptime
export function BudgetBar({ label, spent, budget }: { label: string; spent: number; budget: number }) {
  const s = useS().budget;
  const { locale } = useI18n();
  const pct = pctUsed(spent, budget);
  const tone = budgetTone(pct);
  return (
    <div className="grid gap-1.5">
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-small">
        <span className="font-medium">{label}</span>
        <span className="text-fg-muted tabular">{fill(s.of, { spent: formatMoney(spent, "RWF", locale), budget: formatMoney(budget, "RWF", locale), pct })}{tone !== "ok" && <span className={cx("ml-2 font-medium", tone === "danger" ? "text-danger" : "text-warning")}>{tone === "danger" ? s.over : s.near}</span>}</span>
      </p>
      <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(pct, 100)} className="h-2 overflow-hidden bg-ink-100">
        <div className={cx("h-full origin-left transition-[width] duration-(--dur-4) ease-(--ease-out-expo)", tone === "danger" ? "bg-danger" : tone === "warning" ? "bg-warning" : "bg-secondary")} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}
/** 90 thin bars (green / amber / red by daily uptime) + text summary for screen readers. */
export function UptimeBars({ days }: { days: { date: string; up: number }[] }) {
  const s = useS().uptime;
  const avg = days.length ? days.reduce((n, d) => n + d.up, 0) / days.length : 1;
  const pct = (avg * 100).toFixed(2);
  return (
    <figure className="grid gap-1.5">
      <div role="img" aria-label={fill(s.summary, { pct, n: days.length })} className="flex h-8 items-end gap-px">
        {days.map((d, i) => (
          <span key={d.date} title={fill(s.day, { d: d.date, pct: (d.up * 100).toFixed(2) })} style={{ ["--i" as string]: i }}
            className={cx("h-full min-w-[2px] flex-1 m-grow", d.up >= 0.999 ? "bg-success" : d.up >= 0.99 ? "bg-warning" : "bg-danger")} />
        ))}
      </div>
      <figcaption className="text-eyebrow text-fg-subtle tabular">{fill(s.summary, { pct, n: days.length })}</figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------- audit row (no motion: high-frequency surface)
/** Resource link rules (§8.1): users/settings/templates/integrations link; cases never (SYS lacks req.case.read). */
export function resourceHref(type: string, id: string): string | null {
  switch (type) {
    case "user": return `/system/users/${id}?tab=activity`;
    case "setting": return `/system/settings/${id.split(".")[0] === "flags" ? "flags" : id.split(".")[0]}`;
    case "template": return `/system/notifications/templates/${id}`;
    case "integration": return `/system/integrations/${id}`;
    case "change": return `/system/approvals?id=${id}`;
    default: return null;
  }
}
export function AuditRow({ entry, onOpen }: { entry: AuditEntryVM; onOpen: (id: string) => void }) {
  const { locale } = useI18n();
  return (
    <tr className="border-b border-border last:border-0 hover:bg-navy-50">
      <td className="px-3 py-2.5 text-small whitespace-nowrap text-fg-muted tabular">{formatDateTime(entry.at, locale)}</td>
      <td className="px-3 py-2.5 text-small"><span className="font-medium">{entry.actorLabel}</span>{entry.impersonatorId && <span className="ml-1 text-eyebrow text-danger">(as)</span>}{entry.breakGlass && <span className="ml-1 text-eyebrow text-danger">BG</span>}</td>
      <td className="px-3 py-2.5"><button type="button" onClick={() => onOpen(entry.id)} className="text-left font-mono text-[0.8rem] underline-offset-4 hover:underline">{entry.action}</button></td>
      <td className="px-3 py-2.5"><CategoryChip category={entry.category} /></td>
      <td className="px-3 py-2.5 font-mono text-[0.8rem] text-fg-muted">{entry.resourceType}:{entry.resourceId}</td>
      <td className="px-3 py-2.5 text-small text-fg-subtle tabular">{entry.ip}</td>
    </tr>
  );
}

// ---------------------------------------------------------------- sessions
export function SessionRow({ session, onRevoke, busy }: { session: SessionVM; onRevoke?: () => void; busy?: boolean }) {
  const s = useS().session;
  const { locale } = useI18n();
  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-0">
      <span className="flex size-9 items-center justify-center bg-ink-100 text-ink-700"><Icon name={/iPhone|Android|Pixel|Galaxy/i.test(session.device) ? "phone" : "laptop"} size={16} aria-hidden /></span>
      <span className="min-w-0 flex-1 text-small">
        <span className="block font-medium">{session.device}{session.current && <span className="ml-2 bg-gold-400 px-2 py-0.5 text-eyebrow font-medium text-on-gold">{s.current}</span>}</span>
        <span className="block text-fg-muted tabular">{maskIp(session.ip)}{session.city ? ` · ${session.city}` : ""} · {fill(s.lastSeen, { t: formatRelative(session.lastSeenAt, locale) })}</span>
      </span>
      {onRevoke && !session.current && <Button size="sm" variant="outline" loading={busy} onClick={onRevoke}>{s.revoke}</Button>}
    </li>
  );
}

// ---------------------------------------------------------------- IG1 integration card
export function IntegrationCard({ integration: i, href }: { integration: IntegrationVM; href?: string }) {
  const s = useS().integration;
  const { locale } = useI18n();
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-label">{i.name}</p>
        <EnvPill env={i.env} />
      </div>
      <div className="flex flex-wrap items-center gap-2"><HealthPill health={i.health} />{!i.configured && <span className="text-small text-fg-muted">{s.notSetUp}</span>}</div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-small">
        <dt className="text-fg-subtle">{fill(s.lastTest, { t: "" }).trim()}</dt><dd className="text-right tabular">{i.lastTest ? formatRelative(i.lastTest.at, locale) : "—"}</dd>
        <dt className="text-fg-subtle">{fill(s.errorRate, { p: "" }).trim()}</dt><dd className={cx("text-right tabular", i.errorRate1h >= 0.05 && "font-medium text-warning")}>{(i.errorRate1h * 100).toFixed(1)}%</dd>
        {i.usage && <><dt className="text-fg-subtle">Usage</dt><dd className="text-right tabular">{fill(s.usage, { used: i.usage.used.toLocaleString(), limit: i.usage.limit.toLocaleString() })}</dd></>}
      </dl>
    </>
  );
  const cls = "grid gap-3 border border-border bg-surface p-4";
  return href ? <Link href={localHref(locale, href)} className={cx(cls, "m-lift")}>{body}</Link> : <div className={cls}>{body}</div>;
}

// ---------------------------------------------------------------- NT1 event rule row
const CHANNELS: Channel[] = ["inapp", "email", "whatsapp", "sms"];
export function EventRuleRow({ rule, onChange, locked }: { rule: EventRuleVM; onChange: (r: EventRuleVM) => void; locked?: boolean }) {
  const s = useS().rule;
  const lock = locked ?? rule.security;
  return (
    <tr className="border-b border-border last:border-0">
      <th scope="row" className="px-3 py-3 text-left font-mono text-[0.8rem] font-normal">{rule.event}{rule.critical && <span className="ml-2 bg-danger-bg px-2 py-0.5 font-sans text-eyebrow text-danger">{s.critical}</span>}</th>
      {CHANNELS.map((c) => (
        <td key={c} className="px-3 py-3">
          <input type="checkbox" role="switch" aria-label={`${rule.event} · ${s[c]}`} checked={rule.channels[c]} disabled={lock && rule.channels[c]}
            title={lock && rule.channels[c] ? s.locked : undefined} onChange={(e) => onChange({ ...rule, channels: { ...rule.channels, [c]: e.target.checked } })} className="size-4 accent-secondary" />
        </td>
      ))}
      <td className="px-3 py-3 text-small text-fg-muted">{rule.chain.map((c) => s[c]).join(" → ")}</td>
    </tr>
  );
}

// ---------------------------------------------------------------- NT3/NT4 previews
export function WhatsAppBubble({ body }: { body: TemplateBody }) {
  return (
    <figure aria-label={useS().preview.whatsapp} className="bg-ink-100 p-4">
      <div className="ml-auto max-w-[19rem] bg-surface p-3 text-small shadow-sm">
        {body.header && <p className="mb-1 font-semibold">{body.header}</p>}
        <p className="whitespace-pre-wrap">{body.body}</p>
        {body.footer && <p className="mt-1 text-eyebrow text-fg-subtle">{body.footer}</p>}
        {body.button && <p className="mt-2 border-t border-border pt-2 text-center font-medium text-info">{body.button}</p>}
      </div>
    </figure>
  );
}
export function SmsBubble({ text }: { text: string }) {
  const s = useS().preview;
  const seg = smsSegments(text);
  return (
    <figure aria-label={s.sms} className="grid gap-2 bg-bg-subtle p-4">
      <p className="max-w-[19rem] border border-border bg-surface p-3 text-small whitespace-pre-wrap">{text}</p>
      <figcaption className={cx("text-eyebrow tabular", seg.segments > 1 ? "text-warning" : "text-fg-subtle")}>{fill(s.segments, { n: seg.segments, enc: seg.encoding, len: seg.length })}</figcaption>
      {seg.encoding === "UCS-2" && <p className="text-eyebrow text-warning">{s.unicode}</p>}
    </figure>
  );
}
export function EmailPreview({ body }: { body: TemplateBody }) {
  const s = useS().preview;
  return (
    <figure aria-label={s.email} className="overflow-hidden border border-border bg-surface">
      <p className="border-b border-border bg-bg-subtle px-4 py-2 text-small"><span className="text-fg-subtle">{s.subject}: </span>{body.subject ?? "—"}</p>
      <div className="grid gap-3 p-5 text-small">
        <p className="text-label text-fg-heading">HEBUZA</p>
        <p className="whitespace-pre-wrap">{body.body}</p>
      </div>
    </figure>
  );
}

// ---------------------------------------------------------------- posture + setup
export function PostureCheck({ check }: { check: PostureVM }) {
  const s = useS().posture;
  return (
    <li className="flex items-start gap-3 border-b border-border py-3 last:border-0">
      <span className={cx("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", check.status === "pass" ? "bg-success-bg text-success" : check.status === "warn" ? "bg-warning-bg text-warning" : "bg-danger-bg text-danger")}>
        <Icon name={check.status === "pass" ? "check" : check.status === "warn" ? "clock" : "x"} size={13} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-small">
        <span className="block font-medium">{check.label} <span className="sr-only">— {s[check.status]}</span></span>
        {check.detail && <span className="block break-words font-mono text-[0.78rem] text-fg-muted">{check.detail}</span>}
        <span className="block text-eyebrow text-fg-subtle">{fill(s.source, { s: check.source })}</span>
      </span>
    </li>
  );
}
export function SetupChecklist({ items }: { items: SetupItem[] }) {
  const s = useS().setup;
  const { locale } = useI18n();
  const done = items.filter((i) => i.done).length;
  return (
    <section aria-labelledby="setup-h" className="grid gap-4 border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="setup-h" className="text-label-lg text-fg-heading">{s.title}</h2>
        <span className="text-small text-fg-muted tabular">{fill(s.progress, { done, total: items.length })}</span>
      </div>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done} aria-labelledby="setup-h" className="h-2 overflow-hidden bg-ink-100">
        <div className="h-full bg-secondary transition-[width] duration-(--dur-4) ease-(--ease-out-expo)" style={{ width: `${(done / Math.max(1, items.length)) * 100}%` }} />
      </div>
      <ol className="grid gap-1 m-stagger">
        {items.map((i, n) => (
          <li key={i.key} style={{ ["--i" as string]: n }} className="flex items-center gap-3 px-2 py-2 hover:bg-navy-50">
            <span className={cx("flex size-6 shrink-0 items-center justify-center rounded-full border", i.done ? "border-success bg-success-icon text-white" : "border-border-strong")}>{i.done && <Icon name="check" size={13} aria-hidden />}</span>
            <span className={cx("min-w-0 flex-1 text-small", i.done && "text-fg-muted line-through decoration-1")}>{s.items[i.key as keyof typeof s.items] ?? i.key}</span>
            {!i.done && <Link href={localHref(locale, i.href)} className="inline-flex h-8 items-center bg-secondary px-3 text-small text-on-secondary transition-colors hover:bg-secondary-hover m-press">{s.fix}</Link>}
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------- page head shared by every /system page
export function SysPageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0"><h1 className="text-h2 text-fg-heading">{title}</h1>{sub && <p className="mt-1 text-body text-fg-muted">{sub}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** Small controlled-state helper for dialogs that must confirm discarding typed input (no window.confirm). */
export function useDirtyGuard() {
  const [ask, setAsk] = useState(false);
  return { ask, request: () => setAsk(true), cancel: () => setAsk(false) };
}

// Lane B shared pieces: guarded writes (offline → disabled, step-up → retry once, errorType → copy), the per-user
// actions menu used by the Users table and the detail header, and the U11 "View as" dialog.
export const useC = () => systemUsers(useI18n().locale);

/** Guarded writes. `run` throws an Error carrying localized copy (ReasonDialog shows it inline); `attempt` toasts it. */
export function useRun() {
  const s = useS();
  const toast = useToast();
  const step = useStepUp();
  const online = useOnline();
  const { call, busy } = useCall();
  const msg = (e: unknown) =>
    e instanceof StepUpCancelled ? s.errors.step_up_required
      : e instanceof ApiError ? (s.errors as Record<string, string>)[e.errorType ?? ""] ?? s.errors.server_error
      : s.errors.server_error;
  async function run<T>(c: Call, stepUp?: string): Promise<T> {
    if (!online) throw new Error(s.states.offlineAction);
    try {
      const token = stepUp ? await step.request(stepUp) : undefined;
      try {
        return await call<T>({ ...c, stepUp: token });
      } catch (e) {
        if (!stepUp || !(e instanceof ApiError) || e.errorType !== "step_up_required") throw e;
        step.reset();
        return await call<T>({ ...c, stepUp: await step.request(stepUp) });
      }
    } catch (e) {
      const err = new Error(msg(e));
      (err as Error & { cause?: unknown }).cause = e;
      throw err;
    }
  }
  async function attempt<T>(c: Call, o: { stepUp?: string; ok?: string; okBody?: string } = {}): Promise<T | null> {
    try {
      const r = await run<T>(c, o.stepUp);
      if (o.ok) toast({ title: o.ok, body: o.okBody, tone: "success" });
      return r;
    } catch (e) {
      if (!((e as { cause?: unknown }).cause instanceof StepUpCancelled)) toast({ title: (e as Error).message, tone: "danger" });
      return null;
    }
  }
  return { run, attempt, busy, online, dialog: step.dialog, toast };
}
export const causeOf = (e: unknown) => (e as { cause?: unknown })?.cause;

/** Inline confirm with no reason (force reset, revoke all). */
export function ConfirmDialog({ open, onClose, title, body, confirm, danger, onConfirm, children }: {
  open: boolean; onClose: () => void; title: string; body?: ReactNode; confirm: string; danger?: boolean; onConfirm: () => Promise<unknown>; children?: ReactNode;
}) {
  const s = useS();
  const phone = usePhone();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const shut = () => { setErr(null); onClose(); };
  const go = async () => { setBusy(true); setErr(null); try { await onConfirm(); shut(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <Dialog open={open} onClose={shut} side={phone ? "bottom" : undefined} title={title} description={body}
      footer={<><Button variant="outline" onClick={shut}>{s.common.cancel}</Button><Button variant={danger ? "danger" : "primary"} loading={busy} onClick={go}>{confirm}</Button></>}>
      {children}
      {err && <p role="alert" className="mt-3 bg-danger-bg p-3 text-small font-medium text-danger m-shake">{err}</p>}
    </Dialog>
  );
}

type Item = { key: string; label: string; icon: IconName; onClick?: () => void; href?: string; disabled?: string; danger?: boolean };

// shortcut: each row mounts its own dialogs + step-up, hoist to one table-level instance if long lists feel slow.
/** Every action a sysadmin can take on one user, filtered by status and guards (self, last sysadmin, protected). */
export function UserActions({ user: u, lastSysadmin, compact }: { user: SystemUserVM; lastSysadmin?: boolean; compact?: boolean }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const me = useSession().user?.id;
  const { attempt, run, online, dialog, toast } = useRun();
  const [open, setOpen] = useState<null | "suspend" | "reactivate" | "reset" | "sessions" | "viewAs">(null);
  const L = (p: string) => localHref(locale, p);
  const self = u.id === me;
  const next = USER_NEXT[u.status];
  const off = !online ? s.states.offlineAction : self ? c.d.you : undefined;
  const status = (action: "suspend" | "reactivate" | "deactivate" | "unlock" | "resend" | "revoke_invite", reason: string) => run<SystemUserVM>({ req: (h) => api.POST("/api/staff/users/{id}/status", { params: { path: { id: u.id } }, body: { action, reason }, headers: h }) });
  const items: Item[] = [{ key: "view", label: c.actions.view, icon: "user", href: L(`/system/users/${u.id}`) }];
  if (u.kind !== "service") {
    if (next.resend) items.push({ key: "resend", label: c.actions.resend, icon: "mail", disabled: off, onClick: async () => {
      const r = await attempt<SystemUserVM>({ req: (h) => api.POST("/api/staff/users/invitations/{id}/{op}", { params: { path: { id: u.id, op: "resend" } }, headers: h }) });
      if (r?.invitation) toast({ title: fill(c.toast.resent, { t: formatDateTime(r.invitation.expiresAt, locale) }), tone: "success" });
    } });
    if (next.revoke_invite) items.push({ key: "revokeInv", label: c.actions.revoke, icon: "x", danger: true, disabled: off, onClick: () => attempt({ req: (h) => api.POST("/api/staff/users/invitations/{id}/{op}", { params: { path: { id: u.id, op: "revoke" } }, headers: h }) }, { ok: c.toast.revoked }) });
    if (next.unlock) items.push({ key: "unlock", label: c.actions.unlock, icon: "lock", disabled: off, onClick: () => attempt({ req: (h) => api.POST("/api/staff/users/{id}/unlock", { params: { path: { id: u.id } }, body: {}, headers: h }) }, { ok: fill(c.toast.unlocked, { name: u.name }) }) });
    if (next.reactivate) items.push({ key: "reactivate", label: c.actions.reactivate, icon: "refresh", disabled: off, onClick: () => setOpen("reactivate") });
    if (u.status === "active" || u.status === "suspended" || u.status === "locked") {
      items.push(
        { key: "sessions", label: c.actions.sessions, icon: "laptop", disabled: !online ? off : undefined, onClick: () => setOpen("sessions") },
        { key: "reset", label: c.actions.reset, icon: "refresh", disabled: off, onClick: () => setOpen("reset") },
        { key: "mfa", label: c.actions.mfa, icon: "shield", href: L(`/system/identity?q=${encodeURIComponent(u.name)}`) },
      );
    }
    if (u.status === "active" && u.kind !== "client") items.push({ key: "viewAs", label: c.actions.viewAs, icon: "users", disabled: !online ? off : isProtectedTarget(u) ? c.imp.protected : self ? c.d.you : undefined, onClick: () => setOpen("viewAs") });
    if (next.suspend) items.push({ key: "suspend", label: c.actions.suspend, icon: "clock", danger: true, disabled: off ?? (lastSysadmin ? c.lastSysadmin : undefined), onClick: () => setOpen("suspend") });
    if (next.deactivate && u.kind !== "client") items.push({ key: "offboard", label: c.actions.offboard, icon: "briefcase", danger: true, disabled: off ?? (lastSysadmin ? c.lastSysadmin : undefined), href: L(`/system/users/${u.id}/offboard`) });
  }
  const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));
  const reasonText = (o: Record<string, string>, v: { reason: string; note: string }) => [o[v.reason], v.note].filter(Boolean).join(" — ");

  return (
    <>
      <MenuButton align="right" active={false} label={compact ? <span className="sr-only">{fill(c.actions.menu, { name: u.name })}</span> : c.cols.actions} icon="menu">
        {(close) => (
          <ul role="menu" aria-label={fill(c.actions.menu, { name: u.name })} className="grid min-w-60">
            {items.map((it) => {
              const cls = cx("flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-small m-press", it.disabled ? "cursor-not-allowed text-fg-disabled" : "hover:bg-navy-50", it.danger && !it.disabled && "text-danger");
              const body = <><Icon name={it.icon} size={15} aria-hidden /><span className="min-w-0 flex-1"><span className="block">{it.label}</span>{it.disabled && <span className="block text-eyebrow text-fg-subtle">{it.disabled}</span>}</span></>;
              return (
                <li key={it.key} role="none">
                  {it.href && !it.disabled ? <Link role="menuitem" href={it.href} className={cls} onClick={close}>{body}</Link>
                    : <button role="menuitem" type="button" aria-disabled={!!it.disabled || undefined} className={cls} onClick={() => { if (it.disabled) return; close(); it.onClick?.(); }}>{body}</button>}
                </li>
              );
            })}
          </ul>
        )}
      </MenuButton>
      {dialog}
      <ReasonDialog open={open === "suspend"} onClose={() => setOpen(null)} title={fill(c.suspendTitle, { name: u.name })} description={c.suspendBody}
        options={opts(c.reasonOpts.suspend)} noteLabel={c.reasonNote} confirmLabel={c.actions.suspend} destructive audited
        onConfirm={async (v) => { await status("suspend", reasonText(c.reasonOpts.suspend, v)); toast({ title: fill(c.toast.suspended, { name: u.name }), tone: "success" }); }} />
      <ReasonDialog open={open === "reactivate"} onClose={() => setOpen(null)} title={fill(c.reactivateTitle, { name: u.name })} description={c.reactivateBody}
        options={opts(c.reasonOpts.reactivate)} noteLabel={c.reasonNote} confirmLabel={c.actions.reactivate} audited
        onConfirm={async (v) => { await status("reactivate", reasonText(c.reasonOpts.reactivate, v)); toast({ title: fill(c.toast.reactivated, { name: u.name }), tone: "success" }); }} />
      <ConfirmDialog open={open === "reset"} onClose={() => setOpen(null)} title={c.d.sec.reset} body={c.d.sec.resetBody} confirm={c.d.sec.resetConfirm} danger
        onConfirm={() => attempt({ req: (h) => api.POST("/api/staff/users/{id}/password-reset", { params: { path: { id: u.id } }, headers: h }) }, { stepUp: c.d.sec.reset, ok: fill(c.toast.reset, { name: u.name }) })} />
      <ConfirmDialog open={open === "sessions"} onClose={() => setOpen(null)} title={fill(c.d.sess.revokeAllTitle, { name: u.name })} body={c.d.sess.revokeAllBody} confirm={c.d.sess.revokeAll} danger
        onConfirm={() => attempt({ req: (h) => api.DELETE("/api/staff/users/{id}/sessions", { params: { path: { id: u.id } }, headers: h }) }, { stepUp: c.d.sess.revokeAll, ok: c.toast.sessions })} />
      <ImpersonateDialog user={u} open={open === "viewAs"} onClose={() => setOpen(null)} />
    </>
  );
}

// ---------------------------------------------------------------- U11 View as
export function ImpersonateDialog({ user: u, open, onClose }: { user: SystemUserVM; open: boolean; onClose: () => void }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const router = useRouter();
  const phone = usePhone();
  const { run, online, dialog, toast } = useRun();
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState<number>(IMPERSONATION_MINUTES[0]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const blocked = isProtectedTarget(u) ? c.imp.protected : u.status !== "active" ? c.imp.inactive : null;
  const close = () => { setReason(""); setErr(null); setStep(0); setBusy(false); onClose(); };
  const start = async () => {
    if (reason.trim().length < 10) return setErr(c.imp.errReason);
    setErr(null); setBusy(true); setStep(1);
    try {
      const r = await run<{ until: string; home: string }>({ req: (h) => api.POST("/api/staff/impersonate", { body: { targetId: u.id, reason: reason.trim(), minutes }, headers: h }) }, c.imp.stepUp);
      setStep(2);
      toast({ title: fill(c.imp.started, { name: u.name }), tone: "success" });
      close();
      router.push(localHref(locale, r.home));
    } catch (e) {
      const ce = causeOf(e);
      setErr(ce instanceof ApiError && ce.status === 409 ? c.imp.already : (e as Error).message);
      setStep(0); setBusy(false);
    }
  };
  return (
    <>
      <Dialog open={open} onClose={close} side={phone ? "bottom" : undefined} title={fill(c.imp.title, { name: u.name })} description={c.imp.sub} 
        footer={<><Button variant="outline" onClick={close}>{s.common.cancel}</Button><Button dots loading={busy} disabled={!!blocked || !online} onClick={start}>{c.imp.start}</Button></>}>
        <div className="grid gap-5">
          <Stepper steps={c.imp.steps} current={step} />
          <div className="grid gap-4">
            <IdentityBlock name={u.name} email={u.email} roles={u.roles.map((r) => r.role)} status={u.status} mfa={u.mfa} lastActiveAt={u.lastActiveAt} />
            {blocked ? (
              <p role="alert" className="flex items-start gap-2 bg-danger-bg p-3 text-small text-danger"><Icon name="lock" size={16} aria-hidden className="mt-0.5 shrink-0" />{blocked}</p>
            ) : (
              <>
                <Field label={c.imp.reason} hint={c.imp.reasonHint} error={err ?? undefined}>
                  {(f) => <Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} className="min-h-20" />}
                </Field>
                <fieldset className="grid gap-2">
                  <legend className="mb-1.5 text-label">{c.imp.duration}</legend>
                  <div className="flex flex-wrap gap-2">
                    {IMPERSONATION_MINUTES.map((m) => (
                      <label key={m} className={cx("inline-flex h-10 cursor-pointer items-center gap-2 border px-4 text-small m-press", minutes === m ? "border-secondary bg-secondary text-on-secondary" : "border-border-strong bg-surface hover:border-navy-300")}>
                        <input type="radio" name="imp-min" className="sr-only" checked={minutes === m} onChange={() => setMinutes(m)} />{fill(c.imp.minutes, { n: m })}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p className="flex items-start gap-2 bg-info-bg p-3 text-small"><Icon name="lock" size={16} aria-hidden className="mt-0.5 shrink-0 text-info" />{c.imp.readOnly}</p>
                <p className="flex items-center gap-2 text-small text-fg-muted"><Icon name="message" size={14} aria-hidden />{fill(c.imp.notified, { name: u.name })}</p>
              </>
            )}
          </div>
        </div>
      </Dialog>
      {dialog}
    </>
  );
}

/** Small "loading rows" skeleton in the shape of a table. */
export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden className="grid gap-2 p-4">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="h-11 m-shimmer" />)}
    </div>
  );
}

// Lane C shared bits: step-up runner (retry once on step_up_required), error → copy, query-state gate, confirm dialog.
export const TABLE = "w-full border-collapse text-left text-small";
export const TH = "h-10 border-b border-border bg-ink-100 px-3 text-eyebrow font-medium tracking-wide text-ink-700 uppercase whitespace-nowrap";
export const TD = "border-b border-border px-3 py-3 align-middle";

/** Runs `fn` with a step-up token when `what` is given; resolves undefined when the user cancels the check. */
export function useGuarded() {
  const { request, reset, dialog } = useStepUp();
  async function run<T>(what: string | null, fn: (token: string) => Promise<T>): Promise<T | undefined> {
    const go = async () => fn(what ? await request(what) : "");
    try {
      try { return await go(); } catch (e) {
        if (e instanceof ApiError && e.errorType === "step_up_required") { reset(); return await go(); }
        throw e;
      }
    } catch (e) {
      if (e instanceof StepUpCancelled) return undefined;
      throw e;
    }
  }
  return { run, dialog };
}

/** errorType → localized copy (never the server message). */
export function useErrText() {
  const { locale } = useI18n();
  return (e: unknown, extra?: Record<string, string>) => {
    const t = e instanceof ApiError ? e.errorType : null;
    return (t && extra?.[t]) || sysError(locale, t ?? (errorState(e) === "offline" ? "server_error" : null));
  };
}
export const fieldsOf = (e: unknown) => (e instanceof ApiError && e.fields ? e.fields : {}) as Record<string, string>;
export const isConflict = (e: unknown) => e instanceof ApiError && e.status === 409 && (e.errorType === "stale" || e.errorType === "already_decided");

/** Error branch for a page query: 403 → LockedContent, else PanelError + retry. */
export function QueryFail({ error, what, onRetry }: { error: unknown; what: string; onRetry: () => void }) {
  if (errorState(error) === "locked") return <LockedContent reason="role" />;
  return <PanelError what={what} onRetry={onRetry} />;
}

/** Mutations stay disabled offline (§4 DoD). */
export function useCanMutate() { return useOnline(); }

export function Confirm({ open, title, body, yes, danger, busy, onYes, onNo, children }: {
  open: boolean; title: string; body?: ReactNode; yes: string; danger?: boolean; busy?: boolean; onYes: () => void; onNo: () => void; children?: ReactNode;
}) {
  const s = useS().common;
  const phone = usePhone();
  return (
    <Dialog open={open} onClose={onNo} title={title} side={phone ? "bottom" : undefined}
      footer={<><Button variant="ghost" onClick={onNo}>{s.cancel}</Button><Button variant={danger ? "danger" : "primary"} loading={busy} onClick={onYes}>{yes}</Button></>}>
      {body && <p className="text-body text-fg-muted">{body}</p>}
      {children}
    </Dialog>
  );
}

export function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden className="grid gap-2 border border-border bg-surface p-4">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="h-10 m-shimmer" />)}
    </div>
  );
}

// Lane F shared bits: query state gate, phone-aware dialog, mutation error → toast, stacked tables at 360 px.
/** loading → skeleton (aria-busy), 403 → LockedContent, error → PanelError + retry; otherwise children(data). */
export function Gate<T>({ q, what, rows = 4, children }: { q: UseQueryResult<T>; what: string; rows?: number; children: (d: T) => ReactNode }) {
  const loading = useS().states.loading;
  if (q.data !== undefined) return <>{children(q.data)}</>;
  if (q.isPending) return <div aria-busy="true" aria-label={loading}><SkeletonRows n={rows} /></div>;
  if (errorState(q.error) === "locked") return <LockedContent reason="role" />;
  return <PanelError what={what} onRetry={() => q.refetch()} />;
}

/** Centered dialog on desktop, bottom sheet under 768 px. */
export function FDialog(p: Omit<Parameters<typeof Dialog>[0], "side">) {
  return <Dialog {...p} side={usePhone() ? "bottom" : undefined} />;
}

/** Toast the catalogue copy for a failed mutation (never the raw server message). Returns the errorType. */
export function useFail() {
  const { locale } = useI18n();
  const toast = useToast();
  const s = useS();
  return (e: unknown) => {
    const st = errorState(e);
    const code = e instanceof ApiError ? e.errorType : null;
    toast({ tone: "danger", title: st === "offline" ? s.states.offlineAction : st === "conflict" && code !== "legal_hold" ? s.states.conflictTitle : sysError(locale, code) });
    return code;
  };
}

/** Table that turns into stacked label/value rows under 768 px (cells carry `data-label`). */
export function STable({ head, children, className, label }: { head: string[]; children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={cx("overflow-x-auto border border-border bg-surface", className)}>
      <table aria-label={label} className="w-full border-collapse text-left text-small max-md:block [&_tbody]:max-md:block [&_tr]:max-md:grid [&_tr]:max-md:gap-1 [&_tr]:max-md:border-b [&_tr]:max-md:border-border [&_tr]:max-md:p-4 [&_td]:max-md:flex [&_td]:max-md:justify-between [&_td]:max-md:gap-3 [&_td]:max-md:p-0 [&_td]:max-md:text-right [&_td]:max-md:before:text-left [&_td]:max-md:before:text-fg-subtle [&_td]:max-md:before:content-[attr(data-label)]">
        <thead className="bg-ink-100 text-eyebrow text-ink-700 max-md:sr-only">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-top">{children}</tbody>
      </table>
    </div>
  );
}

/** Small tone pill used for statuses that have no shared atom. */
export function Pill({ tone = "neutral", children, className }: { tone?: "neutral" | "success" | "warning" | "danger" | "info" | "purple"; children: ReactNode; className?: string }) {
  const t = { neutral: "bg-ink-100 text-ink-700", success: "bg-success-bg text-success", warning: "bg-warning-bg text-warning", danger: "bg-danger-bg text-danger", info: "bg-info-bg text-info", purple: "border border-navy-100 bg-navy-50 text-navy-700" }[tone];
  return <span className={cx("inline-flex h-6 w-fit items-center gap-1 px-2.5 text-eyebrow font-medium whitespace-nowrap", t, className)}>{children}</span>;
}

/** Step-up (X-7) then run; on `step_up_required` drop the cached token and retry once. Resolves undefined if cancelled. */
export function useStepped() {
  const { request, reset, dialog } = useStepUp();
  const run = async <R,>(what: string, fn: (token: string) => Promise<R>): Promise<R | undefined> => {
    try {
      try { return await fn(await request(what)); }
      catch (e) {
        if (!(e instanceof ApiError && e.errorType === "step_up_required")) throw e;
        reset();
        return await fn(await request(what));
      }
    } catch (e) { if (e instanceof StepUpCancelled) return undefined; throw e; }
  };
  return { run, dialog };
}
