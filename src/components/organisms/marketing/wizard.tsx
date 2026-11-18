"use client";
// U13 Campaign wizard (board marketing/09 CA1, journey J2): URL stepper ?step=&id=, draft saved on every step, right rail
// always shows consent exclusion, cost, budget and approval. Prefill ?segment=&channel=&from= (regulatory "Notify subscribers").
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDateTime } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { useCampaign, useCmpMutation, useSegments, useTemplates, type CampaignView } from "@/lib/marketing/campaigns";
import { useStaff } from "@/lib/marketing/api";
import { OPT_OUT_SMS, smsSegments } from "@/shared/marketing/cost";
import { inQuietHours, nextAllowed } from "@/shared/marketing/quiet-hours";
import type { Campaign, Channel, Locale } from "@/shared/marketing/types";
import { MKT_POLICY } from "@/shared/policy";
import { Button } from "@/components/atoms/button";
import { Field, Input, Radio, Select, Switch, Textarea } from "@/components/atoms/field";
import { Stepper } from "@/components/atoms/misc";
import { useToast } from "@/components/atoms/toast";
import { Panel } from "@/components/molecules/ops/ops";
import { useNow } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { CharCounter, PageHead, TemplateStatusChip } from "@/components/atoms/marketing";
import { BudgetMeter, ConsentExclusionCard, CostEstimate, ListSkeleton, fa, fill, useC, useErr, useNum } from "@/components/molecules/marketing/marketing";
import { useMoney } from "@/components/atoms/hooks";
import { api, unwrap } from "@/lib/api/client";

const STEPS = ["audience", "channel", "content", "schedule", "review"] as const;
type Step = (typeof STEPS)[number];
const LANGS: Locale[] = ["rw", "en", "fr"];

export function CampaignWizard() {
  const p = useUrlParams();
  const id = p.get("id");
  const q = useCampaign(id);
  if (id && q.isPending) return <ListSkeleton rows={6} />;
  return <Wizard key={id ?? "new"} x={q.data ?? null} prefill={{ segment: p.get("segment"), channel: p.get("channel") as Channel | null, from: p.get("from") }} step={(STEPS as readonly string[]).includes(p.get("step") ?? "") ? (p.get("step") as Step) : "audience"} />;
}

