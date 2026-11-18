"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { api, unwrap, ApiError } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import type * as C from "@/lib/client/types";
import { cx, formatDateTime, formatMoney } from "@/shared/format";
import { flowCopy, fill, type FlowCopy } from "@/content/pages/flow";
import {
  AuthTitle,
  Notice,
  ResultPanel,
  apiMessage,
  VerifyNotice,
} from "@/components/molecules/auth/auth";
import { PhoneInput, toE164 } from "@/components/atoms/inputs";
import { Button, ButtonLink } from "@/components/atoms/button";
import { Field } from "@/components/atoms/field";
import { ErrorState, Skeleton, Spinner } from "@/components/atoms/feedback";
import { Money } from "@/components/atoms/domain";
import { Icon } from "@/components/atoms/icon";

type App = C.ApplicationDetailResponse;
type Receipt = C.PaymentReceiptResponse;
type Method = "momo" | "airtel" | "card" | "bank";
type Phase =
  | "choose"
  | "sending"
  | "waiting"
  | "card"
  | "success"
  | "failed"
  | "insufficient"
  | "expired"
  | "verifying";

/** Server status → UI outcome. Unknown strings stay "waiting" (we keep polling, never guess success). */
export function outcome(
  s: string,
): Exclude<Phase, "choose" | "sending" | "card" | "verifying"> {
  const v = s.toLowerCase();
  if (/^(success|successful|paid|completed)$/.test(v)) return "success";
  if (v.includes("insufficient")) return "insufficient";
  if (/expired|timeout/.test(v)) return "expired";
  if (/fail|declin|cancel|reject/.test(v)) return "failed";
  return "waiting";
}
/** Poll delay: every 3 s for the first ~15 s, then back off to 15 s max. */
export const pollDelay = (n: number) =>
  Math.min(15_000, n < 5 ? 3_000 : 3_000 * 1.5 ** (n - 4));
const STILL_WAITING_MS = 30_000;
/** Stable per invoice + method + attempt, so a double press or a retry of the same intent never charges twice. */
export const payKey = (code: string, method: string, attempt: number) => `pay:${code}:${method}:${attempt}`;
const DEFAULT_TTL_MS = 5 * 60_000;
const clock = (expiresAt?: string | null) => {
  const now = Date.now();
  return { now, deadline: expiresAt ? new Date(expiresAt).getTime() : now + DEFAULT_TTL_MS };
};

