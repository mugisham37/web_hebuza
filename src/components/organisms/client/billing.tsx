"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { formatDate, formatMoney, mask } from "@/shared/format";
import type { Tone } from "@/shared/domain/case-status";
import type { components } from "@/lib/api/schema";

type Sub = components["schemas"]["MySubscriptionResponse"];
import { c3Copy, fill } from "@/content/pages/c3";
import { Button, buttonClass } from "@/components/atoms/button";
import { Tabs } from "@/components/atoms/tabs";
import { Sheet, Dialog } from "@/components/atoms/dialog";
import { Badge } from "@/components/atoms/tag";
import { DataTable, type Column } from "@/components/atoms/data-table";
import { EmptyState, ErrorState, Skeleton } from "@/components/atoms/feedback";
import { Icon, type IconName } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Field, Select, Textarea } from "@/components/atoms/field";
import { daysUntil } from "@/components/molecules/client/api";
import { saveBlob } from "@/components/molecules/client/zip";

export type Invoice = {
  number: string;
  service: string;
  requestCode?: string | null;
  issuedAt: string;
  dueAt: string;
  amount: number;
  currency: string;
  status: "due" | "overdue" | "paid" | "refund_pending" | "refunded";
  refundAmount?: number | null;
};
export type Receipt = {
  number: string;
  invoiceNumber: string;
  paidAt: string;
  amount: number;
  currency: string;
  method: string;
};
export type Quote = {
  number: string;
  service: string;
  issuedAt: string;
  expiresAt: string;
  amount: number;
  currency: string;
  status: "pending" | "accepted" | "declined" | "expired";
  note?: string | null;
};
export type PayMethod = {
  id: string;
  kind: "momo" | "card";
  label: string;
  last4: string;
  primary: boolean;
};

const TONE: Record<Invoice["status"], Tone> = {
  due: "warning",
  overdue: "danger",
  paid: "success",
  refund_pending: "info",
  refunded: "neutral",
};
const unpaid = (i: Invoice) => i.status === "due" || i.status === "overdue";
const pdf = (no: string) => `/api/me/invoices/${encodeURIComponent(no)}/pdf`;

