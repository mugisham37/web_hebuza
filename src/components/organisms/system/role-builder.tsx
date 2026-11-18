"use client";
// U6 Custom role `/system/roles/new`, `/system/roles/[slug]` (plan 06 §7 U6, board 05 RL3/RL4 with §3 fixes: scopes are
// All/Own/Org/Scoped only, no "Require second approval" toggle — every custom-role change is a ChangeRequest).
// A built-in slug renders the read-only role detail (members + permissions from MATRIX).
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { systemRoles } from "@/content/pages/system-roles";
import { fill } from "@/content/pages/system-common";
import { cx, formatDateTime } from "@/shared/format";
import { ROLES, type Role } from "@/shared/auth/roles";
import { CONTENT_PERMS, MATRIX, scopeFor, type Permission, type Scope } from "@/shared/auth/permissions";
import { approversFor } from "@/shared/system/approvals";
import { customRoleConflicts } from "@/shared/system/governance";
import { useRetireRole, useRole, useRoles, useSaveRole, type CustomRoleInput, type RoleDetailVM } from "@/lib/system/c";
import type { ChangeRequestVM } from "@/shared/system/types";
import { Icon } from "@/components/atoms/icon";
import { Button, ButtonLink } from "@/components/atoms/button";
import { ErrorSummary, Field, Input, Select, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, Panel } from "@/components/molecules/ops/ops";
import { useNow } from "@/components/atoms/step-up";
import { RoleChip, useRoleLabel, useS } from "@/components/atoms/system";
import { ApproverPath, ConflictBanner, PendingChangeBanner, SysPageHead, maskEmail } from "@/components/molecules/system/system";
import { Confirm, QueryFail, Skeleton, fieldsOf, isConflict, useCanMutate, useErrText, useGuarded } from "@/components/molecules/system/system";

const PERMS = Object.keys(MATRIX) as Permission[];
const GROUPS = [...new Set(PERMS.map((p) => p.split(".")[0]))];
const SCOPES: Scope[] = ["all", "own", "org", "scoped"];
const CONTENT = new Set<string>(CONTENT_PERMS);
const permsOf = (r: Role) => Object.fromEntries(PERMS.flatMap((p) => { const s = scopeFor([r], p); return s ? [[p, s]] : []; })) as Record<string, Scope>;

export function RoleBuilderView({ slug }: { slug?: string }) {
  const { locale } = useI18n();
  const c = systemRoles(locale);
  const list = useRoles();
  const role = useRole(slug);
  const back = <nav className="mb-3 text-small"><Link href={localHref(locale, "/system/roles")} className="inline-flex items-center gap-1 text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{c.backToRoles}</Link></nav>;

  if (slug) {
    if (role.isError && !role.data) return <div className="m-rise">{back}<QueryFail error={role.error} what={c.title} onRetry={() => role.refetch()} /></div>;
    if (!role.data) return <div className="m-rise" aria-busy>{back}<Skeleton rows={6} /></div>;
    return <div className="m-rise">{back}{role.data.builtin ? <BuiltinDetail d={role.data} /> : <Builder key={role.data.version} existing={role.data} enabled={!!list.data?.customEnabled} />}</div>;
  }
  if (list.isError && !list.data) return <div className="m-rise">{back}<QueryFail error={list.error} what={c.title} onRetry={() => list.refetch()} /></div>;
  if (!list.data) return <div className="m-rise" aria-busy>{back}<Skeleton rows={6} /></div>;
  if (!list.data.customEnabled)
    return (
      <div className="m-rise">{back}<SysPageHead title={c.newRole} />
        <EmptyPanel title={c.customOff} body={c.customOffBody} action={<ButtonLink href={localHref(locale, "/system/settings?group=flags")} size="sm">{c.openFlags}</ButtonLink>} />
      </div>
    );
  return <div className="m-rise">{back}<Builder enabled /></div>;
}

