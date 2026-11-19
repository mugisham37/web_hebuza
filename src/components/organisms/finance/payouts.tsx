"use client";
// U14 Payouts (board 11 with the plan's Fix column): list · 3-step builder · batch record (review/authorise, export,
// execute, mark paid/failed per line, close → statements). Amounts and totals come from the API (payoutLine, W13).
import { uploadFile } from "@/lib/api/upload";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDate, formatDateTime, formatRelative } from "@/shared/format";
import { fill } from "@/content/pages/finance-common";

import { ensureFresh, useBatch, useBatches, usePreview, type BatchView, type LineView, type Totals } from "@/lib/finance/e";
import type { ExportFile } from "@/shared/finance/types";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Dialog, Sheet } from "@/components/atoms/dialog";
import { Field, Input, Switch } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { PageHead, SkeletonRows, useNow } from "@/components/atoms/agent";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { EmptyPanel, Panel, PanelError, SavedViewTabs } from "@/components/molecules/ops/ops";
import { usePhone } from "@/components/atoms/step-up";
import { Amount, AmountDelta, FinStatus, MethodTag, useF } from "@/components/atoms/finance";
import { ApprovalChain, ConflictDialog, HistoryTab, MoneyTile } from "@/components/molecules/finance/finance";
import { ArtNoBatches, ArtReconciled } from "@/components/atoms/finance-art";
import { errorCopy } from "@/lib/api/error-copy";
import { DesktopOnly, LaneBanner, Steps, TextDialog, useActor, useMoneyText, useP, useRunner } from "@/components/molecules/finance/revenue";
import { api, unwrap, type ActionOf } from "@/lib/api/client";

const backLink = (href: string, label: string) => (
  <ButtonLink href={href} variant="ghost" size="sm" className="-ml-3 mb-2"><Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{label}</ButtonLink>
);

// ---------------------------------------------------------------- list
const VIEWS = ["all", "draft", "submitted", "authorised", "executing", "closed"] as const;
const inView = (v: string, s: BatchView["status"]) => v === "all" || s === v || (v === "executing" && (s === "paid" || s === "partially_paid"));