/** C11 /billing: summary tiles, to-pay, invoices (+ detail drawer), receipts, plan, payment methods. */
export function BillingPage() {
  const { locale } = useI18n();
  const c = c3Copy(locale).bill;
  // ★ Client invoice/receipt/payment-method endpoints aren't on the server yet (FIN module); mocked in handlers-c3.
  const inv = useQuery({
    queryKey: ["c3", "invoices"],
    queryFn: () =>
      unwrap<{ invoices: Invoice[]; creditBalance: number }>(api.GET("/api/me/invoices")),
  });
  const rec = useQuery({
    queryKey: ["c3", "receipts"],
    queryFn: () =>
      unwrap<{ receipts: Receipt[] }>(api.GET("/api/me/receipts")).then((d) => d.receipts),
  });
  const sub = useQuery({
    queryKey: ["c3", "subscription"],
    queryFn: () => unwrap<Sub>(api.GET("/api/me/subscription")),
  });
  const [open, setOpen] = useState<Invoice | null>(null);

  const invoices = inv.data?.invoices ?? [];
  const toPay = invoices.filter(unpaid);
  const toPayTotal = toPay.reduce((s, i) => s + i.amount, 0);
  const year = new Date().getFullYear();
  const paidYear = (rec.data ?? [])
    .filter((r) => new Date(r.paidAt).getFullYear() === year)
    .reduce((s, r) => s + r.amount, 0);
  const money = (n: number) => formatMoney(n, "RWF", locale);

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-fg-heading text-h2">{c.title}</h1>
        <p className="mt-2 text-lead">{c.lede}</p>
      </header>

      {inv.error ? (
        <ErrorState error={inv.error} onRetry={() => inv.refetch()} />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile
              icon="wallet"
              tone="border-l-3 border-l-gold-400 bg-gold-50"
              label={c.toPay}
              value={inv.isPending ? null : money(toPayTotal)}
              action={
                toPay[0] && (
                  <a
                    href={localHref(locale, `/pay/${toPay[0].number}`)}
                    className={buttonClass({
                      size: "sm",
                      className: "shrink-0",
                    })}
                  >
                    {c.payNow}
                  </a>
                )
              }
            />
            <Tile
              icon="chart"
              label={c.paidYear}
              value={rec.isPending ? null : money(paidYear)}
            />
            <Tile
              icon="sparkle"
              tone="bg-bg-tint"
              label={c.credit}
              value={inv.isPending ? null : money(inv.data?.creditBalance ?? 0)}
              hint={c.creditHint}
            />
            <Tile
              icon="calendar"
              label={c.plan}
              value={
                sub.isPending
                  ? null
                  : (sub.data?.enrolled && sub.data.planName) || c.noPlan
              }
              action={
                <a
                  href={localHref(locale, "/pricing")}
                  className="text-small underline underline-offset-4"
                >
                  {c.seePlans}
                </a>
              }
            />
          </ul>

          <Tabs
            tabs={[
              {
                id: "toPay",
                label: c.tabs.toPay,
                count: toPay.length,
                content: (
                  <ToPay
                    rows={toPay}
                    loading={inv.isPending}
                    onOpen={setOpen}
                  />
                ),
              },
              {
                id: "invoices",
                label: c.tabs.invoices,
                content: (
                  <Invoices
                    rows={invoices}
                    loading={inv.isPending}
                    onOpen={setOpen}
                  />
                ),
              },
              { id: "quotes", label: c.tabs.quotes, content: <Quotes /> },
              {
                id: "receipts",
                label: c.tabs.receipts,
                content: <Receipts q={rec} />,
              },
              {
                id: "statements",
                label: c.tabs.statements,
                content: <Statements invoices={invoices} receipts={rec.data ?? []} loading={inv.isPending || rec.isPending} />,
              },
              { id: "plan", label: c.tabs.plan, content: <Plan q={sub} /> },
              { id: "methods", label: c.tabs.methods, content: <Methods /> },
            ]}
          />
        </>
      )}

      <aside className="flex flex-wrap items-center gap-3 bg-bg-tint p-4">
        <Icon name="message" aria-hidden />
        <span className="font-medium">{c.help}</span>
        <a
          href={localHref(locale, "/messages")}
          className="text-button underline underline-offset-4"
        >
          {c.chat}
        </a>
      </aside>

      <InvoiceDrawer inv={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  hint,
  action,
  tone = "bg-surface",
}: {
  icon: IconName;
  label: string;
  value: string | null;
  hint?: string;
  action?: React.ReactNode;
  tone?: string;
}) {
  return (
    <li
      className={`flex min-w-0 flex-wrap items-center gap-3 border border-border p-4 ${tone}`}
    >
      <Icon name={icon} size={24} aria-hidden className="shrink-0" />
      <div className="min-w-0 grow">
        <p className="text-small">{label}</p>
        {value === null ? (
          <Skeleton className="mt-1 h-6 w-24" />
        ) : (
          <p className="text-card-title whitespace-nowrap">{value}</p>
        )}
        {hint && <p className="mt-1 text-small text-fg-subtle">{hint}</p>}
      </div>
      {action}
    </li>
  );
}

function StatusBadge({ s }: { s: Invoice["status"] }) {
  const { locale } = useI18n();
  return <Badge tone={TONE[s]}>{c3Copy(locale).bill.status[s]}</Badge>;
}

