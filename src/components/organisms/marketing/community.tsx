"use client";
// U16 Referrals, U17 Testimonials + Feedback (boards marketing/10 RF1–2, 11 TS1–2 FB1).
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { formatDate, formatMoney, formatNumber } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { SITE_URL } from "@/lib/site";
import { useFeedback, useProgramme, useReferrals, useSaveProgramme, useTestimonialAction, useTestimonials } from "@/lib/marketing/insights";
import type { Testimonial } from "@/shared/marketing/types";
import { fill } from "@/content/pages/mkt-common";
import { Tabs } from "@/components/atoms/tabs";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/atoms/field";
import { Dialog } from "@/components/atoms/dialog";
import { Tooltip } from "@/components/atoms/misc";
import { useToast } from "@/components/atoms/toast";
import { Icon } from "@/components/atoms/icon";
import { KpiTile, Panel, PanelError, EmptyPanel, ReasonDialog } from "@/components/molecules/ops/ops";
import { PageHead, Pill, useM } from "@/components/atoms/marketing";
import { Bars, Button, Donut, RangePicker, Skel, Updated, useI, useRange } from "@/components/molecules/marketing/marketing";

// ---------------------------------------------------------------- testimonials
const TS_TABS = ["pending", "published", "rejected"] as const;
export function TestimonialsView() {
  const t = useI();
  const p = useUrlParams();
  const tab = (TS_TABS as readonly string[]).includes(p.get("tab") ?? "") ? p.get("tab")! : "pending";
  const q = useTestimonials(tab);
  const counts = q.data?.counts;
  return (
    <div className="grid gap-5">
      <PageHead title={t.ts.title} sub={t.ts.sub} actions={counts ? <Pill tone="info">{fill(t.ts.pendingN, { n: counts.pending })}</Pill> : null} />
      <Tabs value={tab} onChange={(id) => setUrlParams({ tab: id })} tabs={TS_TABS.map((id) => ({
        id, label: t.ts.tabs[id], count: counts?.[id],
        content: id !== tab ? null : q.isPending ? <div className="grid gap-3">{[0, 1, 2].map((i) => <Skel key={i} className="h-28" />)}</div>
          : q.isError ? <PanelError what={t.ts.title} onRetry={() => q.refetch()} />
          : !q.data.items.length ? <EmptyPanel title={t.ts.empty} />
          : <ul className="grid gap-3 m-stagger">{q.data.items.map((x, i) => <li key={x.id} style={{ ["--i" as string]: i }}><TsCard ts={x} /></li>)}</ul>,
      }))} />
    </div>
  );
}

function Stars({ n }: { n: number }) {
  const t = useI();
  return <span role="img" aria-label={fill(t.ts.stars, { n })} className="text-gold-600">{"★".repeat(n)}<span className="text-border-strong">{"★".repeat(5 - n)}</span></span>;
}

