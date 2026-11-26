"use client";
import { todayIso } from "@/components/molecules/procurement/procurement";
// D1–D4 deposits & advances (board 08 DP1/DP2; fix: lives in /procurement). Record new, return with itemised deductions,
// forfeit → executive, offset an advance/credit against an open bill with an applyAdvance preview (R-11).
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDate, formatMoney } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { applyAdvance } from "@/shared/procurement/rules";
import { useContracts, useCreateAdvance, useDeposits, useForfeit, useOffset, useReturnDeposit, useVendors, type DepositRow, type OpenBill } from "@/lib/procurement/ab";
import type { AdvanceKind } from "@/shared/procurement/types";
import { fill } from "@/content/pages/procurement-common";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { EmptyPanel, MenuButton, SavedViewTabs } from "@/components/molecules/ops/ops";
import { PageHead } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { DateInput, Input, Select, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Amount, DocNo, Pill, ProcPill, useP } from "@/components/atoms/procurement";
import { QueryFail, useAB } from "@/components/molecules/procurement/procurement";
import { isForbidden } from "@/components/atoms/hooks";

const TABS = ["all", "deposit", "advance", "prepayment", "credit"] as const;
const KINDS: AdvanceKind[] = ["deposit", "advance", "prepayment", "refund", "credit_note"];
const OPEN = ["held", "return_due", "partially_returned", "active", "paid_out", "pending_payment"];