// ---------------------------------------------------------------- built-in (read-only)
function BuiltinDetail({ d }: { d: RoleDetailVM }) {
  const { locale } = useI18n();
  const c = systemRoles(locale);
  const s = useS();
  const label = useRoleLabel();
  const perms = permsOf(d.role as Role);
  const keys = Object.keys(perms);
  return (
    <>
      <SysPageHead title={label(d.role)} sub={<span className="inline-flex items-center gap-2"><Icon name="lock" size={15} aria-hidden />{c.builtinLock}</span>}
        actions={<ButtonLink href={localHref(locale, `/system/roles/matrix?roles=${encodeURIComponent(d.role)}`)} variant="outline" size="sm"><Icon name="layers" size={15} aria-hidden />{c.openMatrix}</ButtonLink>} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid content-start gap-4">
          <div className="flex items-start gap-3 border border-border bg-bg-subtle p-4 text-small">
            <Icon name="lock" size={18} aria-hidden className="mt-0.5 shrink-0" />
            <p><span className="block font-medium">{c.builtinTitle}</span><span className="text-fg-muted">{c.builtinBody}</span></p>
          </div>
          <Panel title={<span className="flex items-center gap-2">{c.membersTitle}<span className="text-small font-normal text-fg-subtle tabular">{d.memberList.length}</span></span>}>
            {!d.memberList.length ? <EmptyPanel compact title={c.noMembers} body={c.noMembersBody} /> : (
              <ul className="grid divide-y divide-border">
                {d.memberList.map((m) => (
                  <li key={m.id} className="flex min-w-0 items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 text-small"><span className="block truncate font-medium">{m.name}</span><span className="block truncate text-fg-muted">{maskEmail(m.email)}</span></span>
                    <Link href={localHref(locale, `/system/users/${m.id}`)} className="shrink-0 text-small font-medium text-link underline-offset-4 hover:underline">{c.view}</Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {d.lastChangedAt && <p className="text-small text-fg-subtle">{c.col.lastChanged}: {formatDateTime(d.lastChangedAt, locale)}</p>}
        </div>
        <Panel title={c.permsTitle} action={<span className="text-small text-fg-subtle">{fill(c.permsCount, { n: keys.length })}</span>}>
          <div className="grid gap-4">
            {GROUPS.filter((g) => keys.some((k) => k.startsWith(`${g}.`))).map((g) => (
              <section key={g}>
                <h3 className="mb-1.5 text-eyebrow font-medium tracking-wide text-fg-subtle uppercase">{c.groups[g] ?? g}</h3>
                <ul className="flex flex-wrap gap-1.5">
                  {keys.filter((k) => k.startsWith(`${g}.`)).map((k) => (
                    <li key={k} className="inline-flex items-center gap-1.5 bg-ink-100 px-2 py-1 font-mono text-[0.8125rem]">
                      <Icon name="check" size={12} aria-hidden className="text-success" />{k}
                      {perms[k] !== "all" && <span className="font-sans text-eyebrow text-fg-muted">· {s.scope[perms[k]]}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- builder (new / edit custom)
function Builder({ existing, enabled }: { existing?: RoleDetailVM; enabled: boolean }) {
  const { locale } = useI18n();
  const c = systemRoles(locale);
  const s = useS();
  const label = useRoleLabel();
  const toast = useToast();
  const router = useRouter();
  const me = useSession().user;
  const now = useNow(60_000);
  const online = useCanMutate();
  const errText = useErrText();
  const { run, dialog } = useGuarded();
  const save = useSaveRole();
  const retire = useRetireRole();

  const [name, setName] = useState(existing?.name ?? "");
  const [desc, setDesc] = useState(existing?.description ?? "");
  const [base, setBase] = useState(existing?.base ?? "");
  const [perms, setPerms] = useState<Record<string, Scope>>(existing?.perms ?? {});
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [tried, setTried] = useState(false);
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const [sent, setSent] = useState<ChangeRequestVM | null>(null);
  const [askRetire, setAskRetire] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);

  const retired = existing?.status === "retired";
  const pending = existing?.change ?? null;
  const locked = retired || !!pending || !enabled;
  const keys = Object.keys(perms);
  const sod = useMemo(() => customRoleConflicts(keys), [keys]);
  const content = keys.some((k) => CONTENT.has(k));
  const dirty = name !== (existing?.name ?? "") || desc !== (existing?.description ?? "") || JSON.stringify(perms) !== JSON.stringify(existing?.perms ?? {});

  const local: Record<string, string> = {};
  if (!name.trim() || name.trim().length > 40) local.name = c.validation.name;
  if (!desc.trim() || desc.length > 280) local.description = c.validation.description;
  if (!keys.length) local.perms = c.validation.perms;
  if (reason.trim().length < 10) local.reason = c.validation.reason;
  const srv = Object.fromEntries(Object.keys(serverFields).map((k) => [k, (c.validation as Record<string, string>)[k] ?? s.errors.validation]));
  const errs = tried ? { ...srv, ...local } : srv;

  const pickBase = (r: string) => { setBase(r); if (r) setPerms(permsOf(r as Role)); };
  const toggle = (p: Permission) => setPerms((x) => { const n = { ...x }; if (n[p]) delete n[p]; else n[p] = scopeFor([(base || "staff:executive") as Role], p) ?? "all"; return n; });
  const toggleGroup = (g: string) => setOpen((x) => { const n = new Set(x); if (n.has(g)) n.delete(g); else n.add(g); return n; });

  const preview: Pick<ChangeRequestVM, "proposedBy" | "approvers" | "decisions" | "expiresAt" | "state" | "title"> | null = me && now
    ? { proposedBy: { id: me.id, name: me.name }, approvers: approversFor("custom_role"), decisions: [], expiresAt: new Date(now + 48 * 3_600_000).toISOString(), state: "proposed", title: name.trim() || c.newRole }
    : null;

  async function submit() {
    setTried(true);
    if (Object.keys(local).length || sod.length || !online) return;
    const input: CustomRoleInput = { name: name.trim(), description: desc.trim(), base, perms };
    try {
      const cr = await run(c.stepUp, (token) => save.mutateAsync({ input, token, slug: existing?.slug, version: existing?.version, reason: reason.trim() }));
      if (!cr) return;
      setSent(cr);
      toast({ tone: "success", title: c.sent, body: fill(c.sentBody, { id: cr.id }) });
    } catch (e) {
      if (isConflict(e)) return setConflict(true);
      setServerFields(fieldsOf(e));
      toast({ tone: "danger", title: errText(e, c.errors) });
    }
  }
  async function doRetire() {
    if (!existing) return;
    try {
      const r = await run(c.stepUpRetire, (token) => retire.mutateAsync({ slug: existing.slug, version: existing.version, token }));
      setAskRetire(false);
      if (r) { toast({ tone: "success", title: c.retired }); router.push(localHref(locale, "/system/roles")); }
    } catch (e) {
      setAskRetire(false);
      if (isConflict(e)) return setConflict(true);
      toast({ tone: "danger", title: errText(e, { ...c.errors, role_in_use: fill(c.retireBlocked, { n: existing.members }) }) });
    }
  }

  if (sent)
    return (
      <div className="mx-auto grid max-w-2xl gap-4 m-rise">
        <div className="flex items-start gap-3 border border-success/25 bg-success-bg p-5" role="status">
          <Icon name="check" size={22} aria-hidden className="mt-0.5 shrink-0 text-success m-tick" />
          <p><span className="block text-label-lg">{c.sent}</span><span className="text-small text-fg-muted">{fill(c.sentBody, { id: sent.id })}</span></p>
        </div>
        <ApproverPath cr={sent} me={me?.id} />
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={localHref(locale, `/system/approvals?id=${sent.id}`)} size="sm">{s.nav.approvals}</ButtonLink>
          <ButtonLink href={localHref(locale, "/system/roles")} variant="outline" size="sm">{c.backToRoles}</ButtonLink>
        </div>
      </div>
    );

  const errList = Object.entries(errs).map(([field, message]) => ({ field, message }));
  return (
    <>
      {dialog}
      <SysPageHead title={existing ? existing.name : c.newRole}
        sub={<span className="inline-flex flex-wrap items-center gap-2"><span className="bg-gold-100 text-gold-800 px-2.5 py-0.5 text-eyebrow font-medium">{c.preview}</span>{c.sub}</span>}
        actions={existing && !retired ? <Button variant="outline" size="sm" disabled={!online || !!pending} onClick={() => setAskRetire(true)}><Icon name="x" size={14} aria-hidden />{c.retire}</Button> : undefined} />

      <div className="grid gap-3">
        {conflict && <ConflictBanner by={s.common.system} at={existing?.lastChangedAt ?? new Date(0).toISOString()} onReload={() => window.location.reload()} />}
        {retired && <p className="flex items-center gap-2 border border-border bg-bg-subtle p-4 text-small"><Icon name="minus" size={16} aria-hidden />{c.retiredState}</p>}
        {pending && <PendingChangeBanner changes={[pending]} href="/system/approvals" />}
        {tried && errList.length > 0 && <ErrorSummary title={s.errors.validation} errors={errList} />}
      </div>

      <form className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)_minmax(0,5fr)]" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        {/* identity */}
        <Panel className="content-start">
          <fieldset disabled={locked} className="grid gap-4">
            <Field id="name" label={c.name} hint={c.nameHint} error={errs.name}>
              {(f) => <Input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Field id="description" label={c.description} hint={`${c.descriptionHint} · ${desc.length}/280`} error={errs.description}>
              {(f) => <Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} rows={4} value={desc} maxLength={280} onChange={(e) => setDesc(e.target.value)} />}
            </Field>
            <Field id="base" label={c.base} hint={c.baseHint} optional={s.common.optional}>
              {(f) => <Select id={f.id} aria-describedby={f.describedBy} value={base} onChange={(e) => pickBase(e.target.value)}>
                <option value="">{c.noBase}</option>
                {ROLES.filter((r) => r !== "visitor" && r !== "staff:sysadmin").map((r) => <option key={r} value={r}>{label(r)}</option>)}
              </Select>}
            </Field>
          </fieldset>
        </Panel>

        {/* picker */}
        <Panel title={c.picker} action={<span className="text-small text-fg-subtle tabular">{fill(c.selected, { n: keys.length })}</span>}>
          <p id="picker-hint" className="mb-3 text-small text-fg-muted">{c.pickerHint}</p>
          <fieldset disabled={locked} aria-describedby="picker-hint" className="grid max-h-[32rem] gap-1.5 overflow-y-auto pr-1">
            <legend className="sr-only">{c.picker}</legend>
            {GROUPS.map((g) => {
              const inG = PERMS.filter((p) => p.startsWith(`${g}.`));
              const n = inG.filter((p) => perms[p]).length;
              const isOpen = open.has(g);
              return (
                <div key={g} className={cx("border", n ? "border-navy-100 bg-navy-50" : "border-border")}>
                  <button type="button" aria-expanded={isOpen} onClick={() => toggleGroup(g)} className="flex h-11 w-full items-center gap-2 px-3 text-left text-small m-press">
                    <Icon name={n ? "check" : "plus"} size={14} aria-hidden className={n ? "text-navy-700" : "text-fg-subtle"} />
                    <span className="flex-1 font-medium">{c.groups[g] ?? g}{n > 0 && <span className="ml-1.5 font-normal text-fg-muted">({fill(c.selected, { n })})</span>}</span>
                    <Icon name="chevronDown" size={15} aria-hidden className={cx("transition-transform duration-200", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <ul className="grid gap-1 border-t border-border px-3 py-2 m-collapse">
                      {inG.map((p) => (
                        <li key={p} className="flex flex-wrap items-center justify-between gap-2 py-1">
                          <label className="flex min-w-0 items-center gap-2 font-mono text-[0.8125rem]">
                            <input type="checkbox" checked={!!perms[p]} onChange={() => toggle(p)} className="size-4 accent-navy-700" />
                            <span className="truncate">{p}</span>
                            {CONTENT.has(p) && <Icon name="lock" size={12} aria-label={c.contentWarn} className="shrink-0 text-warning" />}
                          </label>
                          {perms[p] && (
                            <select aria-label={`${c.scope}: ${p}`} value={perms[p]} onChange={(e) => setPerms((x) => ({ ...x, [p]: e.target.value as Scope }))}
                              className="h-8 border border-border bg-surface px-2 text-small">
                              {SCOPES.map((sc) => <option key={sc} value={sc}>{s.scope[sc]}</option>)}
                            </select>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </fieldset>
          {errs.perms && <p className="mt-2 text-small text-danger" role="alert">{errs.perms}</p>}
        </Panel>

        {/* effective + submit */}
        <div className="grid content-start gap-4">
          <section className="bg-info-bg p-4 sm:p-5" aria-live="polite">
            <h2 className="mb-3 text-label-lg">{c.effective}</h2>
            {!keys.length ? <p className="text-small text-fg-muted">{c.effectiveEmpty}</p> : (
              <ul className="grid max-h-60 gap-1.5 overflow-y-auto">
                {keys.map((k) => (
                  <li key={k} className="flex items-center gap-2 text-small m-pop">
                    <Icon name="check" size={14} aria-hidden className="shrink-0 text-navy-700" />
                    <span className="truncate font-mono text-[0.8125rem]">{k}</span>
                    <span className="ml-auto shrink-0 text-eyebrow text-fg-muted">{s.scope[perms[k]]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {sod.length > 0 && (
            <div role="alert" className="grid gap-1 border border-danger/25 bg-danger-bg p-4 text-small m-shake">
              <p className="flex items-center gap-2 font-medium text-danger"><Icon name="x" size={15} aria-hidden />{c.sodTitle}</p>
              <p>{fill(c.sodBody, { list: sod.join(" · ") })}</p>
            </div>
          )}
          {content && <p className="flex items-start gap-2 border border-warning/30 bg-warning-bg p-4 text-small"><Icon name="lock" size={15} aria-hidden className="mt-0.5 shrink-0 text-warning" />{c.contentWarn}</p>}
          {!locked && (
            <>
              <Field id="reason" label={c.reason} hint={c.reasonHint} error={errs.reason}>
                {(f) => <Textarea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
              </Field>
              {preview && <ApproverPath cr={preview} />}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" loading={save.isPending} disabled={!online || sod.length > 0} className="flex-1 justify-center">{existing ? c.submitEdit : c.submit}</Button>
                {dirty && <Button type="button" variant="ghost" onClick={() => setAskDiscard(true)}>{s.common.cancel}</Button>}
              </div>
              {!online && <p className="text-small text-fg-muted">{s.states.offlineAction}</p>}
            </>
          )}
        </div>
      </form>

      <Confirm open={askRetire} danger title={fill(c.retireTitle, { name: existing?.name ?? "" })}
        body={existing?.members ? fill(c.retireBlocked, { n: existing.members }) : c.retireBody}
        yes={c.retire} busy={retire.isPending} onNo={() => setAskRetire(false)} onYes={existing?.members ? () => setAskRetire(false) : doRetire} />
      <Confirm open={askDiscard} title={c.discardTitle} body={c.discardBody} yes={s.states.discardYes} danger
        onNo={() => setAskDiscard(false)} onYes={() => router.push(localHref(locale, "/system/roles"))} />
      {existing && !existing.builtin && existing.memberList.length > 0 && (
        <Panel className="mt-4" title={c.membersTitle}>
          <ul className="flex flex-wrap gap-2">{existing.memberList.map((m) => <li key={m.id}><RoleChip role={m.name} privileged={false} /></li>)}</ul>
        </Panel>
      )}
    </>
  );
}
