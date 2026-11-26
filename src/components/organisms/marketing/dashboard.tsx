"use client";
// U1 Dashboard (board marketing/02 SH1–3, PS1). One /summary call per range so every number agrees.
import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDateTime, formatMoney, formatNumber, formatRelative } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { useMktShell, mktKeys } from "@/lib/marketing/api";
import { useActiveAutomations, useSummary, useToggleAutomation, type Kpi } from "@/lib/marketing/insights";
import { fill } from "@/content/pages/mkt-common";
import { Dialog } from "@/components/atoms/dialog";
import { Switch } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { Icon } from "@/components/atoms/icon";
import { ButtonLink } from "@/components/atoms/button";
import { KpiTile, Panel, PanelError, EmptyPanel } from "@/components/molecules/ops/ops";
import { useNow } from "@/components/atoms/agent";
import { CampaignStatusChip, PageHead, SourceBadge, useM } from "@/components/atoms/marketing";
import { Bars, Button, FunnelChart, RangePicker, Skel, Updated, useI, useRange } from "@/components/molecules/marketing/marketing";

function greeting(now: number | null) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Kigali" }).format(now ?? 0));
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}
const delta = (k: Kpi) => (k.prev ? Math.round(((k.value - k.prev) / k.prev) * 1000) / 10 : null);

