"use client";
// U17 sections (lane F, board 13 FS1–FS4 with the plan's fixes): tax & fees, numbering, accounts (masked), policies, history.
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { ApiError } from "@/lib/api/client";
import { cx, formatDate, formatDateTime } from "@/shared/format";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { useFinSettings } from "@/lib/finance/api";
import {
  exportHistory, pct, revealAccount, showValue, useAccounts, useHistory, useNumbering, usePolicies,
  type FinAccount, type HistoryRow, type NumberingRow,
} from "@/lib/finance/f";
import type { ExportJob, FinanceSettingKey, SettingRow } from "@/shared/finance/types";
import { fill } from "@/content/pages/finance-common";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { EmptyPanel, Panel, PanelError } from "@/components/molecules/ops/ops";
import { SkeletonRows } from "@/components/atoms/agent";
import { FinStatus, MethodTag } from "@/components/atoms/finance";
import { ConflictDialog, DiffList, ExportMenu, HistoryTab, NoAccess, useStepUpAction } from "@/components/molecules/finance/finance";
import { ArtNoBatches } from "@/components/atoms/finance-art";
import { Badge } from "@/components/atoms/tag";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Input, Select } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { Pagination } from "@/components/atoms/data-table";
import { usePhone } from "@/components/atoms/step-up";
import { AddAccountDialog, CallbackDialog, ProposeChangeDialog, ProposeLocalDialog, useS, type LocalTarget } from "@/components/organisms/finance/settings-dialogs";
import { PendingPanel, localPending, useCtx, usePendingCore } from "@/components/organisms/finance/settings";

const forbidden = (e: unknown) => e instanceof ApiError && e.isForbidden;
const STALE_MS = 5 * 60_000;

// ---------------------------------------------------------------- conflict state shared by every section
function useConflict(refetch: () => unknown) {
  const [c, setC] = useState<{ who: string; when: string } | null>(null);
  return {
    open: (who = "—") => setC({ who, when: new Date().toISOString() }),
    node: <ConflictDialog open={!!c} who={c?.who ?? ""} when={c?.when ?? ""} onClose={() => setC(null)} onRefresh={() => { setC(null); void refetch(); }} />,
  };
}

// ---------------------------------------------------------------- FS1 tax & fees / limits: one effective-dated table
const TAX_KEYS = ["vat_registered", "vat_bps", "hebuza_tin", "invoice_terms_days", "quote_validity_days", "wht_bps", "payout_day", "licence_fee_monthly"] as const;
const LIMIT_KEYS = ["deposit_threshold", "deposit_bps", "manual_confirm_threshold", "manual_confirm_exec", "refund_exec_limit", "quote_approval_threshold"] as const;