function ToPay({
  rows,
  loading,
  onOpen,
}: {
  rows: Invoice[];
  loading: boolean;
  onOpen: (i: Invoice) => void;
}) {
  const { locale } = useI18n();
  const c = c3Copy(locale).bill;
  if (loading) return <Skeleton className="h-24 " />;
  if (!rows.length) return <EmptyState body={c.allClear} />;
  return (
    <ul className="divide-y divide-border border border-border bg-surface">
      {rows.map((i) => (
        <li key={i.number} className="flex flex-wrap items-center gap-3 p-4">
          <span
            aria-hidden
            className="grid size-10 place-items-center bg-bg-tint text-sky-700"
          >
            <Icon name="file" size={18} />
          </span>
          <button
            type="button"
            onClick={() => onOpen(i)}
            className="min-w-0 flex-1 basis-48 text-left"
          >
            <span className="block font-medium break-words">
              {i.number} · {i.service}
            </span>
            <span className="text-small text-fg-subtle">
              {fill(i.status === "overdue" ? c.overdueBy : c.dueOn, {
                date: formatDate(i.dueAt, locale),
              })}{" "}
              · {formatMoney(i.amount, i.currency, locale)}
            </span>
          </button>
          <StatusBadge s={i.status} />
          <a
            href={localHref(locale, `/pay/${i.number}`)}
            className={buttonClass({ size: "sm" })}
          >
            {c.pay}
          </a>
        </li>
      ))}
    </ul>
  );
}