export function DepositsView() {
  const c = useAB().deposits;
  const p = useP();
  const { locale } = useI18n();
  const u = useUrlParams();
  const online = useOnline();
  const tab = (TABS as readonly string[]).includes(u.get("tab") ?? "") ? (u.get("tab") as (typeof TABS)[number]) : "all";
  const search = (u.get("q") ?? "").toLowerCase();
  const q = useDeposits();
  const [act, setAct] = useState<null | { kind: "return" | "forfeit" | "offset"; row: DepositRow }>(null);
  const [create, setCreate] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  if (q.isError && isForbidden(q.error)) return <QueryFail error={q.error} onRetry={() => q.refetch()} notFound="" />;
  const inTab = (r: DepositRow) => tab === "all" || (tab === "credit" ? r.kind === "refund" || r.kind === "credit_note" : r.kind === tab);
  const rows = (q.data?.items ?? []).filter((r) => inTab(r) && (!search || [r.no, r.vendorName, r.contractRef ?? ""].some((x) => x.toLowerCase().includes(search))));
  const cols: OpsColumn<DepositRow>[] = [
    { key: "no", label: c.cols.no, sort: (r) => r.no, cell: (r) => <DocNo kind={r.kind === "deposit" ? "DP" : "ADV"} no={r.no} /> },
    { key: "kind", label: c.cols.kind, cell: (r) => <span className="text-small">{c.kinds[r.kind]}</span> },
    { key: "supplier", label: c.cols.supplier, wrap: true, sort: (r) => r.vendorName, cell: (r) => <span className="grid"><span className="font-medium">{r.vendorName}</span>{r.contractRef && <span className="text-eyebrow text-fg-subtle tabular">{r.contractRef}</span>}</span> },
    { key: "amount", label: c.cols.amount, align: "right", sort: (r) => r.amount, cell: (r) => <Amount value={r.amount} /> },
    { key: "remaining", label: c.cols.remaining, align: "right", sort: (r) => r.remaining, cell: (r) => <Amount value={r.remaining} className="font-semibold" /> },
    { key: "status", label: c.cols.status, wrap: true, cell: (r) => <span className="flex flex-wrap gap-1"><ProcPill state={r.status} machine="deposit" />{r.forfeit?.status === "requested" && <Pill tone="warning" icon="clock">{c.forfeit.pending}</Pill>}</span> },
    { key: "due", label: c.cols.due, sort: (r) => r.returnDueOn ?? "", wrap: true, cell: (r) => r.returnDueOn ? (
      <span className={cx("grid text-small", r.overdueDays > 0 && "font-medium text-danger")}><span className="tabular">{formatDate(r.returnDueOn, locale)}</span>{r.overdueDays > 0 && <span>{fill(p.deposit.overdue, { n: r.overdueDays })}</span>}</span>
    ) : <span className="text-fg-subtle"></span> },
    { key: "act", label: p.shell.actions, card: false, cell: (r) => OPEN.includes(r.status) && r.remaining > 0 && online ? (
      <MenuButton label={p.shell.actions} align="right">{(close) => (
        <ul className="grid text-small">
          {r.kind === "deposit" || r.kind === "refund" || r.kind === "credit_note" ? <li><button type="button" className="h-10 w-full px-3 text-left hover:bg-navy-50" onClick={() => { close(); setAct({ kind: "return", row: r }); }}>{c.actions.ret}</button></li> : null}
          {r.kind !== "deposit" && <li><button type="button" className="h-10 w-full px-3 text-left hover:bg-navy-50" onClick={() => { close(); setAct({ kind: "offset", row: r }); }}>{c.actions.offset}</button></li>}
          {r.kind === "deposit" && r.forfeit?.status !== "requested" && <li><button type="button" className="h-10 w-full px-3 text-left text-danger hover:bg-danger-bg" onClick={() => { close(); setAct({ kind: "forfeit", row: r }); }}>{c.actions.forfeit}</button></li>}
        </ul>
      )}</MenuButton>
    ) : null },
  ];
  return (
    <div className="grid gap-5">
      <PageHead title={c.title} sub={c.sub} actions={<Button data-guide="procurement-record-deposit" variant="primary" dots disabled={!online} onClick={() => setCreate(true)} className="m-press"><Icon name="plus" size={16} aria-hidden />{c.add}</Button>} />
      <div className="grid gap-3 m-rise">
        <SavedViewTabs active={tab} onChange={(k) => setUrlParams({ tab: k === "all" ? null : k })} views={TABS.map((t) => ({ key: t, label: c.tabs[t], count: (q.data?.items ?? []).filter((r) => t === "all" || (t === "credit" ? r.kind === "refund" || r.kind === "credit_note" : r.kind === t)).length }))} />
        <label className="relative w-full max-w-sm">
          <span className="sr-only">{p.common.search}</span>
          <Icon name="search" size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
          <Input type="search" defaultValue={u.get("q") ?? ""} placeholder={p.common.search} onChange={(e) => setUrlParams({ q: e.target.value || null })} className="h-10 pl-9 text-small" />
        </label>
      </div>
      <div className="border border-border bg-surface m-rise">
        <OpsTable rows={rows} columns={cols} rowKey={(r) => r.id} rowLabel={(r) => `${r.no} · ${r.vendorName}`} label={c.title} loading={q.isPending}
          error={q.isError ? q.error : undefined} onRetry={() => q.refetch()} focused={focused} onFocus={setFocused}
          empty={<div className="p-4"><EmptyPanel title={search ? fill(p.empty.search, { q: search }) : p.empty.deposits} /></div>}
          rowTone={(r) => (r.overdueDays > 0 ? "danger" : ["returned", "offset", "forfeited", "received"].includes(r.status) ? "muted" : null)} />
      </div>
      {create && <CreateDialog onClose={() => setCreate(false)} />}
      {act?.kind === "return" && <ReturnDialog row={act.row} onClose={() => setAct(null)} />}
      {act?.kind === "forfeit" && <ForfeitDialog row={act.row} onClose={() => setAct(null)} />}
      {act?.kind === "offset" && <OffsetDialog row={act.row} bills={(q.data?.openBills ?? []).filter((b) => b.vendorId === act.row.vendorId)} onClose={() => setAct(null)} />}
    </div>
  );
}

