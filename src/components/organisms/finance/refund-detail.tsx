"use client";
// U12 Refund record (board 09 RF2–RF5 with fixes): request · PolicyCalculator · SM recommendation as first chain step ·
// AllocationImpact · ApprovalChain · Approve (step-up) / Adjust (re-runs the chain) / Reject · ExecutePanel for a different
// finance user (MoMo progress or bank + proof, failure + retry with a fresh key) · credit-note card · history.
import { uploadFile } from "@/lib/api/upload";
import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDate, formatDateTime, formatMoney } from "@/shared/format";
import { localHref } from "@/shared/i18n/config";
import { newIdempotencyKey } from "@/lib/api/client";
import { useSession } from "@/lib/auth/session";
import { refundSuggestion } from "@/lib/finance/money";
import { useRefund, useRefundAdjust, useRefundApprove, useRefundExecute, useRefundReject, type RefundDetail } from "@/lib/finance/d";
import type { RefundMethod } from "@/shared/finance/types";
import { Amount, DocNumber, FinStatus, MethodTag, TierChip, useF } from "@/components/atoms/finance";
import { ApprovalChain, ConflictDialog, HistoryTab, NoAccess, useStepUpAction } from "@/components/molecules/finance/finance";
import { EmptyPanel, Panel, PanelError, ReasonDialog } from "@/components/molecules/ops/ops";
import { LockLabel } from "@/components/atoms/ops";
import { PageHead, SkeletonRows } from "@/components/atoms/agent";
import { useOnline } from "@/components/atoms/hooks";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { Icon } from "@/components/atoms/icon";
import { Avatar } from "@/components/atoms/misc";
import { useToast } from "@/components/atoms/toast";
import { useShortcut } from "@/lib/ops/shortcuts";
import { ExecSteps, ImpactTable, Reason, errorCopy, fill, isForbidden, isNotFound, useRF, type ExecStep } from "@/components/molecules/finance/refunds";
import { errType } from "@/components/atoms/hooks";

const STALE_MS = 5 * 60_000;
const PAY_METHODS: RefundMethod[] = ["original", "mtn_momo", "airtel_money", "bank"];
const ADJ_METHODS: RefundMethod[] = [...PAY_METHODS, "credit"];

export function RefundDetailView({ no }: { no: string }) {
  const c = useRF();
  const { locale } = useI18n();
  const q = useRefund(no);
  const L = (s: string) => localHref(locale, s);
  const back = <Link href={L("/finance/refunds")} className="mb-2 inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg"><Icon name="arrowRight" size={14} aria-hidden className="rotate-180" />{c.back}</Link>;

  if (q.isPending)
    return <div className="grid gap-4">{back}<div className="h-10 w-72 m-shimmer" /><div className="grid gap-4 lg:grid-cols-[1fr_22rem]"><SkeletonRows n={5} /><SkeletonRows n={3} /></div></div>;
  if (q.isError) {
    if (isForbidden(q.error)) return <NoAccess />;
    if (isNotFound(q.error)) return <div className="grid gap-4">{back}<EmptyPanel title={c.notFound[0]} body={c.notFound[1]} /></div>;
    return <div className="grid gap-4">{back}<PanelError what={c.loadWhat} onRetry={() => q.refetch()} /></div>;
  }
  return <Record d={q.data} back={back} refetch={() => q.refetch()} updatedAt={q.dataUpdatedAt} />;
}

