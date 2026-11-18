"use client";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { localHref } from "@/shared/i18n/config";
import { cx, formatMoney } from "@/shared/format";
import { Button, buttonClass } from "@/components/atoms/button";
import { Icon, WhatsAppGlyph } from "@/components/atoms/icon";
import { waLink } from "@/content/marketing";
import { laCopy } from "@/content/pages/la";

import { bandFor, bandFee, type PriceBand } from "@/shared/pricing";
export { bandFor, bandFee, type PriceBand };

/** Eligibility gate: yes/no questions one at a time, then a result banner. Guidance only, never blocks Apply. */
export function EligibilityGate({
  slug,
  family,
  service,
}: {
  slug: string;
  family: string;
  service: string;
}) {
  const { locale } = useI18n();
  const c = laCopy(locale).elig;
  const qs = c.questions[family] ?? c.fallback;
  const dialog = useRef<HTMLDialogElement>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const titleId = useId();
  const done = answers.length >= qs.length;
  const ok = done && answers.every(Boolean);
  return (
    <>
      <Button
        variant="primary"
        dots
        onClick={() => {
          setAnswers([]);
          dialog.current?.showModal();
        }}
      >
        {c.open}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[min(100%-1.5rem,32rem)] bg-white p-0 text-fg shadow-lg backdrop:bg-ink-950/60"
      >
        <div className="p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-h3">
                {c.title}
              </h2>
              <p className="mt-1 text-small text-fg-muted">{c.intro}</p>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label={c.close}
              className="-mt-1 -mr-2 flex size-10 shrink-0 items-center justify-center text-navy-700 hover:bg-navy-50"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          <div className="mt-5 flex gap-1.5" aria-hidden>
            {qs.map((q, i) => (
              <span
                key={q}
                className={cx(
                  "h-1.5 flex-1",
                  i < answers.length
                    ? answers[i]
                      ? "bg-success"
                      : "bg-gold-500"
                    : "bg-ink-100",
                )}
              />
            ))}
          </div>
          <div aria-live="polite" className="mt-6">
            {!done ? (
              <div>
                <p className="text-eyebrow text-fg-subtle uppercase">
                  {c.step
                    .replace("{i}", String(answers.length + 1))
                    .replace("{n}", String(qs.length))}
                </p>
                <p className="mt-2 text-card-title">{qs[answers.length]}</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => setAnswers([...answers, true])}
                    className="justify-center"
                  >
                    {c.yes}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setAnswers([...answers, false])}
                    className="justify-center"
                  >
                    {c.no}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                role="status"
                data-testid="elig-result"
                className={cx(
                  " p-5",
                  ok ? "border-l-[3px] border-success bg-success-bg text-success" : "border-l-[3px] border-info bg-info-bg text-info",
                )}
              >
                <p className="flex items-center gap-2 text-card-title">
                  <span
                    className={cx(
                      "flex size-7 items-center justify-center rounded-full",
                      ok ? "bg-success text-white" : "bg-info text-white",
                    )}
                  >
                    <Icon
                      name={ok ? "check" : "message"}
                      size={14}
                      strokeWidth={3}
                    />
                  </span>
                  {ok ? c.okTitle : c.noTitle}
                </p>
                <p className="mt-2 text-body">{ok ? c.okBody : c.noBody}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {ok ? (
                    <Link
                      href={localHref(locale, `/apply/${slug}`)}
                      className={buttonClass({})}
                    >
                      {c.apply}
                    </Link>
                  ) : (
                    <a
                      href={waLink(`${service} — HEBUZA`)}
                      target="_blank"
                      rel="noopener"
                      className={buttonClass({ className: "gap-2" })}
                    >
                      <WhatsAppGlyph size={18} />
                      {c.talk}
                    </a>
                  )}
                  <Button variant="secondary" onClick={() => setAnswers([])}>
                    {c.restart}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}

/** Calls the browser print dialog; the page's [data-la-print] block is the only thing printed. */
export function PrintButton() {
  const { locale } = useI18n();
  return (
    <Button variant="secondary" dots onClick={() => window.print()}>
      {laCopy(locale).check.download}
    </Button>
  );
}

/** D5 amount-based price: amount input → band → computed fee. */
export function BandCalculator({ bands }: { bands: PriceBand[] }) {
  const { locale } = useI18n();
  const c = laCopy(locale).price;
  const [raw, setRaw] = useState("");
  const id = useId();
  const amount = Number(raw.replace(/[^\d]/g, ""));
  const band = raw ? bandFor(bands, amount) : null;
  return (
    <div className="grid gap-3">
      <label htmlFor={id} className="text-label">
        {c.amountLabel}
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        aria-describedby={`${id}-out`}
        className="h-12 border border-border-strong bg-white px-4 tabular text-body hover:border-ink-400 focus:outline-none focus-visible:border-secondary focus-visible:shadow-[0_0_0_3px_rgb(248_183_24/0.45)]"
        placeholder="1 000 000"
      />
      <p className="text-small text-fg-subtle">{c.amountHint}</p>
      <div
        id={`${id}-out`}
        aria-live="polite"
        className="border-l-[3px] border-info bg-info-bg p-4 text-info"
      >
        {!raw ? (
          <p className="text-body">{c.empty}</p>
        ) : band ? (
          <>
            <p className="text-small">{c.fee}</p>
            <p className="tabular text-h3">
              {formatMoney(bandFee(band, amount), "RWF", locale)}
            </p>
            <p className="mt-1 text-small">
              {c.band}: {formatMoney(band.min, "RWF", locale)}
              {band.max != null
                ? ` – ${formatMoney(band.max, "RWF", locale)}`
                : "+"}
            </p>
          </>
        ) : (
          <p className="text-body">{c.outOfRange}</p>
        )}
      </div>
    </div>
  );
}
