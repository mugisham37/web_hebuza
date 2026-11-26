"use client";
// U4 Approvals inbox (boards 02 SH3 + 14, Fix applied): type tabs, every row opens its record where signing happens (D4).
// Bulk approve only inside the Allocations tab (no step-up). Rows signed elsewhere leave with a toast; maker rows are not actionable.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatRelative } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey, ApiError } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useApprovals, useFinSummary } from "@/lib/finance/api";
import { bulkPreview, useBulkApprove } from "@/lib/finance/a";
import type { ApprovalItem } from "@/shared/finance/types";
import { fill } from "@/content/pages/finance-common";
import { financeApprovals } from "@/content/pages/finance-approvals";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Avatar } from "@/components/atoms/misc";
import { useToast } from "@/components/atoms/toast";
import { PageHead } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { useNow } from "@/components/atoms/step-up";
import { BulkAction, BulkBar, EmptyPanel, PanelError } from "@/components/molecules/ops/ops";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { Amount, SignerAvatar } from "@/components/atoms/finance";
import { ConflictDialog } from "@/components/molecules/finance/finance";
import { ArtNothingWaiting } from "@/components/atoms/finance-art";

export const useAp = () => financeApprovals(useI18n().locale);
const TABS = ["all", "manual_payment", "refund", "allocation", "batch", "setting"] as const;
type Tab = (typeof TABS)[number];
const inTab = (t: Tab, i: ApprovalItem) => t === "all" || i.type === t || (t === "setting" && i.type === "rule");

/** "Returns in 41 h" for the 72 h manual-payment rule; danger once passed. Polite, minute resolution. */
export function SlaCell({ at }: { at?: string }) {
  const c = useAp();
  const now = useNow(60_000);
  if (!at) return <span className="text-fg-subtle">{c.noSla}</span>;
  if (!now) return <span aria-hidden className="inline-block h-3 w-12 m-shimmer" />;
  const ms = Date.parse(at) - now;
  if (ms <= 0) return <span className="inline-flex items-center gap-1 text-danger"><Icon name="clock" size={12} aria-hidden />{c.slaOver}</span>;
  const h = Math.ceil(ms / 3_600_000);
  return <span className={cx("inline-flex items-center gap-1 tabular", h <= 12 ? "text-warning" : "text-fg-muted")}><Icon name="clock" size={12} aria-hidden />{fill(c.sla, { h })}</span>;
}

/** My step: Your turn / Waiting for another finance user / Not your step. Icon + text, never colour alone. */
export function MineChip({ mine }: { mine: ApprovalItem["mine"] }) {
  const c = useAp();
  return (
    <span className={cx("inline-flex items-center gap-1.5 px-2.5 py-1 text-eyebrow", mine === "sign" ? "bg-gold-400 text-on-gold" : mine === "waiting" ? "bg-ink-100 text-fg-muted" : "bg-ink-100 text-fg-subtle")}>
      <Icon name={mine === "sign" ? "zap" : mine === "waiting" ? "users" : "lock"} size={12} aria-hidden />{c.mine[mine]}
    </span>
  );
}