function Record({ d, back, refetch, updatedAt }: { d: RefundDetail; back: React.ReactNode; refetch: () => Promise<unknown>; updatedAt: number }) {
  const c = useRF();
  const f = useF();
  const { locale } = useI18n();
  const { user } = useSession();
  const toast = useToast();
  const online = useOnline();
  const r = d.refund;
  const amount = r.approved ?? r.recommended ?? r.requested;
  const approve = useRefundApprove();
  const reject = useRefundReject();
  const step = useStepUpAction();
  const [key, setKey] = useState(newIdempotencyKey);
  const [adjust, setAdjust] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectKey, setRejectKey] = useState(newIdempotencyKey);
  const [conflict, setConflict] = useState(false);
  const moneyBlocked = !online ? c.offline : d.locked ? c.locked : null;

  async function doApprove() {
    // Stale guard: refetch before a money action when data > 5 min old (DoD #2).
    if (Date.now() - updatedAt > STALE_MS) { await refetch(); return; }
    try {
      const res = await step.run(fill(c.approveWhat, { no: r.no }), (t) => approve.mutateAsync({ no: r.no, rev: r.rev, idempotencyKey: key, stepUp: t }));
      if (!res) return;
      setKey(newIdempotencyKey());
      toast({ tone: "success", title: res.status === "awaiting_executive" ? c.toast.needsExec : res.status === "completed_as_credit" ? c.toast.credit : fill(c.toast.approved, { cn: res.creditNoteNo ?? "" }) });
    } catch (e) { if (errType(e) === "version_conflict") setConflict(true); }
  }
  useShortcut("a", c.approve.replace("{amount}", ""), () => d.can.sign && !moneyBlocked && doApprove(), "case", d.can.sign);

  const execShown = ["credited", "executing", "execution_failed", "refunded"].includes(r.status) || (r.status === "completed_as_credit");
  const L = (s: string) => localHref(locale, s);

  return (
    <div className="grid gap-6">
      <PageHead back={back}
        title={<span className="flex flex-wrap items-center gap-3"><DocNumber no={r.no} className="text-h3" /><FinStatus status={r.status} kind="refund" /><TierChip tier={r.tier} limit={d.limit} /></span>}
        sub={<span className="flex flex-wrap items-center gap-2">{r.clientName} · {c.reasons[r.reason] ?? r.reason}{r.auto && <span className="inline-flex items-center gap-1 bg-navy-50 px-2 py-0.5 text-eyebrow text-navy-800"><Icon name="zap" size={10} aria-hidden />{c.auto[r.auto]}</span>}</span>}
        actions={d.locked ? <LockLabel /> : undefined}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-6 m-stagger">
          <Panel title={c.request.title} className="m-lift" >
            <dl className="grid gap-x-6 gap-y-4 text-small sm:grid-cols-2" style={{ ["--i" as string]: 0 }}>
              <Item k={c.request.by} v={<span className="flex items-center gap-2"><Avatar name={r.requestedBy.name} size="sm" />{r.requestedBy.name} · {formatDateTime(r.at, locale)}</span>} />
              <Item k={c.request.reason} v={c.reasons[r.reason] ?? r.reason} />
              <Item k={c.request.invoice} v={<DocNumber no={r.invoiceNo} href={L(`/finance/invoices/${r.invoiceNo}`)} />} />
              <Item k={c.request.case} v={<span className="tabular">{r.caseRef}</span>} />
              <Item k={c.request.stage} v={c.stages[r.stage] ?? r.stage} />
              <Item k={c.request.total} v={<span className="grid"><Amount value={d.invoice.totals.total} className="font-semibold" /><span className="text-eyebrow text-fg-subtle tabular">{formatMoney(d.invoice.totals.subtotal, "RWF", locale)} + {formatMoney(d.invoice.totals.vat, "RWF", locale)} + {formatMoney(d.invoice.totals.passThrough, "RWF", locale)}</span></span>} />
              <Item k={c.request.requested} v={<Amount value={r.requested} />} />
              <Item k={c.request.payTo} v={<span className="grid gap-1"><span className="flex items-center gap-2"><MethodTag method={r.method} /><span className="tabular">{r.destination?.masked ?? d.payer.masked}</span></span><span className="text-eyebrow text-fg-subtle">{c.request.payer}: {d.payer.masked}</span></span>} />
              {r.note && <Item k={c.request.note} v={r.note} wide />}
            </dl>
            {r.destination?.changed && (
              <p role="alert" className="mt-4 flex items-start gap-2 bg-warning-bg px-3 py-2.5 text-small text-warning"><Icon name="shield" size={16} aria-hidden className="mt-0.5 shrink-0" />{c.request.changed}</p>
            )}
          </Panel>

          <PolicyCalculator d={d} onUse={d.can.adjust && !moneyBlocked ? setAdjust : undefined} />

          <Panel title={c.sm.title}>
            {r.chain[0]?.signedBy ? (
              <div className="flex flex-wrap items-center gap-3">
                <Avatar name={r.chain[0].signedBy.name} size="md" />
                <div className="grid flex-1">
                  <span className="text-small font-medium">{r.chain[0].signedBy.name}</span>
                  <span className="text-eyebrow text-fg-subtle">{r.chain[0].at ? formatDateTime(r.chain[0].at, locale) : ""}</span>
                </div>
                <span className="grid justify-items-end">
                  <Amount value={r.recommended ?? r.requested} size="lg" />
                  {r.changedFrom != null && <span className="text-eyebrow text-warning">{fill(c.sm.changed, { amount: formatMoney(r.changedFrom, "RWF", locale) })}</span>}
                </span>
              </div>
            ) : <p className="text-small text-fg-muted">{c.sm.none}</p>}
          </Panel>

          <section aria-label={c.chain} className="grid gap-3">
            <h2 className="text-label-lg">{c.chain}</h2>
            <ApprovalChain steps={r.chain} me={user ? { id: user.id, roles: user.roles } : undefined}
              makerIds={[r.requestedBy.id, ...(r.adjustedBy ? [r.adjustedBy.id] : [])]}
              onSign={d.can.sign && !moneyBlocked ? doApprove : undefined} signing={approve.isPending} />
          </section>

          {execShown && <ExecutePanel d={d} moneyBlocked={moneyBlocked} />}
          {d.creditNote && <CreditNoteCard d={d} />}

          <Panel title={c.history}><HistoryTab resourceType="refund" resourceId={r.no} /></Panel>
        </div>

        {/* Decision rail: sticky on desktop, after the content on phone */}
        <aside className="grid gap-4 lg:sticky lg:top-20">
          <section className="grid gap-3 theme-dark bg-navy-900 p-5 text-fg m-rise" aria-label={c.approve.replace("{amount}", "")}>
            <span className="text-small opacity-80">{c.calc.suggested}</span>
            <span key={amount} className="m-rise"><Amount value={amount} size="xl" /></span>
            <span className="text-eyebrow opacity-70">{fill(c.adjustDlg.max, { amount: formatMoney(d.refundable, "RWF", locale) })}</span>
            {(d.can.sign || d.can.adjust || d.can.reject) && (
              <div className="mt-2 grid gap-2">
                {d.can.sign && <Button variant="primary" dots onClick={doApprove} loading={approve.isPending} disabled={!!moneyBlocked} className="w-full justify-center m-press">{fill(c.approve, { amount: formatMoney(amount, "RWF", locale) })}</Button>}
                <div className="grid grid-cols-2 gap-2">
                  {d.can.adjust && <Button variant="outline-dark" onClick={() => setAdjust(amount)} disabled={!!moneyBlocked} className="justify-center m-press">{c.adjust}</Button>}
                  {d.can.reject && <Button variant="outline-dark" onClick={() => { setRejectKey(newIdempotencyKey()); setRejecting(true); }} disabled={!online} className="justify-center m-press">{c.reject}</Button>}
                </div>
              </div>
            )}
            {!d.can.sign && ["recommended", "awaiting_executive"].includes(r.status) && (
              <p className="flex items-start gap-1.5 text-small opacity-80"><Icon name="lock" size={14} aria-hidden className="mt-0.5 shrink-0" />{r.status === "awaiting_executive" && d.can.signReason !== "same_approver" ? c.why.exec : c.why[d.can.signReason ?? "readOnly"] ?? c.why.readOnly}</p>
            )}
            {moneyBlocked && <p className="text-small text-warning">{moneyBlocked}</p>}
          </section>
          <Panel title={c.impact.title}><ImpactTable rows={d.impact} /></Panel>
        </aside>
      </div>

      {step.dialog}
      {adjust != null && <AdjustDialog d={d} initial={adjust} onClose={() => setAdjust(null)} onConflict={() => setConflict(true)} />}
      <ReasonDialog open={rejecting} onClose={() => setRejecting(false)} title={fill(c.rejectDlg.title, { no: r.no })} destructive audited
        options={Object.entries(c.rejectDlg.reasons).map(([value, label]) => ({ value, label }))} noteLabel={c.rejectDlg.note} confirmLabel={c.rejectDlg.confirm}
        onConfirm={async (v) => {
          try {
            await reject.mutateAsync({ no: r.no, rev: r.rev, idempotencyKey: rejectKey, reason: c.rejectDlg.reasons[v.reason as keyof typeof c.rejectDlg.reasons] ?? v.reason, note: v.note });
            setRejecting(false);
            toast({ title: c.toast.rejected });
          } catch (e) {
            if (errType(e) === "version_conflict") { setRejecting(false); setConflict(true); return; }
            throw new Error(errorCopy(e, locale));
          }
        }} />
      <ConflictDialog open={conflict} who={r.updatedBy ?? c.someone} when={r.updatedAt ?? r.at} onClose={() => setConflict(false)} onRefresh={() => { setConflict(false); refetch(); }} />
      <span className="sr-only">{f.states.loading}</span>
    </div>
  );
}