function SettingsTable({ keys, label }: { keys: readonly FinanceSettingKey[]; label: string }) {
  const s = useS();
  const { locale } = useI18n();
  const c = useCtx();
  const q = useFinSettings();
  const conflict = useConflict(q.refetch);
  const [edit, setEdit] = useState<SettingRow | null>(null);
  const [detail, setDetail] = useState<SettingRow | null>(null);
  const phone = usePhone();
  if (forbidden(q.error)) return <NoAccess />;
  const rows = (q.data?.items ?? []).filter((r) => keys.includes(r.key));
  const editable = (r: SettingRow) => c.canEdit && r.status !== "pending_approval";

  async function open(r: SettingRow) {
    if (!editable(r)) return setDetail(r);
    // Stale figures are refetched before a money-setting change (DoD #2).
    if (Date.now() - q.dataUpdatedAt > STALE_MS) await q.refetch();
    setEdit(r);
  }
  const cols: OpsColumn<SettingRow>[] = [
    { key: "setting", label: s.cols.setting, cell: (r) => <span className="font-medium">{s.keys[r.key]}</span>, sort: (r) => s.keys[r.key] },
    { key: "value", label: s.cols.value, cell: (r) => {
      const v = showValue(r.key, r.value, locale, s.unit);
      return r.key === "vat_registered"
        ? <span className="inline-flex items-center gap-2"><span aria-hidden className={cx("relative h-5 w-9 transition-colors", r.value ? "bg-secondary" : "bg-ink-300")}><span className={cx("absolute top-0.5 size-4 rounded-full bg-white shadow", r.value ? "left-4.5" : "left-0.5")} /></span>{v}</span>
        : <span key={v} className={cx("tabular m-rise", v === s.unit.placeholder && "text-warning")}>{v}</span>;
    } },
    { key: "effective", label: s.cols.effective, cell: (r) => <span className="tabular">{formatDate(r.effectiveFrom, locale)}</span>, sort: (r) => r.effectiveFrom },
    { key: "status", label: s.cols.status, cell: (r) => <FinStatus status={r.status} />, wrap: true },
    { key: "enforced", label: s.cols.enforced, cell: (r) => <span className="text-fg-muted">{s.enforcedBy[r.enforcedBy] ?? r.enforcedBy}</span> },
    { key: "actions", label: s.cols.actions, align: "right", card: false, cell: (r) => (
      <Button size="sm" variant={editable(r) ? "secondary" : "ghost"} className="m-press" onClick={(e) => { e.stopPropagation(); void open(r); }}
        title={!c.online && c.finance ? s.states.offline : r.status === "pending_approval" ? s.pendingBy : undefined}>
        {editable(r) ? s.edit : s.view}
      </Button>
    ) },
  ];
  return (
    <>
      <Panel title={label} padded={false} className="overflow-hidden m-rise">
        <OpsTable rows={rows} columns={cols} rowKey={(r) => r.key} label={label} rowLabel={(r) => s.keys[r.key]}
          loading={q.isPending} error={q.error} onRetry={() => q.refetch()} onOpen={(r) => void open(r)} shortcuts />
      </Panel>
      {edit && <ProposeChangeDialog key={edit.key} row={edit} today={c.today} onClose={() => setEdit(null)}
        onConflict={() => { setEdit(null); conflict.open(q.data?.changes.find((x) => x.key === edit.key)?.proposedBy.name); }} />}
      <Dialog open={!!detail} onClose={() => setDetail(null)} side={phone ? "bottom" : "right"} title={detail ? s.keys[detail.key] : ""}
        description={detail ? showValue(detail.key, detail.value, locale, s.unit) : undefined}>
        {detail && (
          <div className="grid gap-4">
            <dl className="grid grid-cols-2 gap-3 text-small">
              <div><dt className="text-fg-muted">{s.cols.effective}</dt><dd className="tabular">{formatDate(detail.effectiveFrom, locale)}</dd></div>
              <div><dt className="text-fg-muted">{s.cols.status}</dt><dd><FinStatus status={detail.status} /></dd></div>
              <div><dt className="text-fg-muted">{s.cols.enforced}</dt><dd>{s.enforcedBy[detail.enforcedBy] ?? detail.enforcedBy}</dd></div>
              <div><dt className="text-fg-muted">{s.cols.changed}</dt><dd className="tabular">{detail.changedAt ? formatDateTime(detail.changedAt, locale) : s.never}</dd></div>
            </dl>
            {detail.status === "pending_approval" && <p className="bg-warning-bg px-3 py-2 text-small text-warning">{s.pendingBy}</p>}
            <HistoryTab resourceType="setting" resourceId={detail.key} />
          </div>
        )}
      </Dialog>
      {conflict.node}
    </>
  );
}

export function TaxSection() {
  const s = useS();
  return (
    <>
      <PendingPanel items={usePendingCore(TAX_KEYS)} />
      <SettingsTable keys={TAX_KEYS} label={s.sections.tax} />
    </>
  );
}

