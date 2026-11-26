"use client";
// U16 /ops/field (SM): Flags · Conflicts · Expenses L1 · Custody · Visits (+ evidence) and "Request field visit".
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { errorCopy } from "@/lib/api/error-copy";
import { formatDate } from "@/shared/format";
import { Button } from "@/components/atoms/button";
import { Tabs } from "@/components/atoms/tabs";
import { Badge } from "@/components/atoms/tag";
import { Skeleton } from "@/components/atoms/feedback";
import { Field, Textarea } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { Panel, EmptyPanel, PanelError, KpiTile } from "@/components/molecules/ops/ops";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { fx, fieldKeys } from "@/lib/field/api";
import { useFieldCopy } from "@/lib/field/copy";
import { copyF } from "@/lib/field/copy-f";
import type { FieldVisit, Flag, ConflictPayload, CustodyEvent } from "@/shared/field/types";
import { FieldFlagChip, hhmm, duration, useNow } from "@/components/atoms/field-agent";
import { ctl } from "@/components/molecules/field/ctl";
import { ExpenseApprovalQueue } from "@/components/organisms/field/expense-approval-queue";
import { VisitEvidencePanel } from "@/components/organisms/field/visit-evidence-panel";
import { CreateVisitDialog } from "@/components/organisms/field/create-visit-dialog";

const TABS = ["flags", "conflicts", "expenses", "custody", "visits"] as const;
type TabId = (typeof TABS)[number];
type FlagRow = { visitId: string; flags: Flag[]; reviewed: boolean; at: string; visit: FieldVisit; agent: string };
type ConflictRow = { opId: string; visitId: string; kind: string; payload: ConflictPayload; status: "open" | "accepted_agent" | "kept_office"; at: string; visit: FieldVisit; agent: string };
type CustodyRow = { receiptRef: string; visitId: string; items: number; events: CustodyEvent[]; visit: FieldVisit; agent: string; ageMs: number };

function useQueue<T>(tab: string, enabled = true) {
  return useQuery({ queryKey: fieldKeys.office(`queue:${tab}`), queryFn: () => fx<T[]>("GET", `/api/x_field/ops/queue?tab=${tab}`), enabled });
}

export function FieldQueue() {
  const { locale } = useFieldCopy();
  const t = copyF(locale);
  const params = useUrlParams();
  const tab = (TABS as readonly string[]).includes(params.get("tab") ?? "") ? (params.get("tab") as TabId) : "flags";
  const visit = params.get("visit");
  const [creating, setCreating] = useState(false);
  const flags = useQueue<FlagRow>("flags");
  const conflicts = useQueue<ConflictRow>("conflicts");
  const custody = useQueue<CustodyRow>("custody");
  const l1 = useQuery({ queryKey: fieldKeys.office("expenses:1"), queryFn: () => fx<unknown[]>("GET", "/api/x_field/approvals/expenses?level=1") });
  const n = { flags: flags.data?.filter((f) => !f.reviewed).length, conflicts: conflicts.data?.filter((c) => c.status === "open").length, expenses: l1.data?.length, custody: custody.data?.length };

  return (
    <div className="grid gap-5">
      <header className="m-rise flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1"><h1 className="text-h2">{t.title}</h1><p className="mt-1 text-small text-fg-muted">{t.sub}</p></div>
        <Button data-guide="ops-field-request" onClick={() => setCreating(true)}>{t.request}</Button>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label={t.kpi.flags} value={n.flags ?? ""} icon="mapPin" tone={n.flags ? "warning" : "neutral"} />
        <KpiTile label={t.kpi.conflicts} value={n.conflicts ?? ""} icon="refresh" tone={n.conflicts ? "attention" : "neutral"} />
        <KpiTile label={t.kpi.expenses} value={n.expenses ?? ""} icon="wallet" />
        <KpiTile label={t.kpi.custody} value={n.custody ?? ""} icon="lock" />
      </div>
      {visit ? (
        <div className="grid gap-3">
          <Button variant="ghost" className="w-fit" onClick={() => setUrlParams({ visit: null })}>← {t.tabs[tab]}</Button>
          <VisitEvidencePanel visitId={visit} />
        </div>
      ) : (
        <Tabs value={tab} onChange={(id) => setUrlParams({ tab: id === "flags" ? null : id })}
          tabs={TABS.map((id) => ({
            id, label: t.tabs[id], count: n[id as keyof typeof n],
            content: id === "flags" ? <FlagsTab q={flags} /> : id === "conflicts" ? <ConflictsTab q={conflicts} /> : id === "expenses" ? <ExpenseApprovalQueue level={1} />
              : id === "custody" ? <CustodyTab q={custody} /> : <VisitsTab />,
          }))} />
      )}
      {creating && <CreateVisitDialog open onClose={() => setCreating(false)} />}
    </div>
  );
}

