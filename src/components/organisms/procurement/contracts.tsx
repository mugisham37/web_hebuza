"use client";
import { todayIso } from "@/components/molecules/procurement/procurement";
// S7 contracts list + S9 add/edit (board 04 CT1, fix: status computed from dates, never stored "Expired" in the future).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { formatDate } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useProcSettings } from "@/lib/procurement/api";
import { useContracts, useCreateContract, useUpdateContract, useVendors, type ContractRow } from "@/lib/procurement/ab";
import type { Contract, ContractKind, Frequency } from "@/shared/procurement/types";
import { fill } from "@/content/pages/procurement-common";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { EmptyPanel, SavedViewTabs } from "@/components/molecules/ops/ops";
import { PageHead } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Checkbox, Field, Input, Select } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Amount, DocNo, ExpiryChip, ProcPill, useP } from "@/components/atoms/procurement";
import { QueryFail, TextField, useAB } from "@/components/molecules/procurement/procurement";
import { isForbidden } from "@/components/atoms/hooks";

const STATUSES = ["all", "active", "expiring", "expired", "renewed", "terminated"] as const;

export function ContractsView() {
  const c = useAB().contracts;
  const p = useP();
  const { locale } = useI18n();
  const router = useRouter();
  const u = useUrlParams();
  const online = useOnline();
  const status = u.get("status") ?? "all";
  const q = useContracts({ q: u.get("q"), status: status === "all" ? null : status });
  const all = useContracts();
  const [focused, setFocused] = useState<string | null>(null);
  if (q.isError && isForbidden(q.error)) return <QueryFail error={q.error} onRetry={() => q.refetch()} notFound="" />;
  const counts = Object.fromEntries(STATUSES.map((s) => [s, (all.data?.items ?? []).filter((x) => s === "all" || x.status === s).length]));
  const cols: OpsColumn<ContractRow>[] = [
    { key: "ref", label: c.cols.ref, sort: (r) => r.ref, cell: (r) => <DocNo kind="CT" no={r.ref} /> },
    { key: "name", label: c.cols.name, wrap: true, sort: (r) => r.title, cell: (r) => <span className="grid"><span className="font-medium">{r.title}</span><span className="text-eyebrow text-fg-subtle">{r.vendorName}</span></span> },
    { key: "amount", label: c.cols.amount, align: "right", sort: (r) => r.amount, cell: (r) => <span className="grid justify-items-end"><Amount value={r.amount} className="font-semibold" /><span className="text-eyebrow text-fg-subtle">{c.freq[r.frequency]}</span></span> },
    { key: "esc", label: c.cols.escalation, card: false, cell: (r) => <span className="tabular text-small">{r.escalationPercent ? `+${r.escalationPercent}%` : ""}</span> },
    { key: "notice", label: c.cols.notice, card: false, cell: (r) => <span className="tabular text-small">{fill(c.days, { n: r.noticeDays })}</span> },
    { key: "end", label: c.cols.end, sort: (r) => r.endOn, wrap: true, cell: (r) => <span className="grid gap-1"><span className="tabular text-small">{formatDate(r.endOn, locale)}</span>{["active", "expiring"].includes(r.status) && <ExpiryChip date={r.endOn} today={todayIso()} />}</span> },
    { key: "next", label: c.cols.next, card: false, cell: (r) => <span className="tabular text-small text-fg-muted">{r.nextReminder ? formatDate(r.nextReminder, locale) : ""}</span> },
    { key: "status", label: c.cols.status, cell: (r) => <ProcPill state={r.status} machine="contract" /> },
  ];
  return (
    <div className="grid gap-5">
      <PageHead title={c.title} sub={c.sub} actions={<Button data-guide="procurement-add-contract" variant="primary" dots disabled={!online} onClick={() => setUrlParams({ sheet: "new" })} className="m-press"><Icon name="plus" size={16} aria-hidden />{c.add}</Button>} />
      <div className="grid gap-3 m-rise">
        <SavedViewTabs active={status} onChange={(k) => setUrlParams({ status: k === "all" ? null : k })} views={STATUSES.map((s) => ({ key: s, label: s === "all" ? p.common.all : p.status[s], count: counts[s] }))} />
        <label className="relative w-full max-w-sm">
          <span className="sr-only">{p.common.search}</span>
          <Icon name="search" size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
          <Input type="search" defaultValue={u.get("q") ?? ""} placeholder={p.common.search} onChange={(e) => setUrlParams({ q: e.target.value || null })} className="h-10 pl-9 text-small" />
        </label>
      </div>
      <div className="border border-border bg-surface m-rise">
        <OpsTable rows={q.data?.items ?? []} columns={cols} rowKey={(r) => r.id} rowLabel={(r) => `${r.ref} · ${r.title}`} label={c.title} loading={q.isPending}
          error={q.isError ? q.error : undefined} onRetry={() => q.refetch()} focused={focused} onFocus={setFocused} shortcuts
          empty={<div className="p-4"><EmptyPanel title={p.empty.contracts} action={<Button onClick={() => setUrlParams({ sheet: "new" })}>{c.add}</Button>} /></div>}
          rowTone={(r) => (r.status === "expired" ? "danger" : r.status === "terminated" || r.status === "renewed" ? "muted" : null)}
          onOpen={(r) => router.push(localHref(locale, `/procurement/contracts/${r.id}`))} />
      </div>
      {u.get("sheet") === "new" && <ContractForm onClose={() => setUrlParams({ sheet: null })} onDone={(id) => router.push(localHref(locale, `/procurement/contracts/${id}`))} />}
    </div>
  );
}

