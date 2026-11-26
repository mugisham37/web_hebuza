"use client";
// U13 Revenue (board 10, rebuilt from the spec per plan D9): tabs Allocations · Rate rules · Adjustments · Agent fees.
// URL: ?tab=allocations|rules|adjustments|fees&state=&agent=&period=&id=. Amounts come from the API (finance-world → money.ts).
import { useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { useShortcut } from "@/lib/ops/shortcuts";
import { cx, formatDate, formatRelative } from "@/shared/format";
import { fill } from "@/content/pages/finance-common";
import { ensureFresh, useAdjustments, useAllocations, useFees, useRules, type AdjView, type AllocView, type FeeView, type RuleView } from "@/lib/finance/e";
import type { AllocationStatus } from "@/shared/finance/types";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Sheet, Dialog } from "@/components/atoms/dialog";
import { DateInput, Field, Input, Radio, Select, Textarea, ErrorSummary } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Avatar } from "@/components/atoms/misc";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { BulkAction, BulkBar, EmptyPanel, Panel, PanelError, ReasonDialog, SavedViewTabs } from "@/components/molecules/ops/ops";
import { usePhone } from "@/components/atoms/step-up";
import { Amount, FinStatus, useF } from "@/components/atoms/finance";
import { ApprovalChain, ConflictDialog, EligibleBreakdown, FiveStatesBar, HistoryTab, MoneyTile } from "@/components/molecules/finance/finance";
import { ArtNothingWaiting } from "@/components/atoms/finance-art";
import { LaneBanner, TextDialog, pctText, useActor, useMoneyText, useR, useRunner } from "@/components/molecules/finance/revenue";

const TABS = ["allocations", "rules", "adjustments", "fees"] as const;
type Tab = (typeof TABS)[number];
const STATES: AllocationStatus[] = ["pending_review", "reviewed", "approved_for_payment", "in_batch", "paid", "on_hold", "voided"];

