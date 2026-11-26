"use client";
// U13 Campaigns list + detail (board marketing/09 CA2–CA4, journey J2): status timeline, approval with SoD, sending progress
// with polite live region (10 % steps), pause/resume/cancel, budget-cap and template-rejected banners, results, recipients.
import { useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { cx, formatDateTime } from "@/shared/format";
import { api, newIdempotencyKey, unwrap } from "@/lib/api/client";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { useCampaign, useCampaigns, useCmpMutation, useRecipients, exportRecipients, type CampaignView } from "@/lib/marketing/campaigns";
import { downloadCsv } from "@/lib/marketing/export";
import { errorCopy } from "@/lib/api/error-copy";
import { MKT_POLICY } from "@/shared/policy";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Panel, ReasonDialog, SavedViewTabs } from "@/components/molecules/ops/ops";
import { useOnline } from "@/components/atoms/hooks";
import { CampaignStatusChip, ChannelIcon, PageHead, StaffName, useM } from "@/components/atoms/marketing";
import { useStaff } from "@/lib/marketing/api";
import { BudgetMeter, ConsentExclusionCard, CostEstimate, ListSkeleton, ProgressRing, QueryState, fill, useC, useErr, useNum } from "@/components/molecules/marketing/marketing";
import { useMoney } from "@/components/atoms/hooks";
import { hdr } from "@/lib/marketing/api";

const VIEWS = ["all", "draft", "pending_approval", "scheduled", "sending", "sent", "paused", "failed"] as const;

