"use client";
// PA Payments tracker (board 08 PA1, fixes: no match-exception filter, real statuses). Read-only for procurement; finance pays in /finance/payables.
import { useRouter } from "next/navigation";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { formatDateTime } from "@/shared/format";
import { useUrlParams } from "@/lib/url-state";
import { ApiError } from "@/lib/api/client";
import { usePayments, type BillRow } from "@/lib/procurement/de";
import type { VendorPayment } from "@/shared/procurement/types";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { EmptyPanel } from "@/components/molecules/ops/ops";
import { PageHead } from "@/components/atoms/agent";
import { Amount, DocNo, LockChip, ProcPill } from "@/components/atoms/procurement";
import { ProcNoAccess } from "@/components/molecules/procurement/procurement";
import { DueChip, useDE } from "@/components/organisms/procurement/bills";

type PayRow = VendorPayment & { vendorName: string };
export function PaymentsView() {
  const c = useDE();
  const { locale } = useI18n();
  const router = useRouter();
  const u = useUrlParams();
  const q = usePayments();
  if (q.isError && q.error instanceof ApiError && q.error.isForbidden) return <ProcNoAccess />;
  const search = (u.get("q") ?? "").toUpperCase();
  const today = new Date().toISOString().slice(0, 10);
  const waiting = q.data?.waiting ?? [];
  const paid = (q.data?.payments ?? []).filter((x) => !search || x.no === search || x.remittance.no === search || x.allocations.some((a) => a.billNo === search));
  const wCols: OpsColumn<BillRow>[] = [
    { key: "bill", label: c.pay.cols.bill, cell: (b) => <DocNo kind="BL" no={b.no} /> },
    { key: "supplier", label: c.pay.cols.supplier, wrap: true, cell: (b) => <span className="grid gap-0.5"><span className="font-medium">{b.vendorName}</span>{b.locked && <LockChip until={b.lockUntil} compact />}</span> },
    { key: "due", label: c.bills.cols.due, sort: (b) => b.dueOn, cell: (b) => <DueChip due={b.dueOn} today={today} status={b.status} /> },
    { key: "amount", label: c.pay.cols.amount, align: "right", sort: (b) => b.payable - b.amountPaid, cell: (b) => <Amount value={b.payable - b.amountPaid} className="font-semibold" /> },
    { key: "by", label: c.pay.cols.by, cell: (b) => <span className="text-small">{b.authorisedBy?.name ?? ""}</span> },
    { key: "state", label: c.pay.cols.state, cell: (b) => <ProcPill state={b.status} machine="bill" /> },
  ];
  const pCols: OpsColumn<PayRow>[] = [
    { key: "no", label: c.pay.cols.ref, cell: (x) => <span className="grid"><DocNo kind="VP" no={x.no} /><span className="text-eyebrow text-fg-subtle tabular">{x.reference}</span></span> },
    { key: "supplier", label: c.pay.cols.supplier, wrap: true, cell: (x) => <span className="font-medium">{x.vendorName}</span> },
    { key: "bills", label: c.pay.cols.bill, wrap: true, cell: (x) => <span className="text-small tabular">{x.allocations.map((a) => a.billNo).join(", ")}</span> },
    { key: "method", label: c.pay.cols.method, cell: (x) => <span className="text-small">{c.pay.method[x.method]}</span> },
    { key: "amount", label: c.pay.cols.amount, align: "right", sort: (x) => x.amount, cell: (x) => <Amount value={x.amount} className="font-semibold" /> },
    { key: "paid", label: c.pay.cols.paidAt, sort: (x) => x.paidAt, cell: (x) => <span className="text-small text-fg-muted">{x.paidBy.name} · {formatDateTime(x.paidAt, locale)}</span> },
    { key: "remit", label: c.pay.cols.remit, cell: (x) => <span className="flex items-center gap-2"><DocNo kind="RA" no={x.remittance.no} /><ProcPill state={x.remittance.status} machine="remittance" /></span> },
  ];
  return (
    <div className="grid gap-5">
      <PageHead title={c.pay.title} sub={c.pay.sub} />
      <section className="grid gap-2 m-rise">
        <h2 className="text-card-title">{c.pay.waiting}</h2>
        <div className="border border-border bg-surface">
          <OpsTable rows={waiting} columns={wCols} rowKey={(b) => b.no} label={c.pay.waiting} loading={q.isPending} error={q.isError ? q.error : undefined} onRetry={() => q.refetch()}
          rowTone={(b) => (b.locked ? "danger" : null)} onOpen={(b) => router.push(localHref(locale, `/procurement/bills/${b.no}?tab=payments`))}
          empty={<div className="p-4"><EmptyPanel title={c.pay.none} compact /></div>} />
                </div>
      </section>
      <section className="grid gap-2 m-rise">
        <h2 className="text-card-title">{c.pay.history}</h2>
        <div className="border border-border bg-surface">
          <OpsTable rows={paid} columns={pCols} rowKey={(x) => x.no} label={c.pay.history} loading={q.isPending} shortcuts
          onOpen={(x) => router.push(localHref(locale, `/procurement/bills/${x.allocations[0].billNo}?tab=payments`))}
          empty={<div className="p-4"><EmptyPanel title={c.pay.noHistory} compact /></div>} />
        </div>
      </section>
    </div>
  );
}
