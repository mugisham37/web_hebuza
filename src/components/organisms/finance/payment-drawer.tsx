"use client";
// U8 PaymentDrawer (board 06 PY2) + CheckerPanel (PY5, X-4 chain, step-up, 72 h return, 15-min verifier lock),
// ReversePaymentDialog (impact preview), ReceiptDialog (RCPT-). Every mutation: one Idempotency-Key per open panel/dialog.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatRelative } from "@/shared/format";
import { api, newIdempotencyKey, unwrap } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { fresh, useFinAction, usePayment, type PaymentDetail } from "@/lib/finance/c";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Dialog, Sheet } from "@/components/atoms/dialog";
import { Tabs } from "@/components/atoms/tabs";
import { useToast } from "@/components/atoms/toast";
import { CopyRef, PanelError, ReasonDialog, TimelineItem } from "@/components/molecules/ops/ops";
import { SkeletonRows, useNow } from "@/components/atoms/agent";
import { usePhone } from "@/components/atoms/step-up";
import { Amount, DocNumber, FinStatus, MethodTag, VerifyScheduleChip, useF } from "@/components/atoms/finance";
import { ApprovalChain, ConflictDialog, HistoryTab, MakerChecker, useStepUpAction } from "@/components/molecules/finance/finance";
import { ProofPreview, fill, useConflict, useMoneyGuard, useP } from "@/components/molecules/finance/finance";
import { isForbidden } from "@/components/atoms/hooks";
import { hdr } from "@/lib/finance/api";

const PROOF_STATES = ["proof_submitted", "under_verification"];

export function PaymentDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const p = useP();
  const phone = usePhone();
  const q = usePayment(id);
  const [tab, setTab] = useState("details");
  const d = q.data;
  return (
    <Sheet open={!!id} onClose={onClose} side={phone ? "bottom" : "right"} className="md:max-w-xl"
      title={d ? <span className="flex flex-wrap items-center gap-2">{fill(p.drawer.title, { id: d.payment.id })}<FinStatus status={d.payment.state} kind="payment" /></span> : fill(p.drawer.title, { id: id ?? "" })}>
      {q.isPending ? <SkeletonRows n={5} /> : q.error ? (
        isForbidden(q.error) ? <p className="text-small text-fg-muted">{p.readOnlyExec}</p> : <PanelError what={p.err} onRetry={() => q.refetch()} />
      ) : !d ? <p className="text-small text-fg-muted">{p.drawer.notFound}</p> : (
        <Tabs value={tab} onChange={setTab} tabs={[
          { id: "details", label: p.drawer.details, content: <Details d={d} q={q} /> },
          { id: "timeline", label: p.drawer.timeline, count: d.payment.events.length, content: <Timeline d={d} /> },
          { id: "history", label: p.drawer.history, content: <HistoryTab resourceType="payment" resourceId={d.payment.id} /> },
        ]} />
      )}
    </Sheet>
  );
}

