"use client";
// U14 Sequences (board marketing/10 SQ1–SQ2, customer-360 CU3): list with tabs + excluded info bar, builder (trigger, step rail,
// template preview in the selected language, exits), runs with reasons, System tab (read-only), inactive rule card.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { formatDateTime, formatRelative } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { useCmpMutation, useInactiveRule, useRuns, useSequence, useSequences, useTemplates, type SequenceRow } from "@/lib/marketing/campaigns";
import type { AutomationRule, AutomationStep, Locale, Trigger } from "@/shared/marketing/types";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Checkbox, Field, Input, Select, Switch } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Panel, SavedViewTabs } from "@/components/molecules/ops/ops";
import { ChannelIcon, PageHead, StepDot, useM } from "@/components/atoms/marketing";
import { ListSkeleton, QueryState, fa, fill, useC, useErr, useNum } from "@/components/molecules/marketing/marketing";
import { api, unwrap } from "@/lib/api/client";

const TABS = ["all", "active", "paused", "system"] as const;

export function SequencesView() {
  const c = useC();
  const n = useNum();
  const err = useErr();
  const toast = useToast();
  const { locale } = useI18n();
  const p = useUrlParams();
  const tab = (p.get("tab") ?? "all") as (typeof TABS)[number];
  const q = useSequences();
  const [off, setOff] = useState<SequenceRow | null>(null);
  const mc = useM();
  const toggle = useCmpMutation((id: string) => unwrap(api.POST("/api/admin/crm/automations/{id}/toggle", { params: { path: { id } } })));
  const all = q.data?.items ?? [];
  const items = all.filter((a) => (tab === "system" ? a.system : !a.system && (tab === "all" || (tab === "active") === a.active)));
  const flip = (a: SequenceRow) => toggle.mutate(a.id, { onError: (e) => toast({ title: err(e), tone: "danger" }) });
  return (
    <>
      <PageHead title={c.seq.title} sub={c.seq.sub} actions={<ButtonLink href={localHref(locale, "/marketing/sequences/new")} size="sm"><Icon name="plus" size={16} aria-hidden />{c.seq.new}</ButtonLink>} />
      {q.data && q.data.excludedNoWa > 0 && <p role="status" className="mb-4 bg-info-bg px-4 py-3 text-small text-info">{fill(c.seq.excludedBar, { n: n(q.data.excludedNoWa) })}</p>}
      <SavedViewTabs views={TABS.map((k) => ({ key: k, label: c.seq.tabs[k] }))} active={tab} onChange={(k) => setUrlParams({ tab: k === "all" ? null : k })} />
      <div className="mt-4 grid gap-5 xl:grid-cols-[1fr_22rem]">
        <QueryState q={q} what={c.seq.title} empty={!items.length && c.seq.empty}>
          {tab === "system" && <p className="mb-3 text-small text-fg-muted">{c.seq.systemBody}</p>}
          <ul className="grid content-start gap-2 m-stagger">
            {items.map((a, i) => {
              const chans = [...new Set(a.steps.map((s) => String(s.params.channel ?? "")).filter(Boolean))];
              return (
                <li key={a.id} style={{ ["--i" as string]: i }} className="grid gap-3 border border-border bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    {a.system ? <span className="block truncate text-label-lg">{a.name}</span> : <Link href={localHref(locale, `/marketing/sequences/${a.id}`)} className="block truncate text-label-lg hover:underline">{a.name}</Link>}
                    <p className="mt-1 flex flex-wrap items-center gap-3 text-eyebrow text-fg-subtle">
                      {a.system ? c.seq.system : c.seq.triggers[a.trigger]}
                      {chans.map((ch) => <ChannelIcon key={ch} channel={ch as "email"} />)}
                      {!a.system && <><span title={c.seq.convertedTip}>{c.seq.enrolled} {n(a.enrolled)} · {c.seq.converted} {n(a.converted)}</span><span title={c.seq.exitedTip}>{c.seq.exited} {n(a.exited)}</span></>}
                      <span>{formatRelative(a.updatedAt, locale)}</span>
                    </p>
                  </div>
                  {!a.system && <Switch label={a.active ? c.seq.active : c.seq.paused} checked={a.active} onChange={() => (a.active && a.waiting > 0 ? setOff(a) : flip(a))} />}
                </li>
              );
            })}
          </ul>
        </QueryState>
        <InactiveRuleCard />
      </div>
      <Dialog open={!!off} onClose={() => setOff(null)} title={c.seq.offTitle}
        footer={<><Button variant="ghost" onClick={() => setOff(null)}>{mc.common.cancel}</Button><Button variant="danger" onClick={() => { if (off) flip(off); setOff(null); }}>{c.seq.offConfirm}</Button></>}>
        <p>{fill(c.seq.offBody, { n: off?.waiting ?? 0 })}</p>
      </Dialog>
    </>
  );
}

