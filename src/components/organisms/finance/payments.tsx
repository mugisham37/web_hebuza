"use client";
// U8 Payments list (board 06 PY1 + PY6): saved-view tabs with counts, filters (URL; search stays local — no PII in URLs),
// OpsTable (cards < 768), totals row from the API, failure/expired/duplicate cards, PaymentDrawer on ?id=, manual record.
import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useUrlParams, setUrlParams } from "@/lib/url-state";
import { useShortcut } from "@/lib/ops/shortcuts";
import { formatDateTime } from "@/shared/format";
import { PAY_TABS, usePayments, type PayTab, type PaymentRow } from "@/lib/finance/c";
import type { Method } from "@/shared/finance/types";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { DateInput, Select } from "@/components/atoms/field";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { EmptyPanel, FilterBar, SavedViewTabs } from "@/components/molecules/ops/ops";
import { PageHead } from "@/components/atoms/agent";
import { Amount, DocNumber, FinStatus, MethodTag, VerifyScheduleChip, useF } from "@/components/atoms/finance";
import { NoAccess } from "@/components/molecules/finance/finance";
import { ArtNothingWaiting } from "@/components/atoms/finance-art";
import { PaymentDrawer } from "@/components/organisms/finance/payment-drawer";
import { ManualConfirmForm } from "@/components/organisms/finance/manual-confirm";
import { fill, useMoneyGuard, useP } from "@/components/molecules/finance/finance";
import { isForbidden } from "@/components/atoms/hooks";

const METHODS: Method[] = ["mtn_momo", "airtel_money", "card", "bank_transfer", "cash", "other"];