function TsCard({ ts }: { ts: Testimonial }) {
  const t = useI();
  const m = useM();
  const { locale } = useI18n();
  const toast = useToast();
  const act = useTestimonialAction();
  const [dlg, setDlg] = useState<"place" | "reject" | "excerpt" | null>(null);
  const [places, setPlaces] = useState<Testimonial["placements"]>(["home"]);
  const [excerpt, setExcerpt] = useState(ts.excerpt ?? ts.quote);
  const run = (action: Parameters<typeof act.mutate>[0]["action"], body?: unknown, done?: string) =>
    act.mutateAsync({ id: ts.id, action, body }).then(() => { if (done) toast({ title: done, tone: "success" }); setDlg(null); }).catch((e) => toast({ title: errorCopy(e, locale), tone: "danger" }));
  const approve = <Button size="sm" disabled={!ts.consent || act.isPending} onClick={() => setDlg("place")}>{t.ts.approve}</Button>;
  return (
    <article className="grid gap-3 border border-border bg-white p-4 md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-small"><strong>{ts.clientLabel}</strong><Stars n={ts.stars} /><span className="text-fg-subtle">· {ts.serviceSlug} · {formatDate(ts.createdAt, locale)}</span></p>
        <blockquote lang={ts.language} className="mt-2 text-body">“{ts.excerpt ?? ts.quote}”</blockquote>
        <p className="mt-1 text-eyebrow text-fg-subtle">{ts.language.toUpperCase()} · {t.ts.original}</p>
        <p className="mt-2 flex flex-wrap gap-2">
          <Pill motion="m-tone" tone={ts.consent ? "success" : ts.consentRequested ? "warning" : "danger"} icon={ts.consent ? "check" : "x"}>{ts.consent ? t.ts.consentYes : ts.consentRequested ? t.ts.consentAsked : t.ts.consentNo}</Pill>
          {ts.placements.map((pl) => <Pill key={pl} tone="accent">{t.ts.place[pl]}</Pill>)}
          {ts.rejectedReason && <span className="text-small text-fg-muted">{fill(t.ts.reasonL, { r: ts.rejectedReason })}</span>}
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-2 md:justify-end">
        {ts.status === "pending" && <>
          {ts.consent ? approve : <Tooltip content={t.ts.consentNo}>{approve}</Tooltip>}
          {!ts.consent && <Button size="sm" variant="secondary" disabled={ts.consentRequested} onClick={() => run("request-consent", undefined, t.ts.asked)}>{t.ts.requestConsent}</Button>}
          <Button size="sm" variant="outline" onClick={() => setDlg("excerpt")}>{t.ts.editExcerpt}</Button>
          <Button size="sm" variant="outline" onClick={() => setDlg("reject")}>{t.ts.reject}</Button>
        </>}
        {ts.status === "published" && <Button size="sm" variant="outline" onClick={() => run("unpublish", undefined, t.ts.unpublished)}>{t.ts.unpublish}</Button>}
      </div>

      <Dialog open={dlg === "place"} onClose={() => setDlg(null)} title={t.ts.placementT}
        footer={<><Button variant="outline" onClick={() => setDlg(null)}>{m.common.cancel}</Button><Button loading={act.isPending} disabled={!places.length} onClick={() => run("approve", { placements: places }, t.ts.published)}>{t.ts.publish}</Button></>}>
        <div className="grid gap-2">{(["home", "service", "landing"] as const).map((pl) => (
          <Checkbox key={pl} label={t.ts.place[pl]} checked={places.includes(pl)} onChange={(e) => setPlaces(e.target.checked ? [...places, pl] : places.filter((x) => x !== pl))} />
        ))}</div>
        <p className="mt-4 text-eyebrow text-fg-subtle">{t.ts.preview}</p>
        <figure className="mt-1 border-l-3 border-rule bg-bg-tint p-5">
          <blockquote lang={ts.language} className="text-lead">“{ts.excerpt ?? ts.quote}”</blockquote>
          <figcaption className="mt-2 flex items-center gap-2 text-small"><Stars n={ts.stars} /> {ts.clientLabel}</figcaption>
        </figure>
      </Dialog>
      <Dialog open={dlg === "excerpt"} onClose={() => setDlg(null)} title={t.ts.excerptT} description={t.ts.excerptB}
        footer={<><Button variant="outline" onClick={() => setDlg(null)}>{m.common.cancel}</Button><Button loading={act.isPending} onClick={() => run("excerpt", { excerpt }, t.ts.excerpted)}>{t.ts.save}</Button></>}>
        <Field label={t.ts.excerptL}>{({ id }) => <Textarea id={id} lang={ts.language} rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />}</Field>
      </Dialog>
      <ReasonDialog open={dlg === "reject"} onClose={() => setDlg(null)} title={t.ts.rejectT} destructive confirmLabel={t.ts.reject}
        options={Object.entries(t.ts.rejectOpts).map(([value, label]) => ({ value, label }))}
        onConfirm={async ({ reason, note }) => { await run("reject", { reason: note || t.ts.rejectOpts[reason] || reason }, t.ts.rejected); }} />
    </article>
  );
}

