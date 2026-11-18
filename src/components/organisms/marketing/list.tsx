"use client";
// Content lists (U3 CP1, U5 LP1, U6 KN1/KN4): saved-view tabs, search, type filter, locale coverage, status, actions.
// One list for every CMS type; landing/knowledge/updates add their own header extras.
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { cx, formatRelative } from "@/shared/format";
import { errorCopy } from "@/lib/api/error-copy";
import { fill } from "@/content/pages/mkt-common";
import { useDuplicate, useEntries, useKnowledgeInsights, previewToken } from "@/lib/marketing/content";
import type { CmsRow, CmsType } from "@/shared/marketing/types";
import { Button } from "@/components/atoms/button";
import { Input, Select } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { SavedViewTabs, Panel, PanelError } from "@/components/molecules/ops/ops";
import { KbChip, LocaleCoverage, PageHead, WorkflowChip, useM } from "@/components/atoms/marketing";
import { useNow } from "@/components/atoms/agent";
import { ArtPages, CreateDialog, Empty, TargetMeter, editorBase, useCC } from "@/components/molecules/marketing/marketing";

const VIEWS = ["all", "published", "draft", "in_review", "scheduled", "stale"] as const;

export function ContentList({ kind }: { kind: "content" | "landing" | "knowledge" | "updates" }) {
  const c = useCC();
  const m = useM();
  const { locale } = useI18n();
  const toast = useToast();
  const now = useNow();
  const p = useUrlParams();
  const types: CmsType[] = kind === "landing" ? ["landing_page"] : kind === "knowledge" ? ["guide", "article"] : kind === "updates" ? ["regulatory_update"] : ["page", "team_member", "legal_doc"];
  const type = (p.get("type") as CmsType) || types[0];
  const view = p.get("status") || "all";
  const [q, setQ] = useState(p.get("q") ?? "");
  const [creating, setCreating] = useState(p.get("new") === "1");
  const list = useEntries({ type: kind === "knowledge" && !p.get("type") ? "guide,article" : type, status: view === "all" ? undefined : view, q: p.get("q") ?? undefined });
  const dup = useDuplicate();
  const rows = list.data?.items ?? [];
  const L = (path: string) => localHref(locale, path);
  const filtered = !!(p.get("q") || view !== "all");

  async function preview(r: CmsRow) {
    try { const t = await previewToken(r.id, locale); window.open(t.url, "_blank", "noopener"); }
    catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
  }

  let extra: ReactNode = null;
  if (kind === "knowledge") extra = <KnowledgeExtras published={rows.filter((r) => r.status === "published").length} />;
  if (kind === "updates") extra = <p className="mb-4 flex items-center gap-2 bg-warning-bg px-4 py-3 text-small text-warning"><Icon name="clock" size={16} aria-hidden />{c.reg.stale}</p>;

  return (
    <div>
      <PageHead title={c.titles[kind]} sub={c.subs[kind]}
        actions={<Button onClick={() => setCreating(true)}><Icon name="plus" size={16} aria-hidden />{fill(c.list.new, { type: c.types[type].toLowerCase() })}</Button>} />
      {extra}
      <SavedViewTabs views={VIEWS.map((v) => ({ key: v, label: c.views[v] }))} active={view} onChange={(k) => setUrlParams({ status: k === "all" ? null : k })} />
      <form className="my-4 flex flex-wrap items-center gap-2" role="search" onSubmit={(e) => { e.preventDefault(); setUrlParams({ q: q.trim() || null }); }}>
        <label className="relative min-w-0 flex-1 sm:max-w-sm">
          <span className="sr-only">{c.list.search}</span>
          <Icon name="search" size={16} aria-hidden className="absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.list.search} className="pl-9" />
        </label>
        {types.length > 1 && (
          <label className="flex items-center gap-2 text-small"><span className="text-fg-muted">{c.list.typeFilter}</span>
            <Select value={type} onChange={(e) => setUrlParams({ type: e.target.value })} className="w-auto">{types.map((t) => <option key={t} value={t}>{c.types[t]}</option>)}</Select>
          </label>
        )}
      </form>

      {list.isPending ? (
        <div className="grid gap-2" aria-busy>{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 m-shimmer" />)}</div>
      ) : list.isError ? (
        <PanelError what={c.titles[kind]} onRetry={() => list.refetch()} />
      ) : !rows.length ? (
        filtered ? (
          <Empty art={<ArtPages />} title={m.states.filteredEmpty} action={<Button variant="secondary" onClick={() => { setQ(""); setUrlParams({ q: null, status: null }); }}>{m.states.clear}</Button>} />
        ) : (
          <Empty art={<ArtPages />} title={fill(c.empty.title, { type: c.types[type].toLowerCase() })} body={c.empty.body}
            action={<Button onClick={() => setCreating(true)}>{fill(c.empty.start, { type: c.types[type].toLowerCase() })}</Button>} />
        )
      ) : (
        <ul className="grid gap-2 m-stagger">
          {rows.map((r, i) => (
            <li key={r.id} style={{ ["--i" as string]: i }} className="grid grid-cols-1 items-center gap-3 border border-border bg-white p-4 sm:grid-cols-[1fr_auto_auto_auto] hover:border-navy-300">
              <div className="min-w-0">
                <Link href={L(`${editorBase(r.type)}/${r.id}`)} className="block truncate text-label-lg hover:underline" title={r.title}>{r.title || r.key}</Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-eyebrow text-fg-subtle">
                  <span>{c.types[r.type]}</span>
                  <span>· {formatRelative(r.updatedAt, locale, now ?? undefined)} {fill(c.list.by, { who: r.updatedBy })}</span>
                  {r.views != null && <span>· {r.views} {c.cols.views.toLowerCase()}</span>}
                </p>
              </div>
              <LocaleCoverage coverage={r.coverage} />
              <span className="flex flex-wrap items-center gap-1.5"><WorkflowChip status={r.status} at={r.scheduledAt} />{(kind === "knowledge" || kind === "updates" || r.aiApproved) && <KbChip state={r.kb} />}</span>
              <span className="flex items-center gap-1">
                <Link href={L(`${editorBase(r.type)}/${r.id}`)} className="inline-flex h-9 items-center px-3 text-small hover:bg-navy-50 m-press">{c.list.edit}</Link>
                <button type="button" onClick={() => preview(r)} className="inline-flex h-9 items-center px-3 text-small hover:bg-navy-50 m-press">{c.list.preview}</button>
                <button type="button" disabled={dup.isPending} onClick={() => dup.mutate(r.id, { onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }) })}
                  className={cx("hidden h-9 items-center px-3 text-small hover:bg-navy-50 m-press md:inline-flex")}>{c.list.duplicate}</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <CreateDialog type={type} open={creating} onClose={() => { setCreating(false); setUrlParams({ new: null }); }} />
    </div>
  );
}

function KnowledgeExtras({ published }: { published: number }) {
  const c = useCC();
  const ins = useKnowledgeInsights();
  const d = ins.data;
  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-3">
      <TargetMeter n={published} />
      <Panel title={c.insights.helpful}>
        {ins.isPending ? <div className="h-10 m-shimmer" /> : !d?.helpful.length ? <p className="text-small text-fg-muted">—</p> : (
          <ul className="grid gap-1 text-small">{d.helpful.slice(0, 4).map((h) => <li key={h.entryId} className="flex justify-between gap-2"><span className="truncate">{h.title}</span><span className="tabular text-fg-subtle">{c.insights.yes} {h.yes} · {c.insights.no} {h.no}</span></li>)}</ul>
        )}
      </Panel>
      <Panel title={c.insights.zero}>
        {ins.isPending ? <div className="h-10 m-shimmer" /> : !d?.zeroResults.length ? <p className="text-small text-fg-muted">{c.insights.zeroEmpty}</p> : (
          <ul className="grid gap-1 text-small">{d.zeroResults.slice(0, 5).map((z) => <li key={z.q + z.locale} className="flex justify-between gap-2"><span lang={z.locale} className="truncate">“{z.q}”</span><span className="tabular text-fg-subtle">{fill(c.insights.times, { n: z.n })}</span></li>)}</ul>
        )}
      </Panel>
    </div>
  );
}