export function PayoutsView() {
  const p = useP();
  const { locale } = useI18n();
  const q = useUrlParams();
  const view = (VIEWS as readonly string[]).includes(q.get("view") ?? "") ? q.get("view")! : "all";
  const list = useBatches();
  const { online, execOnly } = useActor();
  const items = list.data?.items ?? [];
  const rows = items.filter((b) => inView(view, b.status));
  const href = (no: string) => localHref(locale, `/finance/payouts/${no}`);
  const router = useRouter();
  const cols: OpsColumn<BatchView>[] = [
    { key: "no", label: p.cols.no, cell: (b) => <span className="font-medium tabular">{b.no}</span>, sort: (b) => b.no },
    { key: "period", label: p.cols.period, cell: (b) => <span className="tabular">{b.period}</span>, sort: (b) => b.period },
    { key: "agents", label: p.cols.agents, align: "right", cell: (b) => <span className="tabular">{b.agents}</span> },
    { key: "gross", label: p.cols.gross, align: "right", cell: (b) => <Amount value={b.totals.gross} size="sm" />, card: false },
    { key: "deductions", label: p.cols.deductions, align: "right", card: false, cell: (b) => <span className="grid justify-items-end"><Amount value={b.totals.adjustments} sign="always" size="sm" /><Amount value={-b.totals.fees} size="sm" className="text-eyebrow" /></span> },
    { key: "wht", label: p.cols.wht, align: "right", cell: (b) => <Amount value={b.totals.wht} size="sm" />, card: false },
    { key: "net", label: p.cols.net, align: "right", cell: (b) => <Amount value={b.totals.net} size="sm" className="font-medium" />, sort: (b) => b.totals.net },
    { key: "prepared", label: p.cols.prepared, cell: (b) => b.preparedBy.name, card: false },
    { key: "authorised", label: p.cols.authorised, cell: (b) => b.authorisedBy?.name ?? "—", card: false },
    { key: "state", label: p.cols.state, cell: (b) => <FinStatus status={b.status} kind="batch" /> },
  ];
  const payDay = list.data?.payoutDay;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHead title={p.title} sub={<>{p.sub}{payDay != null && <span className="ml-1 text-fg-subtle">{fill(p.payDay, { d: payDay })}</span>}</>}
        actions={execOnly ? null : <ButtonLink href={localHref(locale, "/finance/payouts/new")} dots className="m-press" aria-disabled={!online || undefined}>{p.create}</ButtonLink>} />
      <LaneBanner offline={!online && p.offline} exec={execOnly && p.batch.exec} />
      <SavedViewTabs views={VIEWS.map((v) => ({ key: v, label: p.views[v], count: list.data ? items.filter((b) => inView(v, b.status)).length : undefined }))} active={view} onChange={(k) => setUrlParams({ view: k === "all" ? null : k })} />
      <div className="mt-5 grid gap-5 m-stagger">
        {list.isError ? <PanelError what={p.load.batches} onRetry={() => list.refetch()} /> : (
          <OpsTable rows={rows} columns={cols} rowKey={(b) => b.no} label={p.listLabel} rowLabel={(b) => b.no} loading={list.isPending} shortcuts
            onOpen={(b) => router.push(href(b.no))} rowTone={(b) => (b.status === "submitted" && b.can.authorise ? "danger" : null)}
            empty={items.length
              ? <EmptyPanel title={p.emptyView[0]} body={p.emptyView[1]} />
              : <EmptyPanel title={p.empty[0]} body={p.empty[1]} action={<div className="grid justify-items-center gap-3"><ArtNoBatches />{!execOnly && <ButtonLink href={localHref(locale, "/finance/payouts/new")} size="sm" dots>{p.create}</ButtonLink>}</div>} />} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- shared line table
export function LineDetails({ l }: { l: LineView }) {
  const p = useP();
  const { locale } = useI18n();
  const block = (title: string, rows: { k: string; label: string; amount: number }[]) => (
    <div className="grid gap-1.5">
      <p className="text-eyebrow text-fg-muted">{title}</p>
      {rows.length ? rows.map((x) => <p key={x.k} className="flex justify-between gap-3 text-small"><span className="tabular">{x.label}</span><Amount value={x.amount} size="sm" /></p>) : <p className="text-small text-fg-subtle">{p.line.none}</p>}
    </div>
  );
  return (
    <div className="grid gap-4 p-1 sm:grid-cols-3">
      {block(p.line.allocations, l.parts.allocations.map((a) => ({ k: a.id, label: a.caseRef, amount: a.amount })))}
      {block(p.line.adjustmentsT, l.parts.adjustments.map((a) => ({ k: a.id, label: a.reason, amount: a.amount })))}
      {block(p.line.feesT, l.parts.fees.map((x) => ({ k: x.id, label: x.month, amount: -x.amount })))}
      {l.carriedIn !== 0 && <p className="text-small sm:col-span-3">{p.line.carried}: <Amount value={l.carriedIn} size="sm" /></p>}
      {l.failReason && <p className="text-small text-danger sm:col-span-3">{l.failReason}</p>}
      {l.paidAt && l.status === "paid" && <p className="text-small text-fg-muted sm:col-span-3">{formatDateTime(l.paidAt, locale)}{l.providerRef && ` · ${l.providerRef}`}</p>}
    </div>
  );
}

function useLineColumns(extra?: OpsColumn<LineView>) {
  const p = useP();
  const { locale } = useI18n();
  const cols: OpsColumn<LineView>[] = [
    { key: "worker", label: p.line.worker, cell: (l) => <span className="grid"><span className="font-medium">{l.name}</span><span className="text-eyebrow text-fg-muted">{p.line[l.kind]}</span></span>, sort: (l) => l.name },
    { key: "gross", label: p.line.gross, align: "right", cell: (l) => <Amount value={l.gross} size="sm" />, sort: (l) => l.gross },
    { key: "adjustments", label: p.line.adjustments, align: "right", cell: (l) => <Amount value={l.adjustments} sign="always" size="sm" />, card: false },
    { key: "carried", label: p.line.carried, align: "right", cell: (l) => (l.carriedIn ? <Amount value={l.carriedIn} sign="always" size="sm" /> : "—"), card: false },
    { key: "taxable", label: p.line.taxable, align: "right", cell: (l) => <Amount value={l.taxable} size="sm" />, card: false },
    { key: "wht", label: p.line.wht, align: "right", cell: (l) => (l.wht ? <Amount value={-l.wht} size="sm" /> : "—") },
    { key: "fees", label: p.line.fees, align: "right", cell: (l) => (l.fees ? <Amount value={-l.fees} size="sm" /> : "—"), card: false },
    { key: "net", label: p.line.net, align: "right", cell: (l) => <span key={l.net} className="m-rise"><Amount value={l.net} size="sm" className="font-medium" /></span>, sort: (l) => l.net },
    { key: "carry", label: p.line.carry, align: "right", cell: (l) => (l.carryForward ? <Amount value={l.carryForward} size="sm" /> : "—"), card: false },
    { key: "method", label: p.line.method, wrap: true, cell: (l) => (
      <span className="grid gap-1"><MethodTag method={l.method} />
        <span className={cx("text-eyebrow tabular", !l.destination.verified ? "text-danger" : l.destination.coolingUntil ? "text-warning" : "text-fg-muted")}>
          {l.destination.masked}{!l.destination.verified ? ` · ${p.line.unverified}` : l.destination.coolingUntil ? ` · ${fill(p.line.cooling, { t: formatDate(l.destination.coolingUntil, locale) })}` : ""}
        </span>
      </span>
    ) },
    { key: "state", label: p.line.state, cell: (l) => <FinStatus status={l.status} kind="line" /> },
  ];
  return extra ? [...cols, extra] : cols;
}

export function TotalsStrip({ t }: { t: Totals }) {
  const p = useP();
  const cells: [string, number, boolean?][] = [[p.line.gross, t.gross], [p.line.adjustments, t.adjustments, true], [p.line.wht, -t.wht], [p.line.fees, -t.fees], [p.line.net, t.net]];
  return (
    <dl className="grid grid-cols-2 gap-3 theme-dark bg-grad-navy-depth p-4 text-fg sm:grid-cols-5" aria-label={p.line.total}>
      {cells.map(([k, v, s]) => (
        <div key={k} className="grid gap-1"><dt className="text-eyebrow text-fg-muted">{k}</dt><dd key={v} className="m-rise"><Amount value={v} sign={s ? "always" : "auto"} size="md" className={cx(k === p.line.net && "font-medium", v < 0 && "!text-danger")} /></dd></div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------- builder
const monthOf = (ms: number) => new Date(ms).toISOString().slice(0, 7);
export function BatchBuilder() {
  const p = useP();
  const { locale } = useI18n();
  const router = useRouter();
  const q = useUrlParams();
  const phone = usePhone();
  const now = useNow();
  const { online, execOnly } = useActor();
  const run = useRunner();
  const [step, setStep] = useState(0);
  const [mid, setMid] = useState(false);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const period = q.get("period") ?? (now ? monthOf(now) : "");
  const preview = usePreview(step > 0 ? period : "", mid ? 2 : 1, excluded);
  const pv = preview.data;
  const back = backLink(localHref(locale, "/finance/payouts"), p.builder.back);
  const lineCols = useLineColumns({
    key: "act", label: "", align: "right", card: false,
    cell: (l) => <Button size="sm" variant="ghost" onClick={() => setExcluded(excluded.includes(l.workerId) ? excluded.filter((x) => x !== l.workerId) : [...excluded, l.workerId])}>{excluded.includes(l.workerId) ? p.builder.include : p.builder.exclude}</Button>,
  });
  if (phone) return <div className="mx-auto max-w-3xl"><PageHead back={back} title={p.builder.title} /><DesktopOnly title={p.builder.phone} body={p.builder.phoneBody} back={back} /></div>;

  const live = (pv?.lines ?? []).filter((l) => l.status !== "excluded");
  const submit = async () => {
    if (!pv) return;
    await ensureFresh(preview);
    const created = await run.go<BatchView>({ req: (h) => api.POST("/api/finance/payouts/batches", { body: { period, run: mid ? 2 : 1, excluded }, headers: h }) });
    if (!created) return;
    await run.go<BatchView>({ req: (h) => api.POST("/api/finance/payouts/batches/{no}/submit", { params: { path: { no: created.no } }, body: { rev: created.rev }, headers: h }) }, { success: fill(p.builder.submitted, { no: created.no }) });
    router.push(localHref(locale, `/finance/payouts/${created.no}`));
  };
  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHead back={back} title={p.builder.title} />
      <LaneBanner offline={!online && p.offline} exec={execOnly && p.batch.exec} />
      <Panel>
        <div className="grid gap-6">
          <Steps steps={p.builder.steps} current={step} />
          {step === 0 && (
            <div key="s0" className="grid max-w-xl gap-4 m-rise">
              <Field label={p.builder.period}>
                {({ id }) => <Input id={id} type="month" value={period} onChange={(e) => setUrlParams({ period: e.target.value || null })} className="max-w-56" />}
              </Field>
              <Switch label={p.builder.midMonth} checked={mid} onChange={(e) => setMid(e.target.checked)} />
              <p className="text-small text-fg-muted">{fill(p.builder.midHint, { no: period ? `PB-${period}-2` : "PB-…-2" })}</p>
            </div>
          )}
          {step > 0 && (preview.isPending ? <SkeletonRows n={4} /> : preview.isError ? <PanelError what={p.load.preview} onRetry={() => preview.refetch()} /> : pv && (
            <div key={`s${step}`} className="grid gap-4 m-rise">
              <p className="flex flex-wrap items-center gap-2 text-small"><span className="text-fg-muted">{p.builder.no}</span><span key={pv.no} className="bg-navy-50 px-3 py-1 font-medium tabular text-navy-800 m-pop">{pv.no}</span></p>
              {pv.exists && (
                <p role="alert" className="flex flex-wrap items-center gap-2 bg-warning-bg p-3 text-small">
                  <Icon name="clock" size={16} aria-hidden />{fill(p.builder.exists, { no: pv.exists })}
                  <ButtonLink href={localHref(locale, `/finance/payouts/${pv.exists}`)} size="sm" variant="outline">{p.builder.open}</ButtonLink>
                </p>
              )}
              {step === 1 && <>
                {pv.blockers.length > 0 && (
                  <div role="alert" className="grid gap-1 bg-warning-bg p-3 text-small">
                    {pv.blockers.map((b) => <p key={b.workerId} className="flex gap-2"><Icon name="shield" size={16} aria-hidden className="mt-0.5 shrink-0" />{b.kind === "unverified" ? fill(p.builder.blockerUnverified, { name: b.name }) : fill(p.builder.blockerCooling, { name: b.name, when: formatRelative(b.until ?? "", locale) })}</p>)}
                    <p className="text-eyebrow text-fg-muted">{p.builder.blockerHint}</p>
                  </div>
                )}
                <OpsTable rows={pv.lines} columns={lineCols} rowKey={(l) => l.workerId} label={fill(p.builder.linesLabel, { no: pv.no })} rowLabel={(l) => l.name}
                  rowTone={(l) => (l.status === "excluded" ? "muted" : pv.blockers.some((b) => b.workerId === l.workerId) ? "danger" : null)}
                  expanded={open} onExpand={setOpen} renderExpanded={(l) => <LineDetails l={l} />}
                  empty={<EmptyPanel title={p.builder.noLines[0]} body={p.builder.noLines[1]} />} />
                <p className="flex gap-2 text-small text-fg-muted"><Icon name="briefcase" size={16} aria-hidden className="mt-0.5 shrink-0 text-navy-600" />{p.builder.w13}</p>
              </>}
              <TotalsStrip t={pv.totals} />
              {step === 2 && (
                <div className="grid gap-2 bg-bg-tint p-5">
                  <p className="text-card-title">{fill(p.builder.confirmTitle, { no: pv.no })}</p>
                  <p className="text-small">{fill(p.builder.confirmBody, { n: live.length, net: "" })}<Amount value={pv.totals.net} size="sm" className="font-medium" /></p>
                </div>
              )}
            </div>
          ))}
          <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>{p.builder.prev}</Button>
            {step < 2
              ? <Button className="m-press" disabled={!period || (step === 1 && (!pv || !!pv.exists || pv.blockers.length > 0 || live.length === 0))} onClick={() => setStep(step + 1)}>{p.builder.next}</Button>
              : <Button dots className="m-press" loading={run.busy} disabled={!online || execOnly || !pv || !!pv.exists || pv.blockers.length > 0 || live.length === 0} onClick={submit}>{p.builder.submit}</Button>}
          </div>
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- batch record
const TABS = ["lines", "export", "paid"] as const;
export function BatchRecord({ no }: { no: string }) {
  const p = useP();
  const f = useF();
  const { locale } = useI18n();
  const q = useUrlParams();
  const phone = usePhone();
  const b = useBatch(no);
  const { online, me, execOnly } = useActor();
  const run = useRunner();
  const [dlg, setDlg] = useState<null | "reject" | "execute" | "close">(null);
  const [lineDlg, setLineDlg] = useState<null | { kind: "paid" | "failed" | "exclude"; l: LineView }>(null);
  const tab = (TABS as readonly string[]).includes(q.get("tab") ?? "") ? q.get("tab")! : "lines";
  const lineId = q.get("line");
  const back = backLink(localHref(locale, "/finance/payouts"), p.batch.back);
  const data = b.data;
  const statements = data?.statements;
  const canExclude = !!data?.can.exclude;
  const lineCols = useLineColumns(canExclude ? {
    key: "act", label: "", align: "right", card: false,
    cell: (l) => (l.status === "pending" ? <Button size="sm" variant="ghost" disabled={!online} onClick={() => setLineDlg({ kind: "exclude", l })}>{p.builder.exclude}</Button> : null),
  } : undefined);
  useEffect(() => {
    if (statements !== "running") return;
    const t = setTimeout(() => void b.refetch(), 4500); // mock statements job finishes after a few seconds
    return () => clearTimeout(t);
  }, [statements, b]);

  if (b.isPending) return <div className="mx-auto max-w-7xl">{back}<SkeletonRows n={5} /></div>;
  if (b.isError || !data) {
    return <div className="mx-auto max-w-7xl">{back}{b.error && (b.error as { status?: number }).status === 404
      ? <EmptyPanel title={p.batch.notFound[0]} body={p.batch.notFound[1]} />
      : <PanelError what={p.load.batch} onRetry={() => b.refetch()} />}</div>;
  }
  const bt = data;
  const act = async (action: ActionOf<"/api/finance/payouts/batches/{no}">, body: Record<string, unknown> = {}, opts: { stepUpWhat?: string; success?: string } = {}) => {
    await ensureFresh(b);
    return run.go<BatchView>({ req: (h) => api.POST(`/api/finance/payouts/batches/{no}/${action}`, { params: { path: { no: bt.no } }, body: { rev: bt.rev, ...body }, headers: h }) }, opts);
  };
  const lineAct = (l: LineView, action: ActionOf<"/api/finance/payouts/lines/{id}">, body: Record<string, unknown>, opts: { stepUpWhat?: string; success?: string }) =>
    run.go<BatchView>({ req: (h) => api.POST(`/api/finance/payouts/lines/{id}/${action}`, { params: { path: { id: l.id } }, body, headers: h }) }, opts);
  const paidN = bt.lines.filter((l) => l.status === "paid").length;
  const failedN = bt.lines.filter((l) => l.status === "failed").length;
  const liveN = bt.lines.filter((l) => l.status !== "excluded").length;
  const disabled = !online;
  const last = bt.last;
  const focusLine = bt.lines.find((l) => l.id === lineId) ?? null;

  const actions = (
    <>
      {bt.can.reject && <Button variant="outline" disabled={disabled} onClick={() => setDlg("reject")}>{p.batch.reject}</Button>}
      {bt.can.authorise && <Button dots className="m-press" loading={run.busy} disabled={disabled} onClick={() => act("authorise", {}, { stepUpWhat: p.batch.authorise, success: p.batch.authorised })}>{p.batch.authorise}</Button>}
      {bt.can.submit && !phone && <Button dots className="m-press" loading={run.busy} disabled={disabled} onClick={() => act("submit", {}, { success: fill(p.builder.submitted, { no: bt.no }) })}>{p.batch.submit}</Button>}
      {bt.can.execute && <Button dots className="m-press" disabled={disabled} onClick={() => setDlg("execute")}>{p.batch.execute}</Button>}
      {bt.can.close && <Button dots className="m-press" disabled={disabled} onClick={() => setDlg("close")}>{p.batch.close}</Button>}
    </>
  );
  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHead back={back} title={<span className="flex flex-wrap items-center gap-3"><span className="tabular">{bt.no}</span><FinStatus status={bt.status} kind="batch" /></span>}
        sub={<>{bt.period} · {fill(p.batch.prepared, { who: bt.preparedBy.name })}{bt.authorisedBy && ` · ${p.cols.authorised} ${bt.authorisedBy.name}`}</>} actions={actions} />
      <LaneBanner offline={!online && p.offline} exec={execOnly && p.batch.exec} />
      {bt.rejectNote && <p role="status" className="mb-4 flex gap-2 bg-warning-bg p-3 text-small"><Icon name="refresh" size={16} aria-hidden className="mt-0.5 shrink-0" />{fill(p.batch.rejectNote, { note: bt.rejectNote })}</p>}

      <div className="grid gap-5 m-stagger">
        {bt.status === "closed" && (
          <section className="grid gap-4 border border-border bg-white p-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <span className="m-pop"><ArtReconciled /></span>
            <div className="grid gap-2">
              <h2 className="text-h3">{p.batch.closedTitle}</h2>
              <p className="text-small text-fg-muted">{fill(p.batch.closedBody, { no: bt.no })}</p>
              <ul className="grid gap-1.5 text-small" aria-live="polite">
                <li className="flex items-center gap-2">{statements === "running" ? <span aria-hidden className="size-4 rounded-full m-shimmer" /> : <Icon name="check" size={16} aria-hidden className="text-success m-tick" />}{statements === "running" ? p.batch.statementsRunning : p.batch.statementsReady}</li>
                <li className="flex items-center gap-2"><Icon name="check" size={16} aria-hidden className="text-success m-tick" />{fill(p.batch.whtPayable, { amount: "" })}<Amount value={bt.totals.wht} size="sm" /></li>
                <li className="flex items-center gap-2"><Icon name="check" size={16} aria-hidden className="text-success m-tick" />{p.batch.audit}</li>
                {failedN > 0 && <li className="flex items-center gap-2 text-danger"><Icon name="refresh" size={16} aria-hidden />{fill(p.batch.failedCarry, { n: failedN })}</li>}
              </ul>
            </div>
          </section>
        )}

        <section aria-label={p.batch.summary} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MoneyTile label={p.line.gross} value={bt.totals.gross} icon="layers" />
          <MoneyTile label={p.line.wht} value={bt.totals.wht} icon="building" />
          <MoneyTile label={p.line.net} value={bt.totals.net} tone="lavender" icon="wallet" count={`${bt.agents} ${p.cols.agents.toLowerCase()}`} />
          <div className="grid min-h-32 content-between gap-2 border border-border bg-white p-4 m-lift">
            <span className="text-small text-fg-muted">{p.batch.vsLast}</span>
            {bt.vsLast ? <><AmountDelta value={bt.vsLast.pct} period={f.money.lastMonth} /><Amount value={bt.vsLast.net} size="sm" className="text-fg-muted" /></> : <span className="text-small text-fg-subtle">{p.batch.noLast}</span>}
          </div>
        </section>

        <Panel title={p.batch.chain}>
          <div className="grid gap-3">
            {me && <ApprovalChain steps={bt.chain} me={me} makerIds={[bt.preparedBy.id]} signing={run.busy}
              onSign={bt.can.authorise && online ? () => act("authorise", {}, { stepUpWhat: p.batch.authorise, success: p.batch.authorised }) : undefined} />}
            {bt.status === "submitted" && !bt.can.authorise && <p className="flex gap-2 text-small text-fg-muted"><Icon name="lock" size={16} aria-hidden className="mt-0.5 shrink-0" />{bt.whyNot === "preparer" ? p.batch.preparerCant : p.batch.roleCant}</p>}
          </div>
        </Panel>

        <SavedViewTabs views={TABS.map((t) => ({ key: t, label: p.batch.tabs[t], count: t === "export" ? bt.exports.length : t === "paid" ? paidN : undefined }))} active={tab} onChange={(k) => setUrlParams({ tab: k === "lines" ? null : k, line: null })} />

        {tab === "lines" && <>
          <OpsTable rows={bt.lines} columns={lineCols} rowKey={(l) => l.id} label={fill(p.builder.linesLabel, { no: bt.no })} rowLabel={(l) => l.name} shortcuts
            rowTone={(l) => (l.status === "excluded" ? "muted" : l.status === "failed" ? "danger" : null)}
            expanded={lineId} onExpand={(k) => setUrlParams({ line: k })} onOpen={(l) => setUrlParams({ line: l.id })} renderExpanded={(l) => <LineDetails l={l} />} />
          <TotalsStrip t={bt.totals} />
        </>}

        {tab === "export" && <ExportPanel bt={bt} />}

        {tab === "paid" && (
          <Panel title={<span aria-live="polite">{fill(p.batch.progress, { paid: paidN, n: liveN })}</span>}>
            <div className="grid gap-3">
              <div aria-hidden className="flex h-2 overflow-hidden bg-ink-100">
                {/* proportion bar is display geometry, not money */}
                <span className="h-full bg-success m-grow" style={{ width: `${liveN ? (paidN / liveN) * 100 : 0}%` }} />
                <span className="h-full bg-danger m-grow" style={{ width: `${liveN ? (failedN / liveN) * 100 : 0}%` }} />
              </div>
              {bt.status === "submitted" || bt.status === "draft" ? <p className="text-small text-fg-muted">{p.batch.awaiting}</p> : (
                <ul className="grid gap-2">
                  {bt.lines.filter((l) => l.status !== "excluded").map((l) => (
                    <li key={l.id} className={cx("flex flex-wrap items-center gap-3 border p-3", l.status === "failed" ? "border-danger/30 bg-danger-bg" : "border-border")}>
                      <span className="min-w-0 flex-1"><span className="block font-medium">{l.name}</span><span className="text-eyebrow text-fg-muted tabular">{l.destination.masked}{l.providerRef && ` · ${l.providerRef}`}</span></span>
                      <Amount value={l.net} size="sm" />
                      <span className={cx(l.status === "paid" && "m-tick")}><FinStatus status={l.status} kind="line" /></span>
                      {bt.can.mark && l.status === "pending" && <>
                        <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setLineDlg({ kind: "failed", l })}>{p.batch.markFailed}</Button>
                        <Button size="sm" className="m-press" disabled={disabled} onClick={() => setLineDlg({ kind: "paid", l })}>{p.batch.markPaid}</Button>
                      </>}
                    </li>
                  ))}
                </ul>
              )}
              {failedN > 0 && <p className="flex gap-2 bg-danger-bg p-3 text-small text-danger"><Icon name="refresh" size={16} aria-hidden className="mt-0.5 shrink-0" />{fill(p.batch.failedCarry, { n: failedN })}</p>}
            </div>
          </Panel>
        )}

        <Panel title={f.history.title}><HistoryTab resourceType="batch" resourceId={bt.no} /></Panel>
      </div>

      {focusLine && phone && tab === "lines" && (
        <Sheet open side="bottom" onClose={() => setUrlParams({ line: null })} title={focusLine.name} description={p.line.details}><LineDetails l={focusLine} /></Sheet>
      )}
      <TextDialog open={dlg === "reject"} destructive onClose={() => setDlg(null)} title={fill(p.batch.rejectTitle, { no: bt.no })} label={p.batch.failReason} confirm={p.batch.reject}
        onConfirm={async (reason) => !!(await act("reject", { reason }, { success: p.batch.rejected }))} />
      <Dialog open={dlg === "execute" || dlg === "close"} onClose={() => setDlg(null)} title={fill(dlg === "close" ? p.batch.closeTitle : p.batch.executeTitle, { no: bt.no })}
        footer={<><Button variant="ghost" onClick={() => setDlg(null)}>{p.cancel}</Button><Button dots className="m-press" loading={run.busy} onClick={async () => {
          const r = await act(dlg!, {}, { success: dlg === "close" ? p.batch.closed : p.batch.executing });
          if (r) { setDlg(null); if (dlg === "execute") setUrlParams({ tab: "paid" }); }
        }}>{dlg === "close" ? p.batch.close : p.batch.execute}</Button></>}>
        <p className="text-body">{dlg === "close" ? p.batch.closeBody : p.batch.executeBody}</p>
      </Dialog>
      {lineDlg?.kind === "paid" && <MarkPaidDialog l={lineDlg.l} onClose={() => setLineDlg(null)} onConfirm={(ref, proof) => lineAct(lineDlg.l, "paid", { ref, proofDocId: proof }, { stepUpWhat: p.batch.markPaid, success: p.batch.paid })} />}
      {lineDlg && lineDlg.kind !== "paid" && (
        <TextDialog open destructive onClose={() => setLineDlg(null)} title={fill(lineDlg.kind === "failed" ? p.batch.failTitle : p.batch.excludeTitle, { name: lineDlg.l.name })}
          label={lineDlg.kind === "failed" ? p.batch.failReason : p.batch.excludeReason} confirm={lineDlg.kind === "failed" ? p.batch.markFailed : p.builder.exclude}
          onConfirm={async (reason) => !!(await lineAct(lineDlg.l, lineDlg.kind, { reason }, { success: lineDlg.kind === "failed" ? p.batch.failed : p.batch.excludedT }))} />
      )}
      <ConflictDialog open={run.conflict} who={last?.by ?? "—"} when={last?.at ?? bt.period} onClose={run.closeConflict} onRefresh={() => { run.closeConflict(); void b.refetch(); }} />
      {run.dialog}
    </div>
  );
}

function MarkPaidDialog({ l, onClose, onConfirm }: { l: LineView; onClose: () => void; onConfirm: (ref: string, proof?: string) => Promise<unknown> }) {
  const p = useP();
  const [ref, setRef] = useState("");
  const [proof, setProof] = useState<{ id: string; name: string } | undefined>();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!ref.trim()) return setErr(p.batch.refRequired);
    setBusy(true);
    const r = await onConfirm(ref.trim(), proof?.id);
    setBusy(false);
    if (r) onClose();
  };
  return (
    <Dialog open onClose={onClose} title={fill(p.batch.paidTitle, { name: l.name })} description={l.destination.masked}
      footer={<><Button variant="ghost" onClick={onClose}>{p.cancel}</Button><Button className="m-press" loading={busy} onClick={submit}>{p.batch.markPaid}</Button></>}>
      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} className="grid gap-4">
        <p className="flex items-center justify-between bg-bg-tint p-3"><span className="text-small">{p.line.net}</span><Amount value={l.net} size="lg" /></p>
        <Field label={p.batch.ref} hint={p.batch.refHint} error={err ?? undefined}>
          {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="off" value={ref} onChange={(e) => { setRef(e.target.value); setErr(null); }} />}
        </Field>
        <div className="grid gap-1.5"><span className="text-label">{p.batch.proof}</span><FileDrop accept="application/pdf,image/*" onFiles={(fs) => fs[0] && uploadFile(fs[0], "payout_proof").then(setProof, (e) => setErr(e instanceof Error ? e.message : String(e)))} />{proof && <span className="text-small text-fg-muted">{proof.name}</span>}</div>
      </form>
    </Dialog>
  );
}

function ExportPanel({ bt }: { bt: BatchView }) {
  const p = useP();
  const f = useF();
  const { locale } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const ready = bt.can.export;
  const kinds: ExportFile["kind"][] = ["bank", "momo", "wht", "summary"];
  const gen = async (k: ExportFile["kind"]) => {
    setBusy(k);
    try {
      const x = await unwrap<ExportFile & { content: string; encoding?: "base64"; mime?: string; rows: number }>(api.GET("/api/finance/payouts/batches/{no}/export", { params: { path: { no: bt.no }, query: { format: k } } }));
      const body = x.encoding === "base64" ? Uint8Array.from(atob(x.content), (ch) => ch.charCodeAt(0)) : x.content;
      const url = URL.createObjectURL(new Blob([body], { type: x.mime ?? "text/plain" }));
      const a = document.createElement("a");
      a.href = url; a.download = x.name; a.click();
      URL.revokeObjectURL(url);
      toast({ title: fill(p.batch.exported, { name: x.name }), body: f.export.logged, tone: "success" });
    } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
    setBusy(null);
  };
  return (
    <Panel>
      {!ready ? <EmptyPanel compact title={p.batch.notExported} /> : (
        <ul className="grid gap-2">
          {kinds.map((k) => {
            const done = bt.exports.find((e) => e.kind === k);
            return (
              <li key={k} className="flex flex-wrap items-center gap-3 border border-border p-3 m-lift">
                <span className={cx("flex size-9 items-center justify-center rounded-full", done ? "bg-success-bg text-success" : "bg-bg-subtle text-fg-muted")}><Icon name={done ? "fileCheck" : "file"} size={18} aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-small font-medium">{p.batch.files[k]}</span>
                  {done && <span className="text-eyebrow text-fg-muted tabular">{done.name} · {fill(p.batch.checksum, { c: done.checksum })} · {formatDateTime(done.at, locale)}</span>}
                </span>
                <Button size="sm" variant={done ? "outline" : "primary"} className="m-press" loading={busy === k} onClick={() => gen(k)}><Icon name="upload" size={14} aria-hidden className="rotate-180" />{done ? p.batch.regenerate : p.batch.generate}</Button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