export function PayFlow({ code }: { code: string }) {
  const { locale } = useI18n();
  const { user } = useSession();
  const c = flowCopy(locale);
  const p = c.pay;
  const L = (path: string) => localHref(locale, path);
  const returnedTx = useSearchParams().get("tx");

  const app = useQuery({
    queryKey: ["flow", "application", code],
    queryFn: () =>
      unwrap<App>(
        api.GET("/api/applications/{code}", { params: { path: { code } } }),
      ),
    retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2,
  });
  const [method, setMethod] = useState<Method>("momo");
  const [phone, setPhone] = useState(user?.phone?.replace(/^\+250/, "") ?? "");
  const [phoneError, setPhoneError] = useState<string>();
  const [phase, setPhase] = useState<Phase>(returnedTx ? "waiting" : "choose");
  const [tx, setTx] = useState<string | null>(returnedTx);
  const [deadline, setDeadline] = useState(() => Date.now() + DEFAULT_TTL_MS);
  const [started, setStarted] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const paid = app.data?.payment_status === "paid";
  const receipt = useQuery({
    queryKey: ["flow", "receipt", code],
    queryFn: () =>
      unwrap<Receipt>(
        api.GET("/api/applications/{code}/payment/receipt", {
          params: { path: { code } },
        }),
      ),
    enabled: phase === "success" || paid,
  });

  // Status polling with backoff; stops on any final outcome or when the prompt expires.
  useEffect(() => {
    if (phase !== "waiting" || !tx) return;
    let n = 0;
    let timer: ReturnType<typeof setTimeout>;
    let live = true;
    const tick = async () => {
      if (Date.now() > deadline) return live && setPhase("expired");
      try {
        const s = await unwrap<C.PaymentStatusResponse>(
          api.GET("/api/payments/{transaction_id}/status", {
            params: { path: { transaction_id: tx } },
          }),
        );
        const o = outcome(s.status);
        if (!live) return;
        if (o !== "waiting") return setPhase(o);
      } catch {} // transient network/server error: keep polling until the deadline
      if (live) timer = setTimeout(tick, pollDelay(++n));
    };
    timer = setTimeout(tick, pollDelay(0));
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [phase, tx, deadline]);

  useEffect(() => {
    if (phase !== "waiting") return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [phase]);

  async function pay() {
    setError(null);
    if (method === "bank") {
      setPhase("sending");
      try {
        // POST /api/payments/bank-transfer {application_code}: client declares a transfer; finance verifies it (payments.service decideBankTransfer).
        await unwrap(api.POST("/api/payments/bank-transfer", { body: { application_code: code } }));
        return setPhase("verifying");
      } catch (e) {
        setPhase("choose");
        return setError(apiMessage(e, c.generic, locale));
      }
    }
    const e164 = method === "card" ? null : toE164(phone);
    if (method !== "card" && !e164) return setPhoneError(c.about.badPhone);
    setPhoneError(undefined);
    setPhase("sending");
    try {
      const r = await unwrap<C.InitiatePaymentResponse>(
        api.POST("/api/payments/initiate", {
          body: {
            application_code: code,
            method: method === "card" ? "card" : "mobile_money",
            operator:
              method === "card" ? null : method === "momo" ? "mtn" : "airtel",
            phone_number: e164,
          },
          headers: { "Idempotency-Key": payKey(code, method, attempt) }, // F-FIN-16: same key on a double press; a new attempt only after a final failure
        }),
      );
      setTx(r.transactionId);
      const t = clock(r.expiresAt);
      setDeadline(t.deadline);
      setStarted(t.now);
      setNow(t.now);
      const o = outcome(r.status);
      if (
        method === "card" &&
        r.sessionToken &&
        /^(https:\/\/|\/)/.test(r.sessionToken)
      ) {
        setPhase("card");
        location.assign(r.sessionToken);
        return;
      }
      setPhase(o === "waiting" ? "waiting" : o);
    } catch (e) {
      setPhase("choose");
      setError(apiMessage(e, c.generic, locale));
    }
  }

  if (app.isPending)
    return <Skeleton className="mx-auto h-96 max-w-4xl" />;
  if (app.error)
    return (
      <div className="mx-auto max-w-xl">
        {app.error instanceof ApiError &&
        (app.error.isNotFound || app.error.isForbidden) ? (
          <ResultPanel icon="search" tone="neutral" title={p.notFound}>
            <ButtonLink href={L("/requests")}>{p.back}</ButtonLink>
          </ResultPanel>
        ) : (
          <ErrorState error={app.error} onRetry={() => app.refetch()} />
        )}
      </div>
    );

  const a = app.data;
  const amount = a.payment_amount ?? 0;
  const masked = `+250 ${phone.replace(/\D/g, "").slice(-9, -6)} ••• ${phone.replace(/\D/g, "").slice(-3)}`;
  const back = (
    <ButtonLink
      href={L(`/requests/${encodeURIComponent(code)}`)}
      variant="outline"
      className="justify-center"
    >
      {p.back}
    </ButtonLink>
  );
  const retry = () => {
    setAttempt((n) => n + 1); // the last attempt is final, so the next press is a new payment intent
    setPhase("choose");
  };
  const retryBtns = (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      <Button className="justify-center" onClick={retry}>
        {p.retry}
      </Button>
      <Button
        variant="outline"
        className="justify-center"
        onClick={retry}
      >
        {p.another}
      </Button>
    </div>
  );

  if (paid || phase === "success")
    return (
      <div className="mx-auto grid max-w-xl gap-8">
        <ResultPanel
          icon="check"
          title={paid && phase !== "success" ? p.alreadyPaid : p.successTitle}
        >
          <Money amount={receipt.data?.amount ?? amount} className="text-h3" />
        </ResultPanel>
        {receipt.isPending ? (
          <Skeleton className="h-64" />
        ) : receipt.error ? (
          <ErrorState error={receipt.error} onRetry={() => receipt.refetch()} />
        ) : (
          <ReceiptCard r={receipt.data} c={c} />
        )}
        <div className="grid gap-3 sm:grid-cols-2 print:hidden">
          <Button
            variant="secondary"
            className="justify-center"
            onClick={() => print()}
            disabled={!receipt.data}
          >
            <Icon name="file" size={18} aria-hidden /> {p.print}
          </Button>
          {back}
        </div>
      </div>
    );

  if (!amount)
    return (
      <div className="mx-auto max-w-xl">
        <ResultPanel icon="clock" tone="neutral" title={a.service_name}>
          <p className="text-lead text-fg-muted">{p.nothingDue}</p>
          {back}
        </ResultPanel>
      </div>
    );

  if (phase !== "choose") {
    const left = Math.max(0, deadline - now);
    const mmss = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`;
    return (
      <div className="mx-auto grid max-w-md gap-6" aria-live="polite">
        {phase === "verifying" && (
          <ResultPanel icon="clock" tone="neutral" title={p.bank.pendingTitle}>
            <p className="text-fg-muted">{p.bank.pendingBody}</p>
            {back}
          </ResultPanel>
        )}
        {phase === "sending" && (
          <ResultPanel icon="refresh" tone="neutral" title={p.sending}>
            <p className="text-fg-muted">{p.keepOpen}</p>
          </ResultPanel>
        )}
        {phase === "card" && (
          <ResultPanel icon="lock" tone="neutral" title={p.cardHandoff}>
            <Spinner />
          </ResultPanel>
        )}
        {phase === "waiting" &&
          (method === "card" || returnedTx ? (
            <ResultPanel icon="card" tone="neutral" title={p.cardReturn}>
              <Spinner />
            </ResultPanel>
          ) : (
            <>
              <ResultPanel icon="phone" tone="neutral" title={p.approve}>
                <ol className="grid gap-2 text-left">
                  {p.approveSteps.map((s, i) => (
                    <li key={s} className="flex items-center gap-3">
                      <span data-round className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-eyebrow text-on-secondary">
                        {i + 1}
                      </span>
                      {fill(s, { phone: masked })}
                    </li>
                  ))}
                </ol>
              </ResultPanel>
              <p className="flex items-center justify-center gap-3 text-label">
                <Spinner label={p.waiting} />
                <span className="tabular" aria-hidden>
                  {mmss}
                </span>
              </p>
              {now - started > STILL_WAITING_MS && (
                <Notice tone="warning">
                  {p.stillWaiting}{" "}
                  <a
                    href={L(`/requests/${encodeURIComponent(code)}`)}
                    className="underline underline-offset-4"
                  >
                    {p.goRequest}
                  </a>
                </Notice>
              )}
              <Button
                variant="ghost"
                className="justify-self-center"
                onClick={() => setPhase("choose")}
              >
                {p.another}
              </Button>
            </>
          ))}
        {phase === "failed" && (
          <ResultPanel icon="x" tone="warning" title={p.failedTitle}>
            <p className="text-fg-muted">{p.failedBody}</p>
            {retryBtns}
          </ResultPanel>
        )}
        {phase === "insufficient" && (
          <ResultPanel
            icon="wallet"
            tone="warning"
            title={fill(p.insufficientTitle, { phone: masked })}
          >
            <p className="text-fg-muted">{p.insufficientBody}</p>
            {retryBtns}
          </ResultPanel>
        )}
        {phase === "expired" && (
          <ResultPanel icon="clock" tone="warning" title={p.expiredTitle}>
            <p className="text-fg-muted">{p.expiredBody}</p>
            <Button onClick={retry}>{p.newPayment}</Button>
          </ResultPanel>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
      <div className="min-w-0">
        <p className="mb-2 flex flex-wrap items-center gap-3 text-small text-fg-muted">
          {fill(p.request, { code })}
          <span className="inline-flex items-center gap-1 bg-success-bg px-2.5 py-0.5 text-fg">
            <Icon name="shield" size={14} aria-hidden /> {p.secure}
          </span>
        </p>
        <AuthTitle title={p.title} hi={a.service_name} />
        {error && <Notice>{error}</Notice>}
        {!user?.emailVerified ? (
          <VerifyNotice />
        ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void pay();
          }}
          className="grid gap-6"
        >
          <fieldset className="grid gap-3">
            <legend className="mb-3 text-label-lg">{p.choose}</legend>
            {(Object.keys(p.methods) as Method[]).map((m) => (
              <label
                key={m}
                className={cx(
                  "flex cursor-pointer items-center gap-3 border-2 bg-surface p-4 has-focus-visible:outline-2 has-focus-visible:outline-focus",
                  method === m
                    ? "border-secondary bg-navy-50"
                    : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="method"
                  className="size-5 accent-secondary"
                  checked={method === m}
                  onChange={() => setMethod(m)}
                />
                <span className="grid">
                  <span className="text-label-lg">
                    {p.methods[m][0]}
                    {m === "momo" && (
                      <span className="ml-2 bg-gold-400 text-on-gold px-2 py-0.5 text-eyebrow">
                        {p.popular}
                      </span>
                    )}
                  </span>
                  <span className="text-small text-fg-muted">
                    {p.methods[m][1]}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          {method === "bank" && <BankDetails code={code} c={c} />}
          {(method === "momo" || method === "airtel") && (
            <Field label={p.phone} error={phoneError}>
              {({ id, describedBy, invalid }) => (
                <PhoneInput
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              )}
            </Field>
          )}
          <Button type="submit" dots className="justify-center">
            {method === "bank"
              ? p.bank.paid
              : fill(p.payBtn, { amount: formatMoney(amount, "RWF", locale) })}
          </Button>
        </form>
        )}
      </div>
      <aside aria-label={p.order} className="lg:self-start">
        <div className="grid gap-3 border border-border bg-surface p-6 text-body shadow-sm">
          <h2 className="text-card-title">{p.order}</h2>
          <dl className="grid gap-3">
<Row k={p.service} v={a.service_name} />
          <Row k={p.reference} v={code} />
          <div className="flex justify-between border-t border-border pt-3 text-label-lg">
            <dt>{p.total}</dt>
            <dd>
              <Money amount={amount} />
            </dd>
          </div>
          </dl>
<p className="flex items-center gap-2 text-small text-fg-muted">
            <Icon name="lock" size={14} aria-hidden /> {p.noCard}
          </p>
        </div>
      </aside>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between gap-4">
    <dt className="text-fg-muted">{k}</dt>
    <dd className="text-right break-words">{v}</dd>
  </div>
);

function ReceiptCard({ r, c }: { r: Receipt; c: FlowCopy }) {
  const { locale } = useI18n();
  const p = c.pay;
  return (
    <section
      aria-label={p.receipt}
      className="border border-border bg-surface p-6 shadow-sm"
    >
      <p className="text-eyebrow text-fg-subtle uppercase">{p.receipt}</p>
      <p className="text-h3 tabular">{r.receiptNumber}</p>
      <dl className="mt-4 grid gap-2 text-body">
        <Row k={p.paidOn} v={formatDateTime(r.paidAt, locale)} />
        <Row k={p.service} v={`${r.serviceName} · ${r.applicationCode}`} />
        <Row k={p.method} v={r.method} />
        <Row k={p.txn} v={r.transactionId} />
        <Row k={p.govFee} v={<Money amount={r.governmentFee} />} />
        <Row k={p.vat} v={<Money amount={r.vatAmount} />} />
        <div className="flex justify-between border-t border-border pt-2 text-label-lg">
          <dt>{p.total}</dt>
          <dd>
            <Money amount={r.amount} />
          </dd>
        </div>
      </dl>
    </section>
  );
}

function BankDetails({ code, c }: { code: string; c: FlowCopy }) {
  const b = c.pay.bank;
  const rows: [string, string][] = [
    [b.bankName, b.values.bank],
    [b.accountName, b.values.name],
    [b.accountNo, b.values.number],
    [b.swift, b.values.swift],
    [b.ref, code],
  ];
  return (
    <section aria-label={b.title} className="grid gap-3 border border-border bg-surface p-4">
      <p className="text-label-lg">{b.title}</p>
      <dl className="grid gap-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-center gap-x-3">
            <dt className="min-w-32 text-fg-muted">{k}</dt>
            <dd className="flex min-w-0 flex-1 items-center justify-between gap-2 font-medium break-words tabular">
              <span className="min-w-0">{v}</span>
              <CopyBtn text={v} label={k} c={c} />
            </dd>
          </div>
        ))}
      </dl>
      <Notice tone="warning">{fill(b.refNote, { code })}</Notice>
    </section>
  );
}

function CopyBtn({ text, label, c }: { text: string; label: string; c: FlowCopy }) {
  const [ok, setOk] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label={`${c.pay.bank.copy}: ${label}`}
      onClick={() => navigator.clipboard?.writeText(text).then(() => setOk(true), () => {})}
    >
      <span aria-live="polite">{ok ? c.done.copied : c.done.copy}</span>
    </Button>
  );
}

/**
 * /pay/[ref]/return — landing after the provider's hosted page (card / redirect flows).
 * Polls the transaction (`?tx=` or the provider's `transaction_id`); without one, polls the application's payment_status.
 * confirming → paid | failed | expired; past STILL_WAITING_MS with no answer it turns into pending-provider and keeps polling.
 */
export function PayReturn({ code }: { code: string }) {
  const { locale } = useI18n();
  const p = flowCopy(locale).pay;
  const r = p.returned;
  const L = (path: string) => localHref(locale, path);
  const q = useSearchParams();
  const tx = q.get("tx") ?? q.get("transaction_id");
  const [phase, setPhase] = useState<"confirming" | "pending" | "success" | "failed" | "expired">("confirming");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let n = 0;
    let timer: ReturnType<typeof setTimeout>;
    let live = true;
    const started = Date.now();
    const tick = async () => {
      try {
        const status = tx
          ? (await unwrap<C.PaymentStatusResponse>(api.GET("/api/payments/{transaction_id}/status", { params: { path: { transaction_id: tx } } }))).status
          : ((await unwrap<App>(api.GET("/api/applications/{code}", { params: { path: { code } } }))).payment_status ?? "");
        const o = outcome(status);
        if (!live) return;
        if (o !== "waiting") return setPhase(o === "insufficient" ? "failed" : o);
      } catch (e) {
        if (e instanceof ApiError && (e.isNotFound || e.isForbidden)) return live && setMissing(true);
      } // other errors are transient: keep polling
      if (!live) return;
      if (Date.now() - started > STILL_WAITING_MS) setPhase("pending");
      timer = setTimeout(tick, pollDelay(++n));
    };
    timer = setTimeout(tick, 0);
    return () => { live = false; clearTimeout(timer); };
  }, [tx, code]);

  const toRequest = <ButtonLink href={L(`/requests/${encodeURIComponent(code)}`)} variant="outline" className="justify-center">{p.goRequest}</ButtonLink>;
  const payAgain = (label: string) => <ButtonLink href={L(`/pay/${encodeURIComponent(code)}`)} className="justify-center">{label}</ButtonLink>;
  return (
    <div className="mx-auto grid max-w-md gap-6" aria-live="polite">
      {missing ? (
        <ResultPanel icon="search" tone="neutral" title={p.notFound}><ButtonLink href={L("/requests")}>{p.back}</ButtonLink></ResultPanel>
      ) : phase === "confirming" ? (
        <ResultPanel icon="card" tone="neutral" title={p.cardReturn}><p className="text-fg-muted">{r.confirmingBody}</p><Spinner /></ResultPanel>
      ) : phase === "pending" ? (
        <ResultPanel icon="clock" tone="neutral" title={r.pendingTitle}><p className="text-fg-muted">{r.pendingBody}</p><Spinner label={p.waiting} />{toRequest}</ResultPanel>
      ) : phase === "success" ? (
        <ResultPanel icon="check" title={p.successTitle}><div className="grid w-full gap-3 sm:grid-cols-2">{payAgain(r.viewReceipt)}{toRequest}</div></ResultPanel>
      ) : phase === "failed" ? (
        <ResultPanel icon="x" tone="warning" title={p.failedTitle}><p className="text-fg-muted">{r.failedBody}</p><div className="grid w-full gap-3 sm:grid-cols-2">{payAgain(p.retry)}{toRequest}</div></ResultPanel>
      ) : (
        <ResultPanel icon="clock" tone="warning" title={p.expiredTitle}><p className="text-fg-muted">{p.expiredBody}</p>{payAgain(p.newPayment)}</ResultPanel>
      )}
    </div>
  );
}