const openVisit = (id: string) => setUrlParams({ visit: id });

function FlagsTab({ q }: { q: ReturnType<typeof useQueue<FlagRow>> }) {
  const { locale } = useFieldCopy();
  const t = copyF(locale).flags;
  const qc = useQueryClient();
  const toast = useToast();
  if (q.isPending) return <Skeleton className="h-32 w-full" />;
  if (q.isError) return <PanelError what={copyF(locale).tabs.flags} onRetry={() => void q.refetch()} />;
  if (!q.data.length) return <EmptyPanel title={t.empty} body={t.emptyBody} />;
  async function review(id: string) {
    try { await fx("POST", `/api/x_field/ops/flags/${id}/review`); await qc.invalidateQueries({ queryKey: fieldKeys.office("queue:flags") }); }
    catch (e) { toast({ tone: "danger", title: errorCopy(e, locale) }); }
  }
  return (
    <ul className="grid gap-2">
      {q.data.map((f, i) => (
        <li key={`${f.visitId}-${i}`} className="flex flex-wrap items-center gap-3 border border-border bg-surface p-4">
          <div className="min-w-0 flex-1">
            <p className="text-label">{f.visit.ref} · {f.visit.title_i18n[locale]}</p>
            <p className="text-small text-fg-muted">{f.agent} · {formatDate(f.at, locale, { day: "numeric", month: "short" })} {hhmm(f.at, locale)}{f.visit.checkin?.reason ? ` · ${f.visit.checkin.reason}` : ""}</p>
            <div className="mt-1 flex flex-wrap gap-1">{f.flags.map((x) => <FieldFlagChip key={x} flag={x} />)}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => openVisit(f.visitId)}>{t.open}</Button>
          {f.reviewed ? <Badge tone="success">{t.reviewed}</Badge> : <Button size="sm" variant="outline" onClick={() => void review(f.visitId)}>{t.review}</Button>}
        </li>
      ))}
    </ul>
  );
}

function ConflictsTab({ q }: { q: ReturnType<typeof useQueue<ConflictRow>> }) {
  const { locale } = useFieldCopy();
  const t = copyF(locale).conflicts;
  if (q.isPending) return <Skeleton className="h-32 w-full" />;
  if (q.isError) return <PanelError what={copyF(locale).tabs.conflicts} onRetry={() => void q.refetch()} />;
  if (!q.data.length) return <EmptyPanel title={t.empty} body={t.emptyBody} />;
  return <div className="grid gap-3">{q.data.map((c) => <ConflictCard key={c.opId} c={c} />)}</div>;
}