export function DashboardView() {
  const t = useI();
  const m = useM();
  const { locale } = useI18n();
  const L = (p: string) => localHref(locale, p);
  const now = useNow();
  const range = useRange("7d");
  const q = useSummary(range);
  const me = useMktShell().data?.me;
  const s = q.data;
  const money = (n: number) => formatMoney(n, "RWF", locale);
  const name = me?.name.split(" ")[0] ?? "";

  const tile = (label: string, k: Kpi | null, fmt: (n: number) => string, href: string, offNote?: string) => {
    if (!k) return <KpiTile label={label} value="" note={offNote} tone="warning" icon="globe" />;
    const d = delta(k);
    return <KpiTile label={label} value={fmt(k.value)} href={L(href)} spark={k.spark.length ? k.spark : undefined}
      note={d == null ? t.dash.kpi.noPrev : fill(t.dash.kpi.vsPrev, { d: `${d > 0 ? "+" : ""}${d}%` })} tone={d != null && d > 0 ? "attention" : "neutral"} />;
  };

  return (
    <div className="grid gap-6">
      <PageHead title={me ? fill(t.greet[greeting(now)], { name }) : t.dash.title} sub={t.dash.sub}
        actions={<><RangePicker value={range} /><ButtonLink data-guide="marketing-new-campaign" href={L("/marketing/campaigns/new")} size="sm" dots>{t.dash.newCampaign}</ButtonLink></>} />

      {q.isPending ? <Skel className="h-12" /> : q.isError ? <PanelError what={t.dash.title} onRetry={() => q.refetch()} /> : s && (
        <>
          <Attention a={s.attention} />
          {s.firstWeek && <FirstWeek />}
        </>
      )}

      <section data-guide="marketing-kpis" aria-label={t.dash.title} className="grid grid-cols-2 gap-3 lg:grid-cols-5 m-stagger">
        {q.isPending || !s ? [0, 1, 2, 3, 4].map((i) => <Skel key={i} className="h-32" />) : (
          <>
            {tile(t.dash.kpi.visitors, s.kpis.visitors, (n) => formatNumber(n, locale), "/marketing/reports?tab=traffic", t.dash.kpi.trafficOff)}
            {tile(t.dash.kpi.leads, s.kpis.leads, (n) => formatNumber(n, locale), "/marketing/leads")}
            {tile(t.dash.kpi.consultations, s.kpis.consultations, (n) => formatNumber(n, locale), "/marketing/reports?tab=funnel")}
            {tile(t.dash.kpi.paidClients, s.kpis.paidClients, (n) => formatNumber(n, locale), "/marketing/reports?tab=funnel")}
            {tile(t.dash.kpi.revenue, s.kpis.revenue, money, "/marketing/reports?tab=campaigns")}
          </>
        )}
      </section>

      {s && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={t.dash.funnel}><FunnelChart rows={s.funnel} /></Panel>
          <Panel title={t.dash.bySource}>
            {s.bySource.every((b) => !b.leads) ? <EmptyPanel compact title={t.rep.empty} /> :
              <Bars items={s.bySource.map((b) => ({ label: m.source[b.source] ?? b.source, value: b.leads }))} />}
          </Panel>
          <TopPanel pages={s.topPages} services={s.topServices} ga4={s.ga4Connected} />
          <Panel title={t.dash.roi} action={<Link className="text-small text-link" href={L("/marketing/reports?tab=campaigns")}>{t.rep.title}</Link>}>
            {!s.campaigns.length ? <EmptyPanel compact title={t.rep.empty} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-small">
                  <thead className="text-fg-subtle"><tr><th className="py-2">{t.dash.roiCol.campaign}</th><th>{t.dash.roiCol.cost}</th><th>{t.dash.roiCol.revenue}</th><th>{t.dash.roiCol.roi}</th></tr></thead>
                  <tbody>{s.campaigns.slice(0, 5).map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="max-w-[12rem] truncate py-2" title={c.name}><Link href={L(`/marketing/campaigns/${c.id}`)} className="hover:underline">{c.name}</Link></td>
                      <td className="tabular">{money(c.cost)}</td><td className="tabular">{money(c.revenue)}</td>
                      <td className={cx("tabular", c.roi != null && c.roi < 0 && "text-danger")}>{c.roi == null ? "" : `${c.roi}%`}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Panel>
          <Automations />
          <Panel title={t.dash.recent}>
            <ul className="grid gap-2">{s.recent.map((r) => (
              <li key={r.id}><Link href={L(r.href)} className="flex items-center gap-3 p-2 hover:bg-navy-50">
                <Icon name="user" size={16} aria-hidden className="text-link" />
                <span className="min-w-0 flex-1 truncate text-small">{r.text}</span>
                <SourceBadge touch={{ source: r.sub, medium: "", landing: "", at: r.at }} />
                <span className="text-eyebrow text-fg-subtle tabular">{formatRelative(r.at, locale, now ?? Date.parse(r.at))}</span>
              </Link></li>
            ))}</ul>
          </Panel>
          <Panel title={t.dash.next}>
            {s.next ? (
              <Link href={L(s.next.href)} className="flex flex-wrap items-center gap-3 bg-bg-tint p-4 hover:bg-sky-100">
                <Icon name="calendar" size={20} aria-hidden />
                <span className="min-w-0 flex-1"><span className="block text-label-lg">{s.next.label}</span>{s.next.at && <span className="text-small text-fg-muted">{formatDateTime(s.next.at, locale)}</span>}</span>
                <CampaignStatusChip status={s.next.status as "scheduled"} />
              </Link>
            ) : <EmptyPanel compact title={t.dash.nextNone} action={<ButtonLink size="sm" href={L("/marketing/campaigns/new")}>{t.dash.newCampaign}</ButtonLink>} />}
          </Panel>
        </div>
      )}
      {s && <div className="flex justify-between gap-3"><Updated at={s.generatedAt} onRefresh={() => q.refetch()} /></div>}
    </div>
  );
}

function Attention({ a }: { a: { newLeads: number; awaitingApproval: number; brokenLinks: number; pausedBudget: number } }) {
  const t = useI();
  const { locale } = useI18n();
  const items = [
    [a.newLeads, t.dash.attention.newLeads, "/marketing/leads?stage=new"],
    [a.awaitingApproval, t.dash.attention.awaitingApproval, "/marketing/campaigns?status=pending_approval"],
    [a.pausedBudget, t.dash.attention.pausedBudget, "/marketing/campaigns?status=paused"],
    [a.brokenLinks, t.dash.attention.brokenLinks, "/marketing/seo?tab=health"],
  ].filter(([n]) => (n as number) > 0) as [number, string, string][];
  return (
    <nav aria-label={t.dash.title} className="flex flex-wrap items-center gap-2 theme-dark border border-border bg-bg p-3 text-fg m-rise">
      {items.length ? items.map(([n, label, href]) => (
        <Link key={href} href={localHref(locale, href)} className="inline-flex h-9 items-center gap-2 border border-border px-3 text-small text-fg hover:border-rule m-press">
          <span className="size-2 rounded-full bg-gold-400" aria-hidden />{fill(label, { n })}
        </Link>
      )) : <p className="px-2 text-small">{t.dash.attention.none}</p>}
    </nav>
  );
}

function FirstWeek() {
  const t = useI();
  const { locale } = useI18n();
  return (
    <section className="grid gap-4 border border-dashed border-border-strong bg-white p-6 md:grid-cols-[auto_1fr] m-rise">
      <svg viewBox="0 0 64 64" className="size-16 text-link" aria-hidden><path d="M32 6v52M6 32h52M13 13l38 38M51 13 13 51" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg>
      <div>
        <h2 className="text-h3">{t.dash.firstWeekT}</h2>
        <p className="text-body text-fg-muted">{t.dash.firstWeekB}</p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">{t.dash.checklist.map((c, i) => (
          <li key={c}><Link href={localHref(locale, t.dash.checklistHref[i])} className="flex items-center gap-2 border border-border p-3 text-small hover:border-navy-300"><span className="flex size-6 items-center justify-center rounded-full bg-gold-400 text-eyebrow text-on-gold">{i + 1}</span>{c}</Link></li>
        ))}</ol>
      </div>
    </section>
  );
}