function Wizard({ x, prefill, step }: { x: CampaignView | null; prefill: { segment: string | null; channel: Channel | null; from: string | null }; step: Step }) {
  const c = useC();
  const err = useErr();
  const toast = useToast();
  const router = useRouter();
  const { locale } = useI18n();
  const online = useOnline();
  const [d, setD] = useState<Partial<Campaign>>(() => x ?? { name: "", segmentId: prefill.segment ?? "SG-VAT-SMEs", channel: prefill.channel ?? "whatsapp", templates: {}, throttle: MKT_POLICY.throttle });
  const [mode, setMode] = useState<"now" | "later">(x?.scheduledAt ? "later" : "now");
  const [approverId, setApproverId] = useState(x?.approverId ?? "");
  const idx = STEPS.indexOf(step);
  const save = useCmpMutation((body: Partial<Campaign>) => x ? unwrap<CampaignView>(api.PATCH("/api/admin/crm/campaigns/{id}", { params: { path: { id: x.id } }, body: body })) : unwrap<CampaignView>(api.POST("/api/admin/crm/campaigns", { body: body })));
  const act = useCmpMutation((v: { action: string; body?: Record<string, unknown> }) => unwrap<CampaignView>(api.POST("/api/admin/crm/campaigns/{id}/{action}", { params: { path: { id: x!.id, action: v.action } }, body: v.body ?? {} })));
  const editable = !x || x.status === "draft";

  const go = (to: Step) => {
    if (!editable) return setUrlParams({ step: to });
    save.mutate({ name: d.name || undefined, segmentId: d.segmentId, channel: d.channel, templates: d.templates, fallbackLanguage: d.fallbackLanguage, scheduledAt: mode === "later" ? d.scheduledAt : undefined, throttle: d.throttle }, {
      onSuccess: (v) => {
        if (!x) router.replace(localHref(locale, `/marketing/campaigns/new?id=${v.id}&step=${to}`));
        else setUrlParams({ step: to });
        toast({ title: c.wiz.saved, tone: "success" });
      },
      onError: (e) => toast({ title: err(e), tone: "danger" }),
    });
  };
  const finish = (action: "submit" | "schedule") => act.mutate({ action, body: action === "submit" ? { approverId } : { at: mode === "later" ? d.scheduledAt : undefined } }, {
    onSuccess: (v) => router.push(localHref(locale, `/marketing/campaigns/${v.id}`)),
    onError: (e) => toast({ title: err(e), tone: "danger" }),
  });

  return (
    <>
      <PageHead title={x?.name || c.wiz.title} sub={prefill.from ? c.wiz.regulatory : undefined} />
      <Stepper steps={STEPS.map((s) => c.wiz.steps[s])} current={idx} />
      {x?.rejectedReason && <p role="status" className="mt-4 bg-danger-bg px-4 py-3 text-small text-danger">{fill(c.wiz.rejected, { r: x.rejectedReason })}</p>}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_22rem]">
        <section aria-label={c.wiz.steps[step]} className="grid content-start gap-4 m-rise" key={step}>
          {step === "audience" && <Audience d={d} setD={setD} />}
          {step === "channel" && <ChannelStep d={d} setD={setD} />}
          {step === "content" && <Content d={d} setD={setD} x={x} />}
          {step === "schedule" && <Schedule d={d} setD={setD} mode={mode} setMode={setMode} />}
          {step === "review" && x && <Review x={x} approverId={approverId} setApproverId={setApproverId} />}
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {idx > 0 && <Button variant="ghost" onClick={() => go(STEPS[idx - 1])}>{c.wiz.back}</Button>}
            {idx < STEPS.length - 1 && <Button loading={save.isPending} disabled={!d.segmentId} onClick={() => go(STEPS[idx + 1])}>{c.wiz.next}</Button>}
            {step === "review" && x && editable && (x.approvalNeeded
              ? <Button loading={act.isPending} disabled={!online || !approverId} onClick={() => finish("submit")}>{c.wiz.submit}</Button>
              : <Button loading={act.isPending} disabled={!online} onClick={() => act.mutate({ action: "submit" }, { onSuccess: () => finish("schedule"), onError: (e) => toast({ title: err(e), tone: "danger" }) })}>{mode === "later" ? c.wiz.schedule : c.wiz.sendNow}</Button>)}
          </div>
          {!online && <p role="status" className="text-small text-warning">{c.common.offline}</p>}
        </section>
        <aside className="grid content-start gap-4">
          {x ? (
            <>
              <ConsentExclusionCard count={x.live.count} eligible={x.live.eligible} excluded={x.live.excluded} />
              <CostEstimate amount={x.estimate} unit={x.unitCost} />
              <BudgetMeter budget={x.budget} />
              <ApprovalCard x={x} />
            </>
          ) : <div className="h-40 m-shimmer" />}
        </aside>
      </div>
    </>
  );
}

type StepProps = { d: Partial<Campaign>; setD: (f: (d: Partial<Campaign>) => Partial<Campaign>) => void };

function Audience({ d, setD }: StepProps) {
  const c = useC();
  const n = useNum();
  const segs = useSegments().data?.items ?? [];
  return (
    <>
      <Field label={c.wiz.name}>{(a) => <Input {...fa(a)} value={d.name ?? ""} onChange={(e) => setD((v) => ({ ...v, name: e.target.value }))} />}</Field>
      <fieldset className="grid gap-2"><legend className="mb-1 text-label">{c.wiz.pickSegment}</legend>
        {segs.map((s) => (
          <label key={s.id} className={cx("flex cursor-pointer items-center gap-3 border p-3", d.segmentId === s.id ? "border-navy-700 bg-navy-50" : "border-border bg-white")}>
            <input type="radio" name="segment" checked={d.segmentId === s.id} onChange={() => setD((v) => ({ ...v, segmentId: s.id }))} />
            <span className="flex-1">{s.name}</span><span className="text-small tabular text-fg-muted">{n(s.lastCount)}</span>
          </label>
        ))}
      </fieldset>
    </>
  );
}

function ChannelStep({ d, setD }: StepProps) {
  const c = useC();
  return (
    <fieldset className="grid gap-2"><legend className="mb-1 text-label">{c.list.channel}</legend>
      <p className="text-small text-fg-muted">{c.wiz.channelHint}</p>
      {(["whatsapp", "email", "sms"] as Channel[]).map((ch) => (
        <Radio key={ch} name="channel" checked={d.channel === ch} onChange={() => setD((v) => ({ ...v, channel: ch, templates: {} }))} label={c.common.channel[ch]} />
      ))}
    </fieldset>
  );
}

