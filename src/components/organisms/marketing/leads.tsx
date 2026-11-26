"use client";
// U9 Leads (plan 10 §7, board marketing/07 LD1–LD4): KPI strip, kanban/table/my tasks, drawer in URL (`lead=`),
// add sheet, CSV import, merge, bulk actions, export with reason. Search stays in component state (no PII in URLs, §10.2).
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatDate, formatMoney, formatRelative } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { ApiError, api, unwrap } from "@/lib/api/client";
import { mktKeys } from "@/lib/marketing/api";
import { fill } from "@/content/pages/mkt-common";
import { exportLeads, importConfirm, importPreview, useAddNote, useBulk, useConvert, useCreateLead, useLead, useLeads, useLogActivity, useMerge, usePatchLead, useSaveTask, useTasks, enrol, type ImportRow, type LeadDetail, type NewLead } from "@/lib/marketing/crm";
import { BOARD_STAGES, LOST_REASONS, isOpen } from "@/shared/marketing/lead-machine";
import { toE164 } from "@/shared/marketing/dedupe";
import { downloadCsv, maskPhone } from "@/lib/marketing/export";
import type { AutomationRule, Channel, ConsentState, Lead, LeadSource, LeadStage, Locale } from "@/shared/marketing/types";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Input, Select, Checkbox } from "@/components/atoms/field";
import { Tabs } from "@/components/atoms/tabs";
import { DataTable } from "@/components/atoms/data-table";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { BulkAction, BulkBar, CopyRef, EmptyPanel, KpiTile, MenuButton, PanelError, ReasonDialog, SavedViewTabs, TimelineItem, NoteBubble } from "@/components/molecules/ops/ops";
import { useNow } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { ChannelIcon, ConsentChip, LeadStageChip, PageHead, SourceBadge, StaffName, useM } from "@/components/atoms/marketing";
import { SERVICE_SLUGS, dateInput, fromDateInput, serviceLabel, useC, useStaffMap, F } from "@/components/molecules/marketing/crm";
import { ConvertDialog } from "@/components/organisms/marketing/convert";

const CHANNELS: Channel[] = ["email", "whatsapp", "sms"];
const NEXT = (s: LeadStage) => BOARD_STAGES[Math.min(BOARD_STAGES.indexOf(s) + 1, BOARD_STAGES.length - 1)];
const PREV = (s: LeadStage) => BOARD_STAGES[Math.max(BOARD_STAGES.indexOf(s) - 1, 0)];

export function LeadsView() {
  const c = useC();
  const m = useM();
  const { locale } = useI18n();
  const params = useUrlParams();
  const view = params.get("view") ?? "board";
  const openId = params.get("lead");
  const q = useLeads();
  const patch = usePatchLead();
  const toast = useToast();
  const staff = useStaffMap();
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("");
  const [source, setSource] = useState("");
  const [showLost, setShowLost] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [lostFor, setLostFor] = useState<Lead | null>(null);
  const [convertFor, setConvertFor] = useState<Lead | null>(null);
  const [adding, setAdding] = useState(params.get("new") === "1");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [announce, setAnnounce] = useState("");

  const all = useMemo(() => (q.data?.items ?? []).filter((l) => l.stage !== "merged"), [q.data]);
  const leads = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((l) => (!s || [l.name, l.org, l.id].some((x) => x?.toLowerCase().includes(s)))
      && (!owner || (owner === "none" ? !l.ownerId : l.ownerId === owner)) && (!source || l.source === source));
  }, [all, search, owner, source]);
  const filtered = !!(search || owner || source);

  async function move(l: Lead, to: LeadStage) {
    if (to === l.stage) return;
    if (to === "won") { toast({ title: c.leads.wonBlocked, action: { label: c.leads.convertInstead, onClick: () => setConvertFor(l) } }); return; }
    if (to === "lost") { setLostFor(l); return; }
    try {
      await patch.mutateAsync({ id: l.id, version: l.version, body: { stage: to, nextActionAt: l.nextActionAt } });
      const msg = fill(c.leads.moved, { name: l.name, stage: m.stage[to] });
      setAnnounce(msg);
      toast({ title: msg, tone: "success", action: { label: m.common.undo, onClick: () => patch.mutate({ id: l.id, version: l.version + 1, body: { stage: l.stage, nextActionAt: l.nextActionAt } }) } });
    } catch (e) { toast({ title: e instanceof ApiError && e.status === 409 ? c.drawer.conflict : errorCopy(e, locale), tone: "danger" }); }
  }

  const k = q.data?.kpi;
  const ids = [...sel];
  return (
    <div className="grid gap-5">
      <PageHead title={c.leads.title} sub={c.leads.sub} actions={<>
        <Button data-guide="marketing-import" variant="secondary" size="sm" onClick={() => setImporting(true)}><Icon name="upload" size={15} aria-hidden />{c.leads.import}</Button>
        <Button data-guide="marketing-add-lead" size="sm" onClick={() => setAdding(true)}><Icon name="plus" size={15} aria-hidden />{c.leads.add}</Button>
      </>} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 m-stagger">
        {(["total", "new", "contacted", "qualified", "quote_sent", "wonMonth"] as const).map((key, i) => (
          <div key={key} style={{ ["--i" as string]: i }}>{k ? <KpiTile label={c.leads.kpi[key]} value={<span className="tabular m-tick">{k[key]}</span>} /> : <div className="h-24 m-shimmer" />}</div>
        ))}
      </div>
      <SavedViewTabs views={[{ key: "board", label: c.leads.view.board }, { key: "table", label: c.leads.view.table }, { key: "tasks", label: c.leads.view.tasks }]}
        active={view} onChange={(v) => setUrlParams({ view: v === "board" ? null : v })} />
      {view !== "tasks" && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1 sm:max-w-sm">
            <span className="sr-only">{c.leads.search}</span>
            <Icon name="search" size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={c.leads.search} className="pl-9" />
          </label>
          <Select aria-label={c.leads.owner} value={owner} onChange={(e) => setOwner(e.target.value)} className="w-auto">
            <option value="">{c.leads.owner}: {m.common.all}</option>
            <option value="none">{c.leads.unassigned}</option>
            {staff.list.filter((s) => s.role === "marketing").map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select aria-label={c.leads.source} value={source} onChange={(e) => setSource(e.target.value)} className="w-auto">
            <option value="">{c.leads.source}: {m.common.all}</option>
            {[...new Set(all.map((l) => l.source))].map((s) => <option key={s} value={s}>{s.replace(/_/g, "")}</option>)}
          </Select>
          {filtered && <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setOwner(""); setSource(""); }}>{m.states.clear}</Button>}
          {view === "board" && <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setShowLost((v) => !v)}>{showLost ? c.leads.hideLost : c.leads.showLost}</Button>}
        </div>
      )}
      <p className="sr-only" aria-live="polite">{announce}</p>

      {q.isError ? <PanelError what={c.leads.title} onRetry={() => q.refetch()} />
        : view === "tasks" ? <MyTasks />
        : q.isPending ? <div className="grid gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-72 m-shimmer" />)}</div>
        : !all.length ? <EmptyPanel title={c.leads.empty} action={<Button size="sm" onClick={() => setAdding(true)}>{c.leads.add}</Button>} />
        : !leads.length ? <EmptyPanel title={m.states.filteredEmpty} action={<Button size="sm" variant="secondary" onClick={() => { setSearch(""); setOwner(""); setSource(""); }}>{m.states.clear}</Button>} />
        : view === "table" ? <LeadTable leads={leads} sel={sel} setSel={setSel} />
        : <Board leads={leads} showLost={showLost} onMove={move} />}

      <BulkBar count={sel.size} onClear={() => setSel(new Set())}>
        <AssignBulk ids={ids} onDone={() => setSel(new Set())} />
        <EnrolBulk ids={ids} onDone={() => setSel(new Set())} />
        <BulkAction icon="file" onClick={() => setExporting(true)}>{c.leads.bulk.export}</BulkAction>
      </BulkBar>

      {openId && <LeadDrawer id={openId} onConvert={setConvertFor} onLost={setLostFor} />}
      <LostDialog lead={lostFor} onClose={() => setLostFor(null)} />
      {convertFor && <ConvertDialog lead={convertFor} onClose={() => setConvertFor(null)} />}
      <AddLeadSheet open={adding} onClose={() => { setAdding(false); setUrlParams({ new: null }); }} />
      {importing && <ImportWizard onClose={() => setImporting(false)} />}
      <ReasonDialog open={exporting} onClose={() => setExporting(false)} title={c.leads.exportTitle} description={c.leads.exportBody} audited confirmLabel={c.leads.bulk.export}
        options={Object.entries(c.leads.exportReasons).map(([value, label]) => ({ value, label }))}
        onConfirm={async ({ reason, note }) => {
          const r = await exportLeads(ids, [c.leads.exportReasons[reason], note].filter(Boolean).join(", "));
          downloadCsv(`leads-${new Date().toISOString().slice(0, 10)}.csv`, r.csv);
          toast({ title: fill(c.leads.exported, { n: r.count }), tone: "success" });
          setExporting(false);
        }} />
    </div>
  );
}

