"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, newIdempotencyKey, unwrap } from "@/lib/api/client";
import { localHref } from "@/shared/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDate, formatMoney } from "@/shared/format";
import { Button, ButtonLink } from "@/components/atoms/button";
import {
  Field,
  Radio,
  Select,
  Textarea,
  ErrorSummary,
} from "@/components/atoms/field";
import { EmptyState, ErrorState } from "@/components/atoms/feedback";
import { Dialog } from "@/components/atoms/dialog";
import { Badge } from "@/components/atoms/tag";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { apiMessage } from "@/components/molecules/auth/auth";
import { fill } from "@/content/pages/c4";
import {
  ListSkeleton,
  PageHead,
  Panel,
  useC4,
} from "@/components/molecules/client/client";

type Payment = {
  caseRef: string;
  service: string;
  paid: number;
  method: "momo" | "card";
  eligible: boolean;
  reason?: string | null;
};
type RefundStatus =
  "requested" | "reviewed" | "approved" | "paid" | "partial" | "declined";
type Refund = {
  ref: string;
  caseRef: string;
  amount: number;
  refunded?: number | null;
  status: RefundStatus;
  createdAt: string;
  note?: string | null;
};
type Reason = "not_delivered" | "cancelled" | "duplicate" | "other";
const STEP: Record<RefundStatus, number> = {
  requested: 0,
  reviewed: 1,
  approved: 2,
  partial: 2,
  paid: 3,
  declined: 1,
};
const TONE = {
  requested: "info",
  reviewed: "info",
  approved: "success",
  paid: "success",
  partial: "warning",
  declined: "danger",
} as const;