// ---------------------------------------------------------------- FS2 numbering (A-4 prefixes, gapless, next read-only)
export function NumberingSection() {
  const s = useS();
  const c = useCtx();
  const q = useNumbering();
  const conflict = useConflict(q.refetch);
  const [target, setTarget] = useState<LocalTarget | null>(null);
  if (forbidden(q.error)) return <NoAccess />;
  const rows = q.data?.items ?? [];
  const changes = q.data?.changes ?? [];
  const pendingFor = (series: string) => changes.find((ch) => ch.key === series && ch.status === "proposed");
  const series = Object.fromEntries(rows.filter((r) => r.series !== "PB").map((r) => [r.series, r.prefix]));
  const cols: OpsColumn<NumberingRow>[] = [
    { key: "doc", label: s.numbering.cols.doc, cell: (r) => <span className="font-medium">{s.numbering.docs[r.series]}</span> },
    { key: "prefix", label: s.numbering.cols.prefix, cell: (r) => <code className="bg-ink-100 px-1.5 py-0.5 text-small">{r.prefix}-</code> },
    { key: "reset", label: s.numbering.cols.reset, cell: (r) => r.reset === "monthly" ? s.numbering.resetMonthly : s.numbering.reset },
    { key: "next", label: s.numbering.cols.next, cell: (r) => r.next
      ? <span className="inline-flex items-center gap-1.5 tabular" title={s.numbering.readOnly}><Icon name="lock" size={12} aria-hidden className="text-fg-subtle" />{r.next}</span>
      : <span className="text-fg-subtle">—</span> },
    { key: "last", label: s.numbering.cols.last, cell: (r) => <span className="tabular text-fg-muted">{r.last ?? s.numbering.none}</span> },
    { key: "status", label: s.numbering.cols.status, wrap: true, cell: (r) => <FinStatus status={pendingFor(r.series) ? "pending_approval" : "active"} /> },
  ];
  const pending = localPending(changes, (_k, v) => `${String(v)}-`, (k) => `${s.numbering.docs[k]} · ${s.numbering.cols.prefix}`);
  return (
    <>
      <p className="flex items-start gap-3 border border-border bg-white px-4 py-3 text-small m-rise">
        <Icon name="layers" size={16} aria-hidden className="mt-0.5 shrink-0 text-navy-600" />{s.numbering.banner}
      </p>
      <PendingPanel items={pending} />
      <Panel title={s.sections.numbering} padded={false} className="overflow-hidden m-rise"
        action={<div className="pr-4 sm:pr-5"><Button size="sm" variant="outline" className="m-press" disabled={!c.canEdit || !rows.length}
          title={!c.online ? s.states.offline : undefined}
          onClick={() => setTarget({ area: "numbering", key: "INV", current: series.INV ?? "INV", series })}>{s.numbering.request}</Button></div>}>
        <OpsTable rows={rows} columns={cols} rowKey={(r) => r.series} label={s.sections.numbering} rowLabel={(r) => s.numbering.docs[r.series]}
          loading={q.isPending} error={q.error} onRetry={() => q.refetch()} shortcuts />
        <p className="flex items-center gap-2 px-4 py-3 text-eyebrow text-fg-subtle sm:px-5"><Icon name="lock" size={12} aria-hidden />{s.numbering.readOnly}</p>
      </Panel>
      {target && c.today && <ProposeLocalDialog target={target} today={c.today} year={c.year} onClose={() => setTarget(null)}
        onConflict={() => { setTarget(null); conflict.open(pendingFor(target.key)?.proposedBy.name); }} />}
      {conflict.node}
    </>
  );
}

// ---------------------------------------------------------------- FS3 accounts (masked, reveal audited, call-back verification)
const METHOD_LABEL: Record<FinAccount["method"], string> = { bank: "bank", mtn_momo: "mtn_momo", airtel_money: "airtel_money" };

