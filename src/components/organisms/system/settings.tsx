"use client";
// U12 Settings `/system/settings/[group]` (plan 06 §7 U12, board 08 with §3 fixes): no rollout/env/audience columns on
// flags, no kill switch (D-9), clients absolute 24 h, WebAuthn as a preference (not "required"), no maintenance IP list,
// numbering read-only. Every field names what enforces it; gated keys go through step-up + a second approver.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { systemSettings } from "@/content/pages/system-settings";
import { fill, sysError } from "@/content/pages/system-common";
import { cx, formatDateTime, formatRelative } from "@/shared/format";
import { ApiError } from "@/lib/api/client";
import { errorState } from "@/lib/system/api";
import { approversFor, CHANGE_TTL_MS } from "@/shared/system/approvals";
import { SETTING_GROUPS, parseCidr, settingDef, settingsIn, type SettingDef } from "@/shared/system/settings-registry";
import {
  exportSettingsJson, importSettingsJson, ipInCidr, useAddLanguage, useLanguageReport, useMyIp, useSaveSettings, useSettings, withStepUp, type SettingsBundle,
} from "@/lib/system/d";
import type { I18nText, MaintenanceWindow, SettingGroup } from "@/shared/system/types";
import { locales, type Locale } from "@/shared/i18n/config";
import { Icon, type IconName } from "@/components/atoms/icon";
import { settingsImportCopy } from "@/content/pages/settings-import";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { ErrorSummary, Field, Input, Switch, Textarea } from "@/components/atoms/field";
import { Stepper } from "@/components/atoms/misc";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { StepUpCancelled, useNow, usePhone, useStepUp } from "@/components/atoms/step-up";
import { SkeletonRows } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { EnforcedByHint, LockedContent, useS } from "@/components/atoms/system";
import { ApproverPath, ConflictBanner, DiffView, PendingChangeBanner, SettingField, SysPageHead } from "@/components/molecules/system/system";

const useC = () => systemSettings(useI18n().locale);
type C = ReturnType<typeof systemSettings>;
const GROUP_ICON: Record<SettingGroup, IconName> = { general: "building", security: "shield", maintenance: "refresh", flags: "layers", languages: "globe", uploads: "upload", retention: "clock" };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
// Kigali is UTC+2 all year (no DST), so datetime-local ↔ ISO is a fixed offset.
const toLocalInput = (iso: string) => new Date(Date.parse(iso) + 2 * 3600_000).toISOString().slice(0, 16);
const fromLocalInput = (v: string) => (v ? new Date(`${v}:00+02:00`).toISOString() : "");

