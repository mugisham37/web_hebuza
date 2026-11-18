"use client";
// Stage 8 lane E: /work/earnings (board 09 EA1–EA4, 12 ST2). Allocations reuse the Stage 4 EarningsView through its
// slots; statements / payouts / own invoices are external-only tabs (plan §7.7).
import { useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { cx, formatDate, formatMoney } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { EarningsView } from "@/components/organisms/agent/earnings";
import { SkeletonRows } from "@/components/atoms/agent";
import { EmptyPanel, Panel, PanelError } from "@/components/molecules/ops/ops";
import { OpsTable, type OpsColumn } from "@/components/molecules/ops/ops-table";
import { Tabs } from "@/components/atoms/tabs";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { Field, Input } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { useToast } from "@/components/atoms/toast";
import { errorCopy } from "@/lib/api/error-copy";
import { useExternal } from "@/lib/work/api";
import type { EarnRow } from "@/lib/agent/e";
import { useUploadInvoice, useWorkInvoices, useWorkPayouts, useWorkStatements, type WorkInvoice, type WorkPayout } from "@/lib/work/e";
import { workEarnings } from "@/content/pages/work-earnings";
import { fill } from "@/content/pages/work-common";
import { POLICY } from "@/shared/policy";
import { useW } from "@/components/atoms/work";
import { useOnline } from "@/components/atoms/hooks";

const TABS = ["allocations", "statements", "payouts", "invoices"] as const;
type Tab = (typeof TABS)[number];
export const useWE = () => {
  const { locale } = useI18n();
  return { x: workEarnings(locale), locale };
};
const monthLabel = (m: string, locale: string) =>
  new Intl.DateTimeFormat(locale === "rw" ? "en-GB" : locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));

export function WorkEarnings() {
  const { x } = useWE();
  const q = useUrlParams();
  const t = q.get("tab");
  const tab: Tab = TABS.includes(t as Tab) ? (t as Tab) : "allocations";
  const { ext } = useExternal();
  const panel: Record<Tab, React.ReactNode> = {
    allocations: <p className="pt-3 text-small text-fg-muted">{x.tilesNote}</p>,
    statements: <StatementList />,
    payouts: <Payouts />,
    invoices: <Invoices />,
  };
  return (
    <EarningsView
      title={x.title}
      head={
        <Tabs
          className="mb-5"
          value={tab}
          onChange={(id) => setUrlParams({ tab: id === "allocations" ? null : id, alloc: null })}
          tabs={TABS.map((id) => ({ id, label: x.tabs[id], content: <div className="pt-1">{panel[id]}</div> }))}
        />
      }
      replace={tab === "allocations" ? undefined : <></>}
      bottom={null}
      drawerNote={(r) => <DrawerNote r={r} firm={ext?.firmRole === "member" ? ext.firm : null} />}
    />
  );
}

