"use client";
// U8 MoMo prompt (F-FIN-08 / F-FIN-13), board VI5. Online only: initiated → pending_provider → confirmed | failed | expired | cancelled.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError, newIdempotencyKey } from "@/lib/api/client";
import { errorCopy } from "@/lib/api/error-copy";
import { formatMoney } from "@/shared/format";
import { Sheet } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Field, Input, Select } from "@/components/atoms/field";
import { Skeleton } from "@/components/atoms/feedback";
import { fx } from "@/lib/field/api";
import { normaliseMsisdn } from "@/lib/field/geo";
import { useOnline } from "@/lib/field/net";
import { useEngine } from "@/lib/field/sync";
import { useFieldCopy, fill } from "@/lib/field/copy";
import { copyE } from "@/lib/field/copy-e";
import { ctl } from "@/components/molecules/field/ctl";
import { FIELD_POLICY } from "@/shared/policy";
import type { FieldVisit } from "@/shared/field/types";

type Invoice = { number: string; balance_due: number };
type PayState = "pending_provider" | "confirmed" | "failed" | "expired" | "cancelled";
const POLL_MS = 5_000, MAX_MS = 3 * 60_000;

/** MTN MoMo phone art with the board's progress ring. */
function MomoArt({ state }: { state: PayState | null }) {
  const spinning = state === "pending_provider";
  return (
    <div aria-hidden className="relative mx-auto flex size-40 items-center justify-center rounded-full bg-navy-50">
      <svg viewBox="0 0 120 120" className={spinning ? "absolute inset-0 size-full animate-spin [animation-duration:2.4s] motion-reduce:animate-none" : "absolute inset-0 size-full"}>
        <circle cx="60" cy="60" r="56" fill="none" stroke="var(--color-navy-700)" strokeOpacity=".15" strokeWidth="5" />
        {spinning && <circle cx="60" cy="60" r="56" fill="none" stroke="var(--color-navy-700)" strokeWidth="5" strokeLinecap="round" strokeDasharray="90 262" />}
      </svg>
      <span className="relative flex h-24 w-14 flex-col items-center justify-center border-4 border-navy-950 bg-[#FFCB05] text-[0.7rem] leading-tight font-bold text-navy-950">MTN<br />MoMo</span>
      {state === "confirmed" && <span className="m-pop absolute right-6 bottom-6 flex size-9 items-center justify-center bg-success text-white">✓</span>}
      {(state === "failed" || state === "expired") && <span className="m-pop absolute right-6 bottom-6 flex size-9 items-center justify-center bg-danger text-white">!</span>}
    </div>
  );
}