/** S9 add/edit contract. Deposit on create records DP-… awaiting finance payment; end-date edits reschedule reminders. */
export function ContractForm({ contract, onClose, onDone }: { contract?: Contract; onClose: () => void; onDone?: (id: string) => void }) {
  const c = useAB().contracts;
  const p = useP();
  const { locale } = useI18n();
  const toast = useToast();
  const vendors = useVendors({ status: "active" });
  const budgets = useProcSettings().data?.budgets ?? [];
  const create = useCreateContract();
  const update = useUpdateContract();
  const [key] = useState(newIdempotencyKey);
  const [f, setF] = useState(() => ({
    vendorId: contract?.vendorId ?? "", kind: (contract?.kind ?? "lease") as ContractKind, title: contract?.title ?? "", startOn: contract?.startOn ?? todayIso(), endOn: contract?.endOn ?? "",
    amount: String(contract?.amount ?? ""), frequency: (contract?.frequency ?? "monthly") as Frequency, dueDay: String(contract?.dueDay ?? ""), escalationPercent: String(contract?.escalationPercent ?? 0),
    noticeDays: String(contract?.noticeDays ?? 90), autoRenew: contract?.autoRenew ?? false, depositAmount: String(contract?.depositAmount ?? ""), budgetCategory: contract?.budgetCategory ?? "",
  }));
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  async function submit() {
    const e: Record<string, string> = {};
    if (!f.vendorId) e.vendorId = p.common.none;
    if (!f.title.trim()) e.title = c.form.title;
    if (!f.endOn) e.endOn = c.form.end;
    else if (f.endOn <= f.startOn) e.endOn = c.form.endAfter;
    if (!(Number(f.amount) > 0)) e.amount = c.form.amount;
    if (!f.budgetCategory) e.budgetCategory = c.form.category;
    setErr(e);
    if (Object.keys(e).length) return;
    const body = {
      ...f, amount: Math.round(Number(f.amount)), dueDay: f.dueDay ? Number(f.dueDay) : undefined, escalationPercent: Number(f.escalationPercent) || 0, noticeDays: Number(f.noticeDays) || 30,
      depositAmount: f.depositAmount ? Math.round(Number(f.depositAmount)) : undefined,
    };
    try {
      if (contract) { await update.mutateAsync({ id: contract.id, ...body, idempotencyKey: key }); toast({ title: fill(c.form.saved, { ref: contract.ref }), tone: "success" }); onClose(); }
      else { const r = await create.mutateAsync({ ...body, idempotencyKey: key }); toast({ title: fill(c.form.saved, { ref: r.ref }), tone: "success" }); onClose(); onDone?.(r.id); }
    } catch (x) { setErr({ form: errorCopy(x, locale) }); }
  }
  return (
    <Dialog open onClose={onClose} side="right" title={contract ? c.edit : c.add} footer={<Button onClick={submit} loading={create.isPending || update.isPending} dots className="m-press">{p.common.save}</Button>}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {err.form && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger">{err.form}</p>}
        <Field label={c.form.supplier} error={err.vendorId}>{(a) => (
          <Select id={a.id} aria-invalid={a.invalid} value={f.vendorId} disabled={!!contract} onChange={(e) => set({ vendorId: e.target.value })}>
            <option value=""></option>{(vendors.data?.items ?? []).map((v) => <option key={v.id} value={v.id}>{v.legalName} · {v.code}</option>)}
          </Select>
        )}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={c.form.kind}>{(a) => <Select id={a.id} value={f.kind} disabled={!!contract} onChange={(e) => set({ kind: e.target.value as ContractKind })}>{(["lease", "service", "supply", "other"] as const).map((k) => <option key={k} value={k}>{c.kinds[k]}</option>)}</Select>}</Field>
          <Field label={c.form.category} error={err.budgetCategory}>{(a) => <Select id={a.id} aria-invalid={a.invalid} value={f.budgetCategory} onChange={(e) => set({ budgetCategory: e.target.value })}><option value=""></option>{budgets.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}</Select>}</Field>
        </div>
        <TextField label={c.form.title} value={f.title} maxLength={120} error={err.title} onChange={(x) => set({ title: x })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={c.form.start} type="date" value={f.startOn} disabled={!!contract} onChange={(x) => set({ startOn: x })} />
          <TextField label={c.form.end} type="date" value={f.endOn} error={err.endOn} onChange={(x) => set({ endOn: x })} />
          <TextField label={c.form.amount} type="number" min={0} inputMode="numeric" value={f.amount} error={err.amount} onChange={(x) => set({ amount: x })} />
          <Field label={c.form.frequency}>{(a) => <Select id={a.id} value={f.frequency} onChange={(e) => set({ frequency: e.target.value as Frequency })}>{(["one_off", "monthly", "quarterly", "annual"] as const).map((k) => <option key={k} value={k}>{c.freq[k]}</option>)}</Select>}</Field>
          <TextField label={c.form.dueDay} type="number" min={1} max={28} value={f.dueDay} onChange={(x) => set({ dueDay: x })} />
          <TextField label={c.form.escalation} type="number" min={0} max={50} step="0.5" value={f.escalationPercent} onChange={(x) => set({ escalationPercent: x })} />
          <TextField label={c.form.notice} type="number" min={0} max={365} value={f.noticeDays} onChange={(x) => set({ noticeDays: x })} />
          {!contract && <TextField label={c.form.deposit} type="number" min={0} value={f.depositAmount} onChange={(x) => set({ depositAmount: x })} />}
        </div>
        <Checkbox label={c.form.autoRenew} checked={f.autoRenew} onChange={(e) => set({ autoRenew: e.target.checked })} />
      </form>
    </Dialog>
  );
}