/** EA2 additions: rate applied, others only as %, on_hold, firm member "paid to firm". */
function DrawerNote({ r, firm }: { r: EarnRow; firm: string | null }) {
  const { x } = useWE();
  // shortcut: rate inferred from amount/eligible (whole-percent ⇒ %, else flat); upgrade when rows carry rule_applied.
  const bps = r.eligible ? (r.amount * 10_000) / r.eligible : 0;
  const pct = Number.isInteger(bps / 100) ? bps / 100 : null;
  return (
    <div className="mt-4 grid gap-2 text-small">
      <p className="bg-bg-subtle p-3">
        {pct !== null ? fill(x.drawer.rate, { rate: `${pct}%` }) : x.drawer.flat}
        <span className="mt-1 block text-fg-muted">{x.drawer.others}</span>
      </p>
      {r.question?.status === "open" && (
        <p className="flex items-center gap-2 bg-warning-bg p-3"role="status">
          <Icon name="clock" size={14} aria-hidden />
          {fill(x.drawer.onHold, { d: POLICY.allocationQuestionDays })}
        </p>
      )}
      {firm && (
        <p className="flex items-center gap-2 bg-tint p-3">
          <Icon name="building" size={14} aria-hidden />
          {fill(x.drawer.firm, { firm })}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- statements list (EA2 entry)
function StatementList() {
  const { x, locale } = useWE();
  const s = useWorkStatements();
  if (s.isError) return <PanelError what={x.st.title} onRetry={() => s.refetch()} />;
  if (!s.data) return <SkeletonRows n={3} />;
  if (!s.data.length) return <EmptyPanel title={x.st.empty} body={x.st.emptyBody} />;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 m-stagger">
      {s.data.map((st, i) => {
        const gen = st.status === "generating";
        return (
          <li key={st.month} style={{ ["--i" as string]: i }}>
            <Link
              href={localHref(locale, `/work/earnings/statements/${st.month}`)}
              aria-disabled={gen}
              className={cx("group grid gap-2 border border-border bg-white p-4 transition-colors hover:border-navy-700/30 m-lift", gen && "pointer-events-none opacity-80")}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-label">{monthLabel(st.month, locale)}</span>
                <span className={cx("inline-flex h-6 items-center gap-1.5 px-2.5 text-eyebrow", gen ? "bg-warning-bg text-warning" : "bg-success-bg text-success")} aria-live="polite">
                  <span aria-hidden className={cx("size-1.5 rounded-full bg-current", gen && "m-shimmer")} />
                  {gen ? x.st.generating : x.st.ready}
                </span>
              </span>
              <span className="font-mono text-eyebrow text-fg-subtle">{st.number}</span>
              <span className="flex items-end justify-between">
                <span className="text-small text-fg-muted">{x.st.cols.share}: {formatMoney(st.gross, "RWF", locale)}</span>
                <span className="text-h5 tabular">{formatMoney(st.net, "RWF", locale)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- EA3 payouts
function Payouts() {
  const { x, locale } = useWE();
  const p = useWorkPayouts();
  if (p.isError) return <PanelError what={x.po.label} onRetry={() => p.refetch()} />;
  if (!p.data) return <SkeletonRows n={3} />;
  if (p.data.paidToFirm)
    return <EmptyPanel title={x.po.firm} body={fill(x.po.firmBody, { firm: p.data.paidToFirm })} />;
  const cols: OpsColumn<WorkPayout>[] = [
    { key: "date", label: x.po.cols.date, cell: (r) => formatDate(r.date, locale), sort: (r) => r.date },
    { key: "method", label: x.po.cols.method, cell: (r) => r.method },
    { key: "ref", label: x.po.cols.ref, cell: (r) => <span className="font-mono text-small">{r.ref}</span> },
    { key: "amount", label: x.po.cols.amount, cell: (r) => <span className="tabular">{formatMoney(r.amount, "RWF", locale)}</span>, align: "right" },
    {
      key: "status",
      label: x.po.cols.status,
      cell: (r) => (
        <span className={cx("inline-flex h-6 items-center gap-1 px-2.5 text-eyebrow font-medium", r.status === "paid" ? "bg-success-bg text-success" : r.status === "failed" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning")}>
          <Icon name={r.status === "paid" ? "check" : r.status === "failed" ? "x" : "clock"} size={12} aria-hidden />
          {x.po.status[r.status]}
        </span>
      ),
    },
  ];
  return (
    <OpsTable
      rows={p.data.items}
      columns={cols}
      rowKey={(r) => r.id}
      label={x.po.label}
      empty={<EmptyPanel compact title={x.po.empty} body={fill(x.po.emptyBody, { d: POLICY.payoutDay })} />}
    />
  );
}

// ---------------------------------------------------------------- EA3 own invoices
function Invoices() {
  const { x, locale } = useWE();
  const { ext } = useExternal();
  const inv = useWorkInvoices();
  if (ext?.firmRole === "member") return <EmptyPanel title={x.inv.title} body={x.inv.memberOnly} />;
  if (inv.isError) return <PanelError what={x.inv.title} onRetry={() => inv.refetch()} />;
  if (!inv.data) return <SkeletonRows n={2} />;
  const tone: Record<WorkInvoice["status"], string> = { received: "bg-info-bg text-info", accepted: "bg-success-bg text-success", rejected: "bg-danger-bg text-danger" };
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Panel title={x.inv.title} action={<span className="text-small text-fg-muted">{inv.data.required ? x.inv.required : x.inv.optional}</span>}>
        {!inv.data.items.length ? (
          <EmptyPanel compact title={x.inv.empty} body={x.inv.emptyBody} />
        ) : (
          <ul className="grid gap-2 m-stagger">
            {inv.data.items.map((r, i) => (
              <li key={r.id} style={{ ["--i"as string]: i }} className="grid gap-1 border border-border p-3">
                <p className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-label">{r.number}</span>
                  <span className={cx("inline-flex h-6 items-center px-2.5 text-eyebrow font-medium", tone[r.status])}>{x.inv.status[r.status]}</span>
                </p>
                <p className="text-small text-fg-muted tabular">
                  {monthLabel(r.period, locale)} · {formatMoney(r.amount, "RWF", locale)} · {r.fileName}
                </p>
                {r.note && <p className="text-small text-danger">{r.note}</p>}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
        </div>
      </Panel>
      <InvoiceForm />
    </div>
  );
}

function InvoiceForm() {
  const { x, locale } = useWE();
  const toast = useToast();
  const online = useOnline();
  const w = useW();
  const up = useUploadInvoice();
  const [f, setF] = useState({ number: "", period: "", amount: "" });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<Partial<Record<keyof typeof x.inv.errors, string>>>({});
  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: typeof err = {};
    if (!f.number.trim()) e.number = x.inv.errors.number;
    if (!/^\d{4}-\d{2}$/.test(f.period)) e.period = x.inv.errors.period;
    if (!(Number(f.amount) > 0)) e.amount = x.inv.errors.amount;
    if (!file) e.file = x.inv.errors.file;
    setErr(e);
    if (Object.keys(e).length) return;
    up.mutate(
      { number: f.number.trim(), period: f.period, amount: Number(f.amount), fileName: file!.name, size: file!.size, type: file!.type, file: file! },
      {
        onSuccess: () => {
          toast({ title: x.inv.sent, tone: "success" });
          setF({ number: "", period: "", amount: "" });
          setFile(null);
        },
        onError: (er) => toast({ title: errorCopy(er, locale), tone: "danger" }),
      },
    );
  };
  return (
    <Panel title={x.inv.upload} className="self-start">
      <form onSubmit={submit} noValidate className="grid gap-4">
        <Field label={x.inv.number} error={err.number}>
          {(i) => <Input id={i.id} aria-describedby={i.describedBy} aria-invalid={i.invalid} value={f.number} maxLength={40} onChange={(e) => setF({ ...f, number: e.target.value })} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={x.inv.period} error={err.period}>
            {(i) => <Input id={i.id} aria-describedby={i.describedBy} aria-invalid={i.invalid} type="month" value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} />}
          </Field>
          <Field label={x.inv.amount} error={err.amount}>
            {(i) => <Input id={i.id} aria-describedby={i.describedBy} aria-invalid={i.invalid} inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, "") })} />}
          </Field>
        </div>
        <Field label={x.inv.file} error={err.file}>
          {(i) =>
            file ? (
              <p id={i.id} className="flex items-center gap-2 bg-bg-subtle p-3 text-small">
                <Icon name="file" size={16} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <button type="button"className="underline"onClick={() => setFile(null)} aria-label={`Remove ${file.name}`}>
                  <Icon name="x" size={14} aria-hidden />
                </button>
              </p>
            ) : (
              <FileDrop id={i.id} accept="application/pdf,.pdf" maxSizeMb={10} onFiles={(fs) => setFile(fs[0] ?? null)} />
            )
          }
        </Field>
        {!online && <p className="text-small text-warning">{w.offline}</p>}
        <Button type="submit" loading={up.isPending} aria-busy={up.isPending} disabled={!online}>
          <Icon name="upload" size={16} aria-hidden /> {x.inv.send}
        </Button>
      </form>
    </Panel>
  );
}