export function PaymentsView() {
  const p = useP();
  const f = useF();
  const { locale } = useI18n();
  const url = useUrlParams();
  const guard = useMoneyGuard();
  const tab = (PAY_TABS.includes(url.get("tab") as PayTab) ? url.get("tab") : "all") as PayTab;
  const method = url.get("method") ?? "", from = url.get("from") ?? "", to = url.get("to") ?? "", cs = url.get("case") ?? "", client = url.get("client") ?? "";
  const cursor = url.get("cursor") ?? "";
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search.trim());
  const qs = new URLSearchParams(Object.entries({ tab, method, from, to, case: cs, client, q, cursor }).filter(([, v]) => v)).toString();
  const list = usePayments(qs);
  const [record, setRecord] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const id = url.get("id");

  useShortcut("r", p.shortcuts.record, () => guard.can && setRecord(true), "list");
  const set = (patch: Record<string, string | null>) => setUrlParams({ ...patch, cursor: null });

  if (isForbidden(list.error)) return <NoAccess />;
  const meta = list.data?.meta;
  const rows = list.data?.items ?? [];
  const filtered = !!(method || from || to || cs || client || q);

  const columns: OpsColumn<PaymentRow>[] = [
    { key: "at", label: p.cols.at, cell: (r) => <span className="tabular">{formatDateTime(r.at, locale)}</span>, sort: (r) => r.at },
    { key: "method", label: p.cols.method, cell: (r) => <MethodTag method={r.method} /> },
    { key: "ref", label: p.cols.ref, cell: (r) => <span className="block max-w-40 truncate tabular" title={r.ref}>{r.ref ?? "—"}</span> },
    { key: "client", label: p.cols.client, cell: (r) => <span className="block max-w-44 truncate">{r.clientName}</span>, sort: (r) => r.clientName },
    { key: "invoice", label: p.cols.invoice, cell: (r) => <DocNumber no={r.invoiceNo} href={localHref(locale, `/finance/invoices/${r.invoiceNo}`)} /> },
    { key: "case", label: p.cols.case, cell: (r) => <span className="tabular">{r.caseRef ?? "—"}</span>, card: false },
    { key: "amount", label: p.cols.amount, align: "right", cell: (r) => <Amount value={r.amount} />, sort: (r) => r.amount },
    { key: "fee", label: p.cols.fee, align: "right", cell: (r) => (r.fee == null ? "—" : <Amount value={r.fee} size="sm" />), card: false },
    { key: "state", label: p.cols.state, wrap: true, cell: (r) => (
      <span className="flex flex-wrap items-center gap-1.5">
        <FinStatus status={r.state} kind="payment" />
        {r.duplicate && <span className="inline-flex items-center gap-1 text-eyebrow text-danger"><Icon name="layers" size={12} aria-hidden />{p.cards.duplicate[0]}</span>}
      </span>
    ) },
    { key: "verify", label: p.cols.verify, wrap: true, card: false, cell: (r) => (r.verify ? <VerifyScheduleChip nextAt={r.verify.nextAt} cadence={r.verify.cadence} /> : "—") },
  ];

  const emptyCopy = filtered ? p.empty.filtered : tab === "attention" ? p.empty.attention : p.empty.all;
  const alerts = tab === "attention" || tab === "failed" || tab === "expired" ? rows.filter((r) => r.duplicate || r.state === "failed" || r.state === "expired").slice(0, 3) : [];

  return (
    <div className="grid gap-5">
      <PageHead
        title={p.title}
        sub={p.sub}
        actions={<>
          <Link href={localHref(locale, "/finance/payments/proofs")} className="inline-flex h-11 items-center gap-2 border border-border-strong px-5 text-button m-press hover:bg-navy-50">
            <Icon name="fileCheck" size={16} aria-hidden />{p.openProofs}
            {!!meta?.counts.verification && <span className="bg-gold-400 px-2 text-eyebrow text-on-gold tabular">{meta.counts.verification}</span>}
          </Link>
          <Button onClick={() => setRecord(true)} disabled={!guard.can} title={!guard.online ? p.offline : undefined} className="m-press">
            <Icon name="plus" size={16} aria-hidden />{p.recordCash}
          </Button>
        </>}
      />

      <SavedViewTabs
        views={PAY_TABS.map((k) => ({ key: k, label: p.tabs[k], count: meta?.counts[k] }))}
        active={tab}
        onChange={(k) => set({ tab: k === "all" ? null : k })}
      />

      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder={p.search}
        chips={[
          ...(method ? [{ key: "method", label: (f.method as Record<string, string>)[method] ?? method, onRemove: () => set({ method: null }) }] : []),
          ...(from ? [{ key: "from", label: `${p.filters.from} ${from}`, onRemove: () => set({ from: null }) }] : []),
          ...(to ? [{ key: "to", label: `${p.filters.to} ${to}`, onRemove: () => set({ to: null }) }] : []),
          ...(cs ? [{ key: "case", label: fill(p.filters.case, { v: cs }), onRemove: () => set({ case: null }) }] : []),
          ...(client ? [{ key: "client", label: p.filters.client, onRemove: () => set({ client: null }) }] : []),
        ]}
        right={<>
          <label className="sr-only" htmlFor="pay-method">{p.filters.method}</label>
          <Select id="pay-method" value={method} onChange={(e) => set({ method: e.target.value || null })} className="h-10 w-auto min-w-36 text-small">
            <option value="">{p.filters.any}</option>
            {METHODS.map((m) => <option key={m} value={m}>{(f.method as Record<string, string>)[m]}</option>)}
          </Select>
          <label className="flex items-center gap-1.5 text-small text-fg-muted">{p.filters.from}
            <DateInput value={from} max={to || undefined} onChange={(e) => set({ from: e.target.value || null })} className="h-10 w-auto text-small" />
          </label>
          <label className="flex items-center gap-1.5 text-small text-fg-muted">{p.filters.to}
            <DateInput value={to} min={from || undefined} onChange={(e) => set({ to: e.target.value || null })} className="h-10 w-auto text-small" />
          </label>
        </>}
      />

      {!!alerts.length && (
        <ul className="grid gap-3 m-stagger sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((r) => {
            const [title, body] = r.duplicate ? p.cards.duplicate : r.state === "failed" ? p.cards.failed : p.cards.expired;
            const tone = r.duplicate ? "bg-navy-50 text-navy-800" : r.state === "failed" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning";
            return (
              <li key={r.id} className={`m-lift flex items-start gap-3 p-4 ${tone}`}>
                <Icon name={r.duplicate ? "layers" : r.state === "failed" ? "x" : "clock"} size={18} aria-hidden className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1 text-fg">
                  <p className="text-label">{title}</p>
                  <p className="text-small text-fg-muted">{body}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-eyebrow text-fg-subtle tabular">{r.invoiceNo} · <Amount value={r.amount} size="sm" /> · {formatDateTime(r.at, locale)}</p>
                </div>
                <button type="button" onClick={() => setUrlParams({ id: r.id })} className="text-small font-medium underline underline-offset-4">{p.cards.view}</button>
              </li>
            );
          })}
        </ul>
      )}

      <OpsTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        label={p.tableLabel}
        rowLabel={(r) => `${r.invoiceNo} ${r.clientName}`}
        loading={list.isPending}
        error={list.error}
        onRetry={() => list.refetch()}
        focused={focused}
        onFocus={setFocused}
        onOpen={(r) => setUrlParams({ id: r.id })}
        shortcuts
        rowTone={(r) => (r.duplicate ? "danger" : null)}
        pageSize={20}
        empty={<EmptyPanel title={emptyCopy[0]} body={emptyCopy[1]} action={filtered
          ? <Button size="sm" variant="outline" onClick={() => { setSearch(""); set({ method: null, from: null, to: null, case: null, client: null }); }}>{p.filters.clear}</Button>
          : <span className="text-navy-600"><ArtNothingWaiting /></span>} />}
      />

      {meta && rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-subtle px-4 py-3 text-small">
          <span className="font-medium">{fill(p.total, { n: meta.total })}</span>
          <span className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-fg-muted">{p.cols.amount} <Amount value={meta.amount} className="font-medium text-fg" /></span>
            <span className="flex items-center gap-1.5 text-fg-muted">{p.cols.fee} <Amount value={meta.fee} size="sm" /></span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-fg-subtle tabular">{fill(p.shown, { n: Number(cursor || 0) + rows.length, m: meta.total })}</span>
            {cursor && <Button size="sm" variant="ghost" onClick={() => setUrlParams({ cursor: String(Math.max(0, Number(cursor) - 20)) || null })} aria-label="Previous"><Icon name="arrowRight" size={14} className="rotate-180" aria-hidden /></Button>}
            {meta.next && <Button size="sm" variant="outline" onClick={() => setUrlParams({ cursor: meta.next })}>{p.more}</Button>}
          </span>
        </div>
      )}


      <PaymentDrawer id={id} onClose={() => setUrlParams({ id: null })} />
      {/* Deep link: ?tab=record&invoice=INV-…&amount=… (invoice detail, ops case, client, field). */}
      <ManualConfirmForm open={record || (url.get("tab") === "record" && guard.can)}
        prefill={url.get("tab") === "record" ? { invoiceNo: url.get("invoice") ?? undefined, amount: Number(url.get("amount")) || undefined } : undefined}
        onClose={() => { setRecord(false); setUrlParams({ tab: null, invoice: null, amount: null }); }}
        onDone={(pid) => { setRecord(false); setUrlParams({ tab: null, invoice: null, amount: null, id: pid }); }} />
    </div>
  );
}