function CreateDialog({ onClose }: { onClose: () => void }) {
  const c = useAB().deposits;
  const { locale } = useI18n();
  const toast = useToast();
  const vendors = useVendors({ status: "active" });
  const contracts = useContracts();
  const m = useCreateAdvance();
  const [key] = useState(newIdempotencyKey);
  const [f, setF] = useState({ kind: "deposit" as AdvanceKind, vendorId: "", amount: "", contractRef: "", note: "", returnDueOn: "" });
  const [err, setErr] = useState<string | null>(null);
  return (
    <Dialog open onClose={onClose} side="right" title={c.add} description={c.form.financeNote} footer={<Button loading={m.isPending} className="m-press" onClick={async () => {
      if (!f.vendorId || !(Number(f.amount) > 0)) return setErr(`${c.form.supplier} · ${c.form.amount}`);
      try { const r = await m.mutateAsync({ ...f, amount: Math.round(Number(f.amount)), contractRef: f.contractRef || undefined, returnDueOn: f.returnDueOn || undefined, idempotencyKey: key }); toast({ title: fill(c.form.done, { no: r.no }), tone: "success" }); onClose(); }
      catch (e) { setErr(errorCopy(e, locale)); }
    }}>{c.add}</Button>}>
      <div className="grid gap-4">
        {err && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger">{err}</p>}
        <label className="grid gap-1 text-small">{c.form.kind}<Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as AdvanceKind })}>{KINDS.map((k) => <option key={k} value={k}>{c.kinds[k]}</option>)}</Select></label>
        <label className="grid gap-1 text-small">{c.form.supplier}<Select value={f.vendorId} onChange={(e) => setF({ ...f, vendorId: e.target.value, contractRef: "" })}><option value=""></option>{(vendors.data?.items ?? []).map((v) => <option key={v.id} value={v.id}>{v.legalName}</option>)}</Select></label>
        <label className="grid gap-1 text-small">{c.form.amount}<Input type="number" min={0} inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
        <label className="grid gap-1 text-small">{c.form.contract}<Select value={f.contractRef} onChange={(e) => setF({ ...f, contractRef: e.target.value })}><option value=""></option>{(contracts.data?.items ?? []).filter((x) => x.vendorId === f.vendorId).map((x) => <option key={x.id} value={x.ref}>{x.ref} · {x.title}</option>)}</Select></label>
        {f.kind === "deposit" && <label className="grid gap-1 text-small">{c.form.returnDue}<DateInput value={f.returnDueOn} onChange={(e) => setF({ ...f, returnDueOn: e.target.value })} /></label>}
        <label className="grid gap-1 text-small">{c.form.note}<Textarea rows={2} maxLength={250} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
      </div>
    </Dialog>
  );
}