// ---------------------------------------------------------------- feedback analytics
export function FeedbackView() {
  const t = useI();
  const { locale } = useI18n();
  const range = useRange("90d");
  const p = useUrlParams();
  const service = p.get("service") ?? "";
  const q = useFeedback(range, service || undefined);
  const d = q.data;
  return (
    <div className="grid gap-5">
      <PageHead title={t.fb.title} sub={t.fb.sub} />
      <div className="flex flex-wrap items-center gap-3">
        <RangePicker value={range} />
        <label className="flex items-center gap-2 text-small"><span className="sr-only">{t.fb.allServices}</span>
          <Select value={service} onChange={(e) => setUrlParams({ service: e.target.value })} className="h-9 w-auto">
            <option value="">{t.fb.allServices}</option>{d?.services.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </label>
      </div>
      {q.isPending ? <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <Skel key={i} className="h-32" />)}</div>
        : q.isError ? <PanelError what={t.fb.title} onRetry={() => q.refetch()} />
        : !d?.total ? <EmptyPanel title={t.fb.none} />
        : (
          <div className="grid gap-4 m-rise">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <KpiTile label={t.fb.avg} value={d.avg == null ? "—" : `${d.avg} ★`} icon="sparkle" />
              <KpiTile label={t.fb.nps} value={d.nps == null ? "—" : d.nps} note={d.nps == null ? fill(t.fb.npsLow, { n: d.npsMin }) : undefined} />
              <KpiTile label={t.fb.total} value={formatNumber(d.total, locale)} />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title={t.fb.byService}><Bars max={5} format={(n) => n.toFixed(1)} items={d.byService.filter((s) => s.avg != null).map((s) => ({ label: s.service, value: s.avg! }))} /></Panel>
              <Panel title={t.fb.themes}><Donut total={d.themes.reduce((a, x) => a + x.n, 0)} centre={formatNumber(d.total, locale)} items={d.themes.slice(0, 4).map((x) => ({ label: t.fb.theme[x.tag] ?? x.tag, value: x.n }))} /></Panel>
              <Panel title={t.fb.distribution}><Bars items={d.distribution.map((x) => ({ label: "★".repeat(x.stars), value: x.n }))} /></Panel>
            </div>
            <Panel title={t.fb.recent}>
              {d.recent.length ? <ul className="grid gap-2 md:grid-cols-2">{d.recent.map((r) => (
                <li key={r.id} className="bg-bg-subtle p-3"><blockquote lang={r.language} className="text-small">“{r.excerpt ?? r.quote}”</blockquote><p className="mt-1 text-eyebrow text-fg-subtle">{r.clientLabel}</p></li>
              ))}</ul> : <p className="text-small text-fg-muted">{t.ts.empty}</p>}
            </Panel>
            <Updated at={d.generatedAt} onRefresh={() => q.refetch()} />
          </div>
        )}
    </div>
  );
}

// ---------------------------------------------------------------- referrals
const RF_TABS = ["programme", "referrers", "referrals"] as const;
export function ReferralsView() {
  const t = useI();
  const p = useUrlParams();
  const tab = (RF_TABS as readonly string[]).includes(p.get("tab") ?? "") ? p.get("tab")! : "programme";
  return (
    <div className="grid gap-5">
      <PageHead title={t.rf.title} sub={t.rf.sub} />
      <Tabs value={tab} onChange={(id) => setUrlParams({ tab: id })} tabs={RF_TABS.map((id) => ({
        id, label: t.rf.tabs[id], content: id !== tab ? null : id === "programme" ? <Programme /> : <ReferralTables which={id} />,
      }))} />
    </div>
  );
}