export function AccountsSection() {
  const s = useS();
  const { locale } = useI18n();
  const c = useCtx();
  const q = useAccounts();
  const conflict = useConflict(q.refetch);
  const phone = usePhone();
  const { run, dialog } = useStepUpAction();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<FinAccount | null>(null);
  const [callback, setCallback] = useState<FinAccount | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState(false);
  if (forbidden(q.error)) return <NoAccess />;
  const rows = q.data?.items ?? [];
  const unverified = rows.filter((a) => a.status !== "verified").length;

  async function reveal(a: FinAccount) {
    setRevealing(true);
    try {
      const r = await run(s.accounts.revealWhat, (t) => revealAccount(a.id, t));
      if (r) setRevealed((m) => ({ ...m, [a.id]: r.number }));
    } catch { /* mapped toast */ } finally { setRevealing(false); }
  }
  const lock = (a: FinAccount) => a.payoutLockedUntil && Date.parse(a.payoutLockedUntil) > c.now
    ? <span className="inline-flex items-center gap-1.5 text-warning"><Icon name="lock" size={12} aria-hidden />{fill(s.accounts.lockedUntil, { t: formatDateTime(a.payoutLockedUntil, locale) })}</span>
    : a.status === "verified" ? <span className="text-success">{s.accounts.ready}</span> : <span className="text-fg-subtle">—</span>;
  const cols: OpsColumn<FinAccount>[] = [
    { key: "name", label: s.accounts.cols.name, cell: (a) => <span className="font-medium">{a.name}</span>, sort: (a) => a.name },
    { key: "number", label: s.accounts.cols.number, cell: (a) => <span className="tabular">{revealed[a.id] ?? a.masked}</span> },
    { key: "method", label: s.accounts.cols.method, cell: (a) => <MethodTag method={METHOD_LABEL[a.method]} /> },
    { key: "status", label: s.accounts.cols.status, wrap: true, cell: (a) => (
      <Badge tone={a.status === "verified" ? "success" : "warning"}><Icon name={a.status === "verified" ? "check" : "phone"} size={12} aria-hidden />{s.accounts.status[a.status]}</Badge>
    ) },
    { key: "lock", label: s.accounts.cols.lock, wrap: true, cell: lock },
    { key: "actions", label: s.cols.actions, align: "right", card: false, cell: (a) => (
      <Button size="sm" variant="ghost" className="m-press" onClick={(e) => { e.stopPropagation(); setOpen(a); }}>{s.view}</Button>
    ) },
  ];
  const cur = open ? rows.find((a) => a.id === open.id) ?? open : null;
  const curNumber = cur ? revealed[cur.id] : undefined;
  return (
    <>
      {!q.isPending && !q.error && rows.length > 0 && (
        <p className={cx("flex items-start gap-3 px-4 py-3 text-small m-rise", unverified ? "bg-warning-bg text-warning" : "bg-success-bg text-success")}>
          <Icon name={unverified ? "clock" : "check"} size={16} aria-hidden className="mt-0.5 shrink-0" />
          {unverified ? fill(s.accounts.someUnverified, { n: String(unverified) }) : s.accounts.allVerified}
        </p>
      )}
      <Panel title={s.sections.accounts} padded={false} className="overflow-hidden m-rise"
        action={<div className="pr-4 sm:pr-5"><Button size="sm" variant="outline" className="m-press" disabled={!c.canEdit} title={!c.online ? s.states.offline : undefined}
          onClick={() => setAdding(true)}><Icon name="plus" size={14} aria-hidden />{s.accounts.add}</Button></div>}>
        <OpsTable rows={rows} columns={cols} rowKey={(a) => a.id} label={s.sections.accounts} rowLabel={(a) => a.name}
          loading={q.isPending} error={q.error} onRetry={() => q.refetch()} onOpen={setOpen} shortcuts
          rowTone={(a) => (a.status === "verified" ? null : "muted")}
          empty={<EmptyPanel title={s.accounts.emptyTitle} body={s.accounts.emptyBody} action={<div className="grid place-items-center gap-3"><ArtNoBatches />
            {c.canEdit && <Button size="sm" className="m-press" onClick={() => setAdding(true)}>{s.accounts.add}</Button>}</div>} />} />
        <p className="flex items-center gap-2 px-4 py-3 text-eyebrow text-fg-subtle sm:px-5"><Icon name="shield" size={12} aria-hidden />{s.accounts.banner}</p>
      </Panel>
      <Dialog open={!!cur} onClose={() => setOpen(null)} side={phone ? "bottom" : "right"} title={cur?.name ?? ""} description={cur ? s.accounts.status[cur.status] : undefined}>
        {cur && (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-subtle p-4">
              <div><p className="text-eyebrow text-fg-muted">{s.accounts.cols.number}</p><p key={curNumber ?? "m"} className="text-card-title tabular m-rise">{curNumber ?? cur.masked}</p></div>
              {curNumber
                ? <Button size="sm" variant="outline" onClick={() => setRevealed(({ [cur.id]: _, ...m }) => m)}>{s.accounts.hide}</Button>
                : <Button size="sm" variant="outline" className="m-press" loading={revealing} disabled={!c.finance || !c.online} onClick={() => reveal(cur)}>{s.accounts.reveal}</Button>}
            </div>
            <dl className="grid grid-cols-2 gap-3 text-small">
              <div><dt className="text-fg-muted">{s.accounts.cols.method}</dt><dd><MethodTag method={cur.method} /></dd></div>
              <div><dt className="text-fg-muted">{s.accounts.cols.lock}</dt><dd>{lock(cur)}</dd></div>
              <div><dt className="text-fg-muted">{s.accounts.addedBy}</dt><dd>{cur.addedBy.name}</dd></div>
              <div><dt className="text-fg-muted">{s.accounts.verifiedBy}</dt><dd>{cur.verifiedBy?.name ?? "—"}</dd></div>
            </dl>
            {cur.status === "pending_callback" && c.finance && (
              cur.addedBy.id === c.me
                ? <p className="bg-warning-bg px-3 py-2 text-small text-warning">{s.pending.youProposed}</p>
                : <Button className="m-press" disabled={!c.online} onClick={() => { setCallback(cur); setOpen(null); }}><Icon name="phone" size={14} aria-hidden />{s.accounts.callback}</Button>
            )}
            <HistoryTab resourceType="account" resourceId={cur.id} />
          </div>
        )}
      </Dialog>
      {adding && <AddAccountDialog onClose={() => setAdding(false)} />}
      {callback && <CallbackDialog account={callback} onClose={() => setCallback(null)} onConflict={() => { setCallback(null); conflict.open(); }} />}
      {conflict.node}
      {dialog}
    </>
  );
}