const show = (v: unknown) => (v === undefined || v === null ? "" : Array.isArray(v) ? v.join(" · ") : typeof v === "object" ? JSON.stringify(v) : String(v));
function ConflictCard({ c }: { c: ConflictRow }) {
  const { locale } = useFieldCopy();
  const t = copyF(locale).conflicts;
  const qc = useQueryClient();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function resolve(choice: "accept_agent" | "keep_office") {
    setBusy(true);
    try {
      await fx("POST", `/api/x_field/conflicts/${c.opId}/resolve`, { choice, note: note.trim() || undefined });
      toast({ tone: "success", title: t.done });
      await qc.invalidateQueries({ queryKey: fieldKeys.office("queue:conflicts") });
    } catch (e) { toast({ tone: "danger", title: errorCopy(e, locale) }); } finally { setBusy(false); }
  }
  const keys = [...new Set([...Object.keys(c.payload.office), ...Object.keys(c.payload.mine)])].filter((k) => k !== "kind");
  return (
    <Panel title={`${c.visit.ref} · ${c.visit.title_i18n[locale]}`} action={<Badge tone={c.status === "open" ? "warning" : "success"}>{t.status[c.status]}</Badge>}>
      <p className="mb-3 text-small text-fg-muted">{c.agent} · {formatDate(c.at, locale, { day: "numeric", month: "short" })} {hhmm(c.at, locale)}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {([["office", c.payload.office], ["agent", c.payload.mine]] as const).map(([side, data]) => (
          <div key={side} className={side === "agent" ? "bg-navy-50 p-3" : "bg-bg-subtle p-3"}>
            <p className="mb-2 text-label">{side === "office" ? t.office : t.agent}</p>
            <dl className="grid gap-1 text-small">{keys.map((k) => (
              <div key={k} className={c.payload.needsReview.includes(k) ? " bg-warning-bg px-1" : undefined}><dt className="inline text-fg-subtle">{k}: </dt><dd className="inline">{show((data as Record<string, unknown>)[k])}</dd></div>
            ))}</dl>
          </div>
        ))}
      </div>
      {c.payload.autoMerged.length > 0 && <p className="mt-2 text-small text-fg-muted">{t.merged}: {c.payload.autoMerged.join(", ")}</p>}
      {c.payload.needsReview.length > 0 && <p className="text-small text-warning">{t.review}: {c.payload.needsReview.join(", ")}</p>}
      {c.status === "open" && (
        <div className="mt-3 grid gap-3">
          <Field label={t.note}>{(a) => <Textarea {...ctl(a)} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
          <div className="flex flex-wrap gap-2">
            <Button loading={busy} onClick={() => void resolve("accept_agent")}>{t.accept}</Button>
            <Button variant="outline" disabled={busy} onClick={() => void resolve("keep_office")}>{t.keep}</Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function CustodyTab({ q }: { q: ReturnType<typeof useQueue<CustodyRow>> }) {
  const { locale } = useFieldCopy();
  const t = copyF(locale);
  const qc = useQueryClient();
  const toast = useToast();
  if (q.isPending) return <Skeleton className="h-32 w-full" />;
  if (q.isError) return <PanelError what={t.tabs.custody} onRetry={() => void q.refetch()} />;
  if (!q.data.length) return <EmptyPanel title={t.custody.empty} body={t.custody.emptyBody} />;
  async function receive(ref: string) {
    try { await fx("POST", `/api/x_field/ops/custody/${ref}/receive`); toast({ tone: "success", title: t.custody.received }); await qc.invalidateQueries({ queryKey: fieldKeys.office("queue:custody") }); }
    catch (e) { toast({ tone: "danger", title: errorCopy(e, locale) }); }
  }
  return (
    <ul className="grid gap-2">
      {q.data.map((c) => {
        const last = c.events.at(-1)!;
        return (
          <li key={c.receiptRef} className="flex flex-wrap items-center gap-3 border border-border bg-surface p-4">
            <div className="min-w-0 flex-1">
              <p className="text-label"><span className="font-mono">{c.receiptRef}</span> · {t.custody.items.replace("{n}", String(c.items))}</p>
              <p className="text-small text-fg-muted">{c.visit.ref} · {c.agent} · {t.ev.stages[last.stage]}</p>
              <p className={c.ageMs > 48 * 3600_000 ? "text-small font-medium text-danger" : "text-small text-fg-subtle"}>{t.custody.age.replace("{time}", duration(c.ageMs))}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => openVisit(c.visitId)}>{t.flags.open}</Button>
            {last.stage === "with_agent" ? <Button size="sm" onClick={() => void receive(c.receiptRef)}>{t.custody.receive}</Button> : <Badge tone="info">{t.ev.stages[last.stage]}</Badge>}
          </li>
        );
      })}
    </ul>
  );
}

function VisitsTab() {
  const { c, locale } = useFieldCopy();
  const t = copyF(locale);
  const q = useQueue<FieldVisit & { agent: string }>("visits");
  const now = useNow();
  if (q.isPending) return <Skeleton className="h-32 w-full" />;
  if (q.isError) return <PanelError what={t.tabs.visits} onRetry={() => void q.refetch()} />;
  if (!q.data.length) return <EmptyPanel title={t.visits.empty} />;
  return (
    <ul className="grid gap-2">
      {[...q.data].sort((a, b) => a.windowStart.localeCompare(b.windowStart)).map((v) => (
        <li key={v.id}>
          <button type="button" onClick={() => openVisit(v.id)} className="m-press flex w-full flex-wrap items-center gap-3 border border-border bg-surface p-4 text-left hover:border-border-strong">
            <span className="font-mono text-small">{v.ref}</span>
            <span className="min-w-0 flex-1 text-label">{v.title_i18n[locale]}<span className="block text-small font-normal text-fg-muted">{v.agent} · {v.address}</span></span>
            <span className="text-small tabular text-fg-muted">{formatDate(v.windowStart, locale, { day: "numeric", month: "short" })} {hhmm(v.windowStart, locale)}</span>
            <Badge tone={v.status === "completed" ? "success" : v.status === "cancelled" || v.status === "missed" ? "danger" : v.status === "in_progress" ? "info" : "neutral"}>{c.status[v.status]}</Badge>
            {(v.checkin?.flags ?? []).map((f) => <FieldFlagChip key={f} flag={f} />)}
            {v.status === "scheduled" && now > Date.parse(v.windowEnd) && <Badge tone="warning">{c.window.late}</Badge>}
          </button>
        </li>
      ))}
    </ul>
  );
}