/** C14 Refunds (F-FIN refunds): eligibility per paid request, request flow, status tracker per refund. */
export function RefundsView() {
  const { c, locale } = useC4();
  const r = c.refund;
  const [picked, setPicked] = useState<Payment | null>(null);
  const elig = useQuery({
    queryKey: ["c4", "refund-eligibility"],
    queryFn: () => unwrap<{ payments: Payment[] }>(api.GET("/api/me/refunds/eligibility")),
  });
  const mine = useQuery({
    queryKey: ["c4", "refunds"],
    queryFn: () => unwrap<{ refunds: Refund[] }>(api.GET("/api/me/refunds")),
  });
  const pending = new Set(
    mine.data?.refunds
      .filter((x) => x.status !== "declined")
      .map((x) => x.caseRef),
  );

  return (
    <>
      <PageHead
        title={r.title}
        lede={r.lede}
        action={
          <ButtonLink
            href={localHref(locale, "/help")}
            variant="outline"
            size="sm"
          >
            {c.help.title}
          </ButtonLink>
        }
      />
      <p data-guide="client-refund-policy" className="mb-8 flex flex-wrap items-start gap-3 bg-bg-tint px-4 py-3 text-body">
        <Icon
          name="shield"
          aria-hidden
          className="mt-0.5 shrink-0 text-info"
        />
        <span className="flex-1 basis-56">
          {r.policy}{" "}
          <Link
            href={localHref(locale, "/legal/terms")}
            className="underline underline-offset-4"
          >
            {r.policyLink}
          </Link>
        </span>
      </p>

      <section aria-labelledby="rf-pay" className="mb-10">
        <h2 id="rf-pay" className="text-fg-heading mb-3 text-h3">
          {r.choose}
        </h2>
        {elig.isPending ? (
          <ListSkeleton rows={2} />
        ) : elig.isError ? (
          <ErrorState error={elig.error} onRetry={() => elig.refetch()} />
        ) : !elig.data.payments.length ? (
          <EmptyState title={r.noPayments} body="" />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {elig.data.payments.map((p) => {
              const can = p.eligible && !pending.has(p.caseRef);
              return (
                <li
                  key={p.caseRef}
                  className="flex flex-wrap items-center gap-3 bg-surface p-5 shadow-sm"
                >
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="text-label">{p.service}</p>
                    <p className="font-mono text-small text-fg-subtle">
                      {p.caseRef}
                    </p>
                    <p className="mt-1 text-small">
                      {fill(r.paid, {
                        amount: formatMoney(p.paid, "RWF", locale),
                      })}
                    </p>
                    {!p.eligible && p.reason && (
                      <p className="mt-1 text-small text-fg-subtle">
                        {p.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone={p.eligible ? "success" : "neutral"}>
                      {p.eligible ? r.eligible : r.notEligible}
                    </Badge>
                    <Button
                      data-guide="client-refund-request"
                      size="sm"
                      disabled={!can}
                      onClick={() => setPicked(p)}
                    >
                      {r.cta}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="rf-mine">
        <h2 id="rf-mine" className="text-fg-heading mb-3 text-h3">
          {r.mine}
        </h2>
        {mine.isPending ? (
          <ListSkeleton rows={2} />
        ) : mine.isError ? (
          <ErrorState error={mine.error} onRetry={() => mine.refetch()} />
        ) : !mine.data.refunds.length ? (
          <EmptyState title={r.none} body="" />
        ) : (
          <ul className="grid gap-4">
            {mine.data.refunds.map((x) => (
              <RefundCard key={x.ref} x={x} />
            ))}
          </ul>
        )}
      </section>
      {picked && (
        <RequestDialog payment={picked} onClose={() => setPicked(null)} />
      )}
    </>
  );
}

function RefundCard({ x }: { x: Refund }) {
  const { c, locale } = useC4();
  const r = c.refund;
  const step = STEP[x.status];
  return (
    <li>
      <Panel
        icon="file"
        title={<span className="font-mono">{x.ref}</span>}
        body={`${x.caseRef} · ${formatDate(x.createdAt, locale)} · ${formatMoney(x.refunded ?? x.amount, "RWF", locale)}`}
        action={<Badge tone={TONE[x.status]}>{r.status[x.status]}</Badge>}
      >
        {x.status === "declined" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body">
              {fill(r.declinedReason, { r: x.note ?? "" })}
            </p>
            <ButtonLink
              href={localHref(locale, "/help")}
              size="sm"
              variant="outline"
            >
              {r.talk}
            </ButtonLink>
          </div>
        ) : (
          <>
            <ol
              className="grid grid-cols-4 gap-2"
              aria-label={r.status[x.status]}
            >
              {r.steps.map((s, i) => (
                <li
                  key={s}
                  aria-current={i === step ? "step" : undefined}
                  className="grid justify-items-center gap-2 text-center text-small"
                >
                  <span
                    className={cx(
                      "flex size-8 items-center justify-center text-small font-medium",
                      i < step || x.status === "paid"
                        ? "bg-secondary text-on-secondary"
                        : i === step
                          ? "bg-surface text-navy-700 ring-2 ring-gold-400 ring-offset-2"
                          : "border border-ink-300 text-fg-subtle",
                    )}
                  >
                    {i < step || x.status === "paid" ? (
                      <Icon
                        name="check"
                        size={14}
                        strokeWidth={3}
                        aria-hidden
                      />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className={i <= step ? "text-fg" : "text-fg-subtle"}>
                    {s}
                  </span>
                </li>
              ))}
            </ol>
            {x.note && (
              <p className="mt-4 text-small text-fg-muted">{x.note}</p>
            )}
            {x.status !== "paid" && (
              <p className="mt-4 flex items-center gap-2 text-small text-fg-subtle">
                <Icon name="clock" size={16} aria-hidden />
                {r.sla}
              </p>
            )}
          </>
        )}
      </Panel>
    </li>
  );
}

function RequestDialog({
  payment,
  onClose,
}: {
  payment: Payment;
  onClose: () => void;
}) {
  const { c, locale } = useC4();
  const { t } = useI18n();
  const r = c.refund;
  const qc = useQueryClient();
  const toast = useToast();
  const [reason, setReason] = useState<Reason | "">("");
  const [details, setDetails] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [key] = useState(newIdempotencyKey); // one key per intent so double-submits don't create two refunds
  const submit = useMutation({
    mutationFn: (body: { caseRef: string; reason: Reason; details: string; method: string }) =>
      unwrap<{ ref: string }>(api.POST("/api/me/refunds", { body: { ...body, idempotencyKey: key } })),
    onSuccess: (d) => {
      toast({ title: fill(r.submitted, { ref: d.ref }), tone: "success" });
      qc.invalidateQueries({ queryKey: ["c4", "refunds"] });
      onClose();
    },
    onError: (e) => toast({ title: apiMessage(e, c.generic, locale), tone: "danger" }),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const method = String(
      new FormData(e.currentTarget).get("method") ?? payment.method,
    );
    const errs: Record<string, string> = {};
    if (!reason) errs["rf-reason"] = c.required;
    if (reason === "other" && !details.trim())
      errs["rf-details"] = r.detailsRequired;
    setErrors(errs);
    if (reason && !Object.keys(errs).length)
      submit.mutate({ caseRef: payment.caseRef, reason, details, method });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={r.cta}
      description={`${payment.service} · ${payment.caseRef}`}
    >
      <form noValidate onSubmit={onSubmit} className="grid gap-5">
        <p className="flex items-center gap-3 bg-bg-tint px-4 py-3 text-label">
          <Icon name="wallet" aria-hidden />
          {fill(r.paid, { amount: formatMoney(payment.paid, "RWF", locale) })}
        </p>
        <ErrorSummary
          title={c.fixErrors}
          errors={Object.entries(errors).map(([field, message]) => ({
            field,
            message,
          }))}
        />
        <fieldset
          id="rf-reason"
          aria-describedby={errors["rf-reason"] ? "rf-reason-err" : undefined}
        >
          <legend className="mb-2 text-label">{r.reason}</legend>
          {errors["rf-reason"] && (
            <p
              id="rf-reason-err"
              className="mb-2 text-small font-medium text-danger"
            >
              {errors["rf-reason"]}
            </p>
          )}
          <div className="grid gap-2">
            {(Object.keys(r.reasons) as Reason[]).map((k) => (
              <Radio
                key={k}
                name="reason"
                label={r.reasons[k]}
                checked={reason === k}
                onChange={() => setReason(k)}
              />
            ))}
          </div>
        </fieldset>
        <Field id="rf-details"
          label={r.details}
          optional={reason === "other" ? undefined : t("common.optional")}
          error={errors["rf-details"]}
        >
          {({ id, describedBy, invalid }) => (
            <Textarea id={id}
              placeholder={r.detailsPh}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
        <Field label={r.method}>
          {({ id }) => (
            <Select id={id} name="method" defaultValue={payment.method}>
              {(Object.keys(r.methods) as (keyof typeof r.methods)[]).map(
                (m) => (
                  <option key={m} value={m}>
                    {r.methods[m]}
                  </option>
                ),
              )}
            </Select>
          )}
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" dots loading={submit.isPending}>
            {r.submit}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