function Content({ d, setD, x }: StepProps & { x: CampaignView | null }) {
  const c = useC();
  const n = useNum();
  const ch = d.channel ?? "whatsapp";
  const tpls = useTemplates({ channel: ch }).data?.items ?? [];
  const set = (l: Locale, patch: Record<string, unknown>) => setD((v) => ({ ...v, templates: { ...v.templates, [l]: { ...v.templates?.[l], ...patch } } }));
  const langs = x?.live.languages;
  const missing = langs ? LANGS.filter((l) => langs[l] > 0 && !d.templates?.[l]?.templateKey && !d.templates?.[l]?.body && !d.templates?.[l]?.subjectA).reduce((a, l) => a + (langs[l] ?? 0), 0) : 0;
  return (
    <>
      {LANGS.map((l) => {
        const t = d.templates?.[l] ?? {};
        const options = tpls.filter((x2) => x2.language === l);
        const picked = options.find((o) => o.key === t.templateKey);
        const body = (picked?.body ?? t.body ?? "") + (ch === "sms" ? ` ${OPT_OUT_SMS}` : "");
        const seg = smsSegments(body);
        return (
          <Panel key={l} title={`${c.common.lang[l]}${langs ? ` · ${fill(c.wiz.perLang, { lang: c.common.lang[l], n: n(langs[l]) })}` : ""}`}>
            <div className="grid gap-3">
              <Field label={c.wiz.template}>{(a) => (
                <Select {...fa(a)} value={t.templateKey ?? ""} onChange={(e) => set(l, { templateKey: e.target.value || undefined })}>
                  <option value="">—</option>
                  {options.map((o) => {
                    const usable = o.category === "marketing" && o.status === "active";
                    return <option key={o.id} value={o.key} disabled={!usable}>{o.name}{usable ? "" : ` · ${fill(c.wiz.notActive, { s: o.category === "marketing" ? o.status : o.category })}`}</option>;
                  })}
                </Select>
              )}</Field>
              {picked && <div className="flex items-start gap-2"><TemplateStatusChip status={picked.status} /><p lang={l} className="flex-1 bg-bg-subtle p-3 text-small">{picked.body}</p></div>}
              {ch === "email" && (
                <>
                  <Field label={c.wiz.subjectA}>{(a) => <Input {...fa(a)} value={t.subjectA ?? ""} onChange={(e) => set(l, { subjectA: e.target.value })} />}</Field>
                  <Field label={c.wiz.subjectB} hint={fill(c.wiz.splitHint, { h: MKT_POLICY.abWinnerHours })}>{(a) => <Input {...fa(a)} value={t.subjectB ?? ""} onChange={(e) => set(l, { subjectB: e.target.value, abSplit: 50 })} />}</Field>
                  <p className="text-eyebrow text-fg-subtle">{c.wiz.unsub}</p>
                </>
              )}
              {ch === "sms" && (
                <>
                  <Field label={c.wiz.body}>{(a) => <Textarea {...fa(a)} rows={3} value={t.body ?? ""} onChange={(e) => set(l, { body: e.target.value })} />}</Field>
                  <p className="flex flex-wrap items-center gap-3 text-eyebrow text-fg-subtle"><CharCounter value={body} max={160} /> {fill(c.wiz.sms, { len: seg.length, seg: seg.segments, enc: seg.encoding })}</p>
                  <p className="text-eyebrow text-fg-subtle">{c.wiz.optOut} <span className="font-medium">{OPT_OUT_SMS}</span></p>
                </>
              )}
              <p className="text-eyebrow text-fg-subtle">{c.wiz.utm}: <code className="break-all">hbz.rw/c/… ?utm_source={ch}&utm_medium=campaign&utm_campaign={x?.slug ?? "…"}</code></p>
            </div>
          </Panel>
        );
      })}
      <Switch label={c.wiz.fallback} checked={!!d.fallbackLanguage} onChange={(e) => setD((v) => ({ ...v, fallbackLanguage: e.target.checked ? "en" : undefined }))} />
      {!d.fallbackLanguage && missing > 0 && <p role="status" className="text-small text-warning">{fill(c.wiz.fallbackOff, { n: n(missing) })}</p>}
    </>
  );
}

/** Kigali wall-clock input ↔ UTC ISO (Kigali is UTC+2, no DST). */
const toLocal = (iso?: string) => (iso ? new Date(Date.parse(iso) + 2 * 3600_000).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(Date.parse(`${v}:00Z`) - 2 * 3600_000).toISOString() : undefined);