function ReturnDialog({ row, onClose }: { row: DepositRow; onClose: () => void }) {
  const c = useAB().deposits;
  const { locale } = useI18n();
  const toast = useToast();
  const m = useReturnDeposit();
  const [key] = useState(newIdempotencyKey);
  const [f, setF] = useState({ received: String(row.remaining), bankRef: "", date: todayIso(), proof: "" });
  const [ded, setDed] = useState<{ reason: string; amount: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const dedSum = ded.reduce((s, d) => s + (Math.round(Number(d.amount)) || 0), 0);
  const received = Math.round(Number(f.received)) || 0;
  const over = received + dedSum > row.remaining;
  const money = (n: number) => formatMoney(n, "RWF", locale);
  return (
    <Dialog open onClose={onClose} side="right" title={fill(c.ret.title, { no: row.no })} footer={<Button loading={m.isPending} disabled={over} className="m-press" onClick={async () => {
      if (!f.bankRef.trim()) return setErr(c.ret.bankRef);
      if (ded.some((d) => Number(d.amount) > 0 && !d.reason.trim())) return setErr(c.ret.dReason);
      try { await m.mutateAsync({ id: row.no, received, bankRef: f.bankRef, date: f.date, proof: f.proof || undefined, deductions: ded.map((d) => ({ reason: d.reason, amount: Math.round(Number(d.amount)) || 0 })), idempotencyKey: key }); toast({ title: c.ret.done, tone: "success" }); onClose(); }
      catch (e) { setErr(errorCopy(e, locale)); }
    }}>{c.actions.ret}</Button>}>
      <div className="grid gap-4">
        {err && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger">{err}</p>}
        <label className="grid gap-1 text-small">{c.ret.received}<Input type="number" min={0} value={f.received} onChange={(e) => setF({ ...f, received: e.target.value })} /></label>
        <label className="grid gap-1 text-small">{c.ret.bankRef}<Input value={f.bankRef} onChange={(e) => setF({ ...f, bankRef: e.target.value })} /></label>
        <label className="grid gap-1 text-small">{c.ret.date}<DateInput value={f.date} max={todayIso()} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
        <fieldset className="grid gap-2"><legend className="mb-1 text-label">{c.ret.deductions}</legend>
          {ded.map((d, i) => (
            <div key={i} className="grid grid-cols-[1fr_8rem_auto] items-end gap-2">
              <label className="grid gap-1 text-small">{c.ret.dReason}<Input value={d.reason} onChange={(e) => setDed(ded.map((x, k) => (k === i ? { ...x, reason: e.target.value } : x)))} /></label>
              <label className="grid gap-1 text-small">{c.ret.dAmount}<Input type="number" min={0} value={d.amount} onChange={(e) => setDed(ded.map((x, k) => (k === i ? { ...x, amount: e.target.value } : x)))} /></label>
              <button type="button" aria-label={`${c.ret.dReason} ${i + 1}`} onClick={() => setDed(ded.filter((_, k) => k !== i))} className="flex size-10 items-center justify-center hover:bg-ink-100"><Icon name="x" size={14} aria-hidden /></button>
            </div>
          ))}
          <Button type="button" size="sm" variant="secondary" className="w-fit" onClick={() => setDed([...ded, { reason: "", amount: "" }])}><Icon name="plus" size={14} aria-hidden />{c.ret.addDeduction}</Button>
        </fieldset>
        <p aria-live="polite" className={cx("px-3 py-2 text-small tabular", over ? "bg-danger-bg text-danger" : "bg-bg-subtle")}>
          {fill(c.ret.summary, { received: money(received), deductions: money(dedSum), remaining: money(row.remaining) })}{over ? `, ${c.ret.tooMuch}` : ""}
        </p>
        <label className="grid gap-1 text-small">{c.ret.proof}<Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setF({ ...f, proof: e.target.files?.[0]?.name ?? "" })} /></label>
      </div>
    </Dialog>
  );
}

function ForfeitDialog({ row, onClose }: { row: DepositRow; onClose: () => void }) {
  const c = useAB().deposits;
  const { locale } = useI18n();
  const toast = useToast();
  const m = useForfeit();
  const [reason, setReason] = useState("");
  return (
    <Dialog open onClose={onClose} title={fill(c.forfeit.title, { no: row.no })} description={fill(c.forfeit.body, { amount: formatMoney(row.remaining, "RWF", locale) })}
      footer={<Button disabled={!reason.trim()} loading={m.isPending} onClick={async () => {
        try { await m.mutateAsync({ id: row.no, reason, idempotencyKey: newIdempotencyKey() }); toast({ title: c.forfeit.done, tone: "success" }); onClose(); }
        catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
      }}>{c.forfeit.submit}</Button>}>
      <label className="grid gap-1 text-small">{c.forfeit.reason}<Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required /></label>
    </Dialog>
  );
}

function OffsetDialog({ row, bills, onClose }: { row: DepositRow; bills: OpenBill[]; onClose: () => void }) {
  const c = useAB().deposits;
  const { locale } = useI18n();
  const toast = useToast();
  const m = useOffset();
  const [key] = useState(newIdempotencyKey);
  const [billNo, setBill] = useState(bills[0]?.no ?? "");
  const bill = bills.find((b) => b.no === billNo);
  const [amount, setAmount] = useState(String(row.remaining));
  const r = bill ? applyAdvance(bill.payable, row.remaining, Math.round(Number(amount)) || 0) : null;
  const money = (n: number) => formatMoney(n, "RWF", locale);
  return (
    <Dialog open onClose={onClose} title={fill(c.offset.title, { no: row.no })} footer={bills.length ? <Button disabled={!r?.applied} loading={m.isPending} className="m-press" onClick={async () => {
      try { await m.mutateAsync({ id: row.no, billNo, amount: r!.applied, idempotencyKey: key }); toast({ title: fill(c.offset.done, { bill: billNo }), tone: "success" }); onClose(); }
      catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
    }}>{p_confirm(c)}</Button> : undefined}>
      {!bills.length ? <p className="text-small text-fg-muted">{c.offset.none}</p> : (
        <div className="grid gap-4">
          <label className="grid gap-1 text-small">{c.offset.bill}<Select value={billNo} onChange={(e) => setBill(e.target.value)}>{bills.map((b) => <option key={b.no} value={b.no}>{b.no} · {b.vendorInvoiceNo} · {money(b.payable)}</option>)}</Select></label>
          <label className="grid gap-1 text-small">{c.offset.amount}<Input type="number" min={0} max={row.remaining} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
          {r && bill && <p aria-live="polite" className="bg-info-bg px-3 py-2 text-small text-info tabular">{fill(c.offset.preview, { total: money(bill.payable), applied: money(r.applied), payable: money(r.payable), remaining: money(r.remaining) })}</p>}
        </div>
      )}
    </Dialog>
  );
}
const p_confirm = (c: ReturnType<typeof useAB>["deposits"]) => c.actions.offset;
