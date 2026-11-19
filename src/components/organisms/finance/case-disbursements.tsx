"use client";
// F-SUP-17 case disbursements: third-party costs paid for a case (vendor + case + pass-through line on a draft invoice).
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { useI18n } from "@/lib/i18n/provider";
import { formatDate, formatMoney } from "@/shared/format";
import { financeInvoices } from "@/content/pages/finance-invoices";
import { fill } from "@/content/pages/finance-common";
import { Button } from "@/components/atoms/button";
import { Field, Input, Select } from "@/components/atoms/field";
import { useToast } from "@/components/atoms/toast";
import { SkeletonRows } from "@/components/atoms/agent";
import { EmptyPanel, PanelError } from "@/components/molecules/ops/ops";

type Dsb = { id: string; vendorName: string; label: string; amount: number; billNo?: string; invoiceKey: string; at: string };
type Vendor = { id: string; legalName: string; status?: string };

export function CaseDisbursements({ caseRef }: { caseRef: string }) {
  const { locale } = useI18n();
  const c = financeInvoices(locale).dsb;
  const qc = useQueryClient();
  const toast = useToast();
  const key = ["finance", "disbursements", caseRef];
  const list = useQuery({
    queryKey: key,
    queryFn: () => unwrap<{ items: Dsb[] }>(api.GET("/api/finance/cases/{ref}/disbursements", { params: { path: { ref: caseRef } } })).then((d) => d.items),
  });
  const vendors = useQuery({
    queryKey: ["finance", "vendors"],
    queryFn: () => unwrap<{ items: Vendor[] }>(api.GET("/api/procurement/vendors")).then((d) => d.items),
  });
  const [f, setF] = useState({ vendorId: "", label: "", amount: "", billNo: "" });
  const amount = Number(f.amount);
  const ok = f.vendorId && f.label.trim() && Number.isInteger(amount) && amount > 0;
  const add = useMutation({
    mutationFn: () =>
      unwrap<Dsb>(api.POST("/api/finance/cases/{ref}/disbursements", {
        params: { path: { ref: caseRef } },
        body: { vendorId: f.vendorId, label: f.label.trim(), amount, billNo: f.billNo.trim() || undefined },
      })),
    onSuccess: (d) => {
      toast({ tone: "success", title: fill(c.added, { key: d.invoiceKey }) });
      setF({ vendorId: "", label: "", amount: "", billNo: "" });
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (e) => toast({ tone: "danger", title: errorCopy(e, locale) }),
  });
  return (
    <div className="grid gap-4 pt-4">
      <p className="text-small text-fg-muted">{c.intro}</p>
      {list.isPending ? <SkeletonRows n={2} /> : list.error ? <PanelError what={c.err} onRetry={() => void list.refetch()} /> : !list.data.length ? (
        <EmptyPanel compact title={c.empty} />
      ) : (
        <ul className="grid gap-2">
          {list.data.map((d) => (
            <li key={d.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border border-border bg-white p-3 text-small">
              <span className="font-medium">{d.vendorName}</span>
              <span className="min-w-0 flex-1">{d.label}{d.billNo ? ` · ${d.billNo}` : ""}</span>
              <span className="tabular">{formatMoney(d.amount, "RWF", locale)}</span>
              <span className="text-fg-subtle tabular">{formatDate(d.at, locale)} · {d.invoiceKey}</span>
            </li>
          ))}
        </ul>
      )}
      <form className="grid gap-3 border border-border bg-white p-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (ok) add.mutate(); }}>
        <Field label={c.vendor}>
          {(a) => vendors.data && !vendors.data.length ? <p id={a.id} className="text-small text-fg-muted">{c.noVendors}</p> : (
            <Select id={a.id} aria-describedby={a.describedBy} value={f.vendorId} disabled={vendors.isPending} onChange={(e) => setF({ ...f, vendorId: e.target.value })}>
              <option value="">{c.pick}</option>
              {(vendors.data ?? []).map((v) => <option key={v.id} value={v.id}>{v.legalName}</option>)}
            </Select>
          )}
        </Field>
        <Field label={c.label}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} maxLength={200} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />}</Field>
        <Field label={c.amount}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} type="number" min={1} inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />}</Field>
        <Field label={c.bill}>{(a) => <Input id={a.id} aria-describedby={a.describedBy} maxLength={64} value={f.billNo} onChange={(e) => setF({ ...f, billNo: e.target.value })} />}</Field>
        <div className="sm:col-span-2"><Button type="submit" disabled={!ok} loading={add.isPending}>{c.add}</Button></div>
      </form>
    </div>
  );
}
