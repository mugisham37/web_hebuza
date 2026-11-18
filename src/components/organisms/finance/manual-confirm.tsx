"use client";
// U8 ManualConfirmForm (board 06 PY4, X-4): the maker records cash/other/bank payments; the chain preview shows who
// must confirm (manualChain from lib). Evidence required, bank ref unique (checked on blur), step-up, one Idempotency-Key.
import { uploadFile } from "@/lib/api/upload";
import { useDeferredValue, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { formatNumber } from "@/shared/format";
import { api, newIdempotencyKey, unwrap } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { manualChain } from "@/shared/finance/approvals";
import { useFinAction, useInvoiceOptions, type PaymentDetail, type PaymentList } from "@/lib/finance/c";
import type { Method } from "@/shared/finance/types";
import { Icon } from "@/components/atoms/icon";
import { Button } from "@/components/atoms/button";
import { Sheet } from "@/components/atoms/dialog";
import { DateInput, ErrorSummary, Field, Input, Select, Textarea } from "@/components/atoms/field";
import { FileDrop } from "@/components/atoms/file-drop";
import { useToast } from "@/components/atoms/toast";
import { usePhone } from "@/components/atoms/step-up";
import { Amount, useF } from "@/components/atoms/finance";
import { ApprovalChain, useStepUpAction } from "@/components/molecules/finance/finance";
import { DesktopOnly, fill, useMoneyGuard, useP } from "@/components/molecules/finance/finance";
import { hdr } from "@/lib/finance/api";

const METHODS: Method[] = ["cash", "bank_transfer", "mtn_momo", "airtel_money", "other"];
export type ManualPrefill = { invoiceNo?: string; amount?: number; bankReference?: string; receivedAt?: string; method?: Method; lineId?: string };

export function ManualConfirmForm({ open, onClose, onDone, prefill }: { open: boolean; onClose: () => void; onDone: (paymentId: string) => void; prefill?: ManualPrefill }) {
  const p = useP();
  const phone = usePhone();
  return (
    <Sheet open={open} onClose={onClose} side={phone ? "bottom" : "right"} className="md:max-w-lg"
      title={prefill?.lineId ? p.manual.titleLine : p.manual.title} description={p.manual.sub}>
      {/* Remount per open so every dialog instance gets a fresh form + Idempotency-Key. */}
      {open && <Form key={prefill?.lineId ?? "new"} onClose={onClose} onDone={onDone} prefill={prefill} />}
    </Sheet>
  );
}

function Form({ onClose, onDone, prefill = {} }: { onClose: () => void; onDone: (id: string) => void; prefill?: ManualPrefill }) {
  const p = useP();
  const f = useF();
  const { locale } = useI18n();
  const toast = useToast();
  const guard = useMoneyGuard();
  const stepUp = useStepUpAction();
  const [key] = useState(newIdempotencyKey);
  const [search, setSearch] = useState(prefill.invoiceNo ?? "");
  const opts = useInvoiceOptions(useDeferredValue(search));
  const [invoiceNo, setInvoiceNo] = useState(prefill.invoiceNo ?? "");
  const [method, setMethod] = useState<Method>(prefill.method ?? "cash");
  const [amountText, setAmountText] = useState(prefill.amount ? formatNumber(prefill.amount, locale) : "");
  const [ref, setRef] = useState(prefill.bankReference ?? "");
  const [refState, setRefState] = useState<"idle" | "taken" | "free">("idle");
  const [receivedAt, setReceivedAt] = useState(prefill.receivedAt?.slice(0, 10) ?? "");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const digits = amountText.replace(/\D/g, "");
  const amount = digits ? Number(digits) : 0;
  const submit = useFinAction(async (token: string) => unwrap<PaymentDetail>(api.POST("/api/finance/payments/manual", { body: {
    invoiceNo, method, amount, bankReference: ref.trim() || undefined, receivedAt: new Date(`${receivedAt}T12:00:00`).toISOString(),
    evidenceName: evidence?.name, evidenceUploadId: evidence ? (await uploadFile(evidence, "payment-evidence")).id : undefined, reason: p.manual.reasons[reason] ?? reason, note: note.trim() || undefined, lineId: prefill.lineId,
  }, headers: hdr({ stepUp: token, idempotencyKey: key }) })));

  const chosen = opts.data?.items.find((i) => i.no === invoiceNo);

  async function checkRef() {
    const r = ref.trim();
    if (!r) return setRefState("idle");
    try {
      const l = await unwrap<PaymentList>(api.GET("/api/finance/payments", { params: { query: { q: r } } }));
      setRefState(l.items.some((x) => x.ref?.toUpperCase() === r.toUpperCase()) ? "taken" : "free");
    } catch { setRefState("idle"); }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const m = p.manual.errors;
    const next: Record<string, string> = {};
    if (!invoiceNo) next.invoice = m.invoice;
    if (!amount) next.amount = m.amount;
    if (method === "bank_transfer" && !ref.trim()) next.ref = m.ref;
    if (refState === "taken") next.ref = p.manual.refTaken;
    if (!receivedAt) next.received = m.received;
    if (!evidence) next.evidence = m.evidence;
    if (!reason) next.reason = m.reason;
    setErrors(next);
    if (Object.keys(next).length) return;
    setErr(null);
    try {
      const r = await stepUp.run(p.manual.title, (t) => submit.mutateAsync(t));
      if (!r) return;
      toast({ title: p.manual.done, tone: "success" });
      onDone(r.payment.id);
    } catch (e2) { setErr(errorCopy(e2, locale)); }
  }

  const list = Object.entries(errors).map(([field, message]) => ({ field: `mc-${field}`, message }));
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <DesktopOnly text={p.manual.desktop} />
      {!!list.length && <ErrorSummary title={p.manual.errTitle} errors={list} />}
      {err && <p role="alert" className="bg-danger-bg p-3 text-small text-danger">{err}</p>}

      <Field id="mc-invoice" label={p.manual.invoice} hint={p.manual.invoiceHint} error={errors.invoice}>
        {({ id, describedBy, invalid }) => (
          <div className="grid gap-2">
            <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} type="search" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
            <ul role="listbox" aria-label={p.manual.invoicePick} className="grid max-h-48 gap-1 overflow-y-auto">
              {opts.data?.items.length === 0 && <li className="text-small text-fg-muted">{p.manual.noInvoices}</li>}
              {opts.data?.items.map((i) => (
                <li key={i.no} role="option" aria-selected={i.no === invoiceNo}>
                  <button type="button" onClick={() => { setInvoiceNo(i.no); setSearch(i.no); }}
                    className={`flex w-full flex-wrap items-center justify-between gap-2 border px-3 py-2 text-left text-small ${i.no === invoiceNo ? "border-secondary bg-navy-50" : "border-border hover:bg-navy-50"}`}>
                    <span className="min-w-0"><span className="font-medium tabular">{i.no}</span> · <span className="text-fg-muted">{i.client}</span></span>
                    <span className="text-eyebrow text-fg-muted">{fill(p.manual.balance, { amount: "" })}<Amount value={i.balance} size="sm" /></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={p.manual.method}>
          {({ id }) => (
            <Select id={id} value={method} onChange={(e) => setMethod(e.target.value as Method)}>
              {METHODS.map((m) => <option key={m} value={m}>{(f.method as Record<string, string>)[m]}</option>)}
            </Select>
          )}
        </Field>
        <Field id="mc-amount" label={p.manual.amount} hint={p.manual.amountHint} error={errors.amount}>
          {({ id, describedBy, invalid }) => (
            <div className="flex">
              <span className="inline-flex h-12 items-center border border-r-0 border-border-strong bg-bg-subtle px-3 text-small text-fg-muted">RWF</span>
              <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} inputMode="numeric" className="tabular" value={amountText}
                onChange={(e) => setAmountText(e.target.value.replace(/[^\d\s,. ]/g, ""))}
                onBlur={() => setAmountText(digits ? formatNumber(Number(digits), locale) : "")} />
            </div>
          )}
        </Field>
      </div>

      <Field id="mc-ref" label={p.manual.bankRef} hint={p.manual.bankRefHint} error={errors.ref} optional={method === "bank_transfer" ? undefined : p.manual.optional}>
        {({ id, describedBy, invalid }) => (
          <div className="relative">
            <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || refState === "taken"} value={ref} className="pr-10 tabular"
              onChange={(e) => { setRef(e.target.value); setRefState("idle"); }} onBlur={checkRef} />
            {refState !== "idle" && (
              <span aria-live="polite" className={`absolute top-1/2 right-3 -translate-y-1/2 ${refState === "free" ? "text-success" : "text-danger"}`}>
                <Icon name={refState === "free" ? "check" : "x"} size={16} aria-label={refState === "free" ? p.manual.refFree : p.manual.refTaken} />
              </span>
            )}
          </div>
        )}
      </Field>

      <Field id="mc-received" label={p.manual.received} error={errors.received}>
        {({ id, describedBy, invalid }) => <DateInput id={id} aria-describedby={describedBy} aria-invalid={invalid} value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />}
      </Field>

      <Field id="mc-evidence" label={<>{p.manual.evidence} <span aria-hidden className="text-danger">*</span></>} hint={p.manual.evidenceHint} error={errors.evidence}>
        {({ id }) => evidence ? (
          <p className="flex items-center justify-between gap-2 border border-border p-3 text-small m-pop">
            <span className="flex min-w-0 items-center gap-2"><Icon name="fileCheck" size={16} aria-hidden className="text-success" /><span className="truncate">{evidence.name}</span></span>
            <button type="button" onClick={() => setEvidence(null)} className="text-small underline underline-offset-4">{p.manual.cancel}</button>
          </p>
        ) : <FileDrop id={id} accept="application/pdf,image/*" camera onFiles={(fs) => setEvidence(fs[0] ?? null)} />}
      </Field>

      <Field id="mc-reason" label={<>{p.manual.reason} <span aria-hidden className="text-danger">*</span></>} error={errors.reason}>
        {({ id, describedBy, invalid }) => (
          <Select id={id} aria-describedby={describedBy} aria-invalid={invalid} value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">—</option>
            {Object.entries(p.manual.reasons).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        )}
      </Field>
      <Field label={p.manual.note} optional={p.manual.optional}>
        {({ id }) => <Textarea id={id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>

      {amount > 0 && (
        <div className="grid gap-2">
          <p className="text-label">{p.manual.chainTitle}</p>
          <ApprovalChain steps={manualChain(amount)} />
          <p className="text-eyebrow text-fg-subtle">{p.manual.chainBody}{chosen ? ` · ${fill(p.manual.balance, { amount: "" })}` : ""}{chosen && <Amount value={chosen.balance} size="sm" />}</p>
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-border bg-white p-4">
        <Button type="button" variant="outline" onClick={onClose}>{p.manual.cancel}</Button>
        <Button type="submit" dots loading={submit.isPending} disabled={!guard.can} title={!guard.online ? p.offline : undefined} className="m-press">{p.manual.submit}</Button>
      </div>
      {stepUp.dialog}
    </form>
  );
}