function Schedule({ d, setD, mode, setMode }: StepProps & { mode: "now" | "later"; setMode: (m: "now" | "later") => void }) {
  const c = useC();
  const { locale } = useI18n();
  const now = useNow();
  const at = d.scheduledAt ? new Date(d.scheduledAt) : null;
  const tooSoon = !!(at && now && at.getTime() < now + MKT_POLICY.minScheduleMinutes * 60_000);
  return (
    <>
      <fieldset className="grid gap-2">
        <Radio name="when" checked={mode === "now"} onChange={() => setMode("now")} label={c.wiz.now} />
        <Radio name="when" checked={mode === "later"} onChange={() => setMode("later")} label={c.wiz.later} />
      </fieldset>
      {mode === "later" && (
        <Field label={c.wiz.at} error={tooSoon ? fill(c.wiz.tooSoon, { m: MKT_POLICY.minScheduleMinutes }) : undefined}>{(a) => (
          <Input {...fa(a)} type="datetime-local" value={toLocal(d.scheduledAt)} onChange={(e) => setD((v) => ({ ...v, scheduledAt: fromLocal(e.target.value) }))} />
        )}</Field>
      )}
      <p className="bg-bg-subtle p-3 text-small">{c.wiz.quiet}</p>
      {at && inQuietHours(at) && <p role="status" className="text-small text-warning">{fill(c.wiz.quietHit, { t: formatDateTime(nextAllowed(at), locale) })}</p>}
      <Field label={c.wiz.throttle}>{(a) => <Input {...fa(a)} type="number" min={1} max={600} value={d.throttle ?? MKT_POLICY.throttle} onChange={(e) => setD((v) => ({ ...v, throttle: Number(e.target.value) }))} />}</Field>
    </>
  );
}

function Review({ x, approverId, setApproverId }: { x: CampaignView; approverId: string; setApproverId: (v: string) => void }) {
  const c = useC();
  const n = useNum();
  const err = useErr();
  const toast = useToast();
  const staff = useStaff().data?.items ?? [];
  const test = useCmpMutation(() => unwrap(api.POST("/api/admin/crm/campaigns/{id}/{action}", { params: { path: { id: x.id, action: "test-send" } }, body: {} })));
  const ready = LANGS.filter((l) => x.templates[l]?.templateKey || x.templates[l]?.body || x.templates[l]?.subjectA);
  const approvers = staff.filter((s) => s.id !== x.createdBy && (s.role === "marketing" || s.role === "executive"));
  return (
    <>
      <Panel title={c.wiz.summary}>
        <dl className="grid grid-cols-[9rem_1fr] gap-2 text-small">
          <dt className="text-fg-subtle">{c.list.audience}</dt><dd>{x.segmentName} · {n(x.live.eligible)}</dd>
          <dt className="text-fg-subtle">{c.list.channel}</dt><dd>{c.common.channel[x.channel]}</dd>
          <dt className="text-fg-subtle">{c.wiz.content}</dt><dd>{ready.length ? ready.map((l) => c.common.lang[l]).join(", ") : <span className="text-danger">{c.wiz.missing}</span>}</dd>
        </dl>
      </Panel>
      {x.approvalNeeded && (
        <Field label={c.wiz.approver} hint={c.wiz.approverHint}>{(a) => (
          <Select {...fa(a)} value={approverId} onChange={(e) => setApproverId(e.target.value)}>
            <option value="">—</option>
            {approvers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        )}</Field>
      )}
      <Button variant="secondary" size="sm" loading={test.isPending} onClick={() => test.mutate(undefined, { onSuccess: () => toast({ title: c.wiz.testSent, tone: "success" }), onError: (e) => toast({ title: err(e), tone: "danger" }) })}>{c.wiz.testSend}</Button>
    </>
  );
}

function ApprovalCard({ x }: { x: CampaignView }) {
  const c = useC();
  const m = useMoney();
  return (
    <Panel title={c.card.approval}>
      {x.approvalNeeded ? (
        <p className="text-small"><strong>{c.wiz.approvalNeeded}</strong>{x.approvalReason ? `: ${fill(c.wiz.approvalWhy[x.approvalReason], { n: MKT_POLICY.approvalRecipients, amount: m(MKT_POLICY.approvalCost) })}` : ""}</p>
      ) : <p className="text-small text-fg-muted">{c.wiz.noApproval}</p>}
    </Panel>
  );
}