function Details({ d, q }: { d: PaymentDetail; q: ReturnType<typeof usePayment> }) {
  const p = useP();
  const { locale } = useI18n();
  const toast = useToast();
  const guard = useMoneyGuard();
  const [receipt, setReceipt] = useState(false);
  const [reverse, setReverse] = useState(false);
  const verify = useFinAction(() => unwrap<{ result: string }>(api.POST("/api/finance/payments/{id}/verify", { params: { path: { id: d.payment.id } }, headers: hdr({ idempotencyKey: newIdempotencyKey() }) })));
  const pay = d.payment;
  const amount = pay.amountReceived ?? pay.amountExpected;
  const ref = pay.providerRef ?? pay.bankReference;
  const confirmed = pay.state === "confirmed" || pay.state === "confirmed_late";
  const open = PROOF_STATES.includes(pay.state);
  return (
    <div className="grid gap-5 m-stagger">
      {pay.duplicate && (
        <p role="alert" className="flex items-start gap-2 bg-bg-tint p-3 text-small text-navy-800">
          <Icon name="layers" size={16} aria-hidden className="mt-0.5 shrink-0" /><span><b>{p.cards.duplicate[0]}.</b> {p.cards.duplicate[1]}</span>
        </p>
      )}
      <div className="grid gap-1">
        <Amount value={amount} size="xl" />
        {pay.amountReceived != null && pay.amountReceived !== pay.amountExpected && (
          <span className="text-small text-fg-muted">{p.drawer.expected} <Amount value={pay.amountExpected} size="sm" /></span>
        )}
      </div>
      <dl className="grid grid-cols-[minmax(0,9rem)_1fr] gap-x-4 gap-y-2 text-small">
        <dt className="text-fg-muted">{p.drawer.client}</dt><dd className="font-medium">{pay.clientName}</dd>
        <dt className="text-fg-muted">{p.drawer.method}</dt><dd><MethodTag method={pay.method} /></dd>
        {ref && <><dt className="text-fg-muted">{pay.providerRef ? p.drawer.providerRef : p.drawer.bankRef}</dt><dd><CopyRef value={ref} /></dd></>}
        {pay.providerFee != null && <><dt className="text-fg-muted">{p.drawer.fee}</dt><dd><Amount value={pay.providerFee} size="sm" /> <span className="text-fg-subtle">({p.drawer.feeNote})</span></dd></>}
        <dt className="text-fg-muted">{p.drawer.invoice}</dt><dd><DocNumber no={pay.invoiceNo} href={localHref(locale, `/finance/invoices/${pay.invoiceNo}`)} /></dd>
        {pay.caseRef && <><dt className="text-fg-muted">{p.drawer.case}</dt><dd className="tabular">{pay.caseRef}</dd></>}
        {d.invoice && <><dt className="text-fg-muted">{p.drawer.balance}</dt><dd><Amount value={d.invoice.balanceDue} size="sm" /> <FinStatus status={d.invoice.status} kind="invoice" /></dd></>}
        {pay.reconciliationId && <><dt className="text-fg-muted"><Icon name="check" size={12} aria-hidden className="inline text-success" /></dt><dd className="text-fg-muted">{fill(p.drawer.reconciled, { id: pay.reconciliationId })}</dd></>}
      </dl>
      {open && d.invoice && (
        <p className="bg-bg-subtle p-3 text-small">
          {d.over > 0 ? fill(p.drawer.over, { amount: "" }) : d.diff < 0 ? fill(p.drawer.partial, { amount: "" }) : p.drawer.exact}
          {d.diff !== 0 && <> <Amount value={d.over > 0 ? d.over : d.diff} sign="always" size="sm" /></>}
        </p>
      )}
      {pay.verify && (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-border p-3">
          <VerifyScheduleChip nextAt={pay.verify.nextAt} cadence={pay.verify.cadence} />
          <Button size="sm" variant="outline" loading={verify.isPending} disabled={!guard.online} className="m-press" onClick={async () => {
            try {
              const r = await verify.mutateAsync(undefined);
              toast({ title: r.result === "unchanged" ? p.drawer.unchanged : fill(p.drawer.verified, { state: r.result }), tone: r.result === "unchanged" ? "info" : "success" });
            } catch (e) { toast({ title: errorCopy(e, locale), tone: "danger" }); }
          }}><Icon name="refresh" size={14} aria-hidden />{p.drawer.verifyNow}</Button>
        </div>
      )}
      {open && <CheckerPanel d={d} q={q} />}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {pay.receiptNo && <Button variant="outline" size="sm" className="m-press" onClick={() => setReceipt(true)}><Icon name="file" size={14} aria-hidden />{p.drawer.receipt}</Button>}
        {confirmed && <Button variant="outline" size="sm" className="m-press" disabled={!guard.can} title={!guard.online ? p.offline : undefined} onClick={() => setReverse(true)}>{p.drawer.reverse}</Button>}
        {open && <Link href={localHref(locale, `/finance/payments/proofs?id=${pay.id}`)} className="inline-flex h-9 items-center gap-2 px-4 text-small font-medium hover:bg-navy-50"><Icon name="fileCheck" size={14} aria-hidden />{p.drawer.proof}</Link>}
      </div>
      <ReceiptDialog open={receipt} onClose={() => setReceipt(false)} d={d} />
      <ReversePaymentDialog open={reverse} onClose={() => setReverse(false)} d={d} q={q} />
    </div>
  );
}