export function SettingsView({ group }: { group: string }) {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const router = useRouter();
  const valid = (SETTING_GROUPS as readonly string[]).includes(group);
  const g = group as SettingGroup;
  const q = useSettings();
  const save = useSaveSettings();
  const su = useStepUp();
  const toast = useToast();
  const online = useOnline();
  const me = useSession().user;
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [serverErr, setServerErr] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [conflict, setConflict] = useState<{ at: string; review: boolean } | null>(null);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [later, setLater] = useState(false);
  const [effectiveAt, setEffectiveAt] = useState("");
  const [confirmMaint, setConfirmMaint] = useState(false);
  const [toned, setToned] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const values = q.data?.values;
  const valueOf = (k: string) => (k in draft ? draft[k] : values?.[k]?.value ?? settingDef(k)?.default);
  const dirty = useMemo(() => Object.keys(draft).filter((k) => !same(draft[k], values?.[k]?.value ?? settingDef(k)?.default)), [draft, values]);
  const gated = dirty.filter((k) => settingDef(k)?.requiresApproval);
  const errors = useMemo(() => {
    const out: Record<string, string> = { ...serverErr };
    for (const k of dirty) { const e = settingDef(k)?.validate(draft[k]); if (e) out[k] = e; }
    return out;
  }, [dirty, draft, serverErr]);
  const errFor = (k: string) => (errors[k] && (showErrors || k in serverErr) ? c.validation[errors[k]] ?? c.validation.type : null);

  useEffect(() => {
    if (!dirty.length) return;
    const fn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty.length]);

  const set = (k: string, v: unknown) => { setDraft((d) => ({ ...d, [k]: v })); setServerErr(({ [k]: _, ...rest }) => rest); };
  const discard = () => { setDraft({}); setServerErr({}); setShowErrors(false); setReason(""); setLater(false); setEffectiveAt(""); setConfirmMaint(false); };
  const go = (href: string) => (dirty.length ? setLeaveTo(href) : router.push(localHref(locale, href)));

  async function submit(skipMaintConfirm = false) {
    if (!q.data || !dirty.length) return;
    if (Object.keys(errors).length) return setShowErrors(true);
    if (!skipMaintConfirm && dirty.includes("maintenance.on") && draft["maintenance.on"] === true && !valueOf("maintenance.window")) return setConfirmMaint(true);
    setConfirmMaint(false);
    const body = { values: Object.fromEntries(dirty.map((k) => [k, draft[k]])), version: q.data.version, reason: gated.length ? reason : undefined, effectiveAt: gated.length && later && effectiveAt ? fromLocalInput(effectiveAt) : null };
    const needsCode = gated.length > 0 || dirty.some((k) => k.startsWith("security."));
    try {
      const d: SettingsBundle = needsCode
        ? await withStepUp(su, c.stepUp.save, (token) => save.mutateAsync({ ...body, token }))
        : await save.mutateAsync(body);
      setToned(dirty);
      discard();
      toast(d.change ? { title: c.save.pendingToast, body: c.save.pendingBody, tone: "info" } : { title: c.save.savedToast, tone: "success" });
    } catch (e) {
      if (e instanceof StepUpCancelled) return;
      const st = errorState(e);
      if (st === "conflict") { setConflict({ at: new Date().toISOString(), review: false }); return; }
      if (e instanceof ApiError && e.status === 422 && e.fields) { setServerErr(e.fields); setShowErrors(true); return; }
      toast({ title: sysError(locale, e instanceof ApiError ? e.errorType : st === "offline" ? "offline" : null), tone: "danger" });
    }
  }
  async function doExport() {
    setExporting(true);
    try {
      const { json } = await withStepUp(su, c.export.what, (t) => exportSettingsJson(t));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      a.download = "hebuza-settings.json";
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: c.export.toast, tone: "success" });
    } catch (e) {
      if (!(e instanceof StepUpCancelled)) toast({ title: sysError(locale, e instanceof ApiError ? e.errorType : null), tone: "danger" });
    } finally { setExporting(false); }
  }

  if (q.isError && !q.data && errorState(q.error) === "locked") return <LockedContent reason="role" />;

  const nav = (
    <nav aria-label={c.groupsLabel} className="lg:sticky lg:top-24 lg:self-start">
      <label className="lg:hidden">
        <span className="sr-only">{c.groupsLabel}</span>
        <select value={valid ? g : ""} onChange={(e) => go(`/system/settings/${e.target.value}`)} className="h-11 w-full border border-border-strong bg-surface px-3 text-body">
          {SETTING_GROUPS.map((x) => <option key={x} value={x}>{c.groups[x]}</option>)}
        </select>
      </label>
      <ul className="hidden gap-0.5 lg:grid">
        {SETTING_GROUPS.map((x) => (
          <li key={x}>
            <Link href={localHref(locale, `/system/settings/${x}`)} aria-current={x === g ? "page" : undefined}
              onClick={(e) => { if (dirty.length && x !== g) { e.preventDefault(); setLeaveTo(`/system/settings/${x}`); } }}
              className={cx("flex h-10 items-center gap-2.5 px-3.5 text-small transition-colors", x === g ? "bg-secondary text-on-secondary" : "text-fg-muted hover:bg-navy-50 hover:text-fg")}>
              <Icon name={GROUP_ICON[x]} size={15} aria-hidden />{c.groups[x]}
              {values && settingsIn(x).some((d) => values[d.key]?.pending) && <span aria-hidden className="ml-auto size-2 rounded-full bg-navy-700" />}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  const pendingHere = (q.data?.pending ?? []).filter((cr) => {
    const keys = (cr.payload.keys as string[] | undefined) ?? [];
    return keys.some((k) => settingDef(k)?.group === g);
  });

  return (
    <div className="grid gap-5 pb-28">
      <SysPageHead title={c.title} sub={c.sub} actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={doExport} loading={exporting} disabled={!online} title={c.export.hint}>
            <Icon name="file" size={14} aria-hidden />{c.export.button}
          </Button>
          <ImportSettings onDone={() => void q.refetch()} />
        </div>
      } />
      <div className="grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
        {nav}
        <div className="grid min-w-0 content-start gap-4">
          {!valid ? (
            <EmptyPanel title={c.notFound} action={<ButtonLink href={localHref(locale, "/system/settings/general")} size="sm">{c.groups.general}</ButtonLink>} />
          ) : (
            <>
              <header className="m-rise">
                <h2 className="flex items-center gap-2 text-h3"><Icon name={GROUP_ICON[g]} size={20} aria-hidden />{c.groups[g]}</h2>
                <p className="mt-1 text-small text-fg-muted">{c.groupSub[g]}</p>
              </header>
              {leaveTo && (
                <div role="alertdialog" aria-labelledby="leave-h" className="flex flex-wrap items-center gap-3 border border-warning/30 bg-warning-bg p-4 m-rise">
                  <p id="leave-h" className="min-w-0 flex-1 text-small"><span className="block font-medium">{c.save.leaveTitle}</span><span className="text-fg-muted">{c.save.leaveBody}</span></p>
                  <Button size="sm" variant="outline" onClick={() => setLeaveTo(null)} autoFocus>{c.save.stay}</Button>
                  <Button size="sm" variant="danger" onClick={() => { const h = leaveTo; discard(); setLeaveTo(null); router.push(localHref(locale, h)); }}>{c.save.leave}</Button>
                </div>
              )}
              <PendingChangeBanner changes={pendingHere} href="/system/approvals" />
              {conflict && (
                <div className="grid gap-3">
                  <ConflictBanner by={c.conflictWho} at={conflict.at} onReview={() => setConflict({ ...conflict, review: !conflict.review })}
                    onReload={() => { discard(); setConflict(null); q.refetch(); }} />
                  {conflict.review && values && (
                    <DiffView title={c.conflictDiff} before={Object.fromEntries(dirty.map((k) => [k, values[k]?.value]))} after={Object.fromEntries(dirty.map((k) => [k, draft[k]]))} />
                  )}
                </div>
              )}
              {showErrors && Object.keys(errors).length > 0 && (
                <ErrorSummary title={c.errorsTitle} errors={Object.entries(errors).map(([k, e]) => ({ field: `set-${k}`, message: `${c.fields[k]?.[0] ?? k}: ${c.validation[e] ?? e}` }))} />
              )}
              {q.isPending ? (
                <section aria-busy className="border border-border bg-surface p-5"><SkeletonRows n={5} /></section>
              ) : q.isError && !q.data ? (
                <PanelError what={c.title} onRetry={() => q.refetch()} />
              ) : (
                <GroupBody g={g} c={c} valueOf={valueOf} set={set} errFor={errFor} values={q.data!.values} toned={toned} disabled={!online} />
              )}
            </>
          )}
        </div>
      </div>

      {valid && dirty.length > 0 && (
        <SaveBar c={c} n={dirty.length} gated={gated} online={online} busy={save.isPending} reason={reason} setReason={setReason}
          later={later} setLater={setLater} effectiveAt={effectiveAt} setEffectiveAt={setEffectiveAt} meId={me?.id ?? "me"} meName={me?.name ?? s.identity.you}
          confirmMaint={confirmMaint} onCancelMaint={() => setConfirmMaint(false)} onConfirmMaint={() => submit(true)}
          onSave={() => submit()} onDiscard={discard} />
      )}
      {su.dialog}
    </div>
  );
}

// ---------------------------------------------------------------- group bodies
type BodyProps = {
  g: SettingGroup; c: C; valueOf: (k: string) => unknown; set: (k: string, v: unknown) => void; errFor: (k: string) => string | null;
  values: SettingsBundle["values"]; toned: string[]; disabled: boolean;
};
function Card({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("min-w-0 border border-border bg-surface px-4 sm:px-5", className)}>
      {title && <h3 className="border-b border-border py-3.5 text-label">{title}</h3>}
      {children}
    </section>
  );
}

function GroupBody(p: BodyProps) {
  const { g, c } = p;
  if (g === "retention") return <RetentionPointer c={c} />;
  if (g === "languages") return <Languages {...p} />;
  if (g === "maintenance") return <Maintenance {...p} />;
  const defs = settingsIn(g);
  if (g === "security") {
    const sessions = defs.filter((d) => d.key.startsWith("security.idle") || d.key.startsWith("security.absolute"));
    const ip = defs.filter((d) => d.type === "cidr[]");
    const rest = defs.filter((d) => !sessions.includes(d) && !ip.includes(d));
    return (
      <div className="grid gap-4 m-stagger">
        <p className="flex items-start gap-2 border border-success/25 bg-success-bg px-4 py-3 text-small" style={{ ["--i" as string]: 0 }}>
          <Icon name="check" size={16} aria-hidden className="mt-0.5 shrink-0 text-success" />{c.save.approvalNote}
        </p>
        <Card title={c.cards.sessions}>{sessions.map((d) => <Row key={d.key} d={d} {...p} />)}</Card>
        <Card title={c.cards.ip}>{ip.map((d) => <Row key={d.key} d={d} {...p} />)}</Card>
        <Card title={c.cards.protection}>{rest.map((d) => <Row key={d.key} d={d} {...p} />)}</Card>
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      {g === "flags" && <p className="flex items-start gap-2 text-small text-fg-muted"><Icon name="layers" size={15} aria-hidden className="mt-0.5 shrink-0" />{c.flags.note}</p>}
      {g === "uploads" && <p className="flex items-start gap-2 text-small text-fg-muted"><Icon name="lock" size={15} aria-hidden className="mt-0.5 shrink-0" />{c.uploads.note}</p>}
      <Card>{defs.map((d) => <Row key={d.key} d={d} {...p} />)}</Card>
    </div>
  );
}

/** One registry row. Bool/int/readonly reuse SettingField; enum, CIDR lists get lane-local controls with labelled options. */
function Row({ d, c, valueOf, set, errFor, values, toned, disabled }: BodyProps & { d: SettingDef }) {
  const [label, desc] = c.fields[d.key] ?? [d.key, ""];
  const v = valueOf(d.key);
  const meta = values[d.key];
  const pending = !!meta?.pending;
  const err = errFor(d.key);
  const wrap = (node: ReactNode) => (
    <div id={`set-${d.key}`} className={cx("relative", toned.includes(d.key) && "m-tone")}>
      {pending && <span className="absolute top-4 right-0 inline-flex h-6 items-center gap-1 bg-info-bg px-2 text-eyebrow text-link sm:static sm:hidden"><Icon name="clock" size={11} aria-hidden />{c.save.pendingKey}</span>}
      {node}
    </div>
  );
  if (d.type === "cidr[]") return wrap(<CidrRow d={d} c={c} label={label} desc={desc} value={(v as string[]) ?? []} onChange={(x) => set(d.key, x)} err={err} meta={meta} disabled={disabled || pending} />);
  if (d.type === "enum") {
    return wrap(
      <RowShell label={label} desc={desc} d={d} meta={meta} err={err} htmlFor={`in-${d.key}`} pending={pending} c={c}>
        <select id={`in-${d.key}`} value={String(v)} disabled={disabled || pending || !d.editableBy.length} aria-describedby={`h-${d.key}`} onChange={(e) => set(d.key, e.target.value)}
          className="h-11 w-full max-w-xs border border-border-strong bg-surface px-3 sm:w-auto">
          {d.options?.map((o) => <option key={o} value={o}>{c.options[o] ?? o}</option>)}
        </select>
      </RowShell>,
    );
  }
  const shown = d.key === "finance.refund_exec_limit" && typeof v === "number" ? v.toLocaleString("en-RW") : v;
  return wrap(
    <SettingField def={d} label={label} description={desc} value={shown} onChange={(x) => set(d.key, x)} disabled={disabled || pending}
      changedBy={meta?.changedBy} changedAt={meta?.changedAt} error={err} />,
  );
}

function RowShell({ label, desc, d, meta, err, htmlFor, children, pending, c }: {
  label: string; desc: string; d: SettingDef; meta?: SettingsBundle["values"][string]; err: string | null; htmlFor?: string; children: ReactNode; pending?: boolean; c: C;
}) {
  return (
    <div className="grid gap-2 border-b border-border py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="flex flex-wrap items-center gap-2 text-label">{label}
          {pending && <span className="hidden h-6 items-center gap-1 bg-info-bg px-2 text-eyebrow text-link sm:inline-flex"><Icon name="clock" size={11} aria-hidden />{c.save.pendingKey}</span>}
        </label>
        {desc && <p className="mt-0.5 text-small text-fg-muted">{desc}</p>}
        <div className="mt-1.5"><EnforcedByHint id={`h-${d.key}`} component={d.enforcedBy} lastChangedBy={meta?.changedBy} lastChangedAt={meta?.changedAt} ownedBy={d.ownedBy} /></div>
        {err && <p role="alert" className="mt-1 text-small font-medium text-danger m-shake">{err}</p>}
      </div>
      <div className="min-w-0 sm:justify-self-end">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------- IP allowlist (F-IAM-12)
function CidrRow({ d, c, label, desc, value, onChange, err, meta, disabled }: {
  d: SettingDef; c: C; label: string; desc: string; value: string[]; onChange: (v: string[]) => void; err: string | null; meta?: SettingsBundle["values"][string]; disabled: boolean;
}) {
  const [input, setInput] = useState("");
  const [bad, setBad] = useState(false);
  const [testing, setTesting] = useState(false);
  const ip = useMyIp(testing);
  const add = () => {
    const v = input.trim();
    if (!parseCidr(v)) return setBad(true);
    if (!value.includes(v)) onChange([...value, v]);
    setInput(""); setBad(false);
  };
  const inside = ip.data && value.length ? value.some((r) => ipInCidr(ip.data.ip, r)) : null;
  const wasOn = Array.isArray(meta?.value) && (meta.value as unknown[]).length > 0;
  return (
    <div className="grid gap-3 border-b border-border py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-label">{label}</p>
        <p className="mt-0.5 text-small text-fg-muted">{desc}</p>
        <div className="mt-1.5"><EnforcedByHint id={`h-${d.key}`} component={d.enforcedBy} lastChangedBy={meta?.changedBy} lastChangedAt={meta?.changedAt} /></div>
      </div>
      {value.length ? (
        <ul className="flex flex-wrap gap-2" aria-label={label}>
          {value.map((r) => (
            <li key={r} className="inline-flex h-9 items-center gap-1 border border-border bg-bg-subtle pl-3 font-mono text-small m-pop">
              {r}
              <button type="button" disabled={disabled} aria-label={fill(c.ip.remove, { cidr: r })} onClick={() => onChange(value.filter((x) => x !== r))}
                className="inline-flex size-9 items-center justify-center text-fg-muted hover:bg-danger-bg hover:text-danger disabled:opacity-40"><Icon name="x" size={13} aria-hidden /></button>
            </li>
          ))}
        </ul>
      ) : <p className="text-small text-fg-muted">{c.ip.any}</p>}
      {wasOn && !value.length && <p role="status" className="bg-warning-bg px-3 py-2 text-small text-warning">{c.ip.offWarn}</p>}
      <div className="flex flex-wrap items-start gap-2">
        <div className="grid min-w-0 flex-1 basis-48 gap-1">
          <label htmlFor={`in-${d.key}`} className="sr-only">{c.ip.add}</label>
          <Input id={`in-${d.key}`} value={input} disabled={disabled} placeholder={c.ip.placeholder} spellCheck={false} aria-invalid={bad || undefined} aria-describedby={`h-${d.key}`}
            onChange={(e) => { setInput(e.target.value); setBad(false); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} className="font-mono" />
          {bad && <p role="alert" className="text-small text-danger m-shake">{c.ip.invalid}</p>}
        </div>
        <Button size="sm" variant="outline" className="h-11" onClick={add} disabled={disabled || !input.trim()}><Icon name="plus" size={14} aria-hidden />{c.ip.add}</Button>
        <Button size="sm" variant="ghost" className="h-11" onClick={() => setTesting(true)} loading={ip.isFetching}><Icon name="globe" size={14} aria-hidden />{c.ip.test}</Button>
      </div>
      {ip.data && (
        <p role="status" className={cx("flex items-center gap-2 text-small m-rise", inside === false ? "font-medium text-danger" : "text-fg-muted")}>
          <Icon name={inside === false ? "x" : "check"} size={14} aria-hidden className={inside === false ? "" : "text-success"} />
          <span className="font-mono">{fill(c.ip.yourIp, { ip: ip.data.ip })}</span> {inside === null ? c.ip.any : inside ? c.ip.inside : c.ip.outside}
        </p>
      )}
      {err && <p role="alert" className="text-small font-medium text-danger">{err}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- maintenance (F-SET-11)
function Maintenance({ c, valueOf, set, errFor, values, disabled, toned }: BodyProps) {
  const { locale } = useI18n();
  const on = valueOf("maintenance.on") === true;
  const msg = (valueOf("maintenance.message") as I18nText | null) ?? { rw: "", en: "", fr: "" };
  const win = valueOf("maintenance.window") as MaintenanceWindow | null;
  const [lang, setLang] = useState<Locale>(locale);
  const now = useNow(60_000);
  const scheduled = win && now && Date.parse(win.start) > now;
  const dOn = settingDef("maintenance.on")!, dMsg = settingDef("maintenance.message")!, dWin = settingDef("maintenance.window")!;
  const msgErr = errFor("maintenance.message"), winErr = errFor("maintenance.window");
  const preview = msg[lang] || msg.en || "—";
  return (
    <div className="grid gap-4">
      <Card className={cx(toned.includes("maintenance.on") && "m-tone")}>
        <div className="flex flex-wrap items-center gap-4 py-4">
          <span className={cx("flex size-11 shrink-0 items-center justify-center rounded-full", on ? "bg-navy-50 text-navy-700" : "bg-ink-100 text-ink-700")}><Icon name="refresh" size={20} aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className="text-label">{c.fields["maintenance.on"][0]}</p>
            <p className="text-small text-fg-muted">{c.fields["maintenance.on"][1]}</p>
          </div>
          <span className={cx("inline-flex h-7 items-center px-2.5 text-eyebrow", on ? "bg-navy-50 text-navy-700" : scheduled ? "bg-warning-bg text-warning" : "bg-ink-100 text-ink-700")}>
            {on ? c.maint.activeNow : scheduled ? fill(c.maint.scheduled, { t: formatDateTime(win!.start, locale) }) : c.maint.off}
          </span>
          <Switch label={<span className="sr-only">{c.fields["maintenance.on"][0]}</span>} checked={on} disabled={disabled} aria-describedby="h-maint-on" onChange={(e) => set("maintenance.on", e.target.checked)} />
        </div>
        <div className="border-t border-border py-3"><EnforcedByHint id="h-maint-on" component={dOn.enforcedBy} lastChangedBy={values["maintenance.on"]?.changedBy} lastChangedAt={values["maintenance.on"]?.changedAt} /></div>
      </Card>

      <Card title={c.fields["maintenance.message"][0]}>
        <div className="grid gap-3 py-4">
          <p className="text-small text-fg-muted">{c.fields["maintenance.message"][1]}</p>
          <div role="tablist" aria-label={c.fields["maintenance.message"][0]} className="flex gap-1">
            {locales.map((l) => (
              <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => setLang(l)}
                className={cx("inline-flex h-9 items-center gap-1.5 px-3.5 text-small m-press", lang === l ? "bg-secondary text-on-secondary" : "bg-ink-100 text-ink-700")}>
                {l.toUpperCase()}{!msg[l]?.trim() && <span aria-hidden className="size-1.5 rounded-full bg-danger" />}
              </button>
            ))}
          </div>
          <Field id="set-maintenance.message" label={`${c.options[lang]}`} hint={fill(c.maint.chars, { n: msg[lang]?.length ?? 0 })} error={msgErr ?? undefined}>{(f) => <Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} rows={3} maxLength={320} value={msg[lang] ?? ""} disabled={disabled} lang={lang}
              onChange={(e) => set("maintenance.message", { ...msg, [lang]: e.target.value })} />}</Field>
          <EnforcedByHint component={dMsg.enforcedBy} lastChangedBy={values["maintenance.message"]?.changedBy} lastChangedAt={values["maintenance.message"]?.changedAt} />
        </div>
      </Card>

      <Card title={c.fields["maintenance.window"][0]}>
        <div className="grid gap-3 py-4" id="set-maintenance.window">
          <p className="text-small text-fg-muted">{c.fields["maintenance.window"][1]}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={c.maint.start}>{(f) => <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} type="datetime-local" disabled={disabled} value={win ? toLocalInput(win.start) : ""}
              onChange={(e) => set("maintenance.window", e.target.value ? { start: fromLocalInput(e.target.value), end: win?.end ?? fromLocalInput(e.target.value) } : null)} />}</Field>
            <Field label={c.maint.end} error={winErr ?? undefined}>{(f) => <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} type="datetime-local" disabled={disabled || !win} value={win ? toLocalInput(win.end) : ""}
              onChange={(e) => win && set("maintenance.window", { ...win, end: fromLocalInput(e.target.value) })} />}</Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <EnforcedByHint component={dWin.enforcedBy} lastChangedBy={values["maintenance.window"]?.changedBy} lastChangedAt={values["maintenance.window"]?.changedAt} />
            {win && <Button size="sm" variant="ghost" disabled={disabled} onClick={() => set("maintenance.window", null)}>{c.maint.clear}</Button>}
          </div>
        </div>
      </Card>

      <section aria-labelledby="mprev" className="grid gap-3">
        <h3 id="mprev" className="text-label">{c.maint.previews} · {lang.toUpperCase()}</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Preview title={c.maint.public} tone="bg-gold-100 text-gold-800" body={preview} until={win?.end} lang={lang} />
          <Preview title={c.maint.client} tone="bg-navy-50 text-navy-700" body={preview} until={win?.end} lang={lang} badge={c.maint.readOnly} />
          <figure className="grid content-start gap-2 theme-dark bg-bg p-4 text-fg">
            <figcaption className="text-eyebrow uppercase opacity-70">{c.maint.staff}</figcaption>
            <p className="text-small">{c.maint.staffNote}</p>
          </figure>
        </div>
      </section>
    </div>
  );
}
function Preview({ title, tone, body, until, lang, badge }: { title: string; tone: string; body: string; until?: string; lang: Locale; badge?: string }) {
  return (
    <figure className="overflow-hidden border border-border bg-surface">
      <figcaption className="flex items-center justify-between border-b border-border px-4 py-2 text-eyebrow uppercase text-fg-subtle">{title}{badge && <span className="bg-ink-100 px-2 normal-case">{badge}</span>}</figcaption>
      <div className={cx("px-4 py-3 text-small", tone)} lang={lang}>
        <p className="break-words">{body}</p>
        {until && <p className="mt-1 text-eyebrow opacity-70 tabular">→ {formatDateTime(until, lang)}</p>}
      </div>
      <div aria-hidden className="grid gap-1.5 p-4"><span className="h-2 w-2/3 bg-ink-100" /><span className="h-2 w-1/2 bg-ink-100" /></div>
    </figure>
  );
}

// ---------------------------------------------------------------- languages (F-SET-10, F-I18N-04)
function Languages({ c, valueOf, values }: BodyProps) {
  const { locale } = useI18n();
  const r = useLanguageReport();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const def = String(valueOf("i18n.default_locale"));
  const enabled = settingDef("i18n.enabled_locales")!;
  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3 py-4">
          <div className="min-w-0">
            <p className="text-label">{c.fields["i18n.enabled_locales"][0]}</p>
            <p className="text-small text-fg-muted">{c.fields["i18n.enabled_locales"][1]} · {fill(c.lang.defaultIs, { lang: c.options[def] ?? def })}</p>
            <div className="mt-1.5"><EnforcedByHint component={enabled.enforcedBy} lastChangedBy={values["i18n.enabled_locales"]?.changedBy} lastChangedAt={values["i18n.enabled_locales"]?.changedAt} /></div>
          </div>
          <Button size="sm" onClick={() => setAdding(true)}><Icon name="plus" size={14} aria-hidden />{c.lang.add}</Button>
        </div>
      </Card>
      <Card title={c.lang.report}>
        {r.isPending ? <div aria-busy className="py-4"><SkeletonRows n={3} /></div> : r.isError ? <div className="py-4"><PanelError what={c.lang.report} onRetry={() => r.refetch()} /></div> : (
          <ul className="m-stagger">
            {locales.map((l, i) => {
              const miss = r.data.locales[l];
              const pct = Math.floor(((r.data.total - miss.length) / Math.max(1, r.data.total)) * 100);
              return (
                <li key={l} style={{ ["--i" as string]: i }} className="grid gap-2 border-b border-border py-4 last:border-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex size-9 items-center justify-center rounded-full bg-ink-100 text-eyebrow font-semibold uppercase">{l}</span>
                    <span className="min-w-0 flex-1"><span className="block text-label">{c.options[l]}{l === def && <span className="ml-2 bg-gold-400 text-on-gold px-2 py-0.5 text-eyebrow">{c.fields["i18n.default_locale"][0]}</span>}</span>
                      <span className="block text-small text-fg-muted tabular">{fill(c.lang.of, { pct, n: r.data.total - miss.length, total: r.data.total })}</span></span>
                    <span className={cx("inline-flex h-7 items-center px-2.5 text-eyebrow", miss.length ? "bg-warning-bg text-warning" : "bg-success-bg text-success")}>{miss.length ? fill(c.lang.missing, { n: miss.length }) : c.lang.complete}</span>
                  </div>
                  <div role="meter" aria-label={c.options[l]} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-1.5 overflow-hidden bg-ink-100">
                    <div className={cx("h-full origin-left m-grow", miss.length ? "bg-warning" : "bg-success")} style={{ width: `${pct}%` }} />
                  </div>
                  {miss.length > 0 && (
                    <div>
                      <button type="button" aria-expanded={open === l} onClick={() => setOpen(open === l ? null : l)} className="text-small font-medium text-link underline-offset-4 hover:underline">{open === l ? c.lang.hide : c.lang.show}</button>
                      {open === l && (
                        // shortcut: first 100 keys only, add search/paging if a locale ever misses more
                        <ul className="mt-2 max-h-56 overflow-auto bg-bg-subtle p-3 font-mono text-[0.78rem] leading-6 text-fg-muted m-collapse">
                          {miss.slice(0, 100).map((k) => <li key={k} className="break-all">{k}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {r.data && r.data.drafts.length > 0 && (
        <Card title={c.lang.drafts}>
          <ul>
            {r.data.drafts.map((d) => (
              <li key={d.code} className="grid gap-3 border-b border-border py-4 last:border-0 m-rise">
                <p className="flex flex-wrap items-center gap-2 text-label"><span className="bg-ink-100 px-2 py-0.5 font-mono text-eyebrow uppercase">{d.code}</span>{d.name}
                  <span className="text-small font-normal text-fg-subtle">{d.by} · {formatRelative(d.createdAt, locale)}</span></p>
                <Stepper steps={c.lang.steps} current={["draft", "translating", "review", "published"].indexOf(d.stage)} />
              </li>
            ))}
          </ul>
          <p className="border-t border-border py-3 text-small text-fg-muted">{c.lang.deployNote}</p>
        </Card>
      )}
      <AddLanguage c={c} open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
function AddLanguage({ c, open, onClose }: { c: C; open: boolean; onClose: () => void }) {
  const phone = usePhone();
  const add = useAddLanguage();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const close = () => { setCode(""); setName(""); setErr({}); onClose(); };
  const submit = async () => {
    const e: Record<string, string> = {};
    if (!/^[a-z]{2,3}$/.test(code.trim().toLowerCase())) e.code = "format";
    if (!name.trim()) e.name = "required";
    if (Object.keys(e).length) return setErr(e);
    try { await add.mutateAsync({ code: code.trim().toLowerCase(), name: name.trim() }); toast({ title: c.lang.created, tone: "success" }); close(); }
    catch (x) { if (x instanceof ApiError && x.fields) setErr(x.fields); else setErr({ code: "required" }); }
  };
  return (
    <Dialog open={open} onClose={close} side={phone ? "bottom" : undefined} title={c.lang.addTitle} description={c.lang.deployNote}
      footer={<><Button variant="ghost" onClick={close}>{useS().common.cancel}</Button><Button onClick={submit} loading={add.isPending}>{c.lang.create}</Button></>}>
      <div className="grid gap-4">
        <Stepper steps={c.lang.steps} current={0} />
        <Field label={c.lang.code} hint={c.lang.codeHint} error={err.code ? c.lang.codeErr[err.code] ?? err.code : undefined}>{(f) => <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={code} onChange={(e) => setCode(e.target.value)} maxLength={3} autoCapitalize="none" spellCheck={false} className="w-28 font-mono" />}</Field>
        <Field label={c.lang.name} hint={c.lang.nameHint} error={err.name ? c.lang.codeErr[err.name] ?? err.name : undefined}>{(f) => <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />}</Field>
      </div>
    </Dialog>
  );
}

function RetentionPointer({ c }: { c: C }) {
  const { locale } = useI18n();
  return (
    <section className="grid gap-3 border border-border bg-surface p-6 m-rise">
      <span className="flex size-11 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Icon name="clock" size={20} aria-hidden /></span>
      <h3 className="text-h3">{c.retention.title}</h3>
      <p className="max-w-prose text-body text-fg-muted">{c.retention.body}</p>
      <div><ButtonLink href={localHref(locale, "/system/privacy?tab=retention")} size="sm">{c.retention.cta}<Icon name="arrowRight" size={14} aria-hidden /></ButtonLink></div>
    </section>
  );
}

// ---------------------------------------------------------------- sticky save bar
function SaveBar(p: {
  c: C; n: number; gated: string[]; online: boolean; busy: boolean; reason: string; setReason: (v: string) => void;
  later: boolean; setLater: (v: boolean) => void; effectiveAt: string; setEffectiveAt: (v: string) => void; meId: string; meName: string;
  confirmMaint: boolean; onCancelMaint: () => void; onConfirmMaint: () => void; onSave: () => void; onDiscard: () => void;
}) {
  const { c } = p;
  const now = useNow(60_000);
  const approval = p.gated.length > 0;
  const common = useS().common;
  const preview = approval && now ? {
    proposedBy: { id: p.meId, name: p.meName }, approvers: approversFor("setting_change"), decisions: [], state: "proposed" as const,
    expiresAt: new Date(now + CHANGE_TTL_MS).toISOString(), title: p.gated.map((k) => c.fields[k]?.[0] ?? k).join(", "),
  } : null;
  return (
    <div role="region" aria-label={fill(c.save.unsaved, { n: p.n })}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur max-lg:bottom-16 lg:left-64 m-rise">
      <div className="mx-auto grid max-w-5xl gap-3">
        {p.confirmMaint && (
          <div role="alertdialog" aria-labelledby="mc-h" className="flex flex-wrap items-center gap-3 bg-info-bg p-3 m-rise">
            <p id="mc-h" className="min-w-0 flex-1 text-small"><span className="block font-medium">{c.maint.confirmTitle}</span><span className="text-fg-muted">{c.maint.confirmBody}</span></p>
            <Button size="sm" variant="ghost" onClick={p.onCancelMaint}>{common.cancel}</Button>
            <Button size="sm" onClick={p.onConfirmMaint} autoFocus>{c.maint.confirm}</Button>
          </div>
        )}
        {approval && (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid gap-2">
              <Field label={c.save.reason} hint={c.save.reasonHint}>{(f) => <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={p.reason} onChange={(e) => p.setReason(e.target.value)} maxLength={300} />}</Field>
              <fieldset className="flex flex-wrap items-center gap-3 text-small">
                <legend className="sr-only">{c.save.effective}</legend>
                <span className="font-medium">{c.save.effective}:</span>
                <label className="inline-flex items-center gap-1.5"><input type="radio" checked={!p.later} onChange={() => p.setLater(false)} className="accent-navy-700" />{c.save.effectiveNow}</label>
                <label className="inline-flex items-center gap-1.5"><input type="radio" checked={p.later} onChange={() => p.setLater(true)} className="accent-navy-700" />{c.save.effectiveLater}</label>
                {p.later && <Input type="datetime-local" aria-label={c.save.effectiveLater} value={p.effectiveAt} onChange={(e) => p.setEffectiveAt(e.target.value)} className="h-9 w-auto" />}
              </fieldset>
            </div>
            {preview && <div className="hidden lg:block"><ApproverPath cr={preview} me={p.meId} /></div>}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-small">
            <span className="font-medium tabular">{fill(c.save.unsaved, { n: p.n })}</span>
            {!p.online ? <span className="block text-danger">{c.save.offline}</span> : approval && <span className="block text-fg-muted">{c.save.approvalNote}</span>}
          </p>
          <Button variant="ghost" size="sm" onClick={p.onDiscard}>{c.save.discard}</Button>
          <Button size="sm" onClick={p.onSave} loading={p.busy} disabled={!p.online}>{p.busy ? c.save.saving : approval ? c.save.sendForApproval : c.save.save}</Button>
        </div>
      </div>
    </div>
  );
}

/** F-SET-13: pick an exported settings JSON and re-apply it. */
function ImportSettings({ onDone }: { onDone: () => void }) {
  const { locale } = useI18n();
  const k = settingsImportCopy(locale);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const r = await importSettingsJson(await f.text());
      toast({ title: r.skipped.length ? `${k.pending} · ${k.skipped.replace("{n}", String(r.skipped.length))}` : k.pending, tone: "success" });
      onDone();
    } catch (e) {
      toast({ title: e instanceof ApiError && e.status === 422 ? k.failed : sysError(locale, e instanceof ApiError ? e.errorType : null), tone: "danger" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <label className={cx("inline-flex h-8 cursor-pointer items-center gap-1.5 border border-border px-3 text-small hover:bg-bg-subtle focus-within:outline-2", busy && "opacity-60")}>
      <Icon name="upload" size={14} aria-hidden />{k.button}
      <input type="file" accept="application/json,.json" className="sr-only" aria-label={k.label} disabled={busy} onChange={(e) => void pick(e.target.files?.[0])} />
    </label>
  );
}