export function CampaignsView() {
  const c = useC();
  const m = useMoney();
  const n = useNum();
  const { locale } = useI18n();
  const mc = useM();
  const p = useUrlParams();
  const status = p.get("status") ?? "all";
  const q = useCampaigns(status === "all" ? undefined : status);
  const items = q.data?.items ?? [];
  const b = q.data?.budget;
  return (
    <>
      <PageHead title={c.list.title} sub={c.list.sub} actions={<ButtonLink data-guide="marketing-new-campaign" href={localHref(locale, "/marketing/campaigns/new")} size="sm"><Icon name="plus" size={16} aria-hidden />{c.wiz.title}</ButtonLink>} />
      {b && <p className="mb-4 text-small text-fg-muted">{c.list.budget}: <strong className="tabular">{fill(c.list.budgetOf, { spent: m(b.spent), cap: m(b.cap) })}</strong></p>}
      <SavedViewTabs views={VIEWS.map((v) => ({ key: v, label: v === "all" ? c.seq.tabs.all : mc.campaign[v] }))} active={status} onChange={(k) => setUrlParams({ status: k === "all" ? null : k })} />
      <div className="mt-4">
        <QueryState q={q} what={c.list.title} empty={!items.length && c.list.empty} emptyAction={<ButtonLink href={localHref(locale, "/marketing/campaigns/new")} size="sm">{c.wiz.title}</ButtonLink>}>
          <ul data-guide="marketing-campaign-list" className="grid gap-2 m-stagger">
            {items.map((x, i) => (
              <li key={x.id} style={{ ["--i" as string]: i }}>
                <Link href={localHref(locale, x.status === "draft" ? `/marketing/campaigns/new?id=${x.id}&step=audience` : `/marketing/campaigns/${x.id}`)} className="grid gap-2 border border-border bg-white p-4 hover:border-navy-300 sm:grid-cols-[1fr_9rem_8rem_7rem] sm:items-center">
                  <span className="min-w-0"><span className="block truncate text-label-lg">{x.name}</span><span className="flex items-center gap-2 text-eyebrow text-fg-subtle"><ChannelIcon channel={x.channel} label />· {x.segmentName} · {x.id}</span></span>
                  <span><CampaignStatusChip status={x.status} /></span>
                  <span className="text-small tabular">{n(x.stats.sent)} <span className="text-fg-subtle">{c.list.sent}</span></span>
                  <span className="text-small tabular sm:text-right">{m(x.estimate)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </QueryState>
      </div>
    </>
  );
}

export function CampaignDetail({ id }: { id: string }) {
  const c = useC();
  const q = useCampaign(id);
  const { locale } = useI18n();
  const p = useUrlParams();
  const tab = p.get("tab") ?? "overview";
  if (q.isPending) return <ListSkeleton rows={6} />;
  if (!q.data) return <QueryState q={q} what={c.list.name}>{null}</QueryState>;
  const x = q.data;
  return (
    <>
      <PageHead eyebrow={<Link href={localHref(locale, "/marketing/campaigns")} className="hover:underline">{c.list.title}</Link>} title={x.name}
        sub={<span className="flex flex-wrap items-center gap-2"><CampaignStatusChip status={x.status} /><ChannelIcon channel={x.channel} label /> · {x.segmentName} · {x.id}</span>} />
      <SavedViewTabs views={(["overview", "results", "recipients"] as const).map((k) => ({ key: k, label: c.det.tabs[k] }))} active={tab} onChange={(k) => setUrlParams({ tab: k === "overview" ? null : k })} />
      <div className="mt-5">{tab === "results" ? <Results x={x} /> : tab === "recipients" ? <Recipients id={x.id} /> : <Overview x={x} />}</div>
    </>
  );
}

function Overview({ x }: { x: CampaignView }) {
  const c = useC();
  const err = useErr();
  const toast = useToast();
  const m = useMoney();
  const n = useNum();
  const { locale } = useI18n();
  const { user } = useSession();
  const online = useOnline();
  const staff = useStaff().data?.items ?? [];
  const [key] = useState(newIdempotencyKey);
  const [reject, setReject] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const mc = useM();
  const act = useCmpMutation((v: { action: string; body?: Record<string, unknown> }) => unwrap(api.POST("/api/admin/crm/campaigns/{id}/{action}", { params: { path: { id: x.id, action: v.action } }, body: v.body ?? {}, headers: hdr({ idempotencyKey: `${key}-${v.action}-${x.version}` }) })));
  const run = (action: string, body?: Record<string, unknown>) => act.mutate({ action, body }, { onError: (e) => toast({ title: err(e), tone: "danger" }) });
  const exec = !!user?.roles.includes("staff:executive");
  const me = exec ? "st-alice" : user?.roles.includes("staff:marketing") ? "st-grace-m" : null;
  const self = x.createdBy === me;
  const pct = x.stats.queued ? Math.round((x.stats.sent / x.stats.queued) * 100) : 0;
  const pct10 = Math.floor(pct / 10) * 10;
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
      <div className="grid content-start gap-4">
        {x.rejectedReason && x.status === "draft" && <Banner tone="danger">{fill(c.wiz.rejected, { r: x.rejectedReason })}</Banner>}
        {x.status === "paused" && x.pausedReason === "budget_cap" && (
          <Banner tone="warning" action={<Button size="sm" disabled={!online} loading={act.isPending} onClick={() => run("resume", { raiseCap: true })}>{c.det.raiseResume}</Button>}>{fill(c.det.budgetCap, { cap: m(MKT_POLICY.budgetCap) })}</Banner>
        )}
        {x.status === "failed" && x.failedReason === "template_rejected" && (
          <Banner tone="danger" action={<ButtonLink size="sm" href={localHref(locale, "/marketing/templates?status=rejected")}>{c.det.resubmit}</ButtonLink>}>{c.det.templateRejected}</Banner>
        )}
        {x.consentDelta > 0 && <Banner tone="info">{fill(c.det.consentDelta, { n: x.consentDelta })}</Banner>}

        {(x.status === "sending" || x.status === "sent" || x.status === "paused") && (
          <Panel title={c.det.progress}>
            <div className="flex flex-wrap items-center gap-5">
              <ProgressRing pct={pct} label={`${pct}%`} />
              <div className="grid gap-1">
                <p className="text-h3 tabular">{pct}%</p>
                <p className="text-small text-fg-muted tabular">{fill(c.det.sentOf, { n: n(x.stats.sent), m: n(x.stats.queued) })}</p>
                <p className="sr-only" aria-live="polite">{`${pct10}%`}</p>
                {!online && x.status === "sending" && <p role="status" className="text-small text-warning">{c.det.reconnecting}</p>}
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                {x.status === "sending" && <Button size="sm" variant="secondary" disabled={!online} onClick={() => run("pause")}>{c.det.pause}</Button>}
                {x.status === "paused" && x.pausedReason === "user" && <Button size="sm" disabled={!online} onClick={() => run("resume")}>{c.det.resume}</Button>}
              </div>
            </div>
          </Panel>
        )}

        <Panel title={c.det.timeline}>
          <ol className="grid gap-3">
            {x.timeline.map((t, i) => (
              <li key={i} className="grid grid-cols-[1.25rem_1fr] gap-3 text-small">
                <span className={cx("mt-1 size-3 rounded-full", i === x.timeline.length - 1 ? "bg-gold-400 ring-2 ring-navy-700" : "bg-navy-700")} aria-hidden />
                <span><strong>{c.det.tabs[t.status] ?? t.status}</strong>{t.note ? ` · ${t.note}` : ""}<span className="block text-eyebrow text-fg-subtle">{formatDateTime(t.at, locale)}{t.by ? ` · ${staff.find((s) => s.id === t.by)?.name ?? ""}` : ""}</span></span>
              </li>
            ))}
          </ol>
        </Panel>

        <div className="flex flex-wrap gap-2">
          {(x.status === "approved" || x.status === "scheduled") && <Button disabled={!online} loading={act.isPending} onClick={() => run("send")}>{c.det.send}</Button>}
          {x.status === "failed" && x.stats.failed > 0 && <Button variant="secondary" onClick={() => run("retry-failed")}>{c.det.retry}</Button>}
          {!["sent", "cancelled"].includes(x.status) && <Button variant="outline" onClick={() => setConfirm(true)}>{c.det.cancel}</Button>}
        </div>
      </div>

      <aside className="grid content-start gap-4">
        <Panel title={c.card.approval}>
          {x.approvedByName ? <p className="text-small">{fill(c.det.approvedBy, { who: x.approvedByName, d: x.approvedAt ? formatDateTime(x.approvedAt, locale) : "" })}</p>
            : x.status === "pending_approval" ? (
              <div className="grid gap-3">
                <p className="text-small">{fill(c.det.awaiting, { who: x.approverName ?? "" })}</p>
                {self ? <p className="bg-bg-subtle p-3 text-small text-fg-muted">{c.det.selfBlocked}</p> : null}
                <div className="flex gap-2">
                  <Button data-guide="marketing-campaign-approve" size="sm" disabled={self || !online || !me} title={self ? c.det.selfBlocked : !me ? c.det.roleBlocked : undefined} loading={act.isPending} onClick={() => run("approve")}>{c.det.approve}</Button>
                  <Button size="sm" variant="outline" disabled={self || !online || !me} onClick={() => setReject(true)}>{c.det.reject}</Button>
                </div>
              </div>
            ) : <p className="text-small text-fg-muted">{x.approvalNeeded ? c.wiz.approvalNeeded : c.wiz.noApproval}</p>}
          <p className="mt-2 text-eyebrow text-fg-subtle"><StaffName staff={staff.find((s) => s.id === x.createdBy)} /></p>
        </Panel>
        <ConsentExclusionCard count={x.segmentSnapshot?.count ?? x.live.count} eligible={x.segmentSnapshot?.eligible ?? x.live.eligible} excluded={x.segmentSnapshot?.excluded ?? x.live.excluded} />
        <CostEstimate amount={x.estimate} unit={x.unitCost} />
        <BudgetMeter budget={x.budget} />
      </aside>

      <ReasonDialog open={reject} onClose={() => setReject(false)} title={c.det.rejectTitle} options={[]} noteLabel={c.det.rejectReason} confirmLabel={c.det.reject} destructive audited
        onConfirm={async ({ note, reason }) => { await act.mutateAsync({ action: "reject", body: { reason: note || reason } }); setReject(false); }} />
      <Dialog open={confirm} onClose={() => setConfirm(false)} title={c.det.cancel} footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>{mc.common.close}</Button><Button variant="danger" onClick={() => { run("cancel"); setConfirm(false); }}>{c.det.cancel}</Button></>}>
        <p className="text-body">{c.det.cancelConfirm}</p>
      </Dialog>
    </div>
  );
}

function Banner({ tone, children, action }: { tone: "danger" | "warning" | "info"; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div role="status" className={cx("flex flex-wrap items-center gap-3 px-4 py-3 text-small m-rise", tone === "danger" ? "bg-danger-bg text-danger" : tone === "warning" ? "bg-warning-bg text-warning" : "bg-info-bg text-info")}>
      <Icon name={tone === "info" ? "refresh" : "shield"} size={16} aria-hidden /><p className="min-w-0 flex-1">{children}</p>{action}
    </div>
  );
}

const METRICS = ["delivered", "opened", "read", "clicked", "replied", "leads", "converted", "revenue", "failed", "unsubscribed"] as const;
function Results({ x }: { x: CampaignView }) {
  const c = useC();
  const n = useNum();
  const m = useMoney();
  const err = useErr();
  const toast = useToast();
  const retry = useCmpMutation(() => unwrap(api.POST("/api/admin/crm/campaigns/{id}/{action}", { params: { path: { id: x.id, action: "retry-failed" } }, body: {} })));
  if (!x.stats.sent) return <p className="border border-dashed border-border-strong p-8 text-center text-fg-muted">{c.det.noResults}</p>;
  const shown = METRICS.filter((k) => !(k === "opened" && x.channel !== "email") && !(k === "read" && x.channel !== "whatsapp"));
  const max = x.stats.sent || 1;
  return (
    <div className="grid gap-5">
      <ul className="grid gap-2">
        {shown.map((k) => (
          <li key={k} className="grid grid-cols-[10rem_1fr_6rem] items-center gap-3 text-small">
            <span>{c.det.m[k]}</span>
            <span className="h-3 overflow-hidden bg-ink-100"><span className={cx("block h-full m-grow", k === "failed" ? "bg-danger" : "bg-navy-700")} style={{ width: `${k === "revenue" ? 0 : Math.min(100, (x.stats[k] / max) * 100)}%` }} /></span>
            <span className="text-right tabular">{k === "revenue" ? m(x.stats.revenue) : n(x.stats[k])}</span>
          </li>
        ))}
      </ul>
      <Panel title={c.det.byLang}>
        <ul className="grid gap-1 text-small">{(["rw", "en", "fr"] as const).map((l) => <li key={l} className="flex justify-between"><span>{c.common.lang[l]}</span><span className="tabular">{n(x.live.languages[l])}</span></li>)}</ul>
      </Panel>
      {x.stats.failed > 0 && <Button variant="secondary" loading={retry.isPending} onClick={() => retry.mutate(undefined, { onError: (e) => toast({ title: err(e), tone: "danger" }) })}>{c.det.retry} ({n(x.stats.failed)})</Button>}
    </div>
  );
}

function Recipients({ id }: { id: string }) {
  const c = useC();
  const { locale } = useI18n();
  const toast = useToast();
  const [state, setState] = useState("");
  const [exp, setExp] = useState(false);
  const q = useRecipients(id, state || undefined);
  const items = q.data?.items ?? [];
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {["", "delivered", "read", "opened", "failed"].map((s) => (
          <button key={s} type="button" aria-pressed={state === s} onClick={() => setState(s)} className="h-8 border border-border px-3 text-small aria-pressed:bg-secondary aria-pressed:text-on-secondary m-press">{s ? c.det.rState[s] : c.seq.tabs.all}</button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => setExp(true)}>{c.det.export}</Button>
      </div>
      <QueryState q={q} what={c.det.tabs.recipients} empty={!items.length && c.det.noResults}>
        <div className="overflow-x-auto border border-border bg-white">
          <table className="w-full min-w-[32rem] text-left text-small">
            <thead className="bg-ink-100 text-ink-700"><tr><th className="p-3">{c.seq.person}</th><th className="p-3">{c.tpl.lang}</th><th className="p-3">{c.seq.state}</th></tr></thead>
            <tbody>{items.map((r) => (
              <tr key={r.id} className="border-t border-border"><td className="p-3"><span className="block">{r.name}</span><span className="text-eyebrow text-fg-subtle tabular">{r.phone}</span></td><td className="p-3 uppercase">{r.language}</td><td className="p-3">{c.det.rState[r.state] ?? r.state}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </QueryState>
      <ReasonDialog open={exp} onClose={() => setExp(false)} title={c.det.export} options={[]} noteLabel={c.det.exportReason} confirmLabel={c.det.export} audited
        onConfirm={async ({ note }) => {
          // Server builds the masked CSV of every recipient and audits the reason.
          try {
            const r = await exportRecipients(id, note ?? "");
            downloadCsv(`${id}-recipients.csv`, r.csv);
            toast({ title: c.det.exported, tone: "success" });
            setExp(false);
          } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
        }} />
    </>
  );
}