function Timeline({ d }: { d: PaymentDetail }) {
  const p = useP();
  const f = useF();
  const { locale } = useI18n();
  const ev = d.payment.events;
  return (
    <ol className="grid">
      {ev.map((e, i) => (
        <TimelineItem key={i} kind={e.kind === "recorded" || e.kind === "signed" ? "status" : "payment"} last={i === ev.length - 1}
          title={p.drawer.events[e.kind] ?? f.status[e.kind] ?? e.kind}
          meta={<>{p.drawer.source[e.source] ?? e.source}{e.note ? ` · ${e.note}` : ""}</>}
          actor={e.by?.name} time={formatDateTime(e.at, locale)} />
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------- CheckerPanel (PY5)
export function CheckerPanel({ d, q, compact }: { d: PaymentDetail; q: ReturnType<typeof usePayment>; compact?: boolean }) {
  const p = useP();
  const { locale } = useI18n();
  const { user } = useSession();
  const toast = useToast();
  const guard = useMoneyGuard();
  const stepUp = useStepUpAction();
  const conflict = useConflict();
  const now = useNow();
  const [key, setKey] = useState(newIdempotencyKey);
  const [rejecting, setRejecting] = useState(false);
  const pay = d.payment;
  const id = pay.id;
  const confirm = useFinAction((token: string) => unwrap<PaymentDetail>(api.POST("/api/finance/payments/{id}/confirm", { params: { path: { id } }, body: { rev: pay.rev }, headers: hdr({ stepUp: token, idempotencyKey: key }) })));
  const reject = useFinAction((v: { reason: string; note: string }) => unwrap<PaymentDetail>(api.POST("/api/finance/payments/{id}/reject", { params: { path: { id } }, body: { ...v, rev: pay.rev }, headers: hdr({ idempotencyKey: key }) })));

  // Lock to verifier while open (15-min soft lock shown to others); release when the panel closes.
  const canLock = guard.can;
  useEffect(() => {
    if (!canLock) return;
    unwrap(api.POST("/api/finance/payments/{id}/lock", { params: { path: { id } }, body: {} })).then(() => q.refetch()).catch(() => {});
    return () => { unwrap(api.POST("/api/finance/payments/{id}/lock", { params: { path: { id } }, body: { release: true } })).catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, canLock]);

  const me = user ? { id: user.id, roles: user.roles } : undefined;
  const makerIds = pay.makerId ? [pay.makerId] : [];
  const iMade = !!user && pay.makerId === user.id;
  const lockedOther = !!d.lockUntil && !!pay.lockedBy && pay.lockedBy.id !== user?.id;
  const maker = pay.events.find((e) => e.kind === "recorded")?.by ?? { id: pay.clientId, name: pay.clientName };
  const steps = pay.chain ?? [];
  const blocked = !guard.online || lockedOther;

  async function sign() {
    await fresh(q);
    try {
      const r = await stepUp.run(fill(p.checker.stepUp, { id }), (t) => confirm.mutateAsync(t));
      if (!r) return;
      setKey(newIdempotencyKey());
      const done = r.payment.state === "confirmed";
      toast({ title: done ? fill(p.checker.confirmed, { no: r.payment.receiptNo ?? "" }) : p.checker.signed, tone: "success" });
      q.refetch();
    } catch (e) { conflict.take(e); }
  }

  return (
    <section aria-label={p.checker.title} className={compact ? "grid gap-4" : "grid gap-4 border border-border p-4"}>
      {!compact && <h3 className="text-card-title">{p.checker.title}</h3>}
      {lockedOther && (
        <p role="status" className="flex items-center gap-2 bg-warning-bg p-3 text-small text-warning">
          <Icon name="lock" size={14} aria-hidden />{fill(p.checker.lockedBy, { who: pay.lockedBy!.name, t: formatDate(d.lockUntil!, locale, { timeStyle: "short" }) })}
        </p>
      )}
      {!lockedOther && pay.lockedBy?.id === user?.id && <p className="text-eyebrow text-fg-subtle">{p.checker.lockedYou}</p>}
      <MakerChecker maker={maker} checker={steps.find((s) => s.signedBy)?.signedBy ?? null} />
      {!compact && (
        <ProofPreview fileName={d.evidence} href={d.evidenceHref} amount={pay.amountExpected} bankRef={pay.bankReference} candidate={d.candidates[0] ?? null} />
      )}
      {!d.candidates.length && pay.method === "bank_transfer" && <p className="text-small text-fg-muted">{p.checker.noLine}</p>}
      {steps.length > 1 && (
        <p className="flex items-center gap-2 bg-gold-100 px-3 py-2 text-small">
          <Icon name="lock" size={14} aria-hidden />{steps.some((s) => s.role === "executive") ? p.checker.exec : p.checker.second}
        </p>
      )}
      <ApprovalChain steps={steps} me={me} makerIds={makerIds} onSign={blocked ? undefined : sign} signing={confirm.isPending} />
      {iMade && <p className="text-small text-fg-muted">{p.checker.youMade}</p>}
      {d.returnAt && now !== null && (
        <p aria-live="polite" className="flex items-center gap-2 text-small text-fg-muted"><Icon name="clock" size={14} aria-hidden />{fill(p.checker.returnIn, { t: formatRelative(d.returnAt, locale, now) })}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="m-press" disabled={blocked || !guard.can} onClick={() => setRejecting(true)}>{p.checker.reject}</Button>
      </div>
      <ReasonDialog open={rejecting} onClose={() => setRejecting(false)} title={p.reject.title} description={p.reject.body} destructive audited
        options={Object.entries(p.reject.reasons).map(([value, label]) => ({ value, label }))} confirmLabel={p.reject.confirm} noteLabel={p.manual.note}
        onConfirm={async (v) => {
          await fresh(q);
          try { await reject.mutateAsync(v); } catch (e) { if (conflict.take(e)) return; throw e; }
          setKey(newIdempotencyKey());
          toast({ title: p.reject.done, tone: "success" });
        }} />
      <ConflictDialog open={!!conflict.conflict} who={pay.lockedBy?.name ?? ""} when={conflict.conflict?.at ?? new Date(0).toISOString()}
        onClose={conflict.clear} onRefresh={() => { conflict.clear(); q.refetch(); }} />
      {stepUp.dialog}
    </section>
  );
}

// ---------------------------------------------------------------- ReversePaymentDialog / ReceiptDialog
function ReversePaymentDialog({ open, onClose, d, q }: { open: boolean; onClose: () => void; d: PaymentDetail; q: ReturnType<typeof usePayment> }) {
  const p = useP();
  const f = useF();
  const toast = useToast();
  const stepUp = useStepUpAction();
  const [key, setKey] = useState(newIdempotencyKey);
  const reverse = useFinAction((v: { reason: string; note: string; token: string }) =>
    unwrap<PaymentDetail>(api.POST("/api/finance/payments/{id}/reverse", { params: { path: { id: d.payment.id } }, body: { reason: v.reason, note: v.note, rev: d.payment.rev }, headers: hdr({ stepUp: v.token, idempotencyKey: key, reason: v.reason }) })));
  return (
    <>
      <ReasonDialog open={open} onClose={onClose} title={p.reverse.title} description={p.reverse.body} destructive audited
        options={Object.entries(p.reverse.reasons).map(([value, label]) => ({ value, label }))} confirmLabel={p.reverse.confirm} noteLabel={p.manual.note}
        extra={
          <div className="bg-bg-subtle p-3 text-small">
            <p className="mb-2 text-label">{p.reverse.impact}</p>
            <ul className="grid gap-1.5">
              <li className="flex items-start gap-2"><Icon name="refresh" size={14} aria-hidden className="mt-0.5" />
                <span>{fill(p.reverse.reopen, { no: d.impact.invoiceNo, amount: "" })}<Amount value={d.impact.balanceAfter} size="sm" /></span></li>
              {d.impact.allocation && <li className="flex items-start gap-2"><Icon name="users" size={14} aria-hidden className="mt-0.5" />{d.impact.paidOut ? p.reverse.allocPaid : p.reverse.alloc}</li>}
              <li className="flex items-start gap-2"><Icon name="mail" size={14} aria-hidden className="mt-0.5" />{p.reverse.notify}</li>
            </ul>
          </div>
        }
        onConfirm={async (v) => {
          await fresh(q);
          const r = await stepUp.run(p.reverse.title, (token) => reverse.mutateAsync({ ...v, token }));
          if (!r) throw new Error(f.stepUp.cancelled);
          setKey(newIdempotencyKey());
          toast({ title: fill(p.reverse.done, { no: d.impact.invoiceNo }), tone: "success" });
        }} />
      {stepUp.dialog}
    </>
  );
}

function ReceiptDialog({ open, onClose, d }: { open: boolean; onClose: () => void; d: PaymentDetail }) {
  const p = useP();
  const { locale } = useI18n();
  const pay = d.payment;
  const at = [...pay.events].reverse().find((e) => e.kind === "confirmed" || e.kind === "confirmed_late")?.at ?? pay.at;
  return (
    <Dialog open={open} onClose={onClose} title={<span className="m-pop inline-block">{fill(p.receipt.title, { no: pay.receiptNo ?? "" })}</span>}
      description={fill(p.receipt.issued, { d: formatDateTime(at, locale) })} footer={<Button variant="secondary" onClick={onClose}>{p.receipt.close}</Button>}>
      <dl className="grid grid-cols-[minmax(0,9rem)_1fr] gap-x-4 gap-y-2 text-small">
        <dt className="text-fg-muted">{p.receipt.from}</dt><dd className="font-medium">{pay.clientName}</dd>
        <dt className="text-fg-muted">{p.receipt.for}</dt><dd><DocNumber no={pay.invoiceNo} /></dd>
        <dt className="text-fg-muted">{p.receipt.method}</dt><dd><MethodTag method={pay.method} /></dd>
        {(pay.providerRef ?? pay.bankReference) && <><dt className="text-fg-muted">{p.receipt.ref}</dt><dd className="tabular">{pay.providerRef ?? pay.bankReference}</dd></>}
        <dt className="text-fg-muted">{p.receipt.amount}</dt><dd><Amount value={pay.amountReceived ?? pay.amountExpected} size="lg" /></dd>
      </dl>
      <p className="mt-4 text-eyebrow text-fg-subtle">{p.receipt.note}</p>
    </Dialog>
  );
}
