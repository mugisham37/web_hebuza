"use client";
// U12 Refunds queue (board 09 RF1 with fixes: nav highlights Refunds, tier column, auto-created badge) + credit-notes tab
// + "Create refund on behalf" (goes to SM review first) + mock simulator.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { formatDate, formatMoney, formatRelative } from "@/shared/format";
import { localHref } from "@/shared/i18n/config";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { newIdempotencyKey } from "@/lib/api/client";
import { useCreditNotes, useRefundCreate, useRefundable, useRefunds, type CreditNoteDetail, type RefundRow, type RefundTab } from "@/lib/finance/d";
import type { RefundReason } from "@/shared/finance/types";
import { Amount, DocNumber, FinStatus, TierChip, useF } from "@/components/atoms/finance";
import { NoAccess } from "@/components/molecules/finance/finance";
import { ArtNoRefunds } from "@/components/atoms/finance-art";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { EmptyPanel, SavedViewTabs } from "@/components/molecules/ops/ops";
import { PageHead } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Field, Input, Select, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { useShortcut } from "@/lib/ops/shortcuts";
import { POLICY } from "@/shared/policy";
import { Reason, errorCopy, fill, isForbidden, useRF } from "@/components/molecules/finance/refunds";

const TABS: RefundTab[] = ["awaiting_me", "requested", "in_review", "awaiting_executive", "executing", "completed", "rejected", "credit_notes"];