function Invoices({
  rows,
  loading,
  onOpen,
}: {
  rows: Invoice[];
  loading: boolean;
  onOpen: (i: Invoice) => void;
}) {
  const { locale } = useI18n();
  const c = c3Copy(locale).bill;
  const [q, setQ] = useState("");
  const shown = rows.filter((i) =>
    `${i.number} ${i.service}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const cols: Column<Invoice>[] = [
    {
      key: "no",
      header: c.cols.no,
      cell: (i) => (
        <button
          type="button"
          onClick={() => onOpen(i)}
          className="font-medium underline underline-offset-4"
        >
          {i.number}
        </button>
      ),
      csv: (i) => i.number,
    },
    {
      key: "service",
      header: c.cols.service,
      cell: (i) => i.service,
      csv: (i) => i.service,
    },
    {
      key: "date",
      header: c.cols.date,
      cell: (i) => formatDate(i.issuedAt, locale),
      sortValue: (i) => i.issuedAt,
      csv: (i) => i.issuedAt,
    },
    {
      key: "amount",
      header: c.cols.amount,
      cell: (i) => formatMoney(i.amount, i.currency, locale),
      sortValue: (i) => i.amount,
      csv: (i) => i.amount,
    },
    {
      key: "status",
      header: c.cols.status,
      cell: (i) => <StatusBadge s={i.status} />,
      csv: (i) => i.status,
    },
  ];
  return (
    <div className="grid gap-3">
      <label className="relative max-w-sm">
        <span className="sr-only">{c3Copy(locale).common.search}</span>
        <Icon
          name="search"
          size={18}
          aria-hidden
          className="absolute top-1/2 left-4 -translate-y-1/2 text-fg-subtle"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={c.searchPh}
          className="h-11 w-full border border-border bg-surface pr-4 pl-11 text-body focus:border-secondary focus:outline-none"
        />
      </label>
      <DataTable
        rows={shown}
        columns={cols}
        rowKey={(i) => i.number}
        loading={loading}
        exportName="invoices"
        empty={<EmptyState body={c.noInvoices} />}
      />
    </div>
  );
}

function Receipts({
  q,
}: {
  q: {
    data?: Receipt[];
    isPending: boolean;
    error: unknown;
    refetch: () => void;
  };
}) {
  const { locale } = useI18n();
  const c = c3Copy(locale).bill;
  const cols: Column<Receipt>[] = [
    { key: "no", header: c.receipt, cell: (r) => r.number },
    { key: "inv", header: c.cols.no, cell: (r) => r.invoiceNumber },
    {
      key: "date",
      header: c.cols.date,
      cell: (r) => formatDate(r.paidAt, locale),
      sortValue: (r) => r.paidAt,
    },
    { key: "method", header: c.method, cell: (r) => r.method },
    {
      key: "amount",
      header: c.cols.amount,
      cell: (r) => formatMoney(r.amount, r.currency, locale),
      sortValue: (r) => r.amount,
    },
    {
      key: "dl",
      header: c.cols.action,
      cell: (r) => (
        <a
          href={`/api/me/receipts/${encodeURIComponent(r.number)}/pdf`}
          download
          className="underline underline-offset-4"
        >
          {c3Copy(locale).common.download}
        </a>
      ),
    },
  ];
  return (
    <DataTable
      rows={q.data ?? []}
      columns={cols}
      rowKey={(r) => r.number}
      loading={q.isPending}
      error={q.error}
      onRetry={q.refetch}
      empty={<EmptyState body={c.noReceipts} />}
    />
  );
}

function Plan({
  q,
}: {
  q: { data?: Sub;
    isPending: boolean;
    error: unknown;
    refetch: () => void;
  };
}) {
  const { locale } = useI18n();
  const c = c3Copy(locale).bill;
  if (q.error) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (q.isPending) return <Skeleton className="h-32 " />;
  const s = q.data;
  return (
    <div className="grid max-w-xl gap-3 border border-border bg-surface p-6">
      {s?.enrolled ? (
        <>
          <p className="flex flex-wrap items-center gap-2 text-card-title">
            {s.planName}
            <Badge tone="success">{c.planActive}</Badge>
          </p>
          {s.periodEnd && (
            <p className="text-fg-subtle">
              {fill(c.renews, { date: formatDate(s.periodEnd, locale) })}
            </p>
          )}
          {s.maxApplicationsPerMonth != null && (
            <progress
              className="h-1.5 w-full accent-secondary"
              max={s.maxApplicationsPerMonth}
              value={s.applicationsUsedThisPeriod ?? 0}
              aria-label={`${s.applicationsUsedThisPeriod ?? 0} / ${s.maxApplicationsPerMonth}`}
            />
          )}
        </>
      ) : (
        <>
          <p className="text-card-title">
            {c.plan}: {c.noPlan}
          </p>
          <p className="text-fg-subtle">{c.noPlanBody}</p>
        </>
      )}
      <a
        href={localHref(locale, "/pricing")}
        className={buttonClass({
          variant: "outline",
          size: "sm",
          className: "justify-self-start",
        })}
      >
        {s?.enrolled ? c.managePlan : c.seePlans}
      </a>
    </div>
  );
}

function Methods() {
  const { locale } = useI18n();
  const c = c3Copy(locale);
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({
    queryKey: ["c3", "methods"],
    queryFn: () =>
      unwrap<{ methods: PayMethod[] }>(api.GET("/api/me/payment-methods")).then(
        (d) => d.methods,
      ),
  });
  const [removing, setRemoving] = useState<PayMethod | null>(null);
  const del = useMutation({
    mutationFn: (id: string) =>
      unwrap(api.DELETE("/api/me/payment-methods/{id}", { params: { path: { id } } })),
    onSuccess: () => {
      setRemoving(null);
      toast({ title: c.bill.removed, tone: "success" });
      qc.invalidateQueries({ queryKey: ["c3", "methods"] });
    },
    onError: () => toast({ title: c.common.error, tone: "danger" }),
  });
  if (q.error)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-24 " />;
  return (
    <div className="grid gap-3">
      <p className="text-fg-subtle">{c.bill.methodsHint}</p>
      {!q.data.length ? (
        <EmptyState body={c.bill.noMethods} />
      ) : (
        <ul className="grid gap-2">
          {q.data.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-3 border border-border bg-surface p-4"
            >
              <Icon name={m.kind === "card" ? "card" : "phone"} aria-hidden />
              <span className="min-w-0 flex-1 font-medium">
                {m.label} {mask(m.last4)}
              </span>
              {m.primary && <Badge tone="accent">{c.bill.primary}</Badge>}
              <Button size="sm" variant="ghost" onClick={() => setRemoving(m)}>
                {c.bill.remove}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={c.bill.removeTitle}
        footer={
          <>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              {c.common.cancel}
            </Button>
            <Button
              variant="danger"
              loading={del.isPending}
              onClick={() => removing && del.mutate(removing.id)}
            >
              {c.bill.remove}
            </Button>
          </>
        }
      >
        <p>{removing && `${removing.label} ${mask(removing.last4)}`}</p>
      </Dialog>
    </div>
  );
}

function InvoiceDrawer({
  inv,
  onClose,
}: {
  inv: Invoice | null;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const c = c3Copy(locale).bill;
  const rows: [string, string][] = inv
    ? [
        [c.cols.service, inv.service],
        [c.issue, formatDate(inv.issuedAt, locale)],
        [c.cols.due, formatDate(inv.dueAt, locale)],
        [c.cols.amount, formatMoney(inv.amount, inv.currency, locale)],
      ]
    : [];
  return (
    <Sheet
      open={!!inv}
      onClose={onClose}
      title={c.detail}
      footer={
        inv && (
          <>
            <a
              href={pdf(inv.number)}
              download
              className={buttonClass({ variant: "outline" })}
            >
              {c.downloadPdf}
            </a>
            {unpaid(inv) && (
              <a
                href={localHref(locale, `/pay/${inv.number}`)}
                className={buttonClass({})}
              >
                {c.payNow}
              </a>
            )}
          </>
        )
      }
    >
      {inv && (
        <div className="grid gap-5">
          <p className="flex flex-wrap items-center gap-2 text-card-title">
            {inv.number}
            <StatusBadge s={inv.status} />
          </p>
          {inv.status === "overdue" && (
            <p
              role="status"
              className="bg-danger-bg p-3 text-danger"
            >
              {c.overdueNote}
            </p>
          )}
          {inv.status === "refund_pending" && (
            <p role="status" className="bg-info-bg p-3 text-info">
              {fill(c.refundNote, {
                amount: formatMoney(
                  inv.refundAmount ?? inv.amount,
                  inv.currency,
                  locale,
                ),
              })}
            </p>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-fg-subtle">{k}</dt>
                <dd className="break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Sheet>
  );
}

const QTONE: Record<Quote["status"], Tone> = { pending: "warning", accepted: "success", declined: "neutral", expired: "neutral" };

function Quotes() {
  const { locale } = useI18n();
  const c = c3Copy(locale);
  const q4 = c.bill.quotes;
  const qc = useQueryClient();
  const toast = useToast();
  // ★ /api/me/quotations (FIN client endpoints), not on the server yet; mocked in handlers-c3.
  const q = useQuery({
    queryKey: ["c3", "quotes"],
    queryFn: () => unwrap<{ quotations: Quote[] }>(api.GET("/api/me/quotations")).then((d) => d.quotations),
  });
  const [declining, setDeclining] = useState<Quote | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string>();
  const act = useMutation({
    mutationFn: ({ no, action, reason }: { no: string; action: "accept" | "decline"; reason?: string }) =>
      unwrap(api.POST("/api/me/quotations/{no}/{action}", { params: { path: { no, action } }, body: { reason } })),
    onSuccess: (_, v) => {
      setDeclining(null);
      setReason("");
      toast({ title: v.action === "accept" ? q4.acceptedToast : q4.declinedToast, tone: "success" });
      qc.invalidateQueries({ queryKey: ["c3", "quotes"] });
      qc.invalidateQueries({ queryKey: ["c3", "invoices"] });
    },
    onError: () => toast({ title: c.common.error, tone: "danger" }),
  });
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-24 " />;
  if (!q.data.length) return <EmptyState body={q4.empty} />;
  return (
    <>
      <ul className="grid gap-3">
        {q.data.map((x) => {
          const expired = x.status === "expired" || (x.status === "pending" && daysUntil(x.expiresAt) < 1);
          const status = expired ? "expired" : x.status;
          return (
            <li key={x.number} className="grid gap-3 border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <p className="min-w-0 flex-1 basis-48 font-medium break-words">
                  {x.number} · {x.service}
                </p>
                <Badge tone={QTONE[status]}>{q4.status[status]}</Badge>
              </div>
              <p className="text-card-title">{formatMoney(x.amount, x.currency, locale)}</p>
              {x.note && <p className="text-small text-fg-subtle">{x.note}</p>}
              <p className="flex items-center gap-2 text-small text-fg-subtle">
                <Icon name="clock" size={14} aria-hidden />
                {fill(expired ? q4.expiredOn : q4.expires, { date: formatDate(x.expiresAt, locale) })}
              </p>
              {status === "pending" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    loading={act.isPending && act.variables?.no === x.number && act.variables.action === "accept"}
                    onClick={() => act.mutate({ no: x.number, action: "accept" })}
                  >
                    {q4.accept}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setErr(undefined); setDeclining(x); }}>
                    {q4.decline}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Dialog
        open={!!declining}
        onClose={() => setDeclining(null)}
        title={q4.declineTitle}
        description={declining ? `${declining.number} · ${declining.service}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeclining(null)}>{c.common.cancel}</Button>
            <Button
              variant="danger"
              loading={act.isPending}
              onClick={() => {
                if (!reason.trim()) return setErr(q4.reasonRequired);
                if (declining) act.mutate({ no: declining.number, action: "decline", reason: reason.trim() });
              }}
            >
              {q4.decline}
            </Button>
          </>
        }
      >
        <Field label={q4.reason} error={err}>
          {({ id, describedBy, invalid }) => (
            <Textarea id={id} rows={3} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} />
          )}
        </Field>
      </Dialog>
    </>
  );
}