function BulkDialog({ ids, open, onClose, onDone }: { ids: string[]; open: boolean; onClose: () => void; onDone: (n: number) => void }) {
  const c = useAp();
  const { locale } = useI18n();
  const toast = useToast();
  const online = useOnline();
  const m = useBulkApprove();
  const [preview, setPreview] = useState<{ count: number; total: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [conflict, setConflict] = useState(false);
  // One Idempotency-Key per dialog instance (opened), not per click.
  const [key] = useState(newIdempotencyKey);
  useEffect(() => {
    let live = true;
    bulkPreview(ids).then((p) => live && setPreview(p)).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [ids]);
  async function approve() {
    try {
      const r = await m.mutateAsync({ ids, idempotencyKey: key });
      onDone(r.approved.length);
    } catch (e) {
      if (e instanceof ApiError && e.errorType === "version_conflict") setConflict(true);
      else toast({ title: errorCopy(e, locale), tone: "danger" });
    }
  }
  return (
    <>
      <Dialog open={open && !conflict} onClose={onClose} title={fill(c.bulk.title, { n: ids.length })}
        footer={<>
          <Button variant="outline" onClick={onClose}>{c.bulk.cancel}</Button>
          <Button onClick={approve} loading={m.isPending} disabled={!preview || !online} className="m-press">{fill(c.bulk.confirm, { n: ids.length })}</Button>
        </>}>
        {failed ? <PanelError what={c.bulk.approve} onRetry={() => { setFailed(false); bulkPreview(ids).then(setPreview).catch(() => setFailed(true)); }} />
          : !preview ? <p aria-live="polite" className="text-small text-fg-muted">{c.bulk.loading}</p>
          : (
            <div className="grid gap-3">
              <Amount value={preview.total} size="xl" className="m-rise" />
              <p className="text-small text-fg-muted">{c.bulk.body.split("{amount}")[0]}<Amount value={preview.total} size="sm" />{c.bulk.body.split("{amount}")[1]}</p>
              {!online && <p role="alert" className="text-small text-danger">{c.bulk.offline}</p>}
            </div>
          )}
      </Dialog>
      <ConflictDialog open={conflict} who={c.someone} when={new Date().toISOString()} onClose={() => { setConflict(false); onClose(); }} onRefresh={() => { setConflict(false); onClose(); onDone(0); }} />
    </>
  );
}

export function ApprovalsView() {
  const c = useAp();
  const { locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const params = useUrlParams();
  const tab = (TABS as readonly string[]).includes(params.get("type") ?? "") ? (params.get("type") as Tab) : "all";
  const focused = params.get("id");
  const q = useApprovals();
  const sum = useFinSummary();
  const exec = !!sum.data?.me.executiveOnly;
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);

  // Rows that vanish on refetch without my action were signed by someone else → toast (U4 what-if).
  const prev = useRef<Map<string, ApprovalItem> | null>(null);
  const mineDone = useRef(new Set<string>());
  const items = q.data?.items;
  useEffect(() => {
    if (!items) return;
    const next = new Map(items.map((i) => [i.id, i]));
    if (prev.current) for (const [id, old] of prev.current) if (!next.has(id) && !mineDone.current.has(id)) toast({ title: fill(c.signedElsewhere, { who: c.someone, record: old.record }) });
    prev.current = next;
  }, [items, toast, c]);

  const rows = (items ?? []).filter((i) => inTab(tab, i));
  const counts = Object.fromEntries(TABS.map((t) => [t, (items ?? []).filter((i) => inTab(t, i)).length]));
  const open = (i: ApprovalItem) => router.push(localHref(locale, i.href));
  const bulk = tab === "allocation" && !exec;

  const cols: OpsColumn<ApprovalItem>[] = [
    { key: "type", label: c.col.type, sort: (r) => r.type, cell: (r) => <span className="text-small text-fg-muted">{c.type[r.type]}</span> },
    { key: "record", label: c.col.record, sort: (r) => r.record, cell: (r) => <span className="font-medium tabular">{r.record}</span> },
    { key: "maker", label: c.col.maker, sort: (r) => r.maker.name, cell: (r) => <span className="inline-flex items-center gap-2"><Avatar name={r.maker.name || "?"} size="sm" />{r.maker.name || ""}</span> },
    { key: "amount", label: c.col.amount, align: "right", sort: (r) => r.amount ?? -1, cell: (r) => (r.amount == null ? <span className="text-fg-subtle"></span> : <Amount value={r.amount} size="sm" />) },
    { key: "reason", label: c.col.reason, wrap: true, cell: (r) => <span className="text-small">{c.reason[r.reason] ?? r.reason}</span> },
    { key: "age", label: c.col.age, sort: (r) => r.at, cell: (r) => <span className="text-small text-fg-muted tabular">{formatRelative(r.at, locale)}</span> },
    { key: "sla", label: c.col.sla, sort: (r) => r.slaAt ?? "~", cell: (r) => <SlaCell at={r.slaAt} /> },
    { key: "step", label: c.col.step, wrap: true, sort: (r) => r.mine, cell: (r) => <MineChip mine={r.mine} /> },
  ];

  return (
    <div className="grid gap-5">
      <PageHead title={c.title} sub={exec ? c.execSub : c.sub} />

      <div role="tablist" aria-label={c.title} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 m-rise">
        {TABS.filter((t) => !exec || t === "all" || counts[t] > 0).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => { setSelected([]); setUrlParams({ type: t === "all" ? null : t, id: null }); }}
            className={cx("inline-flex h-10 shrink-0 items-center gap-2 px-4 text-small transition-colors", tab === t ? "bg-secondary text-on-navy" : "bg-white text-fg-muted hover:bg-navy-50")}>
            {c.tabs[t]}
            <span className={cx("px-1.5 text-eyebrow tabular", tab === t ? "bg-white/15" : "bg-ink-100")}>{counts[t]}</span>
          </button>
        ))}
      </div>

      {bulk && rows.length > 0 && (
        <p className="flex items-start gap-2 text-small text-fg-muted"><Icon name="layers" size={14} aria-hidden className="mt-0.5 text-navy-600" />{c.bulk.only}</p>
      )}

      {q.isError ? <PanelError what={c.failed} onRetry={() => q.refetch()} /> : (
        <OpsTable<ApprovalItem>
          label={c.list} rows={rows} columns={cols} rowKey={(r) => r.id} rowLabel={(r) => `${c.type[r.type]} ${r.record}`}
          loading={q.isPending} onRetry={() => q.refetch()} shortcuts onOpen={open}
          focused={focused} onFocus={(id) => setUrlParams({ id })}
          rowTone={(r) => (r.mine === "sign" ? null : "muted")}
          selected={bulk ? selected : undefined} onSelect={bulk ? (ids) => setSelected(ids.filter((id) => rows.find((r) => r.id === id)?.mine === "sign")) : undefined}
          renderCard={(r) => (
            <div className="grid gap-1.5">
              <span className="flex items-center justify-between gap-2"><span className="text-eyebrow text-fg-muted">{c.type[r.type]}</span><SlaCell at={r.slaAt} /></span>
              <span className="flex items-center justify-between gap-2"><span className="font-medium tabular">{r.record}</span>{r.amount != null && <Amount value={r.amount} size="sm" />}</span>
              <span className="flex flex-wrap items-center justify-between gap-2 text-small text-fg-muted"><SignerAvatar user={r.maker} state="signed" caption={c.reason[r.reason] ?? r.reason} /><MineChip mine={r.mine} /></span>
            </div>
          )}
          empty={
            <EmptyPanel title={(items ?? []).length ? c.empty.tab : c.empty.title} body={(items ?? []).length ? undefined : c.empty.body} action={(items ?? []).length ? undefined : <ArtNothingWaiting />} />
          }
        />
      )}

      {bulk && (
        <BulkBar count={selected.length} onClear={() => setSelected([])}>
          {online ? <BulkAction icon="check" onClick={() => setConfirm(true)}>{c.bulk.approve}</BulkAction> : <span className="px-2 text-small text-white/80">{c.bulk.offline}</span>}
        </BulkBar>
      )}
      {confirm && (
        <BulkDialog ids={selected} open onClose={() => setConfirm(false)} onDone={(n) => {
          selected.forEach((id) => mineDone.current.add(id));
          setConfirm(false); setSelected([]);
          if (n) toast({ title: fill(c.bulk.done, { n }), tone: "success" });
          void q.refetch();
        }} />
      )}

    </div>
  );
}
