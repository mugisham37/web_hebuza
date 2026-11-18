"use client";
// CS4 quotation builder: price-list lines, qty, discount (reason required), VAT, validity, client preview, send.
import { errorCopy } from "@/lib/api/error-copy";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx, formatDate, formatMoney } from "@/shared/format";
import { opsCase, fill } from "@/content/pages/ops-case";
import { Button } from "@/components/atoms/button";
import { Dialog } from "@/components/atoms/dialog";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { quoteTotals, VAT_PCT, type QuoteLine } from "@/shared/ops/quotation";
import { useSendQuote } from "@/lib/ops/b";
import { SIDE_SHEET } from "@/components/organisms/ops/triage";

const inp =
  "h-10 w-full border border-border-strong bg-white px-3 text-small focus:border-navy-700 focus:ring-3 focus:ring-gold-400/45 hover:border-ink-400 focus:outline-none aria-invalid:border-danger";

export function QuoteBuilder({
  open,
  onClose,
  refId,
  client,
  service,
  priceList,
  issuedAt,
}: {
  open: boolean;
  onClose: () => void;
  refId: string;
  client: string;
  service: string;
  priceList: { label: string; unit: number }[];
  issuedAt: number;
}) {
  const { locale } = useI18n();
  const t = opsCase(locale).quote;
  const [lines, setLines] = useState<QuoteLine[]>(() =>
    priceList
      .slice(0, 3)
      .map((p) => ({ label: p.label, qty: 1, unit: p.unit })),
  );
  const [discountPct, setDiscount] = useState(0);
  const [discountReason, setReason] = useState("");
  const [validityDays, setValidity] = useState(14);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const send = useSendQuote();
  const toast = useToast();
  const q = quoteTotals(
    { lines, discountPct, discountReason, validityDays },
    new Date(issuedAt),
  );
  const money = (n: number) => formatMoney(n, "RWF", locale);
  const until = formatDate(q.validUntil, locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const set = (i: number, p: Partial<QuoteLine>) =>
    setLines(lines.map((l, k) => (k === i ? { ...l, ...p } : l)));
  const unused = priceList.filter(
    (p) => !lines.some((l) => l.label === p.label),
  );
  const submit = () => {
    setTried(true);
    if (q.errors.length) return;
    send.mutate(
      {
        ref: refId,
        lines,
        discountPct,
        discountReason,
        validityDays,
        note,
        sub: t.subQuote,
      },
      {
        onSuccess: () => {
          toast({
            title: fill(t.sent, { amount: money(q.total) }),
            tone: "success",
          });
          onClose();
        },
        onError: (e) => toast({ title: errorCopy(e, locale), tone: "danger" }),
      },
    );
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      side="right"
      className={cx(SIDE_SHEET, "sm:max-w-2xl")}
      title={fill(t.title, { client, service })}
      footer={
        <Button dots onClick={submit} loading={send.isPending}>
          {t.send}
        </Button>
      }
    >
      <div className="grid gap-5">
        <div
          tabIndex={0}
          role="region"
          aria-label={t.item}
          className="overflow-x-auto"
        >
          <table className="w-full min-w-[30rem] text-small">
            <thead className="bg-ink-100 text-left text-eyebrow text-fg-muted">
              <tr>
                <th className="px-2 py-2 font-medium">{t.item}</th>
                <th className="w-20 px-2 py-2 font-medium">{t.qty}</th>
                <th className="w-32 px-2 py-2 font-medium">{t.unit}</th>
                <th className="px-2 py-2 text-right font-medium">{t.amount}</th>
                <th className="w-10">
                  <span className="sr-only">
                    {t.remove.replace("{item}", "")}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-2 py-1.5">
                    <input
                      aria-label={t.item}
                      className={inp}
                      value={l.label}
                      onChange={(e) => set(i, { label: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      aria-label={`${t.qty} · ${l.label}`}
                      className={cx(inp, "text-right tabular")}
                      type="number"
                      min={1}
                      value={l.qty}
                      onChange={(e) => set(i, { qty: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      aria-label={`${t.unit} · ${l.label}`}
                      className={cx(inp, "text-right tabular")}
                      type="number"
                      min={0}
                      step={1000}
                      value={l.unit}
                      onChange={(e) => set(i, { unit: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap tabular">
                    {money(Math.max(0, l.qty) * Math.max(0, l.unit))}
                  </td>
                  <td className="px-1">
                    <button
                      type="button"
                      aria-label={fill(t.remove, { item: l.label })}
                      onClick={() => setLines(lines.filter((_, k) => k !== i))}
                      className="flex size-8 items-center justify-center hover:bg-navy-50"
                    >
                      <Icon name="x" size={14} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-eyebrow text-fg-muted">{t.priceList}</span>
          {unused.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() =>
                setLines([...lines, { label: p.label, qty: 1, unit: p.unit }])
              }
              className="inline-flex h-8 items-center gap-1 border border-border-strong px-3 text-small hover:border-navy-700"
            >
              <Icon name="plus" size={13} aria-hidden />
              {p.label} · {money(p.unit)}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              setLines([...lines, { label: t.custom, qty: 1, unit: 0 }])
            }
            className="inline-flex h-8 items-center gap-1 border border-dashed border-border-strong px-3 text-small hover:border-navy-700"
          >
            <Icon name="plus" size={13} aria-hidden />
            {t.custom}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <label className="grid gap-1 text-label">
            {t.discount}
            <input
              className={cx(inp, "tabular")}
              type="number"
              min={0}
              max={100}
              value={discountPct}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </label>
          <label className="grid gap-1 text-label">
            {t.discountReason}
            {discountPct > 0 && (
              <span aria-hidden className="sr-only">
                *
              </span>
            )}
            <input
              className={inp}
              value={discountReason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.discountReasonPh}
              disabled={!discountPct}
              aria-invalid={
                (tried && q.errors.includes("discountReason")) || undefined
              }
              aria-required={discountPct > 0}
            />
          </label>
          <label className="grid gap-1 text-label">
            {t.validity}
            <input
              className={cx(inp, "tabular")}
              type="number"
              min={1}
              max={90}
              value={validityDays}
              onChange={(e) => setValidity(Number(e.target.value))}
            />
          </label>
          <p className="self-end pb-2.5 text-small text-fg-muted">
            {fill(t.until, { n: validityDays, d: until })}
          </p>
        </div>
        <label className="grid gap-1 text-label">
          {t.notes}
          <textarea
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="border border-border-strong bg-white px-3 py-2 text-small focus:border-navy-700 focus:ring-3 focus:ring-gold-400/45 hover:border-ink-400 focus:outline-none"
          />
        </label>
        {tried && q.errors.length > 0 && (
          <ul
            role="alert"
            className="grid gap-1 text-small font-medium text-danger"
          >
            {q.errors.map((e) => (
              <li key={e}>{t.errors[e]}</li>
            ))}
          </ul>
        )}
        <section
          aria-label={t.preview}
          className="grid gap-2 border border-border bg-bg-subtle p-4"
        >
          <p className="text-eyebrow text-fg-muted">{t.preview}</p>
          <p className="text-label">{service}</p>
          <dl
            className="grid grid-cols-[1fr_auto] gap-y-1 text-small tabular"
            aria-live="polite"
          >
            <dt>{t.subtotal}</dt>
            <dd className="text-right">{money(q.subtotal)}</dd>
            {q.discount > 0 && (
              <>
                <dt>{fill(t.discountLine, { p: discountPct })}</dt>
                <dd className="text-right">− {money(q.discount)}</dd>
              </>
            )}
            <dt>{fill(t.vat, { p: VAT_PCT })}</dt>
            <dd className="text-right">{money(q.vat)}</dd>
            <dt className="border-t border-border pt-1.5 text-label">
              {t.total}
            </dt>
            <dd className="border-t border-border pt-1.5 text-right text-label">
              {money(q.total)}
            </dd>
          </dl>
          <p className="text-eyebrow text-fg-subtle">
            {fill(t.until, { n: validityDays, d: until })}
          </p>
        </section>
      </div>
    </Dialog>
  );
}
