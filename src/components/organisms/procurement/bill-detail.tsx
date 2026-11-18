"use client";
// B3/B4 Bill record (board 07 BL3/BL4 + fixes): tabs Lines · Match · Approvals · Payments · Files · History; correction loop,
// exception request (executive decides in X1), dispute/resolve/void, advance offset, bank lock banner, 403/409 banners.
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatMoney } from "@/shared/format";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { ApiError, newIdempotencyKey } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { applyAdvance, guardApprove } from "@/shared/procurement/rules";
import { billSteps, useBill, useBillAction, useCorrectBill, type BillDetail } from "@/lib/procurement/de";
import { fill } from "@/content/pages/procurement-common";
import { PageHead } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { useStepUpAction } from "@/components/molecules/finance/finance";
import { Tabs } from "@/components/atoms/tabs";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Field, Input, Select, Textarea } from "@/components/atoms/field";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { Amount, DocNo, Fact, LockChip, Pill, ProcPill, useP } from "@/components/atoms/procurement";
import { ConflictBanner, HistoryList, MatchIndicator, MatchTable, PanelErr, ProcLink, ProcNoAccess, RemittanceCard, SegregationStrip, VatLines, type DraftLine } from "@/components/molecules/procurement/procurement";
import { DueChip, useDE } from "@/components/organisms/procurement/bills";

const TABS = ["lines", "match", "approvals", "payments", "files", "history"] as const;
type Tab = (typeof TABS)[number];
type Act = "dispute" | "resolve" | "void" | "exception" | "correct" | "advance" | null;