function InactiveRuleCard() {
  const c = useC();
  const n = useNum();
  const q = useInactiveRule();
  const d = q.data;
  return (
    <Panel title={c.seq.inactive}>
      {!d ? <ListSkeleton rows={2} /> : (
        <div className="grid gap-3 text-small">
          <p className="text-fg-muted">{fill(c.seq.inactiveBody, { d: d.days })}</p>
          <p className="text-card-title tabular">{fill(c.seq.inactiveCount, { n: n(d.count) })}</p>
          <ul className="grid gap-1">{(["email", "whatsapp", "sms"] as const).map((ch) => <li key={ch} className="flex justify-between"><ChannelIcon channel={ch} label /><span className="tabular">{n(d.consent[ch])}</span></li>)}</ul>
          <p className="text-eyebrow text-fg-subtle">{c.seq.attached}: {d.sequenceId}</p>
        </div>
      )}
    </Panel>
  );
}

const TRIGGERS: Trigger[] = ["quote_sent_no_reply", "info_requested_no_reply", "consultation_attended_no_case", "draft_abandoned_24h", "inactive_90d", "manual"];
const EXITS: AutomationRule["exit"] = ["replied", "paid", "unsubscribed", "won", "lost"];

export function SequenceBuilder({ id }: { id: string }) {
  const q = useSequence(id);
  if (id !== "new" && q.isPending) return <ListSkeleton rows={5} />;
  if (id !== "new" && !q.data) return <QueryState q={q} what="Sequence">{null}</QueryState>;
  return <Builder key={q.data?.updatedAt ?? "new"} a={q.data} />;
}