export function RefundsView() {
  const c = useRF();
  const { locale } = useI18n();
  const router = useRouter();
  const p = useUrlParams();
  const tab = (TABS as string[]).includes(p.get("tab") ?? "") ? (p.get("tab") as RefundTab) : "awaiting_me";
  const search = (p.get("q") ?? "").toLowerCase();
  const isCn = tab === "credit_notes";
  const q = useRefunds({ tab: isCn ? "awaiting_me" : tab });
  const cns = useCreditNotes(isCn);
  const [focused, setFocused] = useState<string | null>(null);
  const [create, setCreate] = useState(false);
  const online = useOnline();
  const L = (s: string) => localHref(locale, s);
  useShortcut("n", c.create.open, () => online && setCreate(true), "list");

  if ((q.isError && isForbidden(q.error)) || (cns.isError && isForbidden(cns.error))) return <NoAccess />;

  const match = (...xs: (string | undefined)[]) => !search || xs.some((x) => x?.toLowerCase().includes(search));
  const rows = (q.data?.items ?? []).filter((r) => match(r.no, r.clientName, r.invoiceNo, r.caseRef));
  const cnRows = (cns.data?.items ?? []).filter((n) => match(n.no, n.clientName, n.invoiceNo, n.refundNo));
  const counts = q.data?.counts;

  const cols: OpsColumn<RefundRow>[] = [
    { key: "no", label: c.cols.no, sort: (r) => r.no, cell: (r) => <DocNumber no={r.no} /> },
    { key: "client", label: c.cols.client, wrap: true, sort: (r) => r.clientName, cell: (r) => <span className="font-medium">{r.clientName}</span> },
    { key: "invoice", label: c.cols.invoice, cell: (r) => <span className="tabular text-small">{r.invoiceNo}</span> },
    { key: "case", label: c.cols.case, card: false, cell: (r) => <span className="tabular text-small text-fg-muted">{r.caseRef}</span> },
    { key: "reason", label: c.cols.reason, wrap: true, cell: (r) => (
      <span className="grid gap-1"><span className="text-small">{c.reasons[r.reason] ?? r.reason}</span>{r.auto && <span className="inline-flex w-fit items-center gap-1 bg-navy-50 px-2 py-0.5 text-eyebrow text-navy-800"><Icon name="zap" size={10} aria-hidden />{c.auto[r.auto]}</span>}</span>
    ) },
    { key: "amount", label: c.cols.amount, align: "right", sort: (r) => r.approved ?? r.recommended ?? r.requested, cell: (r) => <Amount value={r.approved ?? r.recommended ?? r.requested} className="font-semibold" /> },
    { key: "tier", label: c.cols.tier, cell: (r) => <TierChip tier={r.tier} limit={POLICY.refundExecLimit} /> },
    { key: "age", label: c.cols.age, sort: (r) => r.at, cell: (r) => <span className="text-small text-fg-muted">{formatRelative(r.at, locale)}</span> },
    { key: "state", label: c.cols.state, cell: (r) => <span className="flex items-center gap-1.5"><FinStatus status={r.status} kind="refund" />{r.mine && <span className="size-2 rounded-full bg-gold-400 ring-2 ring-navy-700" aria-label={c.tabs.awaiting_me} />}</span> },
  ];
  const cnCols: OpsColumn<CreditNoteDetail>[] = [
    { key: "no", label: c.cnCols.no, sort: (r) => r.no, cell: (r) => <DocNumber no={r.no} /> },
    { key: "client", label: c.cnCols.client, wrap: true, cell: (r) => <span className="font-medium">{r.clientName}</span> },
    { key: "invoice", label: c.cnCols.invoice, cell: (r) => <span className="tabular text-small">{r.invoiceNo}</span> },
    { key: "refund", label: c.cnCols.refund, cell: (r) => <span className="tabular text-small text-fg-muted">{r.refundNo ?? ""}</span> },
    { key: "total", label: c.cnCols.total, align: "right", sort: (r) => r.totals.total, cell: (r) => <Amount value={r.totals.total} className="font-semibold" /> },
    { key: "issued", label: c.cnCols.issued, sort: (r) => r.issuedAt, cell: (r) => <span className="text-small text-fg-muted">{formatDate(r.issuedAt, locale)}</span> },
  ];
  const e = search ? c.empty.search : c.empty[tab];
  const empty = (
    <div className="p-4">
      <EmptyPanel title={fill(e[0], { q: search })} body={fill(e[1] ?? "", { q: search }) || undefined} action={!search && <ArtNoRefunds />} />
    </div>
  );

  return (
    <div className="grid gap-5">
      <PageHead title={c.title} sub={c.sub} actions={
        <div className="grid justify-items-end gap-1">
          <Button data-guide="finance-refund-create" onClick={() => setCreate(true)} disabled={!online} variant="primary" dots className="m-press"><Icon name="plus" size={16} aria-hidden />{c.create.open}</Button>
          {!online && <Reason>{c.offline}</Reason>}
        </div>
      } />

      <div className="grid gap-3 m-rise">
        <SavedViewTabs active={tab} onChange={(k) => setUrlParams({ tab: k === "awaiting_me" ? null : k })}
          views={TABS.map((t) => ({ key: t, label: c.tabs[t], count: counts?.[t] }))} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="relative w-full max-w-sm">
            <span className="sr-only">{c.search}</span>
            <Icon name="search" size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
            <Input type="search" defaultValue={p.get("q") ?? ""} placeholder={c.search} onChange={(ev) => setUrlParams({ q: ev.target.value || null })} className="h-10 pl-9 text-small" />
          </label>
          {!isCn && q.data && <span className="text-small text-fg-muted tabular" aria-live="polite">{fill(c.shown, { n: rows.length })}</span>}
        </div>
      </div>

      <div className="border border-border bg-white m-rise">
        {isCn ? (
          <OpsTable rows={cnRows} columns={cnCols} rowKey={(r) => r.no} label={c.tabs.credit_notes} loading={cns.isPending} error={cns.isError ? cns.error : undefined}
            onRetry={() => cns.refetch()} empty={empty} focused={focused} onFocus={setFocused} shortcuts onOpen={(r) => router.push(L(`/finance/credit-notes/${r.no}`))} />
        ) : (
          <OpsTable rows={rows} columns={cols} rowKey={(r) => r.no} rowLabel={(r) => `${r.no} · ${r.clientName}`} label={c.tabs[tab]} loading={q.isPending}
            error={q.isError ? q.error : undefined} onRetry={() => q.refetch()} empty={empty} focused={focused} onFocus={setFocused} shortcuts
            rowTone={(r) => (r.status === "execution_failed" ? "danger" : null)} onOpen={(r) => router.push(L(`/finance/refunds/${r.no}`))} />
        )}
      </div>

      {/* Deep link: ?new=credit|refund&invoice=INV-… (invoice detail, ops case, client). Credit notes come out of the refund flow. */}
      {(create || p.has("new")) && <CreateDialog invoice={p.get("invoice") ?? ""} onClose={() => { setCreate(false); setUrlParams({ new: null, invoice: null }); }} onDone={(no) => router.push(L(`/finance/refunds/${no}`))} />}
    </div>
  );
}