export function BillDetailView({ no }: { no: string }) {
  const c = useDE();
  const p = useP();
  const { locale } = useI18n();
  const { user } = useSession();
  const u = useUrlParams();
  const tab = (TABS as readonly string[]).includes(u.get("tab") ?? "") ? (u.get("tab") as Tab) : "lines";
  const q = useBill(no);
  const [act, setAct] = useState<Act>(null);
  const [banner, setBanner] = useState<{ kind: "conflict" | "forbidden" | "already"; who?: string } | null>(null);
  const toast = useToast();
  const online = useOnline();
  const { run, dialog } = useStepUpAction();
  const approve = useBillAction("approve");
  const authorise = useBillAction("authorise");
  const submit = useBillAction("submit");

  if (q.isPending) return <div className="grid gap-4"><div className="h-24 m-shimmer" /><div className="h-64 m-shimmer" /></div>;
  if (q.isError) {
    const e = q.error;
    if (e instanceof ApiError && e.isForbidden) return <ProcNoAccess />;
    if (e instanceof ApiError && e.isNotFound) return <div role="alert" className="grid place-items-center gap-3 py-16 text-center"><h1 className="text-h3">{fill(c.detail.notFound, { no })}</h1><ProcLink href="/procurement/bills" className="underline underline-offset-4">{c.bills.title}</ProcLink></div>;
    return <PanelErr onRetry={() => q.refetch()} />;
  }
  const d = q.data;
  const b = d.bill;
  const me = user ? { id: user.id, roles: user.roles } : null;
  const canApprove = !!me && (me.roles.includes("staff:finance") || me.roles.includes("staff:executive")) && !["approved", "authorised", "paid", "partially_paid", "void", "draft", "disputed"].includes(b.status);
  const selfNote = me && b.preparedBy?.id === me.id && ["submitted", "matched"].includes(b.status) ? "self" as const : me && b.approvedBy?.id === me.id && b.status === "approved" ? "selfApproved" as const : null;
  const payer = d.payments[0] ? { id: d.payments[0].paidBy.id, name: d.payments[0].paidBy.name, at: d.payments[0].paidAt } : undefined;
  const proc = !!me?.roles.includes("staff:procurement");

  async function guarded(fn: () => Promise<unknown>, done: string) {
    setBanner(null);
    try { const r = await fn(); if (r !== undefined) toast({ title: done, tone: "success" }); }
    catch (e) {
      if (e instanceof ApiError && e.errorType === "stale_version") setBanner({ kind: "conflict" });
      else if (e instanceof ApiError && e.errorType === "segregation_violation") setBanner({ kind: "forbidden" });
      else if (e instanceof ApiError && e.errorType === "already_decided") setBanner({ kind: "already", who: b.approvedBy?.name ?? b.authorisedBy?.name });
    }
  }
  const doApprove = () => guarded(() => run(c.detail.actions.approve, (t) => approve.mutateAsync({ no: b.no, stepUp: t, idempotencyKey: newIdempotencyKey() })), fill(c.detail.done.approve, { no: b.no }));
  const doAuthorise = () => guarded(() => run(c.detail.actions.authorise, (t) => authorise.mutateAsync({ no: b.no, stepUp: t, idempotencyKey: newIdempotencyKey() })), fill(c.detail.done.authorise, { no: b.no }));
  const doSubmit = () => guarded(async () => { try { return await submit.mutateAsync({ no: b.no, idempotencyKey: newIdempotencyKey() }); } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); throw e; } }, fill(c.detail.done.submit, { no: b.no }));
  const creditNote = () => {
    const bad = b.match?.lines.filter((l) => l.result === "exception") ?? [];
    const text = `Credit note request — ${b.no} / ${b.vendorInvoiceNo}\n${bad.map((l) => `${l.description}: billed ${l.billed}, received ${l.received}`).join("\n")}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    toast({ title: c.detail.creditCopied, tone: "success" });
  };

  const actions: ReactNode[] = [];
  if (online) {
    if (b.status === "draft" && proc) actions.push(<Button key="s" onClick={doSubmit} loading={submit.isPending} dots>{c.detail.actions.submit}</Button>);
    if (canApprove) {
      const g = me ? guardApprove(b, me) : "invalid_state";
      actions.push(<Button key="a" onClick={doApprove} disabled={g === "segregation_violation" || g === "invalid_state"} title={g === "segregation_violation" ? p.seg.self : undefined} loading={approve.isPending}>{c.detail.actions.approve}</Button>);
    }
    if (b.status === "approved" && me && !proc) actions.push(<Button key="au" onClick={doAuthorise} disabled={b.approvedBy?.id === me.id || b.preparedBy?.id === me.id} loading={authorise.isPending}>{c.detail.actions.authorise}</Button>);
    if (["draft", "match_exception", "submitted"].includes(b.status) && !me?.roles.includes("staff:executive")) actions.push(<Button key="e" variant="secondary" onClick={() => setAct("correct")}><Icon name="file" size={14} aria-hidden />{c.detail.actions.edit}</Button>);
    if (b.status === "match_exception" && !b.match?.exceptionRequested) actions.push(<Button key="x" variant="secondary" onClick={() => setAct("exception")}>{c.detail.actions.exception}</Button>);
    if (b.status === "match_exception") actions.push(<Button key="cn" variant="secondary" onClick={creditNote}>{c.detail.actions.credit}</Button>);
    if (d.advances.length && !["paid", "void", "draft", "disputed"].includes(b.status) && b.payable - b.amountPaid > 0) actions.push(<Button key="adv" variant="secondary" onClick={() => setAct("advance")}>{c.detail.actions.advance}</Button>);
    if (["submitted", "matched", "match_exception", "approved", "authorised"].includes(b.status)) actions.push(<Button key="d" variant="secondary" onClick={() => setAct("dispute")}>{c.detail.actions.dispute}</Button>);
    if (b.status === "disputed") actions.push(<Button key="r" variant="secondary" onClick={() => setAct("resolve")}>{c.detail.actions.resolve}</Button>);
    if (!b.amountPaid && ["draft", "submitted", "matched", "match_exception", "approved", "disputed"].includes(b.status)) actions.push(<Button key="v" variant="secondary" onClick={() => setAct("void")}>{c.detail.actions.void}</Button>);
  }

  const tabs: { id: Tab; label: string; content: ReactNode }[] = [
    { id: "lines", label: c.detail.tabs.lines, content: (
      <div className="grid gap-4">
        <VatLines lines={b.lines} mode={b.vatMode} readOnly vatRegistered={d.vendor.vatRegistered} />
        {b.appliedAdvances.length > 0 && <p className="text-small text-fg-muted">{c.detail.applied}: {b.appliedAdvances.map((a) => `${a.advanceNo} ${formatMoney(a.amount, "RWF", locale)}`).join(" · ")}</p>}
        {b.noPoJustification && <Fact label={c.detail.noPo}>{b.noPoJustification}</Fact>}
      </div>
    ) },
    { id: "match", label: c.detail.tabs.match, content: (
      <div className="grid gap-4">
        <MatchIndicator po={b.poNo} grn={d.grns.map((g) => g.no).join(", ") || undefined} bill={b.no} result={b.match?.result ?? "pending"} lines={b.match?.lines ?? []} />
        {b.match?.result === "contract" && <p className="text-small text-success">{c.detail.matchedContract}</p>}
        {b.match?.result === "no_po" && <p className="text-small text-fg-muted">{c.detail.noPoMatch}</p>}
        {b.match?.lines.length ? <MatchTable lines={b.match.lines} /> : null}
        {b.match?.exceptionRequested && !b.match.exceptionApproved && <p role="status" className="bg-info-bg px-3 py-2 text-small">{c.detail.exceptionRequested}</p>}
        {b.match?.exceptionApproved && <p role="status" className="bg-success-bg px-3 py-2 text-small text-success">{c.detail.exceptionApproved}</p>}
      </div>
    ) },
    { id: "approvals", label: c.detail.tabs.approvals, content: (
      <div className="grid gap-3">
        <SegregationStrip steps={billSteps(b, d.limits.financeMax, payer)} me={me?.id} selfNote={selfNote} />
        <div className="flex flex-wrap gap-2">{b.routeReasons.map((r) => <Pill key={r} tone="warning" icon="zap">{p.reasons[r]}</Pill>)}{b.total > d.limits.financeMax && <Pill tone="warning" icon="shield">{p.reasons.over_limit}</Pill>}</div>
        {b.override && <p className="text-small text-warning">{p.seg.override}: {b.override.by.name} — {b.override.reason}</p>}
      </div>
    ) },
    { id: "payments", label: c.detail.tabs.payments, content: d.payments.length ? (
      <ul className="grid gap-3">
        {d.payments.map((x) => (
          <li key={x.no} className="grid gap-2">
            <p className="flex flex-wrap items-center gap-3 text-small"><DocNo kind="VP" no={x.no} /><Amount value={x.allocations.find((a) => a.billNo === b.no)?.amount ?? x.amount} className="font-semibold" /><span className="text-fg-muted">{x.paidBy.name} · {formatDateTime(x.paidAt, locale)} · {x.reference}</span></p>
            <RemittanceCard payment={x} href={`/procurement/payments?q=${x.no}`} />
          </li>
        ))}
      </ul>
    ) : <p className="py-6 text-center text-small text-fg-muted">{c.detail.noPayments}</p> },
    { id: "files", label: c.detail.tabs.files, content: b.file ? (
      <p className="flex items-center gap-3 border border-border bg-surface p-3 text-small"><Icon name="fileCheck" size={18} aria-hidden />{b.file.name}</p>
    ) : <p className="text-small text-fg-muted">{c.detail.noFile}</p> },
    { id: "history", label: c.detail.tabs.history, content: <HistoryList kind="bill" id={b.no} /> },
  ];

  return (
    <div className="grid gap-5">
      {dialog}
      <PageHead back={<ProcLink href="/procurement/bills" className="text-small text-fg-muted underline-offset-4 hover:underline">← {c.bills.title}</ProcLink>}
        title={<span className="flex flex-wrap items-center gap-3"><DocNo kind="BL" no={b.no} copy /><ProcPill state={b.status} machine="bill" /></span>}
        sub={<span className="block max-w-full truncate" title={b.vendorName}>{b.vendorName} · {b.vendorInvoiceNo}</span>}
        actions={<div className="flex flex-wrap justify-end gap-2">{actions}</div>} />
      {banner?.kind === "conflict" && <ConflictBanner who="—" when={new Date().toISOString()} onReload={() => { setBanner(null); q.refetch(); }} />}
      {banner?.kind === "forbidden" && <p role="alert" className="bg-danger-bg px-4 py-3 text-small text-danger">{c.detail.forbidden}</p>}
      {banner?.kind === "already" && <ConflictBanner who={banner.who ?? "—"} when={new Date().toISOString()} onReload={() => { setBanner(null); q.refetch(); }} />}
      {b.locked && !["paid", "void"].includes(b.status) && (
        <div role="status" className="grid gap-2 bg-danger-bg px-4 py-3 text-small text-danger"><p>{c.detail.lockBanner}</p><LockChip until={b.lockUntil} /></div>
      )}
      {b.vendorStatus === "blocked" && <p role="alert" className="bg-danger-bg px-4 py-3 text-small text-danger">{c.detail.blockedVendor}</p>}
      {b.status === "disputed" && b.disputeReason && <p role="status" className="bg-warning-bg px-4 py-3 text-small text-warning">{b.disputeReason}</p>}
      <dl className="grid grid-cols-2 gap-4 border border-border bg-surface p-4 sm:grid-cols-3 lg:grid-cols-6">
        <Fact label={c.detail.supplier}><ProcLink href={`/procurement/suppliers/${d.vendor.id}`} className="underline-offset-4 hover:underline">{d.vendor.code}</ProcLink></Fact>
        <Fact label={c.detail.invoiceDate}>{formatDate(b.invoiceDate, locale)}</Fact>
        <Fact label={c.detail.due}><DueChip due={b.dueOn} today={new Date().toISOString().slice(0, 10)} status={b.status} /></Fact>
        <Fact label={b.poNo ? c.detail.po : c.detail.contract}>{b.poNo ? <DocNo kind="PO" no={b.poNo} href={`/procurement/orders/${b.poNo}`} /> : b.contractRef ? <DocNo kind="CT" no={b.contractRef} /> : <Pill tone="neutral" icon="file">{p.match.no_po}</Pill>}</Fact>
        <Fact label={c.detail.total}><Amount value={b.total} className="font-semibold" /></Fact>
        <Fact label={c.detail.payable}><Amount value={b.payable - b.amountPaid} className="font-semibold" /></Fact>
      </dl>
      <Tabs tabs={tabs} value={tab} onChange={(id) => setUrlParams({ tab: id === "lines" ? null : id })} />
      {act === "correct" && <CorrectDialog d={d} onClose={() => setAct(null)} />}
      {act === "advance" && <AdvanceDialog d={d} onClose={() => setAct(null)} />}
      {(act === "dispute" || act === "resolve" || act === "void" || act === "exception") && <ReasonAction no={b.no} action={act} onClose={() => setAct(null)} />}
    </div>
  );
}

function ReasonAction({ no, action, onClose }: { no: string; action: "dispute" | "resolve" | "void" | "exception"; onClose: () => void }) {
  const c = useDE();
  const p = useP();
  const { locale } = useI18n();
  const toast = useToast();
  const m = useBillAction(action);
  const [key] = useState(newIdempotencyKey);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const title = action === "dispute" ? c.detail.disputeTitle : action === "resolve" ? c.detail.resolveTitle : action === "void" ? c.detail.voidTitle : c.detail.actions.exception;
  const hint = action === "dispute" ? c.detail.disputeHint : action === "void" ? c.detail.voidHint : undefined;
  async function go() {
    if (!reason.trim()) return setErr(p.common.reason);
    try { await m.mutateAsync({ no, reason, idempotencyKey: key }); toast({ title: fill(c.detail.done[action], { no }), tone: "success" }); onClose(); }
    catch (e) { setErr(errorCopy(e, locale)); }
  }
  return (
    <Dialog open onClose={onClose} title={title} description={hint}
      footer={<Button onClick={go} loading={m.isPending} variant={action === "void" ? "primary" : "primary"} className="m-press">{p.common.confirm}</Button>}>
      <Field label={p.common.reason} error={err ?? undefined}>{(a) => <Textarea id={a.id} aria-invalid={a.invalid} aria-describedby={a.describedBy} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
    </Dialog>
  );
}

function CorrectDialog({ d, onClose }: { d: BillDetail; onClose: () => void }) {
  const c = useDE();
  const p = useP();
  const { locale } = useI18n();
  const toast = useToast();
  const m = useCorrectBill();
  const [key] = useState(newIdempotencyKey);
  const [lines, setLines] = useState<DraftLine[]>(d.bill.lines.map((l) => ({ id: l.id, description: l.description, qty: l.qty, unitPrice: l.unitPrice, vatable: l.vatable })));
  const [mode, setMode] = useState(d.bill.vatMode);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    try {
      const r = await m.mutateAsync({ no: d.bill.no, lines, vatMode: mode, idempotencyKey: key, version: d.bill.version });
      toast({ title: r.status === "match_exception" ? fill(c.form.exception, { no: r.no }) : fill(c.detail.done.submit, { no: r.no }), tone: r.status === "match_exception" ? "danger" : "success" });
      onClose();
    } catch (e) { setErr(errorCopy(e, locale)); }
  }
  return (
    <Dialog open onClose={onClose} title={c.detail.correctTitle} description={c.detail.correctHint} className="max-w-3xl"
      footer={<Button onClick={go} loading={m.isPending} className="m-press">{p.common.save}</Button>}>
      {err && <p role="alert" className="mb-3 bg-danger-bg px-3 py-2 text-small text-danger">{err}</p>}
      <VatLines lines={lines} mode={mode} onMode={setMode} onChange={setLines} vatRegistered={d.vendor.vatRegistered} />
    </Dialog>
  );
}

function AdvanceDialog({ d, onClose }: { d: BillDetail; onClose: () => void }) {
  const c = useDE();
  const p = useP();
  const { locale } = useI18n();
  const toast = useToast();
  const m = useBillAction("apply-advance");
  const [key] = useState(newIdempotencyKey);
  const [no, setNo] = useState(d.advances[0]?.no ?? "");
  const ad = d.advances.find((a) => a.no === no);
  const open = d.bill.payable - d.bill.amountPaid;
  const [amount, setAmount] = useState(() => (ad ? Math.min(ad.remaining, open) : 0));
  const [err, setErr] = useState<string | null>(null);
  const preview = ad ? applyAdvance(open, ad.remaining, amount) : null;
  async function go() {
    try { await m.mutateAsync({ no: d.bill.no, advanceNo: no, amount, idempotencyKey: key }); toast({ title: fill(c.detail.done.advance, { amount: formatMoney(preview?.applied ?? 0, "RWF", locale) }), tone: "success" }); onClose(); }
    catch (e) { setErr(errorCopy(e, locale)); }
  }
  return (
    <Dialog open onClose={onClose} title={c.detail.advanceTitle} description={c.detail.advanceHint}
      footer={<Button onClick={go} loading={m.isPending} disabled={!preview?.applied} className="m-press">{p.common.confirm}</Button>}>
      {!d.advances.length ? <p className="text-small text-fg-muted">{c.detail.noAdvances}</p> : (
        <div className="grid gap-4">
          {err && <p role="alert" className="bg-danger-bg px-3 py-2 text-small text-danger">{err}</p>}
          <Field label={c.detail.advance}>{(a) => (
            <Select id={a.id} value={no} onChange={(e) => { setNo(e.target.value); const x = d.advances.find((y) => y.no === e.target.value); setAmount(x ? Math.min(x.remaining, open) : 0); }}>
              {d.advances.map((x) => <option key={x.no} value={x.no}>{x.no} · {formatMoney(x.remaining, "RWF", locale)}</option>)}
            </Select>
          )}</Field>
          <Field label={c.detail.amount}>{(a) => <Input id={a.id} type="number" inputMode="numeric" min={1} max={Math.min(ad?.remaining ?? 0, open)} value={amount || ""} onChange={(e) => setAmount(Math.round(Number(e.target.value)))} />}</Field>
          {preview && <p aria-live="polite" className="bg-info-bg px-3 py-2 text-small tabular">{fill(c.detail.advancePreview, { payable: formatMoney(preview.payable, "RWF", locale), left: formatMoney(preview.remaining, "RWF", locale) })}</p>}
        </div>
      )}
    </Dialog>
  );
}