const Item = ({ k, v, wide }: { k: string; v: React.ReactNode; wide?: boolean }) => (
  <div className={cx("grid gap-1", wide && "sm:col-span-2")}><dt className="text-eyebrow text-fg-subtle">{k}</dt><dd>{v}</dd></div>
);

// ---------------------------------------------------------------- PolicyCalculator (RF2 + RF5 policy table)
function PolicyCalculator({ d, onUse }: { d: RefundDetail; onUse?: (amount: number) => void }) {
  const c = useRF();
  const { locale } = useI18n();
  const r = d.refund;
  const [spent, setSpent] = useState(r.passThroughRefunded === 0);
  // Preview via money.ts (no arithmetic in the component); the server recomputes on save.
  const s = refundSuggestion(d.invoice, r.stage, d.policy, spent);
  const pct = (bps: number) => new Intl.NumberFormat(locale, { style: "percent" }).format(bps / 10_000);
  return (
    <Panel title={c.calc.title}>
      <div className="grid gap-5 md:grid-cols-[1fr_15rem]">
        <div className="grid content-start gap-3">
          <dl className="grid gap-2 text-small">
            <Row k={c.calc.stage} v={<span className="font-medium">{c.stages[r.stage] ?? r.stage}</span>} />
            <Row k={c.calc.max} v={<span className="font-medium tabular">{pct(s.pct)}</span>} />
            <Row k={c.calc.eligible} v={<Amount value={s.eligiblePart} size="sm" />} />
            <Row k={c.calc.vat} v={<Amount value={s.vat} size="sm" />} />
            <Row k={c.calc.passThrough} v={<Amount value={s.passThrough} size="sm" />} />
          </dl>
          {d.invoice.totals.passThrough > 0 && r.stage !== "duplicate" && (
            <Switch label={spent ? c.calc.spent : c.calc.unspent} checked={!spent} onChange={(e) => setSpent(!e.target.checked)} />
          )}
          {r.stage === "duplicate" && <p className="text-small text-fg-muted">{c.calc.dup}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-tint p-4">
            <span className="grid">
              <span className="text-small text-navy-800">{c.calc.suggested}</span>
              <span key={s.total} className="m-rise"><Amount value={s.total} size="lg" className="font-semibold" /></span>
              <span className="text-eyebrow text-fg-muted tabular">({formatMoney(s.eligiblePart, "RWF", locale)} + {formatMoney(s.vat, "RWF", locale)}{s.passThrough ? ` + ${formatMoney(s.passThrough, "RWF", locale)}` : ""})</span>
            </span>
            {onUse && <Button size="sm" variant="primary" onClick={() => onUse(s.total)} className="m-press">{c.calc.use}</Button>}
          </div>
        </div>
        <div className="overflow-x-auto" role="region" aria-label={c.calc.policy} tabIndex={0}>
          <table className="w-full text-small">
            <caption className="mb-2 text-left text-label">{c.calc.policy}</caption>
            <thead><tr className="text-eyebrow text-fg-subtle"><th className="py-1.5 text-left font-normal">{c.calc.stage}</th><th className="py-1.5 text-right font-normal">{c.calc.pct}</th></tr></thead>
            <tbody>
              {Object.entries(d.policy).map(([k, v]) => (
                <tr key={k} className={cx("border-t border-border", k === r.stage && "bg-gold-100 font-medium")}>
                  <td className="py-1.5 pl-1">{c.stages[k] ?? k}</td><td className="py-1.5 pr-1 text-right tabular">{pct(v)}</td>
                </tr>
              ))}
              <tr className={cx("border-t border-border", r.stage === "duplicate" && "bg-gold-100 font-medium")}><td className="py-1.5 pl-1">{c.stages.duplicate}</td><td className="py-1.5 pr-1 text-right tabular">{pct(10_000)}</td></tr>
            </tbody>
          </table>
          <p className="mt-2"><TierChip tier="executive" limit={d.limit} /></p>
        </div>
      </div>
    </Panel>
  );
}
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 border-b border-dashed border-border pb-2"><dt className="text-fg-muted">{k}</dt><dd>{v}</dd></div>
);