export function MomoPromptSheet({ visit, open, onClose }: { visit: FieldVisit; open: boolean; onClose: () => void }) {
  const { c, locale } = useFieldCopy();
  const t = copyE(locale).pay;
  const online = useOnline();
  const min = useEngine().bundle?.settings.momoMinPartial ?? FIELD_POLICY.momoMinPartial;
  const inv = useQuery({ queryKey: ["field", "invoices", visit.id], queryFn: () => fx<Invoice[]>("GET", `/api/x_field/visits/${visit.id}/invoices`), enabled: open && online });
  const [invoiceNo, setInvoiceNo] = useState("");
  const [phone, setPhone] = useState(visit.client.phone);
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [pay, setPay] = useState<{ id: string; state: PayState; receipt?: string | null; startedAt: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const key = useRef<string | null>(null);

  const invoice = inv.data?.find((i) => i.number === (invoiceNo || inv.data?.[0]?.number));
  const amt = amount === "" ? invoice?.balance_due ?? 0 : Number(amount);

  // Poll every 5 s for up to 3 min (timers live in effects, never render).
  useEffect(() => {
    if (!pay || pay.state !== "pending_provider") return;
    const id = window.setInterval(async () => {
      try {
        const r = await fx<{ state: PayState; receipt: string | null }>("GET", `/api/x_field/payments/${pay.id}`);
        if (r.state !== "pending_provider") setPay((p) => p && { ...p, state: r.state, receipt: r.receipt });
        else if (Date.now() - pay.startedAt > MAX_MS) { setPay((p) => p && { ...p, state: "expired" }); setNote(t.timeout); }
      } catch { /* transient: keep polling */ }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [pay, t.timeout]);

  async function send() {
    const e: Record<string, string> = {};
    const msisdn = normaliseMsisdn(phone);
    if (!msisdn) e.phone = t.phoneBad;
    if (!Number.isInteger(amt) || amt < min) e.amount = fill(t.min, { min: formatMoney(min, "RWF", locale) });
    else if (invoice && amt > invoice.balance_due) e.amount = t.over;
    setErr(e);
    if (Object.keys(e).length || !invoice) return;
    key.current ??= newIdempotencyKey(); // one key per attempt; a retry after failure gets a new one
    setBusy(true); setNote(null);
    try {
      const r = await fx<{ id: string; state: PayState }>("POST", `/api/x_field/visits/${visit.id}/momo`, { invoice_no: invoice.number, msisdn, amount: amt }, key.current);
      setPay({ id: r.id, state: r.state, startedAt: Date.now() });
    } catch (x) {
      if (x instanceof ApiError && x.errorType === "payment_in_progress") setNote(t.inProgress);
      else if (x instanceof ApiError && x.errorType === "bad_msisdn") setErr({ phone: t.phoneBad });
      else setNote(errorCopy(x, locale) || t.error);
    } finally { setBusy(false); }
  }
  function again() { key.current = null; setPay(null); setNote(null); }
  async function cancel() {
    if (pay) await fx("POST", `/api/x_field/payments/${pay.id}/cancel`).catch(() => {});
    setPay((p) => p && { ...p, state: "cancelled" });
  }

  const state = pay?.state ?? null;
  return (
    <Sheet open={open} onClose={onClose} side="bottom" title={t.title} description={t.never}
      footer={
        state === "pending_provider" ? <Button variant="outline" onClick={() => void cancel()}>{t.cancel}</Button>
          : state && state !== "confirmed" ? <Button onClick={again}>{t.retry}</Button>
            : state === "confirmed" ? <Button onClick={onClose}>{copyE(locale).exp.tabs.paid}</Button>
              : <Button loading={busy} disabled={!online || !invoice || busy} onClick={() => void send()}>{t.send}</Button>
      }>
      <div className="mx-auto grid max-w-md gap-4">
        {!online ? <p className="bg-warning-bg px-4 py-3 text-small">{c.needsConnection}</p>
          : inv.isPending ? <div className="grid gap-3"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
            : inv.isError ? <p role="alert" className="text-small text-danger">{t.loadError}</p>
              : !inv.data?.length ? <p className="bg-ink-100 px-4 py-6 text-center text-small">{t.none}</p>
                : state ? (
                  <div className="grid gap-3 text-center" aria-live="polite">
                    <MomoArt state={state} />
                    <p className="text-h3 tabular">{formatMoney(amt, "RWF", locale)}</p>
                    <p className="text-label-lg">{state === "pending_provider" ? t.waiting : state === "confirmed" ? t.confirmed : state === "failed" ? t.failed : state === "expired" ? t.expired : t.cancelled}</p>
                    <p className="text-small text-fg-muted">{state === "pending_provider" ? t.waitingHint : state === "confirmed" && pay?.receipt ? fill(t.receipt, { n: pay.receipt }) : state === "failed" ? t.failedHint : ""}</p>
                  </div>
                ) : (
                  <>
                    <Field label={t.invoice}>
                      {(a) => <Select {...ctl(a)} value={invoice?.number ?? ""} onChange={(e) => { setInvoiceNo(e.target.value); setAmount(""); }}>
                        {inv.data.map((i) => <option key={i.number} value={i.number}>{i.number} · {formatMoney(i.balance_due, "RWF", locale)}</option>)}
                      </Select>}
                    </Field>
                    {invoice && <p className="text-center text-h2 tabular">{formatMoney(invoice.balance_due, "RWF", locale)}</p>}
                    <Field label={t.phone} error={err.phone}>
                      {(a) => <Input {...ctl(a)} type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} />}
                    </Field>
                    <Field label={t.amount} hint={invoice ? fill(t.due, { amount: formatMoney(invoice.balance_due, "RWF", locale) }) : undefined} error={err.amount}>
                      {(a) => <Input {...ctl(a)} inputMode="numeric" value={amount === "" ? String(invoice?.balance_due ?? "") : amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />}
                    </Field>
                  </>
                )}
        {note && <p role="alert" className="text-small text-danger">{note}</p>}
        <p className="text-center text-small font-medium text-fg-muted">{t.never}</p>
      </div>
    </Sheet>
  );
}