export function RevenueView() {
  const r = useR();
  const { locale } = useI18n();
  const q = useUrlParams();
  const tab = (TABS as readonly string[]).includes(q.get("tab") ?? "") ? (q.get("tab") as Tab) : "allocations";
  const { online, execOnly } = useActor();
  const [adjOpen, setAdjOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);
  const action = tab === "rules" ? <ButtonLink href={localHref(locale, "/finance/revenue/rules/new")} size="sm" dots className="m-press">{r.rules.add}</ButtonLink>
    : tab === "adjustments" ? <Button size="sm" dots className="m-press" disabled={!online || execOnly} onClick={() => setAdjOpen(true)}>{r.adj.new}</Button>
    : tab === "fees" ? <Button size="sm" dots className="m-press" disabled={!online || execOnly} onClick={() => setFeeOpen(true)}>{r.fees.add}</Button> : null;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHead title={r.title} sub={r.sub} actions={execOnly ? null : action} />
      <LaneBanner offline={!online && r.offline} exec={execOnly && r.execRO} />
      <SavedViewTabs views={TABS.map((t) => ({ key: t, label: r.tabs[t] }))} active={tab} onChange={(k) => setUrlParams({ tab: k === "allocations" ? null : k, id: null, state: null })} />
      <div className="mt-5 grid gap-5 m-stagger">
        {tab === "allocations" && <AllocationsTab />}
        {tab === "rules" && <RulesTab />}
        {tab === "adjustments" && <AdjustmentsTab />}
        {tab === "fees" && <FeesTab />}
      </div>
      {adjOpen && <AdjustmentDialog onClose={() => setAdjOpen(false)} />}
      {feeOpen && <FeeDialog onClose={() => setFeeOpen(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------- Allocations
function AllocationsTab() {
  const r = useR();
  const f = useF();
  const { locale } = useI18n();
  const q = useUrlParams();
  const state = q.get("state"), agent = q.get("agent"), period = q.get("period"), id = q.get("id");
  const list = useAllocations({ state, agent, period });
  const { online, execOnly } = useActor();
  const [sel, setSel] = useState<string[]>([]);
  const [focused, setFocused] = useState<string | null>(null);
  const run = useRunner();
  const toast = useToast();
  const items = list.data?.items ?? [];
  const meta = list.data?.meta;
  const tiles = meta?.tiles;
  const open = items.find((a) => a.id === id) ?? null;

  const cols: OpsColumn<AllocView>[] = [
    { key: "ref", label: r.cols.ref, cell: (a) => <span className="font-medium tabular">{a.caseRef}{a.question?.status === "open" && <Icon name="message" size={14} aria-label={r.question} className="ml-1.5 inline text-navy-600" />}</span>, sort: (a) => a.caseRef },
    { key: "service", label: r.cols.service, cell: (a) => <span className="block max-w-56 truncate">{a.serviceName}</span>, sort: (a) => a.serviceName },
    { key: "agents", label: r.cols.agents, wrap: true, cell: (a) => <span className="text-small">{a.shares.map((s) => s.name).join(", ")}</span> },
    { key: "completed", label: r.cols.completed, cell: (a) => formatDate(a.completedAt, locale), sort: (a) => a.completedAt, card: false },
    { key: "eligible", label: r.cols.eligible, align: "right", cell: (a) => <Amount value={a.eligible} size="sm" />, sort: (a) => a.eligible },
    { key: "rule", label: r.cols.rule, align: "right", cell: (a) => <span className="tabular">{pctText(a.agentPct)}</span>, card: false },
    { key: "pool", label: r.cols.pool, align: "right", cell: (a) => <Amount value={a.pool} size="sm" />, sort: (a) => a.pool },
    { key: "hebuza", label: r.cols.hebuza, align: "right", cell: (a) => <Amount value={a.hebuza} size="sm" />, card: false },
    { key: "status", label: r.cols.status, cell: (a) => <FinStatus status={a.status} kind="allocation" /> },
  ];
  const tileKeys = ["pending_review", "reviewed", "approved_for_payment", "paid"] as const;
  const chips = [state && { k: "state", v: f.status[state] ?? state }, agent && { k: "agent", v: meta?.agents.find((x) => x.id === agent)?.name ?? agent }, period && { k: "period", v: period }].filter(Boolean) as { k: string; v: string }[];
  const approvable = sel.filter((x) => items.find((a) => a.id === x)?.can.approve);

  const bulk = async () => {
    await ensureFresh(list);
    const res = await run.go<{ approved: string[]; skipped: string[] }>({ req: (h) => api.POST("/api/finance/revenue/allocations/bulk-approve", { body: { ids: sel }, headers: h }) });
    if (!res) return;
    setSel([]);
    toast({ title: fill(r.bulk.done, { n: res.approved.length }), body: res.skipped.length ? fill(r.bulk.skipped, { n: res.skipped.length }) : undefined, tone: "success" });
  };

  return (
    <>
      <section aria-label={r.tabs.allocations} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tileKeys.map((k) => {
          const t = tiles?.[k];
          return (
            <button key={k} type="button" aria-pressed={state === k} onClick={() => setUrlParams({ state: state === k ? null : k, id: null })}
              className={cx("text-left focus-visible:outline-2", state === k && "ring-2 ring-secondary")}>
              <MoneyTile label={r.tiles[k]} value={t?.amount} count={t ? fill(r.tiles.cases, { n: t.n }) : undefined} loading={list.isPending} tone={k === "reviewed" ? "lavender" : "white"}
                icon={k === "paid" ? "check" : k === "reviewed" ? "sparkle" : k === "approved_for_payment" ? "wallet" : "clock"} />
            </button>
          );
        })}
      </section>

      <div className="flex flex-wrap items-end gap-3">
        <Field label={r.filter.state} className="w-full sm:w-52">
          {({ id: fid }) => <Select id={fid} value={state ?? ""} onChange={(e) => setUrlParams({ state: e.target.value || null, id: null })}>
            <option value="">{r.filter.all}</option>{STATES.map((s) => <option key={s} value={s}>{f.status[s]}</option>)}
          </Select>}
        </Field>
        <Field label={r.filter.agent} className="w-full sm:w-52">
          {({ id: fid }) => <Select id={fid} value={agent ?? ""} onChange={(e) => setUrlParams({ agent: e.target.value || null, id: null })}>
            <option value="">{r.filter.all}</option>{(meta?.agents ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>}
        </Field>
        <Field label={r.filter.period} className="w-full sm:w-40">
          {({ id: fid }) => <Select id={fid} value={period ?? ""} onChange={(e) => setUrlParams({ period: e.target.value || null, id: null })}>
            <option value="">{r.filter.all}</option>{(meta?.periods ?? []).map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>}
        </Field>
        {chips.length > 0 && <Button variant="ghost" size="sm" onClick={() => setUrlParams({ state: null, agent: null, period: null, id: null })}><Icon name="x" size={14} aria-hidden />{r.filter.clear}</Button>}
      </div>

      {list.isError ? <PanelError what={r.load.allocations} onRetry={() => list.refetch()} /> : (
        <OpsTable rows={items} columns={cols} rowKey={(a) => a.id} label={r.listLabel} rowLabel={(a) => a.caseRef} loading={list.isPending}
          selected={execOnly ? undefined : sel} onSelect={execOnly ? undefined : setSel} focused={focused} onFocus={setFocused} shortcuts
          onOpen={(a) => setUrlParams({ id: a.id })} rowTone={(a) => (a.status === "voided" ? "muted" : a.question?.status === "open" ? "danger" : null)}
          empty={chips.length
            ? <EmptyPanel title={r.empty.filtered[0]} body={r.empty.filtered[1]} action={<Button size="sm" variant="outline" onClick={() => setUrlParams({ state: null, agent: null, period: null })}>{r.filter.clear}</Button>} />
            : <EmptyPanel title={r.empty.allocations[0]} body={r.empty.allocations[1]} action={<ArtNothingWaiting />} />} />
      )}

      <BulkBar count={sel.length} onClear={() => setSel([])}>
        <BulkAction icon="check" onClick={() => { if (online && approvable.length) void bulk(); }}>{fill(r.bulk.approve, { n: approvable.length })}</BulkAction>
      </BulkBar>
      {run.dialog}
      {open && <AllocationDrawer a={open} onClose={() => setUrlParams({ id: null })} refetch={() => list.refetch()} stale={list} />}
    </>
  );
}

function AllocationDrawer({ a, onClose, refetch, stale }: { a: AllocView; onClose: () => void; refetch: () => void; stale: Parameters<typeof ensureFresh>[0] }) {
  const r = useR();
  const { locale } = useI18n();
  const phone = usePhone();
  const { online } = useActor();
  const run = useRunner();
  const [dlg, setDlg] = useState<null | "query" | "hold" | "void">(null);
  const [answer, setAnswer] = useState("");
  const act = async (action: string, body: Record<string, unknown> = {}, success?: string) => {
    await ensureFresh(stale);
    return run.go({ req: (h) => api.POST("/api/finance/revenue/allocations/{id}/{action}", { params: { path: { id: a.id, action } }, body: { rev: a.rev, ...body }, headers: h }) }, { success });
  };
  const reasons = Object.entries(r.act.reasons).map(([value, label]) => ({ value, label }));
  useShortcut("a", r.act.approve, () => { if (a.can.approve && online) void act("approve", {}, r.act.approved); }, "case", a.can.approve);
  const last = a.last;
  const ruleText = `${r.scope[a.rule.scope]} · ${fill(r.drawer.effective, { from: a.rule.from ? formatDate(a.rule.from, locale) : "" })} ${a.rule.to ? fill(r.drawer.until, { to: formatDate(a.rule.to, locale) }) : `· ${r.drawer.openEnded}`}`;
  const disabled = !online;
  const footer = (
    <>
      {a.can.void && <Button variant="ghost" size="sm" disabled={disabled} onClick={() => setDlg("void")}>{r.act.void}</Button>}
      {a.status === "on_hold" && <Button variant="outline" size="sm" disabled={disabled} onClick={() => act("release", { reason: "release" }, r.act.released)}>{r.act.release}</Button>}
      {a.can.hold && <Button variant="outline" size="sm" disabled={disabled} onClick={() => setDlg("hold")}>{r.act.hold}</Button>}
      {a.can.query && <Button variant="outline" size="sm" disabled={disabled} onClick={() => setDlg("query")}>{r.act.query}</Button>}
      {a.can.approve && <Button size="sm" dots className="m-press" loading={run.busy} disabled={disabled} onClick={() => act("approve", {}, r.act.approved)}>{r.act.approve}</Button>}
    </>
  );
  return (
    <Sheet open onClose={onClose} side={phone ? "bottom" : "right"} title={<span className="tabular">{a.caseRef}</span>} description={`${a.serviceName} · ${r.drawer.client}: ${a.clientName}`} footer={footer}>
      <div className="grid gap-5 m-stagger">
        <div className="flex flex-wrap items-center gap-2">
          <FinStatus status={a.status} kind="allocation" />
          {a.waitingFor && <span className="text-small text-fg-muted">{fill(r.drawer.waiting, { who: a.waitingFor })}</span>}
          {a.batchNo && <ButtonLink href={localHref(locale, `/finance/payouts/${a.batchNo}`)} size="sm" variant="ghost">{r.drawer.batch} {a.batchNo}</ButtonLink>}
        </div>

        {a.question && (
          <section className={cx("grid gap-2 p-4", a.question.status === "open" ? "bg-warning-bg" : "bg-bg-subtle")}>
            <p className="flex items-center gap-2 text-label"><Icon name="message" size={16} aria-hidden />{r.question} · <FinStatus status={a.question.status === "open" ? "open" : "settled"} /></p>
            <p className="text-small">“{a.question.text}”</p>
            {a.can.answer && (
              <form className="grid gap-2" onSubmit={async (e) => {
                e.preventDefault();
                if (!answer.trim()) return;
                const res = await act("answer", { text: answer.trim() }, r.act.answered);
                if (res) { setAnswer(""); refetch(); }
              }}>
                <Field label={r.act.answerLabel}>{({ id }) => <Textarea id={id} rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)} />}</Field>
                <Button type="submit" size="sm" variant="secondary" disabled={disabled || !answer.trim()} className="w-fit m-press">{r.act.answerSend}</Button>
              </form>
            )}
          </section>
        )}

        <section className="grid gap-3">
          <h3 className="text-label-lg">{r.drawer.breakdown}</h3>
          <EligibleBreakdown eligible={a.eligible} deductions={a.deductions} credits={a.credits} netBase={a.netBase} />
          <dl className="grid grid-cols-2 gap-3 bg-bg-tint p-4 text-small">
            <div><dt className="text-fg-muted">{r.cols.pool} · {pctText(a.agentPct)}</dt><dd key={a.pool} className="m-rise"><Amount value={a.pool} size="lg" /></dd></div>
            <div><dt className="text-fg-muted">{r.cols.hebuza}</dt><dd key={a.hebuza} className="m-rise"><Amount value={a.hebuza} size="lg" /></dd></div>
          </dl>
          <p className="flex items-start gap-2 text-small"><Icon name="layers" size={16} aria-hidden className="mt-0.5 shrink-0 text-navy-600" /><span><span className="text-fg-muted">{r.drawer.rule}: </span>{ruleText}</span></p>
        </section>

        <section className="grid gap-2">
          <h3 className="text-label-lg">{r.drawer.contributors}</h3>
          <ul className="grid gap-2">
            {a.shares.map((s) => (
              <li key={s.workerId} className="flex items-center gap-3 border border-border p-3">
                <Avatar name={s.name} size="sm" />
                <span className="min-w-0 flex-1"><span className="block truncate text-small font-medium">{s.name}</span><span className="text-eyebrow text-fg-muted">{s.kind} · {pctText(s.pct)}</span></span>
                <Amount value={s.amount} size="sm" />
              </li>
            ))}
          </ul>
          <p className="text-eyebrow text-fg-subtle">{r.drawer.contribNote}</p>
        </section>

        <section className="grid gap-2">
          <h3 className="text-label-lg">{r.drawer.five}</h3>
          <FiveStatesBar values={a.five} />
        </section>

        {(a.reviewedBy || a.approvedBy) && (
          <p className="text-small text-fg-muted">
            {a.reviewedBy && fill(r.drawer.reviewedBy, { who: a.reviewedBy.name })}{a.reviewedBy && a.approvedBy && " · "}{a.approvedBy && fill(r.drawer.approvedBy, { who: a.approvedBy.name })}
          </p>
        )}
        <section className="grid gap-2"><h3 className="text-label-lg">{r.drawer.history}</h3><HistoryTab resourceType="allocation" resourceId={a.id} /></section>
      </div>

      <ReasonDialog open={dlg === "hold" || dlg === "void"} onClose={() => setDlg(null)} title={dlg === "void" ? r.act.voidTitle : r.act.holdTitle} options={reasons}
        notice={dlg === "void" ? r.act.voidNotice : undefined} destructive={dlg === "void"} audited confirmLabel={dlg === "void" ? r.act.void : r.act.hold}
        onConfirm={async ({ reason, note }) => {
          const res = await act(dlg!, { reason: [r.act.reasons[reason] ?? reason, note].filter(Boolean).join(", ") }, dlg === "void" ? r.act.voided : r.act.held);
          if (!res) throw new Error(r.load.allocations);
          setDlg(null);
        }} />
      <TextDialog open={dlg === "query"} onClose={() => setDlg(null)} title={r.act.queryTitle} label={r.act.queryNote} confirm={r.act.query}
        onConfirm={async (note) => !!(await act("query", { note }, r.act.queried))} />
      <ConflictDialog open={run.conflict} who={last?.by ?? ""} when={last?.at ?? new Date(0).toISOString()} onClose={run.closeConflict} onRefresh={() => { run.closeConflict(); refetch(); }} />
      {run.dialog}
    </Sheet>
  );
}

// ---------------------------------------------------------------- Rules
const SCOPE_ORDER = ["contract", "agent_service", "service", "agent", "global"] as const;
function RulesTab() {
  const r = useR();
  const { locale } = useI18n();
  const rules = useRules();
  const { online, me } = useActor();
  const run = useRunner();
  const [ending, setEnding] = useState<RuleView | null>(null);
  const [rejecting, setRejecting] = useState<RuleView | null>(null);
  const [endDate, setEndDate] = useState("");
  const items = useMemo(() => [...(rules.data?.items ?? [])].sort((x, y) => SCOPE_ORDER.indexOf(x.scope) - SCOPE_ORDER.indexOf(y.scope) || y.from.localeCompare(x.from)), [rules.data]);
  const def = rules.data?.defaultBps ?? 0;
  const cols: OpsColumn<RuleView>[] = [
    { key: "scope", label: r.rules.cols.scope, cell: (x) => <span className="inline-flex h-6 items-center bg-navy-50 px-2.5 text-eyebrow text-navy-800">{r.scope[x.scope]}</span>, sort: (x) => SCOPE_ORDER.indexOf(x.scope) },
    { key: "key", label: r.rules.cols.key, wrap: true, cell: (x) => x.label || "" },
    { key: "pct", label: r.rules.cols.pct, align: "right", cell: (x) => <span className={cx("tabular", x.agentPct !== def && "font-medium text-navy-800")}>{pctText(x.agentPct)}</span>, sort: (x) => x.agentPct },
    { key: "applies", label: r.rules.cols.applies, cell: (x) => r.applies[x.appliesTo], card: false },
    { key: "from", label: r.rules.cols.from, cell: (x) => formatDate(x.from, locale), sort: (x) => x.from },
    { key: "to", label: r.rules.cols.to, cell: (x) => (x.to ? formatDate(x.to, locale) : "") },
    { key: "status", label: r.rules.cols.status, wrap: true, cell: (x) => <span className="inline-flex flex-wrap items-center gap-1.5"><FinStatus status={x.status} kind="rule" />{x.status === "pending_approval" && <span className="text-eyebrow text-fg-muted">{r.rules.needsExec}</span>}</span> },
    { key: "act", label: "", align: "right", card: false, cell: (x) => (
      <span className="inline-flex gap-1.5">
        {x.can.end && <Button size="sm" variant="ghost" disabled={!online} onClick={() => { setEndDate(""); setEnding(x); }}>{r.rules.end}</Button>}
        {x.can.approve && <>
          <Button size="sm" variant="ghost" disabled={!online} onClick={() => setRejecting(x)}>{r.rules.reject}</Button>
          <Button size="sm" className="m-press" disabled={!online} onClick={() => run.go({ req: (h) => api.POST("/api/finance/revenue/rules/{id}/{decision}", { params: { path: { id: x.id, decision: "approve" } }, body: {}, headers: h }) }, { stepUpWhat: r.rules.approve, success: r.rules.approvedT })}>{r.rules.approve}</Button>
        </>}
      </span>
    ) },
  ];
  // Timeline per scope key: rules sharing scope+label, oldest first (end-dated, never toggled).
  const groups = useMemo(() => {
    const m = new Map<string, RuleView[]>();
    for (const x of items) m.set(`${x.scope}|${x.label}`, [...(m.get(`${x.scope}|${x.label}`) ?? []), x]);
    return [...m.entries()].map(([k, xs]) => ({ k, xs: [...xs].sort((a, b) => a.from.localeCompare(b.from)) }));
  }, [items]);

  if (rules.isError) return <PanelError what={r.load.rules} onRetry={() => rules.refetch()} />;
  const pendingMine = items.filter((x) => x.can.approve);
  return (
    <>
      <aside className="flex gap-3 bg-bg-tint p-4">
        <Icon name="layers" size={20} aria-hidden className="mt-0.5 shrink-0 text-navy-600" />
        <div><p className="text-label">{r.rules.precedence}</p><p className="text-small text-fg-muted">{r.rules.precedenceBody}</p></div>
      </aside>
      {pendingMine.length > 0 && me && (
        <Panel title={r.rules.needsExec}>
          <div className="grid gap-3">{pendingMine.map((x) => <ApprovalChain key={x.id} steps={x.chain} me={me} onSign={() => run.go({ req: (h) => api.POST("/api/finance/revenue/rules/{id}/{decision}", { params: { path: { id: x.id, decision: "approve" } }, body: {}, headers: h }) }, { stepUpWhat: r.rules.approve, success: r.rules.approvedT })} signing={run.busy} />)}</div>
        </Panel>
      )}
      <OpsTable rows={items} columns={cols} rowKey={(x) => x.id} label={r.rules.listLabel} rowLabel={(x) => `${r.scope[x.scope]} ${x.label}`} loading={rules.isPending}
        rowTone={(x) => (x.status === "ended" ? "muted" : null)}
        empty={<EmptyPanel title={r.rules.empty[0]} body={r.rules.empty[1]} />} />
      <Panel title={r.rules.timeline}>
        {rules.isPending ? <SkeletonRows n={3} /> : (
          <ol className="grid gap-4">
            {groups.map(({ k, xs }) => (
              <li key={k} className="grid gap-2">
                <p className="text-small"><span className="font-medium">{r.scope[xs[0].scope]}</span>{xs[0].label && ` · ${xs[0].label}`}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {xs.map((x) => (
                    <span key={x.id} className={cx("inline-flex items-center gap-2 px-3 py-1 text-eyebrow tabular m-grow", x.status === "ended" ? "bg-ink-100 text-fg-muted" : x.status === "active" ? "bg-secondary text-on-navy" : "border border-dashed border-navy-400 text-navy-800")}>
                      {pctText(x.agentPct)} · {formatDate(x.from, locale)} → {x.to ? formatDate(x.to, locale) : "∞"}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
      {ending && (
        <TextDialog open onClose={() => setEnding(null)} title={r.rules.endTitle} label={r.rules.endReason} confirm={r.rules.end}
          extra={<Field label={r.rules.endDate} hint={r.rules.endHint}>{({ id, describedBy }) => <DateInput id={id} aria-describedby={describedBy} min={ending.from} value={endDate} onChange={(e) => setEndDate(e.target.value)} />}</Field>}
          onConfirm={async (reason) => !!endDate && !!(await run.go({ req: (h) => api.PATCH("/api/finance/revenue/rules/{id}", { params: { path: { id: ending.id } }, body: { to: endDate, reason }, headers: h }) }, { success: r.rules.ended }))} />
      )}
      {rejecting && (
        <TextDialog open destructive onClose={() => setRejecting(null)} title={r.rules.rejectTitle} label={r.act.reasonLabel} confirm={r.rules.reject}
          onConfirm={async (reason) => !!(await run.go({ req: (h) => api.POST("/api/finance/revenue/rules/{id}/{decision}", { params: { path: { id: rejecting.id, decision: "reject" } }, body: { reason }, headers: h }) }, { stepUpWhat: r.rules.reject, success: r.rules.rejected }))} />
      )}
      {run.dialog}
    </>
  );
}

// ---------------------------------------------------------------- Adjustments
function AdjustmentsTab() {
  const r = useR();
  const adj = useAdjustments();
  const { online, me } = useActor();
  const run = useRunner();
  const [open, setOpen] = useState<string | null>(null);
  const items = adj.data?.items ?? [];
  const cols: OpsColumn<AdjView>[] = [
    { key: "at", label: r.adj.cols.at, cell: (a) => <span className="tabular">{a.at.slice(0, 10)}</span>, sort: (a) => a.at },
    { key: "worker", label: r.adj.cols.worker, cell: (a) => a.workerName, sort: (a) => a.workerName },
    { key: "case", label: r.adj.cols.case, cell: (a) => <span className="tabular">{a.caseRef ?? a.refundNo ?? ""}</span>, card: false },
    { key: "reason", label: r.adj.cols.reason, cell: (a) => r.adj.reasons[a.reason] ?? a.reason },
    { key: "amount", label: r.adj.cols.amount, align: "right", cell: (a) => <Amount value={a.amount} sign="always" size="sm" />, sort: (a) => a.amount },
    { key: "note", label: r.adj.cols.note, wrap: true, card: false, cell: (a) => <span className="line-clamp-2 max-w-64 text-small text-fg-muted">{a.note}</span> },
    { key: "status", label: r.adj.cols.status, wrap: true, cell: (a) => <span className="inline-flex flex-wrap items-center gap-1.5"><FinStatus status={a.status} kind="adjustment" />{a.status === "proposed" && <span className="text-eyebrow text-fg-muted">{r.adj.secondSigner}</span>}</span> },
  ];
  if (adj.isError) return <PanelError what={r.load.adjustments} onRetry={() => adj.refetch()} />;
  return (
    <>
      <OpsTable rows={items} columns={cols} rowKey={(a) => a.id} label={r.adj.listLabel} rowLabel={(a) => `${a.workerName} ${a.amount}`} loading={adj.isPending}
        onOpen={(a) => setOpen(a.id)} expanded={open} onExpand={setOpen}
        renderExpanded={(a) => me && a.chain.length > 0 ? (
          <ApprovalChain steps={a.chain} me={me} makerIds={[a.createdBy.id]} signing={run.busy}
            onSign={online && a.can.approve ? () => run.go({ req: (h) => api.POST("/api/finance/revenue/adjustments/{id}/approve", { params: { path: { id: a.id } }, headers: h }) }, { stepUpWhat: r.adj.approve, success: r.adj.approved }) : undefined} />
        ) : null}
        empty={<EmptyPanel title={r.adj.empty[0]} body={r.adj.empty[1]} />} />
      {run.dialog}
    </>
  );
}

function AdjustmentDialog({ onClose }: { onClose: () => void }) {
  const r = useR();
  const adj = useAdjustments();
  const run = useRunner();
  const [worker, setWorker] = useState("");
  const [dir, setDir] = useState<"plus" | "minus">("minus");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<"correction" | "bonus" | "clawback" | "other">("correction");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const err = (k: string) => errors.find((e) => e.field === k)?.message;
  const submit = async () => {
    const n = Number(amount);
    const e = [
      !worker && { field: "adj-worker", message: r.wizard.required },
      !(Number.isInteger(n) && n > 0) && { field: "adj-amount", message: r.adj.positive },
      !note.trim() && { field: "adj-note", message: r.wizard.required },
    ].filter(Boolean) as { field: string; message: string }[];
    setErrors(e);
    if (e.length) return;
    // sign only, no arithmetic: the user picks the direction and the magnitude
    const res = await run.go({ req: (h) => api.POST("/api/finance/revenue/adjustments", { body: { workerId: worker, amount: dir === "minus" ? -n : n, reason, note: note.trim() }, headers: h }) }, { success: r.adj.created });
    if (res) onClose();
  };
  return (
    <Dialog open onClose={onClose} title={r.adj.title} footer={<><Button variant="ghost" onClick={onClose}>{r.cancel}</Button><Button className="m-press" loading={run.busy} onClick={submit}>{r.adj.submit}</Button></>}>
      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} className="grid gap-4">
        <ErrorSummary title={r.wizard.errors} errors={errors} />
        <Field id="adj-worker" label={r.adj.worker} error={err("adj-worker")}>
          {({ id, invalid }) => <Select id={id} aria-invalid={invalid} value={worker} onChange={(e) => setWorker(e.target.value)}><option value="">{r.wizard.choose}</option>{(adj.data?.workers ?? []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>}
        </Field>
        <fieldset className="grid gap-2"><legend className="text-label">{r.adj.direction}</legend>
          <div className="flex flex-wrap gap-4">
            <Radio name="adj-dir" label={r.adj.minus} checked={dir === "minus"} onChange={() => setDir("minus")} />
            <Radio name="adj-dir" label={r.adj.plus} checked={dir === "plus"} onChange={() => setDir("plus")} />
          </div>
        </fieldset>
        <Field id="adj-amount" label={r.adj.amount} error={err("adj-amount")}>
          {({ id, invalid }) => <Input id={id} aria-invalid={invalid} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />}
        </Field>
        <Field id="adj-reason" label={r.adj.cols.reason}>
          {({ id }) => <Select id={id} value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>{["correction", "bonus", "clawback", "other"].map((k) => <option key={k} value={k}>{r.adj.reasons[k]}</option>)}</Select>}
        </Field>
        <Field id="adj-note" label={r.adj.note} hint={r.adj.noteHint} error={err("adj-note")}>
          {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} aria-invalid={invalid} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- Agent fees
function FeesTab() {
  const r = useR();
  const { locale } = useI18n();
  const money = useMoneyText();
  const fees = useFees();
  const { online, execOnly } = useActor();
  const run = useRunner();
  const [waive, setWaive] = useState<FeeView | null>(null);
  const items = fees.data?.items ?? [];
  const cols: OpsColumn<FeeView>[] = [
    { key: "worker", label: r.fees.cols.worker, cell: (x) => x.workerName, sort: (x) => x.workerName },
    { key: "kind", label: r.fees.cols.kind, cell: (x) => r.fees.kinds[x.kind] },
    { key: "month", label: r.fees.cols.month, cell: (x) => <span className="tabular">{x.month}</span>, sort: (x) => x.month },
    { key: "amount", label: r.fees.cols.amount, align: "right", cell: (x) => <Amount value={x.amount} size="sm" />, sort: (x) => x.amount },
    { key: "status", label: r.fees.cols.status, cell: (x) => <span className={cx("inline-flex h-6 items-center px-2.5 text-eyebrow", x.status === "due" ? "bg-warning-bg" : x.status === "waived" ? "bg-ink-100 text-fg-muted" : "bg-success-bg")}>{r.fees.status[x.status]}</span> },
    { key: "act", label: "", align: "right", card: false, cell: (x) => x.status === "due" && !execOnly ? <Button size="sm" variant="ghost" disabled={!online} onClick={() => setWaive(x)}>{r.fees.waive}</Button> : null },
  ];
  if (fees.isError) return <PanelError what={r.load.fees} onRetry={() => fees.refetch()} />;
  return (
    <>
      <p className="flex items-start gap-2 bg-bg-tint p-4 text-small"><Icon name="briefcase" size={16} aria-hidden className="mt-0.5 shrink-0 text-navy-600" />{fill(r.fees.rule, { amount: money(fees.data?.monthly ?? 0) })}</p>
      <OpsTable rows={items} columns={cols} rowKey={(x) => x.id} label={r.fees.listLabel} rowLabel={(x) => `${x.workerName} ${x.month}`} loading={fees.isPending}
        rowTone={(x) => (x.status === "waived" ? "muted" : null)} empty={<EmptyPanel title={r.fees.empty[0]} body={r.fees.empty[1]} />} />
      {waive && (
        <TextDialog open destructive onClose={() => setWaive(null)} title={r.fees.waiveTitle} label={r.act.reasonLabel} confirm={r.fees.waive}
          extra={<p className="text-small">{waive.workerName} · {r.fees.kinds[waive.kind]} · {waive.month} · {formatRelative(`${waive.month}-01`, locale)}</p>}
          onConfirm={async (reason) => !!(await run.go({ req: (h) => api.POST("/api/finance/revenue/fees/{id}/waive", { params: { path: { id: waive.id } }, body: { reason }, headers: h }) }, { success: r.fees.waived }))} />
      )}
    </>
  );
}

function FeeDialog({ onClose }: { onClose: () => void }) {
  const r = useR();
  const fees = useFees();
  const run = useRunner();
  const monthly = fees.data?.monthly;
  const [worker, setWorker] = useState("");
  const [kind, setKind] = useState<"licensing" | "platform" | "other">("licensing");
  const [month, setMonth] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const err = (k: string) => errors.find((e) => e.field === k)?.message;
  const amt = amount || (kind === "licensing" && monthly ? String(monthly) : "");
  const submit = async () => {
    const n = Number(amt);
    const e = [
      !worker && { field: "fee-worker", message: r.wizard.required },
      !/^\d{4}-\d{2}$/.test(month) && { field: "fee-month", message: r.wizard.required },
      !(Number.isInteger(n) && n > 0) && { field: "fee-amount", message: r.adj.positive },
    ].filter(Boolean) as { field: string; message: string }[];
    setErrors(e);
    if (e.length) return;
    const res = await run.go({ req: (h) => api.POST("/api/finance/revenue/fees", { body: { workerId: worker, kind, month, amount: n }, headers: h }) }, { success: r.fees.added });
    if (res) onClose();
  };
  return (
    <Dialog open onClose={onClose} title={r.fees.title} description={fill(r.fees.rule, { amount: String(monthly ?? "") })} footer={<><Button variant="ghost" onClick={onClose}>{r.cancel}</Button><Button className="m-press" loading={run.busy} onClick={submit}>{r.fees.submit}</Button></>}>
      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} className="grid gap-4">
        <ErrorSummary title={r.wizard.errors} errors={errors} />
        <Field id="fee-worker" label={r.fees.cols.worker} error={err("fee-worker")}>
          {({ id, invalid }) => <Select id={id} aria-invalid={invalid} value={worker} onChange={(e) => setWorker(e.target.value)}><option value="">{r.wizard.choose}</option>{(fees.data?.workers ?? []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>}
        </Field>
        <Field id="fee-kind" label={r.fees.cols.kind}>
          {({ id }) => <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>{(["licensing", "platform", "other"] as const).map((k) => <option key={k} value={k}>{r.fees.kinds[k]}</option>)}</Select>}
        </Field>
        <Field id="fee-month" label={r.fees.month} error={err("fee-month")}>
          {({ id, invalid }) => <Input id={id} aria-invalid={invalid} type="month" value={month} onChange={(e) => setMonth(e.target.value)} />}
        </Field>
        <Field id="fee-amount" label={r.adj.amount} error={err("fee-amount")}>
          {({ id, invalid }) => <Input id={id} aria-invalid={invalid} inputMode="numeric" value={amt} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />}
        </Field>
      </form>
    </Dialog>
  );
}