// ---------------------------------------------------------------- Adjust (edits restart the chain; editor can't approve)
function AdjustDialog({ d, initial, onClose, onConflict }: { d: RefundDetail; initial: number; onClose: () => void; onConflict: () => void }) {
  const c = useRF();
  const f = useF();
  const { locale } = useI18n();
  const toast = useToast();
  const m = useRefundAdjust();
  const r = d.refund;
  const [key] = useState(newIdempotencyKey);
  const [amount, setAmount] = useState(String(initial));
  const [spent, setSpent] = useState(r.passThroughRefunded === 0);
  const [method, setMethod] = useState<RefundMethod>(r.method);
  const [dest, setDest] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  async function save() {
    const n = Number(amount.replace(/[^\d]/g, ""));
    const e: Record<string, string> = {};
    if (!(n > 0)) e.amount = c.adjustDlg.needAmount;
    else if (n > d.refundable) e.amount = c.adjustDlg.tooMuch;
    if (!note.trim()) e.note = c.adjustDlg.needNote;
    setErr(e);
    if (Object.keys(e).length) return;
    try {
      await m.mutateAsync({ no: r.no, rev: r.rev, idempotencyKey: key, amount: n, spent, method, destination: dest || undefined, note });
      toast({ title: c.toast.adjusted, tone: "success" });
      onClose();
    } catch (x) {
      const t = errType(x);
      if (t === "version_conflict") { onClose(); onConflict(); return; }
      setErr(t === "exceeds_refundable" ? { amount: c.adjustDlg.tooMuch } : { form: errorCopy(x, locale) });
    }
  }
  return (
    <Dialog open onClose={onClose} title={c.adjustDlg.title} description={r.no}
      footer={<Button onClick={save} loading={m.isPending} className="m-press">{c.adjustDlg.save}</Button>}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <p className="flex items-start gap-2 bg-warning-bg px-3 py-2.5 text-small text-warning"><Icon name="refresh" size={14} aria-hidden className="mt-0.5 shrink-0" />{c.adjustDlg.notice}</p>
        {err.form && <p role="alert" className="text-small text-danger">{err.form}</p>}
        <Field label={c.adjustDlg.amount} hint={fill(c.adjustDlg.max, { amount: formatMoney(d.refundable, "RWF", locale) })} error={err.amount}>
          {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular" />}
        </Field>
        {d.invoice.totals.passThrough > 0 && <Switch label={spent ? c.calc.spent : c.calc.unspent} checked={!spent} onChange={(e) => setSpent(!e.target.checked)} />}
        <Field label={c.adjustDlg.method}>{(a) => (
          <Select id={a.id} value={method} onChange={(e) => setMethod(e.target.value as RefundMethod)}>
            {ADJ_METHODS.map((x) => <option key={x} value={x}>{f.method[x] ?? x}</option>)}
          </Select>
        )}</Field>
        {method !== "credit" && (
          <Field label={c.adjustDlg.dest} hint={c.adjustDlg.destHint} optional="—">
            {(a) => <Input id={a.id} aria-describedby={a.describedBy} inputMode="tel" autoComplete="off" value={dest} onChange={(e) => setDest(e.target.value)} />}
          </Field>
        )}
        <Field label={c.adjustDlg.note} error={err.note}>{(a) => <Textarea id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- ExecutePanel (RF3)
function ExecutePanel({ d, moneyBlocked }: { d: RefundDetail; moneyBlocked: string | null }) {
  const c = useRF();
  const f = useF();
  const { locale } = useI18n();
  const toast = useToast();
  const m = useRefundExecute();
  const step = useStepUpAction();
  const r = d.refund;
  const amount = r.approved ?? r.recommended ?? r.requested;
  const [method, setMethod] = useState<RefundMethod>(r.method === "credit" ? "original" : r.method);
  const [proof, setProof] = useState<File | null>(null);
  const [key, setKey] = useState(newIdempotencyKey);
  const [err, setErr] = useState<string | null>(null);
  const dest = r.destination?.masked ?? d.payer.masked;
  const proofName = proof ? proof.name : undefined;
  const lastAt = r.chain.length ? r.chain[r.chain.length - 1].at : undefined;
  const doneAt = r.status === "refunded" ? r.updatedAt : undefined;

  if (r.status === "completed_as_credit")
    return <Panel title={c.exec.title}><p className="flex items-center gap-2 text-small text-success"><Icon name="wallet" size={16} aria-hidden />{c.exec.credit}</p></Panel>;

  const states: [ExecStep, ExecStep, ExecStep] =
    r.status === "refunded" ? ["done", "done", "done"] : r.status === "executing" ? ["done", "active", "todo"] : r.status === "execution_failed" ? ["done", "failed", "todo"] : ["done", "todo", "todo"];

  async function pay(k = key) {
    if (method === "bank" && !proof) return setErr(c.exec.proofHint);
    setErr(null);
    try {
      const res = await step.run(fill(c.executeWhat, { no: r.no }), async (t) => m.mutateAsync({ no: r.no, rev: r.rev, idempotencyKey: k, stepUp: t, method, proofName, proofUploadId: proof ? (await uploadFile(proof, "refund-proof")).id : undefined }));
      if (res) toast({ title: res.status === "refunded" ? c.toast.refunded : c.toast.executing, tone: "success" });
    } catch (e) { setErr(errorCopy(e, locale)); }
  }

  return (
    <Panel title={c.exec.title}>
      <div className="grid gap-5 md:grid-cols-[13rem_1fr]">
        <ExecSteps states={states} times={[lastAt, doneAt, doneAt]} />
        <div className="grid content-start gap-4">
          {r.status === "executing" && (
            <div className="flex flex-wrap items-center gap-4 bg-bg-tint p-4 m-rise">
              <span className="flex size-12 items-center justify-center rounded-full bg-white text-navy-700"><Icon name="phone" size={22} aria-hidden /></span>
              <div className="grid flex-1">
                <span className="text-small font-medium">{fill(c.exec.processing, { method: f.method[r.method] ?? r.method })}</span>
                <Amount value={amount} size="lg" className="font-semibold" />
                <span className="text-small text-fg-muted tabular">{fill(c.exec.to, { dest })}</span>
              </div>
              <p className="flex items-center gap-2 bg-warning-bg px-3 py-2 text-small text-warning"><Icon name="clock" size={14} aria-hidden />{c.exec.mayTake}</p>
            </div>
          )}
          {r.status === "refunded" && (
            <p className="flex items-center gap-2 bg-success-bg px-3 py-2.5 text-small text-success m-rise">
              <Icon name="check" size={16} aria-hidden className="m-tick" />{r.proofDocId ? c.exec.proofDone : fill(c.exec.done, { ref: r.providerRef ?? "—" })}{r.executedBy && <span className="text-fg-muted">· {r.executedBy.name}</span>}
            </p>
          )}
          {r.status === "execution_failed" && (
            <div role="alert" className="grid gap-1 bg-danger-bg px-3 py-2.5 text-small text-danger m-shake">
              <span className="font-medium">{c.exec.failed}</span>{r.failReason && <span>{r.failReason}</span>}
            </div>
          )}
          {(r.status === "credited" || r.status === "execution_failed") && (d.can.execute ? (
            <div className="grid gap-3">
              <p className="text-small text-fg-muted">{c.exec.who}</p>
              <Field label={c.exec.method}>{(a) => (
                <Select id={a.id} value={method} onChange={(e) => setMethod(e.target.value as RefundMethod)} className="max-w-xs">
                  {PAY_METHODS.map((x) => <option key={x} value={x}>{f.method[x] ?? x}</option>)}
                </Select>
              )}</Field>
              {method === "bank" && (
                <Field label={c.exec.proof} hint={c.exec.proofHint}>{(a) => (
                  <div className="grid gap-2"><FileDrop id={a.id} accept="application/pdf,image/*" onFiles={(fs) => setProof(fs[0] ?? null)} />{proof && <span className="flex items-center gap-2 text-small"><Icon name="fileCheck" size={14} aria-hidden />{proof.name}</span>}</div>
                )}</Field>
              )}
              {err && <p role="alert" className="text-small text-danger">{err}</p>}
              <div className="flex flex-wrap gap-2">
                {r.status === "execution_failed" ? (
                  // Retry with a fresh key: the failed attempt's key replays the failure, never pays twice.
                  <Button onClick={() => { const k = newIdempotencyKey(); setKey(k); pay(k); }} loading={m.isPending} disabled={!!moneyBlocked} className="m-press"><Icon name="refresh" size={14} aria-hidden />{c.exec.retry}</Button>
                ) : (
                  <Button onClick={() => pay()} loading={m.isPending} disabled={!!moneyBlocked} dots className="m-press">{method === "bank" ? c.exec.markPaid : fill(c.exec.start, { amount: formatMoney(amount, "RWF", locale) })}</Button>
                )}
              </div>
              {moneyBlocked && <Reason>{moneyBlocked}</Reason>}
            </div>
          ) : (
            <Reason>{c.exec.waiting}</Reason>
          ))}
        </div>
      </div>
      {step.dialog}
      <span className="sr-only">{formatDate(r.at, locale)}</span>
    </Panel>
  );
}

// ---------------------------------------------------------------- Credit-note card (RF4)
function CreditNoteCard({ d }: { d: RefundDetail }) {
  const c = useRF();
  const { locale } = useI18n();
  const cn = d.creditNote!;
  const outcome = d.refund.method === "credit" ? "credit" : d.refund.status === "refunded" ? "refund" : "balance";
  return (
    <section aria-label={c.cn.title} className="grid gap-4 border border-border bg-white p-4 sm:p-5 m-rise">
      <p className="flex items-center gap-2 bg-success-bg px-3 py-2 text-small font-medium text-success"><Icon name="check" size={16} aria-hidden className="m-tick" />{fill(c.cn.created, { no: cn.no })}</p>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 text-small">
          <Item k={c.cn.invoice} v={<span className="tabular">{cn.invoiceNo}</span>} />
          <Item k={c.cn.amount} v={<Amount value={cn.totals.total} className="font-semibold" />} />
          <Item k={c.cn.client} v={d.refund.clientName} />
          <Item k={c.cn.vat} v={<Amount value={cn.totals.vat} />} />
        </dl>
        <Link href={localHref(locale, `/finance/credit-notes/${cn.no}`)} className="inline-flex h-11 items-center gap-2 border border-border-strong px-5 text-button m-press hover:bg-navy-50">
          <Icon name="file" size={16} aria-hidden />{c.cn.title}
        </Link>
      </div>
      <p className="flex flex-wrap items-center gap-2 bg-bg-tint px-3 py-2 text-small text-navy-800"><Icon name="layers" size={14} aria-hidden />{c.cn.outcome[outcome]}</p>
    </section>
  );
}