function TopPanel({ pages, services, ga4 }: { pages: { path: string; views: number }[]; services: { slug: string; leads: number }[]; ga4: boolean }) {
  const t = useI();
  const [tab, setTab] = useState<"pages" | "services">(ga4 ? "pages" : "services");
  return (
    <Panel title={t.dash.top} action={
      <div role="tablist" className="flex bg-ink-100 p-0.5">{(["pages", "services"] as const).map((k) => (
        <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={cx("h-8 px-3 text-small", tab === k && "bg-white shadow-sm")}>{t.dash[k]}</button>
      ))}</div>}>
      {tab === "pages" ? (ga4 && pages.length ? <Bars items={pages.map((p) => ({ label: p.path, value: p.views }))} /> : <EmptyPanel compact title={t.dash.kpi.trafficOff} />)
        : <Bars items={services.map((s) => ({ label: s.slug, value: s.leads }))} />}
    </Panel>
  );
}

function Automations() {
  const t = useI();
  const { locale } = useI18n();
  const toast = useToast();
  const q = useActiveAutomations();
  const toggle = useToggleAutomation();
  const [confirm, setConfirm] = useState<{ id: string; waiting: number } | null>(null);
  const run = (id: string) => toggle.mutate(id, { onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }), onSettled: () => setConfirm(null) });
  const rows = (q.data?.items ?? []).filter((r) => !r.system);
  return (
    <Panel title={t.dash.automations}>
      {q.isPending ? <Skel className="h-24" /> : q.isError ? <PanelError what={t.dash.automationsError} onRetry={() => q.refetch()} /> : !rows.length ? <EmptyPanel compact title={t.dash.noAutomations} /> : (
        <ul className="grid gap-2">{rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 border border-border p-3">
            <span className="min-w-0 flex-1"><span className="block truncate text-small font-medium">{r.name}</span><span className="text-eyebrow text-fg-subtle tabular">{fill(t.dash.leadsN, { n: r.enrolled })}</span></span>
            <Switch label={<span className="sr-only">{r.name}</span>} checked={r.active} disabled={toggle.isPending}
              onChange={() => (r.active && (r.waiting ?? r.enrolled - r.converted - r.exited) > 0 ? setConfirm({ id: r.id, waiting: r.waiting ?? r.enrolled - r.converted - r.exited }) : run(r.id))} />
          </li>
        ))}</ul>
      )}
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title={t.dash.turnOffT}
        footer={<Button variant="primary" loading={toggle.isPending} onClick={() => confirm && run(confirm.id)}>{t.dash.turnOff}</Button>}>
        <p className="text-body">{fill(t.dash.turnOffB, { n: confirm?.waiting ?? 0 })}</p>
      </Dialog>
    </Panel>
  );
}