function Builder({ a }: { a?: SequenceRow }) {
  const c = useC();
  const err = useErr();
  const toast = useToast();
  const router = useRouter();
  const { locale } = useI18n();
  const p = useUrlParams();
  const tab = p.get("tab") ?? "steps";
  const [d, setD] = useState<Pick<AutomationRule, "name" | "trigger" | "steps" | "exit">>(() => a ?? { name: "", trigger: "quote_sent_no_reply", steps: [{ waitDays: 1, action: "send_template", params: { channel: "whatsapp", template: "vat_deadline_reminder" } }], exit: ["replied", "won", "lost", "unsubscribed"] });
  const [lang, setLang] = useState<Locale>(locale);
  const mc = useM();
  const tpls = useTemplates({ category: "marketing" }).data?.items ?? [];
  const save = useCmpMutation(() => a ? unwrap<AutomationRule>(api.PATCH("/api/admin/crm/automations/{id}", { params: { path: { id: a.id } }, body: d })) : unwrap<AutomationRule>(api.POST("/api/admin/crm/automations", { body: d })));
  const setStep = (i: number, s: AutomationStep) => setD((v) => ({ ...v, steps: v.steps.map((x, k) => (k === i ? s : x)) }));
  return (
    <>
      <PageHead eyebrow={<Link href={localHref(locale, "/marketing/sequences")} className="hover:underline">{c.seq.title}</Link>} title={a?.name || c.seq.new} />
      {a && <SavedViewTabs views={[{ key: "steps", label: c.seq.steps }, { key: "runs", label: c.seq.runs }]} active={tab} onChange={(k) => setUrlParams({ tab: k === "steps" ? null : k })} />}
      {tab === "runs" && a ? <Runs id={a.id} steps={a.steps} /> : (
        <div className="mt-4 grid gap-5 xl:grid-cols-[1fr_20rem]">
          <div className="grid content-start gap-4">
            <Field label={c.seg.name}>{(f) => <Input {...fa(f)} value={d.name} onChange={(e) => setD((v) => ({ ...v, name: e.target.value }))} />}</Field>
            <Field label={c.seq.trigger}>{(f) => (
              <Select {...fa(f)} value={d.trigger} onChange={(e) => setD((v) => ({ ...v, trigger: e.target.value as Trigger }))}>{TRIGGERS.map((t) => <option key={t} value={t}>{c.seq.triggers[t]}</option>)}</Select>
            )}</Field>
            <ol className="relative grid gap-3 border-l-2 border-dashed border-border-strong pl-5">
              {d.steps.map((s, i) => {
                const day = d.steps.slice(0, i + 1).reduce((n, x) => n + x.waitDays, 0);
                const tpl = tpls.find((t) => t.key === s.params.template && t.language === lang) ?? tpls.find((t) => t.key === s.params.template);
                return (
                  <li key={i} className="relative grid gap-2 border border-border bg-white p-4 m-rise">
                    <span aria-hidden className="absolute -left-[1.85rem] top-5 size-3 rounded-full bg-navy-700" />
                    <p className="text-label">{fill(c.seq.day, { n: day })}</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Field label={c.seq.wait}>{(f) => <Input {...fa(f)} type="number" min={0} value={s.waitDays} onChange={(e) => setStep(i, { ...s, waitDays: Math.max(0, Number(e.target.value)) })} />}</Field>
                      <Field label={c.seq.action}>{(f) => (
                        <Select {...fa(f)} value={s.action} onChange={(e) => setStep(i, { ...s, action: e.target.value as AutomationStep["action"], params: {} })}>{(["send_template", "create_task", "set_stage"] as const).map((x) => <option key={x} value={x}>{c.seq.actions[x]}</option>)}</Select>
                      )}</Field>
                      {s.action === "send_template" ? (
                        <Field label={c.seq.template}>{(f) => (
                          <Select {...fa(f)} value={String(s.params.template ?? "")} onChange={(e) => { const t = tpls.find((x) => x.key === e.target.value); setStep(i, { ...s, params: { template: e.target.value, channel: t?.channel } }); }}>
                            {[...new Map(tpls.map((t) => [t.key, t])).values()].map((t) => <option key={t.key} value={t.key} disabled={t.status !== "active"}>{t.name} · {c.common.channel[t.channel]}</option>)}
                          </Select>
                        )}</Field>
                      ) : s.action === "create_task" ? (
                        <Field label={c.seq.taskTitle}>{(f) => <Input {...fa(f)} value={String(s.params.title ?? "")} onChange={(e) => setStep(i, { ...s, params: { kind: "call", title: e.target.value } })} />}</Field>
                      ) : (
                        <Field label={c.seq.stageTo}>{(f) => <Select {...fa(f)} value="lost" onChange={() => undefined}><option value="lost">{mc.stage.lost}</option></Select>}</Field>
                      )}
                    </div>
                    {tpl && <p lang={tpl.language} className="bg-bg-subtle p-3 text-small"><span className="sr-only">{c.seq.preview}: </span>{tpl.body}</p>}
                    <Button size="sm" variant="ghost" className="justify-self-start" onClick={() => setD((v) => ({ ...v, steps: v.steps.filter((_, k) => k !== i) }))}>{c.seg.remove}</Button>
                  </li>
                );
              })}
            </ol>
            <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => setD((v) => ({ ...v, steps: [...v.steps, { waitDays: 2, action: "create_task", params: { kind: "call", title: "" } }] }))}><Icon name="plus" size={14} aria-hidden />{c.seq.addStep}</Button>
            <fieldset className="grid gap-2"><legend className="mb-1 text-label">{c.seq.exits}</legend>
              {EXITS.map((x) => <Checkbox key={x} label={c.seq.exitL[x]} checked={d.exit.includes(x)} onChange={(e) => setD((v) => ({ ...v, exit: e.target.checked ? [...v.exit, x] : v.exit.filter((y) => y !== x) }))} />)}
            </fieldset>
            <Button className="justify-self-start" loading={save.isPending} disabled={!d.name.trim()} onClick={() => save.mutate(undefined, {
              onSuccess: (r) => { toast({ title: c.seq.saved, tone: "success" }); if (!a) router.replace(localHref(locale, `/marketing/sequences/${(r as AutomationRule).id}`)); },
              onError: (e) => toast({ title: err(e), tone: "danger" }),
            })}>{c.seq.save}</Button>
          </div>
          <aside>
            <Field label={c.seq.previewLang}>{(f) => <Select {...fa(f)} value={lang} onChange={(e) => setLang(e.target.value as Locale)}>{(["rw", "en", "fr"] as const).map((l) => <option key={l} value={l}>{c.common.lang[l]}</option>)}</Select>}</Field>
          </aside>
        </div>
      )}
    </>
  );
}

function Runs({ id, steps }: { id: string; steps: AutomationStep[] }) {
  const c = useC();
  const { locale } = useI18n();
  const q = useRuns(id);
  const items = q.data?.items ?? [];
  return (
    <div className="mt-4">
      <QueryState q={q} what={c.seq.runs} empty={!items.length && c.seq.noRuns}>
        <div className="overflow-x-auto border border-border bg-white">
          <table className="w-full min-w-[36rem] text-left text-small">
            <thead className="bg-ink-100 text-ink-700"><tr><th className="p-3">{c.seq.person}</th><th className="p-3">{c.seq.step}</th><th className="p-3">{c.seq.at}</th><th className="p-3">{c.seq.state}</th></tr></thead>
            <tbody>{items.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3">{r.subject.label}</td>
                <td className="p-3">{steps[r.stepIndex] ? c.seq.actions[steps[r.stepIndex].action] : r.stepIndex + 1}</td>
                <td className="p-3 tabular">{formatDateTime(r.runAt, locale)}</td>
                <td className="p-3"><StepDot state={r.status} />{r.reason && <span className="ml-1 text-fg-subtle">· {c.seq.reasons[r.reason] ?? r.reason}</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