function Programme() {
  const t = useI();
  const m = useM();
  const { locale } = useI18n();
  const toast = useToast();
  const q = useProgramme();
  const refs = useReferrals();
  const save = useSaveProgramme();
  const [draft, setDraft] = useState<{ reward?: string; active?: boolean; channels?: string[] }>({});
  if (q.isPending) return <Skel className="h-64" />;
  if (q.isError) return <PanelError what={t.rf.title} onRetry={() => q.refetch()} />;
  const v = { reward: draft.reward ?? String(q.data.reward), active: draft.active ?? q.data.active, channels: draft.channels ?? q.data.channels };
  const reward = Number(v.reward);
  const money = (n: number) => formatMoney(n, "RWF", locale);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Panel title={t.rf.tabs.programme}>
        <div className="grid gap-4">
          <Switch label={t.rf.active} checked={v.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
          <Field label={t.rf.reward} hint={t.rf.payout} error={Number.isInteger(reward) && reward >= 0 ? undefined : m.states.error}>
            {({ id }) => <Input id={id} inputMode="numeric" value={v.reward} onChange={(e) => setDraft({ ...draft, reward: e.target.value.replace(/\D/g, "") })} />}
          </Field>
          <Field label={t.rf.eligibility}>{({ id }) => <Input id={id} value={t.rf.eligible} readOnly />}</Field>
          <fieldset className="grid gap-2"><legend className="mb-1 text-small font-medium">{t.rf.channels}</legend>
            {(["client", "agent"] as const).map((c) => <Checkbox key={c} label={t.rf[c]} checked={v.channels.includes(c)} onChange={(e) => setDraft({ ...draft, channels: e.target.checked ? [...v.channels, c] : v.channels.filter((x) => x !== c) })} />)}
          </fieldset>
          <Button className="w-fit" loading={save.isPending} disabled={!Object.keys(draft).length || !Number.isInteger(reward)}
            onClick={() => save.mutate({ active: v.active, reward, channels: v.channels }, { onSuccess: () => { setDraft({}); toast({ title: t.rf.saved, tone: "success" }); }, onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }) })}>{t.rf.save}</Button>
        </div>
      </Panel>
      <div className="grid content-start gap-4">
        <Panel title={t.rf.fraud}>
          {refs.data && <p className="mb-2 flex flex-wrap gap-2"><Pill tone="danger">{fill(t.rf.selfBlocked, { n: refs.data.fraud.selfBlocked })}</Pill><Pill tone="neutral">{fill(t.rf.ineligible, { n: refs.data.fraud.ineligible })}</Pill></p>}
          <ul className="grid gap-1 text-small">{t.rf.checks.map((c) => <li key={c} className="flex gap-2"><Icon name="check" size={16} className="text-success" aria-hidden />{c}</li>)}</ul>
          {refs.data && <p className="mt-3 text-small font-medium">{fill(t.rf.due, { amount: money(refs.data.totalDue) })}</p>}
        </Panel>
        <Panel title={t.rf.previewT}>
          <div className="border-l-3 border-gold-400 bg-gold-50 p-5 text-fg">
            <Icon name="users" size={22} aria-hidden />
            <p className="mt-2 text-body">{fill(t.rf.previewB, { amount: money(reward || 0) })}</p>
            <p className="mt-3 truncate bg-white px-3 py-2 text-small tabular">{SITE_URL}/r/REF-ALINE-7K2</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ReferralTables({ which }: { which: "referrers" | "referrals" }) {
  const t = useI();
  const { locale } = useI18n();
  const toast = useToast();
  const q = useReferrals();
  if (q.isPending) return <Skel className="h-64" />;
  if (q.isError) return <PanelError what={t.rf.title} onRetry={() => q.refetch()} />;
  const c = t.rf.col;
  const money = (n: number) => formatMoney(n, "RWF", locale);
  const copy = (code: string) => navigator.clipboard?.writeText(`${SITE_URL}/r/${code}`).then(() => toast({ title: t.rf.copied, tone: "success" }));
  const rows = which === "referrers" ? q.data.referrers : q.data.referrals;
  if (!rows.length) return <EmptyPanel title={t.rf.empty} />;
  return (
    <div className="overflow-x-auto border border-border bg-white">
      {which === "referrers" ? (
        <table className="w-full min-w-[40rem] text-left text-small">
          <thead className="bg-ink-100 text-ink-700"><tr>{[c.name, c.kind, c.code, c.referred, c.paid, c.due].map((h) => <th key={h} scope="col" className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{q.data.referrers.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <th scope="row" className="p-3 font-medium">{r.name}</th><td className="p-3">{t.rf[r.kind]}</td>
              <td className="p-3"><button type="button" onClick={() => copy(r.code)} className="inline-flex items-center gap-1 tabular hover:underline" aria-label={`${t.rf.copy}: ${r.code}`}>{r.code}<Icon name="file" size={14} aria-hidden /></button></td>
              <td className="p-3 tabular">{r.referred}</td><td className="p-3 tabular">{r.paid}</td><td className="p-3 tabular">{money(r.rewardDue)}</td>
            </tr>
          ))}</tbody>
        </table>
      ) : (
        <table className="w-full min-w-[36rem] text-left text-small">
          <thead className="bg-ink-100 text-ink-700"><tr>{[c.referee, c.code, c.state, c.at].map((h) => <th key={h} scope="col" className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{q.data.referrals.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <th scope="row" className="p-3 font-medium">{r.refereeLabel}</th><td className="p-3 tabular">{r.code}</td>
              <td className="p-3"><Pill tone={r.state === "paid" || r.state === "rewarded" ? "success" : r.state === "rejected_self" ? "danger" : r.state === "ineligible" ? "neutral" : "info"}>{t.rf.state[r.state]}</Pill></td>
              <td className="p-3 tabular">{formatDate(r.at, locale)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