// ---------------------------------------------------------------- board (role=list, "Move to…", [ / ] keys, pointer drag)
function Board({ leads, showLost, onMove }: { leads: Lead[]; showLost: boolean; onMove: (l: Lead, to: LeadStage) => void }) {
  const c = useC();
  const m = useM();
  const stages = BOARD_STAGES.filter((s) => showLost || s !== "lost");
  const [over, setOver] = useState<LeadStage | null>(null);
  const [tab, setTab] = useState<LeadStage>("new");
  const drop = (s: LeadStage) => (e: DragEvent) => { e.preventDefault(); setOver(null); const l = leads.find((x) => x.id === e.dataTransfer.getData("text/plain")); if (l) onMove(l, s); };
  return (
    <>
      {/* phone: stage tabs instead of columns */}
      <div className="md:hidden">
        <div role="tablist" className="no-scrollbar -mx-gutter flex gap-1 overflow-x-auto px-gutter pb-2">
          {stages.map((s) => (
            <button key={s} role="tab" aria-selected={tab === s} onClick={() => setTab(s)} className={cx("h-9 shrink-0 px-3 text-small", tab === s ? "bg-secondary text-on-secondary" : "bg-bg-subtle")}>
              {m.stage[s]} <span className="tabular">{leads.filter((l) => l.stage === s).length}</span>
            </button>
          ))}
        </div>
        <ul className="grid gap-2">{leads.filter((l) => l.stage === tab).map((l) => <li key={l.id}><LeadCard lead={l} onMove={onMove} /></li>)}</ul>
      </div>
      <div className="no-scrollbar hidden gap-3 overflow-x-auto pb-2 md:grid m-stagger" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(15rem, 1fr))` }}>
        {stages.map((s, i) => {
          const col = leads.filter((l) => l.stage === s);
          return (
            <section key={s} aria-label={m.stage[s]} style={{ ["--i" as string]: i }} onDragOver={(e) => { e.preventDefault(); setOver(s); }} onDragLeave={() => setOver(null)} onDrop={drop(s)}
              className={cx("flex min-h-72 flex-col gap-2 bg-ink-100 p-2.5 transition-colors", over === s && "bg-navy-50 outline-2 outline-dashed outline-navy-400")}>
              <h2 className="flex items-center justify-between px-1 text-small font-medium"><LeadStageChip stage={s} /><span className="tabular text-fg-subtle">{col.length}</span></h2>
              {col.length ? <ul role="list" className="grid gap-2">{col.map((l) => <li key={l.id} role="listitem"><LeadCard lead={l} onMove={onMove} /></li>)}</ul>
                : <p className="grid flex-1 place-items-center text-small text-fg-subtle">{c.leads.emptyCol}</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}

function LeadCard({ lead: l, onMove }: { lead: Lead; onMove: (l: Lead, to: LeadStage) => void }) {
  const c = useC();
  const m = useM();
  const { locale } = useI18n();
  const now = useNow();
  const [drag, setDrag] = useState(false);
  const overdue = !!(now && l.nextActionAt && Date.parse(l.nextActionAt) < now);
  const service = l.serviceInterest[0];
  return (
    <article data-guide="marketing-lead-card" draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", l.id); setDrag(true); }} onDragEnd={() => setDrag(false)}
      onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === "]") onMove(l, NEXT(l.stage)); if (e.key === "[") onMove(l, PREV(l.stage)); }}
      tabIndex={0} aria-label={`${l.name}, ${m.stage[l.stage]}`}
      className={cx("group grid gap-2 border border-border bg-white p-3 text-small shadow-xs focus-visible:outline-2 focus-visible:outline-focus", drag && "m-lift opacity-80")}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => setUrlParams({ lead: l.id, tab: null })} className="min-w-0 text-left">
          <span className="block truncate font-medium" title={l.name}>{l.name}</span>
          {l.org && <span className="block truncate text-eyebrow text-fg-subtle" title={l.org}>{l.org}</span>}
        </button>
        <MenuButton label={<span className="sr-only">{c.leads.moveTo}</span>} icon="menu" align="right">
          {(close) => (
            <div className="grid min-w-44 gap-0.5 p-1">
              <p className="px-2 py-1 text-eyebrow text-fg-subtle">{c.leads.moveTo}</p>
              {BOARD_STAGES.filter((s) => s !== l.stage).map((s) => (
                <button key={s} type="button" className="px-2 py-1.5 text-left text-small hover:bg-navy-50" onClick={() => { close(); onMove(l, s); }}>{m.stage[s]}</button>
              ))}
            </div>
          )}
        </MenuButton>
      </div>
      {service && <span className="truncate text-fg-muted">{serviceLabel(service)}</span>}
      <div className="flex flex-wrap items-center gap-1.5"><SourceBadge touch={l.lastTouch} /></div>
      <div className="flex items-center justify-between gap-2 text-eyebrow text-fg-subtle">
        <span>{now ? formatRelative(l.createdAt, locale, now) : formatDate(l.createdAt, locale)}</span>
        {l.nextActionAt && <span className={cx("inline-flex items-center gap-1 px-2 py-0.5", overdue ? "bg-danger-bg text-danger" : "bg-bg-subtle")}><Icon name="clock" size={11} aria-hidden />{overdue ? c.leads.overdue : formatDate(l.nextActionAt, locale)}</span>}
      </div>
      {l.estimatedValue ? <span className="text-eyebrow tabular text-fg-muted">{formatMoney(l.estimatedValue, "RWF", locale)}</span> : null}
    </article>
  );
}

function LeadTable({ leads, sel, setSel }: { leads: Lead[]; sel: Set<string>; setSel: (s: Set<string>) => void }) {
  const c = useC();
  const { locale } = useI18n();
  const staff = useStaffMap();
  const toggle = (id: string) => { const n = new Set(sel); if (n.has(id)) n.delete(id); else n.add(id); setSel(n); };
  return (
    <DataTable rows={leads} rowKey={(l) => l.id} pageSize={50} onRowClick={(l) => setUrlParams({ lead: l.id })}
      columns={[
        { key: "sel", header: "", cell: (l) => <input type="checkbox" aria-label={l.name} checked={sel.has(l.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggle(l.id)} className="size-4 accent-navy-700" /> },
        { key: "name", header: c.add.name, sortValue: (l) => l.name, cell: (l) => <span className="block max-w-56 truncate font-medium" title={l.name}>{l.name}{l.org && <span className="block truncate text-eyebrow font-normal text-fg-subtle">{l.org}</span>}</span> },
        { key: "id", header: "ID", cell: (l) => <Link href={localHref(locale, `/marketing/leads/${l.id}`)} onClick={(e) => e.stopPropagation()} className="tabular text-fg-muted underline-offset-2 hover:text-link-hover hover:underline">{l.id}</Link> },
        { key: "stage", header: c.drawer.stage, sortValue: (l) => BOARD_STAGES.indexOf(l.stage), cell: (l) => <LeadStageChip stage={l.stage} /> },
        { key: "source", header: c.leads.source, cell: (l) => <SourceBadge touch={l.lastTouch} /> },
        { key: "owner", header: c.leads.owner, cell: (l) => <StaffName staff={staff.of(l.ownerId)} /> },
        { key: "next", header: c.leads.next, sortValue: (l) => l.nextActionAt ?? "", cell: (l) => (l.nextActionAt ? formatDate(l.nextActionAt, locale) : "") },
        { key: "phone", header: c.add.phone, cell: (l) => <span className="tabular">{maskPhone(l.phoneE164)}</span> },
      ]} />
  );
}

// ---------------------------------------------------------------- bulk
function AssignBulk({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const c = useC();
  const staff = useStaffMap();
  const bulk = useBulk();
  return (
    <MenuButton label={c.leads.bulk.assign} icon="user">
      {(close) => <div className="grid min-w-48 p-1">{staff.list.filter((s) => s.role === "marketing").map((s) => (
        <button key={s.id} type="button" className="px-2 py-1.5 text-left text-small text-fg hover:bg-navy-50" onClick={async () => { close(); await bulk.mutateAsync({ ids, ownerId: s.id }); onDone(); }}>{s.name}</button>
      ))}</div>}
    </MenuButton>
  );
}
function EnrolBulk({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const c = useC();
  const toast = useToast();
  const { locale } = useI18n();
  const q = useQuery({ queryKey: mktKeys.cmp("automations", "active"), queryFn: () => unwrap<{ items: AutomationRule[] }>(api.GET("/api/admin/crm/automations", { params: { query: { active: "1" } } })) });
  const rules = (q.data?.items ?? []).filter((r) => r.active && !r.system);
  return (
    <MenuButton label={c.leads.bulk.enrol} icon="refresh">
      {(close) => <div className="grid min-w-52 p-1">{rules.map((r) => (
        <button key={r.id} type="button" className="px-2 py-1.5 text-left text-small text-fg hover:bg-navy-50" onClick={async () => {
          close();
          try { const res = await enrol(r.id, ids); toast({ title: fill(c.leads.bulk.enrolled, { n: res.enrolled }), tone: "success" }); onDone(); }
          catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
        }}>{r.name}</button>
      ))}{!rules.length && <p className="px-2 py-1.5 text-small text-fg-subtle"></p>}</div>}
    </MenuButton>
  );
}

// ---------------------------------------------------------------- lost reason
function LostDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const c = useC();
  const { locale } = useI18n();
  const patch = usePatchLead();
  return (
    <ReasonDialog open={!!lead} onClose={onClose} title={c.leads.lostTitle} description={lead?.name} destructive confirmLabel={c.leads.lostConfirm} asRadios
      options={LOST_REASONS.map((r) => ({ value: r, label: c.leads.reasons[r] }))}
      onConfirm={async ({ reason, note }) => {
        if (!lead) return;
        try { await patch.mutateAsync({ id: lead.id, version: lead.version, body: { stage: "lost", lostReason: reason as Lead["lostReason"], lostNote: note || undefined } }); onClose(); }
        catch (e) { throw new Error(errorCopy(e, locale)); }
      }} />
  );
}

// ---------------------------------------------------------------- my tasks
function MyTasks() {
  const c = useC();
  const m = useM();
  const { locale } = useI18n();
  const now = useNow();
  const q = useTasks();
  const save = useSaveTask();
  const toast = useToast();
  if (q.isError) return <PanelError what={c.leads.view.tasks} onRetry={() => q.refetch()} />;
  if (q.isPending || !now) return <div className="grid gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 m-shimmer" />)}</div>;
  const open = (q.data?.items ?? []).filter((t) => !t.done);
  if (!open.length) return <EmptyPanel title={c.leads.tasks.empty} />;
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const groups = [
    { key: "overdue", items: open.filter((t) => Date.parse(t.dueAt) < now) },
    { key: "today", items: open.filter((t) => Date.parse(t.dueAt) >= now && Date.parse(t.dueAt) <= end.getTime()) },
    { key: "upcoming", items: open.filter((t) => Date.parse(t.dueAt) > end.getTime()) },
  ] as const;
  return (
    <div className="grid gap-6">
      {groups.map((g) => g.items.length ? (
        <section key={g.key} aria-labelledby={`tk-${g.key}`}>
          <h2 id={`tk-${g.key}`} className={cx("mb-2 text-small font-medium", g.key === "overdue" && "text-danger")}>{c.leads.tasks[g.key]} <span className="tabular text-fg-subtle">{g.items.length}</span></h2>
          <ul className="grid gap-2 m-stagger">{g.items.map((t, i) => (
            <li key={t.id} style={{ ["--i" as string]: i }} className="flex items-center gap-3 border border-border bg-white p-3">
              <input type="checkbox" aria-label={`${c.leads.tasks.complete}: ${t.title}`} className="size-5 accent-navy-700" onChange={async () => {
                await save.mutateAsync({ id: t.id, done: true });
                toast({ title: c.leads.tasks.done, tone: "success", action: { label: m.common.undo, onClick: () => save.mutate({ id: t.id, done: false }) } });
              }} />
              <span className="min-w-0 flex-1"><span className="block truncate text-small font-medium">{t.title}</span>
                <button type="button" className="truncate text-eyebrow text-link underline-offset-2 hover:underline" onClick={() => setUrlParams({ view: null, lead: t.subject.id })}>{t.subject.label}</button></span>
              <span className="text-eyebrow tabular text-fg-subtle">{formatDate(t.dueAt, locale)}</span>
            </li>
          ))}</ul>
        </section>
      ) : null)}
    </div>
  );
}

// ---------------------------------------------------------------- drawer
function LeadDrawer({ id, onConvert, onLost }: { id: string; onConvert: (l: Lead) => void; onLost: (l: Lead) => void }) {
  const c = useC();
  const m = useM();
  const { locale } = useI18n();
  const q = useLead(id);
  const close = () => setUrlParams({ lead: null, tab: null });
  const d = q.data;
  const l = d?.lead;
  useEffect(() => { if (l?.stage === "merged" && l.mergedIntoId) setUrlParams({ lead: l.mergedIntoId }); }, [l?.stage, l?.mergedIntoId]);
  return (
    <Dialog open onClose={close} side="right" title={l ? l.name : m.states.loading} className="sm:w-[34rem]"
      description={l ? <span className="flex flex-wrap items-center gap-2"><CopyRef value={l.id} />{l.org && <span>{l.org}</span>}<Link href={localHref(locale, `/marketing/leads/${l.id}`)} className="text-link underline-offset-2 hover:underline">{c.drawer.openPage}</Link></span> : undefined}
      footer={l && <DrawerFooter lead={l} onConvert={onConvert} onLost={onLost} />}>
      {q.isError ? <PanelError what={id} onRetry={() => q.refetch()} />
        : !d || !l ? <div className="grid gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 m-shimmer" />)}</div> : <LeadBody d={d} />}
    </Dialog>
  );
}

function LeadBody({ d }: { d: LeadDetail }) {
  const c = useC();
  const { locale } = useI18n();
  const tab = useUrlParams().get("tab") ?? "activity";
  const l = d.lead;
  return (
    <div className="grid gap-5">
      <Facts d={d} />
      {d.duplicates.length > 0 && <DuplicateBanner lead={l} dups={d.duplicates} />}
      <Tabs value={tab} onChange={(t) => setUrlParams({ tab: t === "activity" ? null : t })} tabs={[
        { id: "activity", label: c.drawer.tabs.activity, content: <ActivityTab d={d} /> },
        { id: "tasks", label: c.drawer.tabs.tasks, count: d.tasks.filter((t) => !t.done).length, content: <TasksTab d={d} /> },
        { id: "notes", label: c.drawer.tabs.notes, count: d.notes.length, content: <NotesTab d={d} /> },
        { id: "attribution", label: c.drawer.tabs.attribution, content: <AttributionTab lead={l} /> },
      ]} />
      <p className="text-eyebrow text-fg-subtle">{fill(c.drawer.retention, { d: formatDate(d.retentionAt, locale) })}</p>
    </div>
  );
}

// ---------------------------------------------------------------- full page (plan 11 §8.2 `ai.lead_captured` deep link). URL: ?tab=
export function LeadPage({ id }: { id: string }) {
  const c = useC();
  const { locale } = useI18n();
  const q = useLead(id);
  const [lostFor, setLostFor] = useState<Lead | null>(null);
  const [convertFor, setConvertFor] = useState<Lead | null>(null);
  const d = q.data;
  const l = d?.lead;
  // Merged leads live on under the surviving record.
  useEffect(() => { if (l?.stage === "merged" && l.mergedIntoId) window.location.replace(localHref(locale, `/marketing/leads/${l.mergedIntoId}`)); }, [l?.stage, l?.mergedIntoId, locale]);
  const back = <Link href={localHref(locale, "/marketing/leads")} className="inline-flex w-fit items-center gap-1 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} className="rotate-180" aria-hidden />{c.drawer.backToLeads}</Link>;
  const err = q.error instanceof ApiError ? q.error : null;
  return (
    <div className="grid gap-4">
      {back}
      {err?.isNotFound ? <EmptyPanel title={c.drawer.notFound} />
        : err?.isForbidden ? <EmptyPanel title={errorCopy(err, locale)} />
        : q.isError ? <PanelError what={id} onRetry={() => q.refetch()} />
        : !d || !l ? <div className="grid gap-3" aria-busy>{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 m-shimmer" />)}</div> : (
        <>
          <PageHead eyebrow={<span className="inline-flex flex-wrap items-center gap-2"><CopyRef value={l.id} /><LeadStageChip stage={l.stage} /></span>}
            title={<span className="break-words">{l.name}</span>} sub={l.org ?? undefined}
            actions={<DrawerFooter lead={l} onConvert={setConvertFor} onLost={setLostFor} />} />
          <div className="max-w-3xl border border-border bg-white p-4 sm:p-6"><LeadBody d={d} /></div>
        </>
      )}
      <LostDialog lead={lostFor} onClose={() => setLostFor(null)} />
      {convertFor && <ConvertDialog lead={convertFor} onClose={() => setConvertFor(null)} />}
    </div>
  );
}

function Facts({ d }: { d: LeadDetail }) {
  const c = useC();
  const m = useM();
  const { locale } = useI18n();
  const toast = useToast();
  const staff = useStaffMap();
  const patch = usePatchLead();
  const l = d.lead;
  const save = async (body: Parameters<typeof patch.mutateAsync>[0]["body"]) => {
    try { await patch.mutateAsync({ id: l.id, version: l.version, body }); toast({ title: c.drawer.saved, tone: "success" }); }
    catch (e) { toast({ title: e instanceof ApiError && e.status === 409 ? c.drawer.conflict : errorCopy(e, locale), tone: "danger" }); }
  };
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 text-small text-fg-muted">
        <LeadStageChip stage={l.stage} /><SourceBadge touch={l.lastTouch} /><span>{fill(c.drawer.created, { d: formatDate(l.createdAt, locale) })}</span>
      </div>
      <div>
        <p className="mb-1.5 text-eyebrow text-fg-subtle">{c.drawer.consent}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {CHANNELS.map((ch) => <ConsentChip key={ch} channel={ch} state={l.consent[ch]} />)}
          <details className="relative">
            <summary className="cursor-pointer list-none text-eyebrow text-link underline-offset-2 hover:underline">{c.drawer.history}</summary>
            <ul className="absolute z-20 mt-1 grid w-64 gap-1 border border-border bg-white p-2 text-eyebrow shadow-md m-pop">
              {d.consentHistory.map((h, i) => <li key={i} className="flex justify-between gap-2"><span>{m.consent[h.channel]}: {m.consent[h.state]}</span><span className="text-fg-subtle">{formatDate(h.at, locale)} · {h.source}</span></li>)}
            </ul>
          </details>
        </div>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <F label={c.drawer.owner}>
          <Select value={l.ownerId ?? ""} onChange={(e) => save({ ownerId: e.target.value || undefined })}>
            <option value="">{c.leads.unassigned}</option>
            {staff.list.filter((s) => s.role === "marketing").map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </F>
        <F label={c.drawer.interest}>
          <Select value={l.serviceInterest[0] ?? ""} onChange={(e) => save({ serviceInterest: e.target.value ? [e.target.value] : [] })}>
            <option value=""></option>
            {SERVICE_SLUGS.map((s) => <option key={s} value={s}>{serviceLabel(s)}</option>)}
          </Select>
        </F>
        {isOpen(l.stage) && (
          <F label={c.drawer.next}>
            <Input type="date" required defaultValue={dateInput(l.nextActionAt)} onBlur={(e) => e.target.value && e.target.value !== dateInput(l.nextActionAt) && save({ nextActionAt: fromDateInput(e.target.value) })} />
          </F>
        )}
        <F label={c.drawer.value} optional>
          <Input inputMode="numeric" defaultValue={l.estimatedValue ?? ""} onBlur={(e) => { const n = Math.round(Number(e.target.value.replace(/\D/g, ""))); if (n !== (l.estimatedValue ?? 0)) save({ estimatedValue: n || undefined }); }} />
        </F>
      </dl>
      <p className="flex items-center gap-2 text-small"><Icon name="phone" size={14} aria-hidden />{maskPhone(l.phoneE164) || ""}{l.email && <><Icon name="mail" size={14} aria-hidden className="ml-2" /><span className="truncate">{l.email}</span></>}</p>
    </div>
  );
}

function DuplicateBanner({ lead, dups }: { lead: Lead; dups: Lead[] }) {
  const c = useC();
  const merge = useMerge();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [keep, setKeep] = useState(lead.id);
  const all = [lead, ...dups];
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 bg-warning-bg p-3 text-small text-warning m-rise">
      <Icon name="users" size={16} aria-hidden />
      <span className="min-w-0 flex-1"><strong>{c.drawer.dupTitle}.</strong> {fill(c.drawer.dupBody, { name: dups[0].name })}</span>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>{c.drawer.merge}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={c.merge.title} description={c.merge.body}
        footer={<Button loading={merge.isPending} onClick={async () => { await merge.mutateAsync({ survivorId: keep, ids: all.map((x) => x.id) }); toast({ title: c.merge.done, tone: "success" }); setOpen(false); setUrlParams({ lead: keep }); }}>{c.drawer.merge}</Button>}>
        <fieldset className="grid gap-2"><legend className="sr-only">{c.merge.keep}</legend>
          {all.map((x) => (
            <label key={x.id} className={cx("flex cursor-pointer items-center gap-3 border p-3", keep === x.id ? "border-navy-700 bg-navy-50" : "border-border")}>
              <input type="radio" name="keep" checked={keep === x.id} onChange={() => setKeep(x.id)} className="accent-navy-700" />
              <span className="min-w-0 flex-1"><span className="block font-medium">{x.name}</span><span className="text-eyebrow text-fg-subtle tabular">{x.id} · {maskPhone(x.phoneE164)} · {x.email ?? ""}</span></span>
              <LeadStageChip stage={x.stage} />
            </label>
          ))}
        </fieldset>
      </Dialog>
    </div>
  );
}

function ActivityTab({ d }: { d: LeadDetail }) {
  const c = useC();
  const { locale } = useI18n();
  const log = useLogActivity();
  const toast = useToast();
  const staff = useStaffMap();
  const items = [...d.activities].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div className="grid gap-3">
      <Button size="sm" variant="secondary" className="justify-self-start" loading={log.isPending} onClick={async () => { await log.mutateAsync({ id: d.lead.id, kind: "call", text: c.drawer.log }); toast({ title: c.drawer.logged, tone: "success" }); }}>
        <Icon name="phone" size={14} aria-hidden />{c.drawer.log}
      </Button>
      <ol className="grid">{items.map((a, i) => (
        <TimelineItem key={a.id} kind={a.kind === "note" ? "note" : a.kind === "stage" || a.kind === "reopened" ? "status" : a.kind === "converted" ? "payment" : a.kind === "created" || a.kind === "form" ? "system" : "message"}
          title={a.text} actor={staff.of(a.by)?.name ?? a.by} time={formatDate(a.at, locale)} last={i === items.length - 1} />
      ))}</ol>
    </div>
  );
}

function TasksTab({ d }: { d: LeadDetail }) {
  const c = useC();
  const { locale } = useI18n();
  const save = useSaveTask();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  return (
    <div className="grid gap-3">
      <ul className="grid gap-2">{d.tasks.map((t) => (
        <li key={t.id} className="flex items-center gap-3 border border-border p-2.5 text-small">
          <input type="checkbox" checked={t.done} aria-label={t.title} onChange={() => save.mutate({ id: t.id, done: !t.done })} className="size-4 accent-navy-700" />
          <span className={cx("min-w-0 flex-1 truncate", t.done && "line-through text-fg-subtle")}>{t.title}</span>
          <span className="text-eyebrow tabular text-fg-subtle">{formatDate(t.dueAt, locale)}</span>
        </li>
      ))}</ul>
      <form className="flex flex-wrap items-end gap-2" onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() || !due) return;
        await save.mutateAsync({ title: title.trim(), dueAt: fromDateInput(due), kind: "follow_up", subject: { type: "lead", id: d.lead.id, label: d.lead.name } });
        setTitle(""); setDue("");
      }}>
        <F label={c.drawer.taskTitle} className="min-w-40 flex-1"><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></F>
        <F label={c.drawer.due}><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} required /></F>
        <Button type="submit" size="sm" loading={save.isPending}>{c.drawer.addTask}</Button>
      </form>
    </div>
  );
}

export function NotesTab({ d, subject = "lead" }: { d: { lead?: Lead; notes: LeadDetail["notes"]; id?: string }; subject?: "lead" | "customer" }) {
  const c = useC();
  const { locale } = useI18n();
  const staff = useStaffMap();
  const add = useAddNote();
  const [body, setBody] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const mention = /@(\w*)$/.exec(body)?.[1];
  const picks = mention !== undefined ? staff.list.filter((s) => s.name.toLowerCase().includes(mention.toLowerCase())) : [];
  const id = d.lead?.id ?? d.id ?? "";
  return (
    <div className="grid gap-3">
      <ul className="grid gap-2">{d.notes.map((n) => <li key={n.id}><NoteBubble author={staff.of(n.by)?.name ?? n.by} time={formatDate(n.at, locale)}>{n.body}</NoteBubble></li>)}</ul>
      <div className="relative grid gap-2">
        <textarea ref={ref} value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={c.drawer.note} aria-label={c.drawer.note}
          className="w-full border border-border-strong bg-white p-3 text-small focus-visible:outline-2 focus-visible:outline-focus" />
        {picks.length > 0 && (
          <ul role="listbox" className="absolute bottom-full z-20 mb-1 grid w-60 gap-0.5 border border-border bg-white p-1 shadow-md m-pop">
            {picks.map((s) => <li key={s.id}><button type="button" className="w-full px-2 py-1.5 text-left text-small hover:bg-navy-50" onClick={() => { setBody(body.replace(/@\w*$/, `@${s.name} `)); ref.current?.focus(); }}><StaffName staff={s} /></button></li>)}
          </ul>
        )}
        <Button size="sm" className="justify-self-end" disabled={!body.trim()} loading={add.isPending} onClick={async () => {
          await add.mutateAsync({ type: subject, id, body: body.trim(), mentions: staff.list.filter((s) => body.includes(`@${s.name}`)).map((s) => s.id) });
          setBody("");
        }}>{c.drawer.addNote}</Button>
      </div>
    </div>
  );
}

export function AttributionTab({ lead }: { lead: Pick<Lead, "firstTouch" | "lastTouch"> }) {
  const c = useC();
  const { locale } = useI18n();
  const card = (title: string, t?: Lead["firstTouch"]) => (
    <div className="grid gap-2 border border-border bg-white p-3 text-small">
      <p className="text-eyebrow text-fg-subtle">{title}</p>
      {t ? <>
        <SourceBadge touch={t} />
        <dl className="grid grid-cols-[6rem_1fr] gap-x-2 gap-y-1 text-eyebrow">
          <dt className="text-fg-subtle">utm_medium</dt><dd>{t.medium}</dd>
          {t.campaign && <><dt className="text-fg-subtle">utm_campaign</dt><dd className="break-all">{t.campaign}</dd></>}
          <dt className="text-fg-subtle">landing</dt><dd className="break-all">{t.landing}</dd>
          <dt className="text-fg-subtle">at</dt><dd>{formatDate(t.at, locale)}</dd>
        </dl>
      </> : <p className="text-fg-muted">{c.drawer.direct}</p>}
    </div>
  );
  return <div className="grid gap-3 sm:grid-cols-2">{card(c.drawer.first, lead.firstTouch)}{card(c.drawer.last, lead.lastTouch)}</div>;
}

function DrawerFooter({ lead: l, onConvert, onLost }: { lead: Lead; onConvert: (l: Lead) => void; onLost: (l: Lead) => void }) {
  const c = useC();
  const online = useOnline();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button data-guide="marketing-convert" size="sm" disabled={!online || l.stage === "won" || l.stage === "merged"} onClick={() => onConvert(l)}>{c.drawer.convert}</Button>
      <span title={c.drawer.quoteNo}><Button size="sm" variant="secondary" disabled aria-describedby={`q-${l.id}`}>{c.drawer.quote}</Button></span>
      <span id={`q-${l.id}`} className="sr-only">{c.drawer.quoteNo}</span>
      {isOpen(l.stage) && <Button size="sm" variant="ghost" className="ml-auto text-danger" onClick={() => onLost(l)}>{c.drawer.lost}</Button>}
    </div>
  );
}

// ---------------------------------------------------------------- add lead sheet
function AddLeadSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useC();
  const m = useM();
  const { locale } = useI18n();
  const create = useCreateLead();
  const toast = useToast();
  const [f, setF] = useState({ source: "" as LeadSource | "", name: "", org: "", phone: "", email: "", service: "", language: locale as Locale, next: "" });
  const [consent, setConsent] = useState<Record<Channel, boolean>>({ email: false, whatsapp: false, sms: false });
  const [dups, setDups] = useState<Lead[]>([]);
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function submit(force = false) {
    const e: Record<string, string> = {};
    if (!f.source) e.source = c.add.required;
    if (!f.name.trim()) e.name = c.add.required;
    if (f.phone && !toE164(f.phone)) e.phone = c.add.invalidPhone;
    if (!f.phone && !f.email) e.phone = c.add.required;
    if (!f.next) e.next = c.add.required;
    setErr(e);
    if (Object.keys(e).length) return;
    try {
      const r = await create.mutateAsync({ source: f.source as NewLead["source"], name: f.name.trim(), org: f.org || undefined, phone: f.phone || undefined, email: f.email || undefined, language: f.language,
        serviceInterest: f.service ? [f.service] : [], nextActionAt: fromDateInput(f.next)!, force,
        consent: Object.fromEntries(CHANNELS.map((ch) => [ch, consent[ch] ? "in" : "unknown"])) as Record<Channel, ConsentState> });
      if (!r.lead) { setDups(r.duplicates); return; }
      toast({ title: fill(c.add.created, { id: r.lead.id }), tone: "success" });
      setF({ source: "", name: "", org: "", phone: "", email: "", service: "", language: locale, next: "" }); setDups([]); onClose();
      setUrlParams({ lead: r.lead.id });
    } catch (x) { toast({ title: errorCopy(x, locale), tone: "danger" }); }
  }
  return (
    <Dialog open={open} onClose={onClose} side="right" title={c.add.title}
      footer={<div className="flex gap-2">{dups.length > 0 && <Button variant="secondary" onClick={() => submit(true)}>{c.add.saveAnyway}</Button>}<Button loading={create.isPending} onClick={() => submit()}>{c.add.save}</Button></div>}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        {dups.length > 0 && <p role="alert" className="bg-warning-bg p-3 text-small text-warning">{c.add.dupWarn} {dups.map((d) => `${d.name} (${d.id})`).join(", ")}</p>}
        <F label={c.add.source} error={err.source}>
          <Select value={f.source} onChange={set("source")} required><option value=""></option>{Object.entries(c.add.sources).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </F>
        <F label={c.add.name} error={err.name}><Input value={f.name} onChange={set("name")} required autoComplete="off" /></F>
        <F label={c.add.org} optional><Input value={f.org} onChange={set("org")} /></F>
        <div className="grid gap-4 sm:grid-cols-2">
          <F label={c.add.phone} error={err.phone} hint="+250"><Input type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} placeholder="07X XXX XXXX" /></F>
          <F label={c.add.email} optional><Input type="email" value={f.email} onChange={set("email")} /></F>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <F label={c.add.service} optional><Select value={f.service} onChange={set("service")}><option value=""></option>{SERVICE_SLUGS.map((s) => <option key={s} value={s}>{serviceLabel(s)}</option>)}</Select></F>
          <F label={c.add.language}><Select value={f.language} onChange={set("language")}>{(["rw", "en", "fr"] as const).map((l) => <option key={l} value={l}>{m.locale[l]}</option>)}</Select></F>
        </div>
        <fieldset className="grid gap-2"><legend className="mb-1 text-small font-medium">{c.add.consent}</legend>
          {CHANNELS.map((ch) => <Checkbox key={ch} label={<span className="inline-flex items-center gap-2"><ChannelIcon channel={ch} label /></span>} checked={consent[ch]} onChange={(e) => setConsent({ ...consent, [ch]: e.target.checked })} />)}
          <p className="text-eyebrow text-fg-subtle">{c.add.consentNote}</p>
        </fieldset>
        <F label={c.add.next} error={err.next}><Input type="date" value={f.next} onChange={set("next")} required /></F>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- CSV import wizard
const FIELDS = ["name", "phone", "email", "org", "service", "consent_email", "consent_whatsapp", "consent_sms"] as const;
/** shortcut: naive CSV split (quoted commas supported, no multi-line cells), use a parser if imports carry addresses. */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((x) => x.trim());
  const split = (s: string) => (s.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? []).slice(0, -1).map((x) => x.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim());
  const head = split(lines[0] ?? "");
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [head[i] ?? `col${i}`, v])));
}
function ImportWizard({ onClose }: { onClose: () => void }) {
  const c = useC();
  const m = useM();
  const { locale } = useI18n();
  const toast = useToast();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ jobId: string; rows: ImportRow[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  const step = preview ? 3 : rows.length ? 2 : 1;
  const bad = preview?.rows.filter((r) => r.errors.length || r.dupInFile || r.dupInCrm).length ?? 0;
  const okN = (preview?.rows.length ?? 0) - bad;
  async function onFile(f?: File) {
    if (!f) return;
    const parsed = parseCsv(await f.text());
    setRows(parsed);
    const head = parsed[0] ? Object.keys(parsed[0]) : [];
    setMap(Object.fromEntries(FIELDS.map((fl) => [fl, head.find((h) => h.toLowerCase().replace(/[^a-z]/g, "").includes(fl.replace(/_/g, "").replace("org", "comp")) || h.toLowerCase().includes(fl.split("_").at(-1)!)) ?? ""])));
  }
  return (
    <Dialog open onClose={onClose} title={c.importer.title} description={c.importer.nothing} className="sm:w-[44rem]"
      footer={<div className="flex gap-2">
        {step === 2 && <Button loading={busy} disabled={!map.name} onClick={async () => { setBusy(true); try { setPreview(await importPreview(rows, map)); } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); } setBusy(false); }}>{m.common.next}</Button>}
        {step === 3 && <Button loading={busy} disabled={!okN} onClick={async () => {
          setBusy(true);
          try { const r = await importConfirm(preview!.jobId); toast({ title: fill(c.importer.done, r), tone: "success" }); onClose(); } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
          setBusy(false);
        }}>{fill(c.importer.confirm, { n: okN })}</Button>}
      </div>}>
      <ol className="mb-4 flex gap-2 text-eyebrow">{[c.importer.step1, c.importer.step2, c.importer.step3].map((s, i) => <li key={s} className={cx("px-2.5 py-1", step === i + 1 ? "bg-secondary text-on-secondary" : step > i + 1 ? "bg-success-bg text-success" : "bg-bg-subtle")}>{i + 1}. {s}</li>)}</ol>
      {step === 1 && <label className="grid cursor-pointer place-items-center gap-2 border-2 border-dashed border-border-strong p-10 text-center text-small hover:bg-navy-50">
        <Icon name="upload" size={22} aria-hidden />{c.importer.pick}
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>}
      {step === 2 && <div className="grid gap-3">
        <p className="text-small text-fg-muted">{c.importer.consentNote}</p>
        <div className="grid gap-3 sm:grid-cols-2">{FIELDS.map((fl) => (
          <F key={fl} label={c.importer.fields[fl]}><Select value={map[fl] ?? ""} onChange={(e) => setMap({ ...map, [fl]: e.target.value })}><option value="">{c.importer.ignore}</option>{cols.map((h) => <option key={h} value={h}>{h}</option>)}</Select></F>
        ))}</div>
      </div>}
      {step === 3 && preview && <div className="grid gap-3">
        <p className="text-small font-medium">{fill(c.importer.summary, { ok: okN, bad })}</p>
        <div className="max-h-80 overflow-auto border border-border">
          <table className="w-full text-left text-small"><tbody>{preview.rows.map((r) => (
            <tr key={r.i} className="border-t border-border first:border-0">
              <td className="p-2 tabular text-fg-subtle">{r.i}</td><td className="p-2">{r.data.name || ""}</td><td className="p-2 tabular">{maskPhone(r.data.phone) || r.data.email || ""}</td>
              <td className="p-2">{r.errors.length ? <span className="text-danger">{c.importer.invalid}: {r.errors.join(", ")}</span> : r.dupInFile ? <span className="text-warning">{c.importer.dupFile}</span> : r.dupInCrm ? <span className="text-warning">{fill(c.importer.dupCrm, { id: r.dupInCrm })}</span> : <span className="text-success">{c.importer.ok}</span>}</td>
            </tr>
          ))}</tbody></table>
        </div>
      </div>}
    </Dialog>
  );
}