// ---------------------------------------------------------------- policies: limits + refund policy + reminder offsets
export function PoliciesSection() {
  const s = useS();
  const { locale } = useI18n();
  const c = useCtx();
  const q = usePolicies();
  const conflict = useConflict(q.refetch);
  const [target, setTarget] = useState<LocalTarget | null>(null);
  const core = usePendingCore(LIMIT_KEYS);
  if (forbidden(q.error)) return <NoAccess />;
  const changes = q.data?.changes ?? [];
  const busy = (key: string) => changes.some((ch) => ch.key === key && ch.status === "proposed");
  const showLocal = (key: string, v: unknown) => key === "refund_policy"
    ? Object.entries(v as Record<string, number>).map(([k, b]) => `${s.policies.stage[k] ?? k} ${pct(b, locale)}`).join(" · ")
    : (v as number[]).join(", ");
  const pending = [...core, ...localPending(changes, showLocal, (k) => s.keys[k])];
  const propose = (t: LocalTarget) => c.canEdit && !busy(t.key) && setTarget(t);
  const action = (key: string, t: () => LocalTarget) => c.finance && (
    <Button size="sm" variant="secondary" className="m-press" disabled={!c.canEdit || busy(key) || !q.data}
      title={busy(key) ? s.pendingBy : !c.online ? s.states.offline : undefined} onClick={() => propose(t())}>{s.edit}</Button>
  );
  return (
    <>
      <PendingPanel items={pending} />
      <SettingsTable keys={LIMIT_KEYS} label={s.policies.limits} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={s.policies.refund} className="m-lift" action={action("refund_policy", () => ({ area: "policy", key: "refund_policy", current: q.data!.refundPolicy }))}>
          <p className="mb-3 text-small text-fg-muted">{s.policies.refundBody}</p>
          {q.isPending ? <SkeletonRows n={4} /> : q.error ? <PanelError what={s.policies.refund} onRetry={() => q.refetch()} /> : (
            <ul className="grid gap-2">
              {Object.entries(q.data.refundPolicy).map(([stage, bps]) => (
                <li key={stage} className="grid gap-1.5">
                  <div className="flex justify-between gap-2 text-small"><span>{s.policies.stage[stage] ?? stage}</span><span key={bps} className="font-medium tabular m-rise">{pct(bps, locale)}</span></div>
                  <span aria-hidden className="h-1.5 overflow-hidden bg-ink-100"><span className="block h-full origin-left bg-navy-700 m-grow" style={{ width: `${bps / 100}%` }} /></span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={s.policies.reminders} className="m-lift" action={action("reminder_offsets", () => ({ area: "policy", key: "reminder_offsets", current: q.data!.reminderOffsets }))}>
          <p className="mb-3 text-small text-fg-muted">{s.policies.remindersBody}</p>
          {q.isPending ? <SkeletonRows n={2} /> : q.error ? <PanelError what={s.policies.reminders} onRetry={() => q.refetch()} /> : (
            <ol className="flex flex-wrap items-center gap-2 m-stagger">
              {q.data.reminderOffsets.map((d, i) => (
                <li key={d} style={{ ["--i" as string]: i }} className={cx("inline-flex h-9 items-center gap-1.5 px-3 text-small tabular", d === 0 ? "bg-secondary text-on-navy" : d < 0 ? "bg-navy-50 text-navy-800" : "bg-bg-subtle")}>
                  <Icon name="calendar" size={12} aria-hidden />{d === 0 ? s.policies.due : fill(s.policies.offset, { n: d > 0 ? `+${d}` : String(d) })}
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
      {target && c.today && <ProposeLocalDialog target={target} today={c.today} year={c.year} onClose={() => setTarget(null)}
        onConflict={() => { setTarget(null); conflict.open(changes.find((ch) => ch.key === target.key)?.proposedBy.name); }} />}
      {conflict.node}
    </>
  );
}

// ---------------------------------------------------------------- FS4 change history (filters in URL, search local: no PII in URLs)
export function HistorySection() {
  const s = useS();
  const { locale } = useI18n();
  const params = useUrlParams();
  const range = params.get("range") ?? "90", kind = params.get("kind") ?? "all", page = Number(params.get("page") ?? 1);
  const [text, setText] = useState("");
  const qs = new URLSearchParams({ range, kind, page: String(page), ...(text.trim() ? { q: text.trim() } : {}) }).toString();
  const q = useHistory(qs);
  const [open, setOpen] = useState<HistoryRow | null>(null);
  const [job, setJob] = useState<ExportJob | null>(null);
  const phone = usePhone();
  if (forbidden(q.error)) return <NoAccess />;
  const items = q.data?.items ?? [];
  const meta = q.data?.meta ?? { total: 0, page: 1, pageSize: 20 };
  const short = (v: unknown, field: string | null) => {
    const o = (v ?? {}) as Record<string, unknown>;
    const x = field ? o[field] : null;
    return x == null ? "—" : typeof x === "object" ? JSON.stringify(x) : String(x);
  };
  const cols: OpsColumn<HistoryRow>[] = [
    { key: "at", label: s.history.cols.at, cell: (r) => <span className="tabular">{formatDateTime(r.at, locale)}</span>, sort: (r) => r.at },
    { key: "user", label: s.history.cols.user, cell: (r) => r.actor, sort: (r) => r.actor },
    { key: "record", label: s.history.cols.record, wrap: true, cell: (r) => <span><span className="font-medium">{r.record}</span><span className="block text-eyebrow text-fg-subtle">{r.action}</span></span> },
    { key: "field", label: s.history.cols.field, cell: (r) => r.field ?? "—" },
    { key: "diff", label: s.history.cols.diff, wrap: true, cell: (r) => (
      <span className="inline-flex flex-wrap items-center gap-1.5 tabular"><del className="text-fg-muted">{short(r.before, r.field)}</del><Icon name="arrowRight" size={12} aria-hidden /><ins className="no-underline">{short(r.after, r.field)}</ins></span>
    ) },
    { key: "reason", label: s.history.cols.reason, wrap: true, cell: (r) => <span className="text-fg-muted">{r.reason ?? "—"}</span> },
  ];
  async function onExport() {
    setJob({ id: "pending", status: "running", format: "csv" } as ExportJob);
    try { setJob(await exportHistory(qs)); } catch { setJob({ id: "failed", status: "failed", format: "csv" } as ExportJob); }
  }
  const from = items.length ? (meta.page - 1) * meta.pageSize + 1 : 0;
  return (
    <>
      <div role="search" className="flex flex-wrap items-end gap-2 m-rise">
        <label className="grid gap-1 text-eyebrow text-fg-muted">{s.history.range}
          <Select value={range} onChange={(e) => setUrlParams({ range: e.target.value, page: null })}>
            {Object.entries(s.history.ranges).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </label>
        <label className="grid gap-1 text-eyebrow text-fg-muted">{s.history.kind}
          <Select value={kind} onChange={(e) => setUrlParams({ kind: e.target.value === "all" ? null : e.target.value, page: null })}>
            {Object.entries(s.history.kinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </label>
        <label className="grid min-w-0 flex-1 basis-56 gap-1 text-eyebrow text-fg-muted">{s.history.search}
          <Input type="search" value={text} onChange={(e) => { setText(e.target.value); setUrlParams({ page: null }); }} placeholder={s.history.search} />
        </label>
        <ExportMenu formats={["csv"]} job={job} onPick={() => void onExport()} disabled={!items.length} />
      </div>
      <Panel padded={false} className="overflow-hidden m-rise">
        <OpsTable rows={items} columns={cols} rowKey={(r) => r.id} label={s.sections.history} rowLabel={(r) => `${r.record} ${r.action}`}
          loading={q.isPending} error={q.error} onRetry={() => q.refetch()} onOpen={setOpen} shortcuts
          empty={<EmptyPanel title={s.history.empty} body={s.history.emptyBody} />} />
        {meta.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
            <p aria-live="polite" className="text-small text-fg-muted">{fill(s.history.showing, { a: String(from), b: String(from + items.length - 1), n: String(meta.total) })}</p>
            <Pagination page={meta.page} pageCount={Math.max(1, Math.ceil(meta.total / meta.pageSize))} onPage={(p) => setUrlParams({ page: p > 1 ? String(p) : null })} />
          </div>
        )}
      </Panel>
      <Dialog open={!!open} onClose={() => setOpen(null)} side={phone ? "bottom" : "right"} title={s.history.diff}
        description={open ? `${formatDateTime(open.at, locale)} · ${open.actor}` : undefined}>
        {open && (
          <div className="grid gap-4">
            <p className="text-small"><span className="font-medium">{open.record}</span> · {open.action}</p>
            <DiffList before={open.before} after={open.after} />
            {open.reason && <p className="text-small"><span className="text-fg-muted">{s.history.cols.reason}: </span>{open.reason}</p>}
          </div>
        )}
      </Dialog>
    </>
  );
}