const REASONS: RefundReason[] = ["cancelled_before_work", "service_not_delivered", "quality_dispute", "duplicate_payment", "other"];
/** Finance raises a refund for a client; it goes to the service manager first (plan U12). */
function CreateDialog({ onClose, onDone, invoice = "" }: { onClose: () => void; onDone: (no: string) => void; invoice?: string }) {
  const c = useRF();
  const f = useF();
  const { locale } = useI18n();
  const toast = useToast();
  const list = useRefundable(true);
  const m = useRefundCreate();
  const [key] = useState(newIdempotencyKey);
  const [inv, setInv] = useState(invoice);
  const [reason, setReason] = useState<RefundReason | "">("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const items = list.data?.items ?? [];
  async function submit() {
    const e: Record<string, string> = {};
    if (!inv) e.inv = c.create.choose;
    if (!reason) e.reason = c.create.reason;
    if (!note.trim()) e.note = c.create.noteHint;
    setErr(e);
    if (Object.keys(e).length || !reason) return;
    try {
      const r = await m.mutateAsync({ invoiceNo: inv, reason, note, idempotencyKey: key });
      toast({ title: fill(c.create.done, { no: r.no }), tone: "success" });
      onClose();
      onDone(r.no);
    } catch (x) { setErr({ form: errorCopy(x, locale) }); }
  }
  return (
    <Dialog open onClose={onClose} title={c.create.title} description={c.create.noteHint}
      footer={<Button onClick={submit} loading={m.isPending} disabled={!items.length} dots className="m-press">{c.create.submit}</Button>}>
      {list.isPending ? <div className="h-32 m-shimmer" /> : list.isError ? <p role="alert" className="text-small text-danger">{f.states.error}</p> : !items.length ? (
        <p className="text-small text-fg-muted">{c.create.none}</p>
      ) : (
        <form className="grid gap-4" onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
          {err.form && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger">{err.form}</p>}
          <Field label={c.create.invoice} error={err.inv}>{(a) => (
            <Select id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} value={inv} onChange={(ev) => setInv(ev.target.value)}>
              <option value="">{c.create.choose}</option>
              {items.map((i) => <option key={i.no} value={i.no}>{i.no} · {i.clientName}</option>)}
            </Select>
          )}</Field>
          {inv && <p className="-mt-2 text-small text-fg-muted">{fill(c.create.refundable, { amount: formatMoney(items.find((i) => i.no === inv)?.refundable ?? 0, "RWF", locale) })}</p>}
          <Field label={c.create.reason} error={err.reason}>{(a) => (
            <Select id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} value={reason} onChange={(ev) => setReason(ev.target.value as RefundReason)}>
              <option value=""></option>
              {REASONS.map((r) => <option key={r} value={r}>{c.reasons[r]}</option>)}
            </Select>
          )}</Field>
          <Field label={c.create.note} error={err.note}>{(a) => <Textarea id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} rows={3} value={note} onChange={(ev) => setNote(ev.target.value)} />}</Field>
        </form>
      )}
    </Dialog>
  );
}