type Period = "thisMonth" | "lastMonth" | "last3" | "thisYear";
function range(p: Period, now = new Date()): [Date, Date] {
  const y = now.getFullYear(), m = now.getMonth();
  if (p === "thisMonth") return [new Date(y, m, 1), new Date(y, m + 1, 1)];
  if (p === "lastMonth") return [new Date(y, m - 1, 1), new Date(y, m, 1)];
  if (p === "last3") return [new Date(y, m - 2, 1), new Date(y, m + 1, 1)];
  return [new Date(y, 0, 1), new Date(y + 1, 0, 1)];
}

function Statements({ invoices, receipts, loading }: { invoices: Invoice[]; receipts: Receipt[]; loading: boolean }) {
  const { locale } = useI18n();
  const c = c3Copy(locale).bill;
  const s = c.statements;
  const [period, setPeriod] = useState<Period>("thisMonth");
  const [from, to] = range(period);
  const inside = (d: string) => { const t = new Date(d); return t >= from && t < to; };
  // shortcut: statement built client-side from invoices + receipts; use a server statement endpoint when FIN ships one.
  const rows: (string | number)[][] = [
    ...invoices.filter((i) => inside(i.issuedAt)).map((i) => [i.issuedAt.slice(0, 10), "invoice", i.number, i.service, i.amount, i.currency, i.status]),
    ...receipts.filter((r) => inside(r.paidAt)).map((r) => [r.paidAt.slice(0, 10), "payment", r.number, r.invoiceNumber, -r.amount, r.currency, r.method]),
  ].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  const download = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [["date", "type", "number", "detail", "amount", "currency", "status"], ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    saveBlob(new Blob([csv], { type: "text/csv" }), `statement-${period}-${from.toISOString().slice(0, 7)}.csv`);
  };
  if (loading) return <Skeleton className="h-24 " />;
  return (
    <div className="grid max-w-xl gap-4 border border-border bg-surface p-6">
      <p className="text-fg-subtle">{s.hint}</p>
      <Field label={s.period}>
        {({ id }) => (
          <Select id={id} value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            {(Object.keys(s.periods) as Period[]).map((k) => <option key={k} value={k}>{s.periods[k]}</option>)}
          </Select>
        )}
      </Field>
      <p className="text-small" aria-live="polite">{fill(s.count, { n: rows.length })}</p>
      <Button className="justify-self-start" disabled={!rows.length} onClick={download}>
        <Icon name="file" size={16} aria-hidden /> {s.download}
      </Button>
    </div>
  );
}
