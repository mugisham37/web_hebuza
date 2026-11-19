"use client";
// U14 Notifications `/system/notifications?tab=rules|templates|deliveries|costs` (plan 06 §7 U14, board 10 NT1/NT2
// with §3 fixes: quiet hours 21:00–07:00, security events locked to email + in-app, case refs HBZ-XXXXXX).
import { useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { systemNotifications } from "@/content/pages/system-notifications";
import { fill } from "@/content/pages/system-common";
import { cx, formatDate, formatDateTime, formatMoney } from "@/shared/format";
import { errorState } from "@/lib/system/api";
import { currentVersion } from "@/shared/system/templates";
import { useCosts, useDeliveries, useRules, useSaveBudget, useSaveRules, useTemplates } from "@/lib/system/e";
import type { BudgetVM, Channel, DeliveryVM, EventRuleVM, TemplateVM } from "@/shared/system/types";
import type { Locale } from "@/shared/i18n/config";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Field, Input, Select } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Tabs } from "@/components/atoms/tabs";
import { Badge } from "@/components/atoms/tag";
import { Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { usePhone, useStepUp, StepUpCancelled } from "@/components/atoms/step-up";
import { LockedContent, useS } from "@/components/atoms/system";
import { BudgetBar, ConflictBanner, SysPageHead } from "@/components/molecules/system/system";
import { TH, useErrText, useParamState } from "@/components/molecules/system/audit";
import { useOnline } from "@/components/atoms/hooks";
import { errType } from "@/components/atoms/hooks";

const useC = () => systemNotifications(useI18n().locale);
const TABS = ["rules", "templates", "deliveries", "costs"] as const;
type Tab = (typeof TABS)[number];
const CH: Channel[] = ["inapp", "email", "whatsapp", "sms"];
const LOCALES: Locale[] = ["rw", "en", "fr"];
const Loading = () => <div className="grid gap-2 border border-border bg-surface p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>;

export function NotificationsView() {
  const c = useC();
  const [sp, set] = useParamState();
  const tab = (TABS as readonly string[]).includes(sp.get("tab") ?? "") ? (sp.get("tab") as Tab) : "rules";
  const content: Record<Tab, React.ReactNode> = { rules: <Rules />, templates: <Templates />, deliveries: <Deliveries />, costs: <Costs /> };
  return (
    <div className="m-rise">
      <SysPageHead title={c.title} sub={c.sub} />
      <Tabs value={tab} onChange={(id) => set({ tab: id === "rules" ? null : id, status: null, channel: null })} tabs={TABS.map((id) => ({ id, label: c.tabs[id], content: content[id] }))} />
    </div>
  );
}

// ---------------------------------------------------------------- NT1 rules
function Rules() {
  const c = useC().rules;
  const s = useS();
  const toast = useToast();
  const errText = useErrText();
  const online = useOnline();
  const q = useRules();
  const save = useSaveRules();
  const [draft, setDraft] = useState<EventRuleVM[] | null>(null);
  const [conflict, setConflict] = useState(false);
  if (q.isError && !q.data && errorState(q.error) === "locked") return <LockedContent reason="role" />;
  if (q.isPending) return <Loading />;
  if (!q.data) return <PanelError what={c.what} onRetry={() => q.refetch()} />;
  const rows = draft ?? q.data.items;
  const dirty = draft ? draft.filter((r, i) => JSON.stringify(r) !== JSON.stringify(q.data.items[i])).length : 0;
  const edit = (i: number, r: EventRuleVM) => setDraft(rows.map((x, j) => (j === i ? r : x)));
  const toggle = (r: EventRuleVM, ch: Channel, on: boolean): EventRuleVM => ({
    ...r, channels: { ...r.channels, [ch]: on },
    chain: ch === "inapp" ? r.chain : on ? [...r.chain.filter((x) => x !== ch), ch] : r.chain.filter((x) => x !== ch),
  });
  const move = (r: EventRuleVM, i: number, d: -1 | 1): EventRuleVM => { const ch = [...r.chain]; [ch[i], ch[i + d]] = [ch[i + d], ch[i]]; return { ...r, chain: ch }; };
  const submit = () => draft && save.mutate({ items: draft, version: q.data.version }, {
    onSuccess: () => { setDraft(null); toast({ title: c.saved, tone: "success" }); },
    onError: (e) => (errorState(e) === "conflict" ? setConflict(true) : toast({ title: errText(e), tone: "danger" })),
  });

  return (
    <div className="grid gap-4">
      {conflict && <ConflictBanner by="—" at={new Date(q.dataUpdatedAt).toISOString()} onReload={() => { setConflict(false); setDraft(null); q.refetch(); }} />}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-small text-fg-muted">
        <p className="flex items-center gap-1.5"><Icon name="shield" size={14} aria-hidden />{c.security}</p>
        <p className="flex items-center gap-1.5"><Icon name="clock" size={14} aria-hidden />{c.quiet}</p>
      </div>
      <ul className="grid gap-3 m-stagger">
        {rows.map((r, i) => (
          <li key={r.event} style={{ ["--i" as string]: i }} className={cx("grid gap-3 border bg-surface p-4 lg:grid-cols-[minmax(12rem,1fr)_auto_auto] lg:items-center", JSON.stringify(r) !== JSON.stringify(q.data.items[i]) ? "border-navy-300" : "border-border")}>
            <div className="min-w-0">
              <p className="font-mono text-[0.85rem] break-all">{r.event}</p>
              <p className="mt-1 flex flex-wrap gap-1.5">
                {r.critical && <Badge tone="danger">{s.rule.critical}</Badge>}
                {r.security && <Badge tone="info"><Icon name="lock" size={11} aria-hidden />{s.rule.locked}</Badge>}
              </p>
            </div>
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">{r.event}</legend>
              {CH.map((ch) => {
                const locked = (r.security && (ch === "email" || ch === "inapp") && r.channels[ch]);
                return (
                  <label key={ch} className={cx("inline-flex h-9 items-center gap-2 border px-3 text-small", r.channels[ch] ? "border-secondary bg-secondary text-on-secondary" : "border-border-strong", locked ? "opacity-80" : "cursor-pointer m-press")}>
                    <input type="checkbox" className="sr-only" checked={r.channels[ch]} disabled={locked || !online} onChange={(e) => edit(i, toggle(r, ch, e.target.checked))} aria-describedby={locked ? `lock-${i}` : undefined} />
                    {r.channels[ch] ? <Icon name={locked ? "lock" : "check"} size={13} aria-hidden /> : <Icon name="plus" size={13} aria-hidden />}{s.rule[ch]}
                  </label>
                );
              })}
              {r.security && <span id={`lock-${i}`} className="sr-only">{s.rule.locked}</span>}
            </fieldset>
            <div className="flex flex-wrap items-center gap-2">
              <Select aria-label={`${r.event} · ${c.priority}`} value={r.priority} disabled={r.critical || !online} onChange={(e) => edit(i, { ...r, priority: e.target.value as EventRuleVM["priority"] })} className="h-9 w-auto py-0 text-small">
                {(["low", "normal", "high", "critical"] as const).map((p) => <option key={p} value={p}>{c.p[p]}</option>)}
              </Select>
              {r.critical ? <span className="text-small text-fg-muted">{c.criticalNever}</span> : (
                <Select aria-label={`${r.event} · ${c.quiet}`} value={r.quietHours} disabled={!online} onChange={(e) => edit(i, { ...r, quietHours: e.target.value as EventRuleVM["quietHours"] })} className="h-9 w-auto py-0 text-small">
                  <option value="defer">{c.defer}</option><option value="send">{c.send}</option>
                </Select>
              )}
            </div>
            <div className="lg:col-span-3">
              <p className="mb-1.5 text-eyebrow text-fg-subtle">{c.chain}</p>
              {r.chain.length ? (
                <ol className="flex flex-wrap items-center gap-1.5">
                  {r.chain.map((ch, k) => (
                    <li key={ch} className="flex items-center gap-1.5">
                      {k > 0 && <Icon name="arrowRight" size={13} aria-hidden className="text-fg-subtle" />}
                      <span className="inline-flex h-8 items-center gap-1 bg-ink-100 pr-1 pl-3 text-small">
                        {s.rule[ch]}
                        <button type="button" aria-label={fill(c.up, { c: s.rule[ch] })} disabled={k === 0 || !online} onClick={() => edit(i, move(r, k, -1))} className="flex size-7 items-center justify-center hover:bg-navy-50 disabled:opacity-30"><Icon name="chevronDown" size={13} aria-hidden className="rotate-90" /></button>
                        <button type="button" aria-label={fill(c.down, { c: s.rule[ch] })} disabled={k === r.chain.length - 1 || !online} onClick={() => edit(i, move(r, k, 1))} className="flex size-7 items-center justify-center hover:bg-navy-50 disabled:opacity-30"><Icon name="chevronDown" size={13} aria-hidden className="-rotate-90" /></button>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-small text-fg-muted">{c.noChain}</p>}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-eyebrow text-fg-subtle">{c.inappAlways}</p>
      {dirty > 0 && (
        <div role="region" aria-label={c.save} className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-10 flex flex-wrap items-center justify-between gap-3 theme-dark bg-bg p-3 pl-5 text-fg shadow-lg m-rise lg:bottom-4">
          <p className="text-small" aria-live="polite">{fill(c.dirty, { n: dirty })}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline-dark" onClick={() => setDraft(null)}>{c.discard}</Button>
            <Button size="sm" variant="primary" loading={save.isPending} disabled={!online} onClick={submit}>{c.save}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- NT2 registry
const STATUS_TONE = { draft: "neutral", pending_provider_approval: "info", active: "success", retired: "neutral", rejected: "danger" } as const;
export function TemplateStatusBadge({ t }: { t: TemplateVM }) {
  const c = useC().tpl;
  const v = currentVersion(t);
  return <Badge tone={STATUS_TONE[v.status]}>{v.status === "pending_provider_approval" && <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-current" />}{c.s[v.status]}</Badge>;
}
function LangTicks({ t }: { t: TemplateVM }) {
  const c = useC();
  const v = currentVersion(t);
  return (
    <span className="flex gap-2 text-small">
      {LOCALES.map((l) => v.languages[l]?.body.trim()
        ? <span key={l} className="inline-flex items-center gap-0.5">{l}<Icon name="check" size={12} aria-hidden className="text-success" /></span>
        : <span key={l} className="inline-flex items-center gap-0.5 text-warning" title={fill(c.tpl.missing, { l: c.ed.lang[l] })}>{l}<Icon name="zap" size={12} aria-hidden /><span className="sr-only">{fill(c.tpl.missing, { l: c.ed.lang[l] })}</span></span>)}
    </span>
  );
}
function Templates() {
  const c = useC();
  const s = useS();
  const { locale } = useI18n();
  const q = useTemplates();
  const [term, setTerm] = useState("");
  const [owner, setOwner] = useState<"" | TemplateVM["ownerKind"]>("");
  if (q.isError && !q.data && errorState(q.error) === "locked") return <LockedContent reason="role" />;
  const items = (q.data?.items ?? []).filter((t) => (!owner || t.ownerKind === owner) && t.key.toLowerCase().includes(term.trim().toLowerCase()));
  const href = (t: TemplateVM) => localHref(locale, `/system/notifications/templates/${encodeURIComponent(t.key)}`);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-0 flex-[1_1_14rem]">
          <span className="sr-only">{c.tpl.search}</span>
          <Icon name="search" size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-subtle" />
          <Input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder={c.tpl.search} className="h-11 pl-10" />
        </label>
        <Select aria-label={c.tpl.owner} value={owner} onChange={(e) => setOwner(e.target.value as typeof owner)} className="h-11 w-auto">
          <option value="">{c.tpl.owner}: {c.tpl.all}</option>
          {(["security", "operational", "marketing"] as const).map((o) => <option key={o} value={o}>{c.tpl[o]}</option>)}
        </Select>
      </div>
      {q.isPending ? <Loading /> : !q.data ? <PanelError what={c.tpl.what} onRetry={() => q.refetch()} /> : !items.length ? <EmptyPanel title={c.tpl.emptyTitle} body={c.tpl.emptyBody} /> : (
        <>
          <div className="hidden overflow-x-auto border border-border bg-surface md:block">
            <table className="w-full min-w-[52rem]">
              <thead className="border-b border-border bg-bg-subtle"><tr>
                {[c.tpl.key, c.tpl.channel, c.tpl.languages, c.tpl.status, c.tpl.version, c.tpl.edited].map((h) => <th key={h} scope="col" className={TH}>{h}</th>)}
              </tr></thead>
              <tbody>
                {items.map((t) => {
                  const v = currentVersion(t);
                  return (
                    <tr key={t.key} className="border-b border-border last:border-0 hover:bg-navy-50/60">
                      <td className="px-3 py-3">
                        <Link href={href(t)} className="font-mono text-[0.8rem] underline-offset-4 hover:underline">{t.key}</Link>
                        {t.ownerKind !== "security" && <span className="mt-0.5 flex items-center gap-1 text-eyebrow text-fg-subtle"><Icon name="lock" size={11} aria-hidden />{fill(c.tpl.ownedBy, { role: c.tpl.ownerRole[t.ownerKind] })}</span>}
                      </td>
                      <td className="px-3 py-3 text-small">{s.rule[t.channel]}</td>
                      <td className="px-3 py-3"><LangTicks t={t} /></td>
                      <td className="px-3 py-3"><TemplateStatusBadge t={t} /></td>
                      <td className="px-3 py-3 text-small tabular">v{v.v}</td>
                      <td className="px-3 py-3 text-small text-fg-muted">{formatDate(v.editedAt, locale)} · {v.editedBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-2 md:hidden">
            {items.map((t) => (
              <li key={t.key}>
                <Link href={href(t)} className="grid gap-2 border border-border bg-surface p-4 m-press">
                  <span className="flex items-start justify-between gap-2"><span className="font-mono text-[0.8rem] break-all">{t.key}</span><TemplateStatusBadge t={t} /></span>
                  <span className="flex flex-wrap items-center gap-3 text-small text-fg-muted">{s.rule[t.channel]} · v{currentVersion(t).v}<LangTicks t={t} /></span>
                  {t.ownerKind !== "security" && <span className="text-eyebrow text-fg-subtle">{fill(c.tpl.ownedBy, { role: c.tpl.ownerRole[t.ownerKind] })}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- deliveries
const DL_TONE = { queued: "neutral", skipped: "neutral", duplicate: "neutral", suppressed: "warning", sent: "neutral", delivered: "success", read: "success", failed: "danger", deferred: "warning", capped: "warning" } as const;
function Deliveries() {
  const c = useC().dl;
  const s = useS();
  const { locale } = useI18n();
  const phone = usePhone();
  const [sp, set] = useParamState();
  const qs = new URLSearchParams([["status", sp.get("status") ?? ""], ["channel", sp.get("channel") ?? ""]].filter(([, v]) => v)).toString();
  const q = useDeliveries(qs);
  const [open, setOpen] = useState<DeliveryVM | null>(null);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Select aria-label={c.status} value={sp.get("status") ?? ""} onChange={(e) => set({ status: e.target.value || null })} className="h-11 w-auto">
          <option value="">{c.status}: {c.any}</option>
          {(Object.keys(c.s) as (keyof typeof c.s)[]).map((k) => <option key={k} value={k}>{c.s[k]}</option>)}
        </Select>
        <Select aria-label={c.channel} value={sp.get("channel") ?? ""} onChange={(e) => set({ channel: e.target.value || null })} className="h-11 w-auto">
          <option value="">{c.channel}: {c.any}</option>
          {CH.filter((x) => x !== "inapp").map((k) => <option key={k} value={k}>{s.rule[k]}</option>)}
        </Select>
      </div>
      {q.isPending ? <Loading /> : !q.data ? <PanelError what={c.what} onRetry={() => q.refetch()} /> : !q.data.items.length ? <EmptyPanel title={c.emptyTitle} body={c.emptyBody} /> : (
        <ul className="divide-y divide-border overflow-hidden border border-border bg-surface" aria-busy={q.isFetching}>
          {q.data.items.map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => setOpen(d)} className="grid w-full gap-1 px-4 py-3 text-left hover:bg-navy-50/60 sm:grid-cols-[9rem_1fr_auto_auto] sm:items-center sm:gap-4">
                <span className="text-eyebrow text-fg-subtle tabular">{formatDateTime(d.at, locale)}</span>
                <span className="min-w-0"><span className="block font-mono text-[0.8rem] break-all">{d.event}</span><span className="text-small text-fg-muted">{s.rule[d.channel]} · {d.to} · {d.lang}{d.fallbackTo && ` · ${fill(c.fellBack, { c: s.rule[d.fallbackTo] })}`}</span></span>
                <span className="text-small tabular text-fg-muted">{formatMoney(d.costRwf, "RWF", locale)}</span>
                <Badge tone={DL_TONE[d.status]} className="justify-self-start">{c.s[d.status]}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!open} onClose={() => setOpen(null)} side={phone ? "bottom" : "right"} title={open ? fill(c.detail, { id: open.id }) : ""}>
        {open && (
          <div className="grid gap-4">
            <dl className="grid grid-cols-2 gap-3 text-small">
              {([[c.event, open.event], [c.channel, s.rule[open.channel]], [c.to, open.to], [c.status, c.s[open.status]], [c.lang, open.lang], [c.cost, formatMoney(open.costRwf, "RWF", locale)]] as const).map(([k, v]) => (
                <div key={k}><dt className="text-eyebrow text-fg-subtle">{k}</dt><dd className="break-all">{v}</dd></div>
              ))}
            </dl>
            {open.fallbackTo && <p className="bg-warning-bg px-3 py-2 text-small">{fill(c.fellBack, { c: s.rule[open.fallbackTo] })}</p>}
            <figure className="grid gap-1">
              <figcaption className="text-eyebrow text-fg-subtle">{c.payload}</figcaption>
              {/* shortcut: payload is synthesised from the delivery row; show the provider's redacted JSON when the delivery API returns it. */}
              <pre className="overflow-x-auto bg-bg-subtle p-3 font-mono text-[0.75rem]">{JSON.stringify({ id: open.id, template: open.templateKey, to: open.to, status: open.status, lang: open.lang, token: "•••• (redacted)" }, null, 2)}</pre>
            </figure>
          </div>
        )}
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------- costs + budget editor (step-up)
function Costs() {
  const c = useC().cost;
  const { locale } = useI18n();
  const q = useCosts();
  const [edit, setEdit] = useState<BudgetVM | null>(null);
  const online = useOnline();
  if (q.isError && !q.data && errorState(q.error) === "locked") return <LockedContent reason="role" />;
  if (q.isPending) return <Loading />;
  if (!q.data) return <PanelError what={c.what} onRetry={() => q.refetch()} />;
  return (
    <div className="grid gap-4">
      <p className="flex items-start gap-2 bg-info-bg p-4 text-small"><Icon name="shield" size={15} aria-hidden className="mt-0.5 shrink-0 text-navy-700" /><span>{c.rule} {c.alert}</span></p>
      <ul className="grid gap-3 sm:grid-cols-2 m-stagger">
        {q.data.budgets.map((b, i) => (
          <li key={b.channel} style={{ ["--i" as string]: i }} className="grid gap-4 border border-border bg-surface p-5">
            <BudgetBar label={`${c.ch[b.channel]} · ${c.mtd}`} spent={b.spent} budget={b.budget} />
            <dl className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-small">
              <div><dt className="text-eyebrow text-fg-subtle">{c.transactional}</dt><dd className="tabular">{formatMoney(b.spent - b.marketingSpent, "RWF", locale)}</dd></div>
              <div><dt className="text-eyebrow text-fg-subtle">{c.marketing}</dt><dd className="tabular">{formatMoney(b.marketingSpent, "RWF", locale)}</dd></div>
            </dl>
            <Button size="sm" variant="outline" className="justify-self-start" disabled={!online} onClick={() => setEdit(b)}>{c.edit}</Button>
          </li>
        ))}
      </ul>
      <BudgetDialog b={edit} version={q.data.version} onClose={() => setEdit(null)} />
    </div>
  );
}
function BudgetDialog({ b, version, onClose }: { b: BudgetVM | null; version: number; onClose: () => void }) {
  const c = useC().cost;
  const s = useS();
  const phone = usePhone();
  const toast = useToast();
  const errText = useErrText();
  const save = useSaveBudget();
  const stepUp = useStepUp();
  const [val, setVal] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const close = () => { setVal(null); setErr(null); onClose(); };
  const n = Number((val ?? String(b?.budget ?? "")).replace(/[\s,]/g, ""));
  const run = async (retry = true): Promise<void> => {
    if (!b) return;
    if (!Number.isInteger(n) || n <= 0) return setErr(c.invalid);
    try {
      const token = await stepUp.request(c.stepUp);
      await save.mutateAsync({ channel: b.channel, budget: n, version, token });
      toast({ title: c.saved, tone: "success" });
      close();
    } catch (e) {
      if (e instanceof StepUpCancelled) return;
      if (errType(e) === "step_up_required" && retry) { stepUp.reset(); return run(false); }
      setErr(errText(e));
    }
  };
  return (
    <>
      <Dialog open={!!b} onClose={close} side={phone ? "bottom" : undefined} title={b ? fill(c.editTitle, { c: c.ch[b.channel] }) : ""} description={c.rule}
        footer={<><Button variant="outline" onClick={close}>{s.secret.cancel}</Button><Button dots loading={save.isPending} onClick={() => run()}>{s.secret.save}</Button></>}>
        <form onSubmit={(e) => { e.preventDefault(); run(); }}>
          <Field label={c.amount} hint={c.alert} error={err ?? undefined}>
            {({ id, describedBy, invalid }) => <Input id={id} inputMode="numeric" aria-describedby={describedBy} aria-invalid={invalid} value={val ?? String(b?.budget ?? "")} onChange={(e) => { setVal(e.target.value); setErr(null); }} className="tabular" />}
          </Field>
        </form>
      </Dialog>
      {stepUp.dialog}
    </>
  );
}
